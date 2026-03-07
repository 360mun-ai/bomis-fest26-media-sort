import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

let client: SupabaseClient | null = null;

try {
  // Only attempt to initialize if it's a valid HTTP URL
  if (supabaseUrl && supabaseUrl.startsWith("http") && supabaseKey) {
    client = createClient(supabaseUrl, supabaseKey);
  }
} catch (e) {
  console.warn("[Supabase] Invalid initialization config:", e);
}

export const supabase = client;
