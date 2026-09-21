"use client";

import { useEffect, useRef, useState } from "react";
import type { WalletGateway } from "@/lib/sifalo/client";
import DownloadPurchaseButton from "./DownloadPurchaseButton";

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
  title,
  price,
  onClose,
}: {
  documentId: string;
  title: string;
  price: number;
  onClose: () => void;
}) {
  const [screen, setScreen] = useState<Screen>("method");
  const [selectedWallet, setSelectedWallet] = useState<WalletOption>(WALLET_OPTIONS[0]);
  const [account, setAccount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [purchaseId, setPurchaseId] = useState<string | null>(null);
  const [walletStatus, setWalletStatus] = useState<WalletStatus>("pending");
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
          if (pollRef.current) clearInterval(pollRef.current);
        } else if (data.status === "failed") {
          setWalletStatus("failed");
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
      setError("Enter your phone / account number.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/checkout/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId,
          gateway: selectedWallet.gateway,
          account: account.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Payment failed.");

      setPurchaseId(data.purchaseId);
      setScreen("wallet-status");

      if (data.status === "paid") {
        setWalletStatus("paid");
      } else if (data.status === "failed") {
        setWalletStatus("failed");
      } else {
        setWalletStatus("pending");
        startPolling(data.purchaseId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed.");
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
        body: JSON.stringify({ documentId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not start checkout.");
      window.location.href = data.checkoutUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start checkout.");
      setCardLoading(false);
    }
  }

  function retryWallet() {
    setScreen("wallet-form");
    setWalletStatus("pending");
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
            <h2 className="font-display text-xl text-ink">Complete Payment</h2>
            <p className="mt-1 text-sm text-muted">{title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
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
              <p className="font-medium text-ink">Local Mobile Money / Wallet</p>
              <p className="mt-1 text-xs text-muted">For Somalia &amp; Somaliland</p>
            </button>
            <button
              type="button"
              onClick={handleCardCheckout}
              disabled={cardLoading}
              className="focus-ring rounded-xl border border-line p-4 text-left hover:border-ink disabled:opacity-50"
            >
              <p className="font-medium text-ink">
                {cardLoading ? "Redirecting…" : "International Card / Hosted Checkout"}
              </p>
              <p className="mt-1 text-xs text-muted">
                Visa / Mastercard / other supported cards
              </p>
            </button>
          </div>
        )}

        {screen === "wallet-form" && (
          <form onSubmit={handleWalletSubmit} className="mt-6 grid gap-4">
            <div>
              <label className="text-sm text-muted">Choose payment method</label>
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
                Phone / Account Number
              </label>
              <input
                id="account"
                type="tel"
                required
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                placeholder="e.g. 25261XXXXXXX"
                className="focus-ring mt-1 w-full rounded-md border border-line bg-white/60 px-3 py-2 text-sm text-ink"
              />
            </div>

            {error && <p className="text-sm text-red-700">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="focus-ring rounded-full bg-ink px-6 py-3 text-sm font-medium text-paper hover:bg-ink/85 disabled:opacity-50"
            >
              {submitting ? "Processing…" : "Pay Now"}
            </button>
            <p className="text-center text-xs text-muted">
              Powered securely by Sifalo Pay
            </p>
          </form>
        )}

        {screen === "wallet-status" && (
          <div className="mt-6 text-center">
            {walletStatus === "pending" && (
              <>
                <p className="text-sm text-ink">Payment is being processed…</p>
                <p className="mt-2 text-xs text-muted">
                  Approve the request on your phone if asked.
                </p>
              </>
            )}
            {walletStatus === "paid" && purchaseId && (
              <>
                <p className="text-sm font-medium text-pine-dark">
                  Payment successful ✓
                </p>
                <div className="mt-4 flex justify-center">
                  <DownloadPurchaseButton purchaseId={purchaseId} />
                </div>
              </>
            )}
            {walletStatus === "failed" && (
              <>
                <p className="text-sm text-red-700">
                  Payment could not be completed. Please try again.
                </p>
                <button
                  type="button"
                  onClick={retryWallet}
                  className="focus-ring mt-4 rounded-full border border-line px-5 py-2 text-sm text-ink hover:border-ink"
                >
                  Try again
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
