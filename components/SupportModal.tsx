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
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function pay() {
    setError(""); setMessage("");
    const value = Number(amount);
    if (!Number.isFinite(value) || value < 1 || value > 10000) { setError(t.support.amountError); return; }
    if (method === "local" && !account.trim()) { setError(t.support.accountError); return; }
    setLoading(true);
    try {
      const endpoint = method === "hosted" ? "/api/support/hosted" : "/api/support/wallet";
      const body = method === "hosted" ? { amount: value } : { amount: value, gateway: wallet.gateway, account: account.trim() };
      const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t.support.paymentError);
      if (data.checkoutUrl) { window.location.href = data.checkoutUrl; return; }
      setMessage(data.status === "paid" ? t.support.success : t.support.pending);
    } catch (e) { setError(e instanceof Error ? e.message : t.support.paymentError); }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-5" onClick={onClose}>
      <div className="relative w-full max-w-lg overflow-hidden rounded-t-[2rem] border border-white/10 bg-[#140708] text-white shadow-2xl sm:rounded-[2rem]" onClick={e => e.stopPropagation()}>
        <div className="absolute -right-20 -top-24 h-56 w-56 rounded-full bg-[#d94455]/20 blur-3xl" />
        <div className="relative p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div><p className="text-[10px] font-semibold uppercase tracking-[.28em] text-[#ef7783]">{t.support.eyebrow}</p><h2 className="mt-2 font-display text-3xl">{t.support.title}</h2><p className="mt-3 text-sm leading-6 text-white/60">{t.support.appreciation}</p></div>
            <button onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/5 text-xl" aria-label={t.support.close}>×</button>
          </div>
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[.04] p-4">
            <p className="text-xs uppercase tracking-[.18em] text-white/40">{t.support.amount}</p>
            <div className="mt-2 flex items-center gap-3"><span className="text-2xl text-white/40">$</span><input value={amount} onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} inputMode="decimal" className="w-full bg-transparent font-display text-3xl outline-none" /></div>
            <div className="mt-4 flex flex-wrap gap-2">{["5","10","25","50"].map(p => <button key={p} onClick={() => setAmount(p)} className={"rounded-full border px-4 py-2 text-xs " + (amount === p ? "border-[#e45560] bg-[#c63f4c]" : "border-white/10 text-white/60")}>${p}</button>)}</div>
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