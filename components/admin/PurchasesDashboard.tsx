"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";

type PaymentRow = {
  id: string;
  type: "Document Purchase" | "Support Me";
  item: string;
  customer_phone: string | null;
  amount: number;
  currency: string;
  payment_method: string;
  provider_transaction_id: string | null;
  payment_reference: string | null;
  status: string;
  created_at: string;
  paid_at: string | null;
};

const STATUS_FILTERS = [
  "all",
  "paid",
  "pending",
  "failed",
  "cancelled",
  "expired",
] as const;

export default function PurchasesDashboard() {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] =
    useState<(typeof STATUS_FILTERS)[number]>("all");

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setError("Supabase is not configured.");
      setLoading(false);
      return;
    }

    // Keep the narrowed non-null client in a separate constant so
    // TypeScript preserves the narrowing inside the async function.
    const client = supabase;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      const {
        data: { session },
      } = await client.auth.getSession();

      if (!session?.access_token) {
        if (!cancelled) {
          setError("Your admin session has expired. Please sign in again.");
          setLoading(false);
        }
        return;
      }

      const response = await fetch(
        "/api/admin/payments?status=" + encodeURIComponent(filter),
        {
          headers: {
            Authorization: "Bearer " + session.access_token,
          },
          cache: "no-store",
        }
      );

      if (!response.ok) {
        if (!cancelled) {
          setError(
            response.status === 401 || response.status === 403
              ? "You are not authorized to view payments."
              : "Could not load payments."
          );
          setLoading(false);
        }
        return;
      }

      const body = (await response.json()) as { payments?: PaymentRow[] };

      if (!cancelled) {
        setPayments(body.payments ?? []);
        setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [filter]);

  return (
    <main className="mx-auto min-h-screen max-w-content px-6 py-12">
      <div>
        <h1 className="font-display text-3xl text-ink">Payments</h1>
        <p className="mt-1 text-sm text-muted">
          Document purchases and Support Me payments.
        </p>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={
              "focus-ring rounded-full border px-4 py-2 text-xs capitalize transition-colors " +
              (filter === s
                ? "border-ink bg-ink text-paper"
                : "border-line text-muted hover:border-ink hover:text-ink")
            }
          >
            {s}
          </button>
        ))}
      </div>

      {error ? (
        <p className="mt-8 text-sm text-red-700">{error}</p>
      ) : loading ? (
        <p className="mt-8 text-sm text-muted">Loading…</p>
      ) : payments.length === 0 ? (
        <p className="mt-8 text-sm text-muted">No payments yet.</p>
      ) : (
        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
                <th className="py-2 pr-4">Type</th>
                <th className="py-2 pr-4">Item</th>
                <th className="py-2 pr-4">Phone</th>
                <th className="py-2 pr-4">Amount</th>
                <th className="py-2 pr-4">Method</th>
                <th className="py-2 pr-4">Sifalo TXN</th>
                <th className="py-2 pr-4">Reference</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Created</th>
                <th className="py-2 pr-4">Paid</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.type + "-" + p.id} className="border-b border-line/60 align-top">
                  <td className="py-3 pr-4">
                    <span
                      className={
                        "rounded-full px-3 py-1 text-xs " +
                        (p.type === "Support Me"
                          ? "bg-gold-light text-gold"
                          : "bg-pine-light text-pine-dark")
                      }
                    >
                      {p.type}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-ink">{p.item}</td>
                  <td className="py-3 pr-4 text-muted">
                    {p.customer_phone ?? "—"}
                  </td>
                  <td className="py-3 pr-4 text-ink">
                    {p.amount.toFixed(2)} {p.currency}
                  </td>
                  <td className="py-3 pr-4 text-muted">{p.payment_method}</td>
                  <td className="py-3 pr-4 font-mono text-xs text-muted">
                    {p.provider_transaction_id ?? "—"}
                  </td>
                  <td className="py-3 pr-4 font-mono text-xs text-muted">
                    {p.payment_reference ?? "—"}
                  </td>
                  <td className="py-3 pr-4">
                    <span
                      className={
                        "rounded-full px-3 py-1 text-xs capitalize " +
                        (p.status === "paid"
                          ? "bg-pine-light text-pine-dark"
                          : p.status === "pending"
                            ? "bg-gold-light text-gold"
                            : "bg-line text-muted")
                      }
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-muted">
                    {new Date(p.created_at).toLocaleString()}
                  </td>
                  <td className="py-3 pr-4 text-muted">
                    {p.paid_at ? new Date(p.paid_at).toLocaleString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
