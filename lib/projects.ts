import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export type PortfolioProject = {
  id: string; title: string; description: string | null; tags: string[];
  status: "Coming Soon" | "In Progress" | "Live"; href: string | null;
  image_path: string | null; image_url: string | null; published: boolean;
};

export async function getPublishedProjects(): Promise<PortfolioProject[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.error("Portfolio projects: Supabase public environment variables are missing.");
    return [];
  }
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await supabase.from("projects")
    .select("id,title,description,tags,status,href,image_path,published")
    .eq("published", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) {
    console.error("Failed to load portfolio projects:", error.message);
    return [];
  }
  return (data ?? []).map((project) => ({
    ...project,
    image_url: project.image_path
      ? supabase.storage.from("thumbnails").getPublicUrl(project.image_path).data.publicUrl
      : null,
  })) as PortfolioProject[];
}
