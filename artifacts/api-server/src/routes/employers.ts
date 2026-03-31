import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import {
  employers,
  employerMembers,
  employerModalityRules,
  profiles,
  planProgressLogs,
} from "@workspace/db";
import { eq, and, count, sql, desc, inArray } from "drizzle-orm";
import { randomUUID } from "crypto";
import { z } from "zod";
import Stripe from "stripe";

// ── Stripe client (initialised lazily — requires STRIPE_SECRET_KEY in prod) ──
// Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET environment variables to
// enable live Stripe Checkout sessions and webhook processing.
const stripeKey = process.env.STRIPE_SECRET_KEY;
const stripe: Stripe | null = stripeKey
  ? new Stripe(stripeKey, { apiVersion: "2026-03-25.dahlia" })
  : null;

const router: IRouter = Router();

function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function requireEmployerAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  next();
}

function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  if (req.user!.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
}

// ── Employer Signup ────────────────────────────────────────────────────────────

const CreateEmployerBody = z.object({
  companyName: z.string().min(2).max(200),
  adminContactName: z.string().min(2).max(200),
  adminContactEmail: z.string().email(),
  billingContactEmail: z.string().email().optional(),
  numberOfEmployees: z.number().int().min(1).max(100000),
  stipendPerEmployee: z.number().int().min(1000), // cents, min $10
});

router.post("/employer/signup", requireEmployerAuth, async (req, res) => {
  const parsed = CreateEmployerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
    return;
  }

  const profileId = req.user!.id;

  try {
    const existing = await db
      .select({ id: employers.id })
      .from(employers)
      .where(eq(employers.adminProfileId, profileId))
      .limit(1);

    if (existing.length > 0) {
      res.status(409).json({ error: "Employer account already exists for this user" });
      return;
    }

    let inviteCode: string;
    let attempts = 0;
    do {
      inviteCode = generateInviteCode();
      const conflict = await db
        .select({ id: employers.id })
        .from(employers)
        .where(eq(employers.inviteCode, inviteCode))
        .limit(1);
      if (!conflict.length) break;
      attempts++;
    } while (attempts < 10);

    const id = randomUUID();
    const [employer] = await db
      .insert(employers)
      .values({
        id,
        companyName: parsed.data.companyName,
        adminContactName: parsed.data.adminContactName,
        adminContactEmail: parsed.data.adminContactEmail,
        billingContactEmail: parsed.data.billingContactEmail,
        adminProfileId: profileId,
        numberOfEmployees: parsed.data.numberOfEmployees,
        stipendPerEmployee: parsed.data.stipendPerEmployee,
        inviteCode: inviteCode!,
        status: "active",
      })
      .returning();

    await db
      .update(profiles)
      .set({ role: "employer" })
      .where(eq(profiles.id, profileId));

    res.status(201).json(employer);
  } catch (err) {
    console.error("Employer signup error:", err);
    res.status(500).json({ error: "Failed to create employer account" });
  }
});

// ── Get Current Employer ───────────────────────────────────────────────────────

router.get("/employer/me", requireEmployerAuth, async (req, res) => {
  try {
    const [employer] = await db
      .select()
      .from(employers)
      .where(eq(employers.adminProfileId, req.user!.id))
      .limit(1);
    if (!employer) {
      res.status(404).json({ error: "No employer account found" });
      return;
    }
    res.json(employer);
  } catch {
    res.status(500).json({ error: "Failed to fetch employer" });
  }
});

const PatchEmployerMeBody = z.object({
  companyName: z.string().min(1).optional(),
  numberOfEmployees: z.number().int().min(1).optional(),
  stipendPerEmployee: z.number().int().min(0).optional(),
});

router.patch("/employer/me", requireEmployerAuth, async (req, res) => {
  const parsed = PatchEmployerMeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
    return;
  }
  try {
    const [existing] = await db
      .select({ id: employers.id })
      .from(employers)
      .where(eq(employers.adminProfileId, req.user!.id))
      .limit(1);
    if (!existing) {
      res.status(404).json({ error: "No employer account found" });
      return;
    }
    const [updated] = await db
      .update(employers)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(employers.id, existing.id))
      .returning();
    res.json(updated);
  } catch {
    res.status(500).json({ error: "Failed to update employer" });
  }
});

// ── Employer Dashboard Stats ───────────────────────────────────────────────────

