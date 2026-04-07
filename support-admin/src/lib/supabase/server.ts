import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseConfig } from "./config";

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  const { supabaseAnonKey, supabaseUrl } = getSupabaseConfig();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          // Server actions and route handlers can persist refreshed auth cookies.
          cookiesToSet.forEach(({ name, options, value }) => {
            cookieStore.set(name, value, options as CookieOptions);
          });
        } catch {
          // Server Components are read-only, so middleware handles refresh there.
        }
      },
    },
  });
}
