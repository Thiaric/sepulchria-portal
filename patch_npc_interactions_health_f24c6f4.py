from __future__ import annotations

from pathlib import Path
import shutil
import subprocess
import sys

BASE = "f24c6f4"
ROOT = Path.cwd()
BACKUP_ROOT = ROOT / ".patch_backups" / "npc_interactions_health_f24c6f4"

def die(message: str) -> None:
    print(f"\nERROR: {message}")
    sys.exit(1)

def git(*args: str) -> str:
    result = subprocess.run(
        ["git", *args],
        cwd=ROOT,
        text=True,
        capture_output=True,
    )
    if result.returncode != 0:
        die(result.stderr.strip() or f"git {' '.join(args)} failed")
    return result.stdout.strip()

def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        die(f"{label}: expected 1 match, found {count}. No source files were changed.")
    return text.replace(old, new, 1)

def replace_nth(text: str, old: str, new: str, n: int, label: str) -> str:
    positions = []
    pos = 0
    while True:
        pos = text.find(old, pos)
        if pos < 0:
            break
        positions.append(pos)
        pos += len(old)
    if len(positions) < n:
        die(f"{label}: expected at least {n} matches, found {len(positions)}. No source files were changed.")
    start = positions[n - 1]
    return text[:start] + new + text[start + len(old):]

def read(rel: str) -> str:
    path = ROOT / rel
    if not path.exists():
        die(f"Missing expected file: {rel}")
    return path.read_text(encoding="utf-8")

def ensure_head() -> None:
    head = git("rev-parse", "HEAD")
    short = git("rev-parse", "--short", "HEAD")
    print(f"Current HEAD: {short}")
    if not head.startswith(BASE):
        die(
            f"This patch was built for {BASE}, but current HEAD is {short}. "
            "Checkout/pull the intended commit before running it."
        )

ensure_head()

changes: dict[str, str] = {}

# types/game.ts
p = "types/game.ts"
s = read(p)
s = replace_once(
    s,
'''export type PresentRoomCharacter = {
  id: string;
  display_name: string;
};''',
'''export type PresentRoomCharacter = {
  id: string;
  display_name: string;
  is_system?: boolean;
};''',
    "PresentRoomCharacter is_system",
)
changes[p] = s

# app/(portal)/game/page.tsx
p = "app/(portal)/game/page.tsx"
s = read(p)
s = replace_once(
    s,
'''        character:characters!character_presence_character_id_fkey(
          id,
          display_name
        )''',
'''        character:characters!character_presence_character_id_fkey(
          id,
          display_name,
          is_system
        )''',
    "game page presence is_system select",
)
s = replace_once(
    s,
'''        return {
          id: relation.id,
          display_name:
            relation.display_name,
        };''',
'''        return {
          id: relation.id,
          display_name:
            relation.display_name,
          is_system:
            relation.is_system === true,
        };''',
    "game page presence is_system map",
)
changes[p] = s

# RoomChatForm.tsx
p = "app/(portal)/game/components/RoomChatForm.tsx"
s = read(p)
s = replace_once(
    s,
'''          character:characters!character_presence_character_id_fkey(
            id,
            display_name
          )''',
'''          character:characters!character_presence_character_id_fkey(
            id,
            display_name,
            is_system
          )''',
    "RoomChatForm realtime is_system select",
)
s = replace_once(
    s,
'''            return {
              id:
                String(
                  relation.id,
                ),
              display_name:
                String(
                  relation.display_name,
                ),
            } satisfies PresentRoomCharacter;''',
'''            return {
              id:
                String(
                  relation.id,
                ),
              display_name:
                String(
                  relation.display_name,
                ),
              is_system:
                relation.is_system === true,
            } satisfies PresentRoomCharacter;''',
    "RoomChatForm realtime is_system map",
)
changes[p] = s

# ItemExchangePanel.tsx
p = "app/(portal)/game/components/ItemExchangePanel.tsx"
s = read(p)
s = replace_once(
    s,
'''  const mine = offers.filter((offer) => offer.character_id === myId);
  const theirs = offers.filter((offer) => offer.character_id !== myId);
''',
'''  const mine = offers.filter((offer) => offer.character_id === myId);
  const theirs = offers.filter((offer) => offer.character_id !== myId);

  const exchangeCharacters =
    presentCharacters.filter(
      (character) =>
        character.is_system !== true,
    );
''',
    "ItemExchange exchange-only character list",
)
s = replace_once(
    s,
'''                <option className="game_components_itemexchangepanel_option_option_7" value="">Exchange with...</option>
                {presentCharacters.map((character) => (
                  <option className="game_components_itemexchangepanel_option_option_8" key={character.id} value={character.id}>{character.display_name}</option>
                ))}''',
'''                <option className="game_components_itemexchangepanel_option_option_7" value="">Exchange with...</option>
                {exchangeCharacters.map((character) => (
                  <option className="game_components_itemexchangepanel_option_option_8" key={character.id} value={character.id}>{character.display_name}</option>
                ))}''',
    "ItemExchange remove NPCs from exchange selector",
)
changes[p] = s

# API Item Exchange NPC guard
p = "app/api/item-exchange/start/route.ts"
s = read(p)
s = replace_once(
    s,
'''  if (other === me.id) {
    return NextResponse.json(
      {
        error:
          "You cannot start an Item Exchange with yourself.",
      },
      { status: 400 },
    );
  }

  try {''',
'''  if (other === me.id) {
    return NextResponse.json(
      {
        error:
          "You cannot start an Item Exchange with yourself.",
      },
      { status: 400 },
    );
  }

  const targetAdmin =
    createAdminClient();

  const {
    data: npcTarget,
    error: npcTargetError,
  } = await targetAdmin
    .from("npcs")
    .select("id")
    .eq("character_id", other)
    .maybeSingle();

  if (npcTargetError) {
    return NextResponse.json(
      {
        error:
          npcTargetError.message,
      },
      { status: 500 },
    );
  }

  if (npcTarget) {
    return NextResponse.json(
      {
        error:
          "NPCs cannot take part in Item Exchanges. Use Give Item instead.",
      },
      { status: 400 },
    );
  }

  try {''',
    "Item Exchange API NPC guard",
)
changes[p] = s

# CharacterOrderIdentity visual-only NPC fallback
p = "components/characters/character-order-identity.tsx"
s = read(p)
s = replace_once(
    s,
'''      const relation =
        data
          ? one(
              data.order as Relation<OrderIdentity>,
            )
          : null;

      setOrder(relation);
      setLoaded(true);''',
'''      let relation =
        data
          ? one(
              data.order as Relation<OrderIdentity>,
            )
          : null;

      if (!relation) {
        const {
          data: npcData,
          error: npcError,
        } = await supabase
          .from("npcs")
          .select(`
            order:orders(
              id,
              name,
              slug,
              icon_url,
              colour
            )
          `)
          .eq(
            "character_id",
            characterId,
          )
          .maybeSingle();

        if (cancelled) {
          return;
        }

        if (npcError) {
          console.error(
            "Unable to load NPC Order identity:",
            npcError.message,
          );
        } else if (npcData) {
          relation = one(
            npcData.order as Relation<OrderIdentity>,
          );
        }
      }

      setOrder(relation);
      setLoaded(true);''',
    "NPC visual Order fallback",
)
changes[p] = s

