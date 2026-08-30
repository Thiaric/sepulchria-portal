import Link from "next/link";

import { CharacterAuditEntry } from "@/components/characters/character-audit-entry";
import {
  auditChangeRows,
  auditSummary,
  formatAuditDateTime,
  humanAuditLabel,
} from "@/lib/audit/character-audit-display";
import {
  enrichCharacterAuditItemNames,
} from "@/lib/audit/enrich-character-audit-items";

import {
  requireAdminSection,
} from "@/lib/auth/require-staff";
import {
  createAdminClient,
} from "@/lib/supabase/admin";

type SearchParams = {
  q?: string;
  character?: string;
  event?: string;
  actor?: string;
  source?: string;
  from?: string;
  to?: string;
};

type AuditRow = {
  id: string;
  character_id: string | null;
  character_name_snapshot: string | null;
  event_type: string;
  entity_type: string;
  entity_id: string | null;
  operation: string;
  actor_user_id: string | null;
  actor_type: "player" | "staff" | "system";
  actor_staff_role: string | null;
  actor_label: string | null;
  source: string;
  changed_fields: string[];
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  created_at: string;
  item_name?: string | null;
};

type CharacterOption = {
  id: string;
  display_name: string | null;
  first_name: string;
  surname: string | null;
};

const input =
  "h-9 min-w-0 border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 text-[9px] text-[rgb(var(--sep-colour-d7c4a5))] outline-none placeholder:text-[rgb(var(--sep-colour-625747))] focus:border-[rgb(var(--sep-colour-9b7446))]";

function characterName(character: CharacterOption) {
  return (
    character.display_name?.trim() ||
    [character.first_name, character.surname]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    "Unnamed character"
  );
}

function startOfDay(value: string | undefined) {
  return value
    ? `${value}T00:00:00.000Z`
    : null;
}

