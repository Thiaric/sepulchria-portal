from pathlib import Path

FILES = {
    "counter": Path("components/portal/active-city-counter.tsx"),
    "context": Path("lib/portal/get-portal-context.ts"),
    "helper": Path("lib/portal/get-active-portal-character-ids.ts"),
    "route": Path("app/api/portal/active-character-ids/route.ts"),
}

def die(msg: str) -> None:
    raise SystemExit(f"ERROR: {msg}\nNo changes were made.")

for key in ("counter", "context"):
    if not FILES[key].exists():
        die(f"Expected file not found: {FILES[key]}")

if FILES["helper"].exists():
    die(f"{FILES['helper']} already exists.")
if FILES["route"].exists():
    die(f"{FILES['route']} already exists.")

counter = FILES["counter"].read_text(encoding="utf-8")
context = FILES["context"].read_text(encoding="utf-8")

counter_import_old = '''import {
  PRESENCE_ACTIVE_MINUTES,
} from "@/lib/game/constants";
'''
counter_import_new = ''

counter_refresh_old = '''  const refreshPresence =
    useCallback(async () => {
      const supabase =
        createClient();

      const activeSince =
        new Date(
          Date.now() -
            PRESENCE_ACTIVE_MINUTES *
              60_000,
        ).toISOString();

      const {
        data,
        error: presenceError,
      } = await supabase
        .from(
          "character_presence",
        )
        .select(
          `
            character_id,
            room_id,
            status,
            last_seen_at,
            appear_offline,
            appeared_offline_at,

            room:rooms!character_presence_room_id_fkey(
              id,
              name,
              slug,
              area:areas!rooms_area_id_fkey(
                slug
              )
            ),

            character:characters!character_presence_character_id_fkey(
  id,
  display_name,
  portrait_url,
  public_slug,
  is_system,
  title,
  occupation,

  order_memberships(
    order:orders!order_memberships_order_id_fkey(
      id,
      name,
      slug,
      icon_url,
      colour
    )
  ),

  race:races!characters_race_id_fkey(
                id,
                name,
                slug,
                icon_url,
                colour
              ),

              association:associations!characters_association_id_fkey(
                id,
                name,
                slug,
                icon_url,
                colour
              )
            )
          `,
        )
        .gte(
          "last_seen_at",
          activeSince,
        )


      if (presenceError) {
        console.error(
          "Unable to refresh active characters:",
          presenceError.message,
        );

        setError(
          "The city presence list could not be loaded.",
        );
        setLoading(false);
        return;
      }

      const rows =
        (data ??
          []) as unknown as PresentCharacter[];

      const visibleRows =
        isStaff
          ? rows
          : rows.filter(
              (row) =>
                row.appear_offline !==
                true,
            );

      const sortedRows =
  [...visibleRows].sort(
    (a, b) => {
      const aCharacter =
        normaliseRelation(
          a.character,
        );

      const bCharacter =
        normaliseRelation(
          b.character,
        );

      const aName =
        aCharacter?.display_name?.trim() ??
        "";

      const bName =
        bCharacter?.display_name?.trim() ??
        "";

      return aName.localeCompare(
        bName,
        undefined,
        {
          sensitivity: "base",
        },
      );
    },
  );

setPresentCharacters(
  sortedRows,
);
      setCount(
        visibleRows.length,
      );
      setError(null);
      setLoading(false);
    }, [isStaff]);
'''

