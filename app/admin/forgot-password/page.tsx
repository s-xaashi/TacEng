"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;

    const timer = window.setInterval(() => {
      setCooldown((seconds) => Math.max(0, seconds - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [cooldown]);

  async function handleSubmit(e: React.FormEvent) {

    e.preventDefault();
    setError(null);

    const normalized = email.trim().toLowerCase();
    if (!normalized) {
      setError("Please enter your admin email address.");
      return;
    }

    if (cooldown > 0) return;

    setLoading(true);

    try {
      const response = await fetch("/api/admin/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalized }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        if (response.status === 429) {
          const retryAfter = Math.max(
            1,
            Math.min(3600, Number(data?.retryAfter) || 5)
          );
          setCooldown(retryAfter);
          setError(
            `Too many reset attempts. Please wait ${retryAfter} seconds before trying again.`
          );
        } else {
          setError(
            data?.error ||
              "Password reset is temporarily unavailable. Please try again."
          );
        }
        return;
      }

      setSubmitted(true);
    } catch {
      setError("Password reset is temporarily unavailable. Please try again.");
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
          If this email belongs to a current admin account, a secure reset
          link has been sent to it.
        </p>
      ) : (
        <>
          <p className="mt-2 text-sm text-muted">
            Enter the email currently registered as an admin. The server will
            verify it against the admin database before sending anything.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 grid gap-4">
            <div>
              <label htmlFor="email" className="text-sm text-muted">
                Admin email address
              </label>
              <input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                maxLength={254}
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                className="focus-ring mt-1 w-full rounded-md border border-line bg-white/60 px-3 py-3 text-sm text-ink"
              />
            </div>

            {error && <p className="text-sm text-red-700">{error}</p>}

            <button
              type="submit"
              disabled={loading || cooldown > 0}
              className="focus-ring mt-2 rounded-full bg-ink px-6 py-3 text-sm font-medium text-paper hover:bg-ink/85 disabled:opacity-50"
            >
              {loading
                ? "Checking…"
                : cooldown > 0
                  ? `Try again in ${cooldown}s`
                  : "Send Reset Link"}
            </button>
          </form>
        </>
      )}
    </main>
  );
}
