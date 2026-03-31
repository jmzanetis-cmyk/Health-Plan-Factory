import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl) {
  throw new Error("VITE_SUPABASE_URL environment variable is required");
}

if (!supabaseAnonKey) {
  throw new Error("VITE_SUPABASE_ANON_KEY environment variable is required");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
