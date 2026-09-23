"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";

type PaymentRow = {
  id: string;
  type: "Document Purchase" | "Support Me";
  item: string;
  customer_name: string | null;
  customer_note: string | null;
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
  const [selectedNote, setSelectedNote] = useState<string | null>(null);
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

  useEffect(() => {
    if (!selectedNote) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedNote(null);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedNote]);

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
          <table className="w-full min-w-[1180px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
                <th className="py-2 pr-4">Type</th>
                <th className="py-2 pr-4">Item</th>
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Phone</th>
                <th className="py-2 pr-4">Note</th>
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
                  <td className="py-3 pr-4 text-ink">{p.customer_name ?? "—"}</td>
                  <td className="py-3 pr-4 text-muted">{p.customer_phone ?? "—"}</td>
                  <td className="max-w-[240px] py-3 pr-4 text-muted">
                    {p.customer_note ? (
                      (() => {
                        const words = p.customer_note.trim().split(/\s+/);
                        const preview =
                          words.length > 2
                            ? words.slice(0, 2).join(" ") + " …"
                            : p.customer_note;

                        return (
                          <button
                            type="button"
                            onClick={() => setSelectedNote(p.customer_note)}
                            className="focus-ring max-w-[240px] text-left transition-opacity hover:opacity-70"
                            aria-label="Open full note"
                            title="Click to read full note"
                          >
                            <span className="block max-w-[240px] whitespace-normal break-words">
                              {preview}
                            </span>
                          </button>
                        );
                      })()
                    ) : (
                      "—"
                    )}
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
      {selectedNote ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 px-5 py-6"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedNote(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-note-title"
            className="relative w-full max-w-sm rounded-2xl border border-line bg-paper p-6 shadow-2xl"
          >
            <button
              type="button"
              onClick={() => setSelectedNote(null)}
              className="focus-ring absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full text-xl text-muted transition-colors hover:bg-line hover:text-ink"
              aria-label="Close note"
            >
              ×
            </button>

            <p className="pr-10 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
              Payment note
            </p>
            <h2 id="payment-note-title" className="mt-1 font-display text-xl text-ink">
              Customer note
            </h2>
            <p className="mt-5 max-h-[50vh] overflow-y-auto whitespace-pre-wrap break-words text-sm leading-6 text-ink">
              {selectedNote}
            </p>
          </section>
        </div>
      ) : null}

    </main>
  );
}
