"use client";

import { useEffect, useRef, useState } from "react";
import type { WalletGateway } from "@/lib/sifalo/client";
import DownloadPurchaseButton from "./DownloadPurchaseButton";
import { useLanguage } from "@/components/LanguageProvider";

type WalletOption = { label: string; gateway: WalletGateway };

// EVC Plus, ZAAD, and SAHAL are all the "waafi" gateway per Sifalo's docs —
// shown as separate customer-facing choices since that's how people think
// of their wallet, but they all charge the same way.
const WALLET_OPTIONS: WalletOption[] = [
  { label: "EVC Plus", gateway: "waafi" },
  { label: "ZAAD", gateway: "waafi" },
  { label: "SAHAL", gateway: "waafi" },
  { label: "eDahab", gateway: "edahab" },
  { label: "Premier Wallet", gateway: "pbwallet" },
];

type Screen = "method" | "wallet-form" | "wallet-status";
type WalletStatus = "pending" | "paid" | "failed";

export default function BuyModal({
  documentId,
  variantId,
  title,
  price,
  onClose,
}: {
  documentId: string;
  variantId?: string | null;
  title: string;
  price: number;
  onClose: () => void;
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
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  function startPolling(id: string) {
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch("/api/checkout/wallet/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ purchaseId: id }),
        });
        const data = await res.json();
        if (data.status === "paid") {
          setWalletStatus("paid");
          setWalletFailureReason(null);
          setWalletProviderMessage(null);
          if (pollRef.current) clearInterval(pollRef.current);
        } else if (data.status === "failed") {
          setWalletStatus("failed");
          setWalletFailureReason(data.reason === "insufficient_balance" ? "insufficient_balance" : "payment_failed");
          setWalletProviderMessage(typeof data.providerMessage === "string" ? data.providerMessage : null);
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch {
        // transient network hiccup — keep polling, next tick will retry
      }
    }, 4000);
  }

  async function handleWalletSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!account.trim()) {
      setError(t.marketplace.enterAccount);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/checkout/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId,
          variantId: variantId ?? undefined,
          gateway: selectedWallet.gateway,
          account: account.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t.marketplace.paymentFailed);

      setPurchaseId(data.purchaseId);
      setScreen("wallet-status");

      if (data.status === "paid") {
        setWalletStatus("paid");
        setWalletFailureReason(null);
        setWalletProviderMessage(null);
      } else if (data.status === "failed") {
        setWalletStatus("failed");
        setWalletFailureReason(data.reason === "insufficient_balance" ? "insufficient_balance" : "payment_failed");
        setWalletProviderMessage(typeof data.providerMessage === "string" ? data.providerMessage : null);
      } else {
        setWalletStatus("pending");
        startPolling(data.purchaseId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t.marketplace.paymentFailed);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCardCheckout() {
    setCardLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout/hosted", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId, variantId: variantId ?? undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t.marketplace.couldNotStartCheckout);
      window.location.href = data.checkoutUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : t.marketplace.couldNotStartCheckout);
      setCardLoading(false);
    }
  }

  function retryWallet() {
    setScreen("wallet-form");
    setWalletStatus("pending");
    setWalletFailureReason(null);
    setWalletProviderMessage(null);
    setPurchaseId(null);
    setError(null);
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-2xl bg-paper p-6 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-display text-xl text-ink">{t.marketplace.completePayment}</h2>
            <p className="mt-1 text-sm text-muted">{title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.marketplace.close}
            className="focus-ring text-muted hover:text-ink"
          >
            ✕
          </button>
        </div>

        <p className="mt-4 font-display text-3xl text-ink">${price.toFixed(2)}</p>

        {screen === "method" && (
          <div className="mt-6 grid gap-3">
            <button
              type="button"
              onClick={() => setScreen("wallet-form")}
              className="focus-ring rounded-xl border border-line p-4 text-left hover:border-ink"
            >
              <p className="font-medium text-ink">{t.marketplace.localWallet}</p>
              <p className="mt-1 text-xs text-muted">{t.marketplace.localWalletDesc}</p>
            </button>
            <button
              type="button"
              onClick={handleCardCheckout}
              disabled={cardLoading}
              className="focus-ring rounded-xl border border-line p-4 text-left hover:border-ink disabled:opacity-50"
            >
              <p className="font-medium text-ink">
                {cardLoading ? t.marketplace.redirecting : t.marketplace.internationalCard}
              </p>
              <p className="mt-1 text-xs text-muted">
                {t.marketplace.cardDesc}
              </p>
            </button>
          </div>
        )}

        {screen === "wallet-form" && (
          <form onSubmit={handleWalletSubmit} className="mt-6 grid gap-4">
            <div>
              <label className="text-sm text-muted">{t.marketplace.choosePaymentMethod}</label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {WALLET_OPTIONS.map((opt) => (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => setSelectedWallet(opt)}
                    className={`focus-ring rounded-lg border px-3 py-2 text-sm ${
                      selectedWallet.label === opt.label
                        ? "border-ink bg-ink text-paper"
                        : "border-line text-ink"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="account" className="text-sm text-muted">
                {t.marketplace.phoneAccount}
              </label>
              <input
                id="account"
                type="tel"
                required
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                placeholder={t.marketplace.accountPlaceholder}
                className="focus-ring mt-1 w-full rounded-md border border-line bg-white/60 px-3 py-2 text-sm text-ink"
              />
            </div>

            {error && <p className="text-sm text-red-700">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="focus-ring rounded-full bg-ink px-6 py-3 text-sm font-medium text-paper hover:bg-ink/85 disabled:opacity-50"
            >
              {submitting ? t.marketplace.paymentPending : t.marketplace.payNow}
            </button>
            {submitting && (
              <p className="text-center text-xs leading-5 text-muted">
                {t.marketplace.walletPendingInstruction}
              </p>
            )}
            <p className="text-center text-xs text-muted">
              {t.marketplace.poweredBySifalo}
            </p>
          </form>
        )}

        {screen === "wallet-status" && (
          <div className="mt-6 text-center">
            {walletStatus === "pending" && (
              <>
                <p className="text-sm font-medium text-ink">{t.marketplace.paymentPending}</p>
                <p className="mt-2 text-xs leading-5 text-muted">
                  {t.marketplace.walletPendingInstruction}
                </p>
              </>
            )}
            {walletStatus === "paid" && purchaseId && (
              <>
                <p className="text-sm font-medium text-pine-dark">
                  {t.marketplace.paymentSuccessful}
                </p>
                <div className="mt-4 flex justify-center">
                  <DownloadPurchaseButton purchaseId={purchaseId} />
                </div>
              </>
            )}
            {walletStatus === "failed" && (
              <>
                <p className="text-sm text-red-700">
                  {walletFailureReason === "insufficient_balance"
                    ? t.marketplace.walletInsufficient
                    : walletProviderMessage?.toLowerCase().includes("invalid pin")
                      ? t.marketplace.walletInvalidPin
                      : t.marketplace.walletFailed}
                </p>
                <button
                  type="button"
                  onClick={retryWallet}
                  className="focus-ring mt-4 rounded-full border border-line px-5 py-2 text-sm text-ink hover:border-ink"
                >
                  {t.marketplace.tryAgain}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
