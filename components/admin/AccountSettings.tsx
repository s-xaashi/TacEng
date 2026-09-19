"use client";

import { useState } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase/client";
import PasswordField from "./PasswordField";
import { validatePassword, passwordStrength } from "@/lib/passwordPolicy";

export default function AccountSettings({
  user,
  onSignOut,
}: {
  user: User;
  onSignOut: () => void;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const validationError = validatePassword(newPassword);
    if (validationError) {
      setError(validationError);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }
    if (!user.email) {
      setError("Your account has no email on file — use Forgot Password instead.");
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) return;

    setLoading(true);

    // Supabase's updateUser() doesn't take a "current password" itself —
    // the officially supported way to verify it is to re-authenticate
    // with it first (this is exactly the API's documented reauthentication
    // pattern), then perform the update on the now-confirmed session.
    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });

    if (reauthError) {
      setLoading(false);
      setError("Current password is incorrect.");
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setSuccess(true);
  }

  const strength = newPassword ? passwordStrength(newPassword) : null;

  return (
    <main className="mx-auto min-h-screen max-w-content px-6 py-12">
      <h1 className="font-display text-3xl text-ink">Account Settings</h1>

      <section className="mt-8 rounded-2xl border border-line p-6">
        <h2 className="font-display text-lg text-ink">Account</h2>
        <dl className="mt-4 grid gap-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Email</dt>
            <dd className="text-ink">{user.email}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Admin status</dt>
            <dd className="text-pine-dark">Admin</dd>
          </div>
        </dl>
        {/* Supabase doesn't expose a dedicated "password last changed"
            timestamp — auth.users.updated_at reflects any account change,
            not specifically the password, so showing it here would be
            misleading rather than informative. */}
      </section>

      <section className="mt-8 rounded-2xl border border-line p-6">
        <h2 className="font-display text-lg text-ink">Security</h2>
        <h3 className="mt-4 text-sm font-medium text-ink">Change Password</h3>

        <form onSubmit={handleChangePassword} className="mt-4 grid max-w-sm gap-4">
          <PasswordField
            id="currentPassword"
            label="Current password"
            value={currentPassword}
            onChange={setCurrentPassword}
            autoComplete="current-password"
          />
          <div>
            <PasswordField
              id="newPassword"
              label="New password"
              value={newPassword}
              onChange={setNewPassword}
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
                Strength: {strength} — at least 8 characters, with letters
                and numbers.
              </p>
            )}
          </div>
          <PasswordField
            id="confirmNewPassword"
            label="Confirm new password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            autoComplete="new-password"
          />

          {error && <p className="text-sm text-red-700">{error}</p>}
          {success && (
            <p className="text-sm text-pine-dark">
              Your password has been updated successfully.
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="focus-ring w-fit rounded-full bg-ink px-6 py-3 text-sm font-medium text-paper hover:bg-ink/85 disabled:opacity-50"
          >
            {loading ? "Updating…" : "Change Password"}
          </button>
        </form>

        <p className="mt-6 text-sm text-muted">
          Can&apos;t remember your current password?{" "}
          <Link href="/admin/forgot-password" className="focus-ring text-ink underline">
            Reset it by email instead
          </Link>
          .
        </p>
      </section>

      <button
        type="button"
        onClick={onSignOut}
        className="focus-ring mt-8 rounded-full border border-line px-5 py-2 text-sm text-ink hover:border-ink"
      >
        Sign out
      </button>
    </main>
  );
}
