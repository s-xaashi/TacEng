"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase/client";

export type AdminAuthState = "checking" | "signed-out" | "not-admin" | "admin" | "error";

/**
 * Single source of truth for "is this an authenticated admin". Every
 * protected /admin/* page uses this instead of re-implementing the check.
 * This only drives the UI — real authorization is enforced server-side by
 * RLS (is_admin()) on every read/write, so a bug here can't grant access
 * to data, only mis-render a page.
 */
export function useAdminAuth() {
  const router = useRouter();
  const [state, setState] = useState<AdminAuthState>("checking");
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) {
      setState("error");
      setError("Supabase is not configured. Please check the deployment environment variables.");
      router.push("/admin/login");
      return;
    }

    // Stable non-null alias so TypeScript keeps the narrowing inside async callbacks.
    const supabase = client;

    let cancelled = false;

    async function check() {
      try {
        setError(null);

        const withTimeout = <T,>(promise: PromiseLike<T>, message: string) =>
          Promise.race([
            promise,
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error(message)), 10000),
            ),
          ]);

        const {
          data: { user: currentUser },
        } = await withTimeout(
          supabase.auth.getUser(),
          "Authentication check timed out. Please try again.",
        );

        if (cancelled) return;

        if (!currentUser) {
          setUser(null);
          setState("signed-out");
          router.push("/admin/login");
          return;
        }

        setUser(currentUser);

        const { data: adminRow, error: adminError } = await withTimeout(
          supabase
            .from("admins")
            .select("user_id")
            .eq("user_id", currentUser.id)
            .maybeSingle(),
          "Admin access check timed out. Please try again.",
        );

        if (cancelled) return;

        if (adminError) {
          throw adminError;
        }

        setState(adminRow ? "admin" : "not-admin");
      } catch (err) {
        if (cancelled) return;
        console.error("Admin access check failed:", err);
        setError(err instanceof Error ? err.message : "Unable to verify admin access.");
        setState("error");
      }
    }

    void check();

    // If the session disappears (sign-out in another tab, expiry, etc.)
    // bounce back to login immediately rather than leaving a stale page up.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setState("signed-out");
        router.push("/admin/login");
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [router]);

  async function signOut() {
    const supabase = getSupabaseClient();
    await supabase?.auth.signOut();
    router.push("/admin/login");
    // Drop any client-side cached state/data from the signed-out session.
    router.refresh();
  }

  return { state, user, error, signOut };
}
