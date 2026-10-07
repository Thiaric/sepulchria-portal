from pathlib import Path

FILES = {
    "map_link": Path("components/portal/leave-location-map-link.tsx"),
    "actions": Path("app/(portal)/game/actions.ts"),
    "opposed": Path("app/(portal)/game/opposed-actions.ts"),
    "room_form": Path("app/(portal)/game/components/RoomChatForm.tsx"),
    "feat_mech": Path("app/(portal)/game/feat-mechanics-actions.ts"),
    "warping_actions": Path("app/(portal)/game/warping-actions.ts"),
    "warping_panel": Path("app/(portal)/game/components/WarpingPanel.tsx"),
    "npc_mech": Path("app/(portal)/game/npc-mechanics-actions.ts"),
    "npc_panel": Path("app/(portal)/game/components/NpcControlPanel.tsx"),
    "helper": Path("lib/game/recent-room-actions.ts"),
    "api": Path("app/api/game/recent-room-actions/route.ts"),
}

def fail(message: str) -> None:
    raise SystemExit(f"ERROR: {message}\nNo changes were made.")

for key in (
    "map_link", "actions", "opposed", "room_form",
    "feat_mech", "warping_actions", "warping_panel",
    "npc_mech", "npc_panel",
):
    if not FILES[key].exists():
        fail(f"Missing expected file: {FILES[key]}")

for key in ("helper", "api"):
    if FILES[key].exists():
        fail(f"{FILES[key]} already exists; refusing to overwrite it.")

src = {
    key: path.read_text(encoding="utf-8")
    for key, path in FILES.items()
    if key not in ("helper", "api")
}

def replace_once(key: str, old: str, new: str, label: str) -> None:
    text = src[key]
    count = text.count(old)
    if count != 1:
        fail(f"Could not uniquely locate {label}: expected 1, found {count}.")
    src[key] = text.replace(old, new, 1)

# 1. Map navigation keeps location.
src["map_link"] = '''"use client";

import Link from "next/link";
import type { ReactNode } from "react";

type LeaveLocationMapLinkProps = {
  href: "/" | "/?map=sepulchria";
  className?: string;
  title?: string;
  ariaLabel?: string;
  children: ReactNode;
};

export function LeaveLocationMapLink({
  href,
  className,
  title,
  ariaLabel,
  children,
}: LeaveLocationMapLinkProps) {
  return (
    <Link
      href={href}
      className={className}
      title={title}
      aria-label={ariaLabel}
    >
      {children}
    </Link>
  );
}
'''

actions = src["actions"]
start = actions.find("async function leaveLocationForMap(")
if start < 0:
    fail("Could not locate leaveLocationForMap().")
end = actions.find(
    "export async function leaveCurrentRoom(): Promise<void> {",
    start,
)
if end < 0:
    fail("Could not locate leaveCurrentRoom().")
src["actions"] = actions[:start] + actions[end:]

# 2. Recent proper-action helper.
helper = '''import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export const RECENT_ROOM_ACTION_MINUTES = 60;

type RoomActionRow = {
  character_id: string | null;
  speaker_type: string | null;
  message_type: string | null;
  npc_snapshot: Record<string, unknown> | null;
};

function getActorCharacterId(
  row: RoomActionRow,
) {
  if (
    row.speaker_type === "npc" &&
    row.npc_snapshot
  ) {
    const npcCharacterId =
      row.npc_snapshot["character_id"];

    if (
      typeof npcCharacterId === "string" &&
      npcCharacterId
    ) {
      return npcCharacterId;
    }
  }

  return row.character_id;
}

export async function getRecentRoomActionCharacterIds(
  roomId: string,
) {
  const admin = createAdminClient();

  const since = new Date(
    Date.now() -
      RECENT_ROOM_ACTION_MINUTES * 60_000,
  ).toISOString();

  const { data, error } =
    await admin
      .from("room_messages")
      .select(
        "character_id, speaker_type, message_type, npc_snapshot",
      )
      .eq("room_id", roomId)
      .in(
        "message_type",
        ["action", "attribute_check"],
      )
      .gte("created_at", since)
      .order("created_at", {
        ascending: false,
      })
      .limit(5000);

  if (error) {
    throw new Error(
      `Unable to verify recent Location actions: ${error.message}`,
    );
  }

  return new Set(
    (data ?? [])
      .map((row) =>
        getActorCharacterId(
          row as RoomActionRow,
        ),
      )
      .filter(
        (id): id is string =>
          Boolean(id),
      ),
  );
}

export async function hasRecentRoomAction(
  roomId: string,
  characterId: string,
) {
  const ids =
    await getRecentRoomActionCharacterIds(
      roomId,
    );

  return ids.has(characterId);
}

export async function assertRecentRoomAction(
  roomId: string,
  characterId: string,
  label = "Character",
) {
  if (
    !(await hasRecentRoomAction(
      roomId,
      characterId,
    ))
  ) {
    throw new Error(
      `${label} must make a proper room action before using contextual mechanics.`,
    );
  }
}
'''