# game/actions.ts location-active
p = "app/(portal)/game/actions.ts"
s = read(p)
s = replace_once(
    s,
'''.select("id,character_id,current_room_id,is_active")
      .eq("character_id", options.actorCharacterId)
      .eq("is_active", true)''',
'''.select("id,character_id,current_room_id,is_active,is_location_active")
      .eq("character_id", options.actorCharacterId)
      .eq("is_active", true)
      .eq("is_location_active", true)''',
    "game actions NPC location-active actor",
)
s = replace_once(
    s,
'''.select("id")
    .eq("character_id", characterId)
    .eq("is_active", true)
    .maybeSingle();''',
'''.select("id")
    .eq("character_id", characterId)
    .eq("is_active", true)
    .eq("is_location_active", true)
    .maybeSingle();''',
    "game actions NPC location-active presence",
)
changes[p] = s

# feat-mechanics-actions.ts location-active
p = "app/(portal)/game/feat-mechanics-actions.ts"
s = read(p)
s = replace_once(
    s,
'''.select("id,character_id,current_room_id,is_active")
        .eq("character_id",npcActorId)
        .eq("is_active",true)
        .maybeSingle();''',
'''.select("id,character_id,current_room_id,is_active,is_location_active")
        .eq("character_id",npcActorId)
        .eq("is_active",true)
        .eq("is_location_active",true)
        .maybeSingle();''',
    "Feat NPC location-active enforcement",
)
changes[p] = s

# opposed-actions.ts
p = "app/(portal)/game/opposed-actions.ts"
s = read(p)
s = replace_once(
    s,
'''const link = await admin.from("npcs").select("id,character_id,is_active,current_room_id").eq("character_id",npcActorId).eq("is_active",true).maybeSingle();''',
'''const link = await admin.from("npcs").select("id,character_id,is_active,is_location_active,current_room_id").eq("character_id",npcActorId).eq("is_active",true).eq("is_location_active",true).maybeSingle();''',
    "Opposed NPC actor location-active",
)
s = replace_once(
    s,
'''async function roomTarget(roomId: string, targetId: string) {
  const admin = privilegedClient();
  const { data, error } = await admin
    .from("characters")
    .select("id, display_name, current_room_id, status, life_state")
    .eq("id", targetId)
    .eq("status", "approved")
    .maybeSingle();

  if (error || !data || data.current_room_id !== roomId) {
    throw new Error("That Character is not available at this Location.");
  }

  if (data.life_state === "dead") {
    throw new Error("Dead Characters cannot be targeted by attacks or opposed Attribute Actions.");
  }

  return data;
}''',
'''async function roomTarget(roomId: string, targetId: string) {
  const admin = privilegedClient();
  const { data, error } = await admin
    .from("characters")
    .select("id, display_name, current_room_id, status, life_state, is_system")
    .eq("id", targetId)
    .eq("status", "approved")
    .maybeSingle();

  if (error || !data || data.current_room_id !== roomId) {
    throw new Error("That Character is not available at this Location.");
  }

  if (data.is_system) {
    const {
      data: npc,
      error: npcError,
    } = await admin
      .from("npcs")
      .select("id")
      .eq("character_id", data.id)
      .eq("current_room_id", roomId)
      .eq("is_active", true)
      .eq("is_location_active", true)
      .maybeSingle();

    if (npcError || !npc) {
      throw new Error(
        npcError?.message ??
          "That NPC is not active in this Location.",
      );
    }
  }

  if (data.life_state === "dead") {
    throw new Error("Dead Characters cannot be targeted by attacks or opposed Attribute Actions.");
  }

  return data;
}''',
    "Opposed target location-active enforcement",
)
changes[p] = s

# npc-mechanics-actions.ts
p = "app/(portal)/game/npc-mechanics-actions.ts"
s = read(p)
s = replace_once(
    s,
'''const q=await a.from("npcs").select("id,name,pronouns,portrait_url,description,current_room_id,is_active,character_id,race:races(id,name,icon_url)").eq("id",npcId).maybeSingle();
  if(q.error||!q.data)throw new Error(q.error?.message??"NPC not found.");
  if(!q.data.is_active)throw new Error("This NPC is inactive.");
  if(q.data.current_room_id!==roomId)throw new Error("Bring this NPC to this Location first.");''',
'''const q=await a.from("npcs").select("id,name,pronouns,portrait_url,description,current_room_id,is_active,is_location_active,character_id,race:races(id,name,icon_url)").eq("id",npcId).maybeSingle();
  if(q.error||!q.data)throw new Error(q.error?.message??"NPC not found.");
  if(!q.data.is_active)throw new Error("This NPC is inactive.");
  if(!q.data.is_location_active)throw new Error("This NPC is not Active in Locations.");
  if(q.data.current_room_id!==roomId)throw new Error("Bring this NPC to this Location first.");''',
    "requireStaffNpc location-active",
)
s = replace_once(
    s,
'''a.from("character_items").select("id,item_id,quantity").eq("character_id",character.id),
      a.from("character_item_instances").select("id,item_id,custom_name,charges_remaining").eq("owner_character_id",character.id).eq("vault_status","owned"),''',
'''a.from("character_items").select("id,item_id,quantity,container_instance_id").eq("character_id",character.id),
      a.from("character_item_instances").select("id,item_id,custom_name,charges_remaining,container_instance_id,transfer_policy_override,is_quest_item_override").eq("owner_character_id",character.id).eq("vault_status","owned"),''',
    "NPC inventory transfer metadata selects",
)
s = replace_once(
    s,
'''          is_usable:master?.is_usable===true,is_equipped:Boolean(slot),equipped_slot:slot,target_mode:master?.target_mode??"self",
          category_slug:category?.slug??null,resolution_mode:master?.resolution_mode??"automatic",damage_dice:master?.damage_dice??null,damage_type:master?.damage_type??null,''',
'''          is_usable:master?.is_usable===true,is_equipped:Boolean(slot),equipped_slot:slot,target_mode:master?.target_mode??"self",
          parent_container_id:row.container_instance_id??null,transfer_policy:master?.transfer_policy??"bound",is_quest_item:master?.is_quest_item===true,
          category_slug:category?.slug??null,resolution_mode:master?.resolution_mode??"automatic",damage_dice:master?.damage_dice??null,damage_type:master?.damage_type??null,''',
    "NPC standard item transfer metadata map",
)
s = replace_once(
    s,
'''          charges_remaining:row.charges_remaining??null,is_usable:master?.is_usable===true,is_equipped:Boolean(slot),equipped_slot:slot,
          target_mode:master?.target_mode??"self",category_slug:category?.slug??null,resolution_mode:master?.resolution_mode??"automatic",''',
'''          charges_remaining:row.charges_remaining??null,is_usable:master?.is_usable===true,is_equipped:Boolean(slot),equipped_slot:slot,
          parent_container_id:row.container_instance_id??null,transfer_policy:row.transfer_policy_override??master?.transfer_policy??"bound",
          is_quest_item:(row.is_quest_item_override??master?.is_quest_item)===true,
          target_mode:master?.target_mode??"self",category_slug:category?.slug??null,resolution_mode:master?.resolution_mode??"automatic",''',
    "NPC unique item transfer metadata map",
)
s = replace_once(
    s,
'''    const targets=(presenceResult.data??[])
      .filter((x:any)=>x.appear_offline!==true)
      .map((x:any)=>one(x.character) as any)
      .filter((x:any)=>x&&x.status==="approved"&&x.id!==character.id)
      .map((x:any)=>({id:x.id,display_name:x.display_name,life_state:x.life_state}));

    return {ok:true,characterId:character.id,gifts,items,shapes,targets};''',
'''    const rawTargets=(presenceResult.data??[])
      .filter((x:any)=>x.appear_offline!==true)
      .map((x:any)=>one(x.character) as any)
      .filter((x:any)=>x&&x.status==="approved"&&x.id!==character.id);

    const systemTargetIds=rawTargets
      .filter((x:any)=>x.is_system===true)
      .map((x:any)=>x.id);

    const activeNpcResult=systemTargetIds.length
      ? await a
          .from("npcs")
          .select("character_id")
          .in("character_id",systemTargetIds)
          .eq("current_room_id",input.roomId)
          .eq("is_active",true)
          .eq("is_location_active",true)
      : {data:[],error:null};

    if(activeNpcResult.error)throw new Error(activeNpcResult.error.message);

    const activeNpcIds=new Set(
      (activeNpcResult.data??[])
        .map((row:any)=>String(row.character_id)),
    );

    const targets=rawTargets
      .filter(
        (x:any)=>
          x.is_system!==true||
          activeNpcIds.has(String(x.id)),
      )
      .map((x:any)=>({
        id:x.id,
        display_name:x.display_name,
        life_state:x.life_state,
        is_system:x.is_system===true,
      }));

    return {ok:true,characterId:character.id,gifts,items,shapes,targets};''',
    "NPC mechanics target active-location filtering",
)
s = replace_once(
    s,
'''export async function npcCounterOpposedAction(previous:any,formData:FormData){
  return counterOpposedAction(previous,formData);
}''',
'''export async function npcCounterOpposedAction(previous:any,formData:FormData){
  return counterOpposedAction(previous,formData);
}

export async function npcGiveItem(input:{
  npcId:string;
  roomId:string;
  targetCharacterId:string;
  recordKind:string;
  recordId:string;
  quantity:number;
}){
  try{
    const {a,character}=await requireStaffNpc(input.npcId,input.roomId);
    const targetId=String(input.targetCharacterId??"").trim();
    const recordKind=String(input.recordKind??"").trim();
    const recordId=String(input.recordId??"").trim();
    const quantity=Math.max(1,Math.trunc(Number(input.quantity??1)));

    if(!targetId)throw new Error("Choose a Character.");
    if(!["standard","unique"].includes(recordKind))throw new Error("Invalid Item type.");
    if(!recordId)throw new Error("Choose an Item.");

    const target=await a
      .from("characters")
      .select("id,display_name,current_room_id,status,is_system")
      .eq("id",targetId)
      .maybeSingle();

    if(target.error||!target.data||target.data.status!=="approved"||target.data.is_system){
      throw new Error(target.error?.message??"Choose an ordinary Character.");
    }

    if(target.data.current_room_id!==input.roomId){
      throw new Error("The Character must be in the same Location.");
    }

    const db=await createClient();
    const result=await (db as any).rpc(
      "give_npc_inventory_record_as_staff",
      {
        p_source_character_id:character.id,
        p_record_kind:recordKind,
        p_record_id:recordId,
        p_target_character_id:targetId,
        p_quantity:quantity,
      },
    );

    if(result.error)throw new Error(result.error.message);

    revalidatePath("/game");
    revalidatePath("/character");
    revalidatePath("/characters");

    return {
      ok:true,
      message:`Item given to ${target.data.display_name}.`,
    };
  }catch(e){
    return {
      ok:false,
      message:e instanceof Error?e.message:"Unable to give Item.",
    };
  }
}''',
    "NPC Give Item server action",
)
changes[p] = s

