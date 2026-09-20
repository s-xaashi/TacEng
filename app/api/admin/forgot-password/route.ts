import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const RESET_URL = "https://salmaan-portfolio.vercel.app/admin/reset-password";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

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

function getClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  return (forwarded?.split(",")[0] || request.headers.get("x-real-ip") || "unknown").trim();
}

function genericResponse() {
  return NextResponse.json({
    ok: true,
    message:
      "If this email belongs to a current admin account, a secure reset link has been sent to it.",
  });
}

export async function POST(request: Request) {
  // Accept the production site and Vercel preview deployments that are
  // serving this exact API request. The previous check only allowed the
  // production origin, which incorrectly rejected legitimate preview URLs.
  const origin = request.headers.get("origin");
  if (origin) {
    let requestOrigin = "";
    try {
      requestOrigin = new URL(request.url).origin;
    } catch {
      return NextResponse.json(
        { ok: false, error: "Invalid request." },
        { status: 400 }
      );
    }

    if (
      origin !== "https://salmaan-portfolio.vercel.app" &&
      origin !== requestOrigin
    ) {
      return NextResponse.json(
        { ok: false, error: "Invalid request origin." },
        { status: 403 }
      );
    }
  }
  const contentLength = Number(request.headers.get("content-length") || "0");
  if (contentLength > 4096) {
    return NextResponse.json({ ok: false, error: "Request is too large." }, { status: 413 });
  }

  let email = "";
  try {
    const body = await request.json();
    email =
      typeof body?.email === "string"
        ? body.email.normalize("NFKC").trim().toLowerCase()
        : "";
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  // Strict shape/length checks happen before any database/Auth work.
  if (email.length < 6 || email.length > 254 || !EMAIL_RE.test(email)) {
    return NextResponse.json(
      { ok: false, error: "Enter a valid email address." },
      { status: 400 }
    );
  }

  const supabase = getAdminClient();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "Password reset is temporarily unavailable." },
      { status: 503 }
    );
  }

  const ip = getClientIp(request);
  const ipKey = createHash("sha256").update("ip:" + ip).digest("hex");
  const emailKey = createHash("sha256").update("email:" + email).digest("hex");

  // Two independent progressive limits: per IP and per email.
  // Three requests are allowed in each cycle. The first lockout is 5 seconds,
  // then 10s, 20s, 40s, etc., capped server-side. Row locking makes this
  // safe against concurrent requests.
  const [ipLimit, emailLimit] = await Promise.all([
    supabase.rpc("consume_admin_reset_rate_limit", {
      p_key: ipKey,
      p_max_requests: 3,
      p_base_cooldown_seconds: 5,
      p_max_cooldown_seconds: 3600,
    }),
    supabase.rpc("consume_admin_reset_rate_limit", {
      p_key: emailKey,
      p_max_requests: 3,
      p_base_cooldown_seconds: 5,
      p_max_cooldown_seconds: 3600,
    }),
  ]);

  if (ipLimit.error || emailLimit.error) {
    return NextResponse.json(
      { ok: false, error: "Password reset is temporarily unavailable." },
      { status: 503 }
    );
  }

  const ipBlocked = ipLimit.data && !ipLimit.data.allowed;
  const emailBlocked = emailLimit.data && !emailLimit.data.allowed;

  if (ipBlocked || emailBlocked) {
    const retryAfter = Math.max(
      Number(ipLimit.data?.retry_after_seconds || 0),
      Number(emailLimit.data?.retry_after_seconds || 0),
      1
    );

    // This does not reveal whether the email is an admin; it only tells the
    // requester that the reset endpoint itself is temporarily throttled.
    return NextResponse.json(
      {
        ok: false,
        error: "Too many reset attempts. Please wait before trying again.",
        retryAfter,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
          "Cache-Control": "no-store",
        },
      }
    );
  }

  // Authorization source of truth: public.admins. The browser never gets
  // direct access to auth.users. We resolve each authorized user server-side
  // and compare its verified Auth email.
  const { data: adminRows, error: adminError } = await supabase
    .from("admins")
    .select("user_id");

  if (adminError || !adminRows) {
    return NextResponse.json(
      { ok: false, error: "Password reset is temporarily unavailable." },
      { status: 503 }
    );
  }

  let matchingUserId: string | null = null;

  for (const row of adminRows) {
    if (!row.user_id) continue;

    const { data: userData, error: userError } =
      await supabase.auth.admin.getUserById(row.user_id);

    if (userError || !userData.user) continue;

    const authEmail = (userData.user.email || "").trim().toLowerCase();
    if (authEmail === email) {
      matchingUserId = userData.user.id;
      break;
    }
  }

  if (!matchingUserId) {
    return genericResponse();
  }

  const { error: resetError } = await supabase.auth.resetPasswordForEmail(
    email,
    { redirectTo: RESET_URL }
  );

  if (resetError) {
    return NextResponse.json(
      { ok: false, error: "Password reset is temporarily unavailable." },
      { status: 503 }
    );
  }

  return genericResponse();
}
