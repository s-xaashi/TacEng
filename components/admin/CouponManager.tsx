"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";

type Coupon = {
  id: string;
  code: string;
  discount_type: "full" | "percentage";
  discount_percent: number | null;
  active: boolean;
  starts_at: string | null;
  expires_at: string | null;
  created_at: string;
};

type FormState = {
  id: string | null;
  code: string;
  discountType: "full" | "percentage";
  discountPercent: string;
  active: boolean;
  startsAt: string;
  expiresAt: string;
};

const emptyForm: FormState = {
  id: null, code: "", discountType: "percentage", discountPercent: "10",
  active: true, startsAt: "", expiresAt: "",
};

export default function CouponManager() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const authHeader = async () => {
    const client = getSupabaseClient();
    if (!client) throw new Error("Supabase is not configured.");
    const { data: { session } } = await client.auth.getSession();
    if (!session?.access_token) throw new Error("Your admin session has expired. Please sign in again.");
    return { Authorization: "Bearer " + session.access_token };
  };

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/coupons", { headers: await authHeader(), cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not load coupons.");
      setCoupons(data.coupons ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load coupons.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function reset() { setForm(emptyForm); setError(null); }

  async function save(event: React.FormEvent) {
    event.preventDefault(); setError(null); setSaving(true);
    try {
      const res = await fetch("/api/admin/coupons", {
        method: form.id ? "PATCH" : "POST",
        headers: { ...(await authHeader()), "Content-Type": "application/json" },
        body: JSON.stringify({
          id: form.id ?? undefined, code: form.code, discountType: form.discountType,
          discountPercent: form.discountType === "percentage" ? form.discountPercent : null,
          active: form.active,
          startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
          expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save coupon.");
      reset(); await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save coupon.");
    } finally { setSaving(false); }
  }

  function edit(coupon: Coupon) {
    const toLocal = (value: string | null) => {
      if (!value) return "";
      const date = new Date(value);
      return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    };
    setForm({
      id: coupon.id, code: coupon.code, discountType: coupon.discount_type,
      discountPercent: coupon.discount_percent == null ? "10" : String(coupon.discount_percent),
      active: coupon.active, startsAt: toLocal(coupon.starts_at), expiresAt: toLocal(coupon.expires_at),
    });
    setError(null);
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  }

  async function remove(coupon: Coupon) {
    if (!window.confirm("Delete coupon \"" + coupon.code + "\"?")) return;
    try {
      const res = await fetch("/api/admin/coupons?id=" + encodeURIComponent(coupon.id), {
        method: "DELETE", headers: await authHeader(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not delete coupon.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete coupon.");
    }
  }

  return (
    <section className="mt-10 rounded-2xl border border-line p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-xl text-ink">Coupons</h3>
          <p className="mt-1 text-xs leading-5 text-muted">Create full or percentage discounts for paid documents.</p>
        </div>
        {form.id && <button type="button" onClick={reset} className="focus-ring rounded-full border border-line px-4 py-2 text-xs text-ink">Cancel</button>}
      </div>

      <form onSubmit={save} className="mt-5 grid gap-4 rounded-2xl border border-line/70 p-4 sm:grid-cols-2">
        <label className="block"><span className="text-sm text-muted">Coupon code</span><input required maxLength={80} value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="e.g. WELCOME20" className="admin-input mt-1" /></label>
        <label className="block"><span className="text-sm text-muted">Discount type</span><select value={form.discountType} onChange={e => setForm(f => ({ ...f, discountType: e.target.value as FormState["discountType"] }))} className="admin-input mt-1"><option value="percentage">Percentage discount</option><option value="full">Full discount (free)</option></select></label>
        {form.discountType === "percentage" && <label className="block"><span className="text-sm text-muted">Discount percentage</span><input required min="0.01" max="100" step="0.01" type="number" value={form.discountPercent} onChange={e => setForm(f => ({ ...f, discountPercent: e.target.value }))} className="admin-input mt-1" /></label>}
        <label className="flex items-center gap-2 text-sm text-ink sm:pt-7"><input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} />Active</label>
        <label className="block"><span className="text-sm text-muted">Starts (optional)</span><input type="datetime-local" value={form.startsAt} onChange={e => setForm(f => ({ ...f, startsAt: e.target.value }))} className="admin-input mt-1" /></label>
        <label className="block"><span className="text-sm text-muted">Expires (optional)</span><input type="datetime-local" value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))} className="admin-input mt-1" /></label>
        <div className="sm:col-span-2">{error && <p className="mb-3 text-sm text-red-700">{error}</p>}<button disabled={saving} type="submit" className="focus-ring rounded-full bg-ink px-5 py-2.5 text-sm text-paper disabled:opacity-50">{saving ? "Saving…" : form.id ? "Save coupon" : "Create coupon"}</button></div>
      </form>

      <div className="mt-5">
        <div className="flex items-center justify-between"><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-muted">Existing coupons</p><button type="button" onClick={load} className="text-xs text-muted underline">Refresh</button></div>
        {loading ? <p className="mt-3 text-sm text-muted">Loading…</p> : coupons.length === 0 ? <p className="mt-3 text-sm text-muted">No coupons yet.</p> : (
          <div className="mt-3 grid gap-2">{coupons.map(coupon => (
            <div key={coupon.id} className="flex flex-col gap-3 rounded-xl border border-line/70 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><strong className="text-sm text-ink">{coupon.code}</strong><span className="rounded-full border border-line px-2 py-1 text-[10px] text-muted">{coupon.discount_type === "full" ? "Full / Free" : Number(coupon.discount_percent) + "%"}</span><span className={coupon.active ? "rounded-full bg-pine-light px-2 py-1 text-[10px] text-pine-dark" : "rounded-full bg-line px-2 py-1 text-[10px] text-muted"}>{coupon.active ? "Active" : "Inactive"}</span></div><p className="mt-1 text-[11px] text-muted">{coupon.starts_at ? "Starts " + new Date(coupon.starts_at).toLocaleString() : "Available now"}{" · "}{coupon.expires_at ? "Expires " + new Date(coupon.expires_at).toLocaleString() : "No expiration"}</p></div>
              <div className="flex shrink-0 gap-2"><button type="button" onClick={() => edit(coupon)} className="focus-ring rounded-full border border-line px-3 py-1.5 text-xs">Edit</button><button type="button" onClick={() => remove(coupon)} className="focus-ring rounded-full border border-red-200 px-3 py-1.5 text-xs text-red-700">Delete</button></div>
            </div>
          ))}</div>
        )}
      </div>
    </section>
  );
}
