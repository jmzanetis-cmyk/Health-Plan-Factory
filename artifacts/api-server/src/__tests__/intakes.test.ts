/**
 * /api/intakes — authentication and ownership tests
 *
 * Covers:
 *  1. GET /api/intakes returns 401 without a token
 *  2. POST /api/intakes returns 401 without a token
 *  3. GET /api/intakes returns only the caller's own rows (cross-user isolation)
 *  4. POST /api/intakes sets profileId from the token, ignoring any body value
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import express, { type Express, type Request, type Response, type NextFunction } from "express";
import { randomUUID } from "crypto";
import { db } from "@workspace/db";
import { profiles, memberIntakes } from "@workspace/db";
import { eq } from "drizzle-orm";
import intakesRouter from "../routes/intakes";

// ── Test app builder ──────────────────────────────────────────────────────────

function buildTestApp(userId: string | null): Express {
  const app = express();
  app.use(express.json());

  app.use((req: Request, _res: Response, next: NextFunction) => {
    req.isAuthenticated = function (this: Request) {
      return this.user != null;
    } as Request["isAuthenticated"];

    if (userId) {
      (req as Request & { user: Express.User }).user = {
        id: userId,
        email: `${userId}@intakes-test.example.com`,
        role: "member",
        firstName: null,
        lastName: null,
        profileImageUrl: null,
      };
    }
    next();
  });

  app.use("/api", intakesRouter);
  return app;
}

// ── DB helpers ────────────────────────────────────────────────────────────────

async function createTestProfile(id: string): Promise<void> {
  await db.insert(profiles).values({
    id,
    email: `${id}@intakes-test.example.com`,
    displayName: `Intakes Test User ${id.slice(0, 8)}`,
    role: "member",
  }).onConflictDoNothing();
}

async function seedIntake(profileId: string): Promise<string> {
  const id = randomUUID();
  await db.insert(memberIntakes).values({
    id,
    profileId,
    budget: 100,
    goals: ["stress-reduction"],
    conditions: [],
    preferences: [],
    exclusions: [],
    zipCode: "90210",
    radius: 25,
    telehealth: false,
    createdAt: new Date(),
  });
  return id;
}

async function cleanupProfile(id: string): Promise<void> {
  await db.delete(memberIntakes).where(eq(memberIntakes.profileId, id));
  await db.delete(profiles).where(eq(profiles.id, id));
}

// ── 1. Unauthenticated GET returns 401 ───────────────────────────────────────

describe("GET /api/intakes — unauthenticated", () => {
  it("returns 401 when no token is provided", async () => {
    const app = buildTestApp(null);
    const res = await request(app).get("/api/intakes");
    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ error: expect.any(String) });
  });
});

// ── 2. Unauthenticated POST returns 401 ──────────────────────────────────────

describe("POST /api/intakes — unauthenticated", () => {
  it("returns 401 when no token is provided", async () => {
    const app = buildTestApp(null);
    const res = await request(app).post("/api/intakes").send({
      budget: 150,
      goals: ["sleep"],
      conditions: [],
      preferences: [],
      exclusions: [],
      telehealth: false,
    });
    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ error: expect.any(String) });
  });
});

// ── 3. GET /api/intakes — cross-user isolation ────────────────────────────────

describe("GET /api/intakes — ownership isolation", () => {
  const userA = randomUUID();
  const userB = randomUUID();
  let intakeA: string;

  beforeAll(async () => {
    await createTestProfile(userA);
    await createTestProfile(userB);
    intakeA = await seedIntake(userA);
    // seed a second row for userB that must NOT appear in userA's response
    await seedIntake(userB);
  });

  afterAll(async () => {
    await cleanupProfile(userA);
    await cleanupProfile(userB);
  });

  it("returns only the caller's own intakes", async () => {
    const app = buildTestApp(userA);
    const res = await request(app).get("/api/intakes");
    expect(res.status).toBe(200);
    const ids: string[] = res.body.map((r: { id: string }) => r.id);
    expect(ids).toContain(intakeA);
    // must not leak userB's intake
    const profiles = res.body.map((r: { profileId: string }) => r.profileId);
    expect(profiles.every((p: string) => p === userA)).toBe(true);
  });

  it("returns empty array when caller has no intakes", async () => {
    const newUser = randomUUID();
    await createTestProfile(newUser);
    try {
      const app = buildTestApp(newUser);
      const res = await request(app).get("/api/intakes");
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    } finally {
      await cleanupProfile(newUser);
    }
  });
});

// ── 4. POST /api/intakes — profileId forced from token ───────────────────────

describe("POST /api/intakes — profileId from token", () => {
  const userId = randomUUID();

  beforeAll(async () => {
    await createTestProfile(userId);
  });

  afterAll(async () => {
    await cleanupProfile(userId);
  });

  it("sets profileId from the authenticated user, ignoring any body value", async () => {
    const spoofedId = randomUUID();
    const app = buildTestApp(userId);

    const res = await request(app).post("/api/intakes").send({
      profileId: spoofedId, // should be ignored
      budget: 200,
      goals: ["energy"],
      conditions: ["diabetes"],
      preferences: ["acupuncture"],
      exclusions: [],
      zipCode: "10001",
      radius: 10,
      telehealth: true,
    });

    expect(res.status).toBe(201);
    expect(res.body.profileId).toBe(userId);
    expect(res.body.profileId).not.toBe(spoofedId);
  });
});