router.get("/employer/dashboard", requireEmployerAuth, async (req, res) => {
  try {
    const [employer] = await db
      .select()
      .from(employers)
      .where(eq(employers.adminProfileId, req.user!.id))
      .limit(1);

    if (!employer) {
      res.status(404).json({ error: "No employer account found" });
      return;
    }

    const members = await db
      .select()
      .from(employerMembers)
      .where(eq(employerMembers.employerId, employer.id));

    const totalEnrolled = members.length;
    const totalBudgetCents = totalEnrolled * employer.stipendPerEmployee;
    // Apply effective-month reset at read time — avoids stale prior-month spend values
    const currentMonth = new Date().toISOString().slice(0, 7);
    const totalSpentCents = members.reduce(
      (sum, m) => sum + (m.budgetMonth === currentMonth ? m.spentThisMonth : 0),
      0
    );
    const utilizationPct = totalBudgetCents > 0
      ? Math.round((totalSpentCents / totalBudgetCents) * 100)
      : 0;

    const profileIds = members.map((m) => m.profileId);
    let avgWellnessScore = 0;
    let topModalities: Array<{ modalityId: string; sessionCount: number }> = [];

    if (profileIds.length > 0) {
      const logs = await db
        .select({
          modalityId: planProgressLogs.modalityId,
          rating: planProgressLogs.rating,
          profileId: planProgressLogs.profileId,
        })
        .from(planProgressLogs)
        .where(inArray(planProgressLogs.profileId, profileIds));

      const ratings = logs.map((l) => l.rating).filter((r): r is number => r != null);
      if (ratings.length > 0) {
        avgWellnessScore = Math.round(
          ratings.reduce((a, b) => a + b, 0) / ratings.length
        );
      }

      const modalityCounts = new Map<string, number>();
      for (const log of logs) {
        if (log.modalityId) {
          modalityCounts.set(log.modalityId, (modalityCounts.get(log.modalityId) ?? 0) + 1);
        }
      }
      topModalities = [...modalityCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([modalityId, sessionCount]) => ({ modalityId, sessionCount }));
    }

    const monthlySpend: Array<{ month: string; totalCents: number }> = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const m = d.toISOString().slice(0, 7);
      const spent = members
        .filter((mem) => mem.budgetMonth === m)
        .reduce((sum, mem) => sum + mem.spentThisMonth, 0);
      monthlySpend.push({ month: m, totalCents: spent });
    }

    // K-anonymity floor: suppress utilization/wellness aggregates for small cohorts
    // to prevent de-anonymization of individual member health data.
    const K_ANON_MIN = 5;
    const cohortTooSmall = totalEnrolled < K_ANON_MIN;

    res.json({
      employer: {
        id: employer.id,
        companyName: employer.companyName,
        inviteCode: employer.inviteCode,
        stipendPerEmployee: employer.stipendPerEmployee,
        numberOfEmployees: employer.numberOfEmployees,
        status: employer.status,
      },
      stats: {
        totalEnrolled,
        totalBudgetCents,
        totalSpentCents: cohortTooSmall ? null : totalSpentCents,
        utilizationPct: cohortTooSmall ? null : utilizationPct,
        avgWellnessScore: cohortTooSmall ? null : avgWellnessScore,
        monthlyInvoiceCents:
          employer.stipendPerEmployee *
          totalEnrolled *
          (1 + employer.platformFeePercent / 100),
        privacySuppressed: cohortTooSmall,
      },
      topModalities: cohortTooSmall ? [] : topModalities,
      monthlySpend: cohortTooSmall ? [] : monthlySpend,
    });
  } catch (err) {
    console.error("Dashboard error:", err);
    res.status(500).json({ error: "Failed to load dashboard" });
  }
});

// ── Employer Members List ──────────────────────────────────────────────────────

