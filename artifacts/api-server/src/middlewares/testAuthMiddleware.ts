/**
 * Test-mode auth bypass — only active when NODE_ENV=test.
 *
 * Reads the X-Test-User-Id request header and hydrates req.user from the DB.
 * This lets Playwright tests make real API calls with a seeded userId without
 * going through the full OIDC session flow.
 *
 * NEVER mount this middleware in production.
 */

import { type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import { profiles } from "@workspace/db";
import { eq } from "drizzle-orm";

export async function testAuthMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const testUserId = req.headers["x-test-user-id"];
  if (typeof testUserId !== "string" || !testUserId) {
    next();
    return;
  }

  try {
    const [profile] = await db
      .select({
        id: profiles.id,
        email: profiles.email,
        role: profiles.role,
        displayName: profiles.displayName,
        avatarUrl: profiles.avatarUrl,
      })
      .from(profiles)
      .where(eq(profiles.id, testUserId));

    if (profile) {
      req.isAuthenticated = function (this: Request) {
        return this.user != null;
      } as Request["isAuthenticated"];

      (req as Request & { user: Express.User }).user = {
        id: profile.id,
        email: profile.email ?? "",
        role: (profile.role as "member" | "admin" | "provider") ?? "member",
        firstName: profile.displayName?.split(" ")[0] ?? null,
        lastName: profile.displayName?.split(" ").slice(1).join(" ") || null,
        profileImageUrl: profile.avatarUrl ?? null,
      };
    }
  } catch {
    // If DB lookup fails just proceed unauthenticated
  }

  next();
}
