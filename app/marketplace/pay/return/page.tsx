import Link from "next/link";
import { verifyTransaction } from "@/lib/sifalo/client";
import { applyVerifyResult, getPurchaseByReference } from "@/lib/sifalo/purchases";
import DownloadPurchaseButton from "@/components/marketplace/DownloadPurchaseButton";

export default async function PaymentReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string; sid?: string }>;
}) {
  const { ref, sid } = await searchParams;

  if (!ref) {
    return (
      <Result title="Something went wrong" tone="failed">
        We couldn&apos;t find this payment. If you were charged, contact support
        with your payment reference.
      </Result>
    );
  }

  const purchase = await getPurchaseByReference(ref);
  if (!purchase) {
    return (
      <Result title="Payment not found" tone="failed">
        We couldn&apos;t find a matching order for this payment.
      </Result>
    );
  }

  // The customer landing here does NOT mean payment succeeded — always
  // verify server-side against Sifalo before trusting anything.
  let current = purchase;
  if (purchase.status !== "paid" && sid) {
    const verify = await verifyTransaction({ sid });
    current = await applyVerifyResult(purchase, verify);
  }

  if (current.status === "paid") {
    return (
      <Result title="Payment successful ✓" tone="success">
        <DownloadPurchaseButton purchaseId={current.id} />
      </Result>
    );
  }

  if (current.status === "pending") {
    return (
      <Result title="Payment is being processed…" tone="pending">
        This can take a moment for some wallets. Refresh this page in a
        little while, or check back from the document&apos;s page.
      </Result>
    );
  }

  return (
    <Result title="Payment could not be completed" tone="failed">
      Please try again. If you were charged, contact support with your
      payment reference: <code className="text-xs">{ref}</code>
    </Result>
  );
}

function Result({
  title,
  tone,
  children,
}: {
  title: string;
  tone: "success" | "pending" | "failed";
  children: React.ReactNode;
}) {
  const toneClass =
    tone === "success"
      ? "text-pine-dark"
      : tone === "pending"
        ? "text-gold"
        : "text-red-700";

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center px-6 py-12 text-center">
      <h1 className={`font-display text-2xl ${toneClass}`}>{title}</h1>
      <div className="mt-4 text-sm text-muted">{children}</div>
      <Link
        href="/marketplace"
        className="focus-ring mt-8 rounded-full border border-line px-5 py-2 text-sm text-ink hover:border-ink"
      >
        ← Back to Marketplace
      </Link>
    </main>
  );
}
