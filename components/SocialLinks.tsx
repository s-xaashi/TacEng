"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";

type Platform = "x" | "instagram" | "tiktok" | "snapchat" | "facebook";
type SocialLink = { id: string; platform: Platform; url: string; enabled: boolean; sort_order: number };

const meta: Record<Platform, { label: string }> = {
  x: { label: "X" },
  instagram: { label: "Instagram" },
  tiktok: { label: "TikTok" },
  snapchat: { label: "Snapchat" },
  facebook: { label: "Facebook" },
};

function Icon({ platform }: { platform: Platform }) {
  if (platform === "x") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4.5 19 19.5M19 4.5 5 19.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/></svg>;
  if (platform === "instagram") return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="5" fill="none" stroke="currentColor" strokeWidth="1.9"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="1.9"/><circle cx="17.6" cy="6.5" r="1.2" fill="currentColor"/></svg>;
  if (platform === "tiktok") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.2 4v9.2a4.2 4.2 0 1 1-3.1-4.05v2.7a1.7 1.7 0 1 0 .7 1.35V4h2.4c.35 1.75 1.35 2.8 3.3 3.15V9.5c-1.45-.18-2.55-.7-3.3-1.5V4h0Z" fill="currentColor"/></svg>;
  if (platform === "snapchat") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4.2c-3 0-4.8 2.05-4.8 5v2.1c0 .65-.3 1.05-1.05 1.35l-1.1.42c-.35.14-.34.65.02.78l2.15.72c.32 1.2 1.1 1.75 2.2 1.85.6.05 1.15.45 1.65 1.02.45.5 1.35.5 1.9 0 .5-.57 1.05-.97 1.65-1.02 1.1-.1 1.88-.65 2.2-1.85l2.15-.72c.36-.13.37-.64.02-.78l-1.1-.42c-.75-.3-1.05-.7-1.05-1.35V9.2c0-2.95-1.8-5-4.8-5Z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 20v-7h2.35l.35-2.75H13.5V8.5c0-.8.23-1.35 1.42-1.35h1.5V4.7c-.26-.04-1.15-.1-2.2-.1-2.18 0-3.67 1.33-3.67 3.78v1.87H8.1V13h2.45v7h2.95Z" fill="currentColor"/></svg>;
}

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
              <Icon platform={link.platform} />
            </a>
          );
        })}
      </div>
    </div>
  );
}
