import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseConfig } from "./config";

export function createBrowserSupabaseClient() {
  const { supabasePublishableKey, supabaseUrl } = getSupabaseConfig();

  return createBrowserClient(supabaseUrl, supabasePublishableKey);
}
