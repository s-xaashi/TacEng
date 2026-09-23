import { NextRequest, NextResponse } from "next/server";
import { chargeWallet, type WalletGateway } from "@/lib/sifalo/client";
import { createSupportPayment, generateSupportReference, applySupportVerify } from "@/lib/sifalo/support";
const ALLOWED: WalletGateway[] = ["waafi","edahab","pbwallet"];
export async function POST(req: NextRequest) {
  let body: {amount?:number; gateway?:string; account?:string; name?:unknown; note?:unknown};
  try { body = await req.json(); } catch { return NextResponse.json({error:"Invalid request body."},{status:400}); }
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount < 1 || amount > 10000) return NextResponse.json({error:"Support amount must be between $1 and $10,000."},{status:400});
  if (!body.gateway || !ALLOWED.includes(body.gateway as WalletGateway)) return NextResponse.json({error:"Unsupported wallet."},{status:400});
  if (!body.account?.trim()) return NextResponse.json({error:"Phone / account number is required."},{status:400});
  try {
    const identity = validateSupportIdentity({ name: body.name, note: body.note });
    const reference = generateSupportReference();
    const payment = await createSupportPayment({amount,method:body.gateway,reference,account:body.account.trim(),name:identity.name,note:identity.note});
  try {
    const result = await chargeWallet({account:body.account.trim(),gateway:body.gateway as WalletGateway,amount:amount.toFixed(2),currency:"USD",order_id:reference});
    const updated = await applySupportVerify(payment.id,{sid:result.sid || "",status:result.code==="601"?"success":result.code==="603"?"pending":"failed",code:result.code,amount:amount.toFixed(2),currency:"USD"});
    return NextResponse.json({status:updated.status,reference});
  } catch (err) { return NextResponse.json({error:err instanceof Error ? err.message : "Payment could not be processed."},{status:400}); }
  }
}