router.get("/employer/members", requireEmployerAuth, async (req, res) => {
  try {
    const [employer] = await db
      .select({ id: employers.id, numberOfEmployees: employers.numberOfEmployees })
      .from(employers)
      .where(eq(employers.adminProfileId, req.user!.id))
      .limit(1);

    if (!employer) {
      res.status(404).json({ error: "No employer account found" });
      return;
    }

    // Retrieve aggregate-only cohort statistics — no individual member rows exposed
    const rows = await db
      .select({
        monthlyBudget: employerMembers.monthlyBudget,
        spentThisMonth: employerMembers.spentThisMonth,
        budgetMonth: employerMembers.budgetMonth,
        linkedAt: employerMembers.linkedAt,
      })
      .from(employerMembers)
      .where(eq(employerMembers.employerId, employer.id));

    const totalEnrolled = rows.length;
    const totalBudget = rows.reduce((s, r) => s + (r.monthlyBudget ?? 0), 0);
    // Apply effective-month reset at read time — avoids stale prior-month spend values
    const cohortCurrentMonth = new Date().toISOString().slice(0, 7);
    const totalSpent = rows.reduce(
      (s, r) => s + (r.budgetMonth === cohortCurrentMonth ? (r.spentThisMonth ?? 0) : 0),
      0
    );

    const buckets = [
      { label: "0–25%", min: 0, max: 25, count: 0 },
      { label: "25–50%", min: 25, max: 50, count: 0 },
      { label: "50–75%", min: 50, max: 75, count: 0 },
      { label: "75–100%", min: 75, max: 100, count: 0 },
      { label: "100%+", min: 100, max: Infinity, count: 0 },
    ];

    for (const r of rows) {
      const effectiveSpent = r.budgetMonth === cohortCurrentMonth ? r.spentThisMonth : 0;
      const pct = r.monthlyBudget && r.monthlyBudget > 0
        ? (effectiveSpent / r.monthlyBudget) * 100
        : 0;
      const bucket = buckets.find((b) => pct >= b.min && pct < b.max) ?? buckets[buckets.length - 1];
      bucket.count++;
    }

    // Enrollment trend: count per calendar month (last 6 months)
    const monthCounts: Record<string, number> = {};
    for (const r of rows) {
      const key = new Date(r.linkedAt).toISOString().slice(0, 7);
      monthCounts[key] = (monthCounts[key] ?? 0) + 1;
    }
    const enrollmentTrend = Object.entries(monthCounts)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, count]) => ({ month, count }));

    // K-anonymity floor: suppress spend/utilization data below threshold
    const COHORT_K_MIN = 5;
    const cohortTooSmall = totalEnrolled < COHORT_K_MIN;

    res.json({
      contractedHeadcount: employer.numberOfEmployees,
      totalEnrolled,
      privacySuppressed: cohortTooSmall,
      utilizationRate: cohortTooSmall ? null
        : totalEnrolled > 0 && totalBudget > 0
          ? Math.round((totalSpent / totalBudget) * 100)
          : 0,
      averageMonthlyBudgetCents: cohortTooSmall ? null
        : totalEnrolled > 0 ? Math.round(totalBudget / totalEnrolled) : 0,
      averageMonthlySpentCents: cohortTooSmall ? null
        : totalEnrolled > 0 ? Math.round(totalSpent / totalEnrolled) : 0,
      utilizationBuckets: cohortTooSmall ? [] : buckets.map(({ label, count, min, max: _max }) => ({
        label,
        count,
        pct: totalEnrolled > 0 ? Math.round((count / totalEnrolled) * 100) : 0,
        barMin: min,
      })),
      enrollmentTrend,
    });
  } catch {
    res.status(500).json({ error: "Failed to fetch member cohort data" });
  }
});

// ── Redeem Employer Invite Code ────────────────────────────────────────────────

const RedeemCodeBody = z.object({ inviteCode: z.string().min(1) });

router.post("/employer/redeem-code", requireEmployerAuth, async (req, res) => {
  const parsed = RedeemCodeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const profileId = req.user!.id;
  const code = parsed.data.inviteCode.toUpperCase().trim();

  try {
    const [employer] = await db
      .select()
      .from(employers)
      .where(and(eq(employers.inviteCode, code), eq(employers.status, "active")))
      .limit(1);

    if (!employer) {
      res.status(404).json({ error: "Invalid or expired employer code" });
      return;
    }

    // Enforce single employer per member (unique DB constraint on profileId)
    const existing = await db
      .select({ id: employerMembers.id, employerId: employerMembers.employerId })
      .from(employerMembers)
      .where(eq(employerMembers.profileId, profileId))
      .limit(1);

    if (existing.length > 0) {
      if (existing[0].employerId === employer.id) {
        res.status(409).json({ error: "Already enrolled with this employer" });
      } else {
        res.status(409).json({ error: "Already enrolled in a different employer wellness programme. Contact support to switch." });
      }
      return;
    }

    const currentMonth = new Date().toISOString().slice(0, 7);
    const [link] = await db
      .insert(employerMembers)
      .values({
        id: randomUUID(),
        employerId: employer.id,
        profileId,
        monthlyBudget: employer.stipendPerEmployee,
        spentThisMonth: 0,
        budgetMonth: currentMonth,
      })
      .returning();

    res.status(201).json({
      success: true,
      companyName: employer.companyName,
      monthlyBudget: employer.stipendPerEmployee,
      link,
    });
  } catch (err) {
    console.error("Redeem code error:", err);
    res.status(500).json({ error: "Failed to redeem code" });
  }
});