# npc-actions.ts
p = "app/(portal)/game/npc-actions.ts"
s = read(p)
s = replace_once(
    s,
'''const r=await admin.from("npcs").select(`id,character_id,name,pronouns,portrait_url,description,current_room_id,is_active,race:races(id,name,icon_url)`).eq("id",input.npcId).maybeSingle();
    if(r.error||!r.data) return {ok:false,message:r.error?.message??"NPC not found."};
    const npc=r.data;
    if(!npc.is_active) return {ok:false,message:"This NPC is inactive."};
    if(npc.current_room_id!==input.roomId) return {ok:false,message:"This NPC is not currently in this Location."};''',
'''const r=await admin.from("npcs").select(`id,character_id,name,pronouns,portrait_url,description,current_room_id,is_active,is_location_active,race:races(id,name,icon_url)`).eq("id",input.npcId).maybeSingle();
    if(r.error||!r.data) return {ok:false,message:r.error?.message??"NPC not found."};
    const npc=r.data;
    if(!npc.is_active) return {ok:false,message:"This NPC is inactive."};
    if(!npc.is_location_active) return {ok:false,message:"This NPC is not Active in Locations."};
    if(npc.current_room_id!==input.roomId) return {ok:false,message:"This NPC is not currently in this Location."};''',
    "NPC normal post location-active",
)
s = s.rstrip() + r'''

export async function sendNpcWhisper(input:{
  roomId:string;
  npcId:string;
  targetCharacterId:string;
  message:string;
}){
  try{
    const {admin,user,character}=await requireNpcStaff();

    if(character.current_room_id!==input.roomId){
      return {ok:false,message:"You must be in this Location to whisper as an NPC."};
    }

    const message=String(input.message??"").trim();
    const targetCharacterId=String(input.targetCharacterId??"").trim();

    if(!message||message.length>4000){
      return {ok:false,message:"NPC whisper must contain 1–4000 characters."};
    }

    if(!targetCharacterId){
      return {ok:false,message:"Choose a Character to whisper to."};
    }

    const [npcResult,targetResult]=await Promise.all([
      admin.from("npcs")
        .select(`id,character_id,name,pronouns,portrait_url,description,current_room_id,is_active,is_location_active,race:races(id,name,icon_url)`)
        .eq("id",input.npcId)
        .maybeSingle(),
      admin.from("characters")
        .select("id,display_name,current_room_id,status,is_system")
        .eq("id",targetCharacterId)
        .maybeSingle(),
    ]);

    if(npcResult.error||!npcResult.data){
      return {ok:false,message:npcResult.error?.message??"NPC not found."};
    }

    const npc=npcResult.data;

    if(!npc.is_active){
      return {ok:false,message:"This NPC is inactive."};
    }

    if(!npc.is_location_active){
      return {ok:false,message:"This NPC is not Active in Locations."};
    }

    if(npc.current_room_id!==input.roomId){
      return {ok:false,message:"This NPC is not currently in this Location."};
    }

    if(
      targetResult.error||
      !targetResult.data||
      targetResult.data.status!=="approved"||
      targetResult.data.is_system
    ){
      return {ok:false,message:targetResult.error?.message??"Choose an ordinary Character."};
    }

    if(targetResult.data.current_room_id!==input.roomId){
      return {ok:false,message:"That Character is not currently in this Location."};
    }

    const race=Array.isArray(npc.race)?npc.race[0]??null:npc.race??null;
    const snapshot={
      id:npc.id,
      character_id:npc.character_id??npc.id,
      name:npc.name,
      pronouns:npc.pronouns??null,
      portrait_url:npc.portrait_url??null,
      description:npc.description??null,
      race:race?{id:race.id,name:race.name,icon_url:race.icon_url??null}:null,
    };

    const result=await admin.from("room_messages").insert({
      room_id:input.roomId,
      character_id:character.id,
      message,
      message_type:"whisper",
      whisper_recipient_character_id:targetCharacterId,
      speaker_type:"npc",
      npc_id:npc.id,
      npc_snapshot:snapshot,
      sent_by_user_id:user.id,
      client_nonce:crypto.randomUUID(),
    });

    return result.error
      ? {ok:false,message:`Unable to whisper as NPC: ${result.error.message}`}
      : {ok:true,message:`Whispered to ${targetResult.data.display_name} as ${npc.name}.`};
  }catch(error){
    return {
      ok:false,
      message:error instanceof Error?error.message:"Unable to whisper as NPC.",
    };
  }
}
''' + "\n"
changes[p] = s

