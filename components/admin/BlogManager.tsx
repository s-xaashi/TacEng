"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";

type Block={id:string;type:"paragraph"|"heading"|"image"|"date"|"highlight";text:string;image_path?:string;color?:string;level?:2|3};
type Post={id:string;title:string;excerpt:string|null;cover_image_path:string|null;published:boolean;published_at:string|null;sort_order:number;blocks:Block[]};
const emptyBlock=()=>({id:crypto.randomUUID(),type:"paragraph" as const,text:""});
const emptyForm={title:"",excerpt:"",published:true,published_at:new Date().toISOString().slice(0,10),sort_order:0,cover_image_path:null as string|null,blocks:[] as Block[]};

export default function BlogManager(){
 const [posts,setPosts]=useState<Post[]>([]),[form,setForm]=useState(emptyForm),[editing,setEditing]=useState<string|null>(null),[cover,setCover]=useState<File|null>(null),[saving,setSaving]=useState(false),[message,setMessage]=useState(""),[drag,setDrag]=useState<number|null>(null);
 const load=async()=>{const s=getSupabaseClient();if(!s)return;const {data,error}=await s.from("blogs").select("*").order("sort_order").order("created_at",{ascending:false});if(!error)setPosts((data??[]) as Post[])};
 useEffect(()=>{load()},[]);
 const reset=()=>{setEditing(null);setCover(null);setForm({...emptyForm,sort_order:posts.length})};
 const updateBlock=(i:number,patch:Partial<Block>)=>setForm(f=>({...f,blocks:f.blocks.map((b,n)=>n===i?{...b,...patch}:b)}));
 const addBlock=(type:Block["type"])=>setForm(f=>({...f,blocks:[...f.blocks,{...emptyBlock(),type,color:type==="highlight"?"#e45560":undefined,level:type==="heading"?2:undefined}]}));
 const removeBlock=(i:number)=>setForm(f=>({...f,blocks:f.blocks.filter((_,n)=>n!==i)}));
 const move=(from:number,to:number)=>setForm(f=>{const a=[...f.blocks],b=a.splice(from,1)[0];a.splice(to,0,b);return {...f,blocks:a}});
 const uploadImage=async(file:File)=>{const s=getSupabaseClient();if(!s)throw new Error("Supabase is not configured.");const path=`blogs/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,"-")}`;const {error}=await s.storage.from("thumbnails").upload(path,file,{upsert:true});if(error)throw error;return path};
 const save=async()=>{
  const s=getSupabaseClient();if(!s)return;setSaving(true);setMessage("");
  try{
   let coverPath=form.cover_image_path;
   if(cover)coverPath=await uploadImage(cover);
   const payload={title:form.title.trim(),excerpt:form.excerpt.trim()||null,published:form.published,published_at:form.published_at?new Date(form.published_at+"T12:00:00").toISOString():null,sort_order:Number(form.sort_order)||0,cover_image_path:coverPath,blocks:form.blocks,updated_at:new Date().toISOString()};
   const result=editing?await s.from("blogs").update(payload).eq("id",editing):await s.from("blogs").insert(payload);
   if(result.error)throw result.error;setMessage(editing?"Blog updated successfully.":"Blog created successfully.");reset();await load();
  }catch(e){setMessage(e instanceof Error?e.message:"Save failed.");}finally{setSaving(false)}
 };
 const edit=(p:Post)=>{setEditing(p.id);setForm({title:p.title,excerpt:p.excerpt??"",published:p.published,published_at:p.published_at?p.published_at.slice(0,10):"",sort_order:p.sort_order,cover_image_path:p.cover_image_path,blocks:p.blocks??[]});setCover(null);window.scrollTo({top:0,behavior:"smooth"})};
 const remove=async(id:string)=>{if(!confirm("Delete this blog?"))return;const s=getSupabaseClient();if(!s)return;const {error}=await s.from("blogs").delete().eq("id",id);setMessage(error?error.message:"Blog deleted.");await load()};
 return <section className="admin-content-card mt-8 rounded-3xl border border-white/10 bg-[#170607] p-5 text-white shadow-2xl sm:p-7">
  <div className="mb-6"><p className="hand text-xl text-[#e45560]">Content</p><h2 className="font-display text-2xl text-white">Blogs</h2><p className="mt-2 text-sm leading-6 text-white/55">Build long-form articles from movable blocks. Add images exactly where they belong, headings, dates and highlighted notes.</p></div>
  <div className="grid gap-5 lg:grid-cols-2">
   <label><span className="admin-label">Blog title</span><input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} className="admin-input"/></label>
   <label><span className="admin-label">Date</span><input type="date" value={form.published_at} onChange={e=>setForm({...form,published_at:e.target.value})} className="admin-input"/></label>
   <label className="lg:col-span-2"><span className="admin-label">Short excerpt shown on the blog card</span><textarea rows={3} value={form.excerpt} onChange={e=>setForm({...form,excerpt:e.target.value})} className="admin-input"/></label>
   <label className="lg:col-span-2"><span className="admin-label">Cover image</span><input type="file" accept="image/*" onChange={e=>setCover(e.target.files?.[0]??null)} className="mt-2 block w-full text-sm text-white/70 file:mr-3 file:rounded-lg file:border-0 file:bg-[#e45560] file:px-4 file:py-2 file:font-semibold file:text-white"/></label>
  </div>
  <div className="mt-8 rounded-2xl border border-white/10 bg-black/15 p-4 sm:p-5">
   <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-display text-xl">Article blocks</h3><p className="text-xs text-white/40">Drag blocks to reorder them.</p></div><div className="flex flex-wrap gap-2">{(["paragraph","heading","image","date","highlight"] as const).map(t=><button type="button" key={t} onClick={()=>addBlock(t)} className="rounded-full border border-white/10 bg-white/[.04] px-3 py-2 text-xs text-white/75 hover:border-[#e45560] hover:text-white">+ {t}</button>)}</div></div>
   <div className="mt-5 space-y-3">{form.blocks.map((b,i)=><div key={b.id} draggable onDragStart={()=>setDrag(i)} onDragOver={e=>e.preventDefault()} onDrop={()=>{if(drag!==null&&drag!==i)move(drag,i);setDrag(null)}} className="rounded-2xl border border-white/10 bg-[#21090b] p-4"><div className="mb-3 flex items-center justify-between"><span className="text-xs uppercase tracking-[.16em] text-[#d8e06b]">☷ {b.type}</span><button type="button" onClick={()=>removeBlock(i)} className="text-xs text-[#e45560]">Remove</button></div>
    {b.type==="heading"&&<div className="grid gap-3 sm:grid-cols-[1fr_auto]"><input placeholder="Heading text" value={b.text} onChange={e=>updateBlock(i,{text:e.target.value})} className="admin-input"/><select value={b.level??2} onChange={e=>updateBlock(i,{level:Number(e.target.value) as 2|3})} className="admin-input sm:w-28"><option value="2">H2</option><option value="3">H3</option></select></div>}
    {b.type==="paragraph"&&<textarea rows={5} placeholder="Write your paragraph..." value={b.text} onChange={e=>updateBlock(i,{text:e.target.value})} className="admin-input"/ >}
    {b.type==="date"&&<input type="text" placeholder="e.g. September 19, 2026" value={b.text} onChange={e=>updateBlock(i,{text:e.target.value})} className="admin-input"/>}
    {b.type==="highlight"&&<div className="grid gap-3 sm:grid-cols-[1fr_auto]"><textarea rows={4} placeholder="Highlighted text or important note..." value={b.text} onChange={e=>updateBlock(i,{text:e.target.value})} className="admin-input"/><input type="color" value={b.color??"#e45560"} onChange={e=>updateBlock(i,{color:e.target.value})} className="h-12 w-full rounded-lg bg-transparent sm:w-20"/></div>}
    {b.type==="image"&&<div><input type="file" accept="image/*" onChange={async e=>{const file=e.target.files?.[0];if(!file)return;try{const path=await uploadImage(file);updateBlock(i,{image_path:path,text:""})}catch(err){setMessage(err instanceof Error?err.message:"Image upload failed.")}}} className="block w-full text-sm text-white/70 file:mr-3 file:rounded-lg file:border-0 file:bg-[#e45560] file:px-3 file:py-2 file:text-white"/><input placeholder="Optional image caption" value={b.text} onChange={e=>updateBlock(i,{text:e.target.value})} className="admin-input mt-3"/>{b.image_path&&<p className="mt-2 text-xs text-[#d8e06b]">Image attached ✓</p>}</div>}
   </div>)}</div>
   {form.blocks.length===0&&<div className="mt-4 rounded-xl border border-dashed border-white/10 p-7 text-center text-sm text-white/35">Add your first paragraph, heading, image, date or highlight above.</div>}
  </div>
  <div className="mt-5 flex flex-wrap items-center gap-3"><label className="flex items-center gap-2 text-sm text-white/70"><input type="checkbox" checked={form.published} onChange={e=>setForm({...form,published:e.target.checked})}/> Published</label><label className="flex items-center gap-2 text-sm text-white/60">Order <input type="number" value={form.sort_order} onChange={e=>setForm({...form,sort_order:Number(e.target.value)})} className="w-20 rounded-lg border border-white/10 bg-[#240b0e] p-2 text-white"/></label><button type="button" disabled={saving||!form.title.trim()} onClick={save} className="rounded-xl bg-[#e45560] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40">{saving?"Saving...":editing?"Update Blog":"Publish Blog"}</button>{editing&&<button type="button" onClick={reset} className="rounded-xl border border-white/10 px-5 py-2.5 text-sm">Cancel</button>}{message&&<span className="text-sm text-white/55">{message}</span>}</div>
  <div className="mt-8 grid gap-3">{posts.map(p=><div key={p.id} className="flex flex-wrap items-center gap-4 rounded-2xl border border-white/10 bg-white/[.03] p-4"><div className="min-w-0 flex-1"><p className="font-display text-xl">{p.title}</p><p className="text-xs text-white/45">{p.published?"Published":"Draft"} · {p.blocks?.length??0} blocks</p></div><button type="button" onClick={()=>edit(p)} className="text-sm text-[#d8e06b]">Edit</button><button type="button" onClick={()=>remove(p.id)} className="text-sm text-[#e45560]">Delete</button></div>)}</div>
 </section>;
}