"use client";
import {useEffect,useRef} from "react";
import {useRouter} from "next/navigation";

function signatureForPayload(payload:unknown){
  if(!payload||typeof payload!=="object")return "";
  const data=payload as {
    events?:Array<{id?:string;event_type?:string;created_at?:string;details?:unknown}>;
    tickets?:Array<{id?:string;updated_at?:string;status?:string;priority?:string;assigned_staff_user_id?:string|null;unread_activity_count?:number}>;
  };
  if(Array.isArray(data.events))return JSON.stringify(data.events.map(e=>[e.id??"",e.event_type??"",e.created_at??"",e.details??null]));
  if(Array.isArray(data.tickets))return JSON.stringify(data.tickets.map(t=>[t.id??"",t.updated_at??"",t.status??"",t.priority??"",t.assigned_staff_user_id??null,t.unread_activity_count??0]));
  return "";
}

export function TicketLiveSync({reference,admin=false}:{reference?:string;admin?:boolean}){
  const router=useRouter();
  const last=useRef<string|null>(null);
  const busy=useRef(false);
  useEffect(()=>{
    let stopped=false;
    async function markRead(){
      if(!reference)return;
      await fetch("/api/support/read",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({reference,admin}),cache:"no-store"}).catch(()=>undefined);
    }
    async function tick(){
      if(stopped||busy.current||document.visibilityState!=="visible")return;
      busy.current=true;
      try{
        const qs=new URLSearchParams();
        if(admin)qs.set("admin","1");
        if(reference)qs.set("reference",reference);
        const r=await fetch(`/api/support/context?${qs.toString()}`,{cache:"no-store"});
        if(!r.ok||stopped)return;
        const sig=signatureForPayload(await r.json());
        if(last.current===null)last.current=sig;
        else if(last.current!==sig){last.current=sig;router.refresh();}
        await markRead();
        window.dispatchEvent(new Event("sepulchria:ticket-notifications-changed"));
      }finally{busy.current=false;}
    }
    void tick();
    const id=window.setInterval(()=>void tick(),2000);
    const focus=()=>void tick();
    window.addEventListener("focus",focus);
    return()=>{stopped=true;window.clearInterval(id);window.removeEventListener("focus",focus);};
  },[admin,reference,router]);
  return null;
}
