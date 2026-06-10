import { Router, type IRouter, type Request, type Response } from "express";
import crypto from "crypto";
import {
  GetCurrentAuthUserResponse,
  LogoutMobileSessionResponse,
} from "@workspace/api-zod";
import { db, profiles, usersTable, referrals } from "@workspace/db";
import { eq, sql as drizzleSql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { z } from "zod";
import { sendNotification } from "../lib/comms";
import { welcomeEmail } from "../emails/welcome";
import {
  clearSession,
  getSessionId,
  deleteSession,
  createSession,
  SESSION_COOKIE,
  SESSION_TTL,
  SB_COOKIE,
  type SessionData,
} from "../lib/auth";
import { supabase } from "../lib/supabase";
import { strictLimiter, moderateLimiter } from "../middlewares/rateLimit";

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const GITHUB_OAUTH_COOKIE_TTL = 10 * 60 * 1000;

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

  await db
    .insert(usersTable)
    .values({ id, email: email || null, firstName, lastName, profileImageUrl })
    .onConflictDoUpdate({
      target: usersTable.id,
      set: {
        email: email || null,
        firstName,
        lastName,
        profileImageUrl,
        updatedAt: new Date(),
      },
    });

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

function getOrigin(req: Request): string {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host =
    req.headers["x-forwarded-host"] || req.headers["host"] || "localhost";
  return `${proto}://${host}`;
}

function getSafeReturnTo(
  value: unknown,
  extraTrustedOrigins: string[] = [],
): string {
  if (typeof value !== "string") return "/";
  if (value.startsWith("/") && !value.startsWith("//")) return value;

  const trustedOrigins: string[] = [...extraTrustedOrigins];
  const frontendUrl = process.env.FRONTEND_URL;
  if (frontendUrl) trustedOrigins.push(frontendUrl);

  if (value.startsWith("https://") && trustedOrigins.length > 0) {
    try {
      const returnOrigin = new URL(value).origin;
      for (const trusted of trustedOrigins) {
        if (returnOrigin === new URL(trusted).origin) return value;
      }
    } catch {
      // fall through
    }
  }
  return "/";
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

function setSessionCookie(res: Response, sid: string) {
  res.cookie(SESSION_COOKIE, sid, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
    maxAge: SESSION_TTL,
  });
}

function setOidcCookie(res: Response, name: string, value: string) {
  res.cookie(name, value, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
    maxAge: GITHUB_OAUTH_COOKIE_TTL,
  });
}

const router: IRouter = Router();

// Rate limiting
router.use("/login", strictLimiter);
router.use("/auth/login", strictLimiter);
router.use("/auth/signup", strictLimiter);
router.use("/auth/magic-link", strictLimiter);
router.use("/auth/github", moderateLimiter);

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

  // Clear GitHub OAuth session if present
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

// ── GitHub OAuth ──────────────────────────────────────────────────────────────

router.get("/auth/github/login", async (req: Request, res: Response) => {
  if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
    res.redirect("/sign-in?error=github_not_configured");
    return;
  }

  const state = crypto.randomBytes(16).toString("hex");
  const origin = getOrigin(req);
  const returnTo = getSafeReturnTo(req.query.returnTo, [origin]);
  const callbackUrl = `${origin}/api/auth/github/callback`;

  setOidcCookie(res, "gh_state", state);
  setOidcCookie(res, "gh_return_to", returnTo);

  const authorizeUrl = new URL("https://github.com/login/oauth/authorize");
  authorizeUrl.searchParams.set("client_id", GITHUB_CLIENT_ID);
  authorizeUrl.searchParams.set("redirect_uri", callbackUrl);
  authorizeUrl.searchParams.set("scope", "read:user user:email");
  authorizeUrl.searchParams.set("state", state);

  res.redirect(authorizeUrl.href);
});

