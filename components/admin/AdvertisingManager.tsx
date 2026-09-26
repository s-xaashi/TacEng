"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { getThumbnailUrl } from "@/lib/supabase/storage";
import type { AdCampaign, AdEvent, AdFormField, AdSubmission, AdType, AdActionType } from "@/lib/ads";
import { csvCell } from "@/lib/ads";

const emptyCampaign: Partial<AdCampaign> = {
  name: "",
  ad_type: "announcement",
  status: "draft",
  priority: 0,
  start_at: null,
  end_at: null,
  title_en: "",
  title_so: "",
  description_en: "",
  description_so: "",
  highlights_en: [],
  highlights_so: [],
  image_path: null,
  cta_en: "",
  cta_so: "",
  action_type: null,
  redirect_url: "",
  coupon_code: "",
  coupon_title_en: "",
  coupon_title_so: "",
  coupon_description_en: "",
  coupon_description_so: "",
  coupon_highlights_en: [],
  coupon_highlights_so: [],
  coupon_image_path: null,
};

const emptyField: AdFormField = {
  field_key: "name",
  label_en: "",
  label_so: "",
  field_type: "text",
  placeholder_en: "",
  placeholder_so: "",
  options_en: [],
  options_so: [],
  required: false,
  sort_order: 0,
};

function lines(value: string) {
  return value.split("\n").map((x) => x.trim()).filter(Boolean);
}
function joinLines(value: string[] | null | undefined) {
  return (value ?? []).join("\n");
}
function toInputDate(value: string | null | undefined) {
  return value ? new Date(value).toISOString().slice(0, 16) : "";
}
function fromInputDate(value: string) {
  return value ? new Date(value).toISOString() : null;
}

