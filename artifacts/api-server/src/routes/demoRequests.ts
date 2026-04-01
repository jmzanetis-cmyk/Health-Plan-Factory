import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { demoRequests } from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { z } from "zod";
import { Resend } from "resend";

const router: IRouter = Router();

const resendKey = process.env.RESEND_API_KEY;
const resendClient = resendKey ? new Resend(resendKey) : null;
const ADMIN_EMAIL = process.env.ADMIN_DEMO_EMAIL ?? "admin@healthplanfactory.com";

const DemoRequestBody = z.object({
  name: z.string().min(1).max(200),
  company: z.string().min(1).max(200),
  companySize: z.string().min(1).max(50),
  email: z.string().email(),
  phone: z.string().max(30).optional(),
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

  const { name, company, companySize, email, phone } = parsed.data;

  try {
    const id = randomUUID();
    const [record] = await db
      .insert(demoRequests)
      .values({ id, name, company, companySize, email, phone })
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

router.get("/admin/demo-requests", async (req, res) => {
  if (!req.isAuthenticated() || req.user!.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  try {
    const rows = await db
      .select()
      .from(demoRequests)
      .orderBy(demoRequests.createdAt);
    res.json(rows);
  } catch {
    res.status(500).json({ error: "Failed to fetch demo requests" });
  }
});

export default router;