router.get("/auth/github/callback", async (req: Request, res: Response) => {
  if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
    res.redirect("/sign-in?error=github_not_configured");
    return;
  }

  const { code, state } = req.query;
  const expectedState = req.cookies?.gh_state;
  const origin = getOrigin(req);
  const returnTo = getSafeReturnTo(req.cookies?.gh_return_to, [origin]);

  if (!code || !state || state !== expectedState) {
    res.redirect("/sign-in?error=github_oauth_failed");
    return;
  }

  res.clearCookie("gh_state", { path: "/" });
  res.clearCookie("gh_return_to", { path: "/" });

  try {
    const callbackUrl = `${origin}/api/auth/github/callback`;

    const tokenRes = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          client_id: GITHUB_CLIENT_ID,
          client_secret: GITHUB_CLIENT_SECRET,
          code,
          redirect_uri: callbackUrl,
        }),
      },
    );

    if (!tokenRes.ok) {
      throw new Error(`GitHub token exchange HTTP error: ${tokenRes.status}`);
    }

    const tokenData = (await tokenRes.json()) as {
      access_token?: string;
      error?: string;
    };
    if (!tokenData.access_token) {
      throw new Error(
        tokenData.error ?? "No access token in GitHub response",
      );
    }

    const [userRes, emailsRes] = await Promise.all([
      fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          Accept: "application/vnd.github+json",
        },
      }),
      fetch("https://api.github.com/user/emails", {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          Accept: "application/vnd.github+json",
        },
      }),
    ]);

    if (!userRes.ok) {
      throw new Error(`GitHub user fetch HTTP error: ${userRes.status}`);
    }

    const githubUser = (await userRes.json()) as {
      id: unknown;
      login?: string;
      name?: string;
      avatar_url?: string;
      email?: string;
    };

    if (
      typeof githubUser.id !== "number" ||
      !Number.isFinite(githubUser.id) ||
      githubUser.id <= 0
    ) {
      throw new Error("GitHub user response is missing a valid numeric id");
    }

    const githubId: number = githubUser.id;

    const githubEmails: Array<{
      email: string;
      primary: boolean;
      verified: boolean;
    }> = emailsRes.ok
      ? ((await emailsRes.json()) as Array<{
          email: string;
          primary: boolean;
          verified: boolean;
        }>)
      : [];

    const primaryEmail =
      githubUser.email ||
      githubEmails.find((e) => e.primary && e.verified)?.email ||
      githubEmails[0]?.email ||
      "";

    const login =
      typeof githubUser.login === "string"
        ? githubUser.login
        : `github-${githubId}`;
    const nameParts = (
      typeof githubUser.name === "string" && githubUser.name
        ? githubUser.name
        : login
    ).split(" ");
    const firstName = nameParts[0] ?? null;
    const lastName = nameParts.slice(1).join(" ") || null;

    const claims: Record<string, unknown> = {
      sub: `github:${githubId}`,
      email: primaryEmail,
      first_name: firstName,
      last_name: lastName,
      profile_image_url:
        typeof githubUser.avatar_url === "string"
          ? githubUser.avatar_url
          : null,
    };

    const userInfo = await upsertUserAndProfile(claims);

    const now = Math.floor(Date.now() / 1000);
    const sessionData: SessionData = {
      user: {
        id: userInfo.id,
        email: userInfo.email,
        firstName: userInfo.firstName,
        lastName: userInfo.lastName,
        profileImageUrl: userInfo.profileImageUrl,
      },
      access_token: tokenData.access_token,
      expires_at: now + 8 * 3600,
    };

    const sid = await createSession(sessionData);
    setSessionCookie(res, sid);

    let destination = returnTo;
    if (destination === "/") {
      if (userInfo.role === "provider") destination = "/provider/dashboard";
      else if (userInfo.role === "admin") destination = "/admin/dashboard";
      else if (userInfo.role === "employer") destination = "/employer/dashboard";
      else destination = "/dashboard";
    }

    res.redirect(destination);
  } catch (err) {
    req.log?.error({ err }, "GitHub OAuth callback error");
    res.redirect("/sign-in?error=github_oauth_failed");
  }
});

export default router;
