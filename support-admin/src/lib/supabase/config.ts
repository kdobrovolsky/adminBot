const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_SB_SECRET;

export function getSupabaseConfig() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL and a Supabase key. Set NEXT_PUBLIC_SUPABASE_ANON_KEY, or NEXT_SB_SECRET for server-only fallback.",
    );
  }

  return {
    supabaseAnonKey,
    supabaseUrl,
  };
}
