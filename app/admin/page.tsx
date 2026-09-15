"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase/client";
import AdminDashboard from "@/components/admin/AdminDashboard";

type AuthState = "checking" | "signed-out" | "not-admin" | "admin";

export default function AdminPage() {
  const router = useRouter();
  const [state, setState] = useState<AuthState>("checking");
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

      // Authorization: the admins table itself is the source of truth
      // (enforced via RLS on every write) — this check just drives the UI.
      const { data: adminRow } = await supabase!
        .from("admins")
        .select("user_id")
        .eq("user_id", currentUser.id)
        .maybeSingle();

      if (cancelled) return;
      setState(adminRow ? "admin" : "not-admin");
    }

    check();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleSignOut() {
    const supabase = getSupabaseClient();
    await supabase?.auth.signOut();
    router.push("/admin/login");
  }

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
        <p className="mt-3 max-w-md text-sm text-muted">
          {user?.email} is signed in but isn&apos;t an admin on this project.
          Ask the project owner to add your account to the{" "}
          <code className="rounded bg-pine-light px-1">admins</code> table.
        </p>
        <button
          type="button"
          onClick={handleSignOut}
          className="focus-ring mt-6 rounded-full border border-line px-5 py-2 text-sm text-ink hover:border-ink"
        >
          Sign out
        </button>
      </main>
    );
  }

  return <AdminDashboard onSignOut={handleSignOut} />;
}
