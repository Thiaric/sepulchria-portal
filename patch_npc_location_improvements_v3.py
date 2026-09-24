#!/usr/bin/env python3
from __future__ import annotations
import argparse, shutil, subprocess
from pathlib import Path

ROOT = Path.cwd()
BACKUP_ROOT = ROOT / '.patch_backups' / 'npc_location_improvements_31cd184'
FILES = [
    Path('app/(portal)/game/npc-actions.ts'),
    Path('app/(portal)/game/components/NpcControlPanel.tsx'),
    Path('app/(portal)/orders/headquarters/actions.ts'),
    Path('components/orders/order-headquarters-manage-menu.tsx'),
    Path('lib/order-headquarters/access.ts'),
    Path('app/(portal)/private-location/actions.ts'),
    Path('app/(portal)/private-locations/page.tsx'),
]
APPLY_SQL = ROOT / 'supabase_npc_location_improvements.sql'
ROLLBACK_SQL = ROOT / 'supabase_npc_location_improvements_ROLLBACK.sql'

def die(msg):
    raise SystemExit(f'\nERROR: {msg}\n')

def read(rel):
    p=ROOT/rel
    if not p.exists(): die(f'Missing expected file: {rel}')
    return p.read_text(encoding='utf-8')

def write(rel, txt):
    p=ROOT/rel; p.parent.mkdir(parents=True, exist_ok=True); p.write_text(txt, encoding='utf-8')

def rep(txt, old, new, label):
    n=txt.count(old)
    if n != 1: die(f'{label}: expected exactly 1 match, found {n}.')
    return txt.replace(old,new,1)

def ins(txt, marker, addition, label):
    i=txt.find(marker)
    if i<0: die(f'{label}: marker not found.')
    if txt.find(marker,i+1)>=0: die(f'{label}: marker not unique.')
    return txt[:i]+addition+txt[i:]

def head():
    try:
        return subprocess.check_output(['git','rev-parse','--short','HEAD'],cwd=ROOT,text=True,stderr=subprocess.DEVNULL).strip()
    except Exception:
        return 'unknown'

def backup():
    if BACKUP_ROOT.exists():
        print(f'Backup already exists: {BACKUP_ROOT}')
        return
    for rel in FILES:
        src=ROOT/rel
        if not src.exists(): die(f'Cannot back up missing file: {rel}')
        dst=BACKUP_ROOT/rel; dst.parent.mkdir(parents=True,exist_ok=True); shutil.copy2(src,dst)
    print(f'Backup created: {BACKUP_ROOT}')

def restore_originals():
    if not BACKUP_ROOT.exists():
        die(f'No clean backup found at {BACKUP_ROOT}')
    print('Restoring clean 31cd184 source files from the first-run backup...')
    for rel in FILES:
        src=BACKUP_ROOT/rel
        if not src.exists():
            die(f'Backup is missing expected file: {rel}')
        dst=ROOT/rel
        dst.parent.mkdir(parents=True,exist_ok=True)
        shutil.copy2(src,dst)
    print('Clean source restored.')

def revert():
    if not BACKUP_ROOT.exists(): die(f'No backup found at {BACKUP_ROOT}')
    for rel in FILES:
        src=BACKUP_ROOT/rel
        if src.exists():
            dst=ROOT/rel; dst.parent.mkdir(parents=True,exist_ok=True); shutil.copy2(src,dst); print(f'Restored {rel}')
    print('\nCode reverted. If you already ran the SQL, run the rollback SQL separately.')

