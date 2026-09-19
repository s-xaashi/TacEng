"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";

type Platform = "x" | "instagram" | "tiktok" | "snapchat" | "facebook";
type SocialLink = {
  id: string;
  platform: Platform;
  url: string;
  enabled: boolean;
  sort_order: number;
};

const platforms: { value: Platform; label: string }[] = [
  { value: "x", label: "X" },
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "snapchat", label: "Snapchat" },
  { value: "facebook", label: "Facebook" },
];

function validateUrl(value: string) {
  try {
    const u = new URL(value.trim());
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

export default function SocialLinksManager() {
  const [links, setLinks] = useState<SocialLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Platform | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("social_links")
      .select("id,platform,url,enabled,sort_order")
      .order("sort_order")
      .order("platform");
    if (error) setMessage(error.message);
    setLinks((data ?? []) as SocialLink[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function save(platform: Platform, url: string, enabled: boolean, id?: string) {
    setMessage(null);
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const clean = validateUrl(url);
    if (!clean) {
      setMessage("Please enter a valid http:// or https:// social profile URL.");
      return;
    }

    setSaving(platform);
    const existing = links.find((l) => l.platform === platform);
    const payload = {
      platform,
      url: clean,
      enabled,
      sort_order: existing?.sort_order ?? platforms.findIndex((p) => p.value === platform),
    };

    const result = id
      ? await supabase.from("social_links").update(payload).eq("id", id)
      : await supabase.from("social_links").upsert(payload, { onConflict: "platform" });

    if (result.error) setMessage(result.error.message);
    else await load();
    setSaving(null);
  }

  async function toggle(link: SocialLink) {
    await save(link.platform, link.url, !link.enabled, link.id);
  }

  async function remove(link: SocialLink) {
    const supabase = getSupabaseClient();
    if (!supabase || !window.confirm(`Remove ${link.platform} from the portfolio?`)) return;
    setMessage(null);
    const { error } = await supabase.from("social_links").delete().eq("id", link.id);
    if (error) setMessage(error.message);
    else await load();
  }

  return (
    <section className="mt-12 rounded-2xl border border-line p-6">
      <div>
        <h2 className="font-display text-xl text-ink">Social links</h2>
        <p className="mt-1 text-sm text-muted">
          Add your profiles and control exactly which icons appear in the public footer.
        </p>
      </div>

      <div className="mt-6 grid gap-4">
        {platforms.map((platform) => {
          const link = links.find((l) => l.platform === platform.value);
          return (
            <div key={platform.value} className="rounded-xl border border-line p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1">
                  <label className="text-sm font-medium text-ink">{platform.label}</label>
                  <input
                    type="url"
                    value={link?.url ?? ""}
                    onChange={(e) =>
                      setLinks((current) =>
                        link
                          ? current.map((item) =>
                              item.id === link.id ? { ...item, url: e.target.value } : item
                            )
                          : [
                              ...current,
                              {
                                id: "",
                                platform: platform.value,
                                url: e.target.value,
                                enabled: true,
                                sort_order: platforms.findIndex((p) => p.value === platform.value),
                              },
                            ]
                      )
                    }
                    placeholder={`https://${platform.value}.com/your-profile`}
                    className="focus-ring mt-1 w-full rounded-md border border-line bg-white/60 px-3 py-2 text-sm text-ink"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={!link?.url || saving === platform.value}
                    onClick={() => save(platform.value, link?.url ?? "", link?.enabled ?? true, link?.id || undefined)}
                    className="focus-ring rounded-full bg-ink px-4 py-2 text-sm text-paper disabled:opacity-40"
                  >
                    {saving === platform.value ? "Saving…" : "Save"}
                  </button>
                  {link && (
                    <>
                      <button
                        type="button"
                        onClick={() => toggle(link)}
                        className="focus-ring rounded-full border border-line px-4 py-2 text-sm text-ink"
                      >
                        {link.enabled ? "Shown" : "Hidden"}
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(link)}
                        className="focus-ring rounded-full border border-red-200 px-4 py-2 text-sm text-red-700"
                      >
                        Remove
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {loading && <p className="mt-4 text-sm text-muted">Loading social links…</p>}
      {message && <p className="mt-4 text-sm text-red-700">{message}</p>}
    </section>
  );
}