counter_refresh_new = '''  const refreshPresence =
    useCallback(async () => {
      const supabase =
        createClient();

      let activeCharacterIds:
        string[] = [];

      try {
        const response =
          await fetch(
            "/api/portal/active-character-ids",
            {
              cache: "no-store",
            },
          );

        if (!response.ok) {
          throw new Error(
            `Active Portal session lookup failed with ${response.status}.`,
          );
        }

        const payload =
          (await response.json()) as {
            characterIds?: unknown;
          };

        activeCharacterIds =
          Array.isArray(
            payload.characterIds,
          )
            ? payload.characterIds.filter(
                (
                  value,
                ): value is string =>
                  typeof value ===
                  "string",
              )
            : [];
      } catch (activeSessionError) {
        console.error(
          "Unable to refresh active Portal sessions:",
          activeSessionError,
        );

        setError(
          "The city presence list could not be loaded.",
        );
        setLoading(false);
        return;
      }

      if (
        activeCharacterIds.length ===
        0
      ) {
        setPresentCharacters([]);
        setCount(0);
        setError(null);
        setLoading(false);
        return;
      }

      const {
        data,
        error: presenceError,
      } = await supabase
        .from(
          "character_presence",
        )
        .select(
          `
            character_id,
            room_id,
            status,
            last_seen_at,
            appear_offline,
            appeared_offline_at,

            room:rooms!character_presence_room_id_fkey(
              id,
              name,
              slug,
              area:areas!rooms_area_id_fkey(
                slug
              )
            ),

            character:characters!character_presence_character_id_fkey(
  id,
  display_name,
  portrait_url,
  public_slug,
  is_system,
  title,
  occupation,

  order_memberships(
    order:orders!order_memberships_order_id_fkey(
      id,
      name,
      slug,
      icon_url,
      colour
    )
  ),

  race:races!characters_race_id_fkey(
                id,
                name,
                slug,
                icon_url,
                colour
              ),

              association:associations!characters_association_id_fkey(
                id,
                name,
                slug,
                icon_url,
                colour
              )
            )
          `,
        )
        .in(
          "character_id",
          activeCharacterIds,
        );

      if (presenceError) {
        console.error(
          "Unable to refresh active characters:",
          presenceError.message,
        );

        setError(
          "The city presence list could not be loaded.",
        );
        setLoading(false);
        return;
      }

      const rows =
        (data ??
          []) as unknown as PresentCharacter[];

      const visibleRows =
        isStaff
          ? rows
          : rows.filter(
              (row) =>
                row.appear_offline !==
                true,
            );

      const sortedRows =
        [...visibleRows].sort(
          (a, b) => {
            const aCharacter =
              normaliseRelation(
                a.character,
              );

            const bCharacter =
              normaliseRelation(
                b.character,
              );

            const aName =
              aCharacter?.display_name?.trim() ??
              "";

            const bName =
              bCharacter?.display_name?.trim() ??
              "";

            return aName.localeCompare(
              bName,
              undefined,
              {
                sensitivity:
                  "base",
              },
            );
          },
        );

      setPresentCharacters(
        sortedRows,
      );

      setCount(
        activeCharacterIds.length,
      );

      setError(null);
      setLoading(false);
    }, [isStaff]);
'''

context_import_old = '''import {
  PRESENCE_ACTIVE_MINUTES,
} from "@/lib/game/constants";
'''
context_import_new = '''import {
  getActivePortalCharacterIds,
} from "@/lib/portal/get-active-portal-character-ids";
'''

context_count_setup_old = '''    const activeSince =
      new Date(
        Date.now() -
          PRESENCE_ACTIVE_MINUTES *
            60_000,
      ).toISOString();

    let onlineCountQuery =
      supabase
        .from("character_presence")
        .select("character_id", {
          count: "exact",
          head: true,
        })
        .gte(
          "last_seen_at",
          activeSince,
        );

    if (!staffSession) {
      onlineCountQuery =
        onlineCountQuery.eq(
          "appear_offline",
          false,
        );
    }
'''
context_count_setup_new = '''    const activePortalCharacterIdsPromise =
      getActivePortalCharacterIds({
        includeAppearOffline:
          staffSession !== null,
      });
'''

context_promise_destructure_old = '''        {
          count:
            onlineCharacterCount,
          error: onlineError,
        },
      ] = await Promise.all(['''
context_promise_destructure_new = '''        activePortalCharacterIds,
      ] = await Promise.all(['''

context_promise_item_old = '''        supabase.rpc(
          "get_unread_direct_message_count",
        ),
        onlineCountQuery,
      ]);'''
context_promise_item_new = '''        supabase.rpc(
          "get_unread_direct_message_count",
        ),
        activePortalCharacterIdsPromise,
      ]);'''

context_online_error_old = '''      if (onlineError) {
        throw new Error(
          `Unable to count online characters: ${onlineError.message}`,
        );
      }

'''

context_return_count_old = '''        onlineCharacterCount:
          onlineCharacterCount ?? 0,'''
context_return_count_new = '''        onlineCharacterCount:
          activePortalCharacterIds.length,'''.rstrip()

context_no_character_old = '''    const {
      count: onlineCharacterCount,
      error: onlineError,
    } = await onlineCountQuery;

    if (onlineError) {
      throw new Error(
        `Unable to count online characters: ${onlineError.message}`,
      );
    }

    return {'''
context_no_character_new = '''    const activePortalCharacterIds =
      await activePortalCharacterIdsPromise;

    return {'''

context_no_character_count_old = '''      onlineCharacterCount:
        onlineCharacterCount ?? 0,'''
context_no_character_count_new = '''      onlineCharacterCount:
        activePortalCharacterIds.length,'''.rstrip()

preflights = [
    (counter, counter_import_old, "counter presence cutoff import"),
    (counter, counter_refresh_old, "counter refreshPresence"),
    (context, context_import_old, "context presence cutoff import"),
    (context, context_count_setup_old, "context online count setup"),
    (context, context_promise_destructure_old, "context Promise.all destructuring"),
    (context, context_promise_item_old, "context Promise.all count item"),
    (context, context_online_error_old, "context online error block"),
    (context, context_return_count_old, "character return online count"),
    (context, context_no_character_old, "no-character count block"),
    (context, context_no_character_count_old, "no-character return count"),
]

for source, old, label in preflights:
    count = source.count(old)
    if count != 1:
        die(f"Could not uniquely validate {label}: expected 1, found {count}.")

counter_new = counter.replace(counter_import_old, counter_import_new, 1)
counter_new = counter_new.replace(counter_refresh_old, counter_refresh_new, 1)

