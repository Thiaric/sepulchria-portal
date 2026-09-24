from pathlib import Path
import shutil
import subprocess
import sys

BASE = "f1933e3"
ROOT = Path.cwd()
BACKUP = ROOT / ".patch_backups" / "fix_npc_order_whisper_health_f1933e3"

def fail(message: str) -> None:
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
        fail(result.stderr.strip() or f"git {' '.join(args)} failed")
    return result.stdout.strip()

def read(rel: str) -> str:
    path = ROOT / rel
    if not path.exists():
        fail(f"Missing expected file: {rel}")
    return path.read_text(encoding="utf-8")

def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        fail(f"{label}: expected exactly 1 match, found {count}. No files changed.")
    return text.replace(old, new, 1)

head = git("rev-parse", "--short", "HEAD")
print(f"Current HEAD: {head}")
if head != BASE:
    fail(f"This patch is built for {BASE}, but current HEAD is {head}.")

changes = {}

# ---------------------------------------------------------------------
# 1. CharacterOrderIdentity:
#    Keep Character membership logic exactly as-is.
#    For NPCs, fetch ONLY the visual Order chosen in npcs.order_id
#    through a dedicated read-only RPC, instead of reading npcs directly.
# ---------------------------------------------------------------------
rel = "components/characters/character-order-identity.tsx"
text = read(rel)

old = '''      if (!relation) {
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
'''

new = '''      if (!relation) {
        const {
          data: npcOrderData,
          error: npcOrderError,
        } = await supabase
          .rpc(
            "get_npc_visual_order",
            {
              p_character_id:
                characterId,
            },
          )
          .maybeSingle();

        if (cancelled) {
          return;
        }

        if (npcOrderError) {
          console.error(
            "Unable to load NPC visual Order:",
            npcOrderError.message,
          );
        } else if (npcOrderData) {
          relation = {
            id:
              String(
                npcOrderData.id,
              ),
            name:
              String(
                npcOrderData.name,
              ),
            slug:
              String(
                npcOrderData.slug,
              ),
            icon_url:
              npcOrderData.icon_url
                ? String(
                    npcOrderData.icon_url,
                  )
                : null,
            colour:
              npcOrderData.colour
                ? String(
                    npcOrderData.colour,
                  )
                : null,
          };
        }
      }
'''

text = replace_once(
    text,
    old,
    new,
    "CharacterOrderIdentity NPC visual fallback",
)
changes[rel] = text

# ---------------------------------------------------------------------
# 2. NPC sheet:
#    Show Ancestry + Order images next to their names.
# ---------------------------------------------------------------------
rel = "app/(portal)/npcs/[id]/page.tsx"
text = read(rel)

text = replace_once(
    text,
'''function Detail({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="min-w-0 bg-[rgb(var(--sep-colour-17110d))] px-3 py-2">
      <p className="text-[7px] uppercase tracking-[0.19em] text-[rgb(var(--sep-colour-796448))]">
        {label}
      </p>
      <p className="mt-1 break-words text-[11px] leading-5 text-[rgb(var(--sep-colour-cab89b))]">
        {value?.trim() || "Not recorded"}
      </p>
    </div>
  );
}''',
'''function Detail({
  label,
  value,
  iconUrl = null,
}: {
  label: string;
  value: string | null | undefined;
  iconUrl?: string | null;
}) {
  return (
    <div className="min-w-0 bg-[rgb(var(--sep-colour-17110d))] px-3 py-2">
      <p className="text-[7px] uppercase tracking-[0.19em] text-[rgb(var(--sep-colour-796448))]">
        {label}
      </p>

      <div className="mt-1 flex min-w-0 items-center gap-2">
        {iconUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={iconUrl}
            alt=""
            className="h-5 w-5 shrink-0 object-contain"
          />
        ) : null}

        <p className="min-w-0 break-words text-[11px] leading-5 text-[rgb(var(--sep-colour-cab89b))]">
          {value?.trim() || "Not recorded"}
        </p>
      </div>
    </div>
  );
}''',
    "NPC sheet Detail icon support",
)

