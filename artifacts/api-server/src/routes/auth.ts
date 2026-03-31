import * as oidc from "openid-client";
import { Router, type IRouter, type Request, type Response } from "express";
import crypto from "crypto";
import {
  GetCurrentAuthUserResponse,
  ExchangeMobileAuthorizationCodeBody,
  ExchangeMobileAuthorizationCodeResponse,
  LogoutMobileSessionResponse,
} from "@workspace/api-zod";
import { db, profiles, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { sendNotification } from "../lib/comms";
import { welcomeEmail } from "../emails/welcome";
import {
  clearSession,
  getOidcConfig,
  getSessionId,
  createSession,
  deleteSession,
  updateSession,
  SESSION_COOKIE,
  SESSION_TTL,
  ISSUER_URL,
  type SessionData,
} from "../lib/auth";

const OIDC_COOKIE_TTL = 10 * 60 * 1000;

/** Generate a unique referral code at signup (no 0/O/I/1 to avoid confusion) */
function makeReferralCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "HPF-";
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

const router: IRouter = Router();

function getOrigin(req: Request): string {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host =
    req.headers["x-forwarded-host"] || req.headers["host"] || "localhost";
  return `${proto}://${host}`;
}

function setSessionCookie(res: Response, sid: string) {
  res.cookie(SESSION_COOKIE, sid, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL,
  });
}

function setOidcCookie(res: Response, name: string, value: string) {
  res.cookie(name, value, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: OIDC_COOKIE_TTL,
  });
}

function getSafeReturnTo(value: unknown): string {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//")
  ) {
    return "/";
  }
  return value;
}

async function upsertUserAndProfile(claims: Record<string, unknown>) {
  const id = claims.sub as string;
  const email = (claims.email as string) || "";
  const firstName = (claims.first_name as string) || null;
  const lastName = (claims.last_name as string) || null;
  const profileImageUrl = ((claims.profile_image_url || claims.picture) as string) || null;

  const displayName = [firstName, lastName].filter(Boolean).join(" ") || null;

  await db
    .insert(usersTable)
    .values({ id, email: email || null, firstName, lastName, profileImageUrl })
    .onConflictDoUpdate({
      target: usersTable.id,
      set: { email: email || null, firstName, lastName, profileImageUrl, updatedAt: new Date() },
    });

  const [profile] = await db
    .insert(profiles)
    .values({
      id,
      email,
      displayName,
      avatarUrl: profileImageUrl,
      role: "member",
      referralCode: makeReferralCode(), // assigned at creation; guaranteed for every new member
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

  const isNewProfile = profile.createdAt &&
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

// GET /auth/me — alias for /auth/user (spec contract)
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
    res.json(GetCurrentAuthUserResponse.parse({ user: { ...req.user, role: profile?.role ?? "member" } }));
  } catch {
    res.json(GetCurrentAuthUserResponse.parse({ user: req.user ?? null }));
  }
});

// Auth path aliases: /auth/login, /auth/logout, /auth/callback
// These are direct aliases of the top-level routes handled in app.ts
// They are registered here so they appear in the same auth router context
router.get("/auth/login", async (req: Request, res: Response) => {
  // Preserve query string (returnTo, etc.) when forwarding to /login
  const qs = new URL(req.url, "http://localhost").searchParams.toString();
  res.redirect(302, `/api/login${qs ? "?" + qs : ""}`);
});

router.get("/auth/logout", async (req: Request, res: Response) => {
  res.redirect(302, "/api/logout");
});

router.get("/auth/callback", async (req: Request, res: Response) => {
  const qs = new URL(req.url, "http://localhost").searchParams.toString();
  res.redirect(302, `/api/callback${qs ? "?" + qs : ""}`);
});

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

