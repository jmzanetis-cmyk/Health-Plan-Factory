import { type Request, type Response, type NextFunction } from "express";
import type { AuthUser } from "@workspace/api-zod";
import { db } from "@workspace/db";
import { profiles } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  clearSession,
  getSessionId,
  getSession,
  verifyToken,
} from "../lib/auth";

declare global {
  namespace Express {
    interface User extends AuthUser {
      subscriptionStatus?: string | null;
    }

    interface Request {
      isAuthenticated(): this is AuthedRequest;
      user?: User | undefined;
    }

    export interface AuthedRequest {
      user: User;
    }
  }
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  req.isAuthenticated = function (this: Request) {
    return this.user != null;
  } as Request["isAuthenticated"];

  // ── Supabase JWT path ──────────────────────────────────────────────────────
  const sbUser = await verifyToken(req);
  if (sbUser) {
    let role: AuthUser["role"] = "member";
    let subscriptionStatus: string | null = null;
    let firstName: string | null = null;
    let lastName: string | null = null;
    let profileImageUrl: string | null = null;

    try {
      const [profile] = await db
        .select({
          role: profiles.role,
          subscriptionStatus: profiles.subscriptionStatus,
          displayName: profiles.displayName,
          avatarUrl: profiles.avatarUrl,
        })
        .from(profiles)
        .where(eq(profiles.id, sbUser.id));

      if (profile) {
        role = profile.role as AuthUser["role"];
        subscriptionStatus = profile.subscriptionStatus ?? null;
        profileImageUrl = profile.avatarUrl ?? null;
        if (profile.displayName) {
          const parts = profile.displayName.split(" ");
          firstName = parts[0] ?? null;
          lastName = parts.slice(1).join(" ") || null;
        }
      }
    } catch {
      // Use defaults if DB is unavailable
    }

    // Cast needed: global Express.User augmentation loses AuthUser property
    // resolution under TypeScript project references in this monorepo.
    (req as Request & { user: Express.User }).user = {
      id: sbUser.id,
      email: sbUser.email,
      firstName,
      lastName,
      profileImageUrl,
      role,
      subscriptionStatus,
    } as Express.User;
    next();
    return;
  }

  // ── Session table path (magic-link users) ────────────────────────────────
  const sid = getSessionId(req);
  if (!sid) {
    next();
    return;
  }

  const session = await getSession(sid);
  if (!session?.user?.id) {
    await clearSession(res, sid);
    next();
    return;
  }

  const userId = session.user.id;
  let role: AuthUser["role"] = session.user.role ?? "member";
  let subscriptionStatus: string | null = null;

  try {
    const [profile] = await db
      .select({
        role: profiles.role,
        subscriptionStatus: profiles.subscriptionStatus,
      })
      .from(profiles)
      .where(eq(profiles.id, userId));

    if (profile) {
      role = profile.role as AuthUser["role"];
      subscriptionStatus = profile.subscriptionStatus ?? null;
    }
  } catch {
    // Use cached role if DB is unavailable
  }

  req.user = { ...session.user, role, subscriptionStatus };
  next();
}
