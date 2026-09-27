"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { getThumbnailUrl } from "@/lib/supabase/storage";
import { useLanguage } from "@/components/LanguageProvider";
import type { AdCampaign, AdFormField } from "@/lib/ads";
import { localized, localizedList, safeExternalUrl, visitorId } from "@/lib/ads";

type MarketplaceAdPopupProps = {
  campaignOverride?: AdCampaign | null;
  formFieldsOverride?: AdFormField[];
  previewMode?: boolean;
  onClose?: () => void;
  imageUrlOverride?: string | null;
  couponImageUrlOverride?: string | null;
};

function impressionKey(id: string) {
  return "marketplace_ad_impressions_" + id;
}
function getImpressionCount(id: string) {
  return Number(window.localStorage.getItem(impressionKey(id)) || 0);
}
function incrementImpressionCount(id: string) {
  const next = getImpressionCount(id) + 1;
  window.localStorage.setItem(impressionKey(id), String(next));
  return next;
}

export default function MarketplaceAdPopup({
  campaignOverride,
  formFieldsOverride,
  previewMode = false,
  onClose,
  imageUrlOverride,
  couponImageUrlOverride,
}: MarketplaceAdPopupProps) {
  const { locale } = useLanguage();
  const [campaign, setCampaign] = useState<AdCampaign | null>(campaignOverride ?? null);
  const [formFields, setFormFields] = useState<AdFormField[]>(formFieldsOverride ?? []);
  const [view, setView] = useState<"ad" | "action">("ad");
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [loadingForm, setLoadingForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showCloseHint, setShowCloseHint] = useState(true);

  const imageUrl = useMemo(() => imageUrlOverride !== undefined ? imageUrlOverride : getThumbnailUrl(campaign?.image_path ?? null), [campaign?.image_path, imageUrlOverride]);
  const couponImageUrl = useMemo(() => couponImageUrlOverride !== undefined ? couponImageUrlOverride : getThumbnailUrl(campaign?.coupon_image_path ?? null), [campaign?.coupon_image_path, couponImageUrlOverride]);
  const title = localized(campaign?.title_en, campaign?.title_so, locale);
  const description = localized(campaign?.description_en, campaign?.description_so, locale);
  const highlights = localizedList(campaign?.highlights_en, campaign?.highlights_so, locale);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowCloseHint(false), 3000);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (previewMode || campaignOverride !== undefined) {
      setCampaign(campaignOverride ?? null);
      setFormFields(formFieldsOverride ?? []);
      setView("ad");
      setSubmitted(false);
      setFormData({});
      return;
    }

    let cancelled = false;
    const client = getSupabaseClient();
    if (!client) return;
    const supabase = client;

    async function load() {
      const { data } = await supabase
        .from("ad_campaigns")
        .select("*")
        .eq("status", "active")
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(10);

      if (cancelled) return;
      const id = visitorId();
      const now = Date.now();
      const eligible = ((data ?? []) as AdCampaign[]).find((item) => {
        const startOk = !item.start_at || new Date(item.start_at).getTime() <= now;
        const endOk = !item.end_at || new Date(item.end_at).getTime() >= now;
        const cap = Number(item.max_impressions_per_visitor ?? 1);
        const impressions = getImpressionCount(item.id);
        return startOk && endOk && (cap <= 0 || impressions < cap);
      });

      if (eligible) {
        setCampaign(eligible);
        incrementImpressionCount(eligible.id);
        void supabase.from("ad_events").insert({ campaign_id: eligible.id, event_type: "impression", visitor_id: id });
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [campaignOverride, formFieldsOverride, previewMode]);

  if (!campaign) return null;
  const activeCampaign = campaign;

  function close() {
    if (previewMode) {
      onClose?.();
      return;
    }
    setCampaign(null);
  }

  function recordEvent(eventType: "interested" | "not_interested" | "action" | "redirect_click" | "coupon_copy") {
    if (previewMode) return;
    const client = getSupabaseClient();
    if (client) void client.from("ad_events").insert({ campaign_id: activeCampaign.id, event_type: eventType, visitor_id: visitorId() });
  }

  async function interested() {
    recordEvent("interested");

    if (activeCampaign.ad_type === "announcement") {
      close();
      return;
    }

    if (activeCampaign.ad_type === "form") {
      setView("action");
      if (formFieldsOverride) {
        setFormFields(formFieldsOverride);
        return;
      }
      const client = getSupabaseClient();
      if (!client) return;
      setLoadingForm(true);
      const { data } = await client
        .from("ad_form_fields")
        .select("*")
        .eq("campaign_id", activeCampaign.id)
        .order("sort_order");
      setFormFields((data ?? []) as AdFormField[]);
      setLoadingForm(false);
      return;
    }

    if (activeCampaign.action_type === "coupon") {
      setView("action");
      return;
    }

    const url = safeExternalUrl(activeCampaign.redirect_url);
    if (url) {
      recordEvent("redirect_click");
      window.open(url, "_blank", "noopener,noreferrer");
      close();
    }
  }

  function notInterested() {
    recordEvent("not_interested");
    close();
  }

  async function copyCoupon() {
    if (!activeCampaign.coupon_code) return;
    await navigator.clipboard.writeText(activeCampaign.coupon_code);
    setCopied(true);
    recordEvent("coupon_copy");
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function submitForm(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      if (previewMode) {
        await new Promise((resolve) => window.setTimeout(resolve, 350));
        setSubmitted(true);
        return;
      }
      const functionUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/submit-ad-lead` : null;
      if (!functionUrl) throw new Error("Marketplace is not configured.");
      const response = await fetch(functionUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId: activeCampaign.id,
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

  const actionTitle = localized(activeCampaign.coupon_title_en, activeCampaign.coupon_title_so, locale);
  const actionDescription = localized(activeCampaign.coupon_description_en, activeCampaign.coupon_description_so, locale);
  const actionHighlights = localizedList(activeCampaign.coupon_highlights_en, activeCampaign.coupon_highlights_so, locale);
  const actionCta = localized(activeCampaign.cta_en, activeCampaign.cta_so, locale) || (locale === "so" ? "Waan xiiseynayaa" : "I'm Interested");

  return (
    <div className="fixed inset-0 z-[100] h-[100dvh] overflow-hidden bg-black/60 px-4 py-5 backdrop-blur-sm sm:flex sm:items-center sm:justify-center sm:py-6" role="dialog" aria-modal="true" aria-label={title}>
      <div className="relative mx-auto flex h-full max-h-[94dvh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-white/15 bg-[#170607] text-white shadow-2xl sm:h-auto sm:max-h-[92vh]">
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 [scrollbar-width:thin] [-webkit-overflow-scrolling:touch] sm:px-7 sm:py-7">
          <div className="sticky top-0 z-30 -mx-5 -mt-5 mb-5 flex h-16 items-center justify-end bg-gradient-to-b from-[#170607] via-[#170607]/95 to-transparent px-4 sm:-mx-7 sm:-mt-7 sm:px-5">
            <div className={`pointer-events-none absolute right-16 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border border-white/15 bg-black/80 px-3 py-1.5 text-[11px] font-medium text-white/90 shadow-lg transition-all duration-500 ${showCloseHint ? "translate-x-0 opacity-100" : "translate-x-2 opacity-0"}`}>
              {locale === "so" ? "Xidh xayeysiiskan" : "Close this ad"}
            </div>
            <button
              type="button"
              onClick={close}
              aria-label={locale === "so" ? "Xidh xayeysiiskan" : "Close this ad"}
              className="focus-ring flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-black/40 text-xl text-white/90 shadow-lg backdrop-blur-md transition hover:border-white/30 hover:bg-black/60 hover:text-white"
            >
              ×
            </button>
          </div>
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
        ) : activeCampaign.ad_type === "action" && activeCampaign.action_type === "coupon" ? (
          <>
            {couponImageUrl && <img src={couponImageUrl} alt="" className="mb-5 max-h-64 w-full rounded-2xl object-cover" />}
            <p className="text-[10px] uppercase tracking-[.22em] text-[#d8e06b]">{locale === "so" ? "Coupon" : "Coupon"}</p>
            <h2 className="mt-2 font-display text-2xl">{actionTitle || title}</h2>
            {actionDescription && <p className="mt-3 whitespace-pre-line text-sm leading-6 text-white/65">{actionDescription}</p>}
            {actionHighlights.length > 0 && <ul className="mt-4 space-y-2 text-sm text-white/75">{actionHighlights.map((item, i) => <li key={i}>• {item}</li>)}</ul>}
            <div className="mt-6 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[.04] p-4">
              <code className="break-all text-lg font-semibold tracking-[.12em] text-[#d8e06b]">{activeCampaign.coupon_code}</code>
              <button type="button" onClick={copyCoupon} className="focus-ring shrink-0 rounded-full bg-white px-4 py-2 text-xs font-semibold text-[#170607]">{copied ? (locale === "so" ? "La koobiyey" : "Copied") : (locale === "so" ? "Koobi" : "Copy coupon")}</button>
            </div>
            <a
              href={safeExternalUrl(activeCampaign.redirect_url) ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                const url = safeExternalUrl(activeCampaign.redirect_url);
                if (!url) { e.preventDefault(); return; }
                recordEvent("redirect_click");
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
    </div>
  );
}
