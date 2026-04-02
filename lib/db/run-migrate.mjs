/**
 * Health Plan Factory — Drizzle migration runner
 *
 * Applies all migration files in lib/db/migrations/ in journal order.
 * Uses the drizzle.__drizzle_migrations table to track applied migrations
 * (same format as drizzle-kit migrate) so already-applied files are skipped.
 *
 * Migration order is driven by migrations/meta/_journal.json plus any
 * supplemental files that were added outside of drizzle-kit generate.
 *
 * Usage:
 *   DATABASE_URL=postgresql://... node lib/db/run-migrate.mjs
 *   # or via pnpm from the lib/db directory:
 *   pnpm migrate
 *
 * NOTE: Replit blocks outbound Postgres connections to Supabase.
 * For Supabase migration, paste lib/db/supabase_schema.sql into the
 * Supabase SQL Editor: https://app.supabase.com/project/<ref>/sql
 */

import pg from "pg";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));

function getDbUrl() {
  const supabaseUrl = process.env.SUPABASE_DATABASE_URL;
  if (supabaseUrl && supabaseUrl.startsWith("postgresql")) {
    return supabaseUrl;
  }
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL must be set");
  }
  return url;
}

/**
 * Build the ordered list of migration files from:
 * 1. migrations/meta/_journal.json (drizzle-kit managed, ordered by idx)
 * 2. SUPPLEMENTAL_MIGRATIONS: files added outside drizzle-kit, inserted by tag
 *    into the sequence after their logical predecessor.
 */
function buildMigrationList() {
  const journalPath = join(__dirname, "migrations", "meta", "_journal.json");
  const journal = JSON.parse(readFileSync(journalPath, "utf-8"));

  // Sort journal entries by idx
  const entries = [...journal.entries].sort((a, b) => a.idx - b.idx);

  // Supplemental migrations: files added outside of drizzle-kit generate.
  // Each entry specifies the tag of the file that should precede it.
  const SUPPLEMENTALS = [
    {
      tag: "0002_plan_sharing",
      file: "0002_plan_sharing.sql",
      insertAfter: "0002_provider_aware_plan_items",
    },
  ];

  // Build ordered list from journal
  const result = entries.map((e) => ({
    tag: e.tag,
    file: `${e.tag}.sql`,
  }));

  // Insert supplemental entries after their predecessor
  for (const sup of SUPPLEMENTALS) {
    const filePath = join(__dirname, "migrations", sup.file);
    if (!existsSync(filePath)) continue;

    const insertAfterIdx = result.findIndex((m) => m.tag === sup.insertAfter);
    const position = insertAfterIdx >= 0 ? insertAfterIdx + 1 : result.length;
    result.splice(position, 0, { tag: sup.tag, file: sup.file });
  }

  return result;
}

const dbUrl = getDbUrl();
const { Client } = pg;

const client = new Client({
  connectionString: dbUrl,
  ssl: dbUrl.includes("supabase.com") ? { rejectUnauthorized: false } : undefined,
});

await client.connect();
console.log("Connected to database");

// Ensure drizzle migrations tracking table exists (same schema drizzle-kit uses)
await client.query(`CREATE SCHEMA IF NOT EXISTS drizzle`);
await client.query(`
  CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
    id SERIAL PRIMARY KEY,
    hash TEXT NOT NULL,
    created_at BIGINT
  )
`);

const appliedRes = await client.query(
  "SELECT hash FROM drizzle.__drizzle_migrations ORDER BY id"
);
const appliedHashes = new Set(appliedRes.rows.map((r) => r.hash));
console.log(`Migrations in tracking table: ${appliedHashes.size}`);

const migrations = buildMigrationList();
console.log(`Migration files to process: ${migrations.map((m) => m.tag).join(", ")}`);

