"use client";

import { useActionState,useCallback,useEffect,useMemo,useState,useTransition } from "react";
import { openPortalModal } from "@/components/portal/portal-modal-button";
import { MechanicalFeatPanel } from "./MechanicalFeatPanel";
import { createNpc,loadNpcControlData,sendNpcMessage,type NpcControlData,updateNpc } from "../npc-actions";
import {
  loadNpcMechanicsData,
  npcWarpShape,
  npcActivateRoomGift,
  npcUseRoomGift,
  npcUseRoomItem,
  npcSendRoomAttributeCheck,
  npcStartAttributeOpposedAction,
  npcStartUnarmedAttack,
  npcStartWeaponOpposedAttack,
  loadNpcPendingResponses,
  npcCounterOpposedAction,
  npcResolveIncomingShape,
  npcResolveIncomingDispel,
} from "../npc-mechanics-actions";
import { activateRoomGift,useRoomGift,useRoomItem,sendRoomAttributeCheck } from "../actions";
import { startAttributeOpposedAction,startUnarmedAttack,startWeaponOpposedAttack } from "../opposed-actions";

const EMPTY:NpcControlData={npcs:[],races:[],orders:[]};
function NpcTargetButtons({targets,selected,onSelect,allowSelf=false,selfId=""}:{targets:any[];selected:string;onSelect:(id:string)=>void;allowSelf?:boolean;selfId?:string}){
  const cls=(active:boolean)=>[
    "border px-3 py-2 text-[9px] transition",
    active
      ? "border-[rgb(var(--sep-skin-c1))] bg-[rgb(var(--sep-skin-c1))]/25 text-[rgb(var(--sep-skin-c2))] shadow-[inset_0_0_0_2px_rgb(var(--sep-skin-c1)),0_0_10px_rgb(var(--sep-skin-c1)/0.25)]"
      : "border-[rgb(var(--sep-colour-60482e))]/55",
  ].join(" ");
  return <div className="mt-2 flex flex-wrap gap-2">
    {allowSelf&&selfId?<button type="button" aria-pressed={selected===selfId} onClick={()=>onSelect(selected===selfId?"":selfId)} className={cls(selected===selfId)}>{selected===selfId?"✓ ":""}Self</button>:null}
    {targets.map((t:any)=><button key={t.id} type="button" aria-pressed={selected===t.id} onClick={()=>onSelect(selected===t.id?"":t.id)} className={cls(selected===t.id)}>{selected===t.id?"✓ ":""}{t.display_name}</button>)}
  </div>;
}

function NpcMultiTargetButtons({targets,selected,onChange,maxTargets,allowSelf=false,selfId=""}:{targets:any[];selected:string[];onChange:(ids:string[])=>void;maxTargets:number;allowSelf?:boolean;selfId?:string}){
  const cls=(active:boolean)=>[
    "border px-3 py-2 text-[9px] transition",
    active
      ? "border-[rgb(var(--sep-skin-c1))] bg-[rgb(var(--sep-skin-c1))]/25 text-[rgb(var(--sep-skin-c2))] shadow-[inset_0_0_0_2px_rgb(var(--sep-skin-c1)),0_0_10px_rgb(var(--sep-skin-c1)/0.25)]"
      : "border-[rgb(var(--sep-colour-60482e))]/55",
  ].join(" ");

  const toggle=(id:string)=>{
    if(selected.includes(id)){
      onChange(selected.filter(x=>x!==id));
      return;
    }
    onChange([...selected,id].slice(-Math.max(1,maxTargets)));
  };

  return <div className="mt-2 flex flex-wrap gap-2">
    {allowSelf&&selfId?<button type="button" aria-pressed={selected.includes(selfId)} onClick={()=>toggle(selfId)} className={cls(selected.includes(selfId))}>{selected.includes(selfId)?"✓ ":""}Self</button>:null}
    {targets.map((t:any)=><button key={t.id} type="button" aria-pressed={selected.includes(t.id)} onClick={()=>toggle(t.id)} className={cls(selected.includes(t.id))}>{selected.includes(t.id)?"✓ ":""}{t.display_name}</button>)}
  </div>;
}
const NPC_COUNTER_LABELS:Record<string,string>={
  dodge:"Dodge — Reflexes",defend:"Defend — Vigour",
  resist_vigour:"Resist — Vigour",resist_vigor:"Resist — Vigour",
  resist_shrewd:"Resist — Shrewd",resist_brains:"Resist — Brains",resist_presence:"Resist — Presence",
};
const NPC_COUNTER_ATTR:Record<string,string>={
  dodge:"reflexes",defend:"vigor",resist_vigour:"vigor",resist_vigor:"vigor",
  resist_shrewd:"shrewd",resist_brains:"brains",resist_presence:"presence_score",
};

