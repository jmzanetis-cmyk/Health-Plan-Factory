import { defineConfig } from "drizzle-kit";
import path from "path";

function getDbUrl(): string {
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

const url = getDbUrl();

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  out: path.join(__dirname, "./migrations"),
  dialect: "postgresql",
  dbCredentials: {
    url,
    ssl: url.includes("supabase.com") ? { rejectUnauthorized: false } : undefined,
  },
});
