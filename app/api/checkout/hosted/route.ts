import { NextRequest, NextResponse } from "next/server";
import { startHostedCheckout, buildCheckoutRedirectUrl } from "@/lib/sifalo/client";
import {
  createCouponPurchase,
  createPendingPurchase,
  generatePaymentReference,
  getPurchasableDocument,
} from "@/lib/sifalo/purchases";
import { CouponError, couponErrorStatus, getCouponQuote } from "@/lib/coupons";

export async function POST(req: NextRequest) {
  let body: { documentId?: string; variantId?: string; customerEmail?: string; couponCode?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }

  if (!body.documentId) return NextResponse.json({ error: "documentId is required." }, { status: 400 });

  const doc = await getPurchasableDocument(body.documentId, body.variantId);
  if (!doc) return NextResponse.json({ error: "This document isn't available for purchase." }, { status: 404 });

  let quote = {
    coupon: null as Awaited<ReturnType<typeof getCouponQuote>>["coupon"] | null,
    originalAmount: doc.price,
    discountAmount: 0,
    finalAmount: doc.price,
  };

  if (body.couponCode?.trim()) {
    try {
      quote = await getCouponQuote(body.documentId, body.variantId, body.couponCode);
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
        customerEmail: body.customerEmail,
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
  await createPendingPurchase({
    documentId: doc.id,
    variantId: doc.variant_id,
    amount: quote.finalAmount,
    currency: "USD",
    paymentMethod: "checkout",
    paymentReference,
    customerEmail: body.customerEmail,
    couponId: quote.coupon?.id,
    couponCode: quote.coupon?.code,
    originalAmount: quote.originalAmount,
    discountAmount: quote.discountAmount,
  });

  const origin = req.nextUrl.origin;
  const returnUrl = `${origin}/marketplace/pay/return?ref=${encodeURIComponent(paymentReference)}&order_id=${encodeURIComponent(paymentReference)}`;

  try {
    const session = await startHostedCheckout({
      amount: quote.finalAmount.toFixed(2),
      currency: "USD",
      return_url: returnUrl,
    });
    return NextResponse.json({
      checkoutUrl: buildCheckoutRedirectUrl(session),
      originalAmount: quote.originalAmount,
      discountAmount: quote.discountAmount,
      finalAmount: quote.finalAmount,
      couponApplied: Boolean(quote.coupon),
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Could not start checkout. Please try again." }, { status: 502 });
  }
}
