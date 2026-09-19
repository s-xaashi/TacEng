"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";

type Platform = "x" | "instagram" | "tiktok" | "snapchat" | "facebook";
type SocialLink = { id: string; platform: Platform; url: string; enabled: boolean; sort_order: number };

const meta: Record<Platform, { label: string; short: string }> = {
  x: { label: "X", short: "𝕏" },
  instagram: { label: "Instagram", short: "◎" },
  tiktok: { label: "TikTok", short: "♪" },
  snapchat: { label: "Snapchat", short: "◉" },
  facebook: { label: "Facebook", short: "f" },
};

function safeUrl(value: string) {
  try {
    const u = new URL(value);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

export default function SocialLinks() {
  const [links, setLinks] = useState<SocialLink[]>([]);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    supabase
      .from("social_links")
      .select("id,platform,url,enabled,sort_order")
      .eq("enabled", true)
      .order("sort_order")
      .then(({ data }) => setLinks((data ?? []) as SocialLink[]));
  }, []);

  if (!links.length) return null;

  return (
    <div className="social-links-wrap" aria-label="Social media links">
      <p className="social-links-kicker">Find me online</p>
      <div className="social-links">
        {links.map((link, index) => {
          const href = safeUrl(link.url);
          if (!href) return null;
          const item = meta[link.platform];
          return (
            <a
              key={link.id}
              href={href}
              target="_blank"
              rel="noopener noreferrer nofollow"
              aria-label={item.label}
              title={item.label}
              className="social-link"
              style={{ animationDelay: `${index * 70}ms` }}
            >
              <span aria-hidden="true">{item.short}</span>
            </a>
          );
        })}
      </div>
    </div>
  );
}
