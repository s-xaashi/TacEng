"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase/client";

export type AdminAuthState = "checking" | "signed-out" | "not-admin" | "admin";

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

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setState("signed-out");
      return;
    }

    let cancelled = false;

    async function check() {
      const {
        data: { user: currentUser },
      } = await supabase!.auth.getUser();

      if (cancelled) return;

      if (!currentUser) {
        setState("signed-out");
        router.push("/admin/login");
        return;
      }

      setUser(currentUser);

      const { data: adminRow } = await supabase!
        .from("admins")
        .select("user_id")
        .eq("user_id", currentUser.id)
        .maybeSingle();

      if (cancelled) return;
      setState(adminRow ? "admin" : "not-admin");
    }

    check();

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

  return { state, user, signOut };
}