// ── Get Member's Employer Budget ───────────────────────────────────────────────

router.get("/employer/my-budget", requireEmployerAuth, async (req, res) => {
  try {
    const [link] = await db
      .select({
        monthlyBudget: employerMembers.monthlyBudget,
        spentThisMonth: employerMembers.spentThisMonth,
        budgetMonth: employerMembers.budgetMonth,
        companyName: employers.companyName,
        inviteCode: employers.inviteCode,
      })
      .from(employerMembers)
      .innerJoin(employers, eq(employerMembers.employerId, employers.id))
      .where(eq(employerMembers.profileId, req.user!.id))
      .limit(1);

    if (!link) {
      res.json({ enrolled: false });
      return;
    }

    // Apply effective-month reset at read time — avoids stale prior-month values
    const currentMonth = new Date().toISOString().slice(0, 7);
    const effectiveSpent = link.budgetMonth === currentMonth ? link.spentThisMonth : 0;

    res.json({
      enrolled: true,
      companyName: link.companyName,
      inviteCode: link.inviteCode,
      monthlyBudget: link.monthlyBudget,
      spentThisMonth: effectiveSpent,
      budgetMonth: currentMonth,
      remainingCents: Math.max(0, link.monthlyBudget - effectiveSpent),
    });
  } catch {
    res.status(500).json({ error: "Failed to fetch budget" });
  }
});

// ── Employer Enroll Status (alias for my-budget, spec-required name) ─────────

router.get("/employer/enroll-status", requireEmployerAuth, async (req, res) => {
  try {
    const [link] = await db
      .select({
        monthlyBudget: employerMembers.monthlyBudget,
        spentThisMonth: employerMembers.spentThisMonth,
        budgetMonth: employerMembers.budgetMonth,
        employerId: employerMembers.employerId,
        companyName: employers.companyName,
        inviteCode: employers.inviteCode,
        status: employers.status,
      })
      .from(employerMembers)
      .innerJoin(employers, eq(employerMembers.employerId, employers.id))
      .where(eq(employerMembers.profileId, req.user!.id))
      .limit(1);

    if (!link) {
      res.json({ enrolled: false, employer: null, member: null });
      return;
    }

    // Apply effective-month reset at read time — avoids stale prior-month values
    const currentMonth = new Date().toISOString().slice(0, 7);
    const effectiveSpent = link.budgetMonth === currentMonth ? link.spentThisMonth : 0;

    // Return { enrolled, employer, member } as specified by EnrollStatusResponse schema
    res.json({
      enrolled: true,
      employer: {
        id: link.employerId,
        companyName: link.companyName,
        inviteCode: link.inviteCode,
        status: link.status,
      },
      member: {
        monthlyBudget: link.monthlyBudget,
        spentThisMonth: effectiveSpent,
        budgetMonth: currentMonth,
        remainingCents: Math.max(0, link.monthlyBudget - effectiveSpent),
      },
    });
  } catch {
    res.status(500).json({ error: "Failed to fetch enrol status" });
  }
});

// ── Employer Modality Rules ────────────────────────────────────────────────────

const SetModalityRulesBody = z.object({
  rules: z.array(z.object({
    modalityId: z.string(),
    covered: z.boolean(),
  })),
});

