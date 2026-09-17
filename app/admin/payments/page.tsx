"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/client";
import PurchasesDashboard from "@/components/admin/PurchasesDashboard";

type AuthState = "checking" | "signed-out" | "not-admin" | "admin";

export default function AdminPaymentsPage() {
  const router = useRouter();
  const [state, setState] = useState<AuthState>("checking");

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setState("signed-out");
      return;
    }

    let cancelled = false;

    async function check() {
      const {
        data: { user },
      } = await supabase!.auth.getUser();
      if (cancelled) return;
      if (!user) {
        router.push("/admin/login");
        return;
      }
      const { data: adminRow } = await supabase!
        .from("admins")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      setState(adminRow ? "admin" : "not-admin");
    }

    check();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (state === "checking" || state === "signed-out") {
    return (
      <main className="mx-auto min-h-screen max-w-content px-6 py-12">
        <p className="text-sm text-muted">Checking access…</p>
      </main>
    );
  }

  if (state === "not-admin") {
    return (
      <main className="mx-auto min-h-screen max-w-content px-6 py-12">
        <h1 className="font-display text-2xl text-ink">Access denied</h1>
      </main>
    );
  }

  return <PurchasesDashboard />;
}
