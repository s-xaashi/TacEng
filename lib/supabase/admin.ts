import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let adminClient: SupabaseClient | null = null;

/**
 * SERVER-ONLY. Uses Supabase's secret key (sb_secret_...), which bypasses
 * RLS entirely — the modern replacement for the legacy service_role JWT
 * (Supabase is deprecating anon/service_role by end of 2026). Never import
 * this from a "use client" component or expose its result to the browser
 * unfiltered. Used for: reading the real document price (never trust the
 * browser), writing purchases rows, and generating short-lived signed URLs
 * for paid documents after a verified payment.
 */
export function getSupabaseAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    throw new Error(
      "Server misconfigured: SUPABASE_SECRET_KEY (or the Supabase URL) is missing."
    );
  }

  if (!adminClient) {
    adminClient = createClient(url, secretKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  return adminClient;
}
