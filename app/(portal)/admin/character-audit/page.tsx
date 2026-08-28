import Link from "next/link";

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
};

type CharacterOption = {
  id: string;
  display_name: string | null;
  first_name: string;
  surname: string | null;
};

const input =
  "h-9 min-w-0 border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 text-[9px] text-[rgb(var(--sep-colour-d7c4a5))] outline-none placeholder:text-[rgb(var(--sep-colour-625747))] focus:border-[rgb(var(--sep-colour-9b7446))]";

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(date);
}

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

function pretty(value: unknown) {
  if (value === null || value === undefined) {
    return "—";
  }

  if (typeof value === "string") {
    return value;
  }

  return JSON.stringify(value, null, 2);
}

const TECHNICAL_AUDIT_FIELDS = new Set([
  "id",
  "user_id",
  "actor_user_id",
  "character_id",
  "created_at",
  "updated_at",
  "source_id",
  "source_type",
  "transaction_type",
]);

function humanAuditLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function auditDisplayValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") {
    return new Intl.NumberFormat("en-GB").format(value);
  }
  if (typeof value === "string") return value.replaceAll("_", " ");
  if (Array.isArray(value)) return value.map(auditDisplayValue).join(", ");
  return JSON.stringify(value);
}

function meaningfulAuditEntries(value: Record<string, unknown> | null) {
  if (!value) return [];

  return Object.entries(value).filter(
    ([key, entryValue]) =>
      !TECHNICAL_AUDIT_FIELDS.has(key) &&
      entryValue !== null &&
      entryValue !== undefined &&
      entryValue !== "",
  );
}

function auditSummary(row: AuditRow) {
  const before = row.old_values ?? {};
  const after = row.new_values ?? {};

  if (
    row.entity_type === "remnant_ledger" ||
    ("amount" in after && "balance_after" in after)
  ) {
    const amount = Number(after.amount ?? 0);
    const reason = String(after.reason ?? "Remnant movement");
    const balance = Number(after.balance_after ?? 0);

    const movement =
      amount < 0
        ? `${Math.abs(amount)} Remnants spent`
        : amount > 0
          ? `${amount} Remnants received`
          : "Remnant balance recorded";

    return `${movement} · ${reason} · Balance after: ${new Intl.NumberFormat(
      "en-GB",
    ).format(balance)} R`;
  }

  if (row.operation === "update" && row.changed_fields?.length) {
    const fields = row.changed_fields
      .filter((field) => field !== "updated_at")
      .slice(0, 4)
      .map(
        (field) =>
          `${humanAuditLabel(field)}: ${auditDisplayValue(
            before[field],
          )} → ${auditDisplayValue(after[field])}`,
      );

    if (fields.length) return fields.join(" · ");
  }

  const source = row.operation === "delete" ? before : after;
  const entries = meaningfulAuditEntries(source).slice(0, 4);

  if (entries.length) {
    return entries
      .map(
        ([key, value]) =>
          `${humanAuditLabel(key)}: ${auditDisplayValue(value)}`,
      )
      .join(" · ");
  }

  return humanAuditLabel(row.event_type);
}

