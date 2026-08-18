"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Entry = { id:string; label:string; secondary:string; active:boolean };

export function AdminEventsTidingsContext({ mode }:{ mode:"events"|"tidings" }) {
  const [entries,setEntries]=useState<Entry[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState<string|null>(null);

  useEffect(()=>{let cancelled=false;async function load(){const supabase=createClient();try{if(mode==="events"){const {data,error}=await supabase.from("calendar_events").select("id, title, event_date, is_active").order("event_date",{ascending:false});if(error)throw error;if(!cancelled)setEntries((data??[]).map((row)=>({id:String(row.id),label:String(row.title),secondary:String(row.event_date??"Calendar event"),active:row.is_active===true})));}else{const {data,error}=await supabase.from("tidings").select("id, title, priority, is_active, created_at").order("created_at",{ascending:false}).limit(50);if(error)throw error;if(!cancelled)setEntries((data??[]).map((row)=>({id:String(row.id),label:String(row.title),secondary:String(row.priority??"normal"),active:row.is_active===true})));}if(!cancelled){setError(null);setLoading(false);}}catch(caught){if(!cancelled){setError(caught instanceof Error?caught.message:"Unable to load records.");setLoading(false);}}}void load();return()=>{cancelled=true;};},[mode]);

  function jumpTo(entry:Entry){if(mode==="events"){const target=document.getElementById(`event-${entry.id}`);if(target instanceof HTMLDetailsElement)target.open=true;target?.scrollIntoView({behavior:"smooth",block:"start"});return;}const target=document.querySelector<HTMLInputElement>(`input[name="id"][value="${CSS.escape(entry.id)}"]`)?.closest<HTMLElement>("article")??null;target?.scrollIntoView({behavior:"smooth",block:"start"});}

  function jumpToCreate(){if(mode==="events"){document.getElementById("event-new")?.scrollIntoView({behavior:"smooth",block:"start"});return;}document.querySelector<HTMLElement>(".admin-compact main section")?.scrollIntoView({behavior:"smooth",block:"start"});}

  const title=mode==="events"?"Events":"Tidings";

  return <div className="flex h-full min-h-0 flex-col"><p className="text-[8px] uppercase tracking-[0.24em] text-[#806b50]">Administration</p><h2 className="mt-1 font-serif text-xl text-[#d8bf91]">Jump to {title}</h2><p className="mt-2 text-[11px] leading-5 text-[#8f8271]">Jump directly to the record you want to work on.</p><button type="button" onClick={jumpToCreate} className="mt-3 flex w-full items-center justify-between border border-[#765937]/55 bg-[#271c12] px-3 py-2.5 text-left text-[9px] uppercase tracking-[0.16em] text-[#d6b37d] transition hover:border-[#9a7445] hover:bg-[#342318]"><span>Create new</span><span>+</span></button>{error?<p className="mt-3 border border-[#743d35] bg-[#2a1512] p-2.5 text-[10px] leading-5 text-[#d8a49a]">{error}</p>:null}<div className="mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">{loading?<div className="space-y-2">{Array.from({length:6}).map((_,index)=><div key={index} className="h-10 animate-pulse border border-[#59432c]/30 bg-[#19120d]" />)}</div>:<div className="space-y-1.5">{entries.map((entry)=><button key={entry.id} type="button" onClick={()=>jumpTo(entry)} className="group flex w-full items-center justify-between gap-2 border border-[#59432c]/40 bg-[#100c09] px-3 py-2 text-left transition hover:border-[#8d693e] hover:bg-[#1d150f]"><span className="min-w-0"><span className="block truncate font-serif text-[13px] text-[#cbb28a] group-hover:text-[#ead0a0]">{entry.label}</span><span className="mt-0.5 block text-[8px] uppercase tracking-[0.12em] text-[#6f6252]">{entry.secondary}</span></span><span title={entry.active?"Active":"Inactive"} className={`h-1.5 w-1.5 shrink-0 rounded-full ${entry.active?"bg-emerald-600":"bg-[#66594b]"}`} /></button>)}</div>}{!loading&&!error&&entries.length===0?<p className="border border-[#59432c]/30 bg-[#100c09]/60 p-3 text-[11px] text-[#8f8271]">No {title.toLowerCase()} found.</p>:null}</div></div>;
}
