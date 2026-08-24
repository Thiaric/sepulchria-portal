from pathlib import Path
import shutil
import subprocess

ROOT = Path.cwd()
EXPECTED = "2321288071dd371b8aeb0aaf11e9ce2ac0f55d75"
CLIENT = '"use client";\n\nimport {\n  useMemo,\n  useState,\n} from "react";\n\nexport type CharacterAuditDisplayRow = {\n  id: string;\n  event_type: string;\n  entity_type: string;\n  entity_id: string | null;\n  actor_type: "player" | "staff" | "system";\n  actor_label: string;\n  actor_staff_role: string | null;\n  source: string;\n  changed_fields: string[];\n  old_values: Record<string, unknown> | null;\n  new_values: Record<string, unknown> | null;\n  metadata: Record<string, unknown> | null;\n  created_at: string;\n};\n\nconst controlClass =\n  "h-9 min-w-0 border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 text-[9px] text-[rgb(var(--sep-colour-d7c4a5))] outline-none placeholder:text-[rgb(var(--sep-colour-625747))] focus:border-[rgb(var(--sep-colour-9b7446))]";\n\nfunction formatDateTime(value: string) {\n  const date = new Date(value);\n\n  if (Number.isNaN(date.getTime())) {\n    return value;\n  }\n\n  return new Intl.DateTimeFormat(\n    "en-GB",\n    {\n      dateStyle: "medium",\n      timeStyle: "short",\n    },\n  ).format(date);\n}\n\nfunction eventLabel(value: string) {\n  return value\n    .replaceAll("_", " ")\n    .replace(/\\b\\w/g, (letter) =>\n      letter.toUpperCase(),\n    );\n}\n\nfunction pretty(value: unknown) {\n  if (\n    value === null ||\n    value === undefined\n  ) {\n    return "—";\n  }\n\n  if (typeof value === "string") {\n    return value;\n  }\n\n  return JSON.stringify(\n    value,\n    null,\n    2,\n  );\n}\n\nfunction dayValue(value: string) {\n  const date = new Date(value);\n\n  if (Number.isNaN(date.getTime())) {\n    return "";\n  }\n\n  return date\n    .toISOString()\n    .slice(0, 10);\n}\n\nexport function CharacterAuditTrailClient({\n  rows,\n  staffView,\n}: {\n  rows: CharacterAuditDisplayRow[];\n  staffView: boolean;\n}) {\n  const [search, setSearch] =\n    useState("");\n  const [eventType, setEventType] =\n    useState("");\n  const [actorType, setActorType] =\n    useState("");\n  const [source, setSource] =\n    useState("");\n  const [fromDate, setFromDate] =\n    useState("");\n  const [toDate, setToDate] =\n    useState("");\n\n  const eventOptions =\n    useMemo(\n      () =>\n        Array.from(\n          new Set(\n            rows.map(\n              (row) =>\n                row.event_type,\n            ),\n          ),\n        ).sort(),\n      [rows],\n    );\n\n  const sourceOptions =\n    useMemo(\n      () =>\n        Array.from(\n          new Set(\n            rows\n              .map(\n                (row) =>\n                  row.source,\n              )\n              .filter(Boolean),\n          ),\n        ).sort(),\n      [rows],\n    );\n\n  const filteredRows =\n    useMemo(() => {\n      const needle =\n        search\n          .trim()\n          .toLowerCase();\n\n      return rows.filter(\n        (row) => {\n          if (\n            eventType &&\n            row.event_type !==\n              eventType\n          ) {\n            return false;\n          }\n\n          if (\n            actorType &&\n            row.actor_type !==\n              actorType\n          ) {\n            return false;\n          }\n\n          if (\n            source &&\n            row.source !== source\n          ) {\n            return false;\n          }\n\n          const rowDay =\n            dayValue(\n              row.created_at,\n            );\n\n          if (\n            fromDate &&\n            rowDay < fromDate\n          ) {\n            return false;\n          }\n\n          if (\n            toDate &&\n            rowDay > toDate\n          ) {\n            return false;\n          }\n\n          if (!needle) {\n            return true;\n          }\n\n          const haystack = [\n            row.event_type,\n            row.entity_type,\n            row.entity_id,\n            row.actor_label,\n            row.actor_staff_role,\n            row.source,\n            ...(row.changed_fields ??\n              []),\n            JSON.stringify(\n              row.old_values ?? {},\n            ),\n            JSON.stringify(\n              row.new_values ?? {},\n            ),\n            staffView\n              ? JSON.stringify(\n                  row.metadata ?? {},\n                )\n              : "",\n          ]\n            .filter(Boolean)\n            .join(" ")\n            .toLowerCase();\n\n          return haystack.includes(\n            needle,\n          );\n        },\n      );\n    }, [\n      rows,\n      search,\n      eventType,\n      actorType,\n      source,\n      fromDate,\n      toDate,\n      staffView,\n    ]);\n\n  const hasFilters =\n    Boolean(\n      search ||\n        eventType ||\n        actorType ||\n        source ||\n        fromDate ||\n        toDate,\n    );\n\n  function resetFilters() {\n    setSearch("");\n    setEventType("");\n    setActorType("");\n    setSource("");\n    setFromDate("");\n    setToDate("");\n  }\n\n  return (\n    <>\n      <div className="mt-4 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-3">\n        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">\n          <input\n            type="search"\n            value={search}\n            onChange={(event) =>\n              setSearch(\n                event.target.value,\n              )\n            }\n            placeholder="Search Character Log..."\n            className={controlClass}\n          />\n\n          <select\n            value={eventType}\n            onChange={(event) =>\n              setEventType(\n                event.target.value,\n              )\n            }\n            className={controlClass}\n          >\n            <option value="">\n              All events\n            </option>\n\n            {eventOptions.map(\n              (value) => (\n                <option\n                  key={value}\n                  value={value}\n                >\n                  {eventLabel(\n                    value,\n                  )}\n                </option>\n              ),\n            )}\n          </select>\n\n          <select\n            value={actorType}\n            onChange={(event) =>\n              setActorType(\n                event.target.value,\n              )\n            }\n            className={controlClass}\n          >\n            <option value="">\n              All actors\n            </option>\n            <option value="player">\n              Player\n            </option>\n            <option value="staff">\n              Staff\n            </option>\n            <option value="system">\n              System\n            </option>\n          </select>\n\n          <select\n            value={source}\n            onChange={(event) =>\n              setSource(\n                event.target.value,\n              )\n            }\n            className={controlClass}\n          >\n            <option value="">\n              All sources\n            </option>\n\n            {sourceOptions.map(\n              (value) => (\n                <option\n                  key={value}\n                  value={value}\n                >\n                  {eventLabel(\n                    value,\n                  )}\n                </option>\n              ),\n            )}\n          </select>\n\n          <div className="grid grid-cols-2 gap-2">\n            <input\n              type="date"\n              value={fromDate}\n              onChange={(event) =>\n                setFromDate(\n                  event.target.value,\n                )\n              }\n              title="From date"\n              className={controlClass}\n            />\n\n            <input\n              type="date"\n              value={toDate}\n              onChange={(event) =>\n                setToDate(\n                  event.target.value,\n                )\n              }\n              title="To date"\n              className={controlClass}\n            />\n          </div>\n\n          <div className="flex items-center justify-between gap-2">\n            <p className="text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-716654))]">\n              {filteredRows.length}\n              {" / "}\n              {rows.length}\n              {" entries"}\n            </p>\n\n            <button\n              type="button"\n              onClick={\n                resetFilters\n              }\n              disabled={!hasFilters}\n              className="h-9 border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-18110d))] px-3 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-ae9a7b))] disabled:cursor-not-allowed disabled:opacity-40"\n            >\n              Reset\n            </button>\n          </div>\n        </div>\n\n        <p className="mt-2 text-[8px] text-[rgb(var(--sep-colour-756958))]">\n          Filters update immediately. No reload required.\n        </p>\n      </div>\n\n      {filteredRows.length === 0 ? (\n        <p className="py-6 text-sm text-[rgb(var(--sep-colour-8f8271))]">\n          No Character Log entries match these filters.\n        </p>\n      ) : (\n        <div className="mt-4 space-y-3">\n          {filteredRows.map(\n            (row) => (\n              <article\n                key={row.id}\n                className="border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-100c09))]"\n              >\n                <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">\n                  <div className="min-w-0">\n                    <p className="text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-a17f52))]">\n                      {eventLabel(\n                        row.event_type,\n                      )}\n                    </p>\n\n                    <p className="mt-1 text-[10px] text-[rgb(var(--sep-colour-b8a488))]">\n                      {\n                        row.actor_label\n                      }\n                    </p>\n\n                    {staffView ? (\n                      <p className="mt-1 break-words text-[8px] text-[rgb(var(--sep-colour-706658))]">\n                        {\n                          row.entity_type\n                        }\n                        {row.entity_id\n                          ? ` · ${row.entity_id}`\n                          : ""}\n                        {row.source\n                          ? ` · ${row.source}`\n                          : ""}\n                      </p>\n                    ) : null}\n                  </div>\n\n                  <time\n                    dateTime={\n                      row.created_at\n                    }\n                    className="text-right text-[9px] text-[rgb(var(--sep-colour-8c7c67))]"\n                  >\n                    {formatDateTime(\n                      row.created_at,\n                    )}\n                  </time>\n                </div>\n\n                {row\n                  .changed_fields\n                  .length ? (\n                  <div className="border-t border-[rgb(var(--sep-colour-59432c))]/30 px-4 py-2">\n                    <p className="text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-756958))]">\n                      Changed\n                    </p>\n\n                    <p className="mt-1 break-words text-[9px] text-[rgb(var(--sep-colour-ae9d83))]">\n                      {row.changed_fields.join(\n                        ", ",\n                      )}\n                    </p>\n                  </div>\n                ) : null}\n\n                {row.old_values !==\n                  null ||\n                row.new_values !==\n                  null ? (\n                  <details className="border-t border-[rgb(var(--sep-colour-59432c))]/30">\n                    <summary className="cursor-pointer px-4 py-2 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-a98d65))]">\n                      Before / after\n                    </summary>\n\n                    <div className="grid gap-3 border-t border-[rgb(var(--sep-colour-59432c))]/25 p-4 lg:grid-cols-2">\n                      <div>\n                        <p className="text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-756958))]">\n                          Before\n                        </p>\n\n                        <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-words text-[9px] leading-5 text-[rgb(var(--sep-colour-9f8d73))]">\n                          {pretty(\n                            row.old_values,\n                          )}\n                        </pre>\n                      </div>\n\n                      <div>\n                        <p className="text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-756958))]">\n                          After\n                        </p>\n\n                        <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-words text-[9px] leading-5 text-[rgb(var(--sep-colour-9f8d73))]">\n                          {pretty(\n                            row.new_values,\n                          )}\n                        </pre>\n                      </div>\n                    </div>\n\n                    {staffView &&\n                    row.metadata &&\n                    Object.keys(\n                      row.metadata,\n                    ).length ? (\n                      <div className="border-t border-[rgb(var(--sep-colour-59432c))]/25 p-4">\n                        <p className="text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-756958))]">\n                          Metadata\n                        </p>\n\n                        <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words text-[9px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">\n                          {pretty(\n                            row.metadata,\n                          )}\n                        </pre>\n                      </div>\n                    ) : null}\n                  </details>\n                ) : null}\n              </article>\n            ),\n          )}\n        </div>\n      )}\n    </>\n  );\n}\n'
SERVER = 'import "server-only";\n\nimport {\n  CharacterAuditTrailClient,\n  type CharacterAuditDisplayRow,\n} from "@/components/characters/character-audit-trail-client";\nimport {\n  getStaffSession,\n} from "@/lib/auth/require-staff";\nimport {\n  createAdminClient,\n} from "@/lib/supabase/admin";\nimport {\n  createClient,\n} from "@/lib/supabase/server";\n\ntype AuditRow = {\n  id: string;\n  character_id: string | null;\n  character_name_snapshot: string | null;\n  event_type: string;\n  entity_type: string;\n  entity_id: string | null;\n  operation: string;\n  actor_user_id: string | null;\n  actor_type: "player" | "staff" | "system";\n  actor_staff_role: string | null;\n  actor_label: string | null;\n  source: string;\n  changed_fields: string[];\n  old_values: Record<string, unknown> | null;\n  new_values: Record<string, unknown> | null;\n  metadata: Record<string, unknown>;\n  created_at: string;\n};\n\nconst PLAYER_HIDDEN_KEYS =\n  new Set([\n    "user_id",\n    "actor_user_id",\n    "assigned_by",\n    "approved_by",\n    "reviewed_by",\n    "moderated_by",\n  ]);\n\nfunction eventLabel(value: string) {\n  return value\n    .replaceAll("_", " ")\n    .replace(/\\b\\w/g, (letter) =>\n      letter.toUpperCase(),\n    );\n}\n\nfunction removeExpertise(\n  value:\n    | Record<string, unknown>\n    | null,\n) {\n  if (!value) {\n    return value;\n  }\n\n  const next = {\n    ...value,\n  };\n\n  delete next.expertise;\n\n  return next;\n}\n\nfunction cleanForPlayer(\n  value:\n    | Record<string, unknown>\n    | null,\n) {\n  const withoutExpertise =\n    removeExpertise(value);\n\n  if (!withoutExpertise) {\n    return withoutExpertise;\n  }\n\n  return Object.fromEntries(\n    Object.entries(\n      withoutExpertise,\n    ).filter(\n      ([key]) =>\n        !PLAYER_HIDDEN_KEYS.has(\n          key,\n        ) &&\n        !key.endsWith(\n          "_user_id",\n        ),\n    ),\n  );\n}\n\nfunction visibleFields(\n  fields: string[],\n  staffView: boolean,\n) {\n  return fields.filter(\n    (key) =>\n      key !== "expertise" &&\n      (staffView ||\n        (!PLAYER_HIDDEN_KEYS.has(\n          key,\n        ) &&\n          !key.endsWith(\n            "_user_id",\n          ))),\n  );\n}\n\nfunction isExpertiseOnlyUpdate(\n  row: AuditRow,\n) {\n  return (\n    row.operation === "update" &&\n    row.entity_type ===\n      "characters" &&\n    (row.changed_fields ??\n      []).length > 0 &&\n    (row.changed_fields ??\n      []).every(\n      (field) =>\n        field === "expertise",\n    )\n  );\n}\n\nfunction actorDescription(\n  row: AuditRow,\n  staffView: boolean,\n  viewerUserId: string,\n) {\n  if (\n    row.actor_type === "system"\n  ) {\n    return "System";\n  }\n\n  if (\n    row.actor_type ===\n      "player" &&\n    row.actor_user_id ===\n      viewerUserId\n  ) {\n    return "You";\n  }\n\n  if (\n    row.actor_type ===\n    "player"\n  ) {\n    return staffView\n      ? row.actor_label ??\n          "Player"\n      : "Player";\n  }\n\n  if (staffView) {\n    return (\n      row.actor_label ??\n      (row.actor_staff_role\n        ? `Staff · ${row.actor_staff_role}`\n        : "Staff")\n    );\n  }\n\n  return row.actor_staff_role\n    ? `Staff · ${eventLabel(\n        row.actor_staff_role,\n      )}`\n    : "Staff";\n}\n\nfunction toDisplayRow(\n  row: AuditRow,\n  staffView: boolean,\n  viewerUserId: string,\n): CharacterAuditDisplayRow {\n  return {\n    id: row.id,\n    event_type:\n      row.event_type,\n    entity_type:\n      row.entity_type,\n    entity_id:\n      row.entity_id,\n    actor_type:\n      row.actor_type,\n    actor_label:\n      actorDescription(\n        row,\n        staffView,\n        viewerUserId,\n      ),\n    actor_staff_role:\n      staffView\n        ? row.actor_staff_role\n        : null,\n    source: row.source,\n    changed_fields:\n      visibleFields(\n        row.changed_fields ?? [],\n        staffView,\n      ),\n    old_values: staffView\n      ? removeExpertise(\n          row.old_values,\n        )\n      : cleanForPlayer(\n          row.old_values,\n        ),\n    new_values: staffView\n      ? removeExpertise(\n          row.new_values,\n        )\n      : cleanForPlayer(\n          row.new_values,\n        ),\n    metadata: staffView\n      ? row.metadata\n      : null,\n    created_at:\n      row.created_at,\n  };\n}\n\nexport async function CharacterAuditTrail({\n  characterId,\n  staffView = false,\n}: {\n  characterId: string;\n  staffView?: boolean;\n}) {\n  const supabase =\n    await createClient();\n\n  const {\n    data: { user },\n  } =\n    await supabase.auth.getUser();\n\n  if (!user) {\n    return null;\n  }\n\n  const staffSession =\n    await getStaffSession();\n\n  let authorised =\n    staffSession !== null;\n\n  if (!authorised) {\n    const {\n      data: ownedCharacter,\n      error: ownershipError,\n    } = await supabase\n      .from("characters")\n      .select("id")\n      .eq("id", characterId)\n      .eq("user_id", user.id)\n      .maybeSingle();\n\n    if (ownershipError) {\n      throw new Error(\n        `Unable to verify Character Log access: ${ownershipError.message}`,\n      );\n    }\n\n    authorised =\n      ownedCharacter !== null;\n  }\n\n  if (!authorised) {\n    return null;\n  }\n\n  const admin =\n    createAdminClient();\n\n  const {\n    data: characterRecord,\n    error: characterError,\n  } = await admin\n    .from("characters")\n    .select("id, user_id")\n    .eq("id", characterId)\n    .maybeSingle();\n\n  if (characterError) {\n    throw new Error(\n      `Unable to prepare Character Log: ${characterError.message}`,\n    );\n  }\n\n  if (!characterRecord) {\n    return null;\n  }\n\n  let query = admin\n    .from(\n      "character_audit_log",\n    )\n    .select(`\n      id,\n      character_id,\n      character_name_snapshot,\n      event_type,\n      entity_type,\n      entity_id,\n      operation,\n      actor_user_id,\n      actor_type,\n      actor_staff_role,\n      actor_label,\n      source,\n      changed_fields,\n      old_values,\n      new_values,\n      metadata,\n      created_at\n    `)\n    .order(\n      "created_at",\n      {\n        ascending: false,\n      },\n    )\n    .limit(500);\n\n  if (\n    characterRecord.user_id\n  ) {\n    query = query.or(\n      [\n        `character_id.eq.${characterId}`,\n        `and(event_type.eq.account_registered,actor_user_id.eq.${characterRecord.user_id})`,\n      ].join(","),\n    );\n  } else {\n    query = query.eq(\n      "character_id",\n      characterId,\n    );\n  }\n\n  const {\n    data,\n    error,\n  } = await query;\n\n  if (error) {\n    throw new Error(\n      `Unable to load Character Log: ${error.message}`,\n    );\n  }\n\n  const rows = (\n    (data ?? []) as AuditRow[]\n  )\n    .filter(\n      (row) =>\n        !isExpertiseOnlyUpdate(\n          row,\n        ),\n    )\n    .map((row) =>\n      toDisplayRow(\n        row,\n        staffView,\n        user.id,\n      ),\n    );\n\n  return (\n    <section className="border border-[rgb(var(--sep-colour-6b5032))]/50 bg-[rgb(var(--sep-colour-17110d))] p-4 sm:p-5">\n      <div className="border-b border-[rgb(var(--sep-colour-5d452d))]/35 pb-4">\n        <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-806b50))]">\n          Character history\n        </p>\n\n        <h2 className="mt-1 font-serif text-2xl text-[rgb(var(--sep-colour-dfc79c))]">\n          Character Log\n        </h2>\n\n        <p className="mt-2 text-[10px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">\n          Permanent history of recorded material changes to this Character, newest first.\n        </p>\n      </div>\n\n      <CharacterAuditTrailClient\n        rows={rows}\n        staffView={staffView}\n      />\n    </section>\n  );\n}\n'

