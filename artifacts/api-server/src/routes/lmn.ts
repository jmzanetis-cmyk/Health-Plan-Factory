import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { profiles, modalities, plans, planItems, lmnRequests } from "@workspace/db";
import { eq, and, desc, inArray } from "drizzle-orm";
import { z } from "zod";
import crypto from "crypto";
import type { Request, Response } from "express";
import PDFDocument from "pdfkit";

const router: IRouter = Router();

function requireMemberAuth(req: Request, res: Response): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Authentication required" });
    return false;
  }
  if (req.user!.role !== "member" && req.user!.role !== "admin") {
    res.status(403).json({ error: "Member account required" });
    return false;
  }
  return true;
}

// ── GET /lmn/status ───────────────────────────────────────────────────────────
// Returns the member's LMN status, eligible modalities from their active plan,
// and estimated annual HSA/FSA savings.
router.get("/lmn/status", async (req, res) => {
  if (!requireMemberAuth(req, res)) return;
  try {
    const profileId = req.user!.id;

    const [profile] = await db
      .select({ lmnStatus: profiles.lmnStatus })
      .from(profiles)
      .where(eq(profiles.id, profileId));

    // Get the member's most recent plan (regardless of status — plans default to "generated")
    const [activePlan] = await db
      .select({ id: plans.id })
      .from(plans)
      .where(eq(plans.profileId, profileId))
      .orderBy(desc(plans.createdAt))
      .limit(1);

    let eligibleItems: { modalityId: string; name: string; emoji: string; estimatedMonthlyCost: number }[] = [];
    let estimatedAnnualSavings = 0;

    if (activePlan) {
      const items = await db
        .select({
          modalityId: planItems.modalityId,
          estimatedMonthlyCost: planItems.estimatedMonthlyCost,
          name: modalities.name,
          emoji: modalities.emoji,
          lmnEligible: modalities.lmnEligible,
        })
        .from(planItems)
        .innerJoin(modalities, eq(planItems.modalityId, modalities.id))
        .where(eq(planItems.planId, activePlan.id));

      eligibleItems = items
        .filter((i) => i.lmnEligible)
        .map((i) => ({
          modalityId: i.modalityId,
          name: i.name,
          emoji: i.emoji,
          // Convert dollars → cents so UI can safely divide by 100
          estimatedMonthlyCost: (i.estimatedMonthlyCost ?? 0) * 100,
        }));

      // Estimated annual savings in cents: eligible item costs × 12 months × 100 (dollars→cents)
      estimatedAnnualSavings = items
        .filter((i) => i.lmnEligible)
        .reduce((sum, i) => sum + (i.estimatedMonthlyCost ?? 0) * 12 * 100, 0);
    }

    // Get latest LMN request if exists
    const [latestRequest] = await db
      .select()
      .from(lmnRequests)
      .where(eq(lmnRequests.profileId, profileId))
      .orderBy(desc(lmnRequests.createdAt))
      .limit(1);

    res.json({
      lmnStatus: profile?.lmnStatus ?? "none",
      eligibleItems,
      estimatedAnnualSavings,
      hasActivePlan: !!activePlan,
      latestRequest: latestRequest ?? null,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

// ── POST /lmn/request ─────────────────────────────────────────────────────────
// Creates (or refreshes) a draft LMN request for the member.
// Called after a member adds a DPC/medical provider or explicitly from the HSA flow.
router.post("/lmn/request", async (req, res) => {
  if (!requireMemberAuth(req, res)) return;
  try {
    const profileId = req.user!.id;

    const [profile] = await db
      .select({ displayName: profiles.displayName, lmnStatus: profiles.lmnStatus })
      .from(profiles)
      .where(eq(profiles.id, profileId));

    // Get most recent plan (regardless of status — plans default to "generated")
    const [activePlan] = await db
      .select({ id: plans.id })
      .from(plans)
      .where(eq(plans.profileId, profileId))
      .orderBy(desc(plans.createdAt))
      .limit(1);

    // Gather LMN-eligible modalities from plan
    let eligibleNames: string[] = [];
    let eligibleIds: string[] = [];
    let estimatedAnnualSavings = 0;

    if (activePlan) {
      const items = await db
        .select({
          modalityId: planItems.modalityId,
          name: modalities.name,
          estimatedMonthlyCost: planItems.estimatedMonthlyCost,
          lmnEligible: modalities.lmnEligible,
        })
        .from(planItems)
        .innerJoin(modalities, eq(planItems.modalityId, modalities.id))
        .where(eq(planItems.planId, activePlan.id));

      const eligible = items.filter((i) => i.lmnEligible);
      eligibleNames = eligible.map((i) => i.name);
      eligibleIds = eligible.map((i) => i.modalityId);
      // Convert dollars → cents (× 100) so stored value is consistent with /lmn/status
      estimatedAnnualSavings = eligible.reduce((sum, i) => sum + (i.estimatedMonthlyCost ?? 0) * 12 * 100, 0);
    }

    const memberName = profile?.displayName ?? "Your patient";
    const modalityList =
      eligibleNames.length > 0
        ? eligibleNames.join(", ")
        : "wellness services (massage, physical therapy, yoga, acupuncture)";

    const draftMessage = `Dear Doctor,

I am writing to request a Letter of Medical Necessity (LMN) for my HSA/FSA reimbursement.

My name is ${memberName}. Based on my personalized wellness plan, I have been advised to pursue the following services that may qualify for HSA/FSA reimbursement when supported by an LMN:

${eligibleNames.length > 0 ? eligibleNames.map((n) => `  • ${n}`).join("\n") : `  • ${modalityList}`}

These services are part of my ongoing wellness plan. An LMN documenting medical necessity for these services would allow me to use my HSA/FSA funds to cover these costs, potentially saving ${estimatedAnnualSavings > 0 ? `$${(estimatedAnnualSavings / 100).toFixed(0)}/year` : "significant costs"}.

Please let me know if you need any additional information to complete this letter.

Thank you,
${memberName}`;

    const [request] = await db
      .insert(lmnRequests)
      .values({
        id: crypto.randomUUID(),
        profileId,
        planId: activePlan?.id ?? null,
        status: "draft",
        draftMessage,
        eligibleModalities: eligibleIds,
        estimatedAnnualSavings: estimatedAnnualSavings > 0 ? estimatedAnnualSavings : null,
        updatedAt: new Date(),
      })
      .returning();

    // Update profile LMN status to "requested" if currently "none"
    if (profile?.lmnStatus === "none") {
      await db
        .update(profiles)
        .set({ lmnStatus: "requested", updatedAt: new Date() })
        .where(eq(profiles.id, profileId));
    }

    res.status(201).json({ request, lmnStatus: profile?.lmnStatus === "none" ? "requested" : profile?.lmnStatus });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

// ── POST /lmn/mark-received ───────────────────────────────────────────────────
// Member self-reports that their physician has delivered the LMN.
// Activates "LMN on file" badge on all eligible progress log entries.
router.post("/lmn/mark-received", async (req, res) => {
  if (!requireMemberAuth(req, res)) return;
  try {
    const profileId = req.user!.id;

    await db
      .update(profiles)
      .set({ lmnStatus: "received", updatedAt: new Date() })
      .where(eq(profiles.id, profileId));

    // Update latest LMN request status
    const [latest] = await db
      .select({ id: lmnRequests.id })
      .from(lmnRequests)
      .where(eq(lmnRequests.profileId, profileId))
      .orderBy(desc(lmnRequests.createdAt))
      .limit(1);

    if (latest) {
      await db
        .update(lmnRequests)
        .set({ status: "received", updatedAt: new Date() })
        .where(eq(lmnRequests.id, latest.id));
    }

    res.json({ lmnStatus: "received" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

// ── GET /lmn/pdf ──────────────────────────────────────────────────────────────
// Authenticated endpoint — streams a branded clinical PDF for the member's
// most recent LMN request. Only accessible by the requesting member.
router.get("/lmn/pdf", async (req, res) => {
  if (!requireMemberAuth(req, res)) return;
  try {
    const profileId = req.user!.id;

    // Load profile
    const [profile] = await db
      .select({ displayName: profiles.displayName, email: profiles.email, lmnStatus: profiles.lmnStatus })
      .from(profiles)
      .where(eq(profiles.id, profileId))
      .limit(1);

    // Load most recent LMN request
    const [lmnReq] = await db
      .select()
      .from(lmnRequests)
      .where(eq(lmnRequests.profileId, profileId))
      .orderBy(desc(lmnRequests.createdAt))
      .limit(1);

    if (!lmnReq) {
      res.status(404).json({ error: "No LMN request found. Please generate a draft first." });
      return;
    }

    // Load plan items joined with modality data (filter to lmn-eligible ones)
    interface EligibleItem {
      name: string;
      emoji: string;
      description: string;
      rationale: string;
      estimatedMonthlyCost: number;
      lmnEligible: boolean;
    }
    let eligibleItems: EligibleItem[] = [];

    if (lmnReq.planId) {
      const items = await db
        .select({
          name: modalities.name,
          emoji: modalities.emoji,
          description: modalities.description,
          rationale: planItems.rationale,
          estimatedMonthlyCost: planItems.estimatedMonthlyCost,
          lmnEligible: modalities.lmnEligible,
        })
        .from(planItems)
        .innerJoin(modalities, eq(planItems.modalityId, modalities.id))
        .where(eq(planItems.planId, lmnReq.planId));
      eligibleItems = items.filter((i) => i.lmnEligible);
    } else if (lmnReq.eligibleModalities?.length) {
      // Fallback: load modalities by ID when planId is missing
      const mods = await db
        .select({ name: modalities.name, emoji: modalities.emoji, description: modalities.description, costLow: modalities.costLow })
        .from(modalities)
        .where(inArray(modalities.id, lmnReq.eligibleModalities));
      eligibleItems = mods.map((m) => ({
        name: m.name,
        emoji: m.emoji,
        description: m.description,
        rationale: m.description,
        estimatedMonthlyCost: m.costLow,
        lmnEligible: true,
      }));
    }

    const memberName = profile?.displayName ?? "Member";
    const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    const safeName = (profile?.displayName ?? "member").toLowerCase().replace(/\s+/g, "-");
    const fileName = `lmn-draft-${safeName}-${new Date().toISOString().slice(0, 10)}.pdf`;

    // ── PDF constants ────────────────────────────────────────────────────────
    const NAVY  = "#1a2a3a";
    const PINK  = "#D4227E";
    const GRAY  = "#6b8499";
    const RULE  = "#e2e8f0";
    const PAGE_W = 612;
    const M      = 54;
    const CW     = PAGE_W - M * 2;
    const COL    = {
      service:  M,
      rationale: M + CW * 0.23,
      monthly:  M + CW * 0.73,
      annual:   M + CW * 0.87,
    };

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

    const doc = new PDFDocument({
      size: "LETTER",
      margins: { top: M, bottom: M + 20, left: M, right: M },
      autoFirstPage: false,
      bufferPages: true,
    });
    doc.pipe(res);

    // ── MAIN PAGE ────────────────────────────────────────────────────────────
    doc.addPage();

    // ── LETTERHEAD ───────────────────────────────────────────────────────────
    // Header bar
    doc.rect(0, 0, PAGE_W, 76).fill(NAVY);
    doc.fill(PINK)
      .font("Helvetica-Bold")
      .fontSize(20)
      .text("Health Plan Factory", M, 20, { lineBreak: false });
    doc.fill("white")
      .font("Helvetica")
      .fontSize(9.5)
      .text("Personalized Wellness Optimization", M, 46, { lineBreak: false });
    doc.fill("white")
      .font("Helvetica")
      .fontSize(8)
      .text("www.healthplanfactory.com  |  hello@healthplanfactory.com", PAGE_W - M - 230, 20, { width: 230, align: "right", lineBreak: false });
    doc.fill("white")
      .font("Helvetica")
      .fontSize(8)
      .text("This document is a draft prepared for informational purposes only.", PAGE_W - M - 230, 34, { width: 230, align: "right", lineBreak: false });

    // Reset top margin
    const contentTop = 96;
    doc.y = contentTop;

    // Rule after header
    doc
      .moveTo(M, contentTop)
      .lineTo(PAGE_W - M, contentTop)
      .lineWidth(1)
      .stroke(RULE);
    doc.y = contentTop + 14;

    // ── DOCUMENT TITLE ───────────────────────────────────────────────────────
    doc
      .fill(NAVY)
      .font("Helvetica-Bold")
      .fontSize(14)
      .text("LETTER OF MEDICAL NECESSITY", M, doc.y, { characterSpacing: 0.5 });
    doc
      .fill(GRAY)
      .font("Helvetica")
      .fontSize(10)
      .text("DRAFT — For Physician Review and Countersignature", { characterSpacing: 0 });
    doc.moveDown(0.8);

    // ── HEADER FIELDS ────────────────────────────────────────────────────────
    const fieldY = doc.y;
    doc.fill(GRAY).font("Helvetica").fontSize(9).text("DATE:", M, fieldY);
    doc.fill(NAVY).font("Helvetica-Bold").fontSize(9).text(today, M + 52, fieldY);
    doc.fill(GRAY).font("Helvetica").fontSize(9).text("PATIENT NAME:", M, fieldY + 14);
    doc.fill(NAVY).font("Helvetica-Bold").fontSize(9).text(memberName, M + 85, fieldY + 14);
    doc.fill(GRAY).font("Helvetica").fontSize(9).text("RE:", M, fieldY + 28);
    doc.fill(NAVY).font("Helvetica").fontSize(9).text("Request for Letter of Medical Necessity — Wellness Services", M + 24, fieldY + 28);
    doc.y = fieldY + 52;

    // Horizontal rule
    doc.moveTo(M, doc.y).lineTo(PAGE_W - M, doc.y).lineWidth(0.5).stroke(RULE);
    doc.moveDown(1);

    // ── SALUTATION + OPENING ─────────────────────────────────────────────────
    doc.fill(NAVY).font("Helvetica-Bold").fontSize(10.5).text("To Whom It May Concern,");
    doc.moveDown(0.5);
    doc.fill("#2d3748").font("Helvetica").fontSize(10).text(
      `My name is ${memberName}. I am writing to request a Letter of Medical Necessity (LMN) in support of HSA/FSA reimbursement for the wellness services listed below. These services have been recommended as part of my personalized wellness plan and are directly relevant to my ongoing health conditions and goals. I respectfully ask that you review this request and, if appropriate, provide a signed LMN that I may submit to my HSA/FSA administrator.`,
      { lineGap: 2, align: "justify" },
    );
    doc.moveDown(1);

    // ── MODALITY TABLE ───────────────────────────────────────────────────────
    // Section heading
    doc
      .fill(NAVY)
      .font("Helvetica-Bold")
      .fontSize(10.5)
      .text("Requested Services with Clinical Rationale");
    doc.moveDown(0.4);

    // Table header
    const tableHeaderY = doc.y;
    doc.rect(M, tableHeaderY, CW, 22).fill(NAVY);
    const headerItems: [string, number, number][] = [
      ["Service", COL.service, 80],
      ["Clinical Rationale", COL.rationale, (COL.monthly - COL.rationale) - 8],
      ["Monthly", COL.monthly, (COL.annual - COL.monthly) - 4],
      ["Annual", COL.annual, PAGE_W - M - COL.annual],
    ];
    doc.fill("white").font("Helvetica-Bold").fontSize(8.5);
    for (const [label, x, w] of headerItems) {
      doc.text(label, x + 4, tableHeaderY + 7, { width: w, lineBreak: false });
    }
    doc.y = tableHeaderY + 22;

    // Table rows
    const items = eligibleItems.length > 0
      ? eligibleItems
      : [{ name: "Wellness Service", emoji: "✨", description: "", rationale: "As recommended by treating physician", estimatedMonthlyCost: 0, lmnEligible: true }];

    let totalAnnual = 0;
    items.forEach((item, i) => {
      const rowY = doc.y;
      const isEven = i % 2 === 0;
      const ratText = item.rationale ?? item.description ?? "";
      // Estimate row height
      const estLines = Math.ceil(ratText.length / 60);
      const rowH = Math.max(28, estLines * 12 + 10);

      if (isEven) doc.rect(M, rowY, CW, rowH).fill("#f7f9fc");
      else doc.rect(M, rowY, CW, rowH).fill("white");

      // Service name
      doc.fill(NAVY).font("Helvetica-Bold").fontSize(9).text(
        `${item.emoji} ${item.name}`,
        COL.service + 4, rowY + 6,
        { width: COL.rationale - COL.service - 8, lineBreak: false },
      );

      // Rationale (may wrap)
      doc.fill("#2d3748").font("Helvetica").fontSize(8.5).text(
        ratText.length > 150 ? ratText.slice(0, 150) + "…" : ratText,
        COL.rationale + 4, rowY + 6,
        { width: COL.monthly - COL.rationale - 12, lineGap: 1 },
      );

      // Monthly cost
      const monthly = item.estimatedMonthlyCost ?? 0;
      totalAnnual += monthly * 12;
      doc.fill(NAVY).font("Helvetica").fontSize(9).text(
        monthly > 0 ? `$${monthly}/mo` : "—",
        COL.monthly + 2, rowY + 6,
        { width: COL.annual - COL.monthly - 4, lineBreak: false },
      );
      // Annual cost
      doc.fill(NAVY).font("Helvetica-Bold").fontSize(9).text(
        monthly > 0 ? `$${monthly * 12}/yr` : "—",
        COL.annual + 2, rowY + 6,
        { width: PAGE_W - M - COL.annual - 4, lineBreak: false },
      );

      // Row border
      doc.moveTo(M, rowY + rowH).lineTo(PAGE_W - M, rowY + rowH).lineWidth(0.5).stroke(RULE);
      doc.y = rowY + rowH;
    });

    // Totals row
    const totalsY = doc.y;
    const savingsCents = lmnReq.estimatedAnnualSavings ?? null;
    const displayTotal = savingsCents != null ? Math.round(savingsCents / 100) : totalAnnual;
    doc.rect(M, totalsY, CW, 26).fill(NAVY);
    doc.fill("white").font("Helvetica-Bold").fontSize(9)
      .text("Estimated Annual HSA/FSA Savings", M + 4, totalsY + 8, { width: CW - 90, lineBreak: false });
    doc.fill(PINK).font("Helvetica-Bold").fontSize(11)
      .text(displayTotal > 0 ? `$${displayTotal}/yr` : "—", PAGE_W - M - 72, totalsY + 7, { width: 68, align: "right", lineBreak: false });
    doc.y = totalsY + 26;
    doc.moveDown(1.2);

    // ── SIGNATURE BLOCK ──────────────────────────────────────────────────────
    doc.moveTo(M, doc.y).lineTo(PAGE_W - M, doc.y).lineWidth(0.5).stroke(RULE);
    doc.moveDown(0.8);
    doc
      .fill(NAVY)
      .font("Helvetica-Bold")
      .fontSize(10.5)
      .text("Physician Attestation & Signature");
    doc.moveDown(0.5);

    const sigNote = `I, the undersigned licensed physician, certify that the wellness services listed above are medically necessary for the above-named patient based on their diagnosed conditions and documented health needs. This letter is provided for the purpose of supporting the patient's HSA/FSA reimbursement claim.`;
    doc.fill("#2d3748").font("Helvetica").fontSize(9.5).text(sigNote, { lineGap: 2, align: "justify" });
    doc.moveDown(1);

    // Signature lines
    const sigLines: [string, string][] = [
      ["Physician Name (Print)", ""],
      ["Medical License Number", ""],
      ["NPI", ""],
      ["Practice / Clinic", ""],
      ["Signature", "Date"],
    ];
    for (const [leftLabel, rightLabel] of sigLines) {
      const lineY = doc.y;
      doc.fill(GRAY).font("Helvetica").fontSize(8.5).text(leftLabel, M, lineY);
      const lineStart = M;
      const lineEnd = rightLabel ? PAGE_W - M - 120 : PAGE_W - M;
      doc.moveTo(lineStart, lineY + 14).lineTo(lineEnd, lineY + 14).lineWidth(0.75).stroke("#cbd5e0");
      if (rightLabel) {
        doc.fill(GRAY).font("Helvetica").fontSize(8.5).text(rightLabel, PAGE_W - M - 112, lineY);
        doc.moveTo(PAGE_W - M - 112, lineY + 14).lineTo(PAGE_W - M, lineY + 14).lineWidth(0.75).stroke("#cbd5e0");
      }
      doc.y = lineY + 22;
    }

    // ── DISCLAIMER FOOTER ────────────────────────────────────────────────────
    // Add footer to all pages
    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      doc
        .moveTo(M, 752)
        .lineTo(PAGE_W - M, 752)
        .lineWidth(0.5)
        .stroke(RULE);
      doc
        .fill(GRAY)
        .font("Helvetica")
        .fontSize(7.5)
        .text(
          "DISCLAIMER: This document is a draft template prepared by Health Plan Factory (a wellness referral platform) for informational and organizational purposes only. Health Plan Factory does not provide medical advice, diagnoses, or treatment. It is not a substitute for professional medical advice. Always consult a qualified physician regarding the medical necessity of any service. HSA/FSA eligibility determinations are made solely by your plan administrator and applicable tax authorities.",
          M,
          756,
          { width: CW, align: "left", lineGap: 0 },
        );
      doc
        .fill(GRAY)
        .font("Helvetica")
        .fontSize(7.5)
        .text(`Page ${i + 1} of ${pageCount}`, PAGE_W - M - 60, 756, { width: 60, align: "right", lineBreak: false });
    }

    doc.end();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    if (!res.headersSent) res.status(500).json({ error: message });
  }
});

// ── GET /lmn/eligible-modalities ─────────────────────────────────────────────
// Public endpoint — returns all modalities flagged as LMN-eligible.
router.get("/lmn/eligible-modalities", async (_req, res) => {
  try {
    const rows = await db
      .select({
        id: modalities.id,
        name: modalities.name,
        emoji: modalities.emoji,
        category: modalities.category,
        costLow: modalities.costLow,
        costHigh: modalities.costHigh,
        description: modalities.description,
      })
      .from(modalities)
      .where(and(eq(modalities.lmnEligible, true), eq(modalities.isActive, true)));

    res.json({ modalities: rows });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

export default router;
