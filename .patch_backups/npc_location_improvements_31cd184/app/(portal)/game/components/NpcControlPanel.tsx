"use client";

import { useCallback,useEffect,useMemo,useState,useTransition } from "react";
import { createNpc,loadNpcControlData,sendNpcMessage,type NpcControlData,updateNpc } from "../npc-actions";

const EMPTY:NpcControlData={npcs:[],races:[]};

export function NpcControlPanel({roomId}:{roomId:string}){
  const [data,setData]=useState<NpcControlData>(EMPTY);
  const [selectedId,setSelectedId]=useState("");
  const [creating,setCreating]=useState(false);
  const [name,setName]=useState(""); const [pronouns,setPronouns]=useState("");
  const [portraitUrl,setPortraitUrl]=useState(""); const [description,setDescription]=useState("");
  const [raceId,setRaceId]=useState(""); const [active,setActive]=useState(true);
  const [postText,setPostText]=useState(""); const [status,setStatus]=useState("");
  const [pending,startTransition]=useTransition();
  const selected=useMemo(()=>data.npcs.find(n=>n.id===selectedId)??null,[data.npcs,selectedId]);
  const inThisRoom=selected?.current_room_id===roomId;

  const refresh=useCallback(async()=>{
    const next=await loadNpcControlData(roomId); setData(next);
    setSelectedId(current=>current&&next.npcs.some(n=>n.id===current)?current:(next.npcs.find(n=>n.current_room_id===roomId&&n.is_active)?.id??next.npcs[0]?.id??""));
  },[roomId]);
  useEffect(()=>{void refresh();},[refresh]);
  useEffect(()=>{if(creating||!selected)return;setName(selected.name);setPronouns(selected.pronouns??"");setPortraitUrl(selected.portrait_url??"");setDescription(selected.description??"");setRaceId(selected.race_id??"");setActive(selected.is_active);},[creating,selected]);

  function beginCreate(){setCreating(true);setSelectedId("");setName("");setPronouns("");setPortraitUrl("");setDescription("");setRaceId("");setActive(true);setPostText("");setStatus("");}
  function save(){startTransition(async()=>{const result=creating?await createNpc({roomId,name,pronouns,portraitUrl,description,raceId}):selected?await updateNpc({npcId:selected.id,roomId,name,pronouns,portraitUrl,description,raceId,isActive:active,moveHere:selected.current_room_id!==roomId}):{ok:false,message:"Select an NPC."};setStatus(result.message);if(result.ok){setCreating(false);await refresh();}});}
  function post(){if(!selected)return;startTransition(async()=>{const result=await sendNpcMessage({roomId,npcId:selected.id,message:postText});setStatus(result.message);if(result.ok)setPostText("");});}

  const inputClass="mt-1 block w-full border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-100c09))] px-2.5 py-2 text-[10px] normal-case tracking-normal text-[rgb(var(--sep-colour-d6c4a8))]";
  return <div className="space-y-3">
    <div className="flex flex-wrap items-center gap-2">
      <select value={creating?"":selectedId} onChange={e=>{setCreating(false);setSelectedId(e.target.value);setStatus("");}} className="min-w-[220px] flex-1 border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-[10px] text-[rgb(var(--sep-colour-d6c4a8))]">
        <option value="">Select NPC</option>
        {data.npcs.map(n=><option key={n.id} value={n.id}>{n.name}{n.current_room_id===roomId?" — here":n.current_room_name?` — ${n.current_room_name}`:" — no location"}{!n.is_active?" — inactive":""}</option>)}
      </select>
      <button type="button" onClick={beginCreate} className="border border-[rgb(var(--sep-colour-60482e))]/55 px-3 py-2 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-c4a675))]">New NPC</button>
    </div>
    {(creating||selected)&&<>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-8f8170))]">Name<input value={name} onChange={e=>setName(e.target.value)} className={inputClass}/></label>
        <label className="text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-8f8170))]">Ancestry<select value={raceId} onChange={e=>setRaceId(e.target.value)} className={inputClass}><option value="">None</option>{data.races.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
        <label className="text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-8f8170))]">Pronouns<input value={pronouns} onChange={e=>setPronouns(e.target.value)} className={inputClass}/></label>
        <label className="text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-8f8170))]">Portrait URL<input value={portraitUrl} onChange={e=>setPortraitUrl(e.target.value)} className={inputClass}/></label>
      </div>
      <label className="block text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-8f8170))]">Description<textarea value={description} onChange={e=>setDescription(e.target.value)} rows={2} className={inputClass+" resize-y"}/></label>
      {!creating&&<label className="flex items-center gap-2 text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-8f8170))]"><input type="checkbox" checked={active} onChange={e=>setActive(e.target.checked)}/>Active</label>}
      <div className="flex flex-wrap items-center gap-2"><button type="button" disabled={pending} onClick={save} className="border border-[rgb(var(--sep-colour-8d6d3e))]/70 bg-[rgb(var(--sep-colour-21190f))] px-3 py-2 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-d8bf91))] disabled:opacity-40">{creating?"Create in this Location":inThisRoom?"Save NPC":"Save & Bring Here"}</button></div>
    </>}
    {!creating&&selected&&<div className="border-t border-[rgb(var(--sep-colour-60482e))]/35 pt-3">
      <p className="mb-2 text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-b99765))]">Post as {selected.name}</p>
      <textarea value={postText} disabled={pending||!selected.is_active||!inThisRoom} onChange={e=>setPostText(e.target.value)} rows={3} placeholder={!selected.is_active?"Activate this NPC first.":!inThisRoom?"Bring this NPC to this Location first.":`Write as ${selected.name}...`} className="block w-full resize-y border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-[11px] text-[rgb(var(--sep-colour-d6c4a8))] disabled:opacity-45"/>
      <div className="mt-2 flex justify-end"><button type="button" disabled={pending||!postText.trim()||!selected.is_active||!inThisRoom} onClick={post} className="border border-[rgb(var(--sep-colour-8d6d3e))]/70 bg-[rgb(var(--sep-colour-21190f))] px-4 py-2 text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-d8bf91))] disabled:opacity-40">Post as NPC</button></div>
    </div>}
    {status&&<p className="text-[9px] text-[rgb(var(--sep-colour-c6ad86))]">{status}</p>}
  </div>;
}
