"use client";

import { useActionState,useCallback,useEffect,useMemo,useState,useTransition } from "react";
import { openPortalModal } from "@/components/portal/portal-modal-button";
import { createNpc,loadNpcControlData,sendNpcMessage,type NpcControlData,updateNpc } from "../npc-actions";
import {
  loadNpcMechanicsData,npcWarpShape,
  npcActivateRoomGift,npcUseRoomGift,npcUseRoomItem,npcSendRoomAttributeCheck,
  npcStartAttributeOpposedAction,npcStartUnarmedAttack,npcStartWeaponOpposedAttack,
} from "../npc-mechanics-actions";

const EMPTY:NpcControlData={npcs:[],races:[],orders:[]};
const INITIAL={ok:false,message:""};

export function NpcControlPanel({roomId}:{roomId:string}){
  const [data,setData]=useState<NpcControlData>(EMPTY);
  const [selectedId,setSelectedId]=useState("");
  const [creating,setCreating]=useState(false);
  const [editorOpen,setEditorOpen]=useState(false);
  const [name,setName]=useState(""); const [pronouns,setPronouns]=useState("");
  const [portraitUrl,setPortraitUrl]=useState(""); const [description,setDescription]=useState("");
  const [raceId,setRaceId]=useState(""); const [orderId,setOrderId]=useState(""); const [active,setActive]=useState(true);
  const [postText,setPostText]=useState(""); const [status,setStatus]=useState("");
  const [pending,startTransition]=useTransition();
  const [mechanics,setMechanics]=useState<any>({ok:false,gifts:[],items:[],shapes:[],targets:[]});
  const [mode,setMode]=useState<"attribute"|"feat"|"item"|"shape"|"combat"|null>(null);
  const [selectedGiftId,setSelectedGiftId]=useState("");
  const [selectedItemKey,setSelectedItemKey]=useState("");
  const [selectedShapeId,setSelectedShapeId]=useState("");
  const [targetId,setTargetId]=useState("");
  const [externalTarget,setExternalTarget]=useState("");
  const [shapeWritten,setShapeWritten]=useState("");
  const [attributeAction,setAttributeAction]=useState("use_muscles");
  const [mechanicsStatus,setMechanicsStatus]=useState("");

  const [featState,featAction]=useActionState(npcUseRoomGift,INITIAL);
  const [activateFeatState,activateFeatAction]=useActionState(npcActivateRoomGift,INITIAL);
  const [itemState,itemAction]=useActionState(npcUseRoomItem,INITIAL);
  const [attributeState,attributeActionServer]=useActionState(npcSendRoomAttributeCheck,INITIAL);
  const [opposedState,opposedAction]=useActionState(npcStartAttributeOpposedAction,INITIAL);
  const [unarmedState,unarmedAction]=useActionState(npcStartUnarmedAttack,INITIAL);
  const [weaponState,weaponAction]=useActionState(npcStartWeaponOpposedAttack,INITIAL);

  const selected=useMemo(()=>data.npcs.find(n=>n.id===selectedId)??null,[data.npcs,selectedId]);
  const inThisRoom=selected?.current_room_id===roomId;

  const refresh=useCallback(async()=>{
    const next=await loadNpcControlData(roomId);setData(next);
    setSelectedId(current=>current&&next.npcs.some(n=>n.id===current)?current:(next.npcs.find(n=>n.current_room_id===roomId&&n.is_active)?.id??next.npcs[0]?.id??""));
  },[roomId]);
  useEffect(()=>{void refresh()},[refresh]);

  const loadMechanics=useCallback(async()=>{
    if(!selected||!selected.character_id||!inThisRoom){
      setMechanics({ok:false,gifts:[],items:[],shapes:[],targets:[]});return;
    }
    const next=await loadNpcMechanicsData({npcId:selected.id,roomId});
    setMechanics(next);
    if(next.ok){
      setSelectedGiftId(next.gifts?.[0]?.characterGiftId??"");
      const regular=(next.items??[]).filter((x:any)=>x.categorySlug!=="weapon");
      setSelectedItemKey(regular[0]?`${regular[0].recordKind}:${regular[0].recordId}`:"");
      setSelectedShapeId(next.shapes?.[0]?.id??"");
      setTargetId("");setExternalTarget("");setMechanicsStatus("");
    }else setMechanicsStatus(next.message??"Unable to load NPC mechanics.");
  },[selected?.id,selected?.character_id,inThisRoom,roomId]);
  useEffect(()=>{void loadMechanics()},[loadMechanics]);

  const selectedGift=useMemo(()=>mechanics.gifts?.find((g:any)=>g.characterGiftId===selectedGiftId)??mechanics.gifts?.[0]??null,[mechanics.gifts,selectedGiftId]);
  const regularItems=useMemo(()=>mechanics.items?.filter((i:any)=>i.categorySlug!=="weapon")??[],[mechanics.items]);
  const weaponItems=useMemo(()=>mechanics.items?.filter((i:any)=>i.categorySlug==="weapon"&&i.isEquipped&&["main_hand","off_hand"].includes(String(i.equippedSlot??"")))??[],[mechanics.items]);
  const selectedItem=useMemo(()=>regularItems.find((i:any)=>`${i.recordKind}:${i.recordId}`===selectedItemKey)??regularItems[0]??null,[regularItems,selectedItemKey]);
  const selectedShape=useMemo(()=>mechanics.shapes?.find((s:any)=>s.id===selectedShapeId)??mechanics.shapes?.[0]??null,[mechanics.shapes,selectedShapeId]);

  useEffect(()=>{setTargetId("");setExternalTarget("")},[selectedGiftId,selectedItemKey,selectedShapeId,attributeAction]);

  useEffect(()=>{if(creating||!selected)return;setName(selected.name);setPronouns(selected.pronouns??"");setPortraitUrl(selected.portrait_url??"");setDescription(selected.description??"");setRaceId(selected.race_id??"");setOrderId(selected.order_id??"");setActive(selected.is_active)},[creating,selected]);

  function beginCreate(){setCreating(true);setEditorOpen(true);setName("");setPronouns("");setPortraitUrl("");setDescription("");setRaceId("");setOrderId("");setActive(true);setStatus("")}
  function beginEdit(){if(!selected)return;setCreating(false);setEditorOpen(true);setName(selected.name);setPronouns(selected.pronouns??"");setPortraitUrl(selected.portrait_url??"");setDescription(selected.description??"");setRaceId(selected.race_id??"");setOrderId(selected.order_id??"");setActive(selected.is_active);setStatus("")}
  function closeEditor(){setEditorOpen(false);setCreating(false)}
  function save(){startTransition(async()=>{const result=creating?await createNpc({roomId,name,pronouns,portraitUrl,description,raceId,orderId}):selected?await updateNpc({npcId:selected.id,roomId,name,pronouns,portraitUrl,description,raceId,orderId,isActive:active,moveHere:selected.current_room_id!==roomId}):{ok:false,message:"Select an NPC."};setStatus(result.message);if(result.ok){closeEditor();await refresh();await loadMechanics()}})}
  function post(){if(!selected)return;startTransition(async()=>{const result=await sendNpcMessage({roomId,npcId:selected.id,message:postText});setStatus(result.message);if(result.ok)setPostText("")})}

  const inputClass="mt-1 block w-full border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-100c09))] px-2.5 py-2 text-[10px] normal-case tracking-normal text-[rgb(var(--sep-colour-d6c4a8))]";
  const buttonClass="border border-[rgb(var(--sep-colour-765937))] bg-[rgb(var(--sep-colour-21190f))] px-2.5 py-1.5 text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-d6bb8d))] transition hover:border-[rgb(var(--sep-colour-a17a49))] hover:bg-[rgb(var(--sep-colour-2b2014))]";
  const activeButton="border border-[rgb(var(--sep-colour-a17a49))] bg-[rgb(var(--sep-colour-3a2919))] px-2.5 py-1.5 text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-f0d6a7))]";

  const actorId=selected?.character_id??"";
  const targetOptions=mechanics.targets??[];

  function adminModal(href:string,title:string){
    openPortalModal({label:title,title,icon:selected?.portrait_url??"/icons/characters.png",href});
  }

  return <div className="space-y-3">
    <div className="flex flex-wrap gap-2">
      <select value={selectedId} onChange={e=>{setSelectedId(e.target.value);setMode(null)}} className="min-w-[220px] flex-1 border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-[10px] text-[rgb(var(--sep-colour-d6c4a8))]">
        <option value="">Select NPC</option>{data.npcs.map(n=><option key={n.id} value={n.id}>{n.name}{n.current_room_id===roomId?" — here":n.current_room_name?` — ${n.current_room_name}`:" — no location"}</option>)}
      </select>
      {selected?<button type="button" onClick={beginEdit} className={buttonClass}>Edit NPC</button>:null}
      <button type="button" onClick={beginCreate} className={buttonClass}>New NPC</button>
    </div>

    {selected&&selected.character_id&&inThisRoom?<div className="border-t border-[rgb(var(--sep-colour-59432c))]/30 pt-2">
      <div className="flex flex-wrap justify-center gap-1">
        {(["attribute","feat","shape","item","combat"] as const).map(x=><button key={x} type="button" onClick={()=>setMode(mode===x?null:x)} className={mode===x?activeButton:buttonClass}>{x==="attribute"?"ATK/Use Attributes":x==="feat"?"Feats":x==="shape"?"Shapes":x==="item"?"Use Items":"Combat"}</button>)}
        <button type="button" onClick={()=>void loadMechanics()} className={buttonClass}>Refresh</button>
      </div>

      {mode==="attribute"?<div className="mt-3 border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-100c09))]/75 p-3">
        <p className="font-serif text-lg text-[rgb(var(--sep-colour-dec89f))]">ATK / Use Attributes</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <select value={attributeAction} onChange={e=>setAttributeAction(e.target.value)} className={inputClass}>
            <option value="use_muscles">Use your Muscles</option><option value="use_reflexes">Use your Reflexes</option><option value="use_brains">Use your Brains</option><option value="use_shrewd">Use your Shrewd</option><option value="use_presence">Use your Presence</option>
          </select>
          <select value={targetId} onChange={e=>setTargetId(e.target.value)} className={inputClass}><option value="">Fate / other target</option>{targetOptions.map((t:any)=><option key={t.id} value={t.id}>{t.display_name}</option>)}</select>
          {!targetId?<input value={externalTarget} onChange={e=>setExternalTarget(e.target.value)} placeholder="Optional Fate / external target" className={inputClass}/>:null}
        </div>
        <form action={targetId?opposedAction:attributeActionServer} className="mt-3 flex justify-end">
          <input type="hidden" name="npc_actor_character_id" value={actorId}/>
          {targetId?<><input type="hidden" name="opposed_action" value={attributeAction}/><input type="hidden" name="opposed_target_character_id" value={targetId}/></>:<><input type="hidden" name="check_key" value={attributeAction}/><input type="hidden" name="check_target" value={externalTarget}/><input type="hidden" name="client_nonce" value={`${selected.id}-${Date.now()}`}/></>}
          <button className={activeButton}>{targetId?"Send opposed Action":"Roll / Send Action"}</button>
        </form>
      </div>:null}

      {mode==="feat"?<div className="mt-3 border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-100c09))]/75 p-3">
        <p className="font-serif text-lg text-[rgb(var(--sep-colour-dec89f))]">Feats</p>
        {selectedGift?<><select value={selectedGift.characterGiftId} onChange={e=>setSelectedGiftId(e.target.value)} className={inputClass}>{mechanics.gifts.map((g:any)=><option key={g.characterGiftId} value={g.characterGiftId}>{g.name}</option>)}</select>
          <div className="mt-2 border border-[rgb(var(--sep-colour-60482e))]/35 p-3"><p className="font-serif text-base text-[rgb(var(--sep-colour-d8bf91))]">{selectedGift.name}</p><p className="mt-1 text-[10px] leading-5 text-[rgb(var(--sep-colour-938673))]">{selectedGift.description}</p></div>
          {selectedGift.targetMode!=="self"?<select value={targetId} onChange={e=>setTargetId(e.target.value)} className={inputClass}><option value="">{selectedGift.targetMode==="other"?"Choose another Character":"Self"}</option>{targetOptions.map((t:any)=><option key={t.id} value={t.id}>{t.display_name}</option>)}</select>:null}
          <form action={selectedGift.effectMode==="temporary"?activateFeatAction:featAction} className="mt-3 flex justify-end">
            <input type="hidden" name="npc_actor_character_id" value={actorId}/><input type="hidden" name="character_gift_id" value={selectedGift.characterGiftId}/><input type="hidden" name="gift_target_character_id" value={targetId}/>
            <button disabled={selectedGift.targetMode==="other"&&!targetId} className={activeButton}>{selectedGift.effectMode==="temporary"?"Activate Feat":"Use Feat"}</button>
          </form></>:<p className="text-sm italic text-[rgb(var(--sep-colour-756958))]">This NPC has no assigned Feats.</p>}
      </div>:null}

      {mode==="item"?<div className="mt-3 border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-100c09))]/75 p-3">
        <p className="font-serif text-lg text-[rgb(var(--sep-colour-dec89f))]">Use Items</p>
        {selectedItem?<><select value={`${selectedItem.recordKind}:${selectedItem.recordId}`} onChange={e=>setSelectedItemKey(e.target.value)} className={inputClass}>{regularItems.map((i:any)=><option key={`${i.recordKind}:${i.recordId}`} value={`${i.recordKind}:${i.recordId}`}>{i.name}{i.quantity>1?` ×${i.quantity}`:""}</option>)}</select>
          {selectedItem.targetMode!=="self"?<select value={targetId} onChange={e=>setTargetId(e.target.value)} className={inputClass}><option value="">{selectedItem.targetMode==="other"?"Choose another Character":"Self"}</option>{targetOptions.map((t:any)=><option key={t.id} value={t.id}>{t.display_name}</option>)}</select>:null}
          <form action={itemAction} className="mt-3 flex justify-end"><input type="hidden" name="npc_actor_character_id" value={actorId}/><input type="hidden" name="item_record_kind" value={selectedItem.recordKind}/><input type="hidden" name="item_record_id" value={selectedItem.recordId}/><input type="hidden" name="item_target_character_id" value={targetId}/><button disabled={!selectedItem.isUsable||(selectedItem.targetMode==="other"&&!targetId)} className={activeButton}>Use Item</button></form>
        </>:<p className="text-sm italic text-[rgb(var(--sep-colour-756958))]">This NPC has no usable non-Weapon Items.</p>}
      </div>:null}

      {mode==="shape"?<div className="mt-3 border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-100c09))]/75 p-3">
        <p className="font-serif text-lg text-[rgb(var(--sep-colour-dec89f))]">Shapes</p>
        {selectedShape?<><select value={selectedShape.id} onChange={e=>setSelectedShapeId(e.target.value)} className={inputClass}>{mechanics.shapes.map((s:any)=><option key={s.id} value={s.id}>{s.name} · Level {s.level}</option>)}</select>
          <div className="mt-2 border border-[rgb(var(--sep-colour-60482e))]/35 p-3"><p className="font-serif text-base text-[rgb(var(--sep-colour-d8bf91))]">{selectedShape.name}</p><p className="mt-1 text-[10px] leading-5 text-[rgb(var(--sep-colour-938673))]">{selectedShape.description??""}</p></div>
          {selectedShape.target_mode==="written"?<input value={shapeWritten} onChange={e=>setShapeWritten(e.target.value)} placeholder="Written / Fate target" className={inputClass}/>:null}
          {selectedShape.target_mode!=="self"&&selectedShape.target_mode!=="written"?<select value={targetId} onChange={e=>setTargetId(e.target.value)} className={inputClass}><option value="">Choose Character</option>{targetOptions.map((t:any)=><option key={t.id} value={t.id}>{t.display_name}</option>)}</select>:null}
          <div className="mt-3 flex justify-end"><button type="button" disabled={pending||(selectedShape.target_mode==="written"?!shapeWritten.trim():selectedShape.target_mode!=="self"&&!targetId)} onClick={()=>startTransition(async()=>{const r=await npcWarpShape({npcId:selected.id,roomId,shapeId:selectedShape.id,targetIds:targetId?[targetId]:[],writtenTarget:shapeWritten});setMechanicsStatus(r.message)})} className={activeButton}>Warp Shape</button></div>
        </>:<p className="text-sm italic text-[rgb(var(--sep-colour-756958))]">This NPC has no assigned Shapes.</p>}
      </div>:null}

      {mode==="combat"?<div className="mt-3 border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-100c09))]/75 p-3">
        <p className="font-serif text-lg text-[rgb(var(--sep-colour-dec89f))]">Combat</p>
        <select value={targetId} onChange={e=>setTargetId(e.target.value)} className={inputClass}><option value="">Fate / external target</option>{targetOptions.map((t:any)=><option key={t.id} value={t.id}>{t.display_name}</option>)}</select>
        {!targetId?<input value={externalTarget} onChange={e=>setExternalTarget(e.target.value)} placeholder="Optional external target" className={inputClass}/>:null}
        <div className="mt-3 flex flex-wrap gap-2">
          <form action={unarmedAction}><input type="hidden" name="npc_actor_character_id" value={actorId}/><input type="hidden" name="opposed_target_character_id" value={targetId}/><input type="hidden" name="opposed_external_target" value={externalTarget}/><button className={activeButton}>Unarmed Attack</button></form>
          {weaponItems.map((i:any)=><form key={`${i.recordKind}:${i.recordId}`} action={weaponAction}><input type="hidden" name="npc_actor_character_id" value={actorId}/><input type="hidden" name="item_record_kind" value={i.recordKind}/><input type="hidden" name="item_record_id" value={i.recordId}/><input type="hidden" name="opposed_target_character_id" value={targetId}/><input type="hidden" name="opposed_external_target" value={externalTarget}/><button className={activeButton}>Attack with {i.name}</button></form>)}
        </div>
      </div>:null}

      {[attributeState,opposedState,featState,activateFeatState,itemState,unarmedState,weaponState].map((x:any)=>x?.message).filter(Boolean).slice(-1).map((m:string)=><p key={m} className="mt-2 text-[9px] text-[rgb(var(--sep-colour-c6ad86))]">{m}</p>)}
      {mechanicsStatus?<p className="mt-2 text-[9px] text-[rgb(var(--sep-colour-c6ad86))]">{mechanicsStatus}</p>:null}
    </div>:null}

    {selected?<div className="border-t border-[rgb(var(--sep-colour-60482e))]/35 pt-3"><p className="mb-2 text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-b99765))]">Post as {selected.name}</p><textarea value={postText} disabled={pending||!selected.is_active||!inThisRoom} onChange={e=>setPostText(e.target.value)} rows={3} className="block w-full resize-y border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-[11px] text-[rgb(var(--sep-colour-d6c4a8))] disabled:opacity-45"/><div className="mt-2 flex justify-end"><button type="button" disabled={pending||!postText.trim()||!selected.is_active||!inThisRoom} onClick={post} className={activeButton}>Post as NPC</button></div></div>:null}

    {status?<p className="text-[9px] text-[rgb(var(--sep-colour-c6ad86))]">{status}</p>:null}

    {editorOpen?<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4" onMouseDown={e=>{if(e.target===e.currentTarget)closeEditor()}}>
      <div role="dialog" aria-modal="true" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto border border-[rgb(var(--sep-colour-80613c))]/70 bg-[rgb(var(--sep-colour-120d0a))] p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between"><h3 className="font-serif text-2xl text-[rgb(var(--sep-colour-dfc79c))]">{creating?"Create NPC":`Edit ${selected?.name??"NPC"}`}</h3><button type="button" onClick={closeEditor} className={buttonClass}>Close</button></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-[8px] uppercase">Name<input value={name} onChange={e=>setName(e.target.value)} className={inputClass}/></label>
          <label className="text-[8px] uppercase">Ancestry<select value={raceId} onChange={e=>setRaceId(e.target.value)} className={inputClass}><option value="">None</option>{data.races.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
          <label className="text-[8px] uppercase">Order<select value={orderId} onChange={e=>setOrderId(e.target.value)} className={inputClass}><option value="">None</option>{data.orders.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></label>
          <label className="text-[8px] uppercase">Pronouns<input value={pronouns} onChange={e=>setPronouns(e.target.value)} className={inputClass}/></label>
          <label className="text-[8px] uppercase sm:col-span-2">Portrait URL<input value={portraitUrl} onChange={e=>setPortraitUrl(e.target.value)} className={inputClass}/></label>
        </div>
        <label className="mt-3 block text-[8px] uppercase">Description<textarea value={description} onChange={e=>setDescription(e.target.value)} rows={4} className={inputClass+" resize-y"}/></label>
        {!creating?<label className="mt-3 flex items-center gap-2 text-[8px] uppercase"><input type="checkbox" checked={active} onChange={e=>setActive(e.target.checked)}/>Active</label>:null}

        {!creating&&selected?.character_id?<div className="mt-4 flex flex-wrap gap-2 border-t border-[rgb(var(--sep-colour-60482e))]/30 pt-3">
          <button type="button" onClick={()=>adminModal(`/admin/characters/${selected.character_id}`,`Manage ${selected.name}`)} className={buttonClass}>Stats & Feats</button>
          <button type="button" onClick={()=>adminModal(`/admin/characters/${selected.character_id}/inventory`,`${selected.name} · Items`)} className={buttonClass}>Items</button>
          <button type="button" onClick={()=>adminModal(`/admin/characters/${selected.character_id}/warping`,`${selected.name} · Shapes`)} className={buttonClass}>Shapes</button>
        </div>:null}

        <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={closeEditor} className={buttonClass}>Cancel</button><button type="button" disabled={pending} onClick={save} className={activeButton}>{creating?"Create in this Location":inThisRoom?"Save NPC":"Save & Bring Here"}</button></div>
      </div>
    </div>:null}
  </div>
}
