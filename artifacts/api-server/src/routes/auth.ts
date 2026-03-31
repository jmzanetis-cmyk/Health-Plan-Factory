import * as oidc from "openid-client";
import { Router, type IRouter, type Request, type Response } from "express";
import {
  GetCurrentAuthUserResponse,
  ExchangeMobileAuthorizationCodeBody,
  ExchangeMobileAuthorizationCodeResponse,
  LogoutMobileSessionResponse,
} from "@workspace/api-zod";
import { db, profiles, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
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
      },
    })
    .returning();

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

export default router;
