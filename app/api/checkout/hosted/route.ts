import { NextRequest, NextResponse } from "next/server";
import { startHostedCheckout, buildCheckoutRedirectUrl } from "@/lib/sifalo/client";
import {
  createPendingPurchase,
  generatePaymentReference,
  getPurchasableDocument,
} from "@/lib/sifalo/purchases";

export async function POST(req: NextRequest) {
  let body: { documentId?: string; variantId?: string; customerEmail?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!body.documentId) {
    return NextResponse.json({ error: "documentId is required." }, { status: 400 });
  }

  const doc = await getPurchasableDocument(body.documentId, body.variantId);
  if (!doc) {
    return NextResponse.json(
      { error: "This document isn't available for purchase." },
      { status: 404 }
    );
  }

  const paymentReference = generatePaymentReference();
  await createPendingPurchase({
    documentId: doc.id,
    variantId: doc.variant_id,
    amount: doc.price,
    currency: "USD",
    paymentMethod: "checkout",
    paymentReference,
    customerEmail: body.customerEmail,
  });

  // Docs: return_url is required, and order_id must be on its query string
  // — Sifalo appends `sid` to whatever we give it here.
  const origin = req.nextUrl.origin;
  const returnUrl = `${origin}/marketplace/pay/return?ref=${encodeURIComponent(paymentReference)}&order_id=${encodeURIComponent(paymentReference)}`;

  try {
    const session = await startHostedCheckout({
      amount: doc.price.toFixed(2),
      currency: "USD",
      return_url: returnUrl,
    });
    return NextResponse.json({
      checkoutUrl: buildCheckoutRedirectUrl(session),
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Could not start checkout. Please try again.",
      },
      { status: 502 }
    );
  }
}