function auditChangeRows(row: AuditRow) {
  const before = row.old_values ?? {};
  const after = row.new_values ?? {};

  if (row.operation === "update") {
    return (row.changed_fields ?? [])
      .filter((field) => field !== "updated_at")
      .map((field) => ({
        field,
        before: before[field],
        after: after[field],
      }));
  }

  const source = row.operation === "delete" ? before : after;

  return meaningfulAuditEntries(source).map(([field, value]) => ({
    field,
    before: row.operation === "delete" ? value : null,
    after: row.operation === "delete" ? null : value,
  }));
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

function isOddJobsDirectRow(
  row: AuditRow,
) {
  const source =
    row.source?.toLowerCase() ??
    "";

  const entityType =
    row.entity_type
      ?.toLowerCase() ?? "";

  const changed =
    row.changed_fields ?? [];

  const values = [
    row.old_values,
    row.new_values,
    row.metadata,
  ].filter(
    (
      value,
    ): value is
      Record<string, unknown> =>
      Boolean(value),
  );

  const hasOddJobValue =
    values.some((value) => {
      const sourceType =
        String(
          value.source_type ??
            "",
        ).toLowerCase();

      const reason =
        String(
          value.reason ?? "",
        ).toLowerCase();

      return (
        sourceType ===
          "odd_job" ||
        reason.includes(
          "odd jobs bureau",
        )
      );
    });

  const looksLikeJobClaim =
    changed.includes(
      "job_id",
    ) &&
    changed.includes(
      "work_date",
    ) &&
    changed.includes(
      "worked_at",
    );

  return (
    source.includes(
      "odd_job",
    ) ||
    source.includes(
      "odd jobs",
    ) ||
    entityType.includes(
      "odd_job",
    ) ||
    hasOddJobValue ||
    looksLikeJobClaim
  );
}

function isNearbyOddJobCurrencyRow(
  row: AuditRow,
  markers:
    Array<{
      characterId:
        string | null;
      createdAt: number;
    }>,
) {
  if (
    row.event_type !==
      "currency_changed" ||
    !(row.changed_fields ??
      []).includes(
        "balance",
      )
  ) {
    return false;
  }

  const rowTime =
    new Date(
      row.created_at,
    ).getTime();

  if (
    !Number.isFinite(rowTime)
  ) {
    return false;
  }

  return markers.some(
    (marker) =>
      marker.characterId ===
        row.character_id &&
      Math.abs(
        marker.createdAt -
          rowTime,
      ) <= 5000,
  );
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

  const oddJobMarkers =
    allRows
      .filter(
        isOddJobsDirectRow,
      )
      .map((row) => ({
        characterId:
          row.character_id,
        createdAt:
          new Date(
            row.created_at,
          ).getTime(),
      }))
      .filter(
        (marker) =>
          Number.isFinite(
            marker.createdAt,
          ),
      );

  const rawRows =
    allRows
      .filter(
        (row) =>
          !isOddJobsDirectRow(
            row,
          ) &&
          !isNearbyOddJobCurrencyRow(
            row,
            oddJobMarkers,
          ),
      )
      .filter(
        (row) =>
          !isExpertiseOnlyUpdate(
            row,
          ),
      )
      .map(
        scrubExpertise,
      );

  const needle = params.q?.trim().toLowerCase() ?? "";

  const rows = needle
    ? rawRows.filter((row) =>
        [
          row.character_name_snapshot,
          row.event_type,
          row.entity_type,
          row.entity_id,
          row.actor_label,
          row.actor_staff_role,
          row.source,
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
    : rawRows;

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
              const dateLabel = formatDateTime(row.created_at);

              return (
                <article
                  key={row.id}
                  id={`character-audit-${row.id}`}
                  data-character-audit-id={row.id}
                  data-character-audit-character={characterLabel}
                  data-character-audit-event={humanAuditLabel(row.event_type)}
                  data-character-audit-actor={actorLabel}
                  data-character-audit-source={row.source}
                  data-character-audit-date={dateLabel}
                  data-character-audit-summary={summary}
                  className="scroll-mt-6 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-96774f))]">
                        {humanAuditLabel(row.event_type)}
                      </p>
                      <h2 className="mt-1 font-serif text-2xl text-[rgb(var(--sep-colour-d8bf91))]">
                        {characterLabel}
                      </h2>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="text-[9px] text-[rgb(var(--sep-colour-b49d7b))]">
                        {dateLabel}
                      </p>
                      <p className="mt-1 text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-756958))]">
                        {humanAuditLabel(row.operation)} ·{" "}
                        {humanAuditLabel(row.entity_type)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 border-l-2 border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-100c09))] px-4 py-3">
                    <p className="text-[7px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-806b50))]">
                      What happened
                    </p>
                    <p className="mt-1.5 text-[11px] leading-5 text-[rgb(var(--sep-colour-d4bea0))]">
                      {summary}
                    </p>
                  </div>

                  {changes.length ? (
                    <div className="mt-3 overflow-hidden border border-[rgb(var(--sep-colour-59432c))]/35">
                      <div className="grid grid-cols-[minmax(140px,0.65fr)_minmax(0,1fr)_24px_minmax(0,1fr)] gap-2 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-756958))]">
                        <span>Field</span>
                        <span>Before</span>
                        <span />
                        <span>After</span>
                      </div>

                      <div className="divide-y divide-[rgb(var(--sep-colour-59432c))]/25">
                        {changes.map((change) => (
                          <div
                            key={change.field}
                            className="grid grid-cols-[minmax(140px,0.65fr)_minmax(0,1fr)_24px_minmax(0,1fr)] gap-2 px-3 py-2.5 text-[9px]"
                          >
                            <span className="font-medium text-[rgb(var(--sep-colour-bfa77f))]">
                              {humanAuditLabel(change.field)}
                            </span>
                            <span className="break-words text-[rgb(var(--sep-colour-8f8271))]">
                              {auditDisplayValue(change.before)}
                            </span>
                            <span className="text-center text-[rgb(var(--sep-colour-6f6252))]">
                              →
                            </span>
                            <span className="break-words text-[rgb(var(--sep-colour-cdb58d))]">
                              {auditDisplayValue(change.after)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    <div className="border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-100c09))] p-3">
                      <p className="text-[7px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-756958))]">
                        Actor
                      </p>
                      <p className="mt-1 text-[10px] text-[rgb(var(--sep-colour-b8a488))]">
                        {actorLabel}
                      </p>
                    </div>

                    <div className="border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-100c09))] p-3">
                      <p className="text-[7px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-756958))]">
                        Source
                      </p>
                      <p className="mt-1 text-[10px] text-[rgb(var(--sep-colour-b8a488))]">
                        {humanAuditLabel(row.source)}
                      </p>
                    </div>

                    <div className="border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-100c09))] p-3">
                      <p className="text-[7px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-756958))]">
                        Record type
                      </p>
                      <p className="mt-1 text-[10px] text-[rgb(var(--sep-colour-b8a488))]">
                        {humanAuditLabel(row.entity_type)}
                      </p>
                    </div>
                  </div>

                  <details className="mt-3 border border-[rgb(var(--sep-colour-59432c))]/30 bg-[rgb(var(--sep-colour-100c09))]">
                    <summary className="cursor-pointer px-3 py-2 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-a98d65))]">
                      Technical details
                    </summary>

                    <div className="border-t border-[rgb(var(--sep-colour-59432c))]/25 p-3">
                      <div className="grid gap-2 text-[8px] sm:grid-cols-2">
                        <p>Audit ID: {row.id}</p>
                        <p>Entity ID: {row.entity_id ?? "—"}</p>
                      </div>

                      <div className="mt-3 grid gap-3 lg:grid-cols-2">
                        <div>
                          <p className="text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-756958))]">
                            Raw before
                          </p>
                          <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words text-[8px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">
                            {pretty(row.old_values)}
                          </pre>
                        </div>

                        <div>
                          <p className="text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-756958))]">
                            Raw after
                          </p>
                          <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words text-[8px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">
                            {pretty(row.new_values)}
                          </pre>
                        </div>
                      </div>

                      {Object.keys(row.metadata ?? {}).length ? (
                        <div className="mt-3 border-t border-[rgb(var(--sep-colour-59432c))]/25 pt-3">
                          <p className="text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-756958))]">
                            Raw metadata
                          </p>
                          <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words text-[8px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">
                            {pretty(row.metadata)}
                          </pre>
                        </div>
                      ) : null}
                    </div>
                  </details>
                </article>
              );
            })
          )}
        </div>
      </div>
    </main>
  );
}