function NpcIncomingResponses({npcId,actorCharacterId,roomId}:{npcId:string;actorCharacterId:string;roomId:string}){
  const [data,setData]=useState<any>({ok:true,attributes:null,opposed:[],shapes:[],dispels:[]});
  const [opposedState,opposedAction]=useActionState(npcCounterOpposedAction,{ok:false,message:""});
  const [shapeState,shapeAction]=useActionState(npcResolveIncomingShape,{ok:false,message:""});
  const [dispelState,dispelAction]=useActionState(npcResolveIncomingDispel,{ok:false,message:""});

  const reload=useCallback(async()=>setData(await loadNpcPendingResponses({npcId,roomId})),[npcId,roomId]);
  useEffect(()=>{void reload();const timer=window.setInterval(()=>void reload(),2500);return()=>window.clearInterval(timer);},[reload,opposedState.submittedAt,shapeState.submittedAt,dispelState.submittedAt]);

  const mod=(key:string)=>{const n=Number(data.attributes?.[NPC_COUNTER_ATTR[key]]??0);return `${n>=0?"+":""}${n}`;};
  if(!data.opposed?.length&&!data.shapes?.length&&!data.dispels?.length)return null;

  return <div className="mt-3 space-y-2 border-t border-[rgb(var(--sep-colour-60482e))]/35 pt-3">
    <p className="text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-b99765))]">Incoming Reactions</p>
    {data.opposed?.map((entry:any)=>{
      const attacker=Array.isArray(entry.attacker)?entry.attacker[0]:entry.attacker;
      return <section key={entry.id} className="border border-[rgb(var(--sep-colour-986a37))]/60 bg-[rgb(var(--sep-colour-20140c))] p-3">
        <p className="font-serif text-sm text-[rgb(var(--sep-colour-efd2a0))]">{attacker?.display_name??"Someone"} — {entry.action_label}</p>
        <p className="mt-1 text-[9px] text-[rgb(var(--sep-colour-a18d6e))]">Action total: {entry.attack_total}</p>
        <form action={opposedAction} className="mt-2 flex flex-wrap gap-2">
          <input type="hidden" name="npc_actor_character_id" value={actorCharacterId}/>
          <input type="hidden" name="opposed_action_id" value={entry.id}/>
          {(entry.allowed_counters??[]).map((counter:string)=><button key={counter} type="submit" name="counter_kind" value={counter} className="border border-[rgb(var(--sep-colour-765937))] px-3 py-2 text-[8px] uppercase">{NPC_COUNTER_LABELS[counter]??counter} ({mod(counter)})</button>)}
          <button type="submit" name="counter_kind" value="__do_nothing__" className="border border-[rgb(var(--sep-colour-765937))] px-3 py-2 text-[8px] uppercase">Do nothing</button>
        </form>
      </section>;
    })}
    {data.shapes?.map((entry:any)=><section key={entry.id} className="border border-[rgb(var(--sep-colour-765937))] bg-[rgb(var(--sep-colour-20140c))] p-3">
      <p className="font-serif text-sm text-[rgb(var(--sep-colour-efd2a0))]">{entry.casterName} — {entry.name}</p>
      <p className="mt-1 text-[9px] text-[rgb(var(--sep-colour-a18d6e))]">Incoming {entry.kind}</p>
      <form action={shapeAction} className="mt-2 flex flex-wrap gap-2">
        <input type="hidden" name="npc_actor_character_id" value={actorCharacterId}/>
        <input type="hidden" name="shape_cast_target_id" value={entry.id}/>
        {(entry.saveOptions??[]).map((save:string)=><button key={save} type="submit" name="save_choice" value={save} className="border border-[rgb(var(--sep-colour-765937))] px-3 py-2 text-[8px] uppercase">{NPC_COUNTER_LABELS[save]??save} ({mod(save)})</button>)}
        <button type="submit" name="save_choice" value="__do_nothing__" className="border border-[rgb(var(--sep-colour-765937))] px-3 py-2 text-[8px] uppercase">Do nothing</button>
      </form>
    </section>)}
    {data.dispels?.map((entry:any)=><section key={entry.id} className="border border-[rgb(var(--sep-colour-765937))] bg-[rgb(var(--sep-colour-20140c))] p-3">
      <p className="font-serif text-sm text-[rgb(var(--sep-colour-efd2a0))]">{entry.casterName} — {entry.name}</p>
      <p className="mt-1 text-[9px] text-[rgb(var(--sep-colour-a18d6e))]">Incoming Dispel</p>
      <form action={dispelAction} className="mt-2 flex flex-wrap gap-2">
        <input type="hidden" name="npc_actor_character_id" value={actorCharacterId}/>
        <input type="hidden" name="dispel_cast_id" value={entry.id}/>
        {(entry.saveOptions??[]).map((save:string)=><button key={save} type="submit" name="save_choice" value={save} className="border border-[rgb(var(--sep-colour-765937))] px-3 py-2 text-[8px] uppercase">{NPC_COUNTER_LABELS[save]??save} ({mod(save)})</button>)}
        <button type="submit" name="save_choice" value="__do_nothing__" className="border border-[rgb(var(--sep-colour-765937))] px-3 py-2 text-[8px] uppercase">Do nothing</button>
      </form>
    </section>)}
  </div>;
}



