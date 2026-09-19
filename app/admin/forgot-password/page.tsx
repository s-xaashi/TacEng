"use client";

import { useState } from "react";
import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const supabase = getSupabaseClient();
    if (!supabase) {
      setError("Marketplace isn't configured — missing Supabase environment variables.");
      return;
    }

    setLoading(true);
    // We intentionally show the same "check your email" message whether
    // or not this call errors (e.g. user not found) — never reveal
    // whether an email belongs to an account.
    // Always send production password-recovery links to the live site.
    // Using window.location.origin can accidentally create localhost links
    // when the reset request comes from a local/dev environment.
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://salmaan-portfolio.vercel.app";

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl.replace(/\/$/, "")}/admin/reset-password`,
    });

    if (resetError) {
      setLoading(false);
      setError("We couldn't send the reset email. Please try again.");
      return;
    }

    setLoading(false);
    setSubmitted(true);
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
          Check your email. If an account exists for this email, we&apos;ve
          sent a password reset link.
        </p>
      ) : (
        <>
          <p className="mt-2 text-sm text-muted">
            Enter your admin email address and we&apos;ll send you a secure
            password reset link.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 grid gap-4">
            <div>
              <label htmlFor="email" className="text-sm text-muted">
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="focus-ring mt-1 w-full rounded-md border border-line bg-white/60 px-3 py-2 text-sm text-ink"
              />
            </div>

            {error && <p className="text-sm text-red-700">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="focus-ring mt-2 rounded-full bg-ink px-6 py-3 text-sm font-medium text-paper hover:bg-ink/85 disabled:opacity-50"
            >
              {loading ? "Sending…" : "Send Reset Link"}
            </button>
          </form>
        </>
      )}
    </main>
  );
}
