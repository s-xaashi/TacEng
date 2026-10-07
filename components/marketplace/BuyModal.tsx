"use client";

import { useEffect, useRef, useState } from "react";
import type { WalletGateway } from "@/lib/sifalo/client";
import DownloadPurchaseButton from "./DownloadPurchaseButton";
import { useLanguage } from "@/components/LanguageProvider";

type WalletOption = { label: string; gateway: WalletGateway };
const WALLET_OPTIONS: WalletOption[] = [
  { label: "EVC Plus", gateway: "waafi" }, { label: "ZAAD", gateway: "waafi" },
  { label: "SAHAL", gateway: "waafi" }, { label: "eDahab", gateway: "edahab" },
  { label: "Premier Wallet", gateway: "pbwallet" },
];

type Screen = "method" | "wallet-form" | "wallet-status" | "coupon-success";
type WalletStatus = "pending" | "paid" | "failed";
type CouponQuote = {
  discountType: "full" | "percentage";
  discountPercent: number | null;
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
};

export default function BuyModal({
  documentId, variantId, title, price, onClose,
}: {
  documentId: string; variantId?: string | null; title: string; price: number; onClose: () => void;
}) {
  const { t } = useLanguage();
  const [screen, setScreen] = useState<Screen>("method");
  const [selectedWallet, setSelectedWallet] = useState<WalletOption>(WALLET_OPTIONS[0]);
  const [account, setAccount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [purchaseId, setPurchaseId] = useState<string | null>(null);
  const [walletStatus, setWalletStatus] = useState<WalletStatus>("pending");
  const [walletFailureReason, setWalletFailureReason] = useState<"insufficient_balance" | "payment_failed" | null>(null);
  const [walletProviderMessage, setWalletProviderMessage] = useState<string | null>(null);
  const [cardLoading, setCardLoading] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponQuote, setCouponQuote] = useState<CouponQuote | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const displayedAmount = couponQuote?.finalAmount ?? price;

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  function startPolling(id: string) {
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch("/api/checkout/wallet/status", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ purchaseId: id }),
        });
        const data = await res.json();
        if (data.status === "paid") {
          setWalletStatus("paid"); setWalletFailureReason(null); setWalletProviderMessage(null);
          if (pollRef.current) clearInterval(pollRef.current);
        } else if (data.status === "failed") {
          setWalletStatus("failed");
          setWalletFailureReason(data.reason === "insufficient_balance" ? "insufficient_balance" : "payment_failed");
          setWalletProviderMessage(typeof data.providerMessage === "string" ? data.providerMessage : null);
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch {}
    }, 4000);
  }

  async function applyCoupon() {
    const code = couponCode.trim();
    setCouponError(null);
    if (!code) { setCouponError(t.marketplace.couponEnter); return; }
    setCouponLoading(true);
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId, variantId: variantId ?? undefined, code }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.valid) throw new Error(data?.error ?? t.marketplace.couponValidationError);
      setCouponQuote({
        discountType: data.discountType, discountPercent: data.discountPercent,
        originalAmount: Number(data.originalAmount), discountAmount: Number(data.discountAmount),
        finalAmount: Number(data.finalAmount),
      });
      setError(null);
    } catch (err) {
      setCouponQuote(null);
      setCouponError(err instanceof Error ? err.message : "We couldn't validate the coupon. Please try again.");
    } finally { setCouponLoading(false); }
  }

  function removeCoupon() { setCouponCode(""); setCouponQuote(null); setCouponError(null); setError(null); }

  async function handleWalletSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    if (!account.trim()) { setError(t.marketplace.enterAccount); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/checkout/wallet", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId, variantId: variantId ?? undefined, gateway: selectedWallet.gateway,
          account: account.trim(), couponCode: couponQuote ? couponCode.trim() : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t.marketplace.paymentFailed);
      setPurchaseId(data.purchaseId); setScreen("wallet-status");
      if (data.status === "paid") {
        setWalletStatus("paid"); setWalletFailureReason(null); setWalletProviderMessage(null);
      } else if (data.status === "failed") {
        setWalletStatus("failed");
        setWalletFailureReason(data.reason === "insufficient_balance" ? "insufficient_balance" : "payment_failed");
        setWalletProviderMessage(typeof data.providerMessage === "string" ? data.providerMessage : null);
      } else { setWalletStatus("pending"); startPolling(data.purchaseId); }
    } catch (err) {
      setError(err instanceof Error ? err.message : t.marketplace.paymentFailed);
    } finally { setSubmitting(false); }
  }

  async function handleCardCheckout() {
    setCardLoading(true); setError(null);
    try {
      const res = await fetch("/api/checkout/hosted", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId, variantId: variantId ?? undefined, couponCode: couponQuote ? couponCode.trim() : undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t.marketplace.couldNotStartCheckout);
      if (data.purchaseId && data.status === "paid") {
        setPurchaseId(data.purchaseId); setScreen("coupon-success"); setCardLoading(false); return;
      }
      window.location.href = data.checkoutUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : t.marketplace.couldNotStartCheckout);
      setCardLoading(false);
    }
  }

  function retryWallet() {
    setScreen("wallet-form"); setWalletStatus("pending"); setWalletFailureReason(null);
    setWalletProviderMessage(null); setPurchaseId(null); setError(null);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-6" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-2xl bg-paper p-6 sm:rounded-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div><h2 className="font-display text-xl text-ink">{t.marketplace.completePayment}</h2><p className="mt-1 text-sm text-muted">{title}</p></div>
          <button type="button" onClick={onClose} aria-label={t.marketplace.close} className="focus-ring text-muted hover:text-ink">✕</button>
        </div>

        <div className="mt-4">
          {couponQuote ? (
            <div className="rounded-xl border border-line/70 p-3">
              <div className="flex items-center justify-between text-sm text-muted"><span>{t.marketplace.couponOriginal}</span><span className="line-through">${couponQuote.originalAmount.toFixed(2)}</span></div>
              <div className="mt-1 flex items-center justify-between text-sm text-pine-dark"><span>{t.marketplace.couponDiscount}</span><span>- ${couponQuote.discountAmount.toFixed(2)}{couponQuote.discountType === "percentage" && couponQuote.discountPercent ? " (" + couponQuote.discountPercent + "%)" : ""}</span></div>
              <div className="mt-2 flex items-center justify-between border-t border-line pt-2 font-display text-2xl text-ink"><span>{t.marketplace.couponTotal}</span><span>${displayedAmount.toFixed(2)}</span></div>
              <button type="button" onClick={removeCoupon} className="mt-2 text-xs text-muted underline">{t.marketplace.couponRemove}</button>
            </div>
          ) : <p className="font-display text-3xl text-ink">${price.toFixed(2)}</p>}
        </div>

        <div className="mt-5">
          <div className="flex gap-2">
            <input value={couponCode} onChange={e => setCouponCode(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); applyCoupon(); } }} placeholder={t.marketplace.couponCode} maxLength={80} className="focus-ring min-w-0 flex-1 rounded-lg border border-line bg-white/60 px-3 py-2 text-sm text-ink" />
            <button type="button" onClick={applyCoupon} disabled={couponLoading} className="focus-ring rounded-lg border border-line px-4 py-2 text-sm text-ink disabled:opacity-50"{couponLoading ? "…" : t.marketplace.couponApply}</button>
          </div>
          {couponError && <p className="mt-2 text-xs text-red-700">{couponError}</p>}
        </div>

        {screen === "method" && (
          <div className="mt-6 grid gap-3">
            {couponQuote?.finalAmount === 0 ? (
              <button type="button" onClick={handleCardCheckout} disabled={cardLoading} className="focus-ring rounded-full bg-ink px-6 py-3 text-sm font-medium text-paper disabled:opacity-50">{cardLoading ? t.marketplace.couponPreparing : t.marketplace.couponDownloadFree}</button>
            ) : (
              <>
                <button type="button" onClick={() => setScreen("wallet-form")} className="focus-ring rounded-xl border border-line p-4 text-left hover:border-ink"><p className="font-medium text-ink">{t.marketplace.localWallet}</p><p className="mt-1 text-xs text-muted">{t.marketplace.localWalletDesc}</p></button>
                <button type="button" onClick={handleCardCheckout} disabled={cardLoading} className="focus-ring rounded-xl border border-line p-4 text-left hover:border-ink disabled:opacity-50"><p className="font-medium text-ink">{cardLoading ? t.marketplace.redirecting : t.marketplace.internationalCard}</p><p className="mt-1 text-xs text-muted">{t.marketplace.cardDesc}</p></button>
              </>
            )}
            {error && <p className="text-sm text-red-700">{error}</p>}
          </div>
        )}

        {screen === "wallet-form" && (
          <form onSubmit={handleWalletSubmit} className="mt-6 grid gap-4">
            <div><label className="text-sm text-muted">{t.marketplace.choosePaymentMethod}</label><div className="mt-2 grid grid-cols-2 gap-2">{WALLET_OPTIONS.map(opt => <button key={opt.label} type="button" onClick={() => setSelectedWallet(opt)} className={"focus-ring rounded-lg border px-3 py-2 text-sm " + (selectedWallet.label === opt.label ? "border-ink bg-ink text-paper" : "border-line text-ink")}>{opt.label}</button>)}</div></div>
            <div><label htmlFor="account" className="text-sm text-muted">{t.marketplace.phoneAccount}</label><input id="account" type="tel" required value={account} onChange={e => setAccount(e.target.value)} placeholder={t.marketplace.accountPlaceholder} className="focus-ring mt-1 w-full rounded-md border border-line bg-white/60 px-3 py-2 text-sm text-ink" /></div>
            {error && <p className="text-sm text-red-700">{error}</p>}
            <button type="submit" disabled={submitting} className="focus-ring rounded-full bg-ink px-6 py-3 text-sm font-medium text-paper hover:bg-ink/85 disabled:opacity-50">{submitting ? t.marketplace.paymentPending : t.marketplace.payNow + " · $" + displayedAmount.toFixed(2)}</button>
            {submitting && <p className="text-center text-xs leading-5 text-muted">{t.marketplace.walletPendingInstruction}</p>}
            <p className="text-center text-xs text-muted">{t.marketplace.poweredBySifalo}</p>
          </form>
        )}

        {screen === "wallet-status" && (
          <div className="mt-6 text-center">
            {walletStatus === "pending" && <><p className="text-sm font-medium text-ink">{t.marketplace.paymentPending}</p><p className="mt-2 text-xs leading-5 text-muted">{t.marketplace.walletPendingInstruction}</p></>}
            {walletStatus === "paid" && purchaseId && <><p className="text-sm font-medium text-pine-dark">{t.marketplace.paymentSuccessful}</p><div className="mt-4 flex justify-center"><DownloadPurchaseButton purchaseId={purchaseId} /></div></>}
            {walletStatus === "failed" && <><p className="text-sm text-red-700">{walletFailureReason === "insufficient_balance" ? t.marketplace.walletInsufficient : walletProviderMessage?.toLowerCase().includes("invalid pin") ? t.marketplace.walletInvalidPin : t.marketplace.walletFailed}</p><button type="button" onClick={retryWallet} className="focus-ring mt-4 rounded-full border border-line px-5 py-2 text-sm text-ink hover:border-ink">{t.marketplace.tryAgain}</button></>}
          </div>
        )}

        {screen === "coupon-success" && purchaseId && (
          <div className="mt-6 text-center"><p className="text-sm font-medium text-pine-dark">{t.marketplace.couponAppliedFree}</p><div className="mt-4 flex justify-center"><DownloadPurchaseButton purchaseId={purchaseId} /></div></div>
        )}
      </div>
    </div>
  );
}
