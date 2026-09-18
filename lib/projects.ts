import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
export type PortfolioProject={id:string;title:string;description:string|null;tags:string[];status:"Coming Soon"|"In Progress"|"Live";href:string|null;image_path:string|null;image_url:string|null;published:boolean};
export async function getPublishedProjects():Promise<PortfolioProject[]>{
 const supabase=getSupabaseAdmin();
 const {data,error}=await supabase.from("projects").select("id,title,description,tags,status,href,image_path,published").eq("published",true).order("sort_order").order("created_at",{ascending:false});
 if(error){console.error("Failed to load portfolio projects:",error);return[]}
 return (data??[]).map(p=>({...p,image_url:p.image_path?supabase.storage.from("thumbnails").getPublicUrl(p.image_path).data.publicUrl:null})) as PortfolioProject[];
}
