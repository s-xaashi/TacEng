"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabase/client";
import PasswordField from "@/components/admin/PasswordField";
import { validatePassword, passwordStrength } from "@/lib/passwordPolicy";

type SessionState = "checking" | "valid" | "invalid";

export default function ResetPasswordPage() {
  const [sessionState, setSessionState] = useState<SessionState>("checking");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) {
      setSessionState("invalid");
      return;
    }

    async function verifyRecovery() {
      const { data: { session } } = await client.auth.getSession();
      if (!session?.access_token) {
        setSessionState("invalid");
        return;
      }

      const response = await fetch("/api/admin/recovery-authorized", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      setSessionState(response.ok ? "valid" : "invalid");
    }

    // The recovery token is verified by Supabase Auth, then the server
    // independently verifies that this Auth user is currently listed in
    // public.admins. No email address is hardcoded here.
    verifyRecovery();

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") verifyRecovery();
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const validationError = validatePassword(password);
    if (validationError) {
      setError(validationError);
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) return;

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    // Don't leave the recovery session live — require a fresh, normal
    // login (which re-runs the full admin authorization check) rather
    // than letting this session carry straight into the dashboard.
    await supabase.auth.signOut();
    setSuccess(true);
  }

  if (sessionState === "checking") {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-12">
        <p className="text-sm text-muted">Checking your reset link…</p>
      </main>
    );
  }

  if (sessionState === "invalid") {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-12 text-center">
        <h1 className="font-display text-2xl text-ink">
          This link is invalid or has expired
        </h1>
        <p className="mt-3 text-sm text-muted">
          Password reset links only work once and expire after a while.
          Request a new one below.
        </p>
        <Link
          href="/admin/forgot-password"
          className="focus-ring mt-6 rounded-full bg-ink px-6 py-3 text-sm font-medium text-paper hover:bg-ink/85"
        >
          Request a new reset link
        </Link>
      </main>
    );
  }

  if (success) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-12 text-center">
        <h1 className="font-display text-2xl text-pine-dark">
          Your password has been updated successfully.
        </h1>
        <Link
          href="/admin/login"
          className="focus-ring mt-6 rounded-full bg-ink px-6 py-3 text-sm font-medium text-paper hover:bg-ink/85"
        >
          Return to Admin Login
        </Link>
      </main>
    );
  }

  const strength = password ? passwordStrength(password) : null;

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-12">
      <h1 className="font-display text-3xl text-ink">Reset your password</h1>
      <p className="mt-2 text-sm text-muted">Choose a new password below.</p>

      <form onSubmit={handleSubmit} className="mt-8 grid gap-4">
        <div>
          <PasswordField
            id="password"
            label="New password"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
          />
          {strength && (
            <p
              className={`mt-1 text-xs ${
                strength === "too weak" || strength === "weak"
                  ? "text-red-700"
                  : strength === "okay"
                    ? "text-gold"
                    : "text-pine-dark"
              }`}
            >
              Strength: {strength} — at least 8 characters, with letters and
              numbers.
            </p>
          )}
        </div>

        <PasswordField
          id="confirmPassword"
          label="Confirm new password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          autoComplete="new-password"
        />

        {error && <p className="text-sm text-red-700">{error}</p>}

        <button
          type="submit"
          disabled={loading || !password || !confirmPassword}
          className="focus-ring mt-2 rounded-full bg-ink px-6 py-3 text-sm font-medium text-paper hover:bg-ink/85 disabled:opacity-50"
        >
          {loading ? "Updating…" : "Update Password"}
        </button>
      </form>
    </main>
  );
}