api = '''import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getRecentRoomActionCharacterIds,
  RECENT_ROOM_ACTION_MINUTES,
} from "@/lib/game/recent-room-actions";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
) {
  const roomId =
    request.nextUrl.searchParams
      .get("roomId")
      ?.trim() ?? "";

  if (!roomId) {
    return NextResponse.json(
      {
        ok: false,
        error: "roomId is required.",
      },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      {
        ok: false,
        error: "Authentication required.",
      },
      { status: 401 },
    );
  }

  const {
    data: character,
    error: characterError,
  } = await supabase
    .from("characters")
    .select(
      "id, current_room_id, status",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (characterError || !character) {
    return NextResponse.json(
      {
        ok: false,
        error:
          characterError?.message ??
          "Character not found.",
      },
      { status: 404 },
    );
  }

  if (
    character.status !== "approved" ||
    character.current_room_id !== roomId
  ) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "This is not your current Location.",
      },
      { status: 403 },
    );
  }

  try {
    const ids =
      await getRecentRoomActionCharacterIds(
        roomId,
      );

    return NextResponse.json(
      {
        ok: true,
        minutes:
          RECENT_ROOM_ACTION_MINUTES,
        characterIds:
          Array.from(ids),
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to load recent Location actions.",
      },
      { status: 500 },
    );
  }
}
'''

# actions.ts imports
replace_once(
    "actions",
    'import { createClient } from "@/lib/supabase/server";\n',
    '''import { createClient } from "@/lib/supabase/server";
import {
  assertRecentRoomAction,
  hasRecentRoomAction,
} from "@/lib/game/recent-room-actions";
''',
    "game/actions recent-room-actions import",
)

# Feat target
replace_once(
    "actions",
    '''  if (
    !presence ||
    presence.appear_offline === true
  ) {
    throw new Error(
      "That character is no longer present in this Location.",
    );
  }

  const { data: target, error: targetError } =
''',
    '''  if (
    !presence ||
    presence.appear_offline === true
  ) {
    throw new Error(
      "That character is no longer present in this Location.",
    );
  }

  if (
    !(await hasRecentRoomAction(
      roomId,
      requestedTargetId,
    ))
  ) {
    throw new Error(
      "That character has not made a proper action in this Location within the last hour.",
    );
  }

  const { data: target, error: targetError } =
''',
    "Feat target recent-action rule",
)

# useRoomGift actor
replace_once(
    "actions",
    '''    const roomId = character.current_room_id;

    const { error: staffExpiryError } = await supabase.rpc(
''',
    '''    const roomId = character.current_room_id;

    await assertRecentRoomAction(
      roomId,
      character.id,
      character.display_name,
    );

    const { error: staffExpiryError } = await supabase.rpc(
''',
    "useRoomGift actor rule",
)

# activateRoomGift actor
replace_once(
    "actions",
    '''    const roomId = character.current_room_id;

    const { data: { user } } = await supabase.auth.getUser();
''',
    '''    const roomId = character.current_room_id;

    await assertRecentRoomAction(
      roomId,
      character.id,
      character.display_name,
    );

    const { data: { user } } = await supabase.auth.getUser();
''',
    "activateRoomGift actor rule",
)

