import { NextRequest, NextResponse } from "next/server";
import { CouponError, couponErrorStatus, getCouponQuote } from "@/lib/coupons";

export async function POST(req: NextRequest) {
  let body: { documentId?: string; variantId?: string; code?: string };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!body.documentId) {
    return NextResponse.json({ error: "documentId is required." }, { status: 400 });
  }

  try {
    const quote = await getCouponQuote(body.documentId, body.variantId, body.code ?? "");
    return NextResponse.json({
      valid: true,
      discountType: quote.coupon.discount_type,
      discountPercent: quote.coupon.discount_percent,
      originalAmount: quote.originalAmount,
      discountAmount: quote.discountAmount,
      finalAmount: quote.finalAmount,
    });
  } catch (error) {
    if (error instanceof CouponError) {
      return NextResponse.json(
        { valid: false, code: error.code, error: error.message },
        { status: couponErrorStatus(error) },
      );
    }

    console.error("Coupon validation failed", error);
    return NextResponse.json(
      { valid: false, error: "We couldn't validate the coupon. Please try again." },
      { status: 500 },
    );
  }
}
