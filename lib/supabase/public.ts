import { createClient } from "@supabase/supabase-js";

/**
 * Anon-key client for the public price page. RLS-protected: only
 * public_prices / calendar_overrides / business_config are readable.
 */
export function supabasePublic() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY が未設定です。.env.local を確認してください。"
    );
  }
  return createClient(url, key, { auth: { persistSession: false } });
}
