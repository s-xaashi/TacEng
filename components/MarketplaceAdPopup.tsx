"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { getThumbnailUrl } from "@/lib/supabase/storage";
import { useLanguage } from "@/components/LanguageProvider";
import type { AdCampaign, AdFormField } from "@/lib/ads";
import { localized, localizedList, safeExternalUrl, visitorId } from "@/lib/ads";

const DISMISS_DAYS = 30;
const SEEN_DAYS = 1;

function remember(key: string, days: number) {
  window.localStorage.setItem(key, String(Date.now() + days * 86400000));
}
function remembered(key: string) {
  const value = Number(window.localStorage.getItem(key) || 0);
  if (!value) return false;
  if (value < Date.now()) {
    window.localStorage.removeItem(key);
    return false;
  }
  return true;
}

export default function MarketplaceAdPopup() {
  const { locale } = useLanguage();
  const [campaign, setCampaign] = useState<AdCampaign | null>(null);
  const [formFields, setFormFields] = useState<AdFormField[]>([]);
  const [view, setView] = useState<"ad" | "action">("ad");
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [loadingForm, setLoadingForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);

  const imageUrl = useMemo(() => getThumbnailUrl(campaign?.image_path ?? null), [campaign?.image_path]);
  const couponImageUrl = useMemo(() => getThumbnailUrl(campaign?.coupon_image_path ?? null), [campaign?.coupon_image_path]);
  const title = localized(campaign?.title_en, campaign?.title_so, locale);
  const description = localized(campaign?.description_en, campaign?.description_so, locale);
  const highlights = localizedList(campaign?.highlights_en, campaign?.highlights_so, locale);

  useEffect(() => {
    let cancelled = false;
    const client = getSupabaseClient();
    if (!client) return;

    async function load() {
      const { data } = await client
        .from("ad_campaigns")
        .select("*")
        .eq("status", "active")
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(10);

      if (cancelled) return;
      const now = Date.now();
      const eligible = ((data ?? []) as AdCampaign[]).find((item) => {
        const startOk = !item.start_at || new Date(item.start_at).getTime() <= now;
        const endOk = !item.end_at || new Date(item.end_at).getTime() >= now;
        return startOk && endOk && !remembered("marketplace_ad_dismissed_" + item.id) && !remembered("marketplace_ad_seen_" + item.id);
      });

      if (eligible) {
        setCampaign(eligible);
        remember("marketplace_ad_seen_" + eligible.id, SEEN_DAYS);
        const id = visitorId();
        void client.from("ad_events").insert({ campaign_id: eligible.id, event_type: "impression", visitor_id: id });
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  if (!campaign) return null;

  function close() {
    remember("marketplace_ad_dismissed_" + campaign.id, DISMISS_DAYS);
    setCampaign(null);
  }

  async function interested() {
    const client = getSupabaseClient();
    if (client) void client.from("ad_events").insert({ campaign_id: campaign.id, event_type: "interested", visitor_id: visitorId() });

    if (campaign.ad_type === "announcement") {
      close();
      return;
    }

    if (campaign.ad_type === "form") {
      setView("action");
      const client = getSupabaseClient();
      if (!client) return;
      setLoadingForm(true);
      const { data } = await client
        .from("ad_form_fields")
        .select("*")
        .eq("campaign_id", campaign.id)
        .order("sort_order");
      setFormFields((data ?? []) as AdFormField[]);
      setLoadingForm(false);
      return;
    }

    if (campaign.action_type === "coupon") {
      setView("action");
      return;
    }

    const url = safeExternalUrl(campaign.redirect_url);
    if (url) {
      if (client) void client.from("ad_events").insert({ campaign_id: campaign.id, event_type: "action", visitor_id: visitorId() });
      window.open(url, "_blank", "noopener,noreferrer");
      close();
    }
  }

  function notInterested() {
    const client = getSupabaseClient();
    if (client) void client.from("ad_events").insert({ campaign_id: campaign.id, event_type: "not_interested", visitor_id: visitorId() });
    close();
  }

  async function copyCoupon() {
    if (!campaign.coupon_code) return;
    await navigator.clipboard.writeText(campaign.coupon_code);
    setCopied(true);
    const client = getSupabaseClient();
    if (client) void client.from("ad_events").insert({ campaign_id: campaign.id, event_type: "coupon_copy", visitor_id: visitorId() });
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function submitForm(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const functionUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/submit-ad-lead` : null;
      if (!functionUrl) throw new Error("Marketplace is not configured.");
      const response = await fetch(functionUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId: campaign.id,
          visitorId: visitorId(),
          locale,
          data: formData,
          website: "",
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error || "Could not submit the form.");
      setSubmitted(true);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Could not submit the form.");
    } finally {
      setSubmitting(false);
    }
  }

  const actionTitle = localized(campaign.coupon_title_en, campaign.coupon_title_so, locale);
  const actionDescription = localized(campaign.coupon_description_en, campaign.coupon_description_so, locale);
  const actionHighlights = localizedList(campaign.coupon_highlights_en, campaign.coupon_highlights_so, locale);
  const actionCta = localized(campaign.cta_en, campaign.cta_so, locale) || (locale === "so" ? "Waan xiiseynayaa" : "I'm Interested");

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={title}>
      <div className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-white/15 bg-[#170607] p-5 text-white shadow-2xl sm:p-7">
        <button type="button" onClick={close} aria-label={locale === "so" ? "Xir" : "Close"} className="focus-ring absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/20 text-lg text-white/80 hover:text-white">×</button>

        {view === "ad" ? (
          <>
            {imageUrl && <img src={imageUrl} alt="" className="mb-5 max-h-72 w-full rounded-2xl object-cover" />}
            <p className="text-[10px] uppercase tracking-[.22em] text-[#d8e06b]">Featured</p>
            <h2 className="mt-2 font-display text-3xl">{title}</h2>
            {description && <p className="mt-3 whitespace-pre-line text-sm leading-6 text-white/65">{description}</p>}
            {highlights.length > 0 && <ul className="mt-4 space-y-2 text-sm text-white/75">{highlights.map((item, i) => <li key={i}>• {item}</li>)}</ul>}
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={interested} className="focus-ring rounded-full bg-[#e45560] px-5 py-3 text-sm font-semibold text-white">{actionCta}</button>
              <button type="button" onClick={notInterested} className="focus-ring rounded-full border border-white/15 px-5 py-3 text-sm text-white/70 hover:text-white">{locale === "so" ? "Ma xiiseynayo" : "Not interested"}</button>
            </div>
          </>
        ) : campaign.ad_type === "action" && campaign.action_type === "coupon" ? (
          <>
            {couponImageUrl && <img src={couponImageUrl} alt="" className="mb-5 max-h-64 w-full rounded-2xl object-cover" />}
            <p className="text-[10px] uppercase tracking-[.22em] text-[#d8e06b]">{locale === "so" ? "Coupon" : "Coupon"}</p>
            <h2 className="mt-2 font-display text-2xl">{actionTitle || title}</h2>
            {actionDescription && <p className="mt-3 whitespace-pre-line text-sm leading-6 text-white/65">{actionDescription}</p>}
            {actionHighlights.length > 0 && <ul className="mt-4 space-y-2 text-sm text-white/75">{actionHighlights.map((item, i) => <li key={i}>• {item}</li>)}</ul>}
            <div className="mt-6 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[.04] p-4">
              <code className="break-all text-lg font-semibold tracking-[.12em] text-[#d8e06b]">{campaign.coupon_code}</code>
              <button type="button" onClick={copyCoupon} className="focus-ring shrink-0 rounded-full bg-white px-4 py-2 text-xs font-semibold text-[#170607]">{copied ? (locale === "so" ? "La koobiyey" : "Copied") : (locale === "so" ? "Koobi" : "Copy coupon")}</button>
            </div>
            <a
              href={safeExternalUrl(campaign.redirect_url) ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                const url = safeExternalUrl(campaign.redirect_url);
                if (!url) { e.preventDefault(); return; }
                const client = getSupabaseClient();
                if (client) void client.from("ad_events").insert({ campaign_id: campaign.id, event_type: "action", visitor_id: visitorId() });
              }}
              className="focus-ring mt-4 block rounded-full bg-[#e45560] px-5 py-3 text-center text-sm font-semibold text-white"
            >
              {actionCta || (locale === "so" ? "Sii wad" : "Continue")}
            </a>
          </>
        ) : (
          <>
            <p className="text-[10px] uppercase tracking-[.22em] text-[#d8e06b]">{locale === "so" ? "Foom" : "Form"}</p>
            <h2 className="mt-2 font-display text-2xl">{title}</h2>
            {description && <p className="mt-3 text-sm leading-6 text-white/65">{description}</p>}
            {submitted ? (
              <div className="mt-7 rounded-2xl border border-white/10 bg-white/[.04] p-6 text-center">
                <p className="text-lg font-semibold">{locale === "so" ? "Waad mahadsan tahay!" : "Thank you!"}</p>
                <p className="mt-2 text-sm text-white/55">{locale === "so" ? "Xogtaada waa la helay." : "Your information has been received."}</p>
              </div>
            ) : loadingForm ? (
              <p className="mt-7 text-sm text-white/50">Loading…</p>
            ) : (
              <form onSubmit={submitForm} className="mt-6 space-y-4">
                {formFields.map((field) => {
                  const value = formData[field.field_key];
                  const label = locale === "so" ? field.label_so || field.label_en : field.label_en || field.label_so;
                  const placeholder = locale === "so" ? field.placeholder_so || field.placeholder_en : field.placeholder_en || field.placeholder_so;
                  if (field.field_type === "select") {
                    const options = locale === "so" ? (field.options_so.length ? field.options_so : field.options_en) : (field.options_en.length ? field.options_en : field.options_so);
                    return <label key={field.field_key} className="block"><span className="mb-1 block text-xs text-white/55">{label}{field.required && " *"}</span><select required={field.required} value={String(value ?? "")} onChange={(e)=>setFormData(d=>({...d,[field.field_key]:e.target.value}))} className="admin-input w-full bg-white/5 text-white"><option value="" className="text-black">{locale === "so" ? "Dooro..." : "Select..."}</option>{options.map(o=><option key={o} value={o} className="text-black">{o}</option>)}</select></label>;
                  }
                  if (field.field_type === "checkbox") return <label key={field.field_key} className="flex items-center gap-3 text-sm text-white/75"><input type="checkbox" checked={Boolean(value)} onChange={e=>setFormData(d=>({...d,[field.field_key]:e.target.checked}))}/>{label}{field.required && " *"}</label>;
                  const type = field.field_type === "email" ? "email" : field.field_type === "number" ? "number" : "text";
                  const common = { required: field.required, value: String(value ?? ""), placeholder, onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>)=>setFormData(d=>({...d,[field.field_key]:e.target.value})) };
                  return <label key={field.field_key} className="block"><span className="mb-1 block text-xs text-white/55">{label}{field.required && " *"}</span>{field.field_type === "textarea" ? <textarea {...common} rows={4} className="admin-input w-full bg-white/5 text-white"/> : <input {...common} type={type} className="admin-input w-full bg-white/5 text-white"/>}</label>;
                })}
                <button disabled={submitting} className="focus-ring w-full rounded-full bg-[#e45560] px-5 py-3 text-sm font-semibold disabled:opacity-50">{submitting ? "Submitting…" : (locale === "so" ? "Gudbi" : "Submit")}</button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
