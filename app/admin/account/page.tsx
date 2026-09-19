"use client";

import { useAdminAuth } from "@/lib/supabase/useAdminAuth";
import AdminShell from "@/components/admin/AdminShell";
import AccountSettings from "@/components/admin/AccountSettings";

export default function AdminAccountPage() {
  const { state, user, signOut } = useAdminAuth();

  if (state === "checking" || state === "signed-out") {
    return (
      <main className="mx-auto min-h-screen max-w-content px-6 py-12">
        <p className="text-sm text-muted">Checking access…</p>
      </main>
    );
  }

  if (state === "not-admin" || !user) {
    return (
      <main className="mx-auto min-h-screen max-w-content px-6 py-12">
        <h1 className="font-display text-2xl text-ink">Access denied</h1>
      </main>
    );
  }

  return (
    <AdminShell onSignOut={signOut}>
      <AccountSettings user={user} onSignOut={signOut} />
    </AdminShell>
  );
}
