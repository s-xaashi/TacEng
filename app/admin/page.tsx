"use client";

import { useAdminAuth } from "@/lib/supabase/useAdminAuth";
import AdminShell from "@/components/admin/AdminShell";
import AdminDashboard from "@/components/admin/AdminDashboard";

export default function AdminPage() {
  const { state, user, signOut } = useAdminAuth();

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
          onClick={signOut}
          className="focus-ring mt-6 rounded-full border border-line px-5 py-2 text-sm text-ink hover:border-ink"
        >
          Sign out
        </button>
      </main>
    );
  }

  return (
    <AdminShell onSignOut={signOut}>
      <AdminDashboard />
    </AdminShell>
  );
}
