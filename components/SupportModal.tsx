"use client";
import { useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";

type WalletOption = { label: string; gateway: "waafi" | "edahab" | "pbwallet" };

const wallets: WalletOption[] = [
  { label: "EVC Plus", gateway: "waafi" },
  { label: "ZAAD", gateway: "waafi" },
  { label: "SAHAL", gateway: "waafi" },
  { label: "eDahab", gateway: "edahab" },
  { label: "Premier Wallet", gateway: "pbwallet" },
] as const;

export default function SupportModal({ onClose }: { onClose: () => void }) {
  const { t } = useLanguage();
  const [method, setMethod] = useState<"hosted" | "local">("hosted");
  const [amount, setAmount] = useState("5");
  const [wallet, setWallet] = useState<WalletOption>(wallets[0]);
  const [account, setAccount] = useState("");
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function pay() {
    setError(""); setMessage("");
    const value = Number(amount);
    const cleanName = name.trim().replace(/\s+/g, " ");
    const cleanNote = note.trim().replace(/\s+/g, " ");
    if (!Number.isFinite(value) || value < 1 || value > 10000) { setError(t.support.amountError); return; }
    if (!cleanName) { setError(t.support.nameError); return; }
    if (cleanName.length > 80) { setError(t.support.nameLengthError); return; }
    if (cleanNote.length > 200) { setError(t.support.noteLengthError); return; }
    if (method === "local" && !account.trim()) { setError(t.support.accountError); return; }
    setLoading(true);
    try {
      const endpoint = method === "hosted" ? "/api/support/hosted" : "/api/support/wallet";
      const body = { amount: value, name: cleanName, note: cleanNote || undefined, ...(method === "local" ? { gateway: wallet.gateway, account: account.trim() } : {}) };
      const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t.support.paymentError);
      if (data.checkoutUrl) { window.location.href = data.checkoutUrl; return; }
      if (data.status === "paid") {
        setMessage(t.support.success);
      } else if (data.status === "pending") {
        setMessage(t.support.pending);
      } else {
        setError(data.code === "604" ? t.support.walletInsufficient : t.support.walletFailed);
      }
    } catch (e) { setError(e instanceof Error ? e.message : t.support.paymentError); }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-5" onClick={onClose}>
      <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-y-auto rounded-t-[2rem] border border-white/10 bg-[#140708] text-white shadow-2xl overscroll-contain [scrollbar-width:thin] sm:rounded-[2rem]" onClick={e => e.stopPropagation()}>
        <div className="absolute -right-20 -top-24 h-56 w-56 rounded-full bg-[#d94455]/20 blur-3xl pointer-events-none" />
        <div className="relative p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-[.28em] text-[#ef7783]">{t.support.eyebrow}</p><h2 className="mt-2 font-display text-3xl">{t.support.title}</h2><p className="mt-3 text-sm leading-6 text-white/60">{t.support.appreciation}</p></div>
            <button onClick={onClose} className="mt-0 grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 bg-white/5 text-lg" aria-label={t.support.close}>×</button>
          </div>
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[.04] p-4">
            <p className="text-xs uppercase tracking-[.18em] text-white/40">{t.support.amount}</p>
            <div className="mt-2 flex items-center gap-3"><span className="text-2xl text-white/40">$</span><span className="font-display text-3xl">{Number(amount) > 0 ? Number(amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"}</span></div>
            <div className="mt-4 flex flex-wrap gap-2">{["5","10","25","50"].map(p => <button key={p} onClick={() => setAmount(p)} className={"rounded-full border px-4 py-2 text-xs " + (amount === p ? "border-[#e45560] bg-[#c63f4c]" : "border-white/10 text-white/60")}>$\{p}</button>)}</div>
            <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/10 px-3 py-2.5">
              <label htmlFor="support-custom-amount" className="text-xs font-medium text-white/55">{t.support.customAmount}</label>
              <div className="flex w-28 items-center rounded-lg border border-white/10 bg-white/[.04] px-2.5 py-1.5">
                <span className="text-sm text-white/35">$</span>
                <input id="support-custom-amount" type="number" min="1" max="10000" step="0.01" inputMode="decimal"
                  value={["5","10","25","50"].includes(amount) ? "" : amount}
                  onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                  placeholder={t.support.customPlaceholder}
                  aria-label={t.support.customAmount}
                  className="w-full bg-transparent pl-1 text-right text-sm text-white outline-none placeholder:text-white/25"
                />
              </div>
            </div>
          </div>
          <div className="mt-5 grid gap-4 rounded-2xl border border-white/10 bg-white/[.03] p-4">
            <div>
              <label htmlFor="support-name" className="text-sm text-white/55">{t.support.name}</label>
              <input id="support-name" type="text" required maxLength={80} value={name} onChange={e => setName(e.target.value)} placeholder={t.support.namePlaceholder} autoComplete="name" className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-4 py-3 text-sm outline-none" />
            </div>
            <div>
              <div className="flex items-center justify-between gap-3"><label htmlFor="support-note" className="text-sm text-white/55">{t.support.note}</label><span className="text-[11px] text-white/30">{note.length}/200</span></div>
              <textarea id="support-note" maxLength={200} rows={3} value={note} onChange={e => setNote(e.target.value)} placeholder={t.support.notePlaceholder} className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-white/[.04] px-4 py-3 text-sm outline-none" />
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2 rounded-2xl bg-white/[.04] p-1">
            <button onClick={() => setMethod("hosted")} className={"rounded-xl px-4 py-3 text-sm font-semibold " + (method === "hosted" ? "bg-white text-[#180708]" : "text-white/55")}>{t.support.hosted}</button>
            <button onClick={() => setMethod("local")} className={"rounded-xl px-4 py-3 text-sm font-semibold " + (method === "local" ? "bg-white text-[#180708]" : "text-white/55")}>{t.support.local}</button>
          </div>
          {method === "hosted" ? <div className="mt-5 rounded-2xl border border-white/10 bg-white/[.03] p-4"><p className="font-medium">{t.support.hostedTitle}</p><p className="mt-1 text-sm leading-6 text-white/55">{t.support.hostedText}</p></div> : <div className="mt-5 space-y-4"><p className="text-sm text-white/55">{t.support.chooseWallet}</p><div className="grid grid-cols-2 gap-2">{wallets.map(w => <button key={w.label} onClick={() => setWallet(w)} className={"rounded-xl border px-3 py-2.5 text-left text-sm " + (wallet.label === w.label ? "border-[#e45560] bg-[#c63f4c]/20" : "border-white/10 text-white/60")}>{w.label}</button>)}</div><div><label htmlFor="support-account" className="text-sm text-white/55">{t.support.account}</label><input id="support-account" type="tel" value={account} onChange={e => setAccount(e.target.value)} placeholder="25261XXXXXXX" className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-4 py-3 text-sm outline-none" /><p className="mt-2 text-xs leading-5 text-white/35">{t.support.secureWallet}</p></div></div>}
          {error && <p className="mt-4 text-sm text-[#ff8d98]">{error}</p>}{message && <p className="mt-4 text-sm text-[#8ee6bd]">{message}</p>}
          <button onClick={pay} disabled={loading} className="mt-6 w-full rounded-full bg-[#d94b5a] px-6 py-4 text-sm font-bold shadow-lg disabled:opacity-50">{loading ? t.support.processing : t.support.supportButton + " · $" + (Number(amount) || 0).toFixed(2)}</button>
          <p className="mt-3 text-center text-[11px] text-white/30">{t.support.powered}</p>
        </div>
      </div>
    </div>
  );
}