// Check if DB was already bootstrapped outside of this migration runner
// (e.g., via drizzle-kit push). If the tracking table is empty but key tables
// already exist, mark all existing migrations as applied to prevent replay.
if (appliedHashes.size === 0) {
  const existingTablesRes = await client.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`
  );
  const existingTables = new Set(existingTablesRes.rows.map((r) => r.table_name));

  if (existingTables.has("profiles") && existingTables.has("plans")) {
    console.log(
      "Schema already exists (bootstrapped without migration tracking). " +
      "Seeding migration tracking table..."
    );

    // Sentinel checks: determine which migrations are already applied based on
    // specific schema objects that each migration creates.
    async function isMigrationApplied(tag) {
      switch (tag) {
        case "0000_melodic_spirit":
          return existingTables.has("profiles");
        case "0001_messaging_tables":
          return existingTables.has("notification_log");
        case "0002_provider_aware_plan_items": {
          const res = await client.query(
            `SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='plan_items'
               AND column_name='nearby_provider_count'`
          );
          return res.rows.length > 0;
        }
        case "0002_plan_sharing": {
          const res = await client.query(
            `SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='plans'
               AND column_name='share_token'`
          );
          return res.rows.length > 0;
        }
        case "0003_demo_requests":
          return existingTables.has("demo_requests");
        case "0004_provider_reviews":
          return existingTables.has("provider_reviews");
        default:
          return false;
      }
    }

    for (const migration of migrations) {
      const alreadyApplied = await isMigrationApplied(migration.tag);
      if (alreadyApplied) {
        const sql = readFileSync(join(__dirname, "migrations", migration.file), "utf-8");
        const hash = crypto.createHash("sha256").update(sql).digest("hex");
        if (!appliedHashes.has(hash)) {
          await client.query(
            `INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
             SELECT $1, $2 WHERE NOT EXISTS (
               SELECT 1 FROM drizzle.__drizzle_migrations WHERE hash = $1
             )`,
            [hash, Date.now()]
          );
          appliedHashes.add(hash);
          console.log(`  [seeded] ${migration.tag}`);
        }
      }
    }
  }
}

let applied = 0;
let skipped = 0;

for (const migration of migrations) {
  const filePath = join(__dirname, "migrations", migration.file);
  const sql = readFileSync(filePath, "utf-8");
  const hash = crypto.createHash("sha256").update(sql).digest("hex");

  if (appliedHashes.has(hash)) {
    console.log(`  [skip] ${migration.tag} — already applied`);
    skipped++;
    continue;
  }

  console.log(`\n[apply] ${migration.tag}`);

  // Split on --> statement-breakpoint (drizzle-kit delimiter)
  const statements = sql
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  try {
    for (const statement of statements) {
      await client.query(statement);
    }
    // Record successful migration
    await client.query(
      `INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
       SELECT $1, $2 WHERE NOT EXISTS (
         SELECT 1 FROM drizzle.__drizzle_migrations WHERE hash = $1
       )`,
      [hash, Date.now()]
    );
    console.log(`  → applied ${statements.length} statement(s)`);
    applied++;
  } catch (err) {
    console.error(`  ERROR in ${migration.tag}: ${err.message}`);
    await client.end();
    process.exit(1);
  }
}

// Verify key tables exist — fail hard if any are missing
const keyTables = [
  "profiles", "plans", "plan_items", "providers", "modalities",
  "provider_reviews", "demo_requests", "magic_links", "notification_log",
];

const tablesRes = await client.query(
  `SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public'
   ORDER BY table_name`
);
const existing = new Set(tablesRes.rows.map((r) => r.table_name));

const missing = keyTables.filter((t) => !existing.has(t));
if (missing.length > 0) {
  console.error(`\nFAIL — missing key tables: ${missing.join(", ")}`);
  await client.end();
  process.exit(1);
}

console.log(`\n=== Migration complete: ${applied} applied, ${skipped} skipped ===`);
console.log("All key tables verified:", keyTables.join(", "));

await client.end();
