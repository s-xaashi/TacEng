import { NextRequest, NextResponse } from "next/server";
import { chargeWallet, type WalletGateway } from "@/lib/sifalo/client";
import {
  createCouponPurchase,
  createPendingPurchase,
  generatePaymentReference,
  getPurchasableDocument,
  applyVerifyResult,
} from "@/lib/sifalo/purchases";
import { CouponError, couponErrorStatus, getCouponQuote } from "@/lib/coupons";

const ALLOWED_GATEWAYS: WalletGateway[] = ["waafi", "edahab", "pbwallet"];

export async function POST(req: NextRequest) {
  let body: {
    documentId?: string;
    gateway?: string;
    account?: string;
    customerEmail?: string;
    customerPhone?: string;
    variantId?: string;
    couponCode?: string;
  };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }

  const { documentId, gateway, account, customerEmail, customerPhone, variantId, couponCode } = body;
  if (!documentId || !gateway || !account) {
    return NextResponse.json({ error: "documentId, gateway, and account are required." }, { status: 400 });
  }
  if (!ALLOWED_GATEWAYS.includes(gateway as WalletGateway)) {
    return NextResponse.json({ error: "Unsupported wallet." }, { status: 400 });
  }

  const doc = await getPurchasableDocument(documentId, variantId);
  if (!doc) return NextResponse.json({ error: "This document isn't available for purchase." }, { status: 404 });

  let quote = {
    coupon: null as Awaited<ReturnType<typeof getCouponQuote>>["coupon"] | null,
    originalAmount: doc.price,
    discountAmount: 0,
    finalAmount: doc.price,
  };

  if (couponCode?.trim()) {
    try {
      quote = await getCouponQuote(documentId, variantId, couponCode);
    } catch (error) {
      if (error instanceof CouponError) {
        return NextResponse.json({ error: error.message, code: error.code }, { status: couponErrorStatus(error) });
      }
      return NextResponse.json({ error: "We couldn't validate the coupon. Please try again." }, { status: 500 });
    }
  }

  if (quote.finalAmount <= 0 && quote.coupon) {
    try {
      const purchase = await createCouponPurchase({
        documentId: doc.id,
        variantId: doc.variant_id,
        couponId: quote.coupon.id,
        couponCode: quote.coupon.code,
        originalAmount: quote.originalAmount,
        discountAmount: quote.discountAmount,
        customerEmail,
      });
      return NextResponse.json({
        purchaseId: purchase.id,
        status: "paid",
        amount: purchase.amount,
        originalAmount: quote.originalAmount,
        discountAmount: quote.discountAmount,
        couponApplied: true,
      });
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : "Could not complete coupon checkout." }, { status: 500 });
    }
  }

  const paymentReference = generatePaymentReference();
  const currency = "USD" as const;
  const purchase = await createPendingPurchase({
    documentId: doc.id,
    variantId: doc.variant_id,
    amount: quote.finalAmount,
    currency,
    paymentMethod: gateway,
    paymentReference,
    customerEmail,
    customerPhone,
    couponId: quote.coupon?.id,
    couponCode: quote.coupon?.code,
    originalAmount: quote.originalAmount,
    discountAmount: quote.discountAmount,
  });

  try {
    const result = await chargeWallet({
      account,
      gateway: gateway as WalletGateway,
      amount: quote.finalAmount.toFixed(2),
      currency,
      order_id: paymentReference,
    });

    const updated = await applyVerifyResult(purchase, {
      sid: result.sid ?? "",
      status: result.code === "601" ? "success" : result.code === "603" ? "pending" : "failed",
      code: result.code,
      amount: quote.finalAmount.toFixed(2),
      currency,
    });

    if (result.code !== "601" && result.code !== "603") {
      console.warn("[Sifalo wallet charge]", { code: result.code, response: result.response ?? null, purchaseId: updated.id });
    }

    const failureReason = result.code === "604" ? "insufficient_balance" : "payment_failed";
    const providerMessage = result.code === "604" ? null : result.code === "600" && result.response ? result.response : null;

    return NextResponse.json({
      purchaseId: updated.id,
      status: updated.status,
      reason: updated.status === "failed" ? failureReason : null,
      code: result.code,
      message: updated.status === "pending"
        ? "Payment is being processed. Please approve it on your phone if requested."
        : updated.status === "paid"
          ? "Payment successful."
          : result.code === "604"
            ? "Payment failed. Your account balance is not enough for this payment."
            : providerMessage ?? "Payment failed. Please check your wallet details and try again.",
      providerMessage,
      originalAmount: quote.originalAmount,
      discountAmount: quote.discountAmount,
      finalAmount: quote.finalAmount,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Payment could not be processed. Please try again." }, { status: 502 });
  }
}
