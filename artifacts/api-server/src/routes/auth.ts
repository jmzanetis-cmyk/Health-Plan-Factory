import { Router, type IRouter, type Request, type Response } from "express";
import {
  GetCurrentAuthUserResponse,
  LogoutMobileSessionResponse,
} from "@workspace/api-zod";
import { db, profiles, referrals } from "@workspace/db";
import { eq, sql as drizzleSql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { z } from "zod";
import { sendNotification } from "../lib/comms";
import { welcomeEmail } from "../emails/welcome";
import {
  clearSession,
  getSessionId,
  deleteSession,
  SESSION_TTL,
  SB_COOKIE,
} from "../lib/auth";
import { supabase } from "../lib/supabase";
import { strictLimiter, moderateLimiter } from "../middlewares/rateLimit";

/** Generate a unique referral code at signup (no 0/O/I/1 to avoid confusion) */
function makeReferralCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "HPF-";
  for (let i = 0; i < 8; i++)
    code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

/**
 * Server-side referral registration — called at auth completion.
 * Reads the hpf_ref cookie, creates a pending referral row, and increments
 * the referrer's referralCount atomically.
 * Fire-and-forget; errors are swallowed so they don't interrupt login.
 */
async function processReferralCookie(
  profileId: string,
  refCode: string | undefined,
): Promise<void> {
  if (!refCode) return;
  const code = refCode.trim().toUpperCase();
  try {
    const [self] = await db
      .select({ referralCode: profiles.referralCode })
      .from(profiles)
      .where(eq(profiles.id, profileId))
      .limit(1);
    if (self?.referralCode === code) return;

    const [referrer] = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.referralCode, code))
      .limit(1);
    if (!referrer) return;

    const [existing] = await db
      .select({ id: referrals.id })
      .from(referrals)
      .where(eq(referrals.referredMemberId, profileId))
      .limit(1);
    if (existing) return;

    await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(referrals)
        .values({
          id: randomUUID(),
          referrerId: referrer.id,
          referredMemberId: profileId,
          code,
          status: "pending",
          createdAt: new Date(),
        })
        .onConflictDoNothing()
        .returning({ id: referrals.id });
      if (created) {
        await tx
          .update(profiles)
          .set({
            referralCount: drizzleSql`referral_count + 1`,
            updatedAt: new Date(),
          })
          .where(eq(profiles.id, referrer.id));
      }
    });
  } catch {
    // Swallowed — referral registration must not block login
  }
}

async function upsertUserAndProfile(claims: Record<string, unknown>) {
  const id = claims.sub as string;
  const email = (claims.email as string) || "";
  const firstName = (claims.first_name as string) || null;
  const lastName = (claims.last_name as string) || null;
  const profileImageUrl =
    ((claims.profile_image_url || claims.picture) as string) || null;

  const displayName =
    (claims.display_name as string) ||
    [firstName, lastName].filter(Boolean).join(" ") ||
    null;

  const [profile] = await db
    .insert(profiles)
    .values({
      id,
      email,
      displayName,
      avatarUrl: profileImageUrl,
      role: "member",
      referralCode: makeReferralCode(),
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: profiles.id,
      set: {
        email: email || undefined,
        displayName: displayName ?? undefined,
        avatarUrl: profileImageUrl ?? undefined,
        updatedAt: new Date(),
        // referralCode intentionally excluded — preserve existing code on re-login
      },
    })
    .returning();

  const isNewProfile =
    profile.createdAt &&
    Date.now() - new Date(profile.createdAt).getTime() < 30_000;

  if (isNewProfile && email) {
    const loginUrl = process.env.BASE_URL
      ? `${process.env.BASE_URL}/dashboard`
      : "/dashboard";
    const { subject, html } = welcomeEmail({ displayName, loginUrl });
    sendNotification({
      profileId: id,
      email,
      type: "welcome",
      subject,
      html,
      smsBody: `Welcome to Health Plan Factory! Log in at ${loginUrl} to get started.`,
    }).catch(() => {});
  }

  return { id, email, firstName, lastName, profileImageUrl, role: profile.role };
}

function setSbCookie(res: Response, token: string) {
  res.cookie(SB_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
    maxAge: SESSION_TTL,
  });
}

const router: IRouter = Router();

// Rate limiting
router.use("/login", strictLimiter);
router.use("/auth/login", strictLimiter);
router.use("/auth/signup", strictLimiter);
router.use("/auth/magic-link", strictLimiter);
// ── Supabase Auth endpoints ───────────────────────────────────────────────────

const LoginBody = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

router.post("/login", async (req: Request, res: Response) => {
  const body = LoginBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "email and password (min 6 chars) required" });
    return;
  }

  const { email, password } = body.data;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user || !data.session) {
    res
      .status(401)
      .json({ error: error?.message ?? "Invalid email or password" });
    return;
  }

  const sbUser = data.user;
  const session = data.session;

  const userInfo = await upsertUserAndProfile({
    sub: sbUser.id,
    email: sbUser.email ?? email,
    first_name: sbUser.user_metadata?.first_name ?? null,
    last_name: sbUser.user_metadata?.last_name ?? null,
    display_name: sbUser.user_metadata?.full_name ?? null,
    profile_image_url: sbUser.user_metadata?.avatar_url ?? null,
  });

  const refCode = req.cookies?.hpf_ref as string | undefined;
  void processReferralCookie(userInfo.id, refCode);

  setSbCookie(res, session.access_token);
  if (session.refresh_token) {
    res.cookie("sb-refresh-token", session.refresh_token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
  }

  res.json({
    user: {
      id: userInfo.id,
      email: userInfo.email,
      firstName: userInfo.firstName,
      lastName: userInfo.lastName,
      profileImageUrl: userInfo.profileImageUrl,
      role: userInfo.role,
    },
    access_token: session.access_token,
    refresh_token: session.refresh_token ?? null,
  });
});

