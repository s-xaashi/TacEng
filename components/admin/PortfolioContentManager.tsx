"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";

const DEFAULT_QUICK_NOTE = "The goal is simple: create things that are useful, memorable and worth coming back to.";
const DEFAULT_QUOTE = "The only limit to our realization of tomorrow is our doubts of today.";
const DEFAULT_AUTHOR = "Franklin D. Roosevelt";

export default function PortfolioContentManager() {
  const [quickNoteEn, setQuickNoteEn] = useState(DEFAULT_QUICK_NOTE);
  const [quickNoteSo, setQuickNoteSo] = useState("");
  const [quoteEn, setQuoteEn] = useState(DEFAULT_QUOTE);
  const [quoteSo, setQuoteSo] = useState("");
  const [authorEn, setAuthorEn] = useState(DEFAULT_AUTHOR);
  const [authorSo, setAuthorSo] = useState("");
  const [supportEnabled, setSupportEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    supabase.from("portfolio_content")
      .select("quick_note,quote_text,quote_author,quick_note_en,quick_note_so,quote_text_en,quote_text_so,quote_author_en,quote_author_so,support_enabled")
      .eq("id", true)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setQuickNoteEn(data.quick_note_en ?? data.quick_note ?? DEFAULT_QUICK_NOTE);
        setQuickNoteSo(data.quick_note_so ?? "");
        setQuoteEn(data.quote_text_en ?? data.quote_text ?? DEFAULT_QUOTE);
        setQuoteSo(data.quote_text_so ?? "");
        setAuthorEn(data.quote_author_en ?? data.quote_author ?? DEFAULT_AUTHOR);
        setAuthorSo(data.quote_author_so ?? "");
        setSupportEnabled(data.support_enabled ?? true);
      });
  }, []);

  async function save() {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    setSaving(true);
    setMessage("");

    const englishQuickNote = quickNoteEn.trim();
    const englishQuote = quoteEn.trim();
    const englishAuthor = authorEn.trim();

    const { error } = await supabase.from("portfolio_content").upsert({
      id: true,
      quick_note: englishQuickNote,
      quick_note_en: englishQuickNote,
      quick_note_so: quickNoteSo.trim() || null,
      quote_text: englishQuote,
      quote_text_en: englishQuote,
      quote_text_so: quoteSo.trim() || null,
      quote_author: englishAuthor,
      quote_author_en: englishAuthor,
      quote_author_so: authorSo.trim() || null,
      support_enabled: supportEnabled,
      updated_at: new Date().toISOString(),
    });

    setSaving(false);
    setMessage(error ? error.message : "Updated successfully. The homepage will use the new content.");
  }

  return <section className="admin-content-card mt-8 rounded-3xl border border-white/10 bg-[#170607] p-5 text-white shadow-2xl sm:p-7">
    <div className="mb-6">
      <h2 className="font-display text-2xl text-white">Homepage Quote & Quick Note</h2>
      <p className="mt-2 text-sm leading-6 text-white/55">Enter English and Somali versions separately. The same content item is used for both languages.</p>
    </div>
    <div className="mb-6 rounded-2xl border border-white/10 bg-[#240b0e] p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-white">Support Me button</h3>
          <p className="mt-1 text-xs leading-5 text-white/50">Show or hide the Support Me button in the website navigation. Hiding it also removes the support entry from the mobile menu.</p>
        </div>
        <button type="button" role="switch" aria-checked={supportEnabled} onClick={() => setSupportEnabled(v => !v)} className={"relative h-7 w-12 shrink-0 rounded-full transition " + (supportEnabled ? "bg-[#e45560]" : "bg-white/15")} aria-label={supportEnabled ? "Hide Support Me button" : "Show Support Me button"}>
          <span className={"absolute top-1 h-5 w-5 rounded-full bg-white shadow transition " + (supportEnabled ? "left-6" : "left-1")} />
        </button>
      </div>
      <p className={"mt-3 text-xs font-medium " + (supportEnabled ? "text-[#ff8790]" : "text-white/40")}>{supportEnabled ? "Visible on the website" : "Hidden from the website"}</p>
    </div>
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="space-y-5">
        <label className="admin-field block"><span className="text-sm font-semibold text-white">English Quick Note</span><textarea value={quickNoteEn} onChange={e=>setQuickNoteEn(e.target.value)} rows={5} className="admin-input mt-2 w-full rounded-xl border border-white/10 bg-[#240b0e] p-3 text-sm text-white outline-none transition focus:border-[#e45560] focus:ring-2 focus:ring-[#e45560]/20 placeholder:text-white/30" /></label>
        <label className="admin-field block"><span className="text-sm font-semibold text-white">Somali Quick Note</span><textarea value={quickNoteSo} onChange={e=>setQuickNoteSo(e.target.value)} rows={5} className="admin-input mt-2 w-full rounded-xl border border-white/10 bg-[#240b0e] p-3 text-sm text-white outline-none transition focus:border-[#e45560] focus:ring-2 focus:ring-[#e45560]/20 placeholder:text-white/30" /></label>
      </div>
      <div className="space-y-5">
        <label className="admin-field block"><span className="text-sm font-semibold text-white">English Quote of the Day</span><textarea value={quoteEn} onChange={e=>setQuoteEn(e.target.value)} rows={4} className="admin-input mt-2 w-full rounded-xl border border-white/10 bg-[#240b0e] p-3 text-sm text-white outline-none transition focus:border-[#e45560] focus:ring-2 focus:ring-[#e45560]/20 placeholder:text-white/30" /></label>
        <label className="admin-field block"><span className="text-sm font-semibold text-white">Somali Quote of the Day</span><textarea value={quoteSo} onChange={e=>setQuoteSo(e.target.value)} rows={4} className="admin-input mt-2 w-full rounded-xl border border-white/10 bg-[#240b0e] p-3 text-sm text-white outline-none transition focus:border-[#e45560] focus:ring-2 focus:ring-[#e45560]/20 placeholder:text-white/30" /></label>
        <label className="admin-field block"><span className="text-sm font-semibold text-white">English Quote Author</span><input value={authorEn} onChange={e=>setAuthorEn(e.target.value)} className="admin-input mt-2 w-full rounded-xl border border-white/10 bg-[#240b0e] p-3 text-sm text-white outline-none transition focus:border-[#e45560] focus:ring-2 focus:ring-[#e45560]/20 placeholder:text-white/30" /></label>
        <label className="admin-field block"><span className="text-sm font-semibold text-white">Somali Quote Author</span><input value={authorSo} onChange={e=>setAuthorSo(e.target.value)} className="admin-input mt-2 w-full rounded-xl border border-white/10 bg-[#240b0e] p-3 text-sm text-white outline-none transition focus:border-[#e45560] focus:ring-2 focus:ring-[#e45560]/20 placeholder:text-white/30" /></label>
      </div>
    </div>
    <div className="mt-5 flex items-center gap-4"><button type="button" disabled={saving} onClick={save} className="rounded-xl bg-[#e45560] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#e45560]/20 transition hover:bg-[#f06a75] disabled:opacity-50">{saving ? "Saving..." : "Save Homepage Content"}</button>{message && <span className="text-sm text-white/55">{message}</span>}</div>
  </section>;
}
