from pathlib import Path
import shutil, subprocess

ROOT = Path.cwd()
EXPECTED = "4ecd66e9c397a907b1d19a668ed980ea40757a20"
PORTAL_CONTEXT = 'import "server-only";\n\nimport { cache } from "react";\nimport { redirect } from "next/navigation";\n\nimport {\n  PRESENCE_ACTIVE_MINUTES,\n} from "@/lib/game/constants";\nimport { createClient } from "@/lib/supabase/server";\nimport {\n  getPrivateLocationAccess,\n  getVisiblePrivateLocations,\n} from "@/lib/private-locations/access";\nimport {\n  getStaffSession,\n} from "@/lib/auth/require-staff";\nimport {\n  getOrderHeadquartersVisibility,\n} from "@/lib/order-headquarters/access";\nimport type {\n  PortalCharacter,\n  PortalCodexReference,\n  PortalContext,\n  PortalPresence,\n} from "@/types/portal";\n\ntype CodexRelationRow = {\n  id: string;\n  name: string;\n  slug: string;\n  icon_url: string | null;\n  colour: string | null;\n};\n\ntype AreaRelationRow = {\n  id: string;\n  name: string;\n  slug: string;\n};\n\ntype RoomRelationRow = {\n  id: string;\n  name: string;\n  slug: string;\n  image_url: string | null;\n  is_outdoors: boolean;\n  area:\n    | AreaRelationRow\n    | AreaRelationRow[]\n    | null;\n};\n\ntype CharacterRow = {\n  id: string;\n  first_name: string;\n  surname: string;\n  display_name: string;\n  portrait_url: string | null;\n  occupation: string | null;\n  title: string | null;\n  biography: string | null;\n  status:\n    | "draft"\n    | "submitted"\n    | "approved"\n    | "rejected";\n  current_room_id: string | null;\n  race:\n    | CodexRelationRow\n    | CodexRelationRow[]\n    | null;\n  association:\n    | CodexRelationRow\n    | CodexRelationRow[]\n    | null;\n  room:\n    | RoomRelationRow\n    | RoomRelationRow[]\n    | null;\n};\n\nfunction normaliseRelation<T>(\n  value: T | T[] | null,\n): T | null {\n  return Array.isArray(value)\n    ? value[0] ?? null\n    : value;\n}\n\nfunction normaliseCodexReference(\n  value:\n    | CodexRelationRow\n    | CodexRelationRow[]\n    | null,\n): PortalCodexReference | null {\n  const relation =\n    normaliseRelation(value);\n\n  if (!relation) {\n    return null;\n  }\n\n  return {\n    id: relation.id,\n    name: relation.name,\n    slug: relation.slug,\n    icon_url: relation.icon_url,\n    colour: relation.colour,\n  };\n}\n\nfunction parseCount(\n  value: unknown,\n): number {\n  if (\n    typeof value === "number" &&\n    Number.isFinite(value)\n  ) {\n    return value;\n  }\n\n  if (typeof value === "string") {\n    const parsed =\n      Number.parseInt(value, 10);\n\n    return Number.isFinite(parsed)\n      ? parsed\n      : 0;\n  }\n\n  return 0;\n}\n\nexport const getPortalContext = cache(\n  async (): Promise<PortalContext> => {\n    const supabase =\n      await createClient();\n\n    const {\n      data: { user },\n      error: userError,\n    } =\n      await supabase.auth.getUser();\n\n    if (userError || !user) {\n      redirect("/homepage");\n    }\n\n    const [\n      {\n        data: characterData,\n        error: characterError,\n      },\n      staffSession,\n    ] = await Promise.all([\n      supabase\n        .from("characters")\n        .select(`\n          id,\n          first_name,\n          surname,\n          display_name,\n          portrait_url,\n          occupation,\n          title,\n          biography,\n          status,\n          current_room_id,\n          race:races!characters_race_id_fkey(\n            id,\n            name,\n            slug,\n            icon_url,\n            colour\n          ),\n          association:associations!characters_association_id_fkey(\n            id,\n            name,\n            slug,\n            icon_url,\n            colour\n          ),\n          room:rooms!characters_current_room_id_fkey(\n            id,\n            name,\n            slug,\n            image_url,\n            is_outdoors,\n            area:areas!rooms_area_id_fkey(\n              id,\n              name,\n              slug\n            )\n          )\n        `)\n        .eq("user_id", user.id)\n        .maybeSingle(),\n      getStaffSession(),\n    ]);\n\n    if (characterError) {\n      throw new Error(\n        `Unable to load portal character: ${characterError.message}`,\n      );\n    }\n\n    let character:\n      PortalCharacter | null = null;\n\n    let presence:\n      PortalPresence | null = null;\n\n    let unreadMessageCount = 0;\n    let currentRoomAccessAllowed =\n      true;\n\n    let privateLocations:\n      Awaited<\n        ReturnType<\n          typeof getVisiblePrivateLocations\n        >\n      > = [];\n\n    let allOrderHeadquartersRoomIds:\n      string[] = [];\n\n    let visibleOrderHeadquartersRoomIds:\n      string[] = [];\n\n    const activeSince =\n      new Date(\n        Date.now() -\n          PRESENCE_ACTIVE_MINUTES *\n            60_000,\n      ).toISOString();\n\n    let onlineCountQuery =\n      supabase\n        .from("character_presence")\n        .select("character_id", {\n          count: "exact",\n          head: true,\n        })\n        .gte(\n          "last_seen_at",\n          activeSince,\n        );\n\n    if (!staffSession) {\n      onlineCountQuery =\n        onlineCountQuery.eq(\n          "appear_offline",\n          false,\n        );\n    }\n\n    if (characterData) {\n      const row =\n        characterData as unknown as CharacterRow;\n\n      const room =\n        normaliseRelation(\n          row.room,\n        );\n\n      const area = room\n        ? normaliseRelation(\n            room.area,\n          )\n        : null;\n\n      character = {\n        id: row.id,\n        first_name:\n          row.first_name,\n        surname:\n          row.surname,\n        display_name:\n          row.display_name,\n        portrait_url:\n          row.portrait_url,\n        occupation:\n          row.occupation,\n        title:\n          row.title,\n        biography:\n          row.biography,\n        status:\n          row.status,\n        race:\n          normaliseCodexReference(\n            row.race,\n          ),\n        association:\n          normaliseCodexReference(\n            row.association,\n          ),\n        current_room_id:\n          row.current_room_id,\n        currentRoom: room\n          ? {\n              id: room.id,\n              name: room.name,\n              slug: room.slug,\n              image_url:\n                room.image_url,\n              is_outdoors:\n                room.is_outdoors,\n              area,\n            }\n          : null,\n      };\n\n      const characterId =\n        character.id;\n\n      const roomAccessPromise =\n        character.current_room_id\n          ? getPrivateLocationAccess(\n              character.current_room_id,\n              characterId,\n            )\n          : Promise.resolve(null);\n\n      const [\n        visiblePrivateResult,\n        headquartersVisibility,\n        roomAccess,\n        {\n          data: presenceData,\n          error: presenceError,\n        },\n        {\n          data: unreadResult,\n          error: unreadError,\n        },\n        {\n          count:\n            onlineCharacterCount,\n          error: onlineError,\n        },\n      ] = await Promise.all([\n        getVisiblePrivateLocations(\n          characterId,\n        ),\n        getOrderHeadquartersVisibility(\n          characterId,\n        ),\n        roomAccessPromise,\n        supabase\n          .from(\n            "character_presence",\n          )\n          .select(\n            "status, last_seen_at, room_id, appear_offline, appeared_offline_at",\n          )\n          .eq(\n            "character_id",\n            characterId,\n          )\n          .maybeSingle(),\n        supabase.rpc(\n          "get_unread_direct_message_count",\n        ),\n        onlineCountQuery,\n      ]);\n\n      if (presenceError) {\n        throw new Error(\n          `Unable to load presence: ${presenceError.message}`,\n        );\n      }\n\n      if (unreadError) {\n        throw new Error(\n          `Unable to count unread messages: ${unreadError.message}`,\n        );\n      }\n\n      if (onlineError) {\n        throw new Error(\n          `Unable to count online characters: ${onlineError.message}`,\n        );\n      }\n\n      privateLocations =\n        visiblePrivateResult;\n\n      allOrderHeadquartersRoomIds =\n        headquartersVisibility.allRoomIds;\n\n      visibleOrderHeadquartersRoomIds =\n        headquartersVisibility.visibleRoomIds;\n\n      if (roomAccess) {\n        currentRoomAccessAllowed =\n          !roomAccess.isPrivate ||\n          roomAccess.allowed;\n      }\n\n      presence =\n        presenceData as PortalPresence | null;\n\n      unreadMessageCount =\n        parseCount(unreadResult);\n\n      return {\n        user: {\n          id: user.id,\n          email:\n            user.email ?? null,\n        },\n        character,\n        presence,\n        unreadMessageCount,\n        onlineCharacterCount:\n          onlineCharacterCount ?? 0,\n        currentRoomAccessAllowed,\n        isStaff:\n          staffSession !== null,\n        privateLocations,\n        allOrderHeadquartersRoomIds,\n        visibleOrderHeadquartersRoomIds,\n      };\n    }\n\n    const {\n      count: onlineCharacterCount,\n      error: onlineError,\n    } = await onlineCountQuery;\n\n    if (onlineError) {\n      throw new Error(\n        `Unable to count online characters: ${onlineError.message}`,\n      );\n    }\n\n    return {\n      user: {\n        id: user.id,\n        email:\n          user.email ?? null,\n      },\n      character,\n      presence,\n      unreadMessageCount,\n      onlineCharacterCount:\n        onlineCharacterCount ?? 0,\n      currentRoomAccessAllowed,\n      isStaff:\n        staffSession !== null,\n      privateLocations,\n      allOrderHeadquartersRoomIds,\n      visibleOrderHeadquartersRoomIds,\n    };\n  },\n);\n'
FORUM_COUNT = 'import "server-only";\n\nimport {\n  createClient,\n} from "@/lib/supabase/server";\n\nexport async function getUnreadForumCount():\n  Promise<number> {\n  const supabase =\n    await createClient();\n\n  const {\n    data,\n    error,\n  } = await supabase.rpc(\n    "get_unread_forum_topic_count",\n  );\n\n  if (error) {\n    return 0;\n  }\n\n  if (\n    typeof data === "number" &&\n    Number.isFinite(data)\n  ) {\n    return data;\n  }\n\n  if (typeof data === "string") {\n    const parsed =\n      Number.parseInt(data, 10);\n\n    return Number.isFinite(parsed)\n      ? parsed\n      : 0;\n  }\n\n  return 0;\n}\n'
LAZY_AUDIT = '"use client";\n\nimport {\n  useCallback,\n  useEffect,\n  useState,\n} from "react";\n\nimport {\n  CharacterAuditTrailClient,\n  type CharacterAuditDisplayRow,\n} from "@/components/characters/character-audit-trail-client";\n\ntype LoadState =\n  | "idle"\n  | "loading"\n  | "loaded"\n  | "error";\n\nexport function CharacterAuditTrail({\n  characterId,\n  staffView = false,\n}: {\n  characterId: string;\n  staffView?: boolean;\n}) {\n  const [state, setState] =\n    useState<LoadState>("idle");\n\n  const [rows, setRows] =\n    useState<\n      CharacterAuditDisplayRow[]\n    >([]);\n\n  const [errorMessage, setErrorMessage] =\n    useState("");\n\n  const load = useCallback(\n    async () => {\n      if (\n        state === "loading" ||\n        state === "loaded"\n      ) {\n        return;\n      }\n\n      setState("loading");\n      setErrorMessage("");\n\n      try {\n        const params =\n          new URLSearchParams({\n            characterId,\n            staffView:\n              staffView\n                ? "1"\n                : "0",\n          });\n\n        const response =\n          await fetch(\n            `/api/character-audit?${params.toString()}`,\n            {\n              method: "GET",\n              credentials:\n                "same-origin",\n              cache: "no-store",\n            },\n          );\n\n        if (!response.ok) {\n          throw new Error(\n            `Character Log request failed (${response.status}).`,\n          );\n        }\n\n        const payload =\n          (await response.json()) as {\n            rows?:\n              CharacterAuditDisplayRow[];\n          };\n\n        setRows(\n          payload.rows ?? [],\n        );\n        setState("loaded");\n      } catch (error) {\n        setErrorMessage(\n          error instanceof Error\n            ? error.message\n            : "Unable to load Character Log.",\n        );\n        setState("error");\n      }\n    },\n    [\n      characterId,\n      staffView,\n      state,\n    ],\n  );\n\n  useEffect(() => {\n    function handleTab(\n      event: Event,\n    ) {\n      const customEvent =\n        event as CustomEvent<string>;\n\n      if (\n        customEvent.detail ===\n        "audit"\n      ) {\n        void load();\n      }\n    }\n\n    window.addEventListener(\n      "sepulchria-character-sheet-tab",\n      handleTab,\n    );\n\n    return () => {\n      window.removeEventListener(\n        "sepulchria-character-sheet-tab",\n        handleTab,\n      );\n    };\n  }, [load]);\n\n  return (\n    <section className="border border-[rgb(var(--sep-colour-6b5032))]/50 bg-[rgb(var(--sep-colour-17110d))] p-4 sm:p-5">\n      <div className="border-b border-[rgb(var(--sep-colour-5d452d))]/35 pb-4">\n        <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-806b50))]">\n          Character history\n        </p>\n\n        <h2 className="mt-1 font-serif text-2xl text-[rgb(var(--sep-colour-dfc79c))]">\n          Character Log\n        </h2>\n\n        <p className="mt-2 text-[10px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">\n          Permanent history of recorded material changes to this Character, newest first.\n        </p>\n      </div>\n\n      {state === "idle" ? (\n        <p className="py-6 text-sm text-[rgb(var(--sep-colour-8f8271))]">\n          Open this tab to load the Character Log.\n        </p>\n      ) : null}\n\n      {state === "loading" ? (\n        <p className="py-6 text-sm text-[rgb(var(--sep-colour-8f8271))]">\n          Loading Character Log…\n        </p>\n      ) : null}\n\n      {state === "error" ? (\n        <div className="py-6">\n          <p className="text-sm text-red-300">\n            {errorMessage}\n          </p>\n\n          <button\n            type="button"\n            onClick={() => {\n              setState("idle");\n              window.setTimeout(\n                () => {\n                  void load();\n                },\n                0,\n              );\n            }}\n            className="mt-3 border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-18110d))] px-3 py-2 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-ae9a7b))]"\n          >\n            Retry\n          </button>\n        </div>\n      ) : null}\n\n      {state === "loaded" ? (\n        <CharacterAuditTrailClient\n          rows={rows}\n          staffView={staffView}\n        />\n      ) : null}\n    </section>\n  );\n}\n'
API_ROUTE = 'import {\n  NextResponse,\n} from "next/server";\n\nimport {\n  getStaffSession,\n} from "@/lib/auth/require-staff";\nimport {\n  createAdminClient,\n} from "@/lib/supabase/admin";\nimport {\n  createClient,\n} from "@/lib/supabase/server";\n\ntype AuditRow = {\n  id: string;\n  event_type: string;\n  entity_type: string;\n  entity_id: string | null;\n  operation: string;\n  actor_user_id: string | null;\n  actor_type:\n    | "player"\n    | "staff"\n    | "system";\n  actor_staff_role:\n    | string\n    | null;\n  actor_label:\n    | string\n    | null;\n  source: string;\n  changed_fields: string[];\n  old_values:\n    | Record<string, unknown>\n    | null;\n  new_values:\n    | Record<string, unknown>\n    | null;\n  metadata:\n    | Record<string, unknown>\n    | null;\n  created_at: string;\n};\n\nconst PLAYER_HIDDEN_KEYS =\n  new Set([\n    "user_id",\n    "actor_user_id",\n    "assigned_by",\n    "approved_by",\n    "reviewed_by",\n    "moderated_by",\n  ]);\n\nfunction eventLabel(\n  value: string,\n) {\n  return value\n    .replaceAll("_", " ")\n    .replace(\n      /\\b\\w/g,\n      (letter) =>\n        letter.toUpperCase(),\n    );\n}\n\nfunction cleanValues(\n  value:\n    | Record<string, unknown>\n    | null,\n  staffView: boolean,\n) {\n  if (!value) {\n    return value;\n  }\n\n  const next = {\n    ...value,\n  };\n\n  delete next.expertise;\n  delete next.current_room_id;\n\n  if (staffView) {\n    return next;\n  }\n\n  return Object.fromEntries(\n    Object.entries(next).filter(\n      ([key]) =>\n        !PLAYER_HIDDEN_KEYS.has(\n          key,\n        ) &&\n        !key.endsWith(\n          "_user_id",\n        ),\n    ),\n  );\n}\n\nfunction cleanFields(\n  fields: string[],\n  staffView: boolean,\n) {\n  return fields.filter(\n    (key) =>\n      key !== "expertise" &&\n      key !==\n        "current_room_id" &&\n      (staffView ||\n        (!PLAYER_HIDDEN_KEYS.has(\n          key,\n        ) &&\n          !key.endsWith(\n            "_user_id",\n          ))),\n  );\n}\n\nfunction actorLabel(\n  row: AuditRow,\n  staffView: boolean,\n  viewerUserId: string,\n) {\n  if (\n    row.actor_type === "system"\n  ) {\n    return "System";\n  }\n\n  if (\n    row.actor_type ===\n      "player" &&\n    row.actor_user_id ===\n      viewerUserId\n  ) {\n    return "You";\n  }\n\n  if (\n    row.actor_type === "player"\n  ) {\n    return staffView\n      ? row.actor_label ??\n          "Player"\n      : "Player";\n  }\n\n  if (staffView) {\n    return (\n      row.actor_label ??\n      (row.actor_staff_role\n        ? `Staff · ${row.actor_staff_role}`\n        : "Staff")\n    );\n  }\n\n  return row.actor_staff_role\n    ? `Staff · ${eventLabel(\n        row.actor_staff_role,\n      )}`\n    : "Staff";\n}\n\nexport async function GET(\n  request: Request,\n) {\n  const url =\n    new URL(request.url);\n\n  const characterId =\n    url.searchParams.get(\n      "characterId",\n    );\n\n  const requestedStaffView =\n    url.searchParams.get(\n      "staffView",\n    ) === "1";\n\n  if (!characterId) {\n    return NextResponse.json(\n      {\n        error:\n          "Missing Character.",\n      },\n      {\n        status: 400,\n      },\n    );\n  }\n\n  const supabase =\n    await createClient();\n\n  const {\n    data: { user },\n    error: authError,\n  } =\n    await supabase.auth.getUser();\n\n  if (\n    authError ||\n    !user\n  ) {\n    return NextResponse.json(\n      {\n        error:\n          "Not authenticated.",\n      },\n      {\n        status: 401,\n      },\n    );\n  }\n\n  const staffSession =\n    await getStaffSession();\n\n  const staffView =\n    requestedStaffView &&\n    staffSession !== null;\n\n  const admin =\n    createAdminClient();\n\n  const {\n    data: character,\n    error: characterError,\n  } = await admin\n    .from("characters")\n    .select(\n      "id, user_id",\n    )\n    .eq(\n      "id",\n      characterId,\n    )\n    .maybeSingle();\n\n  if (\n    characterError ||\n    !character\n  ) {\n    return NextResponse.json(\n      {\n        error:\n          "Character not found.",\n      },\n      {\n        status: 404,\n      },\n    );\n  }\n\n  const ownsCharacter =\n    character.user_id ===\n    user.id;\n\n  if (\n    !ownsCharacter &&\n    staffSession === null\n  ) {\n    return NextResponse.json(\n      {\n        error:\n          "Not authorised.",\n      },\n      {\n        status: 403,\n      },\n    );\n  }\n\n  let query = admin\n    .from(\n      "character_audit_log",\n    )\n    .select(`\n      id,\n      event_type,\n      entity_type,\n      entity_id,\n      operation,\n      actor_user_id,\n      actor_type,\n      actor_staff_role,\n      actor_label,\n      source,\n      changed_fields,\n      old_values,\n      new_values,\n      metadata,\n      created_at\n    `)\n    .order(\n      "created_at",\n      {\n        ascending: false,\n      },\n    )\n    .limit(500);\n\n  if (character.user_id) {\n    query = query.or(\n      [\n        `character_id.eq.${characterId}`,\n        `and(event_type.eq.account_registered,actor_user_id.eq.${character.user_id})`,\n      ].join(","),\n    );\n  } else {\n    query = query.eq(\n      "character_id",\n      characterId,\n    );\n  }\n\n  const {\n    data,\n    error,\n  } = await query;\n\n  if (error) {\n    return NextResponse.json(\n      {\n        error:\n          error.message,\n      },\n      {\n        status: 500,\n      },\n    );\n  }\n\n  const rows =\n    ((data ?? []) as AuditRow[])\n      .filter((row) => {\n        const visible =\n          cleanFields(\n            row.changed_fields ??\n              [],\n            staffView,\n          );\n\n        if (\n          row.operation !==\n            "update"\n        ) {\n          return true;\n        }\n\n        if (\n          (row.changed_fields ??\n            []).length === 0\n        ) {\n          return true;\n        }\n\n        return (\n          visible.length > 0\n        );\n      })\n      .map((row) => ({\n        id: row.id,\n        event_type:\n          row.event_type,\n        entity_type:\n          row.entity_type,\n        entity_id:\n          row.entity_id,\n        actor_type:\n          row.actor_type,\n        actor_label:\n          actorLabel(\n            row,\n            staffView,\n            user.id,\n          ),\n        actor_staff_role:\n          staffView\n            ? row.actor_staff_role\n            : null,\n        source:\n          row.source,\n        changed_fields:\n          cleanFields(\n            row.changed_fields ??\n              [],\n            staffView,\n          ),\n        old_values:\n          cleanValues(\n            row.old_values,\n            staffView,\n          ),\n        new_values:\n          cleanValues(\n            row.new_values,\n            staffView,\n          ),\n        metadata:\n          staffView\n            ? row.metadata\n            : null,\n        created_at:\n          row.created_at,\n      }));\n\n  return NextResponse.json({\n    rows,\n  });\n}\n'

