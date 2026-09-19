"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";

type Item={id:string;name:string;rating:number;comment:string;approved:boolean;created_at:string};
export default function TestimonialsManager(){
 const [items,setItems]=useState<Item[]>([]),[loading,setLoading]=useState(true),[message,setMessage]=useState("");
 const load=async()=>{const s=getSupabaseClient();if(!s)return;setLoading(true);const {data,error}=await s.from("testimonials").select("*").order("created_at",{ascending:false});if(error)setMessage(error.message);setItems((data??[]) as Item[]);setLoading(false)};
 useEffect(()=>{load()},[]);
 const action=async(id:string,approved:boolean)=>{const s=getSupabaseClient();if(!s)return;const {error}=await s.from("testimonials").update({approved,updated_at:new Date().toISOString()}).eq("id",id);setMessage(error?error.message:(approved?"Note approved and published.":"Note hidden."));load()};
 const remove=async(id:string)=>{if(!confirm("Delete this note permanently?"))return;const s=getSupabaseClient();if(!s)return;const {error}=await s.from("testimonials").delete().eq("id",id);setMessage(error?error.message:"Note deleted.");load()};
 return <section className="admin-content-card mt-8 rounded-3xl border border-white/10 bg-[#170607] p-5 text-white shadow-2xl sm:p-7">
  <p className="hand text-xl text-[#e45560]">Community</p><h2 className="font-display text-2xl text-white">Reviews & Kind Notes</h2><p className="mt-2 text-sm leading-6 text-white/55">Visitor notes stay hidden until you approve them. Approved notes appear on the public floating wall.</p>
  {message&&<p className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-[#d8e06b]">{message}</p>}
  {loading?<p className="mt-5 text-sm text-white/50">Loading…</p>:items.length===0?<p className="mt-5 text-sm text-white/50">No notes yet.</p>:<div className="mt-5 space-y-3">{items.map(x=><article key={x.id} className="rounded-2xl border border-white/10 bg-[#240b0e] p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-semibold text-white">{x.name}</p><p className="text-[#d8e06b]">{"★".repeat(x.rating)}<span className="text-white/20">{"★".repeat(5-x.rating)}</span></p></div><span className={"rounded-full px-3 py-1 text-xs "+(x.approved?"bg-[#d8e06b]/15 text-[#d8e06b]":"bg-white/10 text-white/50")}>{x.approved?"Approved":"Pending"}</span></div><p className="mt-3 text-sm leading-6 text-white/70">“{x.comment}”</p><div className="mt-4 flex flex-wrap gap-4">{!x.approved&&<button onClick={()=>action(x.id,true)} className="text-sm text-[#d8e06b]">Approve</button>}{x.approved&&<button onClick={()=>action(x.id,false)} className="text-sm text-white/60">Hide</button>}<button onClick={()=>remove(x.id)} className="text-sm text-[#e45560]">Delete</button></div></article>)}</div>}
 </section>
}