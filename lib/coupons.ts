import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getPurchasableDocument } from "@/lib/sifalo/purchases";

export type CouponDiscountType = "full" | "percentage";

export type CouponRecord = {
  id: string;
  code: string;
  discount_type: CouponDiscountType;
  discount_percent: number | null;
  active: boolean;
  starts_at: string | null;
  expires_at: string | null;
};

export type CouponQuote = {
  coupon: CouponRecord;
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
};

export class CouponError extends Error {
  constructor(
    public readonly code:
      | "missing"
      | "invalid"
      | "inactive"
      | "not_started"
      | "expired"
      | "not_applicable"
      | "server_error",
    message: string,
  ) {
    super(message);
    this.name = "CouponError";
  }
}

function normalizeCode(value: string) {
  return value.normalize("NFKC").trim().toUpperCase();
}

function cents(value: number) {
  return Math.max(0, Math.round((Number(value) + Number.EPSILON) * 100));
}

function amountFromCents(value: number) {
  return Number((value / 100).toFixed(2));
}

export async function getCouponQuote(
  documentId: string,
  variantId: string | null | undefined,
  rawCode: string,
): Promise<CouponQuote> {
  const code = normalizeCode(rawCode);
  if (!code) throw new CouponError("missing", "Enter a coupon code.");

  const document = await getPurchasableDocument(documentId, variantId);
  if (!document) {
    throw new CouponError(
      "not_applicable",
      "Coupons can only be used with paid documents or paid levels.",
    );
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("document_coupons")
    .select("id, code, discount_type, discount_percent, active, starts_at, expires_at")
    .eq("code", code)
    .maybeSingle();

  if (error) {
    console.error("Coupon lookup failed", { code, message: error.message });
    throw new CouponError("server_error", "We couldn't validate the coupon. Please try again.");
  }

  if (!data) throw new CouponError("invalid", "Invalid coupon code.");
  if (!data.active) throw new CouponError("inactive", "This coupon is no longer active.");

  const now = Date.now();
  if (data.starts_at && new Date(data.starts_at).getTime() > now) {
    throw new CouponError("not_started", "This coupon is not available yet.");
  }
  if (data.expires_at && new Date(data.expires_at).getTime() <= now) {
    throw new CouponError("expired", "This coupon has expired.");
  }

  const coupon = data as CouponRecord;
  const originalCents = cents(document.price);
  const discountCents =
    coupon.discount_type === "full"
      ? originalCents
      : Math.min(
          originalCents,
          Math.round(originalCents * (Number(coupon.discount_percent) / 100)),
        );
  const finalCents = Math.max(0, originalCents - discountCents);

  return {
    coupon,
    originalAmount: amountFromCents(originalCents),
    discountAmount: amountFromCents(discountCents),
    finalAmount: amountFromCents(finalCents),
  };
}

export function couponErrorStatus(error: CouponError) {
  switch (error.code) {
    case "missing":
    case "invalid":
    case "inactive":
    case "not_started":
    case "expired":
    case "not_applicable":
      return 400;
    default:
      return 500;
  }
}
