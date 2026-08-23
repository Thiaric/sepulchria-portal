"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type SanctionCapability = "communication" | "forum" | "game_chat";

type State = { loading:boolean; blocked:boolean; message:string|null };

export function useSanctionCapability(capability:SanctionCapability):State {
  const [state,setState]=useState<State>({loading:true,blocked:false,message:null});
  const refresh=useCallback(async()=>{
    const supabase=createClient();
    const {data,error}=await supabase.rpc("get_current_sanction_enforcement",{p_capability:capability});
    if(error){setState({loading:false,blocked:false,message:null});return;}
    const row=Array.isArray(data)?data[0]??null:data;
    setState({loading:false,blocked:row?.blocked===true,message:typeof row?.message==="string"?row.message:null});
  },[capability]);
  useEffect(()=>{void refresh();const id=window.setInterval(()=>void refresh(),2500);const focus=()=>void refresh();window.addEventListener("focus",focus);return()=>{window.clearInterval(id);window.removeEventListener("focus",focus);};},[refresh]);
  return state;
}

export function SanctionRestrictionNotice({message,compact=false}:{message:string|null;compact?:boolean}){
  if(compact)return <span title={message??"This action is currently restricted."} aria-label={message??"This action is currently restricted."} className="inline-flex h-8 w-8 items-center justify-center border border-[rgb(var(--sep-colour-8f4f44))]/65 bg-[rgb(var(--sep-colour-2b1714))] text-[13px] text-[rgb(var(--sep-colour-dc9789))]">⚠</span>;
  return <div role="status" className="border-l-2 border-[rgb(var(--sep-colour-9a5147))]/75 bg-[rgb(var(--sep-colour-291613))]/80 px-4 py-3 text-xs leading-6 text-[rgb(var(--sep-colour-d9a092))]">{message??"This action is currently restricted."}</div>;
}