def patch_npc_actions():
    p=Path('app/(portal)/game/npc-actions.ts'); s=read(p)
    s=rep(s,
'''export type NpcRace = { id:string; name:string; icon_url:string|null };
export type StaffNpc = {
  id:string; name:string; pronouns:string|null; portrait_url:string|null;
  description:string|null; current_room_id:string|null; current_room_name:string|null;
  is_active:boolean; race_id:string|null; race:NpcRace|null;
};
export type NpcControlData = { npcs:StaffNpc[]; races:NpcRace[] };''',
'''export type NpcRace = { id:string; name:string; icon_url:string|null };
export type NpcOrder = { id:string; name:string };
export type StaffNpc = {
  id:string; name:string; pronouns:string|null; portrait_url:string|null;
  description:string|null; current_room_id:string|null; current_room_name:string|null;
  is_active:boolean; race_id:string|null; race:NpcRace|null;
  order_id:string|null; order:NpcOrder|null; character_id:string|null;
};
export type NpcControlData = { npcs:StaffNpc[]; races:NpcRace[]; orders:NpcOrder[] };''','npc types')
    s=rep(s,
'''  const [npcs,races]=await Promise.all([
    admin.from("npcs").select(`id,name,pronouns,portrait_url,description,current_room_id,is_active,race_id,race:races(id,name,icon_url),room:rooms(id,name)`).order("name",{ascending:true}),
    admin.from("races").select("id,name,icon_url").eq("is_active",true).order("name",{ascending:true}),
  ]);
  if(npcs.error) throw new Error(`Unable to load NPCs: ${npcs.error.message}`);
  if(races.error) throw new Error(`Unable to load Ancestries: ${races.error.message}`);
  return {
    npcs:(npcs.data??[]).map((row:any)=>{
      const race=Array.isArray(row.race)?row.race[0]??null:row.race??null;
      const room=Array.isArray(row.room)?row.room[0]??null:row.room??null;
      return {id:row.id,name:row.name,pronouns:row.pronouns??null,portrait_url:row.portrait_url??null,description:row.description??null,current_room_id:row.current_room_id??null,current_room_name:room?.name??null,is_active:row.is_active===true,race_id:row.race_id??null,race};
    }),
    races:(races.data??[]) as NpcRace[],
  };''',
'''  const [npcs,races,orders]=await Promise.all([
    admin.from("npcs").select(`id,name,pronouns,portrait_url,description,current_room_id,is_active,race_id,order_id,character_id,race:races(id,name,icon_url),order:orders(id,name),room:rooms(id,name)`).order("name",{ascending:true}),
    admin.from("races").select("id,name,icon_url").eq("is_active",true).order("name",{ascending:true}),
    admin.from("orders").select("id,name").eq("is_active",true).order("name",{ascending:true}),
  ]);
  if(npcs.error) throw new Error(`Unable to load NPCs: ${npcs.error.message}`);
  if(races.error) throw new Error(`Unable to load Ancestries: ${races.error.message}`);
  if(orders.error) throw new Error(`Unable to load Orders: ${orders.error.message}`);
  return {
    npcs:(npcs.data??[]).map((row:any)=>{
      const race=Array.isArray(row.race)?row.race[0]??null:row.race??null;
      const order=Array.isArray(row.order)?row.order[0]??null:row.order??null;
      const room=Array.isArray(row.room)?row.room[0]??null:row.room??null;
      return {id:row.id,name:row.name,pronouns:row.pronouns??null,portrait_url:row.portrait_url??null,description:row.description??null,current_room_id:row.current_room_id??null,current_room_name:room?.name??null,is_active:row.is_active===true,race_id:row.race_id??null,race,order_id:row.order_id??null,order,character_id:row.character_id??null};
    }),
    races:(races.data??[]) as NpcRace[], orders:(orders.data??[]) as NpcOrder[],
  };''','npc load')
    s=rep(s,
'''export async function createNpc(input:{roomId:string;name:string;pronouns?:string;portraitUrl?:string;description?:string;raceId?:string}){
  try{
    const {admin,user}=await requireNpcStaff();
    await assertRoom(admin,input.roomId);
    const name=cleanName(input.name);
    const result=await admin.from("npcs").insert({
      name, pronouns:clean(input.pronouns,80), portrait_url:clean(input.portraitUrl,800),
      description:clean(input.description,2000), race_id:clean(input.raceId,64),
      current_room_id:input.roomId,is_active:true,created_by_user_id:user.id,updated_by_user_id:user.id,
    });
    return result.error?{ok:false,message:`Unable to create NPC: ${result.error.message}`}:{ok:true,message:`${name} created in this Location.`};
  }catch(error){return {ok:false,message:error instanceof Error?error.message:"Unable to create NPC."};}
}''',
'''export async function createNpc(input:{roomId:string;name:string;pronouns?:string;portraitUrl?:string;description?:string;raceId?:string;orderId?:string}){
  try{
    const {admin,user}=await requireNpcStaff(); await assertRoom(admin,input.roomId);
    const name=cleanName(input.name), npcId=crypto.randomUUID();
    const raceId=clean(input.raceId,64), orderId=clean(input.orderId,64), description=clean(input.description,2000), portraitUrl=clean(input.portraitUrl,800), pronouns=clean(input.pronouns,80);
    const cr=await admin.from("characters").insert({id:npcId,user_id:null,first_name:name,surname:"",pronouns,portrait_url:portraitUrl,physical_description:description??"NPC",personality:"Staff-controlled NPC.",biography:description??"Staff-controlled NPC.",public_slug:`npc-${npcId.replace(/-/g,"")}`,status:"approved",approved_at:new Date().toISOString(),current_room_id:input.roomId,race_id:raceId,title:"NPC",is_system:true,muscles:3,reflexes:3,vigor:3,brains:3,shrewd:3,presence_score:3,current_health:30});
    if(cr.error) return {ok:false,message:`Unable to create NPC mechanics record: ${cr.error.message}`};
    const result=await admin.from("npcs").insert({id:npcId,character_id:npcId,name,pronouns,portrait_url:portraitUrl,description,race_id:raceId,order_id:orderId,current_room_id:input.roomId,is_active:true,created_by_user_id:user.id,updated_by_user_id:user.id});
    if(result.error){await admin.from("characters").delete().eq("id",npcId).eq("is_system",true);return {ok:false,message:`Unable to create NPC: ${result.error.message}`};}
    return {ok:true,message:`${name} created in this Location.`};
  }catch(error){return {ok:false,message:error instanceof Error?error.message:"Unable to create NPC."};}
}''','npc create')
    s=rep(s,
'''export async function updateNpc(input:{npcId:string;roomId:string;name:string;pronouns?:string;portraitUrl?:string;description?:string;raceId?:string;isActive:boolean;moveHere:boolean}){
  try{
    const {admin,user}=await requireNpcStaff();
    await assertRoom(admin,input.roomId);
    const name=cleanName(input.name);
    const update:any={name,pronouns:clean(input.pronouns,80),portrait_url:clean(input.portraitUrl,800),description:clean(input.description,2000),race_id:clean(input.raceId,64),is_active:input.isActive,updated_by_user_id:user.id,updated_at:new Date().toISOString()};
    if(input.moveHere) update.current_room_id=input.roomId;
    const result=await admin.from("npcs").update(update).eq("id",input.npcId);
    return result.error?{ok:false,message:`Unable to update NPC: ${result.error.message}`}:{ok:true,message:`${name} updated.`};
  }catch(error){return {ok:false,message:error instanceof Error?error.message:"Unable to update NPC."};}
}''',
'''export async function updateNpc(input:{npcId:string;roomId:string;name:string;pronouns?:string;portraitUrl?:string;description?:string;raceId?:string;orderId?:string;isActive:boolean;moveHere:boolean}){
  try{
    const {admin,user}=await requireNpcStaff(); await assertRoom(admin,input.roomId);
    const name=cleanName(input.name),raceId=clean(input.raceId,64),orderId=clean(input.orderId,64),portraitUrl=clean(input.portraitUrl,800),pronouns=clean(input.pronouns,80),description=clean(input.description,2000);
    const cur=await admin.from("npcs").select("character_id").eq("id",input.npcId).maybeSingle();
    if(cur.error||!cur.data) return {ok:false,message:cur.error?.message??"NPC not found."};
    const update:any={name,pronouns,portrait_url:portraitUrl,description,race_id:raceId,order_id:orderId,is_active:input.isActive,updated_by_user_id:user.id,updated_at:new Date().toISOString()};
    if(input.moveHere) update.current_room_id=input.roomId;
    const result=await admin.from("npcs").update(update).eq("id",input.npcId); if(result.error) return {ok:false,message:`Unable to update NPC: ${result.error.message}`};
    const cu:any={first_name:name,pronouns,portrait_url:portraitUrl,physical_description:description??"NPC",biography:description??"Staff-controlled NPC.",race_id:raceId,updated_at:new Date().toISOString()}; if(input.moveHere) cu.current_room_id=input.roomId;
    const linked=await admin.from("characters").update(cu).eq("id",cur.data.character_id??input.npcId).eq("is_system",true);
    if(linked.error) return {ok:false,message:`NPC saved, but mechanics sync failed: ${linked.error.message}`};
    return {ok:true,message:`${name} updated.`};
  }catch(error){return {ok:false,message:error instanceof Error?error.message:"Unable to update NPC."};}
}''','npc update')
    write(p,s)

