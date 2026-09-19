"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabase/client";

const ADMIN_EMAIL = "salmaanmukhtaarxaashi@gmail.com";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const supabase = getSupabaseClient();
    if (!supabase) {
      setError("Marketplace isn't configured — missing Supabase environment variables.");
      return;
    }

    if (email.trim().toLowerCase() !== ADMIN_EMAIL) {
      setError("Invalid admin credentials.");
      return;
    }

    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: ADMIN_EMAIL,
      password,
    });
    setLoading(false);

    if (signInError) {
      setError("Invalid admin credentials.");
      return;
    }

    const { data: isAdmin, error: adminCheckError } =
      await supabase.rpc("is_admin");

    if (adminCheckError || !isAdmin) {
      await supabase.auth.signOut();
      setError("Invalid admin credentials.");
      return;
    }

    router.push("/admin");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-12">
      <Link href="/" className="focus-ring text-sm text-muted hover:text-ink">
        ← Back to Portfolio
      </Link>

      <h1 className="mt-8 font-display text-3xl text-ink">Admin Login</h1>
      <p className="mt-2 text-sm text-muted">
        Sign in to manage the document marketplace.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 grid gap-4">
        <div>
          <label htmlFor="email" className="text-sm text-muted">
            Email
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
        <div>
          <label htmlFor="password" className="text-sm text-muted">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="focus-ring mt-1 w-full rounded-md border border-line bg-white/60 px-3 py-2 text-sm text-ink"
          />
          <div className="mt-2 text-right">
            <Link
              href="/admin/forgot-password"
              className="focus-ring text-xs text-muted hover:text-ink"
            >
              Forgot password?
            </Link>
          </div>
        </div>

        {error && <p className="text-sm text-red-700">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="focus-ring mt-2 rounded-full bg-ink px-6 py-3 text-sm font-medium text-paper transition-colors hover:bg-ink/85 disabled:opacity-50"
        >
          {loading ? "Signing in…" : "Sign In"}
        </button>
      </form>
    </main>
  );
}
