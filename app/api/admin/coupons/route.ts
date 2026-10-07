import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CouponInput = {
  code?: string;
  discountType?: "full" | "percentage";
  discountPercent?: number | string | null;
  active?: boolean;
  appliesToAll?: boolean;
  documentIds?: string[];
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

  let discountPercent: number | null = null;
  if (discountType === "percentage") {
    const parsedPercent = Number(input.discountPercent);
    if (!Number.isFinite(parsedPercent) || parsedPercent <= 0 || parsedPercent > 100) {
      throw new Error("Percentage must be greater than 0 and no more than 100.");
    }
    discountPercent = parsedPercent;
  }

  const appliesToAll = input.appliesToAll === true;
  const documentIds = Array.from(new Set((input.documentIds ?? []).filter(id => typeof id === "string" && id.trim())));

  if (!appliesToAll && documentIds.length === 0) {
    throw new Error("Select at least one product, or choose all products.");
  }

  const startsAt = parseDate(input.startsAt);
  const expiresAt = parseDate(input.expiresAt);
  if (startsAt && expiresAt && new Date(expiresAt) <= new Date(startsAt)) {
    throw new Error("Expiration must be after the start date.");
  }

  return {
    row: {
      code,
      discount_type: discountType,
      discount_percent: discountPercent,
      active: input.active !== false,
      applies_to_all: appliesToAll,
      starts_at: startsAt,
      expires_at: expiresAt,
    },
    documentIds: appliesToAll ? [] : documentIds,
  };
}

async function validateDocumentIds(admin: ReturnType<typeof getSupabaseAdmin>, documentIds: string[]) {
  if (documentIds.length === 0) return;
  const { data, error } = await admin.from("documents").select("id").in("id", documentIds);
  if (error) throw error;
  const found = new Set((data ?? []).map(row => row.id));
  if (found.size !== documentIds.length) throw new Error("One or more selected products no longer exist.");
}

async function replaceAssignments(admin: ReturnType<typeof getSupabaseAdmin>, couponId: string, documentIds: string[]) {
  const { error: deleteError } = await admin.from("document_coupon_documents").delete().eq("coupon_id", couponId);
  if (deleteError) throw deleteError;

  if (documentIds.length === 0) return;
  const { error: insertError } = await admin.from("document_coupon_documents").insert(
    documentIds.map(documentId => ({ coupon_id: couponId, document_id: documentId })),
  );
  if (insertError) throw insertError;
}

async function withAssignments(admin: ReturnType<typeof getSupabaseAdmin>, coupons: any[]) {
  if (coupons.length === 0) return [];
  const ids = coupons.map(coupon => coupon.id);
  const { data: links, error } = await admin
    .from("document_coupon_documents")
    .select("coupon_id, document_id")
    .in("coupon_id", ids);
  if (error) throw error;

  const byCoupon = new Map<string, string[]>();
  for (const link of links ?? []) {
    const current = byCoupon.get(link.coupon_id) ?? [];
    current.push(link.document_id);
    byCoupon.set(link.coupon_id, current);
  }

  return coupons.map(coupon => ({
    ...coupon,
    document_ids: byCoupon.get(coupon.id) ?? [],
  }));
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { data, error } = await admin
    .from("document_coupons")
    .select("id, code, discount_type, discount_percent, active, applies_to_all, starts_at, expires_at, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: "Could not load coupons." }, { status: 500 });

  try {
    return NextResponse.json(
      { coupons: await withAssignments(admin, data ?? []) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json({ error: "Could not load coupon products." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  let body: CouponInput;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }

  try {
    const { row, documentIds } = parseCoupon(body);
    await validateDocumentIds(admin, documentIds);

    const { data, error } = await admin
      .from("document_coupons")
      .insert(row)
      .select("id, code, discount_type, discount_percent, active, applies_to_all, starts_at, expires_at, created_at, updated_at")
      .single();

    if (error) {
      if (error.code === "23505") return NextResponse.json({ error: "That coupon code already exists." }, { status: 409 });
      throw error;
    }

    try {
      await replaceAssignments(admin, data.id, documentIds);
    } catch (assignmentError) {
      await admin.from("document_coupons").delete().eq("id", data.id);
      throw assignmentError;
    }

    return NextResponse.json({ coupon: { ...data, document_ids: documentIds } }, { status: 201 });
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
    const { row, documentIds } = parseCoupon(body);
    await validateDocumentIds(admin, documentIds);

    const { data, error } = await admin
      .from("document_coupons")
      .update(row)
      .eq("id", body.id)
      .select("id, code, discount_type, discount_percent, active, applies_to_all, starts_at, expires_at, created_at, updated_at")
      .single();

    if (error) throw error;
    await replaceAssignments(admin, body.id, documentIds);

    return NextResponse.json({ coupon: { ...data, document_ids: documentIds } });
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
