import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const ADMIN_EMAIL = "salmaanmukhtaarxaashi@gmail.com";
const RESET_URL = "https://salmaan-portfolio.vercel.app/admin/reset-password";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) return null;

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

export async function POST(request: Request) {
  let email = "";

  try {
    const body = await request.json();
    email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  } catch {
    email = "";
  }

  // Always return the same generic response for unknown addresses.
  // The actual authorization check happens only on the server.
  const genericResponse = NextResponse.json({ ok: true });

  if (email !== ADMIN_EMAIL) return genericResponse;

  const supabase = getAdminClient();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "Password reset is temporarily unavailable." },
      { status: 503 }
    );
  }

  // The public.admins table is the authorization source of truth.
  // We also verify that the admin row points to the exact Auth user
  // whose email is the one allowed above.
  const { data: adminRows, error: adminError } = await supabase
    .from("admins")
    .select("user_id");

  if (adminError || !adminRows || adminRows.length !== 1) {
    return NextResponse.json(
      { ok: false, error: "Password reset is temporarily unavailable." },
      { status: 503 }
    );
  }

  const adminUserId = adminRows[0].user_id;
  const { data: userData, error: userError } =
    await supabase.auth.admin.getUserById(adminUserId);

  if (
    userError ||
    !userData.user ||
    userData.user.id !== adminUserId ||
    (userData.user.email || "").trim().toLowerCase() !== ADMIN_EMAIL
  ) {
    return NextResponse.json(
      { ok: false, error: "Password reset is temporarily unavailable." },
      { status: 503 }
    );
  }

  // This is executed server-side with the secret key, so a browser cannot
  // ask Supabase to send reset emails to arbitrary addresses.
  const { error: resetError } = await supabase.auth.resetPasswordForEmail(
    ADMIN_EMAIL,
    { redirectTo: RESET_URL }
  );

  if (resetError) {
    return NextResponse.json(
      { ok: false, error: "Password reset is temporarily unavailable." },
      { status: 503 }
    );
  }

  return genericResponse;
}
