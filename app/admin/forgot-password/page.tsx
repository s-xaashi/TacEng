"use client";

import { useState } from "react";
import Link from "next/link";

const ADMIN_EMAIL = "salmaanmukhtaarxaashi@gmail.com";

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/admin/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: ADMIN_EMAIL }),
      });

      if (!response.ok) {
        setError("We couldn't send the reset email. Please try again.");
        return;
      }

      setSubmitted(true);
    } catch {
      setError("We couldn't send the reset email. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-12">
      <Link href="/admin/login" className="focus-ring text-sm text-muted hover:text-ink">
        ← Back to Admin Login
      </Link>

      <h1 className="mt-8 font-display text-3xl text-ink">
        Forgot your password?
      </h1>

      {submitted ? (
        <p className="mt-4 text-sm text-ink">
          If the admin account is configured correctly, a secure reset link
          has been sent to the admin email address.
        </p>
      ) : (
        <>
          <p className="mt-2 text-sm text-muted">
            A secure password reset link will be sent only to the current
            admin email address.
          </p>

          <div className="mt-8 rounded-md border border-line bg-white/60 px-4 py-3">
            <p className="text-xs text-muted">Current admin email</p>
            <p className="mt-1 break-all text-sm font-medium text-ink">
              {ADMIN_EMAIL}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-6">
            {error && <p className="mb-4 text-sm text-red-700">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="focus-ring w-full rounded-full bg-ink px-6 py-3 text-sm font-medium text-paper hover:bg-ink/85 disabled:opacity-50"
            >
              {loading ? "Sending…" : "Send Reset Link"}
            </button>
          </form>
        </>
      )}
    </main>
  );
}
