from pathlib import Path
import subprocess
import sys

EXPECTED_HEAD = "bcf2cab"

def read(path):
    return Path(path).read_text(encoding="utf-8")

def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly 1 match, found {count}")
    return text.replace(old, new, 1)

def main():
    head = subprocess.check_output(
        ["git", "rev-parse", "--short=7", "HEAD"],
        text=True
    ).strip()

    if head != EXPECTED_HEAD:
        raise RuntimeError(
            f"This patch was built for {EXPECTED_HEAD}, but your current HEAD is {head}. "
            "Pull the expected commit or ask for a refreshed patch."
        )

    files = {
        "app/(portal)/game/npc-actions.ts": read("app/(portal)/game/npc-actions.ts"),
        "app/(portal)/game/components/NpcControlPanel.tsx": read("app/(portal)/game/components/NpcControlPanel.tsx"),
    }

    p = "app/(portal)/game/npc-actions.ts"
    s = files[p]

    s = replace_once(
        s,
        '''export type StaffNpc = {
  id:string; name:string; pronouns:string|null; portrait_url:string|null;
  description:string|null; current_room_id:string|null; current_room_name:string|null;
  is_active:boolean; is_location_active:boolean; race_id:string|null; race:NpcRace|null;
  order_id:string|null; order:NpcOrder|null; character_id:string|null;
};''',
        '''export type StaffNpc = {
  id:string; name:string; first_name:string; surname:string; pronouns:string|null; portrait_url:string|null;
  description:string|null; current_room_id:string|null; current_room_name:string|null;
  is_active:boolean; is_location_active:boolean; race_id:string|null; race:NpcRace|null;
  order_id:string|null; order:NpcOrder|null; character_id:string|null;
};''',
        "StaffNpc identity fields",
    )

    s = replace_once(
        s,
        '''  if(npcs.error) throw new Error(`Unable to load NPCs: ${npcs.error.message}`);
  if(races.error) throw new Error(`Unable to load Ancestries: ${races.error.message}`);
  if(orders.error) throw new Error(`Unable to load Orders: ${orders.error.message}`);
  return {
    npcs:(npcs.data??[]).map((row:any)=>{
      const race=Array.isArray(row.race)?row.race[0]??null:row.race??null;
      const order=Array.isArray(row.order)?row.order[0]??null:row.order??null;
      const room=Array.isArray(row.room)?row.room[0]??null:row.room??null;
      return {id:row.id,name:row.name,pronouns:row.pronouns??null,portrait_url:row.portrait_url??null,description:row.description??null,current_room_id:row.current_room_id??null,current_room_name:room?.name??null,is_active:row.is_active===true,is_location_active:row.is_location_active===true,race_id:row.race_id??null,race,order_id:row.order_id??null,order,character_id:row.character_id??null};
    }),
    races:(races.data??[]) as NpcRace[], orders:(orders.data??[]) as NpcOrder[],
  };''',
        '''  if(npcs.error) throw new Error(`Unable to load NPCs: ${npcs.error.message}`);
  if(races.error) throw new Error(`Unable to load Ancestries: ${races.error.message}`);
  if(orders.error) throw new Error(`Unable to load Orders: ${orders.error.message}`);

  const npcCharacterIds=(npcs.data??[])
    .map((row:any)=>row.character_id)
    .filter((id:any):id is string=>typeof id==="string"&&id.length>0);

  const characterNames=npcCharacterIds.length
    ? await admin.from("characters").select("id,first_name,surname").in("id",npcCharacterIds)
    : {data:[],error:null};

  if(characterNames.error)
    throw new Error(`Unable to load NPC Character names: ${characterNames.error.message}`);

  const namesByCharacterId=new Map(
    (characterNames.data??[]).map((row:any)=>[
      row.id,
      {
        first_name:String(row.first_name??""),
        surname:String(row.surname??""),
      },
    ]),
  );

  return {
    npcs:(npcs.data??[]).map((row:any)=>{
      const race=Array.isArray(row.race)?row.race[0]??null:row.race??null;
      const order=Array.isArray(row.order)?row.order[0]??null:row.order??null;
      const room=Array.isArray(row.room)?row.room[0]??null:row.room??null;
      const identity=namesByCharacterId.get(row.character_id)??{first_name:row.name??"",surname:""};
      return {id:row.id,name:row.name,first_name:identity.first_name,surname:identity.surname,pronouns:row.pronouns??null,portrait_url:row.portrait_url??null,description:row.description??null,current_room_id:row.current_room_id??null,current_room_name:room?.name??null,is_active:row.is_active===true,is_location_active:row.is_location_active===true,race_id:row.race_id??null,race,order_id:row.order_id??null,order,character_id:row.character_id??null};
    }),
    races:(races.data??[]) as NpcRace[], orders:(orders.data??[]) as NpcOrder[],
  };''',
        "load NPC first/surname",
    )

    s = replace_once(
        s,
        '''export async function createNpc(input:{roomId:string;name:string;pronouns?:string;portraitUrl?:string;raceId?:string;orderId?:string}){
  try{
    const {admin,user}=await requireNpcStaff(); await assertRoom(admin,input.roomId);
    const name=cleanName(input.name), npcId=crypto.randomUUID();
    const raceId=clean(input.raceId,64), orderId=clean(input.orderId,64), portraitUrl=clean(input.portraitUrl,800), pronouns=clean(input.pronouns,80);
    const cr=await admin.from("characters").insert({id:npcId,user_id:null,first_name:name,surname:"",pronouns,portrait_url:portraitUrl,physical_description:"NPC",personality:"Staff-controlled NPC.",biography:"Staff-controlled NPC.",public_slug:`npc-${npcId.replace(/-/g,"")}`,status:"approved",approved_at:new Date().toISOString(),current_room_id:input.roomId,race_id:raceId,title:"NPC",is_system:true,muscles:3,reflexes:3,vigor:3,brains:3,shrewd:3,presence_score:3,current_health:30});''',
        '''export async function createNpc(input:{roomId:string;firstName:string;surname?:string;pronouns?:string;portraitUrl?:string;raceId?:string;orderId?:string}){
  try{
    const {admin,user}=await requireNpcStaff(); await assertRoom(admin,input.roomId);
    const firstName=cleanName(input.firstName);
    const surname=clean(input.surname,80)??"";
    const name=cleanName([firstName,surname].filter(Boolean).join(" "));
    const npcId=crypto.randomUUID();
    const raceId=clean(input.raceId,64), orderId=clean(input.orderId,64), portraitUrl=clean(input.portraitUrl,800), pronouns=clean(input.pronouns,80);
    const cr=await admin.from("characters").insert({id:npcId,user_id:null,first_name:firstName,surname,pronouns,portrait_url:portraitUrl,physical_description:"NPC",personality:"Staff-controlled NPC.",biography:"Staff-controlled NPC.",public_slug:`npc-${npcId.replace(/-/g,"")}`,status:"approved",approved_at:new Date().toISOString(),current_room_id:input.roomId,race_id:raceId,title:"NPC",is_system:true,muscles:3,reflexes:3,vigor:3,brains:3,shrewd:3,presence_score:3,current_health:30});''',
        "createNpc separate identity",
    )

    s = replace_once(
        s,
        '''export async function updateNpc(input:{npcId:string;roomId:string;name:string;pronouns?:string;portraitUrl?:string;raceId?:string;orderId?:string;isActive:boolean;isLocationActive:boolean;moveHere:boolean}){
  try{
    const {admin,user}=await requireNpcStaff(); await assertRoom(admin,input.roomId);
    const name=cleanName(input.name),raceId=clean(input.raceId,64),orderId=clean(input.orderId,64),portraitUrl=clean(input.portraitUrl,800),pronouns=clean(input.pronouns,80);''',
        '''export async function updateNpc(input:{npcId:string;roomId:string;firstName:string;surname?:string;pronouns?:string;portraitUrl?:string;raceId?:string;orderId?:string;isActive:boolean;isLocationActive:boolean;moveHere:boolean}){
  try{
    const {admin,user}=await requireNpcStaff(); await assertRoom(admin,input.roomId);
    const firstName=cleanName(input.firstName);
    const surname=clean(input.surname,80)??"";
    const name=cleanName([firstName,surname].filter(Boolean).join(" "));
    const raceId=clean(input.raceId,64),orderId=clean(input.orderId,64),portraitUrl=clean(input.portraitUrl,800),pronouns=clean(input.pronouns,80);''',
        "updateNpc separate identity",
    )

    s = replace_once(
        s,
        '''    const cu:any={first_name:name,surname:"",pronouns,portrait_url:portraitUrl,race_id:raceId,updated_at:new Date().toISOString()}; if(input.moveHere) cu.current_room_id=input.roomId;''',
        '''    const cu:any={first_name:firstName,surname,pronouns,portrait_url:portraitUrl,race_id:raceId,updated_at:new Date().toISOString()}; if(input.moveHere) cu.current_room_id=input.roomId;''',
        "sync separate first/surname",
    )

    files[p] = s

    p = "app/(portal)/game/components/NpcControlPanel.tsx"
    s = files[p]

    s = replace_once(
        s,
        '''  const [name,setName]=useState(""); const [pronouns,setPronouns]=useState("");
  const [portraitUrl,setPortraitUrl]=useState("");''',
        '''  const [firstName,setFirstName]=useState(""); const [surname,setSurname]=useState("");
  const [pronouns,setPronouns]=useState("");
  const [portraitUrl,setPortraitUrl]=useState("");''',
        "NPC modal name state",
    )

    s = replace_once(
        s,
        '''    setName(selected.name);setPronouns(selected.pronouns??"");setPortraitUrl(selected.portrait_url??"");''',
        '''    setFirstName(selected.first_name??"");setSurname(selected.surname??"");setPronouns(selected.pronouns??"");setPortraitUrl(selected.portrait_url??"");''',
        "selected sync identity",
    )

    s = replace_once(
        s,
        '''    setCreating(true);setEditorOpen(true);setName("");setPronouns("");setPortraitUrl("");''',
        '''    setCreating(true);setEditorOpen(true);setFirstName("");setSurname("");setPronouns("");setPortraitUrl("");''',
        "create identity reset",
    )

    s = replace_once(
        s,
        '''    setCreating(false);setName(selected.name);setPronouns(selected.pronouns??"");setPortraitUrl(selected.portrait_url??"");''',
        '''    setCreating(false);setFirstName(selected.first_name??"");setSurname(selected.surname??"");setPronouns(selected.pronouns??"");setPortraitUrl(selected.portrait_url??"");''',
        "edit identity load",
    )

    s = replace_once(
        s,
        '''        ? await createNpc({roomId,name,pronouns,portraitUrl,raceId,orderId})
        : selected
          ? await updateNpc({npcId:selected.id,roomId,name,pronouns,portraitUrl,raceId,orderId,isActive:active,isLocationActive:locationActive,moveHere:selected.current_room_id!==roomId})''',
        '''        ? await createNpc({roomId,firstName,surname,pronouns,portraitUrl,raceId,orderId})
        : selected
          ? await updateNpc({npcId:selected.id,roomId,firstName,surname,pronouns,portraitUrl,raceId,orderId,isActive:active,isLocationActive:locationActive,moveHere:selected.current_room_id!==roomId})''',
        "save separate identity",
    )

    s = replace_once(
        s,
        '''          <label className="text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-8f8170))]">Name<input value={name} onChange={e=>setName(e.target.value)} className={inputClass}/></label>
          <label className="text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-8f8170))]">Ancestry<select value={raceId} onChange={e=>setRaceId(e.target.value)} className={inputClass}><option value="">None</option>{data.races.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label>''',
        '''          <label className="text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-8f8170))]">First name<input value={firstName} onChange={e=>setFirstName(e.target.value)} className={inputClass}/></label>
          <label className="text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-8f8170))]">Surname<input value={surname} onChange={e=>setSurname(e.target.value)} className={inputClass}/></label>
          <label className="text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-8f8170))]">Ancestry<select value={raceId} onChange={e=>setRaceId(e.target.value)} className={inputClass}><option value="">None</option>{data.races.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label>''',
        "NPC Administration first/surname fields",
    )

    stale = [
        "const [name,setName]",
        "setName(selected.name)",
        "roomId,name,pronouns",
        'value={name} onChange={e=>setName',
    ]
    for token in stale:
        if token in s:
            raise RuntimeError(f"Stale NPC name-editing token remains: {token}")

    files[p] = s

    for path, content in files.items():
        Path(path).write_text(content, encoding="utf-8")

    print("Applied NPC First name / Surname Administration fix.")
    print("Changed:")
    print(" - app/(portal)/game/npc-actions.ts")
    print(" - app/(portal)/game/components/NpcControlPanel.tsx")
    print()
    print("Next: npm run build")

if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"PATCH FAILED: {exc}", file=sys.stderr)
        sys.exit(1)