# standalone attribute actor
replace_once(
    "actions",
    '''    if (!character.current_room_id) {
      return {
        ok: false,
        message:
          "Your character has no current room.",
      };
    }

    const effectiveAttributes =
''',
    '''    if (!character.current_room_id) {
      return {
        ok: false,
        message:
          "Your character has no current room.",
      };
    }

    await assertRecentRoomAction(
      character.current_room_id,
      character.id,
      character.display_name,
    );

    const effectiveAttributes =
''',
    "sendRoomAttributeCheck actor rule",
)

# useRoomItem actor - function-scoped
text = src["actions"]
fn = text.find("export async function useRoomItem(")
if fn < 0:
    fail("Could not locate useRoomItem().")
old = '''    if (!character.current_room_id) {
      return {
        ok: false,
        message: "Your character has no current room.",
      };
    }

    const roomMessageClient =
'''
pos = text.find(old, fn)
if pos < 0:
    fail("Could not locate useRoomItem current-room block.")
new = '''    if (!character.current_room_id) {
      return {
        ok: false,
        message: "Your character has no current room.",
      };
    }

    await assertRecentRoomAction(
      character.current_room_id,
      character.id,
      character.display_name,
    );

    const roomMessageClient =
'''
src["actions"] = text[:pos] + new + text[pos + len(old):]

# useRoomItem target
replace_once(
    "actions",
    '''      if (
        !presence ||
        presence.appear_offline === true
      ) {
        return {
          ok: false,
          message: "That character is no longer present in this room.",
        };
      }
    }

    if (item.resolution_mode === "opposed") {
''',
    '''      if (
        !presence ||
        presence.appear_offline === true
      ) {
        return {
          ok: false,
          message: "That character is no longer present in this room.",
        };
      }

      if (
        !(await hasRecentRoomAction(
          character.current_room_id,
          targetCharacterId,
        ))
      ) {
        return {
          ok: false,
          message:
            "That character has not made a proper action in this Location within the last hour.",
        };
      }
    }

    if (item.resolution_mode === "opposed") {
''',
    "useRoomItem target rule",
)

# opposed-actions imports
replace_once(
    "opposed",
    'import { createClient } from "@/lib/supabase/server";\n',
    '''import { createClient } from "@/lib/supabase/server";
import {
  assertRecentRoomAction,
  hasRecentRoomAction,
} from "@/lib/game/recent-room-actions";
''',
    "opposed-actions import",
)

# opposed target
replace_once(
    "opposed",
    '''  if (data.life_state === "dead") {

    throw new Error("Dead Characters cannot be targeted by attacks or opposed Attribute Actions.");

  }



  return data;
''',
    '''  if (
    !(await hasRecentRoomAction(
      roomId,
      data.id,
    ))
  ) {
    throw new Error(
      "That Character has not made a proper action in this Location within the last hour.",
    );
  }



  if (data.life_state === "dead") {

    throw new Error("Dead Characters cannot be targeted by attacks or opposed Attribute Actions.");

  }



  return data;
''',
    "opposed target rule",
)

# actor gates with function-specific anchors
replace_once(
    "opposed",
    '''export async function startAttributeOpposedAction(

  _previousState: ActionState,

  formData: FormData,

): Promise<ActionState> {

  try {

    const { character } = await ownedCharacter(formData);



    const actionCode = field(
''',
    '''export async function startAttributeOpposedAction(

  _previousState: ActionState,

  formData: FormData,

): Promise<ActionState> {

  try {

    const { character } = await ownedCharacter(formData);

    await assertRecentRoomAction(
      character.current_room_id!,
      character.id,
      character.display_name,
    );



    const actionCode = field(
''',
    "attribute actor gate",
)

replace_once(
    "opposed",
    '''export async function startUnarmedAttack(

  _previousState: ActionState,

  formData: FormData,

): Promise<ActionState> {

  try {

    const { character } = await ownedCharacter(formData);

    const targetId = field(formData, "opposed_target_character_id");
''',
    '''export async function startUnarmedAttack(

  _previousState: ActionState,

  formData: FormData,

): Promise<ActionState> {

  try {

    const { character } = await ownedCharacter(formData);

    await assertRecentRoomAction(
      character.current_room_id!,
      character.id,
      character.display_name,
    );

    const targetId = field(formData, "opposed_target_character_id");
''',
    "unarmed actor gate",
)