function endOfDay(value: string | undefined) {
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

export default async function CharacterAuditPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  await requireAdminSection("character_logs");

  const params = (await searchParams) ?? {};
  const admin = createAdminClient();

  const { data: characters, error: characterError } =
    await admin
      .from("characters")
      .select("id, display_name, first_name, surname")
      .eq("is_system", false)
      .order("display_name", { ascending: true });

  if (characterError) {
    throw new Error(
      `Unable to prepare Character Audit filters: ${characterError.message}`,
    );
  }

  let query = admin
    .from("character_audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);

  if (params.character) {
    query = query.eq("character_id", params.character);
  }

  if (params.event?.trim()) {
    query = query.ilike(
      "event_type",
      `%${params.event.trim()}%`,
    );
  }

  if (
    params.actor === "player" ||
    params.actor === "staff" ||
    params.actor === "system"
  ) {
    query = query.eq("actor_type", params.actor);
  }

  if (params.source?.trim()) {
    query = query.ilike(
      "source",
      `%${params.source.trim()}%`,
    );
  }

  const from = startOfDay(params.from);
  const to = endOfDay(params.to);

  if (from) {
    query = query.gte("created_at", from);
  }

  if (to) {
    query = query.lte("created_at", to);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(
      `Unable to load Character Audit Log: ${error.message}`,
    );
  }

  const allRows =
    (data ?? []) as AuditRow[];

  const rawRows =
    allRows
      .filter(
        (row) =>
          !isExpertiseOnlyUpdate(
            row,
          ),
      )
      .map(
        scrubExpertise,
      );

  const enrichedRows =
    await enrichCharacterAuditItemNames(
      rawRows,
    );

  const needle = params.q?.trim().toLowerCase() ?? "";

  const rows = needle
    ? enrichedRows.filter((row) =>
        [
          row.character_name_snapshot,
          row.event_type,
          row.entity_type,
          row.entity_id,
          row.actor_label,
          row.actor_staff_role,
          row.source,
          row.item_name,
          ...(row.changed_fields ?? []),
          JSON.stringify(row.old_values ?? {}),
          JSON.stringify(row.new_values ?? {}),
          JSON.stringify(row.metadata ?? {}),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(needle),
      )
    : enrichedRows;

  return (
    <main className="p-5 sm:p-7 lg:p-9">
      <div className="mx-auto max-w-[1500px]">
        <div>
          <p className="text-[9px] uppercase tracking-[0.28em] text-[rgb(var(--sep-colour-8c704b))]">
            Administration · Audit
          </p>

          <h1 className="mt-2 font-serif text-4xl text-[rgb(var(--sep-colour-ead5ac))]">
            Character Audit Log
          </h1>

          <p className="mt-3 max-w-4xl text-sm leading-7 text-[rgb(var(--sep-colour-9c8d79))]">
            Append-only history of account registration and material Character changes,
            including profile edits, approval state, Ancestry, Orders, Feats, Shapes,
            inventory, economy and other tracked Character state.
          </p>
        </div>

        <form
          method="get"
          className="mt-6 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-4"
        >
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            <input
              type="search"
              name="q"
              defaultValue={params.q ?? ""}
              placeholder="Search values, actor, event..."
              className={input}
            />

            <select
              name="character"
              defaultValue={params.character ?? ""}
              className={input}
            >
              <option value="">All Characters</option>
              {(characters ?? []).map((character) => (
                <option key={character.id} value={character.id}>
                  {characterName(character as CharacterOption)}
                </option>
              ))}
            </select>

            <input
              name="event"
              defaultValue={params.event ?? ""}
              placeholder="Event type..."
              className={input}
            />

            <select
              name="actor"
              defaultValue={params.actor ?? ""}
              className={input}
            >
              <option value="">All actors</option>
              <option value="player">Player</option>
              <option value="staff">Staff</option>
              <option value="system">System</option>
            </select>

            <input
              name="source"
              defaultValue={params.source ?? ""}
              placeholder="Source..."
              className={input}
            />

            <input
              type="date"
              name="from"
              defaultValue={params.from ?? ""}
              title="From date"
              className={input}
            />

            <input
              type="date"
              name="to"
              defaultValue={params.to ?? ""}
              title="To date"
              className={input}
            />

            <div className="flex gap-2">
              <button
                type="submit"
                className="h-9 flex-1 border border-[rgb(var(--sep-colour-80613b))] bg-[rgb(var(--sep-colour-261b12))] px-3 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-d5b785))]"
              >
                Apply Filters
              </button>

              <Link
                href="/admin/character-audit"
                className="inline-flex h-9 items-center border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-18110d))] px-3 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-ae9a7b))]"
              >
                Reset
              </Link>
            </div>
          </div>

          <p className="mt-3 text-right text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-716654))]">
            Newest first · maximum 500 database results
          </p>
        </form>

        <div className="mt-5 space-y-3">
          {rows.length === 0 ? (
            <div className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-6 text-sm text-[rgb(var(--sep-colour-8f8271))]">
              No audit records match these filters.
            </div>
          ) : (
            rows.map((row) => {
              const summary = auditSummary(row);
              const changes = auditChangeRows(row);
              const characterLabel =
                row.character_name_snapshot ?? "Account / unlinked event";
              const actorLabel = row.actor_label ?? row.actor_type;
              const dateLabel = formatAuditDateTime(row.created_at);

              return (
                <div
                  key={row.id}
                  id={`character-audit-${row.id}`}
                  data-character-audit-id={row.id}
                  data-character-audit-character={characterLabel}
                  data-character-audit-event={humanAuditLabel(row.event_type)}
                  data-character-audit-actor={actorLabel}
                  data-character-audit-source={row.source}
                  data-character-audit-date={dateLabel}
                  data-character-audit-summary={summary}
                  className="scroll-mt-6"
                >
                  <CharacterAuditEntry
                    row={row}
                    characterLabel={characterLabel}
                  />
                </div>
              );
            })
          )}
        </div>
      </div>
    </main>
  );
}