export function NpcControlPanel({roomId}:{roomId:string}){
  const [data,setData]=useState<NpcControlData>(EMPTY);
  const [selectedId,setSelectedId]=useState("");
  const [creating,setCreating]=useState(false);
  const [editorOpen,setEditorOpen]=useState(false);
  const [name,setName]=useState(""); const [pronouns,setPronouns]=useState("");
  const [portraitUrl,setPortraitUrl]=useState(""); const [description,setDescription]=useState("");
  const [raceId,setRaceId]=useState(""); const [orderId,setOrderId]=useState(""); const [active,setActive]=useState(true); const [locationActive,setLocationActive]=useState(true);
  const [postText,setPostText]=useState(""); const [status,setStatus]=useState("");
  const [pending,startTransition]=useTransition();
  const [mechanics,setMechanics]=useState<any>({ok:false,gifts:[],items:[],shapes:[],targets:[]});
  const [mechanicsMode,setMechanicsMode]=useState<"attribute"|"feat"|"item"|"shape"|"combat"|null>(null);
  const [mechanicsStatus,setMechanicsStatus]=useState("");
  const [selectedGift,setSelectedGift]=useState("");
  const [selectedItem,setSelectedItem]=useState("");
  const [selectedShape,setSelectedShape]=useState("");
  const [mechanicsTarget,setMechanicsTarget]=useState("");
  const [shapeTargets,setShapeTargets]=useState<string[]>([]);
  const [shapeWritten,setShapeWritten]=useState("");
  const [attributeAction,setAttributeAction]=useState("use_muscles");
  const [featState,featAction]=useActionState(npcUseRoomGift,{ok:false,message:""});
  const [activateFeatState,activateFeatAction]=useActionState(npcActivateRoomGift,{ok:false,message:""});
  const [itemState,itemAction]=useActionState(npcUseRoomItem,{ok:false,message:""});
  const [attributeState,attributeServerAction]=useActionState(npcSendRoomAttributeCheck,{ok:false,message:""});
  const [opposedState,opposedAction]=useActionState(npcStartAttributeOpposedAction,{ok:false,message:""});
  const [unarmedState,unarmedAction]=useActionState(npcStartUnarmedAttack,{ok:false,message:""});
  const [weaponState,weaponAction]=useActionState(npcStartWeaponOpposedAttack,{ok:false,message:""});

  const selected=useMemo(()=>data.npcs.find(n=>n.id===selectedId)??null,[data.npcs,selectedId]);
  const inThisRoom=selected?.current_room_id===roomId;

  const loadMechanics=useCallback(async()=>{
    if(!selected||!inThisRoom||!selected.character_id){
      setMechanics({ok:false,gifts:[],items:[],shapes:[],targets:[]});
      return;
    }
    const next=await loadNpcMechanicsData({npcId:selected.id,roomId});
    setMechanics(next);
    if(next.ok){
      setSelectedGift(next.gifts?.[0]?.characterGiftId??"");
      setSelectedItem(next.items?.[0]?.record_id??"");
      setSelectedShape(next.shapes?.[0]?.id??"");
      setMechanicsTarget("");
      setShapeTargets([]);
      setMechanicsStatus("");
    }else{
      setMechanicsStatus(next.message??"Unable to load NPC mechanics.");
    }
  },[selected?.id,inThisRoom,roomId]);

  useEffect(()=>{void loadMechanics();},[loadMechanics]);

  const refresh=useCallback(async()=>{
    const next=await loadNpcControlData(roomId);
    setData(next);
    setSelectedId(current=>current&&next.npcs.some(n=>n.id===current)?current:(next.npcs.find(n=>n.current_room_id===roomId&&n.is_active)?.id??next.npcs[0]?.id??""));
  },[roomId]);

  useEffect(()=>{void refresh();},[refresh]);

  useEffect(()=>{
    if(creating||!selected)return;
    setName(selected.name);setPronouns(selected.pronouns??"");setPortraitUrl(selected.portrait_url??"");
    setDescription(selected.description??"");setRaceId(selected.race_id??"");setOrderId(selected.order_id??"");setActive(selected.is_active);setLocationActive(selected.is_location_active);
  },[creating,selected]);

  function beginCreate(){
    setCreating(true);setEditorOpen(true);setName("");setPronouns("");setPortraitUrl("");
    setDescription("");setRaceId("");setOrderId("");setActive(true);setLocationActive(true);setStatus("");
  }
  function beginEdit(){
    if(!selected)return;
    setCreating(false);setName(selected.name);setPronouns(selected.pronouns??"");setPortraitUrl(selected.portrait_url??"");
    setDescription(selected.description??"");setRaceId(selected.race_id??"");setOrderId(selected.order_id??"");setActive(selected.is_active);setLocationActive(selected.is_location_active);
    setEditorOpen(true);setStatus("");
  }
  function closeEditor(){setEditorOpen(false);setCreating(false);}
  function save(){
    startTransition(async()=>{
      const result=creating
        ? await createNpc({roomId,name,pronouns,portraitUrl,description,raceId,orderId})
        : selected
          ? await updateNpc({npcId:selected.id,roomId,name,pronouns,portraitUrl,description,raceId,orderId,isActive:active,isLocationActive:locationActive,moveHere:selected.current_room_id!==roomId})
          : {ok:false,message:"Select an NPC."};
      setStatus(result.message);
      if(result.ok){
        setEditorOpen(false);setCreating(false);
        await refresh();
      }
    });
  }
  function post(){
    if(!selected)return;
    startTransition(async()=>{
      const result=await sendNpcMessage({roomId,npcId:selected.id,message:postText});
      setStatus(result.message);
      if(result.ok)setPostText("");
    });
  }

  const inputClass="mt-1 block w-full border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-100c09))] px-2.5 py-2 text-[10px] normal-case tracking-normal text-[rgb(var(--sep-colour-d6c4a8))]";
  const buttonClass="border border-[rgb(var(--sep-colour-60482e))]/55 px-3 py-2 text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-c4a675))]";

  return <div className="space-y-3">
    <div className="flex flex-wrap items-center gap-2">
      <select value={selectedId} onChange={e=>{setSelectedId(e.target.value);setStatus("");setMechanicsMode(null);}} className="min-w-[220px] flex-1 border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-[10px] text-[rgb(var(--sep-colour-d6c4a8))]">
        <option value="">Select NPC</option>
        {data.npcs.map(n=><option key={n.id} value={n.id}>{n.name}{n.current_room_id===roomId?" — here":n.current_room_name?` — ${n.current_room_name}`:" — no location"}{!n.is_active?" — inactive":""}</option>)}
      </select>
      {selected?<button type="button" onClick={beginEdit} className={buttonClass}>Edit NPC</button>:null}
      <button type="button" onClick={beginCreate} className={buttonClass}>New NPC</button>
    </div>

    {selected&&<div className="flex flex-wrap items-center gap-2 text-[9px] text-[rgb(var(--sep-colour-8f8170))]">
      <span>{selected.name}</span><span>·</span><span>{selected.race?.name??"No Ancestry"}</span>
      {selected.order?.name?<><span>·</span><span>{selected.order.name}</span></>:null}
      <span>·</span><span>{inThisRoom?"Present here":selected.current_room_name??"No location"}</span>
    </div>}

    {!selected?<p className="text-[9px] text-[rgb(var(--sep-colour-8f8170))]">Select an NPC to use its actions.</p>:null}

    {selected&&selected.character_id&&inThisRoom&&<div className="border-t border-[rgb(var(--sep-colour-60482e))]/35 pt-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-b99765))]">NPC Actions</p>
        <button type="button" onClick={()=>void loadMechanics()} className={buttonClass}>Refresh assigned mechanics</button>
      </div>

      {!mechanics.ok&&mechanicsStatus?<p className="mb-2 text-[9px] text-red-300">{mechanicsStatus}</p>:null}

      <div className="flex flex-wrap gap-2">
        {(["attribute","feat","item","shape","combat"] as const).map(m=><button key={m} type="button" onClick={()=>{setMechanicsMode(mechanicsMode===m?null:m);setMechanicsStatus("");}} className={buttonClass}>{m}</button>)}
      </div>

      {mechanicsMode==="attribute"&&<div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <select value={attributeAction} onChange={e=>setAttributeAction(e.target.value)} className={inputClass}>
          <option value="use_muscles">Use Muscles</option><option value="use_reflexes">Use Reflexes</option><option value="use_brains">Use Brains</option><option value="use_shrewd">Use Shrewd</option><option value="use_presence">Use Presence</option>
        </select>
        <NpcTargetButtons targets={mechanics.targets??[]} selected={mechanicsTarget} onSelect={setMechanicsTarget}/>
        <form action={mechanicsTarget?opposedAction:attributeServerAction}>
          <input type="hidden" name="npc_actor_character_id" value={selected.character_id??""}/>
          {mechanicsTarget
            ? <><input type="hidden" name="opposed_action" value={attributeAction}/><input type="hidden" name="opposed_target_character_id" value={mechanicsTarget}/></>
            : <><input type="hidden" name="check_key" value={attributeAction}/><input type="hidden" name="client_nonce" value={selected.id+"-"+attributeAction+"-"+Date.now()}/></>}
          <button className="mt-1 border border-[rgb(var(--sep-colour-8d6d3e))]/70 px-3 py-2 text-[8px] uppercase">Roll</button>
        </form>
      </div>}

      {mechanicsMode==="feat"&&<div className="mt-3">
        <select value={selectedGift} onChange={e=>{setSelectedGift(e.target.value);setMechanicsTarget("");}} className={inputClass}>
          <option value="">{mechanics.gifts?.length?"Choose Feat":"No Feats assigned"}</option>
          {mechanics.gifts?.map((g:any)=><option key={g.characterGiftId} value={g.characterGiftId}>{g.name} · {g.effectMode??g.effect_mode}</option>)}
        </select>

        {(()=>{
          const g=mechanics.gifts?.find((x:any)=>x.characterGiftId===selectedGift);
          if(!g)return null;

          if(g.mechanicsShape && (g.effectMode??g.effect_mode)!=="passive"){
            return <form className="mt-2">
              <input type="hidden" name="character_gift_id" value={g.characterGiftId}/>
              <input type="hidden" name="npc_actor_character_id" value={selected.character_id??""}/>
              <MechanicalFeatPanel
                gift={g}
                viewerCharacterId={selected.character_id??""}
                presentCharacters={mechanics.targets??[]}
                actorCharacterId={selected.character_id??""}
                onResolved={loadMechanics}
              />
            </form>;
          }

          const targetMode=g.targetMode??g.target_mode??"self";

          return <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]">
            {targetMode==="self"
              ? <p className="mt-2 text-[9px] text-[rgb(var(--sep-colour-9e8b70))]">Target: Self</p>
              : <NpcTargetButtons
                  targets={mechanics.targets??[]}
                  selected={mechanicsTarget}
                  onSelect={setMechanicsTarget}
                  allowSelf={targetMode==="either"}
                  selfId={selected.character_id??""}
                />}

            <form action={(g.effectMode??g.effect_mode)==="temporary"?activateFeatAction:featAction}>
              <input type="hidden" name="npc_actor_character_id" value={selected.character_id??""}/>
              <input type="hidden" name="character_gift_id" value={g.characterGiftId}/>
              <input type="hidden" name="gift_target_character_id" value={mechanicsTarget===selected.character_id?"":mechanicsTarget}/>
              <button
                disabled={targetMode==="other"&&!mechanicsTarget}
                className="mt-1 border border-[rgb(var(--sep-colour-8d6d3e))]/70 px-3 py-2 text-[8px] uppercase disabled:opacity-40"
              >
                {(g.effectMode??g.effect_mode)==="passive"
                  ?"Show Feat"
                  :(g.effectMode??g.effect_mode)==="temporary"
                    ?"Activate Feat"
                    :"Use Feat"}
              </button>
            </form>
          </div>;
        })()}
      </div>}

      {mechanicsMode==="item"&&<div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <select value={selectedItem} onChange={e=>setSelectedItem(e.target.value)} className={inputClass}>
          <option value="">{mechanics.items?.length?"Choose Item":"No Items assigned"}</option>
          {mechanics.items?.map((i:any)=><option key={`${i.record_kind}:${i.record_id}`} value={i.record_id}>{i.name}{i.is_equipped?` · equipped ${i.equipped_slot??""}`:""}{!i.is_usable?" · not usable":""}</option>)}
        </select>
        {(()=>{const i=mechanics.items?.find((x:any)=>x.record_id===selectedItem);if(!i||i.target_mode==="self")return <p className="mt-2 text-[9px] text-[rgb(var(--sep-colour-9e8b70))]">Target: Self</p>;return <NpcTargetButtons targets={mechanics.targets??[]} selected={mechanicsTarget} onSelect={setMechanicsTarget} allowSelf={i.target_mode==="either"} selfId={selected.character_id??""}/>;})()}
        <form action={itemAction}>
          {(()=>{const i=mechanics.items?.find((x:any)=>x.record_id===selectedItem);return <>
            <input type="hidden" name="npc_actor_character_id" value={selected.character_id??""}/>
            <input type="hidden" name="item_record_kind" value={i?.record_kind??""}/>
            <input type="hidden" name="item_record_id" value={i?.record_id??""}/>
            <input type="hidden" name="item_target_character_id" value={mechanicsTarget===selected.character_id?"":mechanicsTarget}/>
          </>})()}
          <button disabled={!selectedItem||!mechanics.items?.find((x:any)=>x.record_id===selectedItem)?.is_usable} className="mt-1 border border-[rgb(var(--sep-colour-8d6d3e))]/70 px-3 py-2 text-[8px] uppercase disabled:opacity-40">Use Item</button>
        </form>
      </div>}

      {mechanicsMode==="shape"&&<div className="mt-3 grid gap-2">
        <select value={selectedShape} onChange={e=>{setSelectedShape(e.target.value);setMechanicsTarget("");setShapeTargets([]);setShapeWritten("");}} className={inputClass}>
          <option value="">{mechanics.shapes?.length?"Choose Shape":"No Shapes assigned"}</option>
          {mechanics.shapes?.map((x:any)=><option key={x.id} value={x.id}>{x.name} · Level {x.level}</option>)}
        </select>
        {(()=>{
          const sh=mechanics.shapes?.find((x:any)=>x.id===selectedShape);
          if(!sh)return null;
          if(sh.target_mode==="written")return <input value={shapeWritten} onChange={e=>setShapeWritten(e.target.value)} placeholder="Written / Fate target" className={inputClass}/>;
          if(sh.target_mode==="self")return <p className="mt-2 text-[9px] text-[rgb(var(--sep-colour-9e8b70))]">Target: Self · automatic</p>;

          const allowSelf=sh.target_mode==="either"||sh.allow_self===true;
          const multiple=sh.target_scope==="multiple";
          const maxTargets=multiple?Math.max(1,Number(sh.max_targets??1)):1;

          return multiple
            ? <NpcMultiTargetButtons targets={mechanics.targets??[]} selected={shapeTargets} onChange={setShapeTargets} maxTargets={maxTargets} allowSelf={allowSelf} selfId={selected.character_id??""}/>
            : <NpcTargetButtons targets={mechanics.targets??[]} selected={mechanicsTarget} onSelect={setMechanicsTarget} allowSelf={allowSelf} selfId={selected.character_id??""}/>;
        })()}
        <button type="button" disabled={!selectedShape||pending} onClick={()=>startTransition(async()=>{const r=await npcWarpShape({npcId:selected.id,roomId,shapeId:selectedShape,targetIds:(mechanics.shapes?.find((x:any)=>x.id===selectedShape)?.target_scope==="multiple")?shapeTargets:(mechanicsTarget?[mechanicsTarget]:[]),writtenTarget:shapeWritten});setMechanicsStatus(r.message);})} className="border border-[rgb(var(--sep-colour-8d6d3e))]/70 px-3 py-2 text-[8px] uppercase disabled:opacity-40">Warp Shape</button>
      </div>}

      {mechanicsMode==="combat"&&<div className="mt-3 grid gap-2">
        <NpcTargetButtons targets={mechanics.targets??[]} selected={mechanicsTarget} onSelect={setMechanicsTarget}/>
        <div className="flex flex-wrap gap-2">
          <form action={unarmedAction}>
            <input type="hidden" name="npc_actor_character_id" value={selected.character_id??""}/>
            <input type="hidden" name="opposed_target_character_id" value={mechanicsTarget}/>
            <button disabled={!mechanicsTarget} className="border border-[rgb(var(--sep-colour-8d6d3e))]/70 px-3 py-2 text-[8px] uppercase disabled:opacity-40">Unarmed Attack</button>
          </form>
          {mechanics.items?.filter((i:any)=>i.category_slug==="weapon"&&i.is_equipped&&["main_hand","off_hand"].includes(String(i.equipped_slot??""))).map((i:any)=><form key={`${i.record_kind}:${i.record_id}`} action={weaponAction}>
            <input type="hidden" name="npc_actor_character_id" value={selected.character_id??""}/>
            <input type="hidden" name="item_record_kind" value={i.record_kind}/>
            <input type="hidden" name="item_record_id" value={i.record_id}/>
            <input type="hidden" name="opposed_target_character_id" value={mechanicsTarget}/>
            <button disabled={!mechanicsTarget} className="border border-[rgb(var(--sep-colour-8d6d3e))]/70 px-3 py-2 text-[8px] uppercase disabled:opacity-40">Attack with {i.name}</button>
          </form>)}
        </div>
      </div>}

      {[attributeState,opposedState,featState,activateFeatState,itemState,unarmedState,weaponState].map((x:any)=>x?.message).filter(Boolean).slice(-1).map((m:string)=><p key={m} className="mt-2 text-[9px] text-[rgb(var(--sep-colour-c6ad86))]">{m}</p>)}
      {mechanicsStatus&&<p className="mt-2 text-[9px] text-[rgb(var(--sep-colour-c6ad86))]">{mechanicsStatus}</p>}
    </div>}

    {selected&&selected.character_id&&inThisRoom&&selected.is_location_active?<NpcIncomingResponses npcId={selected.id} actorCharacterId={selected.character_id} roomId={roomId}/>:null}

    {selected&&<div className="border-t border-[rgb(var(--sep-colour-60482e))]/35 pt-3">
      <p className="mb-2 text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-b99765))]">Post as {selected.name}</p>
      <textarea value={postText} disabled={pending||!selected.is_active||!inThisRoom} onChange={e=>setPostText(e.target.value)} rows={3} placeholder={!selected.is_active?"Activate this NPC first.":!inThisRoom?"Bring this NPC to this Location first.":`Write as ${selected.name}...`} className="block w-full resize-y border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-[11px] text-[rgb(var(--sep-colour-d6c4a8))] disabled:opacity-45"/>
      <div className="mt-2 flex justify-end"><button type="button" disabled={pending||!postText.trim()||!selected.is_active||!inThisRoom} onClick={post} className="border border-[rgb(var(--sep-colour-8d6d3e))]/70 bg-[rgb(var(--sep-colour-21190f))] px-4 py-2 text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-d8bf91))] disabled:opacity-40">Post as NPC</button></div>
    </div>}

    {status&&<p className="text-[9px] text-[rgb(var(--sep-colour-c6ad86))]">{status}</p>}

    {editorOpen?<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4" onMouseDown={e=>{if(e.target===e.currentTarget)closeEditor();}}>
      <div role="dialog" aria-modal="true" aria-label={creating?"Create NPC":`Edit ${selected?.name??"NPC"}`} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto border border-[rgb(var(--sep-colour-80613c))]/70 bg-[rgb(var(--sep-colour-120d0a))] p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between gap-3 border-b border-[rgb(var(--sep-colour-60482e))]/35 pb-3">
          <div>
            <p className="text-[8px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-8c704b))]">NPC Administration</p>
            <h3 className="mt-1 font-serif text-2xl text-[rgb(var(--sep-colour-dfc79c))]">{creating?"Create NPC":`Edit ${selected?.name??"NPC"}`}</h3>
          </div>
          <button type="button" onClick={closeEditor} className={buttonClass}>Close</button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-8f8170))]">Name<input value={name} onChange={e=>setName(e.target.value)} className={inputClass}/></label>
          <label className="text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-8f8170))]">Ancestry<select value={raceId} onChange={e=>setRaceId(e.target.value)} className={inputClass}><option value="">None</option>{data.races.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
          <label className="text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-8f8170))]">Order<select value={orderId} onChange={e=>setOrderId(e.target.value)} className={inputClass}><option value="">None</option>{data.orders.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></label>
          <label className="text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-8f8170))]">Pronouns<input value={pronouns} onChange={e=>setPronouns(e.target.value)} className={inputClass}/></label>
          <label className="text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-8f8170))] sm:col-span-2">Portrait URL<input value={portraitUrl} onChange={e=>setPortraitUrl(e.target.value)} className={inputClass}/></label>
        </div>

        <label className="mt-3 block text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-8f8170))]">Description<textarea value={description} onChange={e=>setDescription(e.target.value)} rows={4} className={inputClass+" resize-y"}/></label>

        {!creating?<div className="mt-3 flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-[8px] uppercase"><input type="checkbox" checked={active} onChange={e=>setActive(e.target.checked)}/>NPC record active</label>
          <label className="flex items-center gap-2 text-[8px] uppercase"><input type="checkbox" checked={locationActive} onChange={e=>setLocationActive(e.target.checked)}/>Active in Locations</label>
        </div>:null}

        {!creating&&selected?.character_id?<div className="mt-4 flex flex-wrap gap-2 border-t border-[rgb(var(--sep-colour-60482e))]/30 pt-3">
          <button type="button" onClick={()=>openPortalModal({label:`Manage ${selected.name}`,title:`Manage ${selected.name}`,icon:selected.portrait_url??"/icons/characters.png",href:`/admin/characters/${selected.character_id}`})} className={buttonClass}>Stats & Feats</button>
          <button type="button" onClick={()=>openPortalModal({label:`${selected.name} · Items`,title:`${selected.name} · Items`,icon:selected.portrait_url??"/icons/characters.png",href:`/admin/characters/${selected.character_id}/inventory`})} className={buttonClass}>Items</button>
          <button type="button" onClick={()=>openPortalModal({label:`${selected.name} · Shapes`,title:`${selected.name} · Shapes`,icon:selected.portrait_url??"/icons/characters.png",href:`/admin/characters/${selected.character_id}/warping`})} className={buttonClass}>Shapes</button>
        </div>:null}

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={closeEditor} className={buttonClass}>Cancel</button>
          <button type="button" disabled={pending} onClick={save} className="border border-[rgb(var(--sep-colour-8d6d3e))]/70 bg-[rgb(var(--sep-colour-21190f))] px-4 py-2 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-d8bf91))] disabled:opacity-40">{creating?"Create in this Location":inThisRoom?"Save NPC":"Save & Bring Here"}</button>
        </div>
      </div>
    </div>:null}
  </div>;
}