replace_once(
    "opposed",
    '''export async function startWeaponOpposedAttack(

  _previousState: ActionState,

  formData: FormData,

): Promise<ActionState> {

  try {

    const { supabase, character } = await ownedCharacter(formData);

    const recordKind = field(formData, "item_record_kind");
''',
    '''export async function startWeaponOpposedAttack(

  _previousState: ActionState,

  formData: FormData,

): Promise<ActionState> {

  try {

    const { supabase, character } = await ownedCharacter(formData);

    await assertRecentRoomAction(
      character.current_room_id!,
      character.id,
      character.display_name,
    );

    const recordKind = field(formData, "item_record_kind");
''',
    "weapon actor gate",
)

# feat-mechanics imports
replace_once(
    "feat_mech",
    'import { createAdminClient } from "@/lib/supabase/admin";\n',
    '''import { createAdminClient } from "@/lib/supabase/admin";
import {
  assertRecentRoomAction,
  getRecentRoomActionCharacterIds,
} from "@/lib/game/recent-room-actions";
''',
    "feat mechanics import",
)

replace_once(
    "feat_mech",
    '''    if (!character.current_room_id) {
      throw new Error("Enter a Location before using a Feat.");
    }

    const {
      data: ownership,
''',
    '''    if (!character.current_room_id) {
      throw new Error("Enter a Location before using a Feat.");
    }

    await assertRecentRoomAction(
      character.current_room_id,
      character.id,
      character.display_name,
    );

    const {
      data: ownership,
''',
    "mechanical Feat actor rule",
)

replace_once(
    "feat_mech",
    '''      if (otherIds.some((id) => !present.has(id))) {
        throw new Error(
          "One or more selected targets are no longer present in this Location.",
        );
      }

      const {
        data: targetRows,
''',
    '''      if (otherIds.some((id) => !present.has(id))) {
        throw new Error(
          "One or more selected targets are no longer present in this Location.",
        );
      }

      const recentActionIds =
        await getRecentRoomActionCharacterIds(
          character.current_room_id,
        );

      if (
        otherIds.some(
          (id) =>
            !recentActionIds.has(id),
        )
      ) {
        throw new Error(
          "One or more selected targets have not made a proper action in this Location within the last hour.",
        );
      }

      const {
        data: targetRows,
''',
    "mechanical Feat target rule",
)

# warping-actions import + eligibility action
replace_once(
    "warping_actions",
    'import { createClient } from "@/lib/supabase/server";\n',
    '''import { createClient } from "@/lib/supabase/server";
import {
  getRecentRoomActionCharacterIds,
} from "@/lib/game/recent-room-actions";
''',
    "warping actions import",
)

replace_once(
    "warping_actions",
    '''export type WarpingActionState={ok:boolean;message:string;submittedAt?:number};



''',
    '''export type WarpingActionState={ok:boolean;message:string;submittedAt?:number};

export async function getCurrentShapeContextEligibility(
  roomId: string,
): Promise<{
  ok: boolean;
  message: string;
  characterIds: string[];
}> {
  try {
    const db =
      await createClient();

    const auth =
      await db.auth.getUser();

    if (!auth.data.user) {
      throw new Error(
        "Authentication required.",
      );
    }

    const character =
      await admin()
        .from("characters")
        .select(
          "id,current_room_id,status",
        )
        .eq(
          "user_id",
          auth.data.user.id,
        )
        .eq(
          "is_system",
          false,
        )
        .maybeSingle();

    if (
      character.error ||
      !character.data
    ) {
      throw new Error(
        character.error?.message ??
          "Character not found.",
      );
    }

    if (
      character.data.status !== "approved" ||
      character.data.current_room_id !== roomId
    ) {
      throw new Error(
        "This is not your current Location.",
      );
    }

    const ids =
      await getRecentRoomActionCharacterIds(
        roomId,
      );

    if (!ids.has(character.data.id)) {
      return {
        ok: false,
        message:
          "Make a proper room action before using Shapes.",
        characterIds:
          Array.from(ids),
      };
    }

    return {
      ok: true,
      message: "",
      characterIds:
        Array.from(ids),
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to verify Shape eligibility.",
      characterIds: [],
    };
  }
}



''',
    "warping eligibility action",
)

