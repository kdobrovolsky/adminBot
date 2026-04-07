import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseConfig } from "./config";

export function createBrowserSupabaseClient() {
  const { supabaseAnonKey, supabaseUrl } = getSupabaseConfig();

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
