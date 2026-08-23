import { TicketLiveSync } from "@/components/support/ticket-live-sync";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSupportIdentity } from "@/lib/support/current-support-user";
function fmt(v:string){return new Intl.DateTimeFormat("en-GB",{dateStyle:"medium",timeStyle:"short"}).format(new Date(v));}
export default async function SupportPage(){
 const identity=await requireSupportIdentity(); const admin=createAdminClient();
 const {data:tickets,error}=await admin.from("tickets").select("id,public_reference,category,status,subject,created_at,updated_at").eq("opened_by_user_id",identity.userId).order("updated_at",{ascending:false});
 if(error) throw new Error(error.message);
 return <main className="p-5 sm:p-7 lg:p-9"><TicketLiveSync/><div className="mx-auto max-w-5xl">
  <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[9px] uppercase tracking-[0.28em] text-[rgb(var(--sep-colour-8c704b))]">Help · Support</p><h1 className="mt-2 font-serif text-4xl text-[rgb(var(--sep-colour-ead5ac))]">Ticket Centre</h1><p className="mt-3 text-sm text-[rgb(var(--sep-colour-9c8d79))]">Ask for help or follow an existing request.</p></div><Link href="/support/new" className="border border-[rgb(var(--sep-colour-80613b))] bg-[rgb(var(--sep-colour-261b12))] px-4 py-3 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-d5b785))]">Open New Ticket</Link></div>
  <div className="mt-8 space-y-3">{(tickets??[]).length===0?<div className="border border-[rgb(var(--sep-colour-60482e))]/45 p-8 text-center text-sm text-[rgb(var(--sep-colour-8f806d))]">You have no support tickets.</div>:(tickets??[]).map(t=><Link key={t.id} href={`/support/${t.public_reference}`} className="block border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-5 hover:border-[rgb(var(--sep-colour-947047))]"><div className="flex justify-between gap-3"><div><div className="text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-8c704b))]">{t.public_reference} · {t.category.replaceAll("_"," ")}</div><h2 className="mt-2 font-serif text-xl text-[rgb(var(--sep-colour-e2c99f))]">{t.subject}</h2></div><span className="h-fit border border-[rgb(var(--sep-colour-60482e))]/55 px-3 py-2 text-[8px] uppercase text-[rgb(var(--sep-colour-b7a083))]">{t.status.replaceAll("_"," ")}</span></div><p className="mt-3 text-[9px] text-[rgb(var(--sep-colour-756957))]">Opened {fmt(t.created_at)} · Updated {fmt(t.updated_at)}</p></Link>)}</div>
 </div></main>;
}
