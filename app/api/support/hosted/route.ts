import { NextRequest, NextResponse } from "next/server";
import { startHostedCheckout, buildCheckoutRedirectUrl } from "@/lib/sifalo/client";
import { createSupportPayment, generateSupportReference } from "@/lib/sifalo/support";
export async function POST(req: NextRequest) {
  let body: { amount?: number };
  try { body = await req.json(); } catch { return NextResponse.json({error:"Invalid request body."},{status:400}); }
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount < 1 || amount > 10000) return NextResponse.json({error:"Support amount must be between $1 and $10,000."},{status:400});
  const reference = generateSupportReference();
  await createSupportPayment({amount,method:"checkout",reference});
  const returnUrl = req.nextUrl.origin + "/support/return?ref=" + encodeURIComponent(reference);
  try {
    const session = await startHostedCheckout({amount:amount.toFixed(2),currency:"USD",return_url:returnUrl});
    return NextResponse.json({checkoutUrl:buildCheckoutRedirectUrl(session)});
  } catch (err) { return NextResponse.json({error:err instanceof Error ? err.message : "Could not start checkout."},{status:502}); }
}