def read(rel):
    p = ROOT / rel
    if not p.exists(): raise SystemExit(f'ERROR: missing file: {rel}')
    return p.read_text(encoding='utf-8')

def write(rel, text):
    p = ROOT / rel
    b = p.with_suffix(p.suffix + '.before-performance-patch.bak')
    if not b.exists(): shutil.copy2(p, b)
    p.write_text(text, encoding='utf-8')
    print(f'Updated: {rel}')

def create(rel, text):
    p = ROOT / rel
    if p.exists(): raise SystemExit(f'PRECHECK FAILED: {rel} already exists.')
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text, encoding='utf-8')
    print(f'Created: {rel}')

def replace_once(text, old, new, rel, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'PRECHECK FAILED in {rel}: {label} expected once, found {count}.')
    return text.replace(old, new, 1)

head = subprocess.check_output(['git','rev-parse','HEAD'], cwd=ROOT, text=True).strip()
if head != EXPECTED:
    raise SystemExit(f'PRECHECK FAILED: built for {EXPECTED[:7]}, current HEAD is {head[:7]}.')

# 1. Cache staff lookup within a request.
rel = 'lib/auth/require-staff.ts'
text = read(rel)
text = replace_once(text, 'import { redirect } from "next/navigation";', 'import { cache } from "react";\nimport { redirect } from "next/navigation";', rel, 'cache import')
text = replace_once(text, 'export async function getStaffSession(): Promise<\n  StaffSession | null\n> {\n  const supabase = await createClient();', 'export const getStaffSession = cache(async (): Promise<\n  StaffSession | null\n> => {\n  const supabase = await createClient();', rel, 'cache getStaffSession start')
text = replace_once(text, '  return {\n    userId: user.id,\n    email: user.email ?? null,\n    role: staffMember.role,\n  };\n}\n\nexport async function requireStaff()', '  return {\n    userId: user.id,\n    email: user.email ?? null,\n    role: staffMember.role,\n  };\n});\n\nexport async function requireStaff()', rel, 'cache getStaffSession end')
write(rel, text)

