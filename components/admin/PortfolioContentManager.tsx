"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";

const DEFAULT_QUICK_NOTE = "The goal is simple: create things that are useful, memorable and worth coming back to.";
const DEFAULT_QUOTE = "The only limit to our realization of tomorrow is our doubts of today.";
const DEFAULT_AUTHOR = "Franklin D. Roosevelt";

export default function PortfolioContentManager() {
  const [quickNote, setQuickNote] = useState(DEFAULT_QUICK_NOTE);
  const [quote, setQuote] = useState(DEFAULT_QUOTE);
  const [author, setAuthor] = useState(DEFAULT_AUTHOR);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    supabase.from("portfolio_content").select("quick_note,quote_text,quote_author").eq("id", true).maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setQuickNote(data.quick_note ?? DEFAULT_QUICK_NOTE);
        setQuote(data.quote_text ?? DEFAULT_QUOTE);
        setAuthor(data.quote_author ?? DEFAULT_AUTHOR);
      });
  }, []);

  async function save() {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    setSaving(true); setMessage("");
    const { error } = await supabase.from("portfolio_content").upsert({
      id: true, quick_note: quickNote.trim(), quote_text: quote.trim(), quote_author: author.trim(), updated_at: new Date().toISOString()
    });
    setSaving(false);
    setMessage(error ? error.message : "Updated successfully. The homepage will use the new content.");
  }

  return <section className="admin-content-card mt-8 rounded-3xl border border-white/10 bg-[#170607] p-5 text-white shadow-2xl sm:p-7">
    <div className="mb-6">
      <h2 className="font-display text-2xl text-white">Homepage Quote & Quick Note</h2>
      <p className="mt-2 text-sm leading-6 text-white/55">Change these whenever you want. The homepage will display your latest saved content.</p>
    </div>
    <div className="grid gap-5 lg:grid-cols-2">
      <label className="admin-field block"><span className="text-sm font-semibold text-white">Quick Note</span><textarea value={quickNote} onChange={e=>setQuickNote(e.target.value)} rows={5} className="admin-input mt-2 w-full rounded-xl border border-white/10 bg-[#240b0e] p-3 text-sm text-white outline-none transition focus:border-[#e45560] focus:ring-2 focus:ring-[#e45560]/20 placeholder:text-white/30" /></label>
      <div className="space-y-5">
        <label className="block"><span className="text-sm font-semibold text-ink">Quote of the Day</span><textarea value={quote} onChange={e=>setQuote(e.target.value)} rows={4} className="admin-input mt-2 w-full rounded-xl border border-white/10 bg-[#240b0e] p-3 text-sm text-white outline-none transition focus:border-[#e45560] focus:ring-2 focus:ring-[#e45560]/20 placeholder:text-white/30" /></label>
        <label className="block"><span className="text-sm font-semibold text-ink">Quote Author</span><input value={author} onChange={e=>setAuthor(e.target.value)} className="mt-2 w-full rounded-xl border border-line bg-white p-3 text-sm outline-none focus:border-ink" /></label>
      </div>
    </div>
    <div className="mt-5 flex items-center gap-4"><button type="button" disabled={saving} onClick={save} className="rounded-xl bg-[#e45560] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#e45560]/20 transition hover:bg-[#f06a75] disabled:opacity-50">{saving ? "Saving..." : "Save Homepage Content"}</button>{message && <span className="text-sm text-white/55">{message}</span>}</div>
  </section>;
}