router.put("/employer/modality-rules", requireEmployerAuth, async (req, res) => {
  const parsed = SetModalityRulesBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  try {
    const [employer] = await db
      .select({ id: employers.id })
      .from(employers)
      .where(eq(employers.adminProfileId, req.user!.id))
      .limit(1);

    if (!employer) {
      res.status(404).json({ error: "No employer account found" });
      return;
    }

    for (const rule of parsed.data.rules) {
      await db
        .insert(employerModalityRules)
        .values({
          id: randomUUID(),
          employerId: employer.id,
          modalityId: rule.modalityId,
          covered: rule.covered,
        })
        .onConflictDoUpdate({
          target: [employerModalityRules.employerId, employerModalityRules.modalityId],
          set: { covered: rule.covered },
        });
    }

    const rules = await db
      .select()
      .from(employerModalityRules)
      .where(eq(employerModalityRules.employerId, employer.id));

    res.json(rules);
  } catch {
    res.status(500).json({ error: "Failed to update modality rules" });
  }
});

router.get("/employer/modality-rules", requireEmployerAuth, async (req, res) => {
  try {
    const [employer] = await db
      .select({ id: employers.id })
      .from(employers)
      .where(eq(employers.adminProfileId, req.user!.id))
      .limit(1);

    if (!employer) {
      res.status(404).json({ error: "No employer account found" });
      return;
    }

    const rules = await db
      .select()
      .from(employerModalityRules)
      .where(eq(employerModalityRules.employerId, employer.id));

    res.json(rules);
  } catch {
    res.status(500).json({ error: "Failed to fetch modality rules" });
  }
});

// ── CSV Export ─────────────────────────────────────────────────────────────────

router.get("/employer/export-csv", requireEmployerAuth, async (req, res) => {
  try {
    const [employer] = await db
      .select()
      .from(employers)
      .where(eq(employers.adminProfileId, req.user!.id))
      .limit(1);

    if (!employer) {
      res.status(404).json({ error: "No employer account found" });
      return;
    }

    // Aggregate-only export — no individual member rows to protect member privacy
    const rows = await db
      .select({
        monthlyBudget: employerMembers.monthlyBudget,
        spentThisMonth: employerMembers.spentThisMonth,
        linkedAt: employerMembers.linkedAt,
      })
      .from(employerMembers)
      .where(eq(employerMembers.employerId, employer.id));

    const buckets = [
      { label: "0–25%", min: 0, max: 25, count: 0, totalBudget: 0, totalSpent: 0 },
      { label: "25–50%", min: 25, max: 50, count: 0, totalBudget: 0, totalSpent: 0 },
      { label: "50–75%", min: 50, max: 75, count: 0, totalBudget: 0, totalSpent: 0 },
      { label: "75–100%", min: 75, max: 100, count: 0, totalBudget: 0, totalSpent: 0 },
      { label: "100%+", min: 100, max: Infinity, count: 0, totalBudget: 0, totalSpent: 0 },
    ];
    for (const r of rows) {
      const pct = r.monthlyBudget && r.monthlyBudget > 0 ? (r.spentThisMonth / r.monthlyBudget) * 100 : 0;
      const b = buckets.find((b) => pct >= b.min && pct < b.max) ?? buckets[buckets.length - 1];
      b.count++;
      b.totalBudget += r.monthlyBudget ?? 0;
      b.totalSpent += r.spentThisMonth ?? 0;
    }
    const total = rows.length;

    const lines = [
      "utilization_bracket,member_count,pct_of_enrolled,avg_budget_usd,avg_spent_usd",
    ];
    for (const b of buckets) {
      const pctEnrolled = total > 0 ? ((b.count / total) * 100).toFixed(1) : "0.0";
      const avgBudget = b.count > 0 ? (b.totalBudget / b.count / 100).toFixed(2) : "0.00";
      const avgSpent = b.count > 0 ? (b.totalSpent / b.count / 100).toFixed(2) : "0.00";
      lines.push(`"${b.label}",${b.count},${pctEnrolled}%,${avgBudget},${avgSpent}`);
    }

    const csv = lines.join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${employer.companyName.replace(/\s+/g, "_")}_utilization.csv"`
    );
    res.send(csv);
  } catch {
    res.status(500).json({ error: "Failed to export CSV" });
  }
});

// ── Admin Employer Management ──────────────────────────────────────────────────

router.get("/admin/employers", requireAdminAuth, async (req, res) => {
  try {
    const all = await db
      .select()
      .from(employers)
      .orderBy(desc(employers.createdAt));

    const withCounts = await Promise.all(
      all.map(async (emp) => {
        const [{ memberCount }] = await db
          .select({ memberCount: count() })
          .from(employerMembers)
          .where(eq(employerMembers.employerId, emp.id));
        return { ...emp, memberCount };
      })
    );

    res.json(withCounts);
  } catch {
    res.status(500).json({ error: "Failed to fetch employers" });
  }
});

