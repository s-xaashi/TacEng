import { NextRequest, NextResponse } from "next/server";
import { chargeWallet, type WalletGateway } from "@/lib/sifalo/client";
import {
  createPendingPurchase,
  generatePaymentReference,
  getPurchasableDocument,
  applyVerifyResult,
} from "@/lib/sifalo/purchases";

const ALLOWED_GATEWAYS: WalletGateway[] = ["waafi", "edahab", "pbwallet"];

export async function POST(req: NextRequest) {
  let body: {
    documentId?: string;
    gateway?: string;
    account?: string;
    customerEmail?: string;
    customerPhone?: string;
    variantId?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { documentId, gateway, account, customerEmail, customerPhone, variantId } = body;

  if (!documentId || !gateway || !account) {
    return NextResponse.json(
      { error: "documentId, gateway, and account are required." },
      { status: 400 }
    );
  }
  if (!ALLOWED_GATEWAYS.includes(gateway as WalletGateway)) {
    return NextResponse.json({ error: "Unsupported wallet." }, { status: 400 });
  }

  // Price comes from the database — never from the browser.
  const doc = await getPurchasableDocument(documentId, variantId);
  if (!doc) {
    return NextResponse.json(
      { error: "This document isn't available for purchase." },
      { status: 404 }
    );
  }

  const paymentReference = generatePaymentReference();
  const currency = "USD" as const; // Premier Wallet is USD-only; USD everywhere keeps this simple and consistent

  const purchase = await createPendingPurchase({
    documentId: doc.id,
    variantId: doc.variant_id,
    amount: doc.price,
    currency,
    paymentMethod: gateway,
    paymentReference,
    customerEmail,
    customerPhone,
  });

  try {
    const result = await chargeWallet({
      account,
      gateway: gateway as WalletGateway,
      amount: doc.price.toFixed(2),
      currency,
      order_id: paymentReference,
    });

    // code 601 = paid, 603 = pending phone approval, 604/600 = failed.
    // We build a synthetic "verify-shaped" object from the charge response
    // so the exact same idempotent apply logic handles both charge and
    // verify responses.
    const updated = await applyVerifyResult(purchase, {
      sid: result.sid ?? "",
      status:
        result.code === "601"
          ? "success"
          : result.code === "603"
            ? "pending"
            : "failed",
      code: result.code,
      amount: doc.price.toFixed(2),
      currency,
    });

    const failureReason =
      result.code === "604" ? "insufficient_balance" : "payment_failed";

    return NextResponse.json({
      purchaseId: updated.id,
      status: updated.status,
      reason: updated.status === "failed" ? failureReason : null,
      code: result.code,
      message:
        updated.status === "pending"
          ? "Payment is being processed. Please approve it on your phone if requested."
          : updated.status === "paid"
            ? "Payment successful."
            : result.code === "604"
              ? "Payment failed. Your account balance is not enough for this payment."
              : "Payment failed. Please check your wallet details and try again.",
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Payment could not be processed. Please try again.",
      },
      { status: 502 }
    );
  }
}
