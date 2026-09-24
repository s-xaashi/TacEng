import { NextRequest, NextResponse } from "next/server";
import { verifyTransaction } from "@/lib/sifalo/client";
import { applyVerifyResult, getPurchaseById } from "@/lib/sifalo/purchases";

/**
 * Polled by the wallet modal while a purchase is 'pending' (Sifalo code 603
 * — waiting on phone approval). Sifalo has no webhooks, so this is the
 * only way to learn a pending payment resolved.
 */
export async function POST(req: NextRequest) {
  let body: { purchaseId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!body.purchaseId) {
    return NextResponse.json({ error: "purchaseId is required." }, { status: 400 });
  }

  const purchase = await getPurchaseById(body.purchaseId);
  if (!purchase) {
    return NextResponse.json({ error: "Purchase not found." }, { status: 404 });
  }

  // Already resolved — nothing to poll.
  if (purchase.status !== "pending") {
    return NextResponse.json({ status: purchase.status });
  }
  if (!purchase.provider_transaction_id) {
    // Never got a sid at all (e.g. a genuine network failure on the
    // original charge) — nothing to verify against.
    return NextResponse.json({ status: "pending" });
  }

  const verify = await verifyTransaction({ sid: purchase.provider_transaction_id });
  const updated = await applyVerifyResult(purchase, verify);
  const reason =
    updated.status === "failed"
      ? verify.code === "604"
        ? "insufficient_balance"
        : "payment_failed"
      : null;

  return NextResponse.json({
    status: updated.status,
    reason,
    code: verify.code,
    message:
      updated.status === "pending"
        ? "Payment is being processed. Please approve it on your phone if requested."
        : updated.status === "paid"
          ? "Payment successful."
          : verify.code === "604"
            ? "Payment failed. Your account balance is not enough for this payment."
            : "Payment failed. Please check your wallet details and try again.",
  });
}
