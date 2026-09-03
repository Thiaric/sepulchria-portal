from pathlib import Path
import subprocess
import sys

BASE_COMMIT = "9d6c8454a50d3ab11998de9f7835039e0dc5950a"

def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(
            f"{label}: expected 1 match, found {count}. "
            f"This patch is based on {BASE_COMMIT}."
        )
    return text.replace(old, new, 1)

def main():
    root = Path.cwd()

    try:
        head = subprocess.check_output(
            ["git", "rev-parse", "HEAD"],
            cwd=root,
            text=True,
        ).strip()
    except Exception as exc:
        raise RuntimeError(
            "Run this script from the sepulchria-portal repository root."
        ) from exc

    if head != BASE_COMMIT:
        raise RuntimeError(
            f"Wrong local HEAD. Expected {BASE_COMMIT}, found {head}. "
            "This patch was built specifically from commit 9d6c845."
        )

    game_path = root / "app/(portal)/game/actions.ts"
    shortcut_path = root / "app/(portal)/orders/headquarters/shortcut-actions.ts"
    membership_path = root / "app/(portal)/admin/orders/membership-actions.ts"
    helper_path = root / "lib/order-headquarters/return-room.ts"
    migration_path = root / "supabase/migrations/20260903_order_headquarters_return_room.sql"

    game = game_path.read_text(encoding="utf-8")
    shortcut = shortcut_path.read_text(encoding="utf-8")
    membership = membership_path.read_text(encoding="utf-8")

    helper = '''import "server-only";

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
    .select("order_id, room_id")
    .eq(
      "room_id",
      destinationRoomId,
    )
    .maybeSingle();

  if (headquartersError) {
    throw new Error(
      `Unable to inspect Order Headquarters return location: ${headquartersError.message}`,
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
      `Unable to inspect Order membership return location: ${membershipError.message}`,
    );
  }

  if (!membership) {
    return;
  }

  let returnRoomId:
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
      returnRoomId =
        currentRoomId;
    }
  }

  const {
    error: updateError,
  } = await admin
    .from("order_memberships")
    .update({
      return_room_id:
        returnRoomId,
    })
    .eq(
      "id",
      membership.id,
    );

  if (updateError) {
    throw new Error(
      `Unable to remember the previous public location: ${updateError.message}`,
    );
  }
}
'''

    game = replace_once(
        game,
        '''import {
  getPrivateLocationAccess,
} from "@/lib/private-locations/access";''',
        '''import {
  getPrivateLocationAccess,
} from "@/lib/private-locations/access";
import {
  rememberOrderHeadquartersReturnRoom,
} from "@/lib/order-headquarters/return-room";''',
        "game actions helper import",
    )

    game = replace_once(
        game,
        '''  if (
    destinationAccess.isPrivate &&
    !destinationAccess.allowed
  ) {
    throw new Error(
      "This location is not available.",
    );
  }

  const { error: moveError } = await supabase
    .from("characters")
    .update({
      current_room_id: roomId,
    })''',
        '''  if (
    destinationAccess.isPrivate &&
    !destinationAccess.allowed
  ) {
    throw new Error(
      "This location is not available.",
    );
  }

  await rememberOrderHeadquartersReturnRoom({
    characterId:
      character.id,
    destinationRoomId:
      roomId,
    currentRoomId:
      character.current_room_id,
  });

  const { error: moveError } = await supabase
    .from("characters")
    .update({
      current_room_id: roomId,
    })''',
        "enterRoomFromMap return-room save",
    )

    shortcut = replace_once(
        shortcut,
        '''import { createClient } from "@/lib/supabase/server";''',
        '''import { createClient } from "@/lib/supabase/server";
import {
  rememberOrderHeadquartersReturnRoom,
} from "@/lib/order-headquarters/return-room";''',
        "HQ shortcut helper import",
    )

    shortcut = replace_once(
        shortcut,
        '''  if (
    !headquarters?.room_id ||
    room?.is_active !== true
  ) {
    throw new Error(
      "Your Order Headquarters is currently unavailable.",
    );
  }

  const {
  error: moveError,
} = await supabase''',
        '''  if (
    !headquarters?.room_id ||
    room?.is_active !== true
  ) {
    throw new Error(
      "Your Order Headquarters is currently unavailable.",
    );
  }

  await rememberOrderHeadquartersReturnRoom({
    characterId:
      character.id,
    destinationRoomId:
      headquarters.room_id,
    currentRoomId:
      character.current_room_id,
  });

  const {
  error: moveError,
} = await supabase''',
        "HQ shortcut return-room save",
    )

    membership = replace_once(
        membership,
        '''    const {
      error: presenceUpdateError,
    } = await supabase
      .from("character_presence")
      .update({
        room_id:
          fallbackRoomId,
        last_seen_at:
          new Date().toISOString(),
      })
      .eq(
        "character_id",
        membership.character_id,
      );

    if (presenceUpdateError) {
      throw new Error(
        presenceUpdateError.message,
      );
    }''',
        '''    const now =
      new Date().toISOString();

    const {
      data: updatedPresence,
      error: presenceUpdateError,
    } = await supabase
      .from("character_presence")
      .update({
        room_id:
          fallbackRoomId,
        last_seen_at:
          now,
      })
      .eq(
        "character_id",
        membership.character_id,
      )
      .select("character_id")
      .maybeSingle();

    if (presenceUpdateError) {
      throw new Error(
        presenceUpdateError.message,
      );
    }

    if (!updatedPresence) {
      const {
        error: presenceInsertError,
      } = await supabase
        .from("character_presence")
        .insert({
          character_id:
            membership.character_id,
          room_id:
            fallbackRoomId,
          status:
            "online",
          manual_status:
            "online",
          last_seen_at:
            now,
        });

      if (
        presenceInsertError &&
        presenceInsertError.code !==
          "23505"
      ) {
        throw new Error(
          presenceInsertError.message,
        );
      }

      if (
        presenceInsertError?.code ===
        "23505"
      ) {
        const {
          error: retryPresenceError,
        } = await supabase
          .from("character_presence")
          .update({
            room_id:
              fallbackRoomId,
            last_seen_at:
              now,
          })
          .eq(
            "character_id",
            membership.character_id,
          );

        if (retryPresenceError) {
          throw new Error(
            retryPresenceError.message,
          );
        }
      }
    }''',
        "removed member realtime presence move",
    )

    migration = '''alter table public.order_memberships
add column if not exists return_room_id uuid
references public.rooms(id)
on delete set null;

comment on column public.order_memberships.return_room_id is
'Last public room occupied before entering the member''s Order Headquarters; used to return the character when membership/access is removed.';
'''

    helper_path.parent.mkdir(parents=True, exist_ok=True)
    migration_path.parent.mkdir(parents=True, exist_ok=True)

    game_path.write_text(game, encoding="utf-8")
    shortcut_path.write_text(shortcut, encoding="utf-8")
    membership_path.write_text(membership, encoding="utf-8")
    helper_path.write_text(helper, encoding="utf-8")
    migration_path.write_text(migration, encoding="utf-8")

    print("Patched from commit:", BASE_COMMIT)
    print("Updated:")
    print(" - app/(portal)/game/actions.ts")
    print(" - app/(portal)/orders/headquarters/shortcut-actions.ts")
    print(" - app/(portal)/admin/orders/membership-actions.ts")
    print("Created:")
    print(" - lib/order-headquarters/return-room.ts")
    print(" - supabase/migrations/20260903_order_headquarters_return_room.sql")
    print()
    print("Run the SQL migration in Supabase before testing.")

if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise
