from pathlib import Path
import subprocess
import sys

BASE_COMMIT = "9d6c8454a50d3ab11998de9f7835039e0dc5950a"

def write(path: Path, content: str):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")

def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected one match, found {count}")
    return text.replace(old, new, 1)

def main():
    root = Path.cwd()
    head = subprocess.check_output(
        ["git", "rev-parse", "HEAD"],
        cwd=root,
        text=True,
    ).strip()

    if head != BASE_COMMIT:
        raise RuntimeError(
            f"This patch is built from {BASE_COMMIT}, but local HEAD is {head}."
        )

    manage_path = root / "app/(portal)/orders/manage/actions.ts"
    admin_path = root / "app/(portal)/admin/orders/membership-actions.ts"
    shortcut_path = root / "app/(portal)/orders/headquarters/shortcut-actions.ts"
    game_path = root / "app/(portal)/game/actions.ts"

    manage = manage_path.read_text(encoding="utf-8")
    admin = admin_path.read_text(encoding="utf-8")
    shortcut = shortcut_path.read_text(encoding="utf-8")
    game = game_path.read_text(encoding="utf-8")

    evict_helper = '''import "server-only";

import {
  createClient as createAdminClient,
} from "@supabase/supabase-js";

function adminClient() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret =
    process.env.SUPABASE_SECRET_KEY;

  if (!url || !secret) {
    throw new Error(
      "Missing Supabase server configuration.",
    );
  }

  return createAdminClient(
    url,
    secret,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}

async function touchPresence(
  characterId: string,
  roomId: string | null,
) {
  const admin = adminClient();
  const now =
    new Date().toISOString();

  const {
    data: updated,
    error: updateError,
  } = await admin
    .from("character_presence")
    .update({
      room_id: roomId,
      last_seen_at: now,
    })
    .eq(
      "character_id",
      characterId,
    )
    .select("character_id")
    .maybeSingle();

  if (updateError) {
    throw new Error(
      `Unable to move character presence: ${updateError.message}`,
    );
  }

  if (updated) {
    return;
  }

  const {
    error: insertError,
  } = await admin
    .from("character_presence")
    .insert({
      character_id:
        characterId,
      room_id:
        roomId,
      status:
        "online",
      manual_status:
        "online",
      last_seen_at:
        now,
    });

  if (
    insertError &&
    insertError.code !== "23505"
  ) {
    throw new Error(
      `Unable to create character presence: ${insertError.message}`,
    );
  }

  if (
    insertError?.code === "23505"
  ) {
    const {
      error: retryError,
    } = await admin
      .from("character_presence")
      .update({
        room_id: roomId,
        last_seen_at: now,
      })
      .eq(
        "character_id",
        characterId,
      );

    if (retryError) {
      throw new Error(
        `Unable to move character presence: ${retryError.message}`,
      );
    }
  }
}

export async function evictOrderMemberFromHeadquarters({
  orderId,
  characterId,
  returnRoomId,
}: {
  orderId: string;
  characterId: string;
  returnRoomId: string | null;
}) {
  const admin =
    adminClient();

  const {
    data: headquarters,
    error: headquartersError,
  } = await admin
    .from("order_headquarters")
    .select("room_id")
    .eq(
      "order_id",
      orderId,
    )
    .maybeSingle();

  if (headquartersError) {
    throw new Error(
      `Unable to inspect Order Headquarters: ${headquartersError.message}`,
    );
  }

  if (!headquarters?.room_id) {
    return;
  }

  const {
    data: character,
    error: characterError,
  } = await admin
    .from("characters")
    .select("current_room_id")
    .eq(
      "id",
      characterId,
    )
    .maybeSingle();

  if (characterError) {
    throw new Error(
      `Unable to inspect member location: ${characterError.message}`,
    );
  }

  if (
    character?.current_room_id !==
    headquarters.room_id
  ) {
    return;
  }

  const fallback =
    returnRoomId ?? null;

  const {
    error: moveError,
  } = await admin
    .from("characters")
    .update({
      current_room_id:
        fallback,
    })
    .eq(
      "id",
      characterId,
    );

  if (moveError) {
    throw new Error(
      `Unable to evict member from Order Headquarters: ${moveError.message}`,
    );
  }

  await touchPresence(
    characterId,
    fallback,
  );
}
'''
    write(
        root / "lib/order-headquarters/evict-member.ts",
        evict_helper,
    )

    manage_import = '''import {
  evictOrderMemberFromHeadquarters,
} from "@/lib/order-headquarters/evict-member";
'''
    if manage_import not in manage:
        anchor = '''import {
  createClient,
} from "@/lib/supabase/server";
'''
        manage = replace_once(
            manage,
            anchor,
            anchor + manage_import,
            "manage eviction import",
        )

    marker = "export async function headRemoveMember("
    start = manage.find(marker)
    if start == -1:
        raise RuntimeError("Could not find headRemoveMember.")
    end = manage.find("export async function headAssignOrderGift", start)
    block = manage[start:end]

    if "return_room_id" not in block.split(".maybeSingle();", 1)[0]:
        old = '''      .select(`
        character_id,
        level:order_levels!order_memberships_order_level_id_fkey('''
        new = '''      .select(`
        character_id,
        return_room_id,
        level:order_levels!order_memberships_order_level_id_fkey('''
        if block.count(old) != 1:
            raise RuntimeError("headRemoveMember return_room_id select anchor missing.")
        block = block.replace(old, new, 1)

    eviction_call = '''    await evictOrderMemberFromHeadquarters({
      orderId,
      characterId:
        target.character_id,
      returnRoomId:
        target.return_room_id ?? null,
    });

'''
    if eviction_call not in block:
        delete_anchor = '''    const {
      error: deleteError,
    } = await admin
      .from("order_memberships")
      .delete()'''
        if block.count(delete_anchor) != 1:
            raise RuntimeError("headRemoveMember deletion anchor missing.")
        block = block.replace(
            delete_anchor,
            eviction_call + delete_anchor,
            1,
        )

    manage = manage[:start] + block + manage[end:]

    admin_import = '''import {
  evictOrderMemberFromHeadquarters,
} from "@/lib/order-headquarters/evict-member";
'''
    if admin_import not in admin:
        anchor = '''import { createClient } from "@/lib/supabase/server";
'''
        admin = replace_once(
            admin,
            anchor,
            anchor + admin_import,
            "admin eviction import",
        )

    marker = "export async function removeOrderMember("
    start = admin.find(marker)
    if start == -1:
        raise RuntimeError("Could not find removeOrderMember.")
    block = admin[start:]

    if "return_room_id" not in block.split(".maybeSingle();", 1)[0]:
        old = '''  id,
  character_id,
  role:order_jobs!order_memberships_order_job_id_fkey('''
        new = '''  id,
  character_id,
  return_room_id,
  role:order_jobs!order_memberships_order_job_id_fkey('''
        if old not in block:
            raise RuntimeError("Admin return_room_id select anchor missing.")
        block = block.replace(old, new, 1)

    admin_eviction_call = '''await evictOrderMemberFromHeadquarters({
  orderId,
  characterId:
    membership.character_id,
  returnRoomId:
    membership.return_room_id ?? null,
});

'''
    if admin_eviction_call not in block:
        candidates = [
            '''    const { error } = await supabase
  .from("order_memberships")
  .delete()
  .eq("id", membershipId);''',
            '''    const { error } = await supabase
      .from("order_memberships")
      .delete()
      .eq("id", membershipId);''',
        ]
        matched = next((x for x in candidates if x in block), None)
        if not matched:
            raise RuntimeError("Admin membership deletion anchor missing.")
        block = block.replace(
            matched,
            admin_eviction_call + matched,
            1,
        )

    admin = admin[:start] + block

    return_helper = '''import "server-only";

import {
  createClient as createAdminClient,
} from "@supabase/supabase-js";

import {
  getPrivateLocationAccess,
} from "@/lib/private-locations/access";

function adminClient() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret =
    process.env.SUPABASE_SECRET_KEY;

  if (!url || !secret) {
    throw new Error(
      "Missing Supabase server configuration.",
    );
  }

  return createAdminClient(
    url,
    secret,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}

export async function rememberOrderHeadquartersReturnRoom({
  characterId,
  destinationRoomId,
  currentRoomId,
}: {
  characterId: string;
  destinationRoomId: string;
  currentRoomId: string | null;
}) {
  const admin = adminClient();

  const {
    data: headquarters,
    error: headquartersError,
  } = await admin
    .from("order_headquarters")
    .select("order_id")
    .eq(
      "room_id",
      destinationRoomId,
    )
    .maybeSingle();

  if (headquartersError) {
    throw new Error(
      `Unable to inspect Order Headquarters: ${headquartersError.message}`,
    );
  }

  if (!headquarters) {
    return;
  }

  const {
    data: membership,
    error: membershipError,
  } = await admin
    .from("order_memberships")
    .select("id")
    .eq(
      "order_id",
      headquarters.order_id,
    )
    .eq(
      "character_id",
      characterId,
    )
    .maybeSingle();

  if (membershipError) {
    throw new Error(
      `Unable to inspect Order membership: ${membershipError.message}`,
    );
  }

  if (!membership) {
    return;
  }

  let fallback:
    | string
    | null = null;

  if (
    currentRoomId &&
    currentRoomId !==
      destinationRoomId
  ) {
    const previousAccess =
      await getPrivateLocationAccess(
        currentRoomId,
        characterId,
      );

    if (!previousAccess.isPrivate) {
      fallback =
        currentRoomId;
    }
  }

  const {
    error: saveError,
  } = await admin
    .from("order_memberships")
    .update({
      return_room_id:
        fallback,
    })
    .eq(
      "id",
      membership.id,
    );

  if (saveError) {
    throw new Error(
      `Unable to remember previous public location: ${saveError.message}`,
    );
  }
}
'''
    write(
        root / "lib/order-headquarters/return-room.ts",
        return_helper,
    )

    return_import = '''import {
  rememberOrderHeadquartersReturnRoom,
} from "@/lib/order-headquarters/return-room";
'''

    if return_import not in shortcut:
        anchor = '''import { createClient } from "@/lib/supabase/server";
'''
        shortcut = replace_once(
            shortcut,
            anchor,
            anchor + return_import,
            "shortcut return import",
        )

    shortcut_call = '''  await rememberOrderHeadquartersReturnRoom({
    characterId:
      character.id,
    destinationRoomId:
      headquarters.room_id,
    currentRoomId:
      character.current_room_id,
  });

'''
    if shortcut_call not in shortcut:
        anchor = '''  const {
  error: moveError,
} = await supabase'''
        shortcut = replace_once(
            shortcut,
            anchor,
            shortcut_call + anchor,
            "shortcut return save",
        )

    if return_import not in game:
        anchor = '''import {
  getPrivateLocationAccess,
} from "@/lib/private-locations/access";
'''
        game = replace_once(
            game,
            anchor,
            anchor + return_import,
            "game return import",
        )

    marker = "export async function enterRoomFromMap("
    start = game.find(marker)
    if start == -1:
        raise RuntimeError("Could not find enterRoomFromMap.")
    prefix = game[:start]
    tail = game[start:]

    game_call = '''  await rememberOrderHeadquartersReturnRoom({
    characterId:
      character.id,
    destinationRoomId:
      roomId,
    currentRoomId:
      character.current_room_id,
  });

'''
    if game_call not in tail:
        anchor = '''  const { error: moveError } = await supabase
    .from("characters")
    .update({
      current_room_id: roomId,
    })'''
        if tail.count(anchor) != 1:
            raise RuntimeError("enterRoomFromMap move anchor missing.")
        tail = tail.replace(anchor, game_call + anchor, 1)
        game = prefix + tail

    migration = '''alter table public.order_memberships
add column if not exists return_room_id uuid
references public.rooms(id)
on delete set null;
'''
    write(
        root / "supabase/migrations/20260903_order_headquarters_return_room.sql",
        migration,
    )

    manage_path.write_text(manage, encoding="utf-8")
    admin_path.write_text(admin, encoding="utf-8")
    shortcut_path.write_text(shortcut, encoding="utf-8")
    game_path.write_text(game, encoding="utf-8")

    print("Patched from:", BASE_COMMIT)
    print("Shared real HQ eviction now runs from:")
    print(" - /orders/manage")
    print(" - /admin/orders")
    print("It moves BOTH characters.current_room_id and character_presence.room_id.")
    print("It also ensures HQ entry records the previous PUBLIC room.")
    print()
    print("IMPORTANT: after applying, leave HQ to a public room and re-enter HQ once before testing removal.")

if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise
