import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUS_FILTERS = new Set([
  "all",
  "paid",
  "pending",
  "failed",
  "cancelled",
  "expired",
]);

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : "";

  if (!token) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const admin = getSupabaseAdmin();

  const {
    data: { user },
    error: userError,
  } = await admin.auth.getUser(token);

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { data: adminRow, error: adminError } = await admin
    .from("admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (adminError || !adminRow) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const status = new URL(request.url).searchParams.get("status") || "all";

  if (!STATUS_FILTERS.has(status)) {
    return NextResponse.json({ error: "Invalid status filter." }, { status: 400 });
  }

  const purchasesQuery = admin
    .from("purchases")
    .select(
      "id, document_id, customer_phone, amount, currency, payment_method, provider_transaction_id, payment_reference, status, created_at, paid_at, documents(title)"
    )
    .order("created_at", { ascending: false });

  const supportQuery = admin
    .from("support_payments")
    .select(
      "id, amount, currency, payment_method, payment_reference, customer_phone, provider_transaction_id, status, created_at, paid_at"
    )
    .order("created_at", { ascending: false });

  if (status !== "all") {
    purchasesQuery.eq("status", status);
    supportQuery.eq("status", status);
  }

  const [purchasesResult, supportResult] = await Promise.all([
    purchasesQuery,
    supportQuery,
  ]);

  if (purchasesResult.error || supportResult.error) {
    console.error("Failed to load admin payments", {
      purchases: purchasesResult.error?.message,
      support: supportResult.error?.message,
    });

    return NextResponse.json(
      { error: "Could not load payments." },
      { status: 500 }
    );
  }

  const purchases = (purchasesResult.data ?? []).map((purchase) => ({
    id: purchase.id,
    type: "Document Purchase" as const,
    item: purchase.documents?.[0]?.title ?? purchase.document_id,
    customer_phone: purchase.customer_phone,
    amount: Number(purchase.amount),
    currency: purchase.currency,
    payment_method: purchase.payment_method,
    provider_transaction_id: purchase.provider_transaction_id,
    payment_reference: purchase.payment_reference,
    status: purchase.status,
    created_at: purchase.created_at,
    paid_at: purchase.paid_at,
  }));

  const supportPayments = (supportResult.data ?? []).map((payment) => ({
    id: payment.id,
    type: "Support Me" as const,
    item: "Support Me",
    customer_phone: payment.customer_phone,
    amount: Number(payment.amount),
    currency: payment.currency,
    payment_method: payment.payment_method,
    provider_transaction_id: payment.provider_transaction_id,
    payment_reference: payment.payment_reference,
    status: payment.status,
    created_at: payment.created_at,
    paid_at: payment.paid_at,
  }));

  const payments = [...purchases, ...supportPayments].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return NextResponse.json(
    { payments },
    {
      headers: {
        "Cache-Control": "private, no-store",
      },
    }
  );
}
