import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/**
 * Browser Supabase client, built from the public URL + anon key.
 * The anon key is safe to ship to the browser — every table it touches
 * is protected by Row Level Security policies in the database.
 */
export function getSupabaseClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    // Marketplace should degrade gracefully (empty state) rather than crash
    // if env vars aren't configured yet (e.g. local dev without .env.local).
    return null;
  }

  if (!client) {
    client = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }

  return client;
}
