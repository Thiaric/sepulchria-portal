import Link from "next/link";
import {createClient} from "@/lib/supabase/server";
import {addOffer,cancelTrade,confirmTrade,createTrade,discardItem,giveItem,removeOffer} from "./actions";

export default async function Page({searchParams}:{searchParams:Promise<{trade?:string;error?:string;success?:string}>}){
 const q=await searchParams,s=await createClient(); const {data:{user}}=await s.auth.getUser(); if(!user)return null;
 const {data:me}=await s.from("characters").select("id,display_name,current_room_id").eq("user_id",user.id).maybeSingle(); if(!me)return null;
 const {data:inv}=await s.rpc("get_public_character_inventory",{p_character_id:me.id});
 const loose=((inv??[]) as any[]).filter(r=>!r.parent_container_id&&!r.is_equipped&&r.transfer_policy==="free"&&!r.is_quest_item);
 const {data:nearby}=me.current_room_id?await s.from("characters").select("id,display_name").eq("status","approved").eq("current_room_id",me.current_room_id).neq("id",me.id).order("display_name"):{data:[] as any[]};
 const {data:trades}=await s.from("item_trades").select("*").eq("status","open").order("created_at",{ascending:false});
 const trade=(trades??[]).find(t=>t.id===q.trade)??(trades??[])[0]??null;
 let partner: any = null;
let offers: any[] = [];
let partnerInv: any[] = [];

if (trade) {
  const pid =
    trade.character_one_id === me.id
      ? trade.character_two_id
      : trade.character_one_id;

  const { data: partnerData } = await s
    .from("characters")
    .select("id,display_name,current_room_id")
    .eq("id", pid)
    .maybeSingle();

  partner = partnerData ?? null;

  const { data: offerData } = await s
    .from("item_trade_offers")
    .select("*")
    .eq("trade_id", trade.id)
    .order("created_at");

  offers = offerData ?? [];

  if (partner) {
    const { data: partnerInventoryData } =
      await s.rpc(
        "get_public_character_inventory",
        {
          p_character_id: partner.id,
        },
      );

    partnerInv =
      partnerInventoryData ?? [];
  }
}
 const map=new Map([...loose,...partnerInv].map((r:any)=>[`${r.record_kind}:${r.record_id}`,r]));
 const mine=offers.filter(o=>o.character_id===me.id),theirs=offers.filter(o=>o.character_id!==me.id);
 const mineOk=trade?(trade.character_one_id===me.id?trade.character_one_confirmed:trade.character_two_confirmed):false;
 const theirsOk=trade?(trade.character_one_id===me.id?trade.character_two_confirmed:trade.character_one_confirmed):false;
 const box="border border-[#59432c]/40 bg-[#120e0b] p-4", field="w-full border border-[#60482e]/55 bg-[#100c09] px-3 py-2 text-sm text-[#d5c09c] outline-none", button="border border-[#87663b] bg-[#2a1d12] px-4 py-2 text-[9px] uppercase tracking-[0.14em] text-[#d8bd91] hover:bg-[#342416]";
 const options=<>{loose.map((r:any)=><option key={`${r.record_kind}:${r.record_id}`} value={`${r.record_kind}|${r.record_id}`}>{r.name}{r.quantity>1?` ×${r.quantity}`:""}</option>)}</>;
 return <div className="space-y-5 p-5 sm:p-7">
  <header className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[8px] uppercase tracking-[0.2em] text-[#806b50]">Inventory</p><h1 className="mt-1 font-serif text-3xl text-[#dec89f]">Item Management & Exchange</h1><p className="mt-2 text-xs text-[#8f8271]">Give, discard, or exchange Items with another character.</p></div><Link href="/character?tab=inventory" className={button}>Back to Inventory</Link></header>
  {q.error?<p className="border border-red-900/50 bg-red-950/15 p-3 text-xs text-red-400">{q.error}</p>:null}{q.success?<p className="border border-emerald-900/50 bg-emerald-950/15 p-3 text-xs text-emerald-400">{q.success}</p>:null}
  <div className="grid gap-4 xl:grid-cols-2">
   <section className={box}><h2 className="font-serif text-xl text-[#dec89f]">Give Item</h2><p className="mt-1 text-xs text-[#817565]">Immediate transfer to a character in your current Location.</p><form action={giveItem} className="mt-4 grid gap-3"><select name="recordChoice" required className={field}><option value="">Choose Item…</option>{options}</select><select name="targetCharacterId" required className={field}><option value="">Give to…</option>{(nearby??[]).map((c:any)=><option key={c.id} value={c.id}>{c.display_name}</option>)}</select><input name="quantity" type="number" min="1" defaultValue="1" className={field}/><button className={button}>Give Item</button></form></section>
   <section className={box}><h2 className="font-serif text-xl text-[#dec89f]">Discard Item</h2><p className="mt-1 text-xs text-[#817565]">Standard Items are removed. Unique Items return to the Admin Vault.</p><form action={discardItem} className="mt-4 grid gap-3"><select name="recordChoice" required className={field}><option value="">Choose Item…</option>{options}</select><input name="quantity" type="number" min="1" defaultValue="1" className={field}/><button className={`${button} border-red-900/60 text-red-300`}>Discard Item</button></form></section>
  </div>
  {!trade?<section className={box}><h2 className="font-serif text-xl text-[#dec89f]">Start Item Exchange</h2><p className="mt-1 text-xs text-[#817565]">Both characters must be in the same Location.</p><form action={createTrade} className="mt-4 flex flex-wrap gap-3"><select name="otherCharacterId" required className={`${field} min-w-[240px] flex-1`}><option value="">Choose character…</option>{(nearby??[]).map((c:any)=><option key={c.id} value={c.id}>{c.display_name}</option>)}</select><button className={button}>Start Exchange</button></form></section>:null}
  {trade?<section className={box}>
   <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[8px] uppercase tracking-[0.18em] text-[#806b50]">Live Item Exchange</p><h2 className="mt-1 font-serif text-2xl text-[#dec89f]">{me.display_name} ⇄ {partner?.display_name??"Other Character"}</h2><p className="mt-1 text-xs text-[#817565]">Any change to either offer clears both confirmations.</p></div><form action={cancelTrade}><input type="hidden" name="tradeId" value={trade.id}/><button className={`${button} border-red-900/50 text-red-300`}>Cancel</button></form></div>
   <div className="mt-5 grid gap-4 lg:grid-cols-2">{[[me.display_name,mine,mineOk,true],[partner?.display_name??"Other Character",theirs,theirsOk,false]].map(([name,list,ok,isMine]:any)=><div key={name} className="border border-[#59432c]/35 bg-[#0f0b08] p-4"><div className="flex justify-between gap-2"><h3 className="font-serif text-lg text-[#d7bf94]">{name}'s Offer</h3><span className={`text-[8px] uppercase ${ok?"text-emerald-400":"text-[#756958]"}`}>{ok?"Confirmed":"Not confirmed"}</span></div><div className="mt-3 space-y-2">{list.length?list.map((o:any)=>{const r:any=map.get(`${o.record_kind}:${o.record_id}`);return <div key={o.id} className="flex items-center justify-between border border-[#59432c]/25 p-3"><span className="text-sm text-[#cdb894]">{r?.name??"Item"}{o.quantity>1?` ×${o.quantity}`:""}</span>{isMine?<form action={removeOffer}><input type="hidden" name="tradeId" value={trade.id}/><input type="hidden" name="offerId" value={o.id}/><button className="text-[8px] uppercase text-red-400">Remove</button></form>:null}</div>}):<p className="text-xs italic text-[#756958]">No Items offered yet.</p>}</div></div>)}</div>
   <form action={addOffer} className="mt-4 grid gap-3 md:grid-cols-[1fr_110px_150px]"><input type="hidden" name="tradeId" value={trade.id}/><select name="recordChoice" required className={field}><option value="">Add one of your Items…</option>{options}</select><input name="quantity" type="number" min="1" defaultValue="1" className={field}/><button className={button}>Add to Offer</button></form>
   <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#59432c]/30 pt-4"><p className="text-xs text-[#8f8271]">You: <strong className={mineOk?"text-emerald-400":"text-[#b9a386]"}>{mineOk?"Confirmed":"Waiting"}</strong> · {partner?.display_name}: <strong className={theirsOk?"text-emerald-400":"text-[#b9a386]"}>{theirsOk?"Confirmed":"Waiting"}</strong></p><form action={confirmTrade}><input type="hidden" name="tradeId" value={trade.id}/><button disabled={mineOk} className={`${button} disabled:cursor-not-allowed disabled:opacity-40`}>{mineOk?"Confirmed":"Confirm Exchange"}</button></form></div>
  </section>:null}
  <p className="text-[9px] leading-5 text-[#756958]">Only loose, unequipped, freely transferable, non-Quest Items can be given or exchanged. Move Items out of containers first.</p>
 </div>;
}
