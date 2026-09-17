"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabase/client";

type PurchaseWithDoc = {
  id: string;
  document_id: string;
  customer_email: string | null;
  customer_phone: string | null;
  amount: number;
  currency: string;
  payment_method: string;
  provider_transaction_id: string | null;
  payment_reference: string | null;
  status: string;
  created_at: string;
  paid_at: string | null;
  documents: { title: string } | null;
};

const STATUS_FILTERS = ["all", "paid", "pending", "failed", "cancelled", "expired"] as const;

export default function PurchasesDashboard() {
  const [purchases, setPurchases] = useState<PurchaseWithDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<(typeof STATUS_FILTERS)[number]>("all");

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    async function load() {
      let query = supabase!
        .from("purchases")
        .select(
          "id, document_id, customer_email, customer_phone, amount, currency, payment_method, provider_transaction_id, payment_reference, status, created_at, paid_at, documents(title)"
        )
        .order("created_at", { ascending: false });

      if (filter !== "all") query = query.eq("status", filter);

      const { data } = await query;
      setPurchases((data as unknown as PurchaseWithDoc[]) ?? []);
      setLoading(false);
    }

    setLoading(true);
    load();
  }, [filter]);

  return (
    <main className="mx-auto min-h-screen max-w-content px-6 py-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl text-ink">Payments</h1>
          <p className="mt-1 text-sm text-muted">All marketplace purchases.</p>
        </div>
        <Link
          href="/admin"
          className="focus-ring rounded-full border border-line px-5 py-2 text-sm text-ink hover:border-ink"
        >
          ← Documents
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={`focus-ring rounded-full border px-4 py-2 text-xs capitalize transition-colors ${
              filter === s
                ? "border-ink bg-ink text-paper"
                : "border-line text-muted hover:border-ink hover:text-ink"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="mt-8 text-sm text-muted">Loading…</p>
      ) : purchases.length === 0 ? (
        <p className="mt-8 text-sm text-muted">No purchases yet.</p>
      ) : (
        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[960px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
                <th className="py-2 pr-4">Document</th>
                <th className="py-2 pr-4">Customer</th>
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
              {purchases.map((p) => (
                <tr key={p.id} className="border-b border-line/60 align-top">
                  <td className="py-3 pr-4 text-ink">
                    {p.documents?.title ?? p.document_id}
                  </td>
                  <td className="py-3 pr-4 text-muted">
                    {p.customer_email && <div>{p.customer_email}</div>}
                    {p.customer_phone && <div>{p.customer_phone}</div>}
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
                      className={`rounded-full px-3 py-1 text-xs capitalize ${
                        p.status === "paid"
                          ? "bg-pine-light text-pine-dark"
                          : p.status === "pending"
                            ? "bg-gold-light text-gold"
                            : "bg-line text-muted"
                      }`}
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