# WarpingPanel
replace_once(
    "warping_panel",
    '''import {
  commitShapeCast,
  prepareDispelEffect,
  resolveImmediateShapeCast,
  rollbackFailedShapeCast,
} from "../warping-actions";
''',
    '''import {
  commitShapeCast,
  getCurrentShapeContextEligibility,
  prepareDispelEffect,
  resolveImmediateShapeCast,
  rollbackFailedShapeCast,
} from "../warping-actions";
''',
    "WarpingPanel import",
)

replace_once(
    "warping_panel",
    '''      const freshAccess =
        s._item_granted
''',
    '''      const contextualEligibility =
        await getCurrentShapeContextEligibility(
          me.data.current_room_id,
        );

      if (!contextualEligibility.ok) {
        throw Error(
          contextualEligibility.message,
        );
      }

      const recentActionIds =
        new Set(
          contextualEligibility.characterIds,
        );

      const freshAccess =
        s._item_granted
''',
    "Warping actor rule",
)

replace_once(
    "warping_panel",
    '''      if (
        s.is_dispel &&
        (!dispelTarget ||
          !selectedDispelEffect)
      ) {
        throw Error(
          "Choose a Dispel target and an active effect to dispel before Warping.",
        );
      }

      let itemChargeRemaining:
''',
    '''      if (
        s.is_dispel &&
        (!dispelTarget ||
          !selectedDispelEffect)
      ) {
        throw Error(
          "Choose a Dispel target and an active effect to dispel before Warping.",
        );
      }

      if (
        !wt &&
        !self &&
        targets.some(
          (targetId) =>
            !recentActionIds.has(
              targetId,
            ),
        )
      ) {
        throw Error(
          "One or more selected targets have not made a proper action in this Location within the last hour.",
        );
      }

      let itemChargeRemaining:
''',
    "Warping target rule",
)

# NPC mechanics import
replace_once(
    "npc_mech",
    'import { createClient } from "@/lib/supabase/server";\n',
    '''import { createClient } from "@/lib/supabase/server";
import {
  assertRecentRoomAction,
  getRecentRoomActionCharacterIds,
} from "@/lib/game/recent-room-actions";
''',
    "npc mechanics import",
)

replace_once(
    "npc_mech",
    '''    const rawTargets=(presenceResult.data??[])
      .filter((x:any)=>x.appear_offline!==true)
      .map((x:any)=>one(x.character) as any)
      .filter((x:any)=>x&&x.status==="approved"&&x.id!==character.id);
''',
    '''    const recentActionIds=
      await getRecentRoomActionCharacterIds(
        input.roomId,
      );

    const rawTargets=(presenceResult.data??[])
      .filter((x:any)=>x.appear_offline!==true)
      .map((x:any)=>one(x.character) as any)
      .filter(
        (x:any)=>
          x&&
          x.status==="approved"&&
          x.id!==character.id&&
          recentActionIds.has(
            String(x.id),
          ),
      );
''',
    "NPC contextual target filtering",
)

replace_once(
    "npc_mech",
    '''    return {ok:true,characterId:character.id,gifts,items,shapes,targets};
''',
    '''    return {
      ok:true,
      characterId:character.id,
      canUseContextualMechanics:
        recentActionIds.has(
          String(character.id),
        ),
      gifts,
      items,
      shapes,
      targets,
    };
''',
    "NPC actor eligibility flag",
)

replace_once(
    "npc_mech",
    '''export async function npcWarpShape(input:{npcId:string;roomId:string;shapeId:string;targetIds:string[];writtenTarget?:string}){
  try{
    const {a,userId,speakerCharacterId,npc,character}=await requireStaffNpc(input.npcId,input.roomId);
    const access=await getCharacterShapeAccess(character.id,input.shapeId);
''',
    '''export async function npcWarpShape(input:{npcId:string;roomId:string;shapeId:string;targetIds:string[];writtenTarget?:string}){
  try{
    const {a,userId,speakerCharacterId,npc,character}=await requireStaffNpc(input.npcId,input.roomId);

    await assertRecentRoomAction(
      input.roomId,
      character.id,
      character.display_name,
    );

    const access=await getCharacterShapeAccess(character.id,input.shapeId);
''',
    "NPC Shape actor rule",
)

