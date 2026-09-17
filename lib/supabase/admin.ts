import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let adminClient: SupabaseClient | null = null;

/**
 * SERVER-ONLY. Uses the service-role key, which bypasses RLS entirely.
 * Never import this from a "use client" component or expose its result
 * to the browser unfiltered. Used for: reading the real document price
 * (never trust the browser), writing purchases rows, and generating
 * short-lived signed URLs for paid documents after a verified payment.
 */
export function getSupabaseAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Server misconfigured: SUPABASE_SERVICE_ROLE_KEY (or the Supabase URL) is missing."
    );
  }

  if (!adminClient) {
    adminClient = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  return adminClient;
}