def patch_npc_panel():
    p=Path('app/(portal)/game/components/NpcControlPanel.tsx'); s=read(p)
    s=rep(s,'const EMPTY:NpcControlData={npcs:[],races:[]};','const EMPTY:NpcControlData={npcs:[],races:[],orders:[]};','npc empty')
    s=rep(s,'const [raceId,setRaceId]=useState(""); const [active,setActive]=useState(true);','const [raceId,setRaceId]=useState(""); const [orderId,setOrderId]=useState(""); const [active,setActive]=useState(true);','npc order state')
    s=rep(s,'setRaceId(selected.race_id??"");setActive(selected.is_active);','setRaceId(selected.race_id??"");setOrderId(selected.order_id??"");setActive(selected.is_active);','npc selected order')
    s=rep(s,'setRaceId("");setActive(true);','setRaceId("");setOrderId("");setActive(true);','npc reset order')
    s=rep(s,'createNpc({roomId,name,pronouns,portraitUrl,description,raceId})','createNpc({roomId,name,pronouns,portraitUrl,description,raceId,orderId})','npc create order')
    s=rep(s,'updateNpc({npcId:selected.id,roomId,name,pronouns,portraitUrl,description,raceId,isActive:active,moveHere:selected.current_room_id!==roomId})','updateNpc({npcId:selected.id,roomId,name,pronouns,portraitUrl,description,raceId,orderId,isActive:active,moveHere:selected.current_room_id!==roomId})','npc update order')
    s=rep(s,'<label className="text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-8f8170))]">Pronouns<input value={pronouns}', '<label className="text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-8f8170))]">Order<select value={orderId} onChange={e=>setOrderId(e.target.value)} className={inputClass}><option value="">None</option>{data.orders.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></label>\n        <label className="text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-8f8170))]">Pronouns<input value={pronouns}', 'npc order select')
    s=ins(s,'      <div className="flex flex-wrap items-center gap-2"><button type="button" disabled={pending} onClick={save}', '''      {!creating&&selected?.character_id?<div className="flex flex-wrap gap-2 border-t border-[rgb(var(--sep-colour-60482e))]/30 pt-2">
        <a href={`/admin/characters/${selected.character_id}`} className="border border-[rgb(var(--sep-colour-60482e))]/55 px-3 py-2 text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-c4a675))]">Stats & Feats</a>
        <a href={`/admin/characters/${selected.character_id}/inventory`} className="border border-[rgb(var(--sep-colour-60482e))]/55 px-3 py-2 text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-c4a675))]">Items</a>
        <a href={`/admin/characters/${selected.character_id}/warping`} className="border border-[rgb(var(--sep-colour-60482e))]/55 px-3 py-2 text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-c4a675))]">Shapes</a>
      </div>:null}
''','npc mechanics links')
    write(p,s)

