from pathlib import Path
import subprocess
import sys

BASE_COMMIT = "559ed2022835a77ec67df38f49be224aef926d82"

def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(
            f"{label}: expected 1 match, found {count}. Expected base {BASE_COMMIT}."
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
            "Run this from the sepulchria-portal repository root."
        ) from exc

    if head != BASE_COMMIT:
        raise RuntimeError(
            f"This patch is based on {BASE_COMMIT}, but your local HEAD is {head}. "
            "Pull/reset to the latest commit first, or ask for a patch against your current HEAD."
        )

    sidebar_path = root / "components/portal/portal-sidebar.tsx"
    mobile_path = root / "components/portal/mobile-portal-navigation.tsx"
    hook_path = root / "components/portal/use-order-headquarters-room.ts"
    action_path = root / "app/(portal)/orders/headquarters/shortcut-actions.ts"

    sidebar = sidebar_path.read_text(encoding="utf-8")
    mobile = mobile_path.read_text(encoding="utf-8")

    sidebar = replace_once(
        sidebar,
        'import { enterRoomFromMap } from "@/app/(portal)/game/actions";',
        'import { enterRoomFromMap } from "@/app/(portal)/game/actions";\n'
        'import { enterOwnOrderHeadquarters } from "@/app/(portal)/orders/headquarters/shortcut-actions";\n'
        'import { useOrderHeadquartersRoomId } from "@/components/portal/use-order-headquarters-room";',
        "desktop imports",
    )

    sidebar = replace_once(
        sidebar,
        '  const pathname = usePathname();\n\n  const searchParams =',
        '  const pathname = usePathname();\n\n'
        '  const orderHeadquartersRoomId =\n'
        '    useOrderHeadquartersRoomId();\n\n'
        '  const searchParams =',
        "desktop HQ hook",
    )

    desktop_old = '''            <NavigationGroup
              title="Explore Sepulchria"
              items={mainNavigationItems.map(
                renderNavigationItem,
              )}
            />'''

    desktop_new = '''            <NavigationGroup
              title="Explore Sepulchria"
              items={[
                ...mainNavigationItems
                  .slice(0, 2)
                  .map(renderNavigationItem),

                orderHeadquartersRoomId ? (
                  <form
                    key="order-headquarters"
                    action={enterOwnOrderHeadquarters}
                    className="min-w-0"
                  >
                    <button
                      type="submit"
                      title="Enter your Order Headquarters."
                      className="flex min-h-[var(--portal-nav-min-h)] w-full items-center gap-2 border border-transparent px-2.5 py-[var(--portal-nav-y)] text-left text-[11px] text-[rgb(var(--sep-colour-b6a894))] transition hover:border-[rgb(var(--sep-colour-5d4930))] hover:bg-[rgb(var(--sep-colour-1d1712))] hover:text-[rgb(var(--sep-colour-e8d8ba))] lg:text-xs"
                    >
                      <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center">
                        <img
                          src="/icons/orders.png"
                          alt=""
                          aria-hidden="true"
                          className="h-full w-full object-contain"
                        />
                      </span>

                      <span className="truncate">
                        Order Headquarters
                      </span>
                    </button>
                  </form>
                ) : null,

                ...mainNavigationItems
                  .slice(2)
                  .map(renderNavigationItem),
              ]}
            />'''

    sidebar = replace_once(
        sidebar,
        desktop_old,
        desktop_new,
        "desktop Explore Sepulchria navigation",
    )

    mobile = replace_once(
        mobile,
        'import { enterRoomFromMap } from "@/app/(portal)/game/actions";',
        'import { enterRoomFromMap } from "@/app/(portal)/game/actions";\n'
        'import { enterOwnOrderHeadquarters } from "@/app/(portal)/orders/headquarters/shortcut-actions";\n'
        'import { useOrderHeadquartersRoomId } from "@/components/portal/use-order-headquarters-room";',
        "mobile imports",
    )

    mobile = replace_once(
        mobile,
        '  const pathname = usePathname();\n  const searchParams = useSearchParams();',
        '  const pathname = usePathname();\n'
        '  const searchParams = useSearchParams();\n'
        '  const orderHeadquartersRoomId =\n'
        '    useOrderHeadquartersRoomId();',
        "mobile HQ hook",
    )

    mobile = replace_once(
        mobile,
        '        <div className="mx-auto grid max-w-md grid-cols-5 gap-1">',
        '        <div\n'
        '          className={`mx-auto grid max-w-md gap-1 ${\n'
        '            orderHeadquartersRoomId\n'
        '              ? "grid-cols-6"\n'
        '              : "grid-cols-5"\n'
        '          }`}\n'
        '        >',
        "mobile dynamic grid",
    )

    mobile_anchor = '''          <button
            type="button"
            aria-haspopup="dialog"
            onClick={() =>
              openPortalModal({
                label:
                  "Sepulchria's People",'''

    mobile_insert = '''          {orderHeadquartersRoomId ? (
            <form
              action={enterOwnOrderHeadquarters}
              className="min-w-0"
            >
              <button
                type="submit"
                title="Enter your Order Headquarters."
                className="flex min-h-[50px] w-full flex-col items-center justify-center gap-1 px-1 text-[9px] text-[rgb(var(--sep-colour-8f806d))]"
              >
                <MobileIcon
                  src="/icons/orders.png"
                  size={20}
                />
                <span className="uppercase tracking-[0.14em]">
                  HQ
                </span>
              </button>
            </form>
          ) : null}

''' + mobile_anchor

    mobile = replace_once(
        mobile,
        mobile_anchor,
        mobile_insert,
        "mobile HQ insertion between Enter and People",
    )

    hook = '''"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";

type HeadquartersRelation =
  | {
      is_active: boolean | null;
    }
  | {
      is_active: boolean | null;
    }[]
  | null;

export function useOrderHeadquartersRoomId() {
  const [
    roomId,
    setRoomId,
  ] = useState<string | null>(null);

  const refresh =
    useCallback(async () => {
      const supabase =
        createClient();

      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user) {
        setRoomId(null);
        return;
      }

      const {
        data: character,
        error: characterError,
      } = await supabase
        .from("characters")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (
        characterError ||
        !character
      ) {
        if (characterError) {
          console.error(
            "Unable to identify character for Order Headquarters shortcut:",
            characterError,
          );
        }

        setRoomId(null);
        return;
      }

      const {
        data: memberships,
        error: membershipError,
      } = await supabase
        .from("order_memberships")
        .select("order_id")
        .eq(
          "character_id",
          character.id,
        )
        .limit(1);

      if (membershipError) {
        console.error(
          "Unable to load Order membership for Headquarters shortcut:",
          membershipError,
        );
        setRoomId(null);
        return;
      }

      const orderId =
        memberships?.[0]?.order_id ??
        null;

      if (!orderId) {
        setRoomId(null);
        return;
      }

      const {
        data: headquarters,
        error: headquartersError,
      } = await supabase
        .from("order_headquarters")
        .select(`
          room_id,
          room:rooms!order_headquarters_room_id_fkey(
            is_active
          )
        `)
        .eq(
          "order_id",
          orderId,
        )
        .maybeSingle();

      if (headquartersError) {
        console.error(
          "Unable to load Order Headquarters shortcut:",
          headquartersError,
        );
        setRoomId(null);
        return;
      }

      const roomRelation =
        headquarters?.room as
          HeadquartersRelation;

      const room =
        Array.isArray(roomRelation)
          ? roomRelation[0] ?? null
          : roomRelation;

      setRoomId(
        headquarters?.room_id &&
          room?.is_active === true
          ? headquarters.room_id
          : null,
      );
    }, []);

  useEffect(() => {
    void refresh();

    function handleFocus() {
      void refresh();
    }

    function handleVisibility() {
      if (
        document.visibilityState ===
        "visible"
      ) {
        void refresh();
      }
    }

    window.addEventListener(
      "focus",
      handleFocus,
    );

    document.addEventListener(
      "visibilitychange",
      handleVisibility,
    );

    return () => {
      window.removeEventListener(
        "focus",
        handleFocus,
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibility,
      );
    };
  }, [refresh]);

  return roomId;
}
'''

    action = '''"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

type RoomRelation =
  | {
      is_active: boolean | null;
    }
  | {
      is_active: boolean | null;
    }[]
  | null;

export async function enterOwnOrderHeadquarters() {
  const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    throw new Error(
      "You must be signed in.",
    );
  }

  const {
    data: character,
    error: characterError,
  } = await supabase
    .from("characters")
    .select(
      "id, current_room_id",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (
    characterError ||
    !character
  ) {
    throw new Error(
      characterError?.message ??
        "Unable to load your character.",
    );
  }

  const {
    data: memberships,
    error: membershipError,
  } = await supabase
    .from("order_memberships")
    .select("order_id")
    .eq(
      "character_id",
      character.id,
    )
    .limit(1);

  if (membershipError) {
    throw new Error(
      `Unable to load your Order membership: ${membershipError.message}`,
    );
  }

  const orderId =
    memberships?.[0]?.order_id ??
    null;

  if (!orderId) {
    throw new Error(
      "You are not currently a member of an Order.",
    );
  }

  const {
    data: headquarters,
    error: headquartersError,
  } = await supabase
    .from("order_headquarters")
    .select(`
      room_id,
      room:rooms!order_headquarters_room_id_fkey(
        is_active
      )
    `)
    .eq(
      "order_id",
      orderId,
    )
    .maybeSingle();

  if (headquartersError) {
    throw new Error(
      `Unable to load your Order Headquarters: ${headquartersError.message}`,
    );
  }

  const roomRelation =
    headquarters?.room as
      RoomRelation;

  const room =
    Array.isArray(roomRelation)
      ? roomRelation[0] ?? null
      : roomRelation;

  if (
    !headquarters?.room_id ||
    room?.is_active !== true
  ) {
    throw new Error(
      "Your Order Headquarters is currently unavailable.",
    );
  }

  const {
    error: moveError,
  } = await supabase
    .from("characters")
    .update({
      return_room_id:
        character.current_room_id,
      current_room_id:
        headquarters.room_id,
    })
    .eq(
      "id",
      character.id,
    );

  if (moveError) {
    throw new Error(
      `Unable to enter your Order Headquarters: ${moveError.message}`,
    );
  }

  redirect("/game");
}
'''

    sidebar_path.write_text(
        sidebar,
        encoding="utf-8",
    )
    mobile_path.write_text(
        mobile,
        encoding="utf-8",
    )

    hook_path.parent.mkdir(
        parents=True,
        exist_ok=True,
    )
    hook_path.write_text(
        hook,
        encoding="utf-8",
    )

    action_path.parent.mkdir(
        parents=True,
        exist_ok=True,
    )
    action_path.write_text(
        action,
        encoding="utf-8",
    )

    print("Patched:")
    print(" - components/portal/portal-sidebar.tsx")
    print(" - components/portal/mobile-portal-navigation.tsx")
    print("Created:")
    print(" - components/portal/use-order-headquarters-room.ts")
    print(" - app/(portal)/orders/headquarters/shortcut-actions.ts")
    print()
    print("Placement:")
    print(" - Desktop: Enter Sepulchria -> Order Headquarters -> Sepulchria's People")
    print(" - Mobile: ENTER -> HQ -> PEOPLE")
    print(" - Hidden automatically when the character has no active Order HQ")

if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise
