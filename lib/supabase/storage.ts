import { getSupabaseClient } from "./client";

/** Public URL for a thumbnail image. Thumbnails bucket is public. */
export function getThumbnailUrl(path: string | null): string | null {
  if (!path) return null;
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  return supabase.storage.from("thumbnails").getPublicUrl(path).data
    .publicUrl;
}

/**
 * Public URL for a FREE document's file. Only ever call this for
 * documents where is_free is true — the free-documents bucket is public,
 * so this URL is safe to expose. Never call this for paid documents:
 * their files live in the private paid-documents bucket and have no
 * public URL by design.
 */
export function getFreeDocumentUrl(path: string | null): string | null {
  if (!path) return null;
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  return supabase.storage.from("free-documents").getPublicUrl(path).data
    .publicUrl;
}
