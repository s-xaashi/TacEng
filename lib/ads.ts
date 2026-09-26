export type AdType = "announcement" | "action" | "form";
export type AdStatus = "draft" | "active" | "paused" | "archived";
export type AdActionType = "coupon" | "redirect";

export type AdCampaign = {
  id: string;
  name: string;
  ad_type: AdType;
  status: AdStatus;
  priority: number;
  start_at: string | null;
  end_at: string | null;
  title_en: string;
  title_so: string | null;
  description_en: string | null;
  description_so: string | null;
  highlights_en: string[];
  highlights_so: string[];
  image_path: string | null;
  cta_en: string | null;
  cta_so: string | null;
  action_type: AdActionType | null;
  redirect_url: string | null;
  coupon_code: string | null;
  coupon_title_en: string | null;
  coupon_title_so: string | null;
  coupon_description_en: string | null;
  coupon_description_so: string | null;
  coupon_highlights_en: string[];
  coupon_highlights_so: string[];
  coupon_image_path: string | null;
  created_at: string;
  updated_at: string;
};

export type AdFormField = {
  id?: string;
  campaign_id?: string;
  field_key: string;
  label_en: string;
  label_so: string;
  field_type: "text" | "email" | "phone" | "number" | "textarea" | "select" | "checkbox";
  placeholder_en: string;
  placeholder_so: string;
  options_en: string[];
  options_so: string[];
  required: boolean;
  sort_order: number;
};

export type AdSubmission = {
  id: string;
  campaign_id: string;
  visitor_id: string;
  locale: "en" | "so";
  data: Record<string, unknown>;
  submitted_at: string;
};

export type AdEvent = {
  id: number;
  campaign_id: string;
  event_type: "impression" | "interested" | "not_interested" | "action" | "coupon_copy" | "form_submit";
  visitor_id: string | null;
  created_at: string;
};

export function localized(en: string | null | undefined, so: string | null | undefined, locale: "en" | "so") {
  if (locale === "so") return so?.trim() || en?.trim() || "";
  return en?.trim() || so?.trim() || "";
}

export function localizedList(en: string[] | null | undefined, so: string[] | null | undefined, locale: "en" | "so") {
  const preferred = locale === "so" ? so : en;
  const fallback = locale === "so" ? en : so;
  return (preferred?.length ? preferred : fallback ?? []).filter(Boolean);
}

export function safeExternalUrl(value: string | null | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function visitorId() {
  const key = "marketplace_ad_visitor_id";
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;
  const id = crypto.randomUUID();
  window.localStorage.setItem(key, id);
  return id;
}

export function csvCell(value: unknown) {
  const text = value == null ? "" : typeof value === "object" ? JSON.stringify(value) : String(value);
  const formulaSafe = /^[=+\-@]/.test(text) ? "'" + text : text;
  return '"' + formulaSafe.replaceAll('"', '""') + '"';
}