replace_once(
    "npc_mech",
    '''    if(isWritten&&!written)return {ok:false,message:"Write the Fate target."};
    if(!isWritten&&!self&&!targetIds.length)return {ok:false,message:"Choose a target."};
    if(s.target_scope!=="multiple"&&targetIds.length>1)targetIds=targetIds.slice(0,1);
    if(s.target_scope==="multiple")targetIds=targetIds.slice(0,Math.max(1,Number(s.max_targets??1)));

    const cr=await a.from("shape_casts").insert({
''',
    '''    if(isWritten&&!written)return {ok:false,message:"Write the Fate target."};
    if(!isWritten&&!self&&!targetIds.length)return {ok:false,message:"Choose a target."};
    if(s.target_scope!=="multiple"&&targetIds.length>1)targetIds=targetIds.slice(0,1);
    if(s.target_scope==="multiple")targetIds=targetIds.slice(0,Math.max(1,Number(s.max_targets??1)));

    if(!isWritten&&!self){
      const recentActionIds=
        await getRecentRoomActionCharacterIds(
          input.roomId,
        );

      if(
        targetIds.some(
          id=>!recentActionIds.has(id),
        )
      ){
        return {
          ok:false,
          message:
            "One or more selected targets have not made a proper action in this Location within the last hour.",
        };
      }
    }

    const cr=await a.from("shape_casts").insert({
''',
    "NPC Shape target rule",
)

# NPC panel buttons
replace_once(
    "npc_panel",
    '''      <div className="flex flex-wrap gap-2">
        {(["attribute","feat","item","shape","combat","whisper","give"] as const).map(m=><button key={m} type="button" onClick={()=>{setMechanicsMode(mechanicsMode===m?null:m);setMechanicsStatus("");}} className={buttonClass}>{m==="give"?"Give Item":m}</button>)}
      </div>
''',
    '''      <div className="flex flex-wrap gap-2">
        {(["attribute","feat","item","shape","combat","whisper","give"] as const).map(m=>{
          const contextual=
            ["attribute","feat","item","shape","combat"].includes(m);

          const disabled=
            contextual&&
            mechanics.canUseContextualMechanics!==true;

          return <button
            key={m}
            type="button"
            disabled={disabled}
            title={
              disabled
                ? "This NPC must make a proper room action first."
                : undefined
            }
            onClick={()=>{
              setMechanicsMode(
                mechanicsMode===m
                  ? null
                  : m,
              );
              setMechanicsStatus("");
            }}
            className={`${buttonClass} disabled:cursor-not-allowed disabled:opacity-40`}
          >
            {m==="give"?"Give Item":m}
          </button>;
        })}
      </div>
''',
    "NPC contextual buttons",
)

