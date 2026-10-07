import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CouponInput = {
  code?: string;
  discountType?: "full" | "percentage";
  discountPercent?: number | string | null;
  active?: boolean;
  startsAt?: string | null;
  expiresAt?: string | null;
};

async function requireAdmin(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;

  const admin = getSupabaseAdmin();
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) return null;

  const { data } = await admin.from("admins").select("user_id").eq("user_id", user.id).maybeSingle();
  return data ? admin : null;
}

function cleanCode(value: string) {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toUpperCase();
}

function parseDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Invalid date.");
  return date.toISOString();
}

function parseCoupon(input: CouponInput) {
  const code = cleanCode(input.code ?? "");
  if (!code || code.length > 80) throw new Error("Coupon code must be 1–80 characters.");

  const discountType = input.discountType;
  if (discountType !== "full" && discountType !== "percentage") {
    throw new Error("Choose a valid discount type.");
  }

  const discountPercent = discountType === "percentage" ? Number(input.discountPercent) : null;
  if (discountType === "percentage" && (!Number.isFinite(discountPercent!) || discountPercent! <= 0 || discountPercent! > 100)) {
    throw new Error("Percentage must be greater than 0 and no more than 100.");
  }

  const startsAt = parseDate(input.startsAt);
  const expiresAt = parseDate(input.expiresAt);
  if (startsAt && expiresAt && new Date(expiresAt) <= new Date(startsAt)) {
    throw new Error("Expiration must be after the start date.");
  }

  return {
    code,
    discount_type: discountType,
    discount_percent: discountPercent,
    active: input.active !== false,
    starts_at: startsAt,
    expires_at: expiresAt,
  };
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { data, error } = await admin
    .from("document_coupons")
    .select("id, code, discount_type, discount_percent, active, starts_at, expires_at, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: "Could not load coupons." }, { status: 500 });
  return NextResponse.json({ coupons: data ?? [] }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  let body: CouponInput;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }

  try {
    const row = parseCoupon(body);
    const { data, error } = await admin.from("document_coupons").insert(row).select("id, code, discount_type, discount_percent, active, starts_at, expires_at, created_at, updated_at").single();
    if (error) {
      if (error.code === "23505") return NextResponse.json({ error: "That coupon code already exists." }, { status: 409 });
      throw error;
    }
    return NextResponse.json({ coupon: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create coupon." }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  let body: CouponInput & { id?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }
  if (!body.id) return NextResponse.json({ error: "Coupon id is required." }, { status: 400 });

  try {
    const row = parseCoupon(body);
    const { data, error } = await admin.from("document_coupons").update(row).eq("id", body.id).select("id, code, discount_type, discount_percent, active, starts_at, expires_at, created_at, updated_at").single();
    if (error) throw error;
    return NextResponse.json({ coupon: data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update coupon." }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Coupon id is required." }, { status: 400 });

  const { error } = await admin.from("document_coupons").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "Could not delete coupon." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
