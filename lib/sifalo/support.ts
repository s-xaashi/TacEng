import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { SifaloVerifyResult } from "./client";
import { isVerifiedPaid } from "./client";

const NAME_MAX = 80;
const NOTE_MAX = 200;

function cleanText(value: unknown, max: number, label: string, required: boolean) {
  if (value === undefined || value === null) {
    if (required) throw new Error(label + " is required.");
    return null;
  }
  if (typeof value !== "string") throw new Error("Invalid " + label + ".");
  const text = value.normalize("NFKC").trim().replace(/\\s+/g, " ");
  if (required && !text) throw new Error(label + " is required.");
  if (!required && !text) return null;
  if (text.length > max) throw new Error(label + " is too long.");
  if (/[\\u0000-\\u001F\\u007F]/.test(text)) throw new Error("Invalid characters in " + label + ".");
  if (/<[^>]*>/.test(text)) throw new Error("HTML is not allowed in " + label + ".");
  if (/(https?:\\/\\/|www\\.|javascript:|data:)/i.test(text) || /[A-Za-z0-9_-]+\\.[A-Za-z]{2,}/.test(text)) throw new Error("Links are not allowed in " + label + ".");
  return text;
}

export function validateSupportIdentity(input: { name?: unknown; note?: unknown }) {
  return { name: cleanText(input.name, NAME_MAX, "Name", true) as string, note: cleanText(input.note, NOTE_MAX, "Note", false) };
}
export function generateSupportReference() { return "SUP-" + crypto.randomUUID(); }
export async function createSupportPayment(p: { amount: number; method: string; reference: string; account?: string; name?: unknown; note?: unknown }) {
  const identity = validateSupportIdentity({ name: p.name, note: p.note });
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("support_payments").insert({ amount:p.amount, currency:"USD", payment_method:p.method, payment_reference:p.reference, customer_phone:p.account || null, customer_name:identity.name, customer_note:identity.note, status:"pending" }).select().single();
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