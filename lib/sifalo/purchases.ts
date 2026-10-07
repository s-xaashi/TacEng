import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { SifaloVerifyResult } from "./client";
import { isVerifiedPaid } from "./client";

export type PurchaseRow = {
  id: string;
  document_id: string;
  variant_id?: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  amount: number;
  currency: string;
  payment_method: string;
  provider: string;
  provider_transaction_id: string | null;
  payment_reference: string | null;
  coupon_id?: string | null;
  coupon_code?: string | null;
  original_amount?: number | null;
  discount_amount?: number | null;
  status: "pending" | "paid" | "failed" | "cancelled" | "expired";
  created_at: string;
  paid_at: string | null;
};

export async function getPurchasableDocument(documentId: string, variantId?: string | null) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("documents")
    .select("id, title, price, is_free, published, file_path")
    .eq("id", documentId)
    .maybeSingle();

  if (error || !data || !data.published) return null;

  if (variantId) {
    const { data: variant, error: variantError } = await supabase
      .from("document_variants")
      .select("id, label, price, enabled, document_id")
      .eq("id", variantId)
      .eq("document_id", documentId)
      .maybeSingle();

    if (variantError || !variant || !variant.enabled) return null;

    const price = Number(variant.price);
    if (price <= 0) return null;

    return { ...data, price, variant_id: variant.id, variant_label: variant.label };
  }

  if (data.is_free) return null;
  return { ...data, variant_id: null, variant_label: null };
}

export function generatePaymentReference(): string {
  return `SP-${crypto.randomUUID()}`;
}

export async function createPendingPurchase(params: {
  documentId: string;
  variantId?: string | null;
  amount: number;
  currency: string;
  paymentMethod: string;
  paymentReference: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  couponId?: string | null;
  couponCode?: string | null;
  originalAmount?: number | null;
  discountAmount?: number | null;
}): Promise<PurchaseRow> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("purchases")
    .insert({
      document_id: params.documentId,
      variant_id: params.variantId ?? null,
      amount: params.amount,
      currency: params.currency,
      payment_method: params.paymentMethod,
      payment_reference: params.paymentReference,
      customer_email: params.customerEmail ?? null,
      customer_phone: params.customerPhone ?? null,
      coupon_id: params.couponId ?? null,
      coupon_code: params.couponCode ?? null,
      original_amount: params.originalAmount ?? null,
      discount_amount: params.discountAmount ?? null,
      status: "pending",
    })
    .select()
    .single();

  if (error || !data) throw new Error(`Failed to create purchase: ${error?.message}`);
  return data as PurchaseRow;
}

export async function createCouponPurchase(params: {
  documentId: string;
  variantId?: string | null;
  couponId: string;
  couponCode: string;
  originalAmount: number;
  discountAmount: number;
  customerEmail?: string | null;
}): Promise<PurchaseRow> {
  const paymentReference = generatePaymentReference();
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("purchases")
    .insert({
      document_id: params.documentId,
      variant_id: params.variantId ?? null,
      amount: 0,
      currency: "USD",
      payment_method: "coupon",
      payment_reference: paymentReference,
      customer_email: params.customerEmail ?? null,
      coupon_id: params.couponId,
      coupon_code: params.couponCode,
      original_amount: params.originalAmount,
      discount_amount: params.discountAmount,
      status: "paid",
      paid_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error || !data) throw new Error(`Failed to create coupon purchase: ${error?.message}`);
  return data as PurchaseRow;
}

export async function getPurchaseByReference(paymentReference: string): Promise<PurchaseRow | null> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase.from("purchases").select("*").eq("payment_reference", paymentReference).maybeSingle();
  return (data as PurchaseRow) ?? null;
}

export async function getPurchaseById(id: string): Promise<PurchaseRow | null> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase.from("purchases").select("*").eq("id", id).maybeSingle();
  return (data as PurchaseRow) ?? null;
}

export async function applyVerifyResult(purchase: PurchaseRow, verify: SifaloVerifyResult): Promise<PurchaseRow> {
  if (purchase.status === "paid") return purchase;

  const supabase = getSupabaseAdmin();
  const amountMatches =
    verify.amount === undefined ||
    Math.abs(Number(verify.amount) - Number(purchase.amount)) < 0.01;
  const currencyMatches =
    verify.currency === undefined || verify.currency === purchase.currency;

  let nextStatus: PurchaseRow["status"];
  if (isVerifiedPaid(verify) && amountMatches && currencyMatches) nextStatus = "paid";
  else if (verify.status === "pending") nextStatus = "pending";
  else nextStatus = "failed";

  const { data, error } = await supabase
    .from("purchases")
    .update({
      status: nextStatus,
      provider_transaction_id: verify.sid ?? purchase.provider_transaction_id,
      paid_at: nextStatus === "paid" ? new Date().toISOString() : purchase.paid_at,
    })
    .eq("id", purchase.id)
    .select()
    .single();

  if (error || !data) throw new Error(`Failed to update purchase: ${error?.message}`);
  return data as PurchaseRow;
}