# 2. Parallelised portal context + one direct-message unread RPC.
write('lib/portal/get-portal-context.ts', PORTAL_CONTEXT)

# 3. Parallel forum unread count in layout; remove duplicate auth.getUser.
create('lib/forum/get-unread-forum-count.ts', FORUM_COUNT)
rel = 'app/(portal)/layout.tsx'
text = read(rel)
text = replace_once(text, 'import { createClient } from "@/lib/supabase/server";\n', '', rel, 'remove duplicate layout auth import')
text = replace_once(text, 'import { getActiveTidings } from "@/lib/tidings/get-active-tidings";\n', 'import { getActiveTidings } from "@/lib/tidings/get-active-tidings";\nimport { getUnreadForumCount } from "@/lib/forum/get-unread-forum-count";\n', rel, 'forum helper import')
old = '''  const [
    context,
    worldState,
    initialTidings,
  ] = await Promise.all([
    getPortalContext(),
    getWorldState(),
    getActiveTidings(),
  ]);

  const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  let unreadForumCount = 0;

  if (user) {
    const {
      data: unreadForumResult,
      error: unreadForumError,
    } = await supabase.rpc(
      "get_unread_forum_topic_count",
    );

    if (!unreadForumError) {
      if (
        typeof unreadForumResult ===
          "number" &&
        Number.isFinite(
          unreadForumResult,
        )
      ) {
        unreadForumCount =
          unreadForumResult;
      } else if (
        typeof unreadForumResult ===
        "string"
      ) {
        const parsedCount =
          Number.parseInt(
            unreadForumResult,
            10,
          );

        if (
          Number.isFinite(
            parsedCount,
          )
        ) {
          unreadForumCount =
            parsedCount;
        }
      }
    }
  }'''