export default function AdvertisingManager() {
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [fields, setFields] = useState<AdFormField[]>([]);
  const [submissions, setSubmissions] = useState<AdSubmission[]>([]);
  const [events, setEvents] = useState<AdEvent[]>([]);
  const [form, setForm] = useState<Partial<AdCampaign>>(emptyCampaign);
  const [formFields, setFormFields] = useState<AdFormField[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [tab, setTab] = useState<"campaigns" | "leads" | "analytics">("campaigns");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [couponImageFile, setCouponImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState(false);
  const [leadCampaign, setLeadCampaign] = useState("all");

  const client = getSupabaseClient();

  const load = useCallback(async () => {
    if (!client) return;
    const [{ data: cs }, { data: fs }, { data: ss }, { data: es }] = await Promise.all([
      client.from("ad_campaigns").select("*").order("priority", { ascending: false }).order("created_at", { ascending: false }),
      client.from("ad_form_fields").select("*").order("sort_order"),
      client.from("ad_submissions").select("*").order("submitted_at", { ascending: false }).limit(5000),
      client.from("ad_events").select("*").order("created_at", { ascending: false }).limit(10000),
    ]);
    setCampaigns((cs ?? []) as AdCampaign[]);
    setFields((fs ?? []) as AdFormField[]);
    setSubmissions((ss ?? []) as AdSubmission[]);
    setEvents((es ?? []) as AdEvent[]);
  }, [client]);

  useEffect(() => { void load(); }, [load]);

  function reset() {
    setEditing(null);
    setForm({ ...emptyCampaign });
    setFormFields([]);
    setImageFile(null);
    setCouponImageFile(null);
    setMessage("");
  }

  function edit(campaign: AdCampaign) {
    setEditing(campaign.id);
    setForm({ ...campaign });
    setFormFields(fields.filter((f) => f.campaign_id === campaign.id).map((f) => ({ ...f, options_en: f.options_en ?? [], options_so: f.options_so ?? [] })));
    setImageFile(null);
    setCouponImageFile(null);
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function uploadImage(file: File, folder: string) {
    if (!client) throw new Error("Supabase is not configured.");
    if (!file.type.startsWith("image/")) throw new Error("Only image files are allowed.");
    if (file.size > 8 * 1024 * 1024) throw new Error("Images must be 8 MB or smaller.");
    const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "webp";
    const path = `advertising/${folder}/${crypto.randomUUID()}.${extension}`;
    const { error } = await client.storage.from("thumbnails").upload(path, file, { upsert: false, cacheControl: "31536000", contentType: file.type });
    if (error) throw error;
    return path;
  }

  async function save() {
    if (!client) return;
    setSaving(true);
    setMessage("");
    try {
      const titleEn = String(form.title_en ?? "").trim();
      const name = String(form.name ?? "").trim();
      if (!name || !titleEn) throw new Error("Campaign name and English title are required.");
      if (form.ad_type === "action" && !form.action_type) throw new Error("Choose an action type.");
      if (form.action_type === "coupon" && (!String(form.coupon_code ?? "").trim() || !String(form.redirect_url ?? "").trim())) {
        throw new Error("Coupon code and redirect URL are required.");
      }
      if (form.action_type === "redirect" && !String(form.redirect_url ?? "").trim()) throw new Error("Redirect URL is required.");
      if (form.ad_type === "form" && formFields.length === 0) throw new Error("Add at least one form field.");

      let imagePath = form.image_path ?? null;
      let couponImagePath = form.coupon_image_path ?? null;
      if (imageFile) imagePath = await uploadImage(imageFile, "campaigns");
      if (couponImageFile) couponImagePath = await uploadImage(couponImageFile, "coupons");

      const payload = {
        name,
        ad_type: form.ad_type,
        status: form.status ?? "draft",
        priority: Math.max(-1000, Math.min(1000, Number(form.priority) || 0)),
        start_at: fromInputDate(String(form.start_at ?? "")),
        end_at: fromInputDate(String(form.end_at ?? "")),
        title_en: titleEn,
        title_so: String(form.title_so ?? "").trim() || null,
        description_en: String(form.description_en ?? "").trim() || null,
        description_so: String(form.description_so ?? "").trim() || null,
        highlights_en: lines(String(form.highlights_en ?? "")),
        highlights_so: lines(String(form.highlights_so ?? "")),
        image_path: imagePath,
        cta_en: String(form.cta_en ?? "").trim() || null,
        cta_so: String(form.cta_so ?? "").trim() || null,
        action_type: form.ad_type === "action" ? form.action_type : null,
        redirect_url: String(form.redirect_url ?? "").trim() || null,
        coupon_code: form.action_type === "coupon" ? String(form.coupon_code ?? "").trim() : null,
        coupon_title_en: String(form.coupon_title_en ?? "").trim() || null,
        coupon_title_so: String(form.coupon_title_so ?? "").trim() || null,
        coupon_description_en: String(form.coupon_description_en ?? "").trim() || null,
        coupon_description_so: String(form.coupon_description_so ?? "").trim() || null,
        coupon_highlights_en: lines(String(form.coupon_highlights_en ?? "")),
        coupon_highlights_so: lines(String(form.coupon_highlights_so ?? "")),
        coupon_image_path: couponImagePath,
      };

      let campaignId = editing;
      if (editing) {
        const { error } = await client.from("ad_campaigns").update(payload).eq("id", editing);
        if (error) throw error;
        await client.from("ad_form_fields").delete().eq("campaign_id", editing);
      } else {
        const { data, error } = await client.from("ad_campaigns").insert(payload).select("id").single();
        if (error || !data) throw error ?? new Error("Could not create campaign.");
        campaignId = data.id;
      }

      if (form.ad_type === "form" && campaignId) {
        const cleanFields = formFields.map((field, index) => ({
          campaign_id: campaignId,
          field_key: field.field_key.trim().toLowerCase(),
          label_en: field.label_en.trim(),
          label_so: field.label_so.trim() || null,
          field_type: field.field_type,
          placeholder_en: field.placeholder_en.trim() || null,
          placeholder_so: field.placeholder_so.trim() || null,
          options_en: field.options_en.map((x) => x.trim()).filter(Boolean),
          options_so: field.options_so.map((x) => x.trim()).filter(Boolean),
          required: Boolean(field.required),
          sort_order: index,
        }));
        const { error } = await client.from("ad_form_fields").insert(cleanFields);
        if (error) throw error;
      }

      setMessage(editing ? "Campaign updated." : "Campaign created.");
      reset();
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(campaign: AdCampaign) {
    if (!client || !window.confirm(`Delete "${campaign.name}"? This cannot be undone.`)) return;
    const { error } = await client.from("ad_campaigns").delete().eq("id", campaign.id);
    if (error) setMessage(error.message);
    else { setMessage("Campaign deleted."); await load(); }
  }

  async function toggle(campaign: AdCampaign) {
    if (!client) return;
    const next = campaign.status === "active" ? "paused" : "active";
    const { error } = await client.from("ad_campaigns").update({ status: next }).eq("id", campaign.id);
    if (error) setMessage(error.message); else await load();
  }

  function addField() {
    const index = formFields.length;
    setFormFields((current) => [...current, { ...emptyField, field_key: `field_${index + 1}`, sort_order: index }]);
  }

  function updateField(index: number, patch: Partial<AdFormField>) {
    setFormFields((current) => current.map((field, i) => i === index ? { ...field, ...patch } : field));
  }

  function removeField(index: number) {
    setFormFields((current) => current.filter((_, i) => i !== index));
  }

  function campaignEvents(id: string) {
    return events.filter((event) => event.campaign_id === id);
  }

  function count(id: string, type: AdEvent["event_type"]) {
    return campaignEvents(id).filter((event) => event.event_type === type).length;
  }

  function downloadCsv() {
    const rows = submissions.filter((s) => leadCampaign === "all" || s.campaign_id === leadCampaign);
    const campaign = (id: string) => campaigns.find((c) => c.id === id)?.name ?? id;
    const keys = Array.from(new Set(rows.flatMap((row) => Object.keys(row.data ?? {}))));
    const header = ["Campaign", "Submitted At", "Locale", ...keys];
    const body = rows.map((row) => [
      campaign(row.campaign_id),
      row.submitted_at,
      row.locale,
      ...keys.map((key) => row.data?.[key] ?? ""),
    ]);
    const csv = [header, ...body].map((row) => row.map(csvCell).join(",")).join("\n");
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `marketplace-leads-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const selectedCampaign = editing ? campaigns.find((c) => c.id === editing) : null;
  const previewCampaign = selectedCampaign ?? ({
    ...emptyCampaign,
    ...form,
    id: "preview",
    created_at: "",
    updated_at: "",
  } as AdCampaign);

  return (
    <main className="mx-auto min-h-screen max-w-content px-6 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">Control Center</p>
          <h1 className="mt-1 font-display text-3xl text-ink">Advertising</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">Create bilingual marketplace promotions, coupons, announcements and lead forms.</p>
        </div>
        <button type="button" onClick={() => { reset(); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="focus-ring rounded-full bg-ink px-5 py-3 text-sm font-medium text-paper">+ New campaign</button>
      </div>

      <div className="mt-8 flex gap-2 overflow-x-auto border-b border-line pb-2">
        {(["campaigns", "leads", "analytics"] as const).map((item) => (
          <button key={item} type="button" onClick={() => setTab(item)} className={`focus-ring rounded-full px-4 py-2 text-sm ${tab === item ? "bg-ink text-paper" : "text-muted hover:text-ink"}`}>{item === "campaigns" ? "Campaigns" : item === "leads" ? `Leads (${submissions.length})` : "Analytics"}</button>
        ))}
      </div>

      {tab === "campaigns" && (
        <>
          <section className="admin-content-card mt-6 rounded-3xl border border-white/10 bg-[#170607] p-5 text-white shadow-2xl sm:p-7">
            <div className="mb-6 flex items-center justify-between gap-3">
              <div><p className="hand text-xl text-[#e45560]">Campaign builder</p><h2 className="font-display text-2xl">Bilingual content</h2></div>
              {editing && <button type="button" onClick={reset} className="text-sm text-white/50">Cancel</button>}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <label><span className="admin-label">Internal campaign name</span><input value={String(form.name ?? "")} onChange={(e)=>setForm(f=>({...f,name:e.target.value}))} maxLength={120} className="admin-input"/></label>
              <label><span className="admin-label">Type</span><select value={String(form.ad_type ?? "announcement")} onChange={(e)=>setForm(f=>({...f,ad_type:e.target.value as AdType,action_type:e.target.value==="action"?"coupon":null}))} className="admin-input"><option value="announcement">Announcement</option><option value="action">Action</option><option value="form">Lead Form</option></select></label>
              <label><span className="admin-label">Status</span><select value={String(form.status ?? "draft")} onChange={(e)=>setForm(f=>({...f,status:e.target.value as AdCampaign["status"]}))} className="admin-input"><option value="draft">Draft</option><option value="active">Active</option><option value="paused">Paused</option><option value="archived">Archived</option></select></label>
              <label><span className="admin-label">Priority</span><input type="number" min={-1000} max={1000} value={Number(form.priority ?? 0)} onChange={(e)=>setForm(f=>({...f,priority:Number(e.target.value)}))} className="admin-input"/></label>
              <label><span className="admin-label">Start</span><input type="datetime-local" value={toInputDate(form.start_at)} onChange={(e)=>setForm(f=>({...f,start_at:e.target.value}))} className="admin-input"/></label>
              <label><span className="admin-label">End</span><input type="datetime-local" value={toInputDate(form.end_at)} onChange={(e)=>setForm(f=>({...f,end_at:e.target.value}))} className="admin-input"/></label>

              <label><span className="admin-label">English header</span><input value={String(form.title_en ?? "")} onChange={(e)=>setForm(f=>({...f,title_en:e.target.value}))} maxLength={200} className="admin-input"/></label>
              <label><span className="admin-label">Somali header</span><input value={String(form.title_so ?? "")} onChange={(e)=>setForm(f=>({...f,title_so:e.target.value}))} maxLength={200} className="admin-input"/></label>
              <label><span className="admin-label">English description</span><textarea rows={4} value={String(form.description_en ?? "")} onChange={(e)=>setForm(f=>({...f,description_en:e.target.value}))} maxLength={3000} className="admin-input"/></label>
              <label><span className="admin-label">Somali description</span><textarea rows={4} value={String(form.description_so ?? "")} onChange={(e)=>setForm(f=>({...f,description_so:e.target.value}))} maxLength={3000} className="admin-input"/></label>
              <label><span className="admin-label">English highlights (one per line)</span><textarea rows={4} value={joinLines(form.highlights_en)} onChange={(e)=>setForm(f=>({...f,highlights_en:e.target.value}))} className="admin-input"/></label>
              <label><span className="admin-label">Somali highlights (one per line)</span><textarea rows={4} value={joinLines(form.highlights_so)} onChange={(e)=>setForm(f=>({...f,highlights_so:e.target.value}))} className="admin-input"/></label>
              <label className="lg:col-span-2"><span className="admin-label">Main advertisement image</span><input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(e)=>setImageFile(e.target.files?.[0] ?? null)} className="block text-sm"/></label>
              <label><span className="admin-label">English CTA</span><input value={String(form.cta_en ?? "")} onChange={(e)=>setForm(f=>({...f,cta_en:e.target.value}))} maxLength={80} className="admin-input"/></label>
              <label><span className="admin-label">Somali CTA</span><input value={String(form.cta_so ?? "")} onChange={(e)=>setForm(f=>({...f,cta_so:e.target.value}))} maxLength={80} className="admin-input"/></label>
            </div>

            {form.ad_type === "action" && (
              <div className="mt-7 rounded-2xl border border-white/10 bg-white/[.03] p-5">
                <h3 className="font-display text-xl">Action</h3>
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <label><span className="admin-label">Action type</span><select value={String(form.action_type ?? "coupon")} onChange={(e)=>setForm(f=>({...f,action_type:e.target.value as AdActionType}))} className="admin-input"><option value="coupon">Coupon</option><option value="redirect">Redirect</option></select></label>
                  <label><span className="admin-label">Redirect URL (WhatsApp, Google Form, social, website)</span><input type="url" value={String(form.redirect_url ?? "")} onChange={(e)=>setForm(f=>({...f,redirect_url:e.target.value}))} placeholder="https://..." maxLength={2000} className="admin-input"/></label>
                </div>
                {form.action_type === "coupon" && (
                  <div className="mt-5 grid gap-4 lg:grid-cols-2">
                    <label><span className="admin-label">Coupon code</span><input value={String(form.coupon_code ?? "")} onChange={(e)=>setForm(f=>({...f,coupon_code:e.target.value.replace(/[^A-Za-z0-9_-]/g,"").slice(0,64)}))} className="admin-input"/></label>
                    <label><span className="admin-label">Coupon image</span><input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(e)=>setCouponImageFile(e.target.files?.[0] ?? null)} className="block text-sm"/></label>
                    <label><span className="admin-label">Coupon English title</span><input value={String(form.coupon_title_en ?? "")} onChange={(e)=>setForm(f=>({...f,coupon_title_en:e.target.value}))} maxLength={200} className="admin-input"/></label>
                    <label><span className="admin-label">Coupon Somali title</span><input value={String(form.coupon_title_so ?? "")} onChange={(e)=>setForm(f=>({...f,coupon_title_so:e.target.value}))} maxLength={200} className="admin-input"/></label>
                    <label><span className="admin-label">Coupon English description</span><textarea rows={4} value={String(form.coupon_description_en ?? "")} onChange={(e)=>setForm(f=>({...f,coupon_description_en:e.target.value}))} maxLength={3000} className="admin-input"/></label>
                    <label><span className="admin-label">Coupon Somali description</span><textarea rows={4} value={String(form.coupon_description_so ?? "")} onChange={(e)=>setForm(f=>({...f,coupon_description_so:e.target.value}))} maxLength={3000} className="admin-input"/></label>
                    <label><span className="admin-label">Coupon English highlights (one per line)</span><textarea rows={4} value={joinLines(form.coupon_highlights_en)} onChange={(e)=>setForm(f=>({...f,coupon_highlights_en:e.target.value}))} className="admin-input"/></label>
                    <label><span className="admin-label">Coupon Somali highlights (one per line)</span><textarea rows={4} value={joinLines(form.coupon_highlights_so)} onChange={(e)=>setForm(f=>({...f,coupon_highlights_so:e.target.value}))} className="admin-input"/></label>
                  </div>
                )}
              </div>
            )}

            {form.ad_type === "form" && (
              <div className="mt-7 rounded-2xl border border-white/10 bg-white/[.03] p-5">
                <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-display text-xl">Lead form fields</h3><p className="text-xs text-white/45">Only declared fields can be submitted.</p></div><button type="button" onClick={addField} className="rounded-full bg-[#e45560] px-4 py-2 text-xs font-semibold">+ Add field</button></div>
                <div className="mt-5 space-y-4">
                  {formFields.map((field,index)=>(
                    <div key={index} className="rounded-2xl border border-white/10 bg-black/15 p-4">
                      <div className="grid gap-3 lg:grid-cols-3">
                        <label><span className="admin-label">Key</span><input value={field.field_key} onChange={(e)=>updateField(index,{field_key:e.target.value.toLowerCase().replace(/[^a-z0-9_]/g,"").slice(0,40)})} className="admin-input"/></label>
                        <label><span className="admin-label">Type</span><select value={field.field_type} onChange={(e)=>updateField(index,{field_type:e.target.value as AdFormField["field_type"]})} className="admin-input"><option value="text">Text</option><option value="email">Email</option><option value="phone">Phone</option><option value="number">Number</option><option value="textarea">Textarea</option><option value="select">Select</option><option value="checkbox">Checkbox</option></select></label>
                        <label className="flex items-end gap-3 pb-2"><input type="checkbox" checked={field.required} onChange={(e)=>updateField(index,{required:e.target.checked})}/><span className="text-sm">Required</span><button type="button" onClick={()=>removeField(index)} className="ml-auto text-sm text-[#e45560]">Remove</button></label>
                        <label><span className="admin-label">English label</span><input value={field.label_en} onChange={(e)=>updateField(index,{label_en:e.target.value})} className="admin-input"/></label>
                        <label><span className="admin-label">Somali label</span><input value={field.label_so} onChange={(e)=>updateField(index,{label_so:e.target.value})} className="admin-input"/></label>
                        <label><span className="admin-label">English placeholder</span><input value={field.placeholder_en} onChange={(e)=>updateField(index,{placeholder_en:e.target.value})} className="admin-input"/></label>
                        <label><span className="admin-label">Somali placeholder</span><input value={field.placeholder_so} onChange={(e)=>updateField(index,{placeholder_so:e.target.value})} className="admin-input"/></label>
                        {field.field_type === "select" && <><label><span className="admin-label">English options (one per line)</span><textarea rows={3} value={joinLines(field.options_en)} onChange={(e)=>updateField(index,{options_en:lines(e.target.value)})} className="admin-input"/></label><label><span className="admin-label">Somali options (one per line)</span><textarea rows={3} value={joinLines(field.options_so)} onChange={(e)=>updateField(index,{options_so:lines(e.target.value)})} className="admin-input"/></label></>}
                      </div>
                    </div>
                  ))}
                  {formFields.length === 0 && <p className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-white/40">Add the fields you want to collect.</p>}
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              <button type="button" disabled={saving} onClick={save} className="rounded-full bg-[#e45560] px-6 py-3 text-sm font-semibold disabled:opacity-50">{saving ? "Saving…" : editing ? "Update campaign" : "Create campaign"}</button>
              <button type="button" onClick={()=>setPreview(true)} className="rounded-full border border-white/15 px-6 py-3 text-sm">Preview</button>
              {message && <span className="self-center text-sm text-white/55">{message}</span>}
            </div>
          </section>

          <section className="mt-8 grid gap-4 lg:grid-cols-2">
            {campaigns.map((campaign) => (
              <article key={campaign.id} className="rounded-3xl border border-line p-5">
                <div className="flex gap-4">
                  {getThumbnailUrl(campaign.image_path) && <img src={getThumbnailUrl(campaign.image_path)!} alt="" className="h-24 w-28 rounded-xl object-cover" />}
                  <div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] uppercase tracking-[.18em] text-muted">{campaign.ad_type}</p><h3 className="font-display text-xl">{campaign.title_en}</h3></div><span className="rounded-full border border-line px-2 py-1 text-xs">{campaign.status}</span></div><p className="mt-2 line-clamp-2 text-sm text-muted">{campaign.description_en}</p><div className="mt-4 flex flex-wrap gap-3 text-xs"><button onClick={()=>edit(campaign)} className="underline">Edit</button><button onClick={()=>toggle(campaign)} className="underline">{campaign.status === "active" ? "Pause" : "Activate"}</button><button onClick={()=>remove(campaign)} className="text-red-700 underline">Delete</button></div></div>
                </div>
              </article>
            ))}
            {campaigns.length === 0 && <p className="rounded-2xl border border-dashed border-line p-8 text-center text-sm text-muted lg:col-span-2">No advertising campaigns yet.</p>}
          </section>
        </>
      )}

      {tab === "leads" && (
        <section className="mt-6 rounded-3xl border border-line p-5 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-display text-2xl">Collected leads</h2><p className="text-sm text-muted">Only authorized admins can view or export these submissions.</p></div><button type="button" onClick={downloadCsv} disabled={!submissions.length} className="rounded-full bg-ink px-5 py-2.5 text-sm text-paper disabled:opacity-40">Download CSV</button></div>
          <select value={leadCampaign} onChange={(e)=>setLeadCampaign(e.target.value)} className="mt-5 rounded-full border border-line bg-paper px-4 py-2 text-sm"><option value="all">All campaigns</option>{campaigns.filter(c=>c.ad_type==="form").map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
          <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead><tr className="border-b border-line text-xs uppercase tracking-wide text-muted"><th className="px-3 py-3">Campaign</th><th className="px-3 py-3">Submitted</th><th className="px-3 py-3">Locale</th><th className="px-3 py-3">Data</th></tr></thead><tbody>{submissions.filter(s=>leadCampaign==="all"||s.campaign_id===leadCampaign).map(s=><tr key={s.id} className="border-b border-line/70 align-top"><td className="px-3 py-3">{campaigns.find(c=>c.id===s.campaign_id)?.name ?? s.campaign_id}</td><td className="px-3 py-3 whitespace-nowrap">{new Date(s.submitted_at).toLocaleString()}</td><td className="px-3 py-3">{s.locale.toUpperCase()}</td><td className="px-3 py-3"><div className="max-w-xl space-y-1">{Object.entries(s.data ?? {}).map(([key,value])=><div key={key}><span className="text-muted">{key}:</span> {String(value)}</div>)}</div></td></tr>)}</tbody></table></div>
        </section>
      )}

      {tab === "analytics" && (
        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          {campaigns.map(campaign => {
            const impressions=count(campaign.id,"impression"), interested=count(campaign.id,"interested"), notInterested=count(campaign.id,"not_interested"), actions=count(campaign.id,"action"), copies=count(campaign.id,"coupon_copy"), leads=count(campaign.id,"form_submit");
            return <article key={campaign.id} className="rounded-3xl border border-line p-6"><p className="text-xs uppercase tracking-[.18em] text-muted">{campaign.ad_type}</p><h2 className="mt-1 font-display text-2xl">{campaign.title_en}</h2><div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">{[["Views",impressions],["Interested",interested],["Not interested",notInterested],["Actions",actions],["Coupon copies",copies],["Form submissions",leads]].map(([label,value])=><div key={String(label)} className="rounded-2xl border border-line p-4"><p className="text-xs text-muted">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></div>)}</div></article>;
          })}
          {campaigns.length===0 && <p className="rounded-2xl border border-dashed border-line p-8 text-center text-sm text-muted lg:col-span-2">Analytics will appear after you publish campaigns.</p>}
        </section>
      )}

      {preview && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-white/15 bg-[#170607] p-5 text-white shadow-2xl">
            <button type="button" onClick={()=>setPreview(false)} className="focus-ring absolute right-4 top-4 h-9 w-9 rounded-full border border-white/15">×</button>
            <p className="text-[10px] uppercase tracking-[.22em] text-[#d8e06b]">Live preview</p>
            <h2 className="mt-2 font-display text-3xl">{String(previewCampaign.title_en ?? "Advertisement")}</h2>
            {previewCampaign.description_en && <p className="mt-3 text-sm leading-6 text-white/65">{String(previewCampaign.description_en)}</p>}
            {previewCampaign.image_path && <img src={getThumbnailUrl(previewCampaign.image_path) ?? ""} alt="" className="mt-5 max-h-64 w-full rounded-2xl object-cover" />}
            <div className="mt-6 flex gap-3"><button className="rounded-full bg-[#e45560] px-5 py-3 text-sm font-semibold">I&apos;m Interested</button><button className="rounded-full border border-white/15 px-5 py-3 text-sm">Not interested</button></div>
          </div>
        </div>
      )}
    </main>
  );
}
