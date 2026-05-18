import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { demoRequests } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import { z } from "zod";
import { Resend } from "resend";
import { strictLimiter } from "../middlewares/rateLimit";

const router: IRouter = Router();

// Demo requests trigger admin emails — strict limit
router.use(strictLimiter);

const resendKey = process.env.RESEND_API_KEY;
const resendClient = resendKey ? new Resend(resendKey) : null;
const ADMIN_EMAIL = process.env.ADMIN_DEMO_EMAIL ?? "admin@healthplanfactory.com";

const DemoRequestBody = z.object({
  name: z.string().min(1).max(200),
  company: z.string().min(1).max(200),
  companySize: z.string().min(1).max(50),
  email: z.string().email(),
  phone: z.string().max(30).optional(),
  message: z.string().max(2000).optional(),
});

async function sendRawEmail(to: string, subject: string, html: string): Promise<void> {
  if (!resendClient) {
    console.warn("[demoRequests] Resend not configured — RESEND_API_KEY missing. Email would send to:", to);
    return;
  }
  try {
    await resendClient.emails.send({
      from: "Health Plan Factory <noreply@healthplanfactory.com>",
      to,
      subject,
      html,
    });
  } catch (err) {
    console.error("[demoRequests] sendRawEmail failed:", err);
  }
}

router.post("/demo-request", async (req, res) => {
  const parsed = DemoRequestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
    return;
  }

  const { name, company, companySize, email, phone, message } = parsed.data;

  try {
    const id = randomUUID();
    const [record] = await db
      .insert(demoRequests)
      .values({ id, name, company, companySize, email, phone, message })
      .returning();

    const adminHtml = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#2C2825">New Demo Request</h2>
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:8px;font-weight:600;color:#555">Name</td><td style="padding:8px">${name}</td></tr>
          <tr style="background:#f9f9f9"><td style="padding:8px;font-weight:600;color:#555">Company</td><td style="padding:8px">${company}</td></tr>
          <tr><td style="padding:8px;font-weight:600;color:#555">Company Size</td><td style="padding:8px">${companySize}</td></tr>
          <tr style="background:#f9f9f9"><td style="padding:8px;font-weight:600;color:#555">Email</td><td style="padding:8px"><a href="mailto:${email}">${email}</a></td></tr>
          ${phone ? `<tr><td style="padding:8px;font-weight:600;color:#555">Phone</td><td style="padding:8px">${phone}</td></tr>` : ""}
          ${message ? `<tr style="background:#f9f9f9"><td style="padding:8px;font-weight:600;color:#555;vertical-align:top">Message</td><td style="padding:8px;white-space:pre-wrap">${message}</td></tr>` : ""}
        </table>
        <p style="margin-top:24px;color:#888;font-size:13px">Lead ID: ${id}</p>
      </div>
    `;

    const confirmHtml = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#2C2825;padding:32px;text-align:center">
          <h1 style="color:white;margin:0;font-size:24px">Health Plan Factory</h1>
        </div>
        <div style="padding:32px">
          <h2 style="color:#2C2825">Thanks, ${name}!</h2>
          <p style="color:#555;line-height:1.6">
            We received your demo request for <strong>${company}</strong>. Our team will reach out within 1 business day to schedule a walk-through of the employer portal.
          </p>
          <p style="color:#555;line-height:1.6">In the meantime, here's what to expect:</p>
          <ul style="color:#555;line-height:1.8">
            <li>A personalized tour of the employer dashboard</li>
            <li>Live demonstration of the employee onboarding flow</li>
            <li>Pricing confirmation for your team size (${companySize})</li>
            <li>Q&amp;A with our team</li>
          </ul>
          <div style="margin-top:32px;padding:20px;background:#f9f9f9;border-radius:8px">
            <p style="margin:0;color:#888;font-size:13px">Questions? Reply to this email or reach us at <a href="mailto:employers@healthplanfactory.com" style="color:#E02040">employers@healthplanfactory.com</a></p>
          </div>
        </div>
      </div>
    `;

    sendRawEmail(ADMIN_EMAIL, `Demo request — ${company} (${companySize})`, adminHtml).catch(() => {});
    sendRawEmail(email, "Your demo request — Health Plan Factory", confirmHtml).catch(() => {});

    res.status(201).json({ success: true, id: record.id });
  } catch (err) {
    console.error("[demoRequests] Failed to store demo request:", err);
    res.status(500).json({ error: "Failed to submit demo request" });
  }
});

const VALID_DEMO_STATUSES = ["new", "contacted", "qualified", "closed"] as const;
type DemoStatus = typeof VALID_DEMO_STATUSES[number];

router.get("/admin/demo-requests", async (req, res) => {
  if (!req.isAuthenticated() || req.user!.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  const status = req.query.status as string | undefined;
  if (status && !VALID_DEMO_STATUSES.includes(status as DemoStatus)) {
    res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_DEMO_STATUSES.join(", ")}` });
    return;
  }

  try {
    const rows = await db
      .select()
      .from(demoRequests)
      .where(status ? eq(demoRequests.status, status) : undefined)
      .orderBy(desc(demoRequests.createdAt));
    res.json(rows);
  } catch {
    res.status(500).json({ error: "Failed to fetch demo requests" });
  }
});

const PatchDemoRequestBody = z.object({
  status: z.enum(VALID_DEMO_STATUSES).optional(),
  notes: z.string().max(5000).optional(),
});

router.patch("/admin/demo-requests/:id", async (req, res) => {
  if (!req.isAuthenticated() || req.user!.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  const { id } = req.params;
  const parsed = PatchDemoRequestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", details: parsed.error.flatten() });
    return;
  }

  const updates = parsed.data;
  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }

  try {
    const [updated] = await db
      .update(demoRequests)
      .set({
        ...(updates.status !== undefined && { status: updates.status }),
        ...(updates.notes !== undefined && { notes: updates.notes }),
      })
      .where(eq(demoRequests.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Demo request not found" });
      return;
    }
    res.json(updated);
  } catch {
    res.status(500).json({ error: "Failed to update demo request" });
  }
});

export default router;
