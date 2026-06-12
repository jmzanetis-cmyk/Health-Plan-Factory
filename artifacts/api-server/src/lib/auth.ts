import crypto from "crypto";
import { type Request, type Response } from "express";
import { db, sessionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { AuthUser } from "@workspace/api-zod";
import { supabase } from "./supabase";

export const SESSION_COOKIE = "sid";
export const SB_COOKIE = "sb-access-token";
export const SESSION_TTL = 7 * 24 * 60 * 60 * 1000;

export interface SessionData {
  user: AuthUser;
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
}

// ── Session table helpers (used by magic-link auth path) ─────────────────────

export async function createSession(
  data: SessionData,
  ttlMs: number = SESSION_TTL,
): Promise<string> {
  const sid = crypto.randomBytes(32).toString("hex");
  await db.insert(sessionsTable).values({
    sid,
    sess: data as unknown as Record<string, unknown>,
    expire: new Date(Date.now() + ttlMs),
  });
  return sid;
}

export async function getSession(sid: string): Promise<SessionData | null> {
  const [row] = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.sid, sid));

  if (!row || row.expire < new Date()) {
    if (row) await deleteSession(sid);
    return null;
  }

  return row.sess as unknown as SessionData;
}

export async function updateSession(
  sid: string,
  data: SessionData,
): Promise<void> {
  await db
    .update(sessionsTable)
    .set({
      sess: data as unknown as Record<string, unknown>,
      expire: new Date(Date.now() + SESSION_TTL),
    })
    .where(eq(sessionsTable.sid, sid));
}

export async function deleteSession(sid: string): Promise<void> {
  await db.delete(sessionsTable).where(eq(sessionsTable.sid, sid));
}

export async function clearSession(
  res: Response,
  sid?: string,
): Promise<void> {
  if (sid) await deleteSession(sid);
  res.clearCookie(SESSION_COOKIE, { path: "/" });
}

// ── Token helpers ─────────────────────────────────────────────────────────────

/** Returns the Supabase JWT from Authorization: Bearer header or sb-access-token cookie. */
export function getSupabaseToken(req: Request): string | undefined {
  const authHeader = req.headers["authorization"];
  if (authHeader?.startsWith("Bearer ")) {
    const candidate = authHeader.slice(7);
    // A Supabase JWT starts with "eyJ"; a hex session ID does not.
    if (candidate.startsWith("eyJ")) return candidate;
  }
  return req.cookies?.[SB_COOKIE];
}

/** Returns the hex session ID (magic-link auth path) from Authorization header or sid cookie. */
export function getSessionId(req: Request): string | undefined {
  const authHeader = req.headers["authorization"];
  if (authHeader?.startsWith("Bearer ")) {
    const candidate = authHeader.slice(7);
    if (/^[0-9a-f]{64}$/.test(candidate)) return candidate;
  }
  return req.cookies?.[SESSION_COOKIE];
}

// ── Supabase JWT verification ─────────────────────────────────────────────────

/** Verify a Supabase JWT and return the raw user object, or null if invalid/expired. */
export async function verifyToken(
  req: Request,
): Promise<{ id: string; email: string } | null> {
  const token = getSupabaseToken(req);
  if (!token) return null;

  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) return null;
    return { id: data.user.id, email: data.user.email ?? "" };
  } catch {
    return null;
  }
}