text = replace_once(
    text,
'''      order:orders(id,name),''',
'''      order:orders(
        id,
        name,
        icon_url,
        colour
      ),''',
    "NPC sheet Order icon query",
)

text = replace_once(
    text,
'''                  <Detail label="Ancestry" value={race?.name} />
                  <Detail label="Order" value={order?.name} />''',
'''                  <Detail
                    label="Ancestry"
                    value={race?.name}
                    iconUrl={race?.icon_url ?? null}
                  />
                  <Detail
                    label="Order"
                    value={order?.name}
                    iconUrl={order?.icon_url ?? null}
                  />''',
    "NPC sheet Ancestry/Order visual details",
)

changes[rel] = text

# ---------------------------------------------------------------------
# 3. NPC Post-as textarea:
#    Support Character-style typed whispers:
#    @Character Name@ whisper text
# ---------------------------------------------------------------------
rel = "app/(portal)/game/npc-actions.ts"
text = read(rel)

old = '''    const message=String(input.message??"").trim();
    if(!message||message.length>4000) return {ok:false,message:"NPC message must contain 1–4000 characters."};
    const r=await admin.from("npcs").select(`id,character_id,name,pronouns,portrait_url,description,current_room_id,is_active,is_location_active,race:races(id,name,icon_url)`).eq("id",input.npcId).maybeSingle();
    if(r.error||!r.data) return {ok:false,message:r.error?.message??"NPC not found."};
    const npc=r.data;
    if(!npc.is_active) return {ok:false,message:"This NPC is inactive."};
    if(!npc.is_location_active) return {ok:false,message:"This NPC is not Active in Locations."};
    if(npc.current_room_id!==input.roomId) return {ok:false,message:"This NPC is not currently in this Location."};
    const race=Array.isArray(npc.race)?npc.race[0]??null:npc.race??null;
    const snapshot={id:npc.id,character_id:npc.character_id??npc.id,name:npc.name,pronouns:npc.pronouns??null,portrait_url:npc.portrait_url??null,description:npc.description??null,race:race?{id:race.id,name:race.name,icon_url:race.icon_url??null}:null};
    const result=await admin.from("room_messages").insert({
      room_id:input.roomId,character_id:character.id,message,message_type:"action",speaker_type:"npc",npc_id:npc.id,npc_snapshot:snapshot,sent_by_user_id:user.id,client_nonce:crypto.randomUUID(),
    });
    return result.error?{ok:false,message:`Unable to post as NPC: ${result.error.message}`}:{ok:true,message:`Posted as ${npc.name}.`};'''

new = '''    const rawMessage=String(input.message??"").trim();
    if(!rawMessage||rawMessage.length>4000) return {ok:false,message:"NPC message must contain 1–4000 characters."};

    const r=await admin.from("npcs").select(`id,character_id,name,pronouns,portrait_url,description,current_room_id,is_active,is_location_active,race:races(id,name,icon_url)`).eq("id",input.npcId).maybeSingle();
    if(r.error||!r.data) return {ok:false,message:r.error?.message??"NPC not found."};

    const npc=r.data;

    if(!npc.is_active) return {ok:false,message:"This NPC is inactive."};
    if(!npc.is_location_active) return {ok:false,message:"This NPC is not Active in Locations."};
    if(npc.current_room_id!==input.roomId) return {ok:false,message:"This NPC is not currently in this Location."};

    let storedMessage=rawMessage;
    let messageType:"action"|"whisper"="action";
    let whisperRecipientId:string|null=null;

    const typedWhisperMatch=
      rawMessage.match(
        /^@([^@\\r\\n]+)@\\s*/,
      );

    if(typedWhisperMatch){
      const typedCharacterName=
        typedWhisperMatch[1].trim();

      const targetResult=await admin
        .from("characters")
        .select("id,display_name,current_room_id,status,is_system")
        .ilike("display_name",typedCharacterName)
        .eq("status","approved")
        .eq("is_system",false)
        .eq("current_room_id",input.roomId)
        .limit(1)
        .maybeSingle();

      if(targetResult.error){
        return {
          ok:false,
          message:`Unable to verify whisper recipient: ${targetResult.error.message}`,
        };
      }

      if(!targetResult.data){
        return {
          ok:false,
          message:"Character not at this Location",
        };
      }

      storedMessage=
        rawMessage
          .slice(
            typedWhisperMatch[0]
              .length,
          )
          .trim();

      if(!storedMessage){
        return {
          ok:false,
          message:"Write the whisper after the character marker.",
        };
      }

      messageType="whisper";
      whisperRecipientId=
        targetResult.data.id;
    }

    const race=Array.isArray(npc.race)?npc.race[0]??null:npc.race??null;
    const snapshot={id:npc.id,character_id:npc.character_id??npc.id,name:npc.name,pronouns:npc.pronouns??null,portrait_url:npc.portrait_url??null,description:npc.description??null,race:race?{id:race.id,name:race.name,icon_url:race.icon_url??null}:null};

    const result=await admin.from("room_messages").insert({
      room_id:input.roomId,
      character_id:character.id,
      message:storedMessage,
      message_type:messageType,
      whisper_recipient_character_id:whisperRecipientId,
      speaker_type:"npc",
      npc_id:npc.id,
      npc_snapshot:snapshot,
      sent_by_user_id:user.id,
      client_nonce:crypto.randomUUID(),
    });

    return result.error
      ? {ok:false,message:`Unable to post as NPC: ${result.error.message}`}
      : {
          ok:true,
          message:
            messageType==="whisper"
              ? `Whisper sent as ${npc.name}.`
              : `Posted as ${npc.name}.`,
        };'''

