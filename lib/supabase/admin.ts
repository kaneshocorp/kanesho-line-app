import { createClient } from "@supabase/supabase-js";

/**
 * Server-only client using the service role key. Bypasses RLS.
 * Never import this from a Client Component or expose it to the browser.
 */
export function supabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が未設定です。.env.local を確認してください。"
    );
  }
  return createClient(url, key, { auth: { persistSession: false } });
}