def patch_locations():
    p=Path('lib/order-headquarters/access.ts'); s=read(p)
    marker='export async function getOrderHeadquartersManageData('
    idx=s.find(marker)
    if idx<0: die('hq manage-data function not found')
    head_part=s[:idx]
    tail_part=s[idx:]
    tail_part=rep(tail_part,'      id, order_id, room_id,\n      background_colour, speech_colour, action_colour, system_colour,','      id, order_id, room_id, description_changed_at,\n      background_colour, speech_colour, action_colour, system_colour,','hq manage timestamp select')
    tail_part=rep(tail_part,'    imageUrl:\n      room?.image_url ??','    descriptionChangedAt:\n      hq.description_changed_at ?? null,\n    imageUrl:\n      room?.image_url ??','hq timestamp return')
    s=head_part+tail_part
    write(p,s)

    p=Path('app/(portal)/orders/headquarters/actions.ts'); s=read(p)
    s=ins(s,'export async function updateOrderHeadquartersPresentation(formData: FormData) {', '''const DESCRIPTION_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;
function fmtDescriptionDate(value:string){const d=new Date(value);return [String(d.getDate()).padStart(2,"0"),String(d.getMonth()+1).padStart(2,"0"),d.getFullYear()].join(":");}
export async function updateOrderHeadquartersDescription(formData:FormData){
  const roomId=uuid(formData.get("roomId")); const {admin,access}=await requirePermission(roomId,"customize"); const description=text(formData.get("description"),20000);
  if(!description) throw new Error("The location description cannot be empty.");
  const q=await admin.from("order_headquarters").select("description_changed_at").eq("room_id",roomId).single(); if(q.error||!q.data) throw new Error(q.error?.message??"Unable to load the Headquarters.");
  if(!access.isStaff&&q.data.description_changed_at&&Date.now()-Date.parse(q.data.description_changed_at)<DESCRIPTION_COOLDOWN_MS) throw new Error(`You changed the description on ${fmtDescriptionDate(q.data.description_changed_at)}, contact staff if a new change is needed.`);
  const now=new Date().toISOString(); const r=await admin.from("rooms").update({description,updated_at:now}).eq("id",roomId); if(r.error) throw new Error(r.error.message);
  const st=await admin.from("order_headquarters").update({description_changed_at:now}).eq("room_id",roomId); if(st.error) throw new Error(st.error.message); revalidatePath("/game");
}\n\n''','hq description action')
    write(p,s)

    p=Path('components/orders/order-headquarters-manage-menu.tsx'); s=read(p)
    s=rep(s,'  revokeOrderHeadquartersGuest,\n  updateOrderHeadquartersPresentation,','  revokeOrderHeadquartersGuest,\n  updateOrderHeadquartersDescription,\n  updateOrderHeadquartersPresentation,','hq menu import')
    s=ins(s,'        {data.canCustomize ? (\n          <details className="mt-4 border-t border-[rgb(var(--sep-colour-60482e))]/30 pt-3 components_orders_order_headquarters_manage_menu_details_location_images">', '''        {data.canCustomize ? (
          <details className="mt-4 border-t border-[rgb(var(--sep-colour-60482e))]/30 pt-3">
            <summary className="cursor-pointer text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-8c704b))]">Location description</summary>
            <form action={updateOrderHeadquartersDescription} className="mt-3 grid gap-2">
              <input type="hidden" name="roomId" value={data.roomId}/>
              <textarea name="description" required rows={6} maxLength={20000} defaultValue={data.description??""} disabled={!data.isStaff&&Boolean(data.descriptionChangedAt&&Date.now()-Date.parse(data.descriptionChangedAt)<30*24*60*60*1000)} className="resize-y border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-xs leading-5 text-[rgb(var(--sep-colour-d7c4a5))] disabled:opacity-45"/>
              {!data.isStaff&&data.descriptionChangedAt&&Date.now()-Date.parse(data.descriptionChangedAt)<30*24*60*60*1000?<p className="text-[8px] leading-4 text-[rgb(var(--sep-colour-c08c79))]">You changed the description on {new Date(data.descriptionChangedAt).toLocaleDateString("en-GB").replace(/\\//g,":")}, contact staff if a new change is needed.</p>:<p className="text-[8px] leading-4 text-[rgb(var(--sep-colour-6f6252))]">Order Leaders may change this description once every 30 days. Staff are not restricted.</p>}
              <button type="submit" disabled={!data.isStaff&&Boolean(data.descriptionChangedAt&&Date.now()-Date.parse(data.descriptionChangedAt)<30*24*60*60*1000)} className="border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-3 py-2 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-efd6a8))] disabled:opacity-40">Save description</button>
            </form>
          </details>
        ) : null}

''','hq description UI')
    write(p,s)

    p=Path('app/(portal)/private-location/actions.ts'); s=read(p)
    s=ins(s,'export async function updatePrivateLocation(\n  formData: FormData,\n) {', '''const PRIVATE_DESCRIPTION_COOLDOWN_MS=30*24*60*60*1000;
function privateDescriptionDate(value:string){const d=new Date(value);return [String(d.getDate()).padStart(2,"0"),String(d.getMonth()+1).padStart(2,"0"),d.getFullYear()].join(":");}
export async function updatePrivateLocationDescription(formData:FormData){
  const roomId=readUuid(formData.get("roomId")); const {admin}=await requireOwner(roomId); const description=readText(formData.get("description"),20000); if(!description) throw new Error("The location description cannot be empty.");
  const q=await admin.from("private_location_rooms").select("description_changed_at").eq("room_id",roomId).single(); if(q.error||!q.data) throw new Error(q.error?.message??"Unable to load this Private Location.");
  if(q.data.description_changed_at&&Date.now()-Date.parse(q.data.description_changed_at)<PRIVATE_DESCRIPTION_COOLDOWN_MS) throw new Error(`You changed the description on ${privateDescriptionDate(q.data.description_changed_at)}, contact staff if a new change is needed.`);
  const now=new Date().toISOString(); const r=await admin.from("rooms").update({description,updated_at:now}).eq("id",roomId); if(r.error) throw new Error(r.error.message);
  const st=await admin.from("private_location_rooms").update({description_changed_at:now}).eq("room_id",roomId); if(st.error) throw new Error(st.error.message); revalidatePath("/private-locations");revalidatePath("/game");revalidatePath("/");
}\n\n''','private description action')
    write(p,s)

    p=Path('app/(portal)/private-locations/page.tsx'); s=read(p)
    s=rep(s,'  updatePrivateLocation,','  updatePrivateLocation,\n  updatePrivateLocationDescription,','private import')
    s=rep(s,'        background_image_url: string | null;','        background_image_url: string | null;\n        description_changed_at?: string | null;','private type')
    s=rep(s,'"background_colour, speech_colour, action_colour, system_colour, whisper_background_colour, whisper_text_colour, offgame_background_colour, offgame_text_colour",','"background_colour, speech_colour, action_colour, system_colour, whisper_background_colour, whisper_text_colour, offgame_background_colour, offgame_text_colour, description_changed_at",','private timestamp select')
    s=rep(s,'    ownedRoom =\n      roomResult.data;','    ownedRoom = roomResult.data ? {...roomResult.data,description_changed_at:themeResult.data?.description_changed_at??null} : null;','private timestamp attach')
    s=ins(s,'            <div className="bg-[rgb(var(--sep-colour-17110d))] p-5 private_locations_page_div_access">', '''            <form action={updatePrivateLocationDescription} className="grid gap-3 bg-[rgb(var(--sep-colour-17110d))] p-5">
              <input type="hidden" name="roomId" value={ownedRoom.id}/><h3 className="font-serif text-xl text-[rgb(var(--sep-colour-dfc79c))]">Location description</h3>
              <textarea name="description" required rows={7} maxLength={20000} defaultValue={ownedRoom.description??""} disabled={Boolean(ownedRoom.description_changed_at&&Date.now()-Date.parse(ownedRoom.description_changed_at)<30*24*60*60*1000)} className="resize-y border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0d0907))] px-3 py-2 text-sm leading-6 text-[rgb(var(--sep-colour-d7c4a5))] disabled:opacity-45"/>
              {ownedRoom.description_changed_at&&Date.now()-Date.parse(ownedRoom.description_changed_at)<30*24*60*60*1000?<p className="text-[8px] leading-4 text-[rgb(var(--sep-colour-c08c79))]">You changed the description on {new Date(ownedRoom.description_changed_at).toLocaleDateString("en-GB").replace(/\\//g,":")}, contact staff if a new change is needed.</p>:<p className="text-[8px] leading-4 text-[rgb(var(--sep-colour-6f6252))]">You may change your Private Location description once every 30 days.</p>}
              <button type="submit" disabled={Boolean(ownedRoom.description_changed_at&&Date.now()-Date.parse(ownedRoom.description_changed_at)<30*24*60*60*1000)} className="border border-[rgb(var(--sep-colour-8d6d3e))] bg-[rgb(var(--sep-colour-332719))] px-4 py-2 text-[9px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-efd9aa))] disabled:opacity-40">Save description</button>
            </form>

''','private description UI')
    write(p,s)