const SignupBody = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  full_name: z.string().optional(),
});

router.post("/auth/signup", async (req: Request, res: Response) => {
  const body = SignupBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "email and password (min 6 chars) required" });
    return;
  }

  const { email, password, full_name } = body.data;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name } },
  });

  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }

  if (!data.user) {
    res.status(400).json({ error: "Signup failed" });
    return;
  }

  // If email confirmation is required, Supabase won't return a session yet
  if (!data.session) {
    res.json({ message: "Check your email to confirm your account." });
    return;
  }

  const userInfo = await upsertUserAndProfile({
    sub: data.user.id,
    email: data.user.email ?? email,
    display_name: full_name ?? null,
  });

  setSbCookie(res, data.session.access_token);
  if (data.session.refresh_token) {
    res.cookie("sb-refresh-token", data.session.refresh_token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
  }

  res.status(201).json({
    user: {
      id: userInfo.id,
      email: userInfo.email,
      firstName: userInfo.firstName,
      lastName: userInfo.lastName,
      profileImageUrl: userInfo.profileImageUrl,
      role: userInfo.role,
    },
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token ?? null,
  });
});

const MagicLinkBody = z.object({ email: z.string().email() });

router.post("/auth/magic-link", async (req: Request, res: Response) => {
  const body = MagicLinkBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Valid email required" });
    return;
  }

  const { error } = await supabase.auth.signInWithOtp({
    email: body.data.email,
    options: {
      emailRedirectTo: `${process.env.FRONTEND_URL ?? process.env.BASE_URL ?? ""}/dashboard`,
    },
  });

  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }

  res.json({ message: "Check your email for a magic link." });
});

const RefreshBody = z.object({ refresh_token: z.string() });

router.post("/auth/refresh", async (req: Request, res: Response) => {
  const refresh = req.cookies?.["sb-refresh-token"];
  const body = RefreshBody.safeParse(req.body);
  const token = refresh ?? (body.success ? body.data.refresh_token : null);

  if (!token) {
    res.status(400).json({ error: "refresh_token required" });
    return;
  }

  const { data, error } = await supabase.auth.refreshSession({
    refresh_token: token,
  });

  if (error || !data.session) {
    res.status(401).json({ error: "Refresh failed — please log in again" });
    return;
  }

  setSbCookie(res, data.session.access_token);
  if (data.session.refresh_token) {
    res.cookie("sb-refresh-token", data.session.refresh_token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
  }

  res.json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  });
});

// ── Auth state endpoints ──────────────────────────────────────────────────────

router.get("/auth/user", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.json(GetCurrentAuthUserResponse.parse({ user: null }));
    return;
  }

  try {
    const [profile] = await db
      .select({ role: profiles.role })
      .from(profiles)
      .where(eq(profiles.id, req.user!.id));

    res.json(
      GetCurrentAuthUserResponse.parse({
        user: {
          ...req.user,
          role: profile?.role ?? "member",
        },
      }),
    );
  } catch {
    res.json(GetCurrentAuthUserResponse.parse({ user: req.user ?? null }));
  }
});

router.get("/auth/me", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.json(GetCurrentAuthUserResponse.parse({ user: null }));
    return;
  }
  try {
    const [profile] = await db
      .select({ role: profiles.role })
      .from(profiles)
      .where(eq(profiles.id, req.user!.id));
    res.json(
      GetCurrentAuthUserResponse.parse({
        user: { ...req.user, role: profile?.role ?? "member" },
      }),
    );
  } catch {
    res.json(GetCurrentAuthUserResponse.parse({ user: req.user ?? null }));
  }
});

// Alias — redirect to /sign-in
router.get("/auth/login", (_req: Request, res: Response) => {
  res.redirect(302, "/sign-in");
});

router.get("/auth/logout", (_req: Request, res: Response) => {
  res.redirect(302, "/api/logout");
});

// Redirect legacy /login path to /sign-in (no longer an OIDC redirect)
router.get("/login", (_req: Request, res: Response) => {
  res.redirect(302, "/sign-in");
});

// Logout — clears both Supabase cookie and legacy session cookie
router.get("/logout", async (req: Request, res: Response) => {
  res.clearCookie(SB_COOKIE, { path: "/" });
  res.clearCookie("sb-refresh-token", { path: "/" });

  // Clear magic-link session if present
  const sid = getSessionId(req);
  if (sid) {
    await clearSession(res, sid);
  }

  const frontendUrl = process.env.FRONTEND_URL ?? process.env.BASE_URL ?? "";
  res.redirect(`${frontendUrl}/sign-in`);
});

// SPA-friendly POST logout
router.post("/logout", async (req: Request, res: Response) => {
  res.clearCookie(SB_COOKIE, { path: "/" });
  res.clearCookie("sb-refresh-token", { path: "/" });

  // Clear magic-link session if present
  const sid = getSessionId(req);
  if (sid) {
    await clearSession(res, sid);
  }

  res.json(LogoutMobileSessionResponse.parse({ success: true }));
});

// ── Mobile auth ───────────────────────────────────────────────────────────────

// Mobile apps call POST /api/login directly with email/password and receive
// { access_token } which they send as Authorization: Bearer on each request.

router.post("/mobile-auth/logout", async (req: Request, res: Response) => {
  const sid = getSessionId(req);
  if (sid) {
    await deleteSession(sid);
  }
  res.json(LogoutMobileSessionResponse.parse({ success: true }));
});

export default router;
