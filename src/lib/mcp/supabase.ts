import { createClient } from "@supabase/supabase-js";

// Public read-only Supabase client for MCP tools. Uses the anon key so
// row-level security applies exactly as it does on the public site.
export function getPublicSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase env not configured");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}