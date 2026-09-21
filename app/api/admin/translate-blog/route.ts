import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type InputBlock = {
  id: string;
  type: "paragraph" | "heading" | "image" | "date" | "highlight";
  text_en?: string;
  text?: string;
  level?: 2 | 3;
  image_path?: string;
  color?: string;
};

const MAX_BLOCKS = 80;
const MAX_INPUT_CHARS = 70000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function getServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.normalize("NFKC").trim().slice(0, max) : "";
}

export async function POST(request: Request) {
  const auth = request.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token || token.length > 10000) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const supabase = getServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Translation service is not configured." }, { status: 503 });
  }

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user?.id || !EMAIL_RE.test(userData.user.email || "")) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { data: adminRow, error: adminError } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (adminError || !adminRow) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  let body: { title_en?: unknown; excerpt_en?: unknown; blocks?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const title = clean(body.title_en, 500);
  const excerpt = clean(body.excerpt_en, 5000);
  const rawBlocks = Array.isArray(body.blocks) ? body.blocks : [];

  if (!title) {
    return NextResponse.json({ error: "English title is required." }, { status: 400 });
  }
  if (rawBlocks.length > MAX_BLOCKS) {
    return NextResponse.json({ error: "This article has too many blocks." }, { status: 400 });
  }

  const blocks: InputBlock[] = rawBlocks.map((raw, index) => {
    const item = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
    return {
      id: clean(item.id, 100) || String(index),
      type: ["paragraph", "heading", "image", "date", "highlight"].includes(String(item.type))
        ? item.type as InputBlock["type"]
        : "paragraph",
      text_en: clean(item.text_en ?? item.text, 20000),
      level: item.level === 3 ? 3 : 2,
      image_path: clean(item.image_path, 500) || undefined,
      color: clean(item.color, 30) || undefined,
    };
  });

  const inputChars = title.length + excerpt.length + blocks.reduce((sum, b) => sum + (b.text_en?.length || 0), 0);
  if (inputChars > MAX_INPUT_CHARS) {
    return NextResponse.json({ error: "Article is too large to translate in one request." }, { status: 413 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY is not configured on the server." }, { status: 503 });
  }

  const model = process.env.OPENAI_TRANSLATION_MODEL || "gpt-5.6-luna";

  const prompt = [
    "Translate the following English portfolio article into accurate, natural Somali.",
    "The Somali is for readers in Somalia/Somaliland. Use clear, modern Somali rather than word-for-word machine-like translation.",
    "Preserve the author's meaning, tone, facts, names, product names, URLs, code/technical terms when a natural Somali equivalent would be misleading.",
    "Do not add facts, explanations, headings, emojis, or commentary.",
    "Return one Somali title, one Somali excerpt, and exactly one translated text value for every block id.",
    "For image blocks, translate only the caption if there is one. Do not translate or alter image paths.",
    "",
    JSON.stringify({ title_en: title, excerpt_en: excerpt, blocks: blocks.map(b => ({ id: b.id, type: b.type, text_en: b.text_en || "" })) }),
  ].join("\n");

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        instructions: "You are an expert English-to-Somali localization editor. Output only the requested structured JSON.",
        input: prompt,
        max_output_tokens: 12000,
        text: {
          format: {
            type: "json_schema",
            name: "somali_blog_translation",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                title_so: { type: "string" },
                excerpt_so: { type: "string" },
                blocks_so: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      id: { type: "string" },
                      text_so: { type: "string" },
                    },
                    required: ["id", "text_so"],
                  },
                },
              },
              required: ["title_so", "excerpt_so", "blocks_so"],
            },
          },
        },
      }),
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const detail = typeof data?.error?.message === "string" ? data.error.message : "Translation request failed.";
      return NextResponse.json({ error: detail }, { status: response.status === 429 ? 429 : 502 });
    }

    const output = typeof data?.output_text === "string" ? data.output_text : "";
    if (!output) return NextResponse.json({ error: "The translation service returned no text." }, { status: 502 });

    let parsed: { title_so: string; excerpt_so: string; blocks_so: { id: string; text_so: string }[] };
    try {
      parsed = JSON.parse(output);
    } catch {
      return NextResponse.json({ error: "The translation service returned an invalid response. Please try again." }, { status: 502 });
    }

    const byId = new Map((parsed.blocks_so || []).map(b => [b.id, clean(b.text_so, 20000)]));
    const safeBlocks = blocks.map(b => ({ id: b.id, text_so: byId.get(b.id) || "" }));

    return NextResponse.json({
      title_so: clean(parsed.title_so, 500),
      excerpt_so: clean(parsed.excerpt_so, 5000),
      blocks_so: safeBlocks,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Translation service is temporarily unavailable." }, { status: 502 });
  }
}
