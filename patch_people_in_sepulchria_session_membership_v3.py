from pathlib import Path
import re

COUNTER = Path("components/portal/active-city-counter.tsx")
CONTEXT = Path("lib/portal/get-portal-context.ts")
HELPER = Path("lib/portal/get-active-portal-character-ids.ts")
ROUTE = Path("app/api/portal/active-character-ids/route.ts")

def fail(msg: str) -> None:
    raise SystemExit(f"ERROR: {msg}\nNo changes were made.")

for p in (COUNTER, CONTEXT):
    if not p.exists():
        fail(f"Missing expected file: {p}")

if HELPER.exists() or ROUTE.exists():
    fail("Helper/route already exists. Revert/remove any previous partial attempt first.")

counter = COUNTER.read_text(encoding="utf-8")
context = CONTEXT.read_text(encoding="utf-8")

# ---------------- active-city-counter.tsx ----------------

counter, n = re.subn(
    r'import\s*\{\s*PRESENCE_ACTIVE_MINUTES,\s*\}\s*from\s*"@/lib/game/constants";\s*\n',
    "",
    counter,
    count=1,
)
if n != 1:
    fail("Could not remove PRESENCE_ACTIVE_MINUTES import from active-city-counter.tsx.")

start = counter.find("  const refreshPresence =")
end = counter.find("\n  useEffect(() => {", start)

if start < 0 or end < 0:
    fail("Could not structurally locate refreshPresence in active-city-counter.tsx.")

old_refresh = counter[start:end]

if '"character_presence"' not in old_refresh or "last_seen_at" not in old_refresh:
    fail("refreshPresence is not the expected presence-based implementation.")

new_refresh = '''  const refreshPresence =
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

counter = counter[:start] + new_refresh + counter[end:]

# ---------------- get-portal-context.ts ----------------

context, n = re.subn(
    r'import\s*\{\s*PRESENCE_ACTIVE_MINUTES,\s*\}\s*from\s*"@/lib/game/constants";\s*\n',
    'import {\n  getActivePortalCharacterIds,\n} from "@/lib/portal/get-active-portal-character-ids";\n',
    context,
    count=1,
)
if n != 1:
    fail("Could not replace PRESENCE_ACTIVE_MINUTES import in get-portal-context.ts.")

setup_start = context.find("    const activeSince =")
setup_end = context.find("\n    if (characterData) {", setup_start)

if setup_start < 0 or setup_end < 0:
    fail("Could not locate the old onlineCountQuery setup in get-portal-context.ts.")

old_setup = context[setup_start:setup_end]

if "onlineCountQuery" not in old_setup:
    fail("Expected onlineCountQuery was not found in get-portal-context.ts.")

context = (
    context[:setup_start]
    + '''    const activePortalCharacterIdsPromise =
      getActivePortalCharacterIds({
        includeAppearOffline:
          staffSession !== null,
      });
'''
    + context[setup_end:]
)

old = '''        {
          count:
            onlineCharacterCount,
          error: onlineError,
        },
      ] = await Promise.all(['''
new = '''        activePortalCharacterIds,
      ] = await Promise.all(['''

if context.count(old) != 1:
    fail("Could not locate Promise.all online-count destructuring.")

context = context.replace(old, new, 1)

old = '''        supabase.rpc(
          "get_unread_direct_message_count",
        ),
        onlineCountQuery,
      ]);'''
new = '''        supabase.rpc(
          "get_unread_direct_message_count",
        ),
        activePortalCharacterIdsPromise,
      ]);'''

if context.count(old) != 1:
    fail("Could not locate onlineCountQuery inside Promise.all.")

context = context.replace(old, new, 1)

old = '''      if (onlineError) {
        throw new Error(
          `Unable to count online characters: ${onlineError.message}`,
        );
      }

'''

if context.count(old) != 1:
    fail("Could not locate onlineError block.")

context = context.replace(old, "", 1)

old = '''        onlineCharacterCount:
          onlineCharacterCount ?? 0,'''
new = '''        onlineCharacterCount:
          activePortalCharacterIds.length,'''.rstrip()

if context.count(old) != 1:
    fail("Could not locate character return count.")

context = context.replace(old, new, 1)

tail_start = context.find(
    "    const {\n      count: onlineCharacterCount,"
)
tail_end = context.find(
    "\n    return {",
    tail_start,
)

if tail_start < 0 or tail_end < 0:
    fail("Could not locate no-character online-count block.")

context = (
    context[:tail_start]
    + '''    const activePortalCharacterIds =
      await activePortalCharacterIdsPromise;
'''
    + context[tail_end:]
)

old = '''      onlineCharacterCount:
        onlineCharacterCount ?? 0,'''
new = '''      onlineCharacterCount:
        activePortalCharacterIds.length,'''.rstrip()

if context.count(old) != 1:
    fail("Could not locate no-character return count.")

context = context.replace(old, new, 1)

# ---------------- new server helper ----------------

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
    data: hiddenRows,
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
      `Unable to apply Appear Offline visibility: ${hiddenError.message}`,
    );
  }

  const hiddenIds =
    new Set(
      (hiddenRows ?? []).map(
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

# ---------------- new API route ----------------

route = '''import {
  NextResponse,
} from "next/server";

import {
  getAuthenticatedUser,
} from "@/lib/auth/get-authenticated-user";
import {
  getStaffSession,
} from "@/lib/auth/require-staff";
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

# All validation has passed. Only now write.
HELPER.parent.mkdir(parents=True, exist_ok=True)
ROUTE.parent.mkdir(parents=True, exist_ok=True)

COUNTER.write_text(counter, encoding="utf-8")
CONTEXT.write_text(context, encoding="utf-8")
HELPER.write_text(helper, encoding="utf-8")
ROUTE.write_text(route, encoding="utf-8")

print("SUCCESS")
print("Updated:")
print(f"  {COUNTER}")
print(f"  {CONTEXT}")
print("Created:")
print(f"  {HELPER}")
print(f"  {ROUTE}")
print()
print("Next: npm run build")