router.get("/admin/employers/:id", requireAdminAuth, async (req, res) => {
  try {
    const [employer] = await db
      .select()
      .from(employers)
      .where(eq(employers.id, String(req.params.id)))
      .limit(1);

    if (!employer) {
      res.status(404).json({ error: "Employer not found" });
      return;
    }

    const members = await db
      .select()
      .from(employerMembers)
      .where(eq(employerMembers.employerId, employer.id));

    const rules = await db
      .select()
      .from(employerModalityRules)
      .where(eq(employerModalityRules.employerId, employer.id));

    res.json({ employer, members, rules });
  } catch {
    res.status(500).json({ error: "Failed to fetch employer" });
  }
});

const AdminCreateEmployerBody = z.object({
  companyName: z.string().min(2),
  adminContactName: z.string().min(2),
  adminContactEmail: z.string().email(),
  billingContactEmail: z.string().email().optional(),
  numberOfEmployees: z.number().int().min(1),
  stipendPerEmployee: z.number().int().min(1000),
  status: z.enum(["pending", "active", "canceled"]).default("active"),
});

router.post("/admin/employers", requireAdminAuth, async (req, res) => {
  const parsed = AdminCreateEmployerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
    return;
  }

  try {
    let inviteCode: string;
    let attempts = 0;
    do {
      inviteCode = generateInviteCode();
      const conflict = await db
        .select({ id: employers.id })
        .from(employers)
        .where(eq(employers.inviteCode, inviteCode))
        .limit(1);
      if (!conflict.length) break;
    } while (++attempts < 10);

    const [employer] = await db
      .insert(employers)
      .values({
        id: randomUUID(),
        ...parsed.data,
        inviteCode: inviteCode!,
      })
      .returning();

    res.status(201).json(employer);
  } catch {
    res.status(500).json({ error: "Failed to create employer" });
  }
});

const AdminUpdateEmployerBody = z.object({
  companyName: z.string().min(2).optional(),
  adminContactName: z.string().min(2).optional(),
  adminContactEmail: z.string().email().optional(),
  billingContactEmail: z.string().email().optional(),
  numberOfEmployees: z.number().int().min(1).optional(),
  stipendPerEmployee: z.number().int().min(1000).optional(),
  status: z.enum(["pending", "active", "canceled"]).optional(),
});

router.patch("/admin/employers/:id", requireAdminAuth, async (req, res) => {
  const parsed = AdminUpdateEmployerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  try {
    const [updated] = await db
      .update(employers)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(employers.id, String(req.params.id)))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Employer not found" });
      return;
    }

    res.json(updated);
  } catch {
    res.status(500).json({ error: "Failed to update employer" });
  }
});

router.delete("/admin/employers/:id", requireAdminAuth, async (req, res) => {
  try {
    await db.delete(employers).where(eq(employers.id, String(req.params.id)));
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to delete employer" });
  }
});

// ── Stripe Billing ─────────────────────────────────────────────────────────────
// Production: set STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET env vars.
// Demo mode: returns invoice summary with stripe_mode: "demo" when key is absent.