# NpcControlPanel.tsx
p = "app/(portal)/game/components/NpcControlPanel.tsx"
s = read(p)
s = replace_once(
    s,
'''import { createNpc,loadNpcControlData,sendNpcMessage,type NpcControlData,updateNpc } from "../npc-actions";''',
'''import { createNpc,loadNpcControlData,sendNpcMessage,sendNpcWhisper,type NpcControlData,updateNpc } from "../npc-actions";''',
    "NPC panel whisper import",
)
s = replace_once(
    s,
'''  npcResolveIncomingDispel,
} from "../npc-mechanics-actions";''',
'''  npcResolveIncomingDispel,
  npcGiveItem,
} from "../npc-mechanics-actions";''',
    "NPC panel give import",
)
s = replace_once(
    s,
'''  const [mechanicsMode,setMechanicsMode]=useState<"attribute"|"feat"|"item"|"shape"|"combat"|null>(null);''',
'''  const [mechanicsMode,setMechanicsMode]=useState<"attribute"|"feat"|"item"|"shape"|"combat"|"whisper"|"give"|null>(null);''',
    "NPC panel mechanics modes",
)
s = replace_once(
    s,
'''  const [attributeAction,setAttributeAction]=useState("use_muscles");''',
'''  const [attributeAction,setAttributeAction]=useState("use_muscles");
  const [whisperTarget,setWhisperTarget]=useState("");
  const [whisperText,setWhisperText]=useState("");
  const [giveTarget,setGiveTarget]=useState("");
  const [giveItem,setGiveItem]=useState("");
  const [giveQuantity,setGiveQuantity]=useState(1);''',
    "NPC panel whisper/give states",
)
s = replace_once(
    s,
'''    if(!selected||!inThisRoom||!selected.character_id){''',
'''    if(!selected||!inThisRoom||!selected.is_location_active||!selected.character_id){''',
    "NPC panel load mechanics location-active",
)
s = replace_once(
    s,
'''      setMechanicsTarget("");
      setShapeTargets([]);
      setMechanicsStatus("");''',
'''      setMechanicsTarget("");
      setWhisperTarget("");
      setGiveTarget("");
      setGiveItem(
        next.items?.find(
          (item:any)=>
            !item.parent_container_id&&
            !item.is_equipped&&
            item.transfer_policy==="free"&&
            !item.is_quest_item,
        )?.record_id??"",
      );
      setShapeTargets([]);
      setMechanicsStatus("");''',
    "NPC panel reset whisper/give targets",
)
s = replace_once(
    s,
'''  function post(){
    if(!selected)return;
    startTransition(async()=>{
      const result=await sendNpcMessage({roomId,npcId:selected.id,message:postText});
      setStatus(result.message);
      if(result.ok)setPostText("");
    });
  }''',
'''  function post(){
    if(!selected)return;
    startTransition(async()=>{
      const result=await sendNpcMessage({roomId,npcId:selected.id,message:postText});
      setStatus(result.message);
      if(result.ok)setPostText("");
    });
  }

  function whisper(){
    if(!selected)return;
    startTransition(async()=>{
      const result=await sendNpcWhisper({
        roomId,
        npcId:selected.id,
        targetCharacterId:whisperTarget,
        message:whisperText,
      });
      setMechanicsStatus(result.message);
      if(result.ok)setWhisperText("");
    });
  }

  function giveItemToCharacter(){
    if(!selected)return;
    const item=mechanics.items?.find(
      (entry:any)=>entry.record_id===giveItem,
    );
    if(!item){
      setMechanicsStatus("Choose an Item.");
      return;
    }
    startTransition(async()=>{
      const result=await npcGiveItem({
        npcId:selected.id,
        roomId,
        targetCharacterId:giveTarget,
        recordKind:item.record_kind,
        recordId:item.record_id,
        quantity:giveQuantity,
      });
      setMechanicsStatus(result.message);
      if(result.ok){
        setGiveQuantity(1);
        await loadMechanics();
      }
    });
  }''',
    "NPC panel whisper/give handlers",
)
s = replace_once(
    s,
'''    {selected&&selected.character_id&&inThisRoom&&<div className="border-t border-[rgb(var(--sep-colour-60482e))]/35 pt-3">''',
'''    {selected&&selected.character_id&&inThisRoom&&selected.is_location_active&&<div className="border-t border-[rgb(var(--sep-colour-60482e))]/35 pt-3">''',
    "NPC panel action visibility location-active",
)
s = replace_once(
    s,
'''        {(["attribute","feat","item","shape","combat"] as const).map(m=><button key={m} type="button" onClick={()=>{setMechanicsMode(mechanicsMode===m?null:m);setMechanicsStatus("");}} className={buttonClass}>{m}</button>)}''',
'''        {(["attribute","feat","item","shape","combat","whisper","give"] as const).map(m=><button key={m} type="button" onClick={()=>{setMechanicsMode(mechanicsMode===m?null:m);setMechanicsStatus("");}} className={buttonClass}>{m==="give"?"Give Item":m}</button>)}''',
    "NPC panel Whisper/Give buttons",
)
combat = r'''      {mechanicsMode==="combat"&&<div className="mt-3 grid gap-2">
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
      </div>}'''
