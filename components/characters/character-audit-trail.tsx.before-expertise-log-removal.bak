import "server-only";

import {
  getStaffSession,
} from "@/lib/auth/require-staff";
import {
  createAdminClient,
} from "@/lib/supabase/admin";
import {
  createClient,
} from "@/lib/supabase/server";

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

const PLAYER_HIDDEN_KEYS = new Set([
  "user_id",
  "actor_user_id",
  "assigned_by",
  "approved_by",
  "reviewed_by",
  "moderated_by",
]);

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function eventLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function cleanForPlayer(
  value: Record<string, unknown> | null,
) {
  if (!value) return value;

  return Object.fromEntries(
    Object.entries(value).filter(
      ([key]) =>
        !PLAYER_HIDDEN_KEYS.has(key) &&
        !key.endsWith("_user_id"),
    ),
  );
}

function changedFieldsForViewer(
  fields: string[],
  staffView: boolean,
) {
  if (staffView) return fields;

  return fields.filter(
    (key) =>
      !PLAYER_HIDDEN_KEYS.has(key) &&
      !key.endsWith("_user_id"),
  );
}

function pretty(value: unknown) {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
}

function actorDescription(
  row: AuditRow,
  staffView: boolean,
  viewerUserId: string,
) {
  if (row.actor_type === "system") return "System";

  if (
    row.actor_type === "player" &&
    row.actor_user_id === viewerUserId
  ) {
    return "You";
  }

  if (row.actor_type === "player") {
    return staffView
      ? row.actor_label ?? "Player"
      : "Player";
  }

  if (staffView) {
    return (
      row.actor_label ??
      (row.actor_staff_role
        ? `Staff · ${row.actor_staff_role}`
        : "Staff")
    );
  }

  return row.actor_staff_role
    ? `Staff · ${eventLabel(row.actor_staff_role)}`
    : "Staff";
}

export async function CharacterAuditTrail({
  characterId,
  staffView = false,
}: {
  characterId: string;
  staffView?: boolean;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const staffSession = await getStaffSession();
  let authorised = staffSession !== null;

  if (!authorised) {
    const {
      data: ownedCharacter,
      error: ownershipError,
    } = await supabase
      .from("characters")
      .select("id")
      .eq("id", characterId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (ownershipError) {
      throw new Error(
        `Unable to verify Character Log access: ${ownershipError.message}`,
      );
    }

    authorised = ownedCharacter !== null;
  }

  if (!authorised) return null;

  const admin = createAdminClient();

  const {
    data: characterRecord,
    error: characterError,
  } = await admin
    .from("characters")
    .select("id, user_id")
    .eq("id", characterId)
    .maybeSingle();

  if (characterError) {
    throw new Error(
      `Unable to prepare Character Log: ${characterError.message}`,
    );
  }

  if (!characterRecord) return null;

  let query = admin
    .from("character_audit_log")
    .select(`
      id,
      character_id,
      character_name_snapshot,
      event_type,
      entity_type,
      entity_id,
      operation,
      actor_user_id,
      actor_type,
      actor_staff_role,
      actor_label,
      source,
      changed_fields,
      old_values,
      new_values,
      metadata,
      created_at
    `)
    .order("created_at", { ascending: false })
    .limit(500);

  if (characterRecord.user_id) {
    query = query.or(
      [
        `character_id.eq.${characterId}`,
        `and(event_type.eq.account_registered,actor_user_id.eq.${characterRecord.user_id})`,
      ].join(","),
    );
  } else {
    query = query.eq("character_id", characterId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(
      `Unable to load Character Log: ${error.message}`,
    );
  }

  const rows = (data ?? []) as AuditRow[];

  return (
    <section className="border border-[rgb(var(--sep-colour-6b5032))]/50 bg-[rgb(var(--sep-colour-17110d))] p-4 sm:p-5">
      <div className="border-b border-[rgb(var(--sep-colour-5d452d))]/35 pb-4">
        <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-806b50))]">
          Character history
        </p>
        <h2 className="mt-1 font-serif text-2xl text-[rgb(var(--sep-colour-dfc79c))]">
          Character Log
        </h2>
        <p className="mt-2 text-[10px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">
          Permanent history of recorded changes to this Character, newest first.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="py-6 text-sm text-[rgb(var(--sep-colour-8f8271))]">
          No Character Log entries have been recorded yet.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {rows.map((row) => {
            const visibleFields =
              changedFieldsForViewer(
                row.changed_fields ?? [],
                staffView,
              );

            const before = staffView
              ? row.old_values
              : cleanForPlayer(row.old_values);

            const after = staffView
              ? row.new_values
              : cleanForPlayer(row.new_values);

            return (
              <article
                key={row.id}
                className="border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-100c09))]"
              >
                <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-a17f52))]">
                      {eventLabel(row.event_type)}
                    </p>
                    <p className="mt-1 text-[10px] text-[rgb(var(--sep-colour-b8a488))]">
                      {actorDescription(
                        row,
                        staffView,
                        user.id,
                      )}
                    </p>

                    {staffView ? (
                      <p className="mt-1 break-words text-[8px] text-[rgb(var(--sep-colour-706658))]">
                        {row.entity_type}
                        {row.entity_id ? ` · ${row.entity_id}` : ""}
                        {row.source ? ` · ${row.source}` : ""}
                      </p>
                    ) : null}
                  </div>

                  <time
                    dateTime={row.created_at}
                    className="text-right text-[9px] text-[rgb(var(--sep-colour-8c7c67))]"
                  >
                    {formatDateTime(row.created_at)}
                  </time>
                </div>

                {visibleFields.length ? (
                  <div className="border-t border-[rgb(var(--sep-colour-59432c))]/30 px-4 py-2">
                    <p className="text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-756958))]">
                      Changed
                    </p>
                    <p className="mt-1 break-words text-[9px] text-[rgb(var(--sep-colour-ae9d83))]">
                      {visibleFields.join(", ")}
                    </p>
                  </div>
                ) : null}

                {before !== null || after !== null ? (
                  <details className="border-t border-[rgb(var(--sep-colour-59432c))]/30">
                    <summary className="cursor-pointer px-4 py-2 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-a98d65))]">
                      Before / after
                    </summary>

                    <div className="grid gap-3 border-t border-[rgb(var(--sep-colour-59432c))]/25 p-4 lg:grid-cols-2">
                      <div>
                        <p className="text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-756958))]">
                          Before
                        </p>
                        <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-words text-[9px] leading-5 text-[rgb(var(--sep-colour-9f8d73))]">
                          {pretty(before)}
                        </pre>
                      </div>

                      <div>
                        <p className="text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-756958))]">
                          After
                        </p>
                        <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-words text-[9px] leading-5 text-[rgb(var(--sep-colour-9f8d73))]">
                          {pretty(after)}
                        </pre>
                      </div>
                    </div>

                    {staffView &&
                    Object.keys(row.metadata ?? {}).length ? (
                      <div className="border-t border-[rgb(var(--sep-colour-59432c))]/25 p-4">
                        <p className="text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-756958))]">
                          Metadata
                        </p>
                        <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words text-[9px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">
                          {pretty(row.metadata)}
                        </pre>
                      </div>
                    ) : null}
                  </details>
                ) : null}
              </article>
            );
          })}

          {rows.length >= 500 ? (
            <p className="pt-2 text-right text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-716654))]">
              Showing the latest 500 entries.
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}