router.post("/employer/billing/create-checkout", requireEmployerAuth, async (req, res) => {
  try {
    const [employer] = await db
      .select()
      .from(employers)
      .where(eq(employers.adminProfileId, req.user!.id))
      .limit(1);

    if (!employer) {
      res.status(404).json({ error: "No employer account found" });
      return;
    }

    // Enrolled count is for utilization display only; billing uses contracted headcount
    const enrolledResult = await db
      .select({ count: count() })
      .from(employerMembers)
      .where(eq(employerMembers.employerId, employer.id));
    const enrolled = enrolledResult[0]?.count ?? 0;

    // Invoice = contracted headcount × stipend + platform fee (matches spec requirement #4)
    const headcount = employer.numberOfEmployees;
    const unitAmountCents = employer.stipendPerEmployee;
    const feeMultiplier = 1 + employer.platformFeePercent / 100;
    const totalCents = Math.round(unitAmountCents * headcount * feeMultiplier);

    if (!stripe) {
      // Demo mode — no Stripe key configured
      res.json({
        stripe_mode: "demo",
        message: "Configure STRIPE_SECRET_KEY to enable live Stripe Checkout.",
        invoice_preview: {
          companyName: employer.companyName,
          contractedHeadcount: headcount,
          enrolledMembers: enrolled,
          stipendPerEmployee: fmt_cents(unitAmountCents),
          platformFee: `${employer.platformFeePercent}%`,
          totalMonthly: fmt_cents(totalCents),
          billingCycle: "monthly",
          formula: `${headcount} employees × ${fmt_cents(unitAmountCents)} × ${feeMultiplier.toFixed(3)}`,
        },
      });
      return;
    }

    // Ensure Stripe customer exists
    let customerId = employer.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        name: employer.companyName,
        email: employer.adminContactEmail,
        metadata: { employerId: employer.id },
      });
      customerId = customer.id;
      await db
        .update(employers)
        .set({ stripeCustomerId: customerId, updatedAt: new Date() })
        .where(eq(employers.id, employer.id));
    }

    const appDomain = process.env.APP_DOMAIN ?? "http://localhost:8080";
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Health Plan Factory — Wellness Stipend (${headcount} contracted employees)`,
              description: `$${(unitAmountCents / 100).toFixed(0)}/mo × ${headcount} employees + ${employer.platformFeePercent}% platform fee`,
            },
            unit_amount: totalCents,
            recurring: { interval: "month" },
          },
          quantity: 1,
        },
      ],
      success_url: `${appDomain}/employer/dashboard?billing=success`,
      cancel_url: `${appDomain}/employer/dashboard?billing=canceled`,
      metadata: { employerId: employer.id },
    });

    res.json({ stripe_mode: "live", url: session.url });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    res.status(500).json({ error: "Failed to create billing session" });
  }
});

// ── Stripe Webhook ─────────────────────────────────────────────────────────────
// Mount this route BEFORE the express.json() middleware so Stripe can verify the raw body.
// Register webhook at: https://dashboard.stripe.com/webhooks
// Events to subscribe: invoice.payment_succeeded, invoice.payment_failed, customer.subscription.deleted

router.post(
  "/employer/billing/webhook",
  async (req: Request, res: Response) => {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!stripe || !webhookSecret) {
      res.json({ received: true, note: "Stripe not configured — webhook ignored" });
      return;
    }

    // req.body is a raw Buffer here because app.ts mounts express.raw() for this route
    // before express.json(). This is required for Stripe signature verification.
    let event: Stripe.Event;
    try {
      const sig = req.headers["stripe-signature"] as string;
      event = stripe.webhooks.constructEvent(req.body as Buffer, sig, webhookSecret);
    } catch (err) {
      console.error("Stripe webhook signature verification failed:", err);
      res.status(400).json({ error: "Webhook signature invalid" });
      return;
    }

    try {
      switch (event.type) {
        case "invoice.payment_succeeded": {
          const invoice = event.data.object as Stripe.Invoice;
          // In API version 2026-03-25.dahlia, subscription is accessed via invoice.parent
          const parent = invoice.parent;
          let subId: string | null = null;
          if (parent?.type === "subscription_details" && parent.subscription_details) {
            const sub = parent.subscription_details.subscription;
            subId = typeof sub === "string" ? sub : sub.id;
          }
          if (subId && typeof invoice.customer === "string") {
            await db
              .update(employers)
              .set({ status: "active", stripeSubscriptionId: subId, updatedAt: new Date() })
              .where(eq(employers.stripeCustomerId, invoice.customer));
          }
          break;
        }
        case "invoice.payment_failed": {
          const invoice = event.data.object as Stripe.Invoice;
          if (typeof invoice.customer === "string") {
            console.warn("Invoice payment failed for Stripe customer:", invoice.customer);
          }
          break;
        }
        case "customer.subscription.deleted": {
          const sub = event.data.object as Stripe.Subscription;
          if (typeof sub.customer === "string") {
            await db
              .update(employers)
              .set({ status: "canceled", updatedAt: new Date() })
              .where(eq(employers.stripeCustomerId, sub.customer));
          }
          break;
        }
        default:
          break;
      }
      res.json({ received: true });
    } catch (err) {
      console.error("Stripe webhook handler error:", err);
      res.status(500).json({ error: "Webhook processing failed" });
    }
  }
);

// Helper: format cents as dollar string (server-side only)
function fmt_cents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default router;