# RoomChatForm recent-action state
replace_once(
    "room_form",
    '''  const [attributes, setAttributes] = useState<CharacterAttributes>({
''',
    '''  const [
    recentRoomActionCharacterIds,
    setRecentRoomActionCharacterIds,
  ] = useState<string[]>([]);

  useEffect(() => {
    let active = true;

    async function refreshRecentRoomActions() {
      try {
        const response =
          await fetch(
            `/api/game/recent-room-actions?roomId=${encodeURIComponent(
              roomId,
            )}`,
            {
              cache: "no-store",
            },
          );

        const result =
          (await response.json()) as {
            characterIds?: string[];
            error?: string;
          };

        if (
          !active ||
          !response.ok
        ) {
          if (
            active &&
            !response.ok
          ) {
            console.error(
              "Unable to refresh recent room actions:",
              result.error ??
                response.statusText,
            );
          }
          return;
        }

        setRecentRoomActionCharacterIds(
          Array.isArray(result.characterIds)
            ? result.characterIds
            : [],
        );
      } catch (error) {
        if (active) {
          console.error(
            "Unable to refresh recent room actions:",
            error,
          );
        }
      }
    }

    void refreshRecentRoomActions();

    const db = createClient();

    const channel =
      db
        .channel(
          `recent-room-actions-${roomId}-${crypto.randomUUID()}`,
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "room_messages",
            filter:
              `room_id=eq.${roomId}`,
          },
          () => {
            void refreshRecentRoomActions();
          },
        )
        .subscribe();

    const timer =
      window.setInterval(
        () => {
          void refreshRecentRoomActions();
        },
        30_000,
      );

    return () => {
      active = false;
      window.clearInterval(timer);
      void db.removeChannel(channel);
    };
  }, [roomId]);

  const recentRoomActionIdSet =
    useMemo(
      () =>
        new Set(
          recentRoomActionCharacterIds,
        ),
      [
        recentRoomActionCharacterIds,
      ],
    );

  const viewerHasRecentRoomAction =
    recentRoomActionIdSet.has(
      viewerCharacterId,
    );

  const contextualTargetCharacters =
    useMemo(
      () =>
        presentCharacters.filter(
          (entry) =>
            recentRoomActionIdSet.has(
              entry.id,
            ),
        ),
      [
        presentCharacters,
        recentRoomActionIdSet,
      ],
    );

  const [attributes, setAttributes] = useState<CharacterAttributes>({
''',
    "RoomChatForm recent-action state",
)

replace_once(
    "room_form",
    '''  const whisperCharacters =
''',
    '''  const contextualOrdinaryTargetCharacters =
    useMemo(
      () =>
        contextualTargetCharacters.filter(
          (entry) =>
            !beyondEssenceCharacterIdSet.has(
              entry.id,
            ),
        ),
      [
        contextualTargetCharacters,
        beyondEssenceCharacterIdSet,
      ],
    );

  const whisperCharacters =
''',
    "RoomChatForm contextual ordinary targets",
)

# 4 target selectors, anchored individually to the current 8f82c3f markup.
replace_once(
    "room_form",
    '''                    <option className="game_components_roomchatform_option_option_6" value="">No Character target</option>
                    {ordinaryTargetCharacters.map((entry) => (
                      <option className="game_components_roomchatform_option_option_7" key={entry.id} value={entry.id}>
''',
    '''                    <option className="game_components_roomchatform_option_option_6" value="">No Character target</option>
                    {contextualOrdinaryTargetCharacters.map((entry) => (
                      <option className="game_components_roomchatform_option_option_7" key={entry.id} value={entry.id}>
''',
    "weapon target selector",
)

replace_once(
    "room_form",
    '''                <option className="game_components_roomchatform_option_option_8" value="">No Character target</option>
                {ordinaryTargetCharacters.map((entry) => (
                  <option className="game_components_roomchatform_option_option_9" key={entry.id} value={entry.id}>
''',
    '''                <option className="game_components_roomchatform_option_option_8" value="">No Character target</option>
                {contextualOrdinaryTargetCharacters.map((entry) => (
                  <option className="game_components_roomchatform_option_option_9" key={entry.id} value={entry.id}>
''',
    "unarmed target selector",
)

replace_once(
    "room_form",
    '''                <option className="game_components_roomchatform_option_option_11" value="">No Character target</option>
                {ordinaryTargetCharacters.map((entry) => (
                  <option className="game_components_roomchatform_option_option_12" key={entry.id} value={entry.id}>
''',
    '''                <option className="game_components_roomchatform_option_option_11" value="">No Character target</option>
                {contextualOrdinaryTargetCharacters.map((entry) => (
                  <option className="game_components_roomchatform_option_option_12" key={entry.id} value={entry.id}>
''',
    "attribute target selector",
)