router.get("/login", async (req: Request, res: Response) => {
  const config = await getOidcConfig();
  const callbackUrl = `${getOrigin(req)}/api/callback`;

  const returnTo = getSafeReturnTo(req.query.returnTo);

  const state = oidc.randomState();
  const nonce = oidc.randomNonce();
  const codeVerifier = oidc.randomPKCECodeVerifier();
  const codeChallenge = await oidc.calculatePKCECodeChallenge(codeVerifier);

  const redirectTo = oidc.buildAuthorizationUrl(config, {
    redirect_uri: callbackUrl,
    scope: "openid email profile offline_access",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    prompt: "login consent",
    state,
    nonce,
  });

  setOidcCookie(res, "code_verifier", codeVerifier);
  setOidcCookie(res, "nonce", nonce);
  setOidcCookie(res, "state", state);
  setOidcCookie(res, "return_to", returnTo);

  res.redirect(redirectTo.href);
});

// Query params are NOT validated with Zod — OIDC provider may include extra params
router.get("/callback", async (req: Request, res: Response) => {
  const config = await getOidcConfig();
  const callbackUrl = `${getOrigin(req)}/api/callback`;

  const codeVerifier = req.cookies?.code_verifier;
  const nonce = req.cookies?.nonce;
  const expectedState = req.cookies?.state;
  const returnTo = getSafeReturnTo(req.cookies?.return_to);

  if (!codeVerifier || !expectedState) {
    res.redirect("/api/login");
    return;
  }

  const currentUrl = new URL(
    `${callbackUrl}?${new URL(req.url, `http://${req.headers.host}`).searchParams}`,
  );

  let tokens: oidc.TokenEndpointResponse & oidc.TokenEndpointResponseHelpers;
  try {
    tokens = await oidc.authorizationCodeGrant(config, currentUrl, {
      pkceCodeVerifier: codeVerifier,
      expectedNonce: nonce,
      expectedState,
    });
  } catch (err) {
    req.log?.error({ err }, "OIDC callback error");
    res.redirect("/api/login");
    return;
  }

  const claims = tokens.claims();
  if (!claims) {
    res.redirect("/api/login");
    return;
  }

  const userInfo = await upsertUserAndProfile(
    claims as unknown as Record<string, unknown>,
  );

  const now = Math.floor(Date.now() / 1000);
  const sessionData: SessionData = {
    user: {
      id: userInfo.id,
      email: userInfo.email,
      firstName: userInfo.firstName,
      lastName: userInfo.lastName,
      profileImageUrl: userInfo.profileImageUrl,
    },
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: tokens.expiresIn() ? now + tokens.expiresIn()! : claims.exp,
  };

  const sid = await createSession(sessionData);
  setSessionCookie(res, sid);

  res.clearCookie("code_verifier", { path: "/" });
  res.clearCookie("nonce", { path: "/" });
  res.clearCookie("state", { path: "/" });
  res.clearCookie("return_to", { path: "/" });

  // Role-based post-login routing when no explicit returnTo was set
  let destination = returnTo;
  if (destination === "/") {
    if (userInfo.role === "provider") destination = "/provider/dashboard";
    else if (userInfo.role === "admin") destination = "/admin/dashboard";
    else if (userInfo.role === "employer") destination = "/employer/dashboard";
    else destination = "/dashboard";
  }

  res.redirect(destination);
});

router.get("/logout", async (req: Request, res: Response) => {
  const sid = getSessionId(req);
  if (sid) {
    await clearSession(res, sid);
  }

  try {
    const config = await getOidcConfig();
    const endSessionUrl = new URL(`${ISSUER_URL}/logout`);
    endSessionUrl.searchParams.set(
      "post_logout_redirect_uri",
      `${getOrigin(req)}/`,
    );
    res.redirect(endSessionUrl.href);
  } catch {
    res.redirect("/");
  }
});

