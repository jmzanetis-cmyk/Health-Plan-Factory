import { defineConfig } from "drizzle-kit";
import path from "path";

// When SUPABASE_DATABASE_URL is set, migrations run against Supabase Postgres.
// Otherwise fall back to DATABASE_URL (Replit's local Helium DB).
const url = process.env.SUPABASE_DATABASE_URL ?? process.env.DATABASE_URL;

if (!url) {
  throw new Error("DATABASE_URL or SUPABASE_DATABASE_URL must be set");
}

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  out: path.join(__dirname, "./migrations"),
  dialect: "postgresql",
  dbCredentials: {
    url,
    ssl: url.includes("supabase.com") ? { rejectUnauthorized: false } : undefined,
  },
});
