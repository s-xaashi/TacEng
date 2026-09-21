import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { SifaloVerifyResult } from "./client";
import { isVerifiedPaid } from "./client";
export function generateSupportReference() { return "SUP-" + crypto.randomUUID(); }
export async function createSupportPayment(p: { amount: number; method: string; reference: string; account?: string }) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("support_payments").insert({ amount:p.amount, currency:"USD", payment_method:p.method, payment_reference:p.reference, customer_phone:p.account || null, status:"pending" }).select().single();
  if (error || !data) throw new Error("Failed to create support payment: " + (error?.message || ""));
  return data;
}
export async function applySupportVerify(id: string, verify: SifaloVerifyResult) {
  const supabase = getSupabaseAdmin();
  const { data: current } = await supabase.from("support_payments").select("*").eq("id",id).maybeSingle();
  if (!current) throw new Error("Support payment not found.");
  if (current.status === "paid") return current;
  const amountMatches = verify.amount === undefined || Math.abs(Number(verify.amount)-Number(current.amount)) < 0.01;
  const currencyMatches = verify.currency === undefined || verify.currency === current.currency;
  const status = isVerifiedPaid(verify) && amountMatches && currencyMatches ? "paid" : verify.status === "pending" ? "pending" : "failed";
  const { data, error } = await supabase.from("support_payments").update({ status, provider_transaction_id:verify.sid || current.provider_transaction_id, paid_at:status === "paid" ? new Date().toISOString() : current.paid_at }).eq("id",id).select().single();
  if (error || !data) throw new Error("Failed to update support payment: " + (error?.message || ""));
  return data;
}