def write_sql():
    APPLY_SQL.write_text('''-- Run once in Supabase SQL Editor after applying the Python patch.\nbegin;\n\nalter table public.npcs add column if not exists character_id uuid null references public.characters(id) on delete set null;\ncreate unique index if not exists npcs_character_id_unique on public.npcs(character_id) where character_id is not null;\nalter table public.npcs add column if not exists order_id uuid null references public.orders(id) on delete set null;\nalter table public.order_headquarters add column if not exists description_changed_at timestamptz null;\nalter table public.private_location_rooms add column if not exists description_changed_at timestamptz null;\n\ninsert into public.characters (id,user_id,first_name,surname,pronouns,portrait_url,physical_description,personality,biography,public_slug,status,approved_at,current_room_id,race_id,title,is_system,muscles,reflexes,vigor,brains,shrewd,presence_score,current_health)\nselect n.id,null,n.name,'',n.pronouns,n.portrait_url,coalesce(n.description,'NPC'),'Staff-controlled NPC.',coalesce(n.description,'Staff-controlled NPC.'),'npc-'||replace(n.id::text,'-',''),'approved',now(),n.current_room_id,n.race_id,'NPC',true,3,3,3,3,3,3,30 from public.npcs n where not exists(select 1 from public.characters c where c.id=n.id);\nupdate public.npcs n set character_id=n.id where n.character_id is null and exists(select 1 from public.characters c where c.id=n.id and c.is_system=true);\ncommit;\n''',encoding='utf-8')
    ROLLBACK_SQL.write_text('''-- Database rollback. Does NOT delete system Character rows automatically.\nbegin;\nalter table public.private_location_rooms drop column if exists description_changed_at;\nalter table public.order_headquarters drop column if exists description_changed_at;\ndrop index if exists public.npcs_character_id_unique;\nalter table public.npcs drop column if exists order_id;\nalter table public.npcs drop column if exists character_id;\ncommit;\n''',encoding='utf-8')

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--revert',action='store_true'); a=ap.parse_args()
    if a.revert: revert(); return
    print(f'Current HEAD: {head()}')
    if head()!='31cd184': print('WARNING: patch prepared against 31cd184; exact-match guards will stop if source differs.')
    backup()
    restore_originals()
    patch_npc_actions(); patch_npc_panel(); patch_locations(); write_sql()
    print('\nPATCH APPLIED LOCALLY ONLY. Nothing committed or pushed.')
    print('Run supabase_npc_location_improvements.sql in Supabase SQL Editor, then npm run dev.')
    print('Code revert: python patch_npc_location_improvements_v3.py --revert')
    print('DB rollback: run supabase_npc_location_improvements_ROLLBACK.sql')
    print('NOTE: NPCs now get hidden system-Character mechanics records and direct Staff links for Stats/Feats, Items and Shapes. Live player combat-button impersonation is intentionally not wired in this first safe pass.')

if __name__=='__main__': main()