router.post(
  "/mobile-auth/token-exchange",
  async (req: Request, res: Response) => {
    const body = ExchangeMobileAuthorizationCodeBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: "Missing or invalid required fields" });
      return;
    }

    const { code, code_verifier, redirect_uri, state, nonce } = body.data;

    try {
      const config = await getOidcConfig();
      // Include code (and state) in the URL so authorizationCodeGrant can extract them
      const callbackUrl = new URL(redirect_uri);
      callbackUrl.searchParams.set("code", code);
      if (state) callbackUrl.searchParams.set("state", state);
      const tokens = await oidc.authorizationCodeGrant(config, callbackUrl, {
        pkceCodeVerifier: code_verifier,
        expectedNonce: nonce ?? undefined,
        expectedState: state,
        idTokenExpected: true,
      });

      const claims = tokens.claims();
      if (!claims) {
        res.status(401).json({ error: "No claims in ID token" });
        return;
      }

      const userInfo = await upsertUserAndProfile(
        claims as unknown as Record<string, unknown>,
      );

      const now = Math.floor(Date.now() / 1000);
      const sessionData: SessionData = {
        user: {
          id: userInfo.id,
          email: userInfo.email,
          firstName: userInfo.firstName,
          lastName: userInfo.lastName,
          profileImageUrl: userInfo.profileImageUrl,
        },
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: tokens.expiresIn() ? now + tokens.expiresIn()! : claims.exp,
      };

      const sid = await createSession(sessionData);
      res.json(ExchangeMobileAuthorizationCodeResponse.parse({ token: sid }));
    } catch (err) {
      req.log?.error({ err }, "Mobile token exchange error");
      res.status(500).json({ error: "Token exchange failed" });
    }
  },
);

router.post("/mobile-auth/logout", async (req: Request, res: Response) => {
  const sid = getSessionId(req);
  if (sid) {
    await deleteSession(sid);
  }
  res.json(LogoutMobileSessionResponse.parse({ success: true }));
});

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const GITHUB_OAUTH_COOKIE_TTL = 10 * 60 * 1000;

router.get("/auth/github/login", async (req: Request, res: Response) => {
  if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
    res.redirect("/sign-in?error=github_not_configured");
    return;
  }

  const state = crypto.randomBytes(16).toString("hex");
  const returnTo = getSafeReturnTo(req.query.returnTo);
  const origin = getOrigin(req);
  const callbackUrl = `${origin}/api/auth/github/callback`;

  res.cookie("gh_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: GITHUB_OAUTH_COOKIE_TTL,
  });
  res.cookie("gh_return_to", returnTo, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: GITHUB_OAUTH_COOKIE_TTL,
  });

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
  const returnTo = getSafeReturnTo(req.cookies?.gh_return_to);

  if (!code || !state || state !== expectedState) {
    res.redirect("/sign-in?error=github_oauth_failed");
    return;
  }

  res.clearCookie("gh_state", { path: "/" });
  res.clearCookie("gh_return_to", { path: "/" });

  try {
    const origin = getOrigin(req);
    const callbackUrl = `${origin}/api/auth/github/callback`;

    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
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
    });

    if (!tokenRes.ok) {
      throw new Error(`GitHub token exchange HTTP error: ${tokenRes.status}`);
    }

    const tokenData = await tokenRes.json() as { access_token?: string; error?: string };
    if (!tokenData.access_token) {
      throw new Error(tokenData.error ?? "No access token in GitHub response");
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

    const githubUser = await userRes.json() as {
      id: unknown;
      login?: string;
      name?: string;
      avatar_url?: string;
      email?: string;
    };

    if (typeof githubUser.id !== "number" || !Number.isFinite(githubUser.id) || githubUser.id <= 0) {
      throw new Error("GitHub user response is missing a valid numeric id");
    }

    const githubId: number = githubUser.id;

    const githubEmails: Array<{ email: string; primary: boolean; verified: boolean }> = emailsRes.ok
      ? (await emailsRes.json() as Array<{ email: string; primary: boolean; verified: boolean }>)
      : [];

    const primaryEmail =
      githubUser.email ||
      githubEmails.find((e) => e.primary && e.verified)?.email ||
      githubEmails[0]?.email ||
      "";

    const login = typeof githubUser.login === "string" ? githubUser.login : `github-${githubId}`;
    const nameParts = (typeof githubUser.name === "string" && githubUser.name ? githubUser.name : login).split(" ");
    const firstName = nameParts[0] ?? null;
    const lastName = nameParts.slice(1).join(" ") || null;

    const claims: Record<string, unknown> = {
      sub: `github:${githubId}`,
      email: primaryEmail,
      first_name: firstName,
      last_name: lastName,
      profile_image_url: typeof githubUser.avatar_url === "string" ? githubUser.avatar_url : null,
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