context_new = context
for old, new in [
    (context_import_old, context_import_new),
    (context_count_setup_old, context_count_setup_new),
    (context_promise_destructure_old, context_promise_destructure_new),
    (context_promise_item_old, context_promise_item_new),
    (context_online_error_old, ""),
    (context_return_count_old, context_return_count_new),
    (context_no_character_old, context_no_character_new),
    (context_no_character_count_old, context_no_character_count_new),
]:
    context_new = context_new.replace(old, new, 1)

helper = '''import "server-only";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

const ACTIVE_PORTAL_SESSION_MINUTES =
  60;

type Options = {
  includeAppearOffline?: boolean;
};

export async function getActivePortalCharacterIds({
  includeAppearOffline = false,
}: Options = {}): Promise<string[]> {
  const admin =
    createAdminClient();

  const activeSince =
    new Date(
      Date.now() -
        ACTIVE_PORTAL_SESSION_MINUTES *
          60_000,
    ).toISOString();

  const {
    data: sessions,
    error: sessionError,
  } = await admin
    .from("portal_active_sessions")
    .select("user_id")
    .gte(
      "last_seen_at",
      activeSince,
    );

  if (sessionError) {
    throw new Error(
      `Unable to load active Portal sessions: ${sessionError.message}`,
    );
  }

  const userIds =
    Array.from(
      new Set(
        (sessions ?? [])
          .map(
            (row) =>
              row.user_id as string,
          )
          .filter(Boolean),
      ),
    );

  if (userIds.length === 0) {
    return [];
  }

  const {
    data: characters,
    error: characterError,
  } = await admin
    .from("characters")
    .select("id")
    .in(
      "user_id",
      userIds,
    )
    .eq(
      "status",
      "approved",
    )
    .eq(
      "is_system",
      false,
    );

  if (characterError) {
    throw new Error(
      `Unable to resolve active Portal Characters: ${characterError.message}`,
    );
  }

  const characterIds =
    Array.from(
      new Set(
        (characters ?? [])
          .map(
            (row) =>
              row.id as string,
          )
          .filter(Boolean),
      ),
    );

  if (
    includeAppearOffline ||
    characterIds.length === 0
  ) {
    return characterIds;
  }

  const {
    data: hiddenPresence,
    error: hiddenError,
  } = await admin
    .from("character_presence")
    .select("character_id")
    .in(
      "character_id",
      characterIds,
    )
    .eq(
      "appear_offline",
      true,
    );

  if (hiddenError) {
    throw new Error(
      `Unable to apply presence visibility: ${hiddenError.message}`,
    );
  }

  const hiddenIds =
    new Set(
      (hiddenPresence ?? []).map(
        (row) =>
          row.character_id as string,
      ),
    );

  return characterIds.filter(
    (id) =>
      !hiddenIds.has(id),
  );
}
'''

route = '''import {
  NextResponse,
} from "next/server";

import {
  getStaffSession,
} from "@/lib/auth/require-staff";
import {
  getAuthenticatedUser,
} from "@/lib/auth/get-authenticated-user";
import {
  getActivePortalCharacterIds,
} from "@/lib/portal/get-active-portal-character-ids";

export const dynamic =
  "force-dynamic";

export async function GET() {
  const {
    data: { user },
    error: userError,
  } =
    await getAuthenticatedUser();

  if (
    userError ||
    !user
  ) {
    return NextResponse.json(
      {
        ok: false,
        characterIds: [],
      },
      {
        status: 401,
      },
    );
  }

  try {
    const staffSession =
      await getStaffSession();

    const characterIds =
      await getActivePortalCharacterIds({
        includeAppearOffline:
          staffSession !== null,
      });

    return NextResponse.json(
      {
        ok: true,
        characterIds,
      },
      {
        headers: {
          "Cache-Control":
            "no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    console.error(
      "Unable to load active Portal Characters:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,
        characterIds: [],
      },
      {
        status: 500,
      },
    );
  }
}
'''

FILES["helper"].parent.mkdir(parents=True, exist_ok=True)
FILES["route"].parent.mkdir(parents=True, exist_ok=True)

FILES["counter"].write_text(counter_new, encoding="utf-8")
FILES["context"].write_text(context_new, encoding="utf-8")
FILES["helper"].write_text(helper, encoding="utf-8")
FILES["route"].write_text(route, encoding="utf-8")

print("SUCCESS")
print("Updated:")
print(f"  {FILES['counter']}")
print(f"  {FILES['context']}")
print("Created:")
print(f"  {FILES['helper']}")
print(f"  {FILES['route']}")
print()
print("Behaviour:")
print("  - People in Sepulchria is driven by active Portal sessions.")
print("  - character_presence.last_seen_at no longer decides membership.")
print("  - presence still supplies status/location/appear-offline.")
print("  - session freshness ceiling is 60 minutes.")
print("  - existing 15-minute Away and 60-minute logout code remains untouched.")
print()
print("Next: npm run build")
