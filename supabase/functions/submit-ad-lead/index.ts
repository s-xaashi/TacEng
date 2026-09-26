import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const allowedOrigins = new Set([
  "https://salmaan.de5.net",
  "https://salmaan-portfolio.vercel.app",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

function corsHeaders(origin: string | null) {
  const allowOrigin = origin && allowedOrigins.has(origin) ? origin : "https://salmaan.de5.net";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
    "Content-Type": "application/json",
  };
}

function fail(message: string, status = 400, origin: string | null = null) {
  return new Response(JSON.stringify({ error: message }), { status, headers: corsHeaders(origin) });
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(origin) });
  if (req.method !== "POST") return fail("Method not allowed", 405, origin);
  if (!(req.headers.get("content-type") ?? "").toLowerCase().includes("application/json")) {
    return fail("Content-Type must be application/json", 415, origin);
  }

  const secretKeysRaw = Deno.env.get("SUPABASE_SECRET_KEYS");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!secretKeysRaw || !supabaseUrl) return fail("Server configuration error", 500, origin);

  let secretKey: string;
  try {
    secretKey = JSON.parse(secretKeysRaw).default;
  } catch {
    return fail("Server configuration error", 500, origin);
  }
  if (!secretKey) return fail("Server configuration error", 500, origin);

  const admin = createClient(supabaseUrl, secretKey, { auth: { autoRefreshToken: false, persistSession: false } });

  let body: { campaignId?: unknown; visitorId?: unknown; locale?: unknown; data?: unknown; website?: unknown };
  try { body = await req.json(); } catch { return fail("Invalid JSON body", 400, origin); }
  if (body.website) return fail("Invalid submission", 400, origin);

  const campaignId = typeof body.campaignId === "string" ? body.campaignId.trim() : "";
  const visitorId = typeof body.visitorId === "string" ? body.visitorId.trim() : "";
  const locale = body.locale === "so" ? "so" : body.locale === "en" ? "en" : "";
  const data = body.data;

  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuid.test(campaignId) || !uuid.test(visitorId) || !locale || typeof data !== "object" || data === null || Array.isArray(data)) {
    return fail("Invalid form submission", 400, origin);
  }

  const { data: campaign, error: campaignError } = await admin.from("ad_campaigns")
    .select("id, ad_type, status, start_at, end_at").eq("id", campaignId).maybeSingle();
  if (campaignError) return fail("Could not validate the form", 500, origin);
  if (!campaign || campaign.ad_type !== "form" || campaign.status !== "active") return fail("This form is no longer accepting submissions", 410, origin);

  const now = Date.now();
  if (campaign.start_at && new Date(campaign.start_at).getTime() > now) return fail("This form is not active yet", 410, origin);
  if (campaign.end_at && new Date(campaign.end_at).getTime() < now) return fail("This form has expired", 410, origin);

  const { data: fields, error: fieldsError } = await admin.from("ad_form_fields")
    .select("field_key, field_type, required, options_en, options_so").eq("campaign_id", campaignId).order("sort_order");
  if (fieldsError || !fields?.length) return fail("This form is not configured correctly", 500, origin);

  const values = data as Record<string, unknown>;
  if (fields.length > 20 || Object.keys(values).length > fields.length) return fail("Too many form fields", 400, origin);

  const allowedKeys = new Set(fields.map((field) => field.field_key));
  for (const key of Object.keys(values)) if (!allowedKeys.has(key)) return fail("Unknown form field", 400, origin);

  for (const field of fields) {
    const value = values[field.field_key];
    if (field.required && (value === undefined || value === null || (typeof value === "string" && value.trim() === ""))) {
      return fail("Please complete all required fields", 400, origin);
    }
    if (value === undefined || value === null) continue;

    if (["text", "email", "phone", "textarea", "select"].includes(field.field_type)) {
      if (typeof value !== "string") return fail("Invalid field value", 400, origin);
      const text = value.trim();
      if (text.length > (field.field_type === "textarea" ? 3000 : 500)) return fail("A field is too long", 400, origin);
      if (field.field_type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(text)) return fail("Invalid email address", 400, origin);
      if (field.field_type === "phone" && !/^[0-9+() .-]{5,30}$/.test(text)) return fail("Invalid phone number", 400, origin);
      if (field.field_type === "select") {
        const options = [...(field.options_en ?? []), ...(field.options_so ?? [])];
        if (!options.includes(text)) return fail("Invalid option", 400, origin);
      }
    } else if (field.field_type === "number") {
      if (!((typeof value === "number" && Number.isFinite(value)) || (typeof value === "string" && /^-?[0-9]+(\.[0-9]+)?$/.test(value.trim())))) return fail("Invalid number", 400, origin);
      if (String(value).length > 40) return fail("Number is too long", 400, origin);
    } else if (field.field_type === "checkbox") {
      if (typeof value !== "boolean") return fail("Invalid checkbox value", 400, origin);
    }
  }

  const { count, error: rateError } = await admin.from("ad_submissions")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campaignId).eq("visitor_id", visitorId)
    .gt("submitted_at", new Date(Date.now() - 60 * 60 * 1000).toISOString());
  if (rateError) return fail("Could not process the submission", 500, origin);
  if ((count ?? 0) >= 5) return fail("Too many submissions. Please try again later", 429, origin);

  const cleanData = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, typeof value === "string" ? value.trim() : value]));
  const { data: submission, error: insertError } = await admin.from("ad_submissions")
    .insert({ campaign_id: campaignId, visitor_id: visitorId, locale, data: cleanData }).select("id").single();
  if (insertError || !submission) return fail("Could not save your submission", 500, origin);

  await admin.from("ad_events").insert({ campaign_id: campaignId, event_type: "form_submit", visitor_id: visitorId });
  return new Response(JSON.stringify({ ok: true, id: submission.id }), { status: 200, headers: corsHeaders(origin) });
});