text = replace_once(
    text,
    old,
    new,
    "NPC Post-as typed whisper parsing",
)

changes[rel] = text

# ---------------------------------------------------------------------
# 4. Health bar:
#    Bar only, no numbers. Fixed full-scale gradient from
#    red -> orange -> yellow -> green, clipped to current percentage.
# ---------------------------------------------------------------------
rel = "app/(portal)/game/components/RoomMessageList.tsx"
text = read(rel)

old = '''  return (
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
  );'''

new = '''  return (
    <div
      className="mt-1 w-11"
      title={`Health ${current} / ${max}`}
      aria-label={`Health ${current} of ${max}`}
    >
      <div className="h-1.5 overflow-hidden border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-160d0b))]">
        <div
          className="h-full overflow-hidden transition-[width] duration-300"
          style={{
            width: `${percentage}%`,
          }}
        >
          <div
            className="h-full w-11"
            style={{
              background:
                "linear-gradient(to right, #b8322a 0%, #dd6b2f 33%, #d7b635 66%, #4b9b4b 100%)",
            }}
          />
        </div>
      </div>
    </div>
  );'''

text = replace_once(
    text,
    old,
    new,
    "room message Health bar styling",
)

changes[rel] = text

# ---------------------------------------------------------------------
# SQL: read-only visual Order RPC for NPCs.
# ---------------------------------------------------------------------
sql_rel = "supabase_npc_visual_order_f1933e3.sql"
sql = r'''begin;

create or replace function public.get_npc_visual_order(
  p_character_id uuid
)
returns table(
  id uuid,
  name text,
  slug text,
  icon_url text,
  colour text
)
language sql
stable
security definer
set search_path to 'public'
as $function$
  select
    o.id,
    o.name,
    o.slug,
    o.icon_url,
    o.colour
  from public.npcs n
  join public.orders o
    on o.id = n.order_id
  where n.character_id = p_character_id
  limit 1;
$function$;

revoke all on function public.get_npc_visual_order(uuid)
from public, anon;

grant execute on function public.get_npc_visual_order(uuid)
to authenticated, service_role;

commit;
'''
changes[sql_rel] = sql

# Validate all transforms before writing.
BACKUP.mkdir(parents=True, exist_ok=True)

for rel in changes:
    path = ROOT / rel
    if path.exists():
        backup = BACKUP / rel
        backup.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(path, backup)

for rel, content in changes.items():
    path = ROOT / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8", newline="\n")
    print(f"Patched/created: {rel}")

print(f"\nBackups: {BACKUP}")
print("\nNothing committed or pushed.")
print("\nNEXT:")
print("1. Run supabase_npc_visual_order_f1933e3.sql in Supabase SQL Editor.")
print("2. Run: npm run build")