s = replace_once(
    s,
    combat,
    combat + r'''

      {mechanicsMode==="whisper"&&<div className="mt-3 grid gap-2">
        <select value={whisperTarget} onChange={e=>setWhisperTarget(e.target.value)} className={inputClass}>
          <option value="">Whisper to...</option>
          {(mechanics.targets??[]).filter((target:any)=>target.is_system!==true).map((target:any)=>
            <option key={target.id} value={target.id}>{target.display_name}</option>
          )}
        </select>
        <textarea
          value={whisperText}
          onChange={e=>setWhisperText(e.target.value)}
          rows={3}
          maxLength={4000}
          placeholder={whisperTarget?"Write the NPC whisper...":"Choose a Character first..."}
          className={inputClass+" resize-y"}
        />
        <div className="flex justify-end">
          <button
            type="button"
            disabled={pending||!whisperTarget||!whisperText.trim()}
            onClick={whisper}
            className="border border-[rgb(var(--sep-colour-8d6d3e))]/70 bg-[rgb(var(--sep-colour-21190f))] px-4 py-2 text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-d8bf91))] disabled:opacity-40"
          >
            Whisper as NPC
          </button>
        </div>
      </div>}

      {mechanicsMode==="give"&&<div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_90px_auto]">
        <select value={giveItem} onChange={e=>setGiveItem(e.target.value)} className={inputClass}>
          <option value="">Choose Item...</option>
          {(mechanics.items??[])
            .filter((item:any)=>
              !item.parent_container_id&&
              !item.is_equipped&&
              item.transfer_policy==="free"&&
              !item.is_quest_item
            )
            .map((item:any)=>
              <option key={`${item.record_kind}:${item.record_id}`} value={item.record_id}>
                {item.name}{Number(item.quantity??1)>1?` ×${item.quantity}`:""}
              </option>
            )}
        </select>
        <select value={giveTarget} onChange={e=>setGiveTarget(e.target.value)} className={inputClass}>
          <option value="">Give to Character...</option>
          {(mechanics.targets??[]).filter((target:any)=>target.is_system!==true).map((target:any)=>
            <option key={target.id} value={target.id}>{target.display_name}</option>
          )}
        </select>
        <input
          type="number"
          min={1}
          step={1}
          value={giveQuantity}
          onChange={e=>setGiveQuantity(Math.max(1,Number.parseInt(e.target.value||"1",10)||1))}
          className={inputClass}
        />
        <button
          type="button"
          disabled={pending||!giveItem||!giveTarget}
          onClick={giveItemToCharacter}
          className="mt-1 border border-[rgb(var(--sep-colour-8d6d3e))]/70 px-3 py-2 text-[8px] uppercase disabled:opacity-40"
        >
          Give Item
        </button>
      </div>}''',
    "NPC panel Whisper/Give content",
)
s = replace_once(
    s,
'''      <textarea value={postText} disabled={pending||!selected.is_active||!inThisRoom} onChange={e=>setPostText(e.target.value)} rows={3} placeholder={!selected.is_active?"Activate this NPC first.":!inThisRoom?"Bring this NPC to this Location first.":`Write as ${selected.name}...`} className="block w-full resize-y border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-[11px] text-[rgb(var(--sep-colour-d6c4a8))] disabled:opacity-45"/>
      <div className="mt-2 flex justify-end"><button type="button" disabled={pending||!postText.trim()||!selected.is_active||!inThisRoom} onClick={post}''',
'''      <textarea value={postText} disabled={pending||!selected.is_active||!selected.is_location_active||!inThisRoom} onChange={e=>setPostText(e.target.value)} rows={3} placeholder={!selected.is_active?"Activate this NPC first.":!selected.is_location_active?"Set this NPC Active in Locations first.":!inThisRoom?"Bring this NPC to this Location first.":`Write as ${selected.name}...`} className="block w-full resize-y border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-[11px] text-[rgb(var(--sep-colour-d6c4a8))] disabled:opacity-45"/>
      <div className="mt-2 flex justify-end"><button type="button" disabled={pending||!postText.trim()||!selected.is_active||!selected.is_location_active||!inThisRoom} onClick={post}''',
    "NPC panel post location-active",
)
changes[p] = s

# RoomMessageList.tsx
p = "app/(portal)/game/components/RoomMessageList.tsx"
s = read(p)
s = replace_once(
    s,
'''      {!isNpc ? (
        <CharacterOrderIdentity
          characterId={author.id}
          variant="chat"
        />
      ) : null}''',
'''      <CharacterOrderIdentity
        characterId={author.id}
        variant="chat"
      />''',
    "Room chat NPC Order symbol",
)
s = replace_once(
    s,
'''function mergeMessages(
  currentMessages: RoomMessage[],''',
'''type ChatHealth = {
  current: number;
  max: number;
};

function ChatHealthBar({
  health,
}: {
  health: ChatHealth | undefined;
}) {
  if (!health) {
    return null;
  }

  const max =
    Math.max(1, health.max);
  const current =
    Math.max(
      0,
      Math.min(
        health.current,
        max,
      ),
    );
  const percentage =
    Math.max(
      0,
      Math.min(
        100,
        (current / max) * 100,
      ),
    );

  return (
    <div
      className="mt-1 w-11"
      title={`Health ${current} / ${max}`}
      aria-label={`Health ${current} of ${max}`}
    >
      <div className="h-1.5 overflow-hidden border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-160d0b))]">
        <div
          className="h-full bg-[rgb(var(--sep-colour-b36b55))] transition-[width] duration-300"
          style={{
            width: `${percentage}%`,
          }}
        />
      </div>
      <div className="mt-0.5 text-center text-[6px] leading-3 text-[rgb(var(--sep-colour-8f8170))]">
        {current}/{max}
      </div>
    </div>
  );
}

function mergeMessages(
  currentMessages: RoomMessage[],''',
    "Room chat Health component",
)
s = replace_once(
    s,
'''const [chatFrames,setChatFrames]=useState<
  Record<string,string>
>({});

const chatCharacterIdsKey =''',
'''const [chatFrames,setChatFrames]=useState<
  Record<string,string>
>({});

const [chatHealth,setChatHealth]=useState<
  Record<string,ChatHealth>
>({});

const chatCharacterIdsKey =''',
    "Room chat Health state",
)
s = replace_once(
    s,
'''const messageIdsKey =
  liveMessages
    .map((message) => message.id)
    .sort()
    .join(",");

  const scrollContainerRef =''',
'''const messageIdsKey =
  liveMessages
    .map((message) => message.id)
    .sort()
    .join(",");

useEffect(() => {
  let active = true;
  let timer: number | null = null;

  async function refreshChatHealth() {
    const ids =
      chatCharacterIdsKey
        .split(",")
        .filter(Boolean);

    if (!ids.length) {
      if (active) {
        setChatHealth({});
      }
      return;
    }

    const supabase =
      createClient();

    const {
      data: rows,
      error,
    } = await supabase
      .from("characters")
      .select("id,current_health")
      .in("id", ids);

    if (error) {
      console.error(
        "Unable to load chat Health:",
        error.message,
      );
      return;
    }

    const results =
      await Promise.all(
        (rows ?? []).map(
          async (row) => {
            const {
              data: maxHealth,
              error: maxError,
            } = await supabase.rpc(
              "get_character_current_max_health",
              {
                p_character_id:
                  row.id,
              },
            );

            if (maxError) {
              console.error(
                "Unable to load chat maximum Health:",
                maxError.message,
              );
              return null;
            }

            const max =
              Math.max(
                1,
                Number(
                  maxHealth ?? 1,
                ),
              );

            const current =
              Math.max(
                0,
                Math.min(
                  Number(
                    row.current_health ??
                      max,
                  ),
                  max,
                ),
              );

            return [
              String(row.id),
              {
                current,
                max,
              } satisfies ChatHealth,
            ] as const;
          },
        ),
      );

    if (!active) {
      return;
    }

    const next: Record<string,ChatHealth> = {};

    for (const entry of results) {
      if (entry) {
        next[entry[0]] = entry[1];
      }
    }

    setChatHealth(next);
  }

  void refreshChatHealth();

  timer =
    window.setInterval(
      () => {
        void refreshChatHealth();
      },
      10_000,
    );

  return () => {
    active = false;

    if (timer !== null) {
      window.clearInterval(
        timer,
      );
    }
  };
}, [chatCharacterIdsKey]);

  const scrollContainerRef =''',
    "Room chat Health effect",
)
s = replace_once(
    s,
'''                        id: npcSnapshot.id,
                        first_name: npcSnapshot.name,''',
'''                        id:
                          npcSnapshot.character_id ??
                          npcSnapshot.id,
                        first_name: npcSnapshot.name,''',
    "NPC backing Character ID in chat author",
)
# Whisper/offgame left column: unique block before its time.
s = replace_once(
    s,
'''                        <div className="flex items-start gap-1.5 game_components_roommessagelist_div_container_9">
                          <CharacterPortrait
                            author={author}
                            characterHref={
                              characterHref
                            }
                          />

                          <CharacterIdentityIcons
                            author={author}
                            isNpc={isNpcMessage}
                          />
                        </div>

                        <time''',
'''                        <div className="flex items-start gap-1.5 game_components_roommessagelist_div_container_9">
                          <CharacterPortrait
                            author={author}
                            characterHref={
                              characterHref
                            }
                          />

                          <CharacterIdentityIcons
                            author={author}
                            isNpc={isNpcMessage}
                          />
                        </div>

                        <ChatHealthBar
                          health={
                            metadataCharacterId
                              ? chatHealth[
                                  metadataCharacterId
                                ]
                              : undefined
                          }
                        />

                        <time''',
    "Health bar whisper/offgame placement",
)
# Normal message left column.
s = replace_once(
    s,
'''                      <div className="flex items-start gap-1.5 game_components_roommessagelist_div_container_14">
                        <CharacterPortrait
                          author={author}
                          characterHref={characterHref}
                        />

                        <CharacterIdentityIcons
                          author={author}
                          isNpc={isNpcMessage}
                        />
                      </div>

                      <time''',
'''                      <div className="flex items-start gap-1.5 game_components_roommessagelist_div_container_14">
                        <CharacterPortrait
                          author={author}
                          characterHref={characterHref}
                        />

                        <CharacterIdentityIcons
                          author={author}
                          isNpc={isNpcMessage}
                        />
                      </div>

                      <ChatHealthBar
                        health={
                          metadataCharacterId
                            ? chatHealth[
                                metadataCharacterId
                              ]
                            : undefined
                        }
                      />

                      <time''',
    "Health bar normal placement",
)
changes[p] = s

