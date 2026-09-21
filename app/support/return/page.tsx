import Link from "next/link";
import { verifyTransaction } from "@/lib/sifalo/client";
import { applySupportVerify } from "@/lib/sifalo/support";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
export default async function SupportReturnPage({searchParams}:{searchParams:Promise<{ref?:string;sid?:string}>}) {
  const {ref,sid}=await searchParams;
  if(!ref) return <Result title="Support payment" text="No payment reference was provided."/>;
  const supabase=getSupabaseAdmin();
  const {data:payment}=await supabase.from("support_payments").select("*").eq("payment_reference",ref).maybeSingle();
  if(!payment) return <Result title="Support payment" text="We could not find this payment."/>;
  let current=payment;
  if(payment.status!=="paid" && sid) current=await applySupportVerify(payment.id,await verifyTransaction({sid}));
  if(current.status==="paid") return <Result title="Thank you ❤️" text="Your support was received successfully. I truly appreciate it." success/>;
  if(current.status==="pending") return <Result title="Payment processing…" text="Your payment is still being processed. You can check again later."/>;
  return <Result title="Payment not completed" text="The support payment was not completed. Please try again."/>;
}
function Result({title,text,success}:{title:string;text:string;success?:boolean}) {
 return <main className="flex min-h-screen items-center justify-center bg-[#120607] px-6 text-center text-white"><div className="max-w-md"><p className="text-5xl">{success?"♥":"•"}</p><h1 className="mt-5 font-display text-3xl">{title}</h1><p className="mt-3 text-sm leading-6 text-white/55">{text}</p><Link href="/" className="mt-7 inline-block rounded-full bg-[#d94b5a] px-6 py-3 text-sm font-semibold">Back to portfolio</Link></div></main>;
}