replace_once(
    "room_form",
    '''                    {selectedGift.targetMode === "either" ? (
                      <option className="game_components_roomchatform_option_option_14" value="">Self</option>
                    ) : (
                      <option className="game_components_roomchatform_option_option_15" value="">Choose character...</option>
                    )}
                    {ordinaryTargetCharacters.map((entry) => (
                      <option className="game_components_roomchatform_option_option_16" key={entry.id} value={entry.id}>
''',
    '''                    {selectedGift.targetMode === "either" ? (
                      <option className="game_components_roomchatform_option_option_14" value="">Self</option>
                    ) : (
                      <option className="game_components_roomchatform_option_option_15" value="">Choose character...</option>
                    )}
                    {contextualOrdinaryTargetCharacters.map((entry) => (
                      <option className="game_components_roomchatform_option_option_16" key={entry.id} value={entry.id}>
''',
    "Feat target selector",
)

replace_once(
    "room_form",
    '''presentCharacters={ordinaryTargetCharacters}
                    onResolved={refreshRoomFeats}
''',
    '''presentCharacters={contextualOrdinaryTargetCharacters}
                    onResolved={refreshRoomFeats}
''',
    "MechanicalFeatPanel targets",
)

replace_once(
    "room_form",
    '''        <WarpingPanel
          presentCharacters={presentCharacters}
''',
    '''        <WarpingPanel
          presentCharacters={contextualTargetCharacters}
''',
    "WarpingPanel targets",
)

replace_once(
    "room_form",
    '''                      ? presentCharacters.map(
                          (entry) => (
''',
    '''                      ? contextualTargetCharacters.map(
                          (entry) => (
''',
    "Use Item targets",
)

# Actor button gating
replace_once(
    "room_form",
    '''          disabled={viewerDead}
          title={viewerDead ? "Unavailable while dead." : undefined}
          onClick={() =>
            toggleUtility("attributes")
''',
    '''          disabled={
            viewerDead ||
            !viewerHasRecentRoomAction
          }
          title={
            viewerDead
              ? "Unavailable while dead."
              : !viewerHasRecentRoomAction
                ? "Make a proper room action first."
                : undefined
          }
          onClick={() =>
            toggleUtility("attributes")
''',
    "ATK/Use Attributes button",
)

replace_once(
    "room_form",
    '''          disabled={viewerDead}
          title={viewerDead ? "Unavailable while dead." : undefined}
          onClick={() =>
            toggleUtility("feat")
''',
    '''          disabled={
            viewerDead ||
            !viewerHasRecentRoomAction
          }
          title={
            viewerDead
              ? "Unavailable while dead."
              : !viewerHasRecentRoomAction
                ? "Make a proper room action first."
                : undefined
          }
          onClick={() =>
            toggleUtility("feat")
''',
    "Feat button",
)

replace_once(
    "room_form",
    '''          disabled={viewerDead}
          title={viewerDead ? "Unavailable while dead." : undefined}
          onClick={() => toggleUtility("warping")}
''',
    '''          disabled={
            viewerDead ||
            !viewerHasRecentRoomAction
          }
          title={
            viewerDead
              ? "Unavailable while dead."
              : !viewerHasRecentRoomAction
                ? "Make a proper room action first."
                : undefined
          }
          onClick={() => toggleUtility("warping")}
''',
    "Shapes button",
)

replace_once(
    "room_form",
    '''          disabled={viewerDead}
          title={viewerDead ? "Unavailable while dead." : undefined}
          onClick={() =>
            toggleUtility("items")
''',
    '''          disabled={
            viewerDead ||
            !viewerHasRecentRoomAction
          }
          title={
            viewerDead
              ? "Unavailable while dead."
              : !viewerHasRecentRoomAction
                ? "Make a proper room action first."
                : undefined
          }
          onClick={() =>
            toggleUtility("items")
''',
    "Use Items button",
)

# Write only after all checks succeed.
FILES["helper"].parent.mkdir(parents=True, exist_ok=True)
FILES["api"].parent.mkdir(parents=True, exist_ok=True)

for key in (
    "map_link", "actions", "opposed", "room_form",
    "feat_mech", "warping_actions", "warping_panel",
    "npc_mech", "npc_panel",
):
    FILES[key].write_text(
        src[key],
        encoding="utf-8",
    )

FILES["helper"].write_text(helper, encoding="utf-8")
FILES["api"].write_text(api, encoding="utf-8")

print("SUCCESS")
print("Built specifically for commit 8f82c3fca7bde0e852d3d01addc281281cfb41c5")
print("Next: npm run build")