new = '''  const [
    context,
    worldState,
    initialTidings,
    unreadForumCount,
  ] = await Promise.all([
    getPortalContext(),
    getWorldState(),
    getActiveTidings(),
    getUnreadForumCount(),
  ]);'''
text = replace_once(text, old, new, rel, 'parallel layout loading')
write(rel, text)

# 4. Character audit loads ONLY after LOG tab is clicked.
write('components/characters/character-audit-trail.tsx', LAZY_AUDIT)
create('app/api/character-audit/route.ts', API_ROUTE)
rel = 'components/characters/character-sheet-tabs.tsx'
text = read(rel)
old_click = '''        onClick={() =>
          setActiveTab(tab.id)
        }'''
new_click = '''        onClick={() => {
          setActiveTab(tab.id);

          window.dispatchEvent(
            new CustomEvent(
              "sepulchria-character-sheet-tab",
              {
                detail: tab.id,
              },
            ),
          );
        }}'''
text = replace_once(text, old_click, new_click, rel, 'lazy Character LOG tab event')
write(rel, text)

print('')
print('Portal performance patch applied.')
print('NEXT:')
print('  1. Run PORTAL_PERFORMANCE.sql in Supabase SQL Editor.')
print('  2. Run npm run build')
print('  3. Test portal navigation, unread badges, private locations, HQ access and Character LOG.')