def read(rel):
    p = ROOT / rel
    if not p.exists():
        raise SystemExit(f"ERROR: missing file: {rel}")
    return p.read_text(encoding="utf-8")

def write(rel, text):
    p = ROOT / rel
    backup = p.with_suffix(
        p.suffix + ".before-expertise-log-removal.bak"
    )
    if not backup.exists():
        shutil.copy2(p, backup)
    p.write_text(text, encoding="utf-8")
    print(f"Updated: {rel}")

def replace_once(text, old, new, rel, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(
            f"PRECHECK FAILED in {rel}: "
            f"{label} expected once, found {count}."
        )
    return text.replace(old, new, 1)

head = subprocess.check_output(
    ["git", "rev-parse", "HEAD"],
    cwd=ROOT,
    text=True,
).strip()

if head != EXPECTED:
    raise SystemExit(
        "PRECHECK FAILED: this patch was built for "
        f"{EXPECTED[:7]}, current HEAD is {head[:7]}."
    )

# 1. Client-side instant filters for Character sheet logs.
client_rel = (
    "components/characters/"
    "character-audit-trail-client.tsx"
)
client_path = ROOT / client_rel
if client_path.exists():
    raise SystemExit(
        f"PRECHECK FAILED: {client_rel} already exists."
    )
client_path.write_text(
    CLIENT,
    encoding="utf-8",
)
print(f"Created: {client_rel}")

# 2. Replace Character sheet log renderer.
server_rel = (
    "components/characters/"
    "character-audit-trail.tsx"
)
server_path = ROOT / server_rel
if not server_path.exists():
    raise SystemExit(
        f"ERROR: missing file: {server_rel}"
    )
server_backup = server_path.with_suffix(
    server_path.suffix +
    ".before-expertise-log-removal.bak"
)
if not server_backup.exists():
    shutil.copy2(
        server_path,
        server_backup,
    )
server_path.write_text(
    SERVER,
    encoding="utf-8",
)
print(f"Updated: {server_rel}")

# 3. Admin Character Log: suppress historical
# Expertise-only updates and remove Expertise from
# any mixed records.
rel = "app/(portal)/admin/character-audit/page.tsx"
text = read(rel)

helpers_old = """function endOfDay(value: string | undefined) {
  return value
    ? `${value}T23:59:59.999Z`
    : null;
}
"""

helpers_new = """function endOfDay(value: string | undefined) {
  return value
    ? `${value}T23:59:59.999Z`
    : null;
}

function removeExpertise(
  value: Record<string, unknown> | null,
) {
  if (!value) {
    return value;
  }

  const next = { ...value };
  delete next.expertise;
  return next;
}

function isExpertiseOnlyUpdate(
  row: AuditRow,
) {
  return (
    row.operation === "update" &&
    row.entity_type === "characters" &&
    (row.changed_fields ?? []).length > 0 &&
    (row.changed_fields ?? []).every(
      (field) => field === "expertise",
    )
  );
}

function scrubExpertise(
  row: AuditRow,
): AuditRow {
  return {
    ...row,
    changed_fields:
      (row.changed_fields ?? []).filter(
        (field) => field !== "expertise",
      ),
    old_values:
      removeExpertise(row.old_values),
    new_values:
      removeExpertise(row.new_values),
  };
}
"""

text = replace_once(
    text,
    helpers_old,
    helpers_new,
    rel,
    "admin expertise scrub helpers",
)

rows_old = """  const rawRows = (data ?? []) as AuditRow[];
  const needle = params.q?.trim().toLowerCase() ?? "";
"""

rows_new = """  const rawRows = (
    (data ?? []) as AuditRow[]
  )
    .filter(
      (row) =>
        !isExpertiseOnlyUpdate(row),
    )
    .map(scrubExpertise);

  const needle = params.q?.trim().toLowerCase() ?? "";
"""

text = replace_once(
    text,
    rows_old,
    rows_new,
    rel,
    "admin expertise filtering",
)

write(rel, text)

print("")
print("Expertise audit removal + Character sheet realtime filters applied.")
print("NEXT:")
print("  1. Run remove-expertise-from-character-audit.sql in Supabase.")
print("  2. Run npm run build")
