import { Router, type IRouter } from "express";
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

function requireEmployerAuth(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  next();
}

function requireAdminAuth(req: any, res: any, next: any) {
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

router.post("/employer/signup", requireEmployerAuth, async (req: any, res) => {
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

router.get("/employer/me", requireEmployerAuth, async (req: any, res) => {
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

// ── Employer Dashboard Stats ───────────────────────────────────────────────────

router.get("/employer/dashboard", requireEmployerAuth, async (req: any, res) => {
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
    const totalSpentCents = members.reduce((sum, m) => sum + m.spentThisMonth, 0);
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

    const currentMonth = new Date().toISOString().slice(0, 7);
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
        totalSpentCents,
        utilizationPct,
        avgWellnessScore,
        monthlyInvoiceCents:
          employer.stipendPerEmployee *
          totalEnrolled *
          (1 + employer.platformFeePercent / 100),
      },
      topModalities,
      monthlySpend,
    });
  } catch (err) {
    console.error("Dashboard error:", err);
    res.status(500).json({ error: "Failed to load dashboard" });
  }
});

// ── Employer Members List ──────────────────────────────────────────────────────

router.get("/employer/members", requireEmployerAuth, async (req: any, res) => {
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

    const members = await db
      .select({
        id: employerMembers.id,
        monthlyBudget: employerMembers.monthlyBudget,
        spentThisMonth: employerMembers.spentThisMonth,
        budgetMonth: employerMembers.budgetMonth,
        linkedAt: employerMembers.linkedAt,
      })
      .from(employerMembers)
      .where(eq(employerMembers.employerId, employer.id));

    res.json(members);
  } catch {
    res.status(500).json({ error: "Failed to fetch members" });
  }
});

// ── Redeem Employer Invite Code ────────────────────────────────────────────────

const RedeemCodeBody = z.object({ inviteCode: z.string().min(1) });

router.post("/employer/redeem-code", requireEmployerAuth, async (req: any, res) => {
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

    const existing = await db
      .select({ id: employerMembers.id })
      .from(employerMembers)
      .where(
        and(
          eq(employerMembers.employerId, employer.id),
          eq(employerMembers.profileId, profileId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      res.status(409).json({ error: "Already enrolled with this employer" });
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

router.get("/employer/my-budget", requireEmployerAuth, async (req: any, res) => {
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

    res.json({
      enrolled: true,
      ...link,
      remainingCents: link.monthlyBudget - link.spentThisMonth,
    });
  } catch {
    res.status(500).json({ error: "Failed to fetch budget" });
  }
});

// ── Employer Modality Rules ────────────────────────────────────────────────────

const SetModalityRulesBody = z.object({
  rules: z.array(z.object({
    modalityId: z.string(),
    covered: z.boolean(),
  })),
});

router.put("/employer/modality-rules", requireEmployerAuth, async (req: any, res) => {
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

router.get("/employer/modality-rules", requireEmployerAuth, async (req: any, res) => {
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

router.get("/employer/export-csv", requireEmployerAuth, async (req: any, res) => {
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
      .select({
        id: employerMembers.id,
        monthlyBudget: employerMembers.monthlyBudget,
        spentThisMonth: employerMembers.spentThisMonth,
        budgetMonth: employerMembers.budgetMonth,
        linkedAt: employerMembers.linkedAt,
      })
      .from(employerMembers)
      .where(eq(employerMembers.employerId, employer.id));

    const lines = [
      "member_id,monthly_budget_usd,spent_this_month_usd,utilization_pct,budget_month,enrolled_date",
    ];
    for (const m of members) {
      const pct = m.monthlyBudget > 0
        ? ((m.spentThisMonth / m.monthlyBudget) * 100).toFixed(1)
        : "0.0";
      lines.push(
        `${m.id},${(m.monthlyBudget / 100).toFixed(2)},${(m.spentThisMonth / 100).toFixed(2)},${pct}%,${m.budgetMonth ?? ""},${m.linkedAt.toISOString().split("T")[0]}`
      );
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

router.get("/admin/employers", requireAdminAuth, async (req: any, res) => {
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

router.get("/admin/employers/:id", requireAdminAuth, async (req: any, res) => {
  try {
    const [employer] = await db
      .select()
      .from(employers)
      .where(eq(employers.id, req.params.id))
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

router.post("/admin/employers", requireAdminAuth, async (req: any, res) => {
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

router.patch("/admin/employers/:id", requireAdminAuth, async (req: any, res) => {
  const parsed = AdminUpdateEmployerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  try {
    const [updated] = await db
      .update(employers)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(employers.id, req.params.id))
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

router.delete("/admin/employers/:id", requireAdminAuth, async (req: any, res) => {
  try {
    await db.delete(employers).where(eq(employers.id, req.params.id));
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to delete employer" });
  }
});

// ── Stripe Billing ─────────────────────────────────────────────────────────────
// Production: set STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET env vars.
// Demo mode: returns invoice summary with stripe_mode: "demo" when key is absent.

router.post("/employer/billing/create-checkout", requireEmployerAuth, async (req: any, res) => {
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

    const enrolledResult = await db
      .select({ count: count() })
      .from(employerMembers)
      .where(eq(employerMembers.employerId, employer.id));
    const enrolled = enrolledResult[0]?.count ?? 0;

    const unitAmountCents = employer.stipendPerEmployee;
    const feeMultiplier = 1 + employer.platformFeePercent / 100;
    const totalCents = Math.round(unitAmountCents * enrolled * feeMultiplier);

    if (!stripe) {
      // Demo mode — no Stripe key configured
      res.json({
        stripe_mode: "demo",
        message: "Configure STRIPE_SECRET_KEY to enable live Stripe Checkout.",
        invoice_preview: {
          companyName: employer.companyName,
          enrolledMembers: enrolled,
          stipendPerMember: fmt_cents(unitAmountCents),
          platformFee: `${employer.platformFeePercent}%`,
          totalMonthly: fmt_cents(totalCents),
          billingCycle: "monthly",
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
              name: `Health Plan Factory — Wellness Stipend (${enrolled} employees)`,
              description: `$${(unitAmountCents / 100).toFixed(0)}/mo per employee + ${employer.platformFeePercent}% platform fee`,
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
  // Stripe requires the raw body for signature verification
  (req: any, res, next) => {
    // If body is already a Buffer (raw body middleware configured), use it
    // Otherwise fall through — signature verification will fail gracefully
    next();
  },
  async (req: any, res) => {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!stripe || !webhookSecret) {
      res.json({ received: true, note: "Stripe not configured — webhook ignored" });
      return;
    }

    let event: Stripe.Event;
    try {
      const sig = req.headers["stripe-signature"] as string;
      const rawBody = req.rawBody ?? req.body;
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } catch (err) {
      console.error("Stripe webhook signature verification failed:", err);
      res.status(400).json({ error: "Webhook signature invalid" });
      return;
    }

    try {
      switch (event.type) {
        case "invoice.payment_succeeded": {
          // Use `any` cast — the subscription field path varies across Stripe API versions
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const invoice = event.data.object as any;
          const subId: string | null =
            typeof invoice.subscription === "string"
              ? invoice.subscription
              : invoice.parent?.subscription_details?.subscription ?? null;
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
            // Optionally set status to pending — business decision
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
