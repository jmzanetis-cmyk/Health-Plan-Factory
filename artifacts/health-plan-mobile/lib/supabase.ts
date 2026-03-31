import { createClient } from "@supabase/supabase-js";

// EXPO_PUBLIC_ vars are embedded at bundle time by the Expo bundler.
// They are forwarded from SUPABASE_URL / SUPABASE_ANON_KEY in the dev script.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error("EXPO_PUBLIC_SUPABASE_URL is not configured");
}

if (!supabaseAnonKey) {
  throw new Error("EXPO_PUBLIC_SUPABASE_ANON_KEY is not configured");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