# SQL migration
sql = r'''-- NPC interaction integrity and Character/NPC parity
-- Built for application commit f24c6f4.
-- Run in Supabase SQL Editor after applying the Python source patch.

begin;

create or replace function public.normalize_npc_mechanics_room_message()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_npc public.npcs%rowtype;
  v_staff_character_id uuid;
  v_staff_role text;
  v_race jsonb;
begin
  select n.*
  into v_npc
  from public.npcs n
  join public.characters c on c.id = n.character_id
  where c.id = new.character_id
    and c.is_system = true
    and n.is_active = true
    and n.is_location_active = true
  limit 1;

  if not found then
    return new;
  end if;

  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  select sm.role
  into v_staff_role
  from public.staff_members sm
  where sm.user_id = auth.uid();

  if v_staff_role is null
     or v_staff_role not in ('owner','admin','master') then
    raise exception 'NPC mechanics require Master/Admin/Owner access.';
  end if;

  if v_npc.current_room_id is distinct from new.room_id then
    raise exception 'NPC is not in this Location.';
  end if;

  select c.id
  into v_staff_character_id
  from public.characters c
  where c.user_id = auth.uid()
    and c.is_system = false
    and c.status = 'approved'
    and c.current_room_id = new.room_id
  limit 1;

  if v_staff_character_id is null then
    raise exception 'Your staff Character must be in this Location to control an NPC.';
  end if;

  select case
    when r.id is null then null
    else jsonb_build_object(
      'id', r.id,
      'name', r.name,
      'icon_url', r.icon_url
    )
  end
  into v_race
  from public.characters c
  left join public.races r on r.id = c.race_id
  where c.id = v_npc.character_id;

  new.character_id := v_staff_character_id;
  new.speaker_type := 'npc';
  new.npc_id := v_npc.id;
  new.sent_by_user_id := auth.uid();
  new.npc_snapshot := jsonb_build_object(
    'id', v_npc.id,
    'character_id', v_npc.character_id,
    'name', v_npc.name,
    'pronouns', v_npc.pronouns,
    'portrait_url', v_npc.portrait_url,
    'description', v_npc.description,
    'race', v_race
  );

  return new;
end;
$function$;

create or replace function public.validate_room_message_npc_speaker()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  npc_row public.npcs%rowtype;
begin
  if new.speaker_type='npc' then
    if new.npc_id is null then
      raise exception 'NPC message requires npc_id';
    end if;

    select *
    into npc_row
    from public.npcs
    where id=new.npc_id;

    if not found then
      raise exception 'NPC not found';
    end if;

    if npc_row.is_active is not true then
      raise exception 'NPC is inactive';
    end if;

    if npc_row.is_location_active is not true then
      raise exception 'NPC is not Active in Locations';
    end if;

    if npc_row.current_room_id is distinct from new.room_id then
      raise exception 'NPC is not in this Location';
    end if;
  else
    new.npc_id=null;
    new.npc_snapshot=null;
  end if;

  return new;
end;
$function$;

create or replace function public.start_direct_conversation(recipient_character_id uuid)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  sender_character_id uuid;
  sender_user_id uuid;
  generated_pair_key text;
  target_conversation_id uuid;
begin
  sender_user_id := auth.uid();

  perform public.raise_if_user_sanctioned(
    sender_user_id,
    'communication'
  );

  select c.id
  into sender_character_id
  from public.characters c
  where c.user_id = sender_user_id
  limit 1;

  if sender_character_id is null then
    raise exception 'No character belongs to the authenticated user.';
  end if;

  if recipient_character_id is null then
    raise exception 'Missing recipient.';
  end if;

  if recipient_character_id = sender_character_id then
    raise exception 'You cannot message yourself.';
  end if;

  if not exists (
    select 1
    from public.characters c
    where c.id = recipient_character_id
  ) then
    raise exception 'Recipient not found.';
  end if;

  if exists (
    select 1
    from public.npcs n
    where n.character_id = recipient_character_id
  ) then
    raise exception 'NPCs cannot receive private messages.';
  end if;

  if exists (
    select 1
    from public.character_blocks cb
    where
      (
        cb.blocker_character_id = sender_character_id
        and cb.blocked_character_id = recipient_character_id
      )
      or
      (
        cb.blocker_character_id = recipient_character_id
        and cb.blocked_character_id = sender_character_id
      )
  ) then
    raise exception 'This conversation is unavailable.';
  end if;

  generated_pair_key :=
    case
      when sender_character_id::text < recipient_character_id::text
        then sender_character_id::text || ':' || recipient_character_id::text
      else recipient_character_id::text || ':' || sender_character_id::text
    end;

  insert into public.direct_conversations (pair_key)
  values (generated_pair_key)
  on conflict (pair_key)
  do update set pair_key = excluded.pair_key
  returning id into target_conversation_id;

  insert into public.direct_conversation_participants (
    conversation_id,
    character_id
  )
  values
    (target_conversation_id, sender_character_id),
    (target_conversation_id, recipient_character_id)
  on conflict (conversation_id, character_id)
  do nothing;

  return target_conversation_id;
end;
$function$;

create or replace function public.create_item_trade(other uuid)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  me uuid := public.my_character_id();
  a uuid;
  b uuid;
  tid uuid;
begin
  if me is null or other = me then
    raise exception 'Invalid exchange.';
  end if;

  if exists (
    select 1
    from public.npcs n
    where n.character_id = other
  ) then
    raise exception 'NPCs cannot take part in Item Exchanges. Use Give Item instead.';
  end if;

  perform 1
  from public.characters
  where id in (me, other)
  order by id
  for update;

  select current_room_id into a
  from public.characters
  where id = me and status = 'approved';

  select current_room_id into b
  from public.characters
  where id = other and status = 'approved';

  if a is null or b is distinct from a then
    raise exception 'Both characters must be in the same Location.';
  end if;

  if exists (
    select 1
    from public.item_trades
    where status = 'open'
      and (
        me in (character_one_id, character_two_id)
        or other in (character_one_id, character_two_id)
      )
  ) then
    raise exception 'One character already has an open Item Exchange.';
  end if;

  insert into public.item_trades(character_one_id, character_two_id)
  values(me, other)
  returning id into tid;

  return tid;
end;
$function$;

create or replace function public.give_npc_inventory_record_as_staff(
  p_source_character_id uuid,
  p_record_kind text,
  p_record_id uuid,
  p_target_character_id uuid,
  p_quantity integer default 1
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_source_room uuid;
  v_target_room uuid;
  v_item_id uuid;
  v_have integer;
  v_policy text;
  v_quest boolean;
  v_instance public.character_item_instances%rowtype;
  v_action_id uuid;
  v_item_name text;
  v_giver_name text;
  v_target_name text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  if not public.is_staff_user() then
    raise exception 'Staff access required.';
  end if;

  if p_quantity is null or p_quantity < 1 then
    raise exception 'Invalid transfer quantity.';
  end if;

  if not exists (
    select 1
    from public.characters c
    join public.npcs n on n.character_id = c.id
    where c.id = p_source_character_id
      and c.is_system = true
      and c.status = 'approved'
      and n.is_active = true
      and n.is_location_active = true
  ) then
    raise exception 'Active NPC Character not found.';
  end if;

  if not exists (
    select 1
    from public.characters c
    where c.id = p_target_character_id
      and c.status = 'approved'
      and c.is_system = false
  ) then
    raise exception 'Choose an ordinary Character.';
  end if;

  if p_target_character_id = p_source_character_id then
    raise exception 'You cannot give an Item to yourself.';
  end if;

  select current_room_id,
         coalesce(nullif(display_name,''), btrim(coalesce(first_name,'')||' '||coalesce(surname,'')), id::text)
  into v_source_room, v_giver_name
  from public.characters
  where id = p_source_character_id;

  select current_room_id,
         coalesce(nullif(display_name,''), btrim(coalesce(first_name,'')||' '||coalesce(surname,'')), id::text)
  into v_target_room, v_target_name
  from public.characters
  where id = p_target_character_id;

  if v_source_room is null
     or v_target_room is distinct from v_source_room then
    raise exception 'Both characters must be in the same Location.';
  end if;

  if public.item_record_is_equipped(
       p_record_kind,
       p_record_id,
       p_source_character_id
     ) then
    raise exception 'Unequip this Item first.';
  end if;

  if p_record_kind = 'standard' then
    select ci.item_id, ci.quantity, i.transfer_policy, i.is_quest_item
    into v_item_id, v_have, v_policy, v_quest
    from public.character_items ci
    join public.items i on i.id = ci.item_id
    where ci.id = p_record_id
      and ci.character_id = p_source_character_id
      and ci.container_instance_id is null
    for update of ci;

    if not found then
      raise exception 'Item not found in Loose Inventory.';
    end if;

    if v_policy <> 'free' or v_quest then
      raise exception 'This Item cannot be transferred.';
    end if;

    if p_quantity > v_have then
      raise exception 'Not enough quantity.';
    end if;

    select name into v_item_name
    from public.items
    where id = v_item_id;

    v_action_id :=
      public.character_audit_begin_action(
        'item_gift',
        'gift'
      );

    if p_quantity = v_have then
      update public.character_items
      set character_id = p_target_character_id,
          acquisition_source = 'gift',
          assigned_by = null,
          updated_at = now()
      where id = p_record_id;
    else
      update public.character_items
      set quantity = quantity - p_quantity,
          updated_at = now()
      where id = p_record_id;

      insert into public.character_items(
        character_id,
        item_id,
        quantity,
        acquisition_source,
        acquired_at
      )
      values(
        p_target_character_id,
        v_item_id,
        p_quantity,
        'gift',
        now()
      );
    end if;

  elsif p_record_kind = 'unique' then
    if p_quantity <> 1 then
      raise exception 'Unique Items have quantity 1.';
    end if;

    select *
    into v_instance
    from public.character_item_instances
    where id = p_record_id
      and owner_character_id = p_source_character_id
      and container_instance_id is null
      and vault_status = 'owned'
    for update;

    if not found then
      raise exception 'Unique Item not found in Loose Inventory.';
    end if;

    select
      coalesce(v_instance.transfer_policy_override, i.transfer_policy),
      coalesce(v_instance.is_quest_item_override, i.is_quest_item)
    into v_policy, v_quest
    from public.items i
    where i.id = v_instance.item_id;

    if v_policy <> 'free' or v_quest then
      raise exception 'This Item cannot be transferred.';
    end if;

    v_item_id := v_instance.item_id;

    select name into v_item_name
    from public.items
    where id = v_item_id;

    v_action_id :=
      public.character_audit_begin_action(
        'item_gift',
        'gift'
      );

    update public.character_item_instances
    set owner_character_id = p_target_character_id,
        acquisition_source = 'gift',
        acquired_at = now(),
        updated_at = now()
    where id = p_record_id;

    insert into public.item_instance_history(
      item_instance_id,
      event_type,
      from_character_id,
      to_character_id,
      actor_user_id,
      details
    )
    values(
      p_record_id,
      'gift',
      p_source_character_id,
      p_target_character_id,
      auth.uid(),
      'Given directly by staff-controlled NPC.'
    );

  else
    raise exception 'Invalid Item type.';
  end if;

  perform public.character_audit_write_event(
    p_source_character_id,
    'item_given',
    'gift',
    v_action_id,
    jsonb_build_object(
      'item_id', v_item_id,
      'item_name', v_item_name,
      'quantity', p_quantity,
      'other_character_id', p_target_character_id,
      'other_character_name', v_target_name,
      'direction', 'given'
    ),
    'item_gift',
    v_action_id::text
  );

  perform public.character_audit_write_event(
    p_target_character_id,
    'item_received',
    'gift',
    v_action_id,
    jsonb_build_object(
      'item_id', v_item_id,
      'item_name', v_item_name,
      'quantity', p_quantity,
      'other_character_id', p_source_character_id,
      'other_character_name', v_giver_name,
      'direction', 'received'
    ),
    'item_gift',
    v_action_id::text
  );

  perform public._normalize_character_inventory_stacks(
    p_source_character_id
  );
  perform public._normalize_character_inventory_stacks(
    p_target_character_id
  );
end;
$function$;

revoke all on function public.give_npc_inventory_record_as_staff(uuid,text,uuid,uuid,integer) from public, anon;
grant execute on function public.give_npc_inventory_record_as_staff(uuid,text,uuid,uuid,integer) to authenticated, service_role;

create or replace function public.resolve_opposed_item_use(
  p_action_id uuid,
  p_apply_effects boolean
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'auth'
as $function$
declare
  v_action public.opposed_actions%rowtype;
  v_item public.items%rowtype;
  v_my_character uuid;
  v_attacker_user uuid;
  v_attacker_is_npc boolean := false;
  v_source_key text;
  v_quantity integer;
  v_charges integer;
  v_rpc jsonb;
  v_audit_action_id uuid;
begin
  select *
  into v_action
  from public.opposed_actions
  where id = p_action_id
  for update;

  if v_action.id is null then
    raise exception 'Opposed Action not found.';
  end if;

  if v_action.status <> 'pending' then
    raise exception 'That Action is no longer pending.';
  end if;

  v_my_character := public.my_character_id();

  if v_my_character = v_action.target_character_id then
    null;
  elsif public.is_staff_user() and exists (
    select 1
    from public.characters c
    join public.npcs n on n.character_id = c.id
    where c.id = v_action.target_character_id
      and c.is_system = true
      and n.is_active = true
      and n.is_location_active = true
      and n.current_room_id = v_action.room_id
  ) then
    null;
  else
    raise exception 'You cannot resolve that Action.';
  end if;

  if v_action.action_kind <> 'item' then
    return jsonb_build_object('ok', true, 'handled', false);
  end if;

  if v_action.source_item_id is null
     or v_action.source_record_kind is null
     or v_action.source_record_id is null then
    raise exception 'This opposed Item is missing its source Inventory record.';
  end if;

  select *
  into v_item
  from public.items
  where id = v_action.source_item_id;

  if v_item.id is null then
    raise exception 'The source Item no longer exists.';
  end if;

  v_source_key :=
    case
      when v_action.source_record_kind = 'unique'
        then 'unique:' || v_action.source_record_id::text
      else 'standard:' || v_action.source_item_id::text
    end;

  if exists (
    select 1
    from public.character_item_use_cooldowns c
    where c.character_id = v_action.attacker_character_id
      and c.source_key = v_source_key
      and c.ready_at > now()
  ) then
    raise exception 'This Item is still on cooldown.';
  end if;

  if not p_apply_effects then
    v_audit_action_id :=
      public.character_audit_begin_action(
        'item_used',
        'item_use'
      );

    if v_item.use_behaviour = 'consumable' then
      if v_action.source_record_kind = 'standard' then
        select quantity
        into v_quantity
        from public.character_items
        where id = v_action.source_record_id
          and character_id = v_action.attacker_character_id
        for update;

        if coalesce(v_quantity, 0) <= 0 then
          raise exception 'This Item has no uses remaining.';
        end if;

        if v_quantity = 1 then
          delete from public.character_items
          where id = v_action.source_record_id
            and character_id = v_action.attacker_character_id;
        else
          update public.character_items
          set quantity = quantity - 1
          where id = v_action.source_record_id
            and character_id = v_action.attacker_character_id;
        end if;
      else
        delete from public.character_item_instances
        where id = v_action.source_record_id
          and owner_character_id = v_action.attacker_character_id
          and vault_status = 'owned';

        if not found then
          raise exception 'That Item is no longer in the attacker''s Inventory.';
        end if;
      end if;

    elsif v_item.use_behaviour = 'limited_charges' then
      if v_action.source_record_kind <> 'unique' then
        raise exception 'Limited-charge Items require an individual Item instance.';
      end if;

      select charges_remaining
      into v_charges
      from public.character_item_instances
      where id = v_action.source_record_id
        and owner_character_id = v_action.attacker_character_id
        and vault_status = 'owned'
      for update;

      if coalesce(v_charges, 0) <= 0 then
        raise exception 'This Item has no charges remaining.';
      end if;

      update public.character_item_instances
      set charges_remaining = v_charges - 1
      where id = v_action.source_record_id
        and owner_character_id = v_action.attacker_character_id
        and vault_status = 'owned';
    end if;

    perform public.character_audit_write_event(
      v_action.attacker_character_id,
      'item_used',
      'item_use',
      v_audit_action_id,
      jsonb_build_object(
        'item_id', v_item.id,
        'item_name', v_item.name,
        'record_kind', v_action.source_record_kind,
        'target_character_id', v_action.target_character_id,
        'opposed_action_id', p_action_id,
        'effects_applied', false,
        'countered', true
      ),
      'item_use',
      v_action.source_record_id::text
    );

    return jsonb_build_object(
      'ok', true,
      'handled', true,
      'effects_applied', false,
      'cooldown_started', false
    );
  end if;

  select exists (
    select 1
    from public.characters c
    join public.npcs n on n.character_id = c.id
    where c.id = v_action.attacker_character_id
      and c.is_system = true
      and n.is_active = true
      and n.is_location_active = true
      and n.current_room_id = v_action.room_id
  )
  into v_attacker_is_npc;

  if v_attacker_is_npc then
    select public.use_character_inventory_record_targeted_as_staff(
      v_action.attacker_character_id,
      v_action.source_record_kind,
      v_action.source_record_id,
      v_action.target_character_id
    )::jsonb
    into v_rpc;

    return coalesce(v_rpc, '{}'::jsonb);
  end if;

  select user_id
  into v_attacker_user
  from public.characters
  where id = v_action.attacker_character_id;

  if v_attacker_user is null then
    raise exception 'Attacker account could not be resolved.';
  end if;

  perform set_config(
    'request.jwt.claim.sub',
    v_attacker_user::text,
    true
  );

  begin
    select public.use_own_inventory_record_targeted(
      v_action.source_record_kind,
      v_action.source_record_id,
      v_action.target_character_id
    )::jsonb
    into v_rpc;
  exception
    when others then
      if sqlerrm not ilike '%no configured Use effect%' then
        raise;
      end if;

      if v_item.use_behaviour = 'consumable' then
        if v_action.source_record_kind = 'standard' then
          select quantity
          into v_quantity
          from public.character_items
          where id = v_action.source_record_id
            and character_id = v_action.attacker_character_id
          for update;

          if coalesce(v_quantity, 0) <= 0 then
            raise exception 'This Item has no uses remaining.';
          end if;

          if v_quantity = 1 then
            delete from public.character_items
            where id = v_action.source_record_id
              and character_id = v_action.attacker_character_id;
          else
            update public.character_items
            set quantity = quantity - 1
            where id = v_action.source_record_id
              and character_id = v_action.attacker_character_id;
          end if;
        else
          delete from public.character_item_instances
          where id = v_action.source_record_id
            and owner_character_id = v_action.attacker_character_id
            and vault_status = 'owned';
        end if;

      elsif v_item.use_behaviour = 'limited_charges' then
        select charges_remaining
        into v_charges
        from public.character_item_instances
        where id = v_action.source_record_id
          and owner_character_id = v_action.attacker_character_id
          and vault_status = 'owned'
        for update;

        if coalesce(v_charges, 0) <= 0 then
          raise exception 'This Item has no charges remaining.';
        end if;

        update public.character_item_instances
        set charges_remaining = v_charges - 1
        where id = v_action.source_record_id
          and owner_character_id = v_action.attacker_character_id
          and vault_status = 'owned';
      end if;

      if coalesce(v_item.cooldown_minutes, 0) > 0 then
        insert into public.character_item_use_cooldowns(
          character_id,
          source_key,
          ready_at
        )
        values(
          v_action.attacker_character_id,
          v_source_key,
          now() + make_interval(mins => v_item.cooldown_minutes)
        )
        on conflict (character_id, source_key)
        do update set ready_at = excluded.ready_at;
      end if;

      v_rpc := jsonb_build_object(
        'ok', true,
        'blocked', false,
        'damage_only_fallback', true
      );
  end;

  return coalesce(v_rpc, '{}'::jsonb);
end;
$function$;

commit;
'''
changes["supabase_npc_interactions_health_f24c6f4.sql"] = sql

# Write only after all transforms passed.
BACKUP_ROOT.mkdir(parents=True, exist_ok=True)

for rel in changes:
    path = ROOT / rel
    if path.exists():
        backup = BACKUP_ROOT / rel
        backup.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(path, backup)

for rel, new_text in changes.items():
    path = ROOT / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(new_text, encoding="utf-8", newline="\n")

print("\nPatch applied.")
print(f"Backups: {BACKUP_ROOT}")
print("\nChanged/created:")
for rel in changes:
    print(f"  - {rel}")
print("\nNEXT:")
print("1. Run supabase_npc_interactions_health_f24c6f4.sql in the Supabase SQL editor.")
print("2. Run: npm run build")
print("3. Do NOT commit/push until both SQL and build are checked.")
