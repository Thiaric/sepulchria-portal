import "server-only";

import {
  CharacterAuditTrailClient,
  type CharacterAuditDisplayRow,
} from "@/components/characters/character-audit-trail-client";
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

const PLAYER_HIDDEN_KEYS =
  new Set([
    "user_id",
    "actor_user_id",
    "assigned_by",
    "approved_by",
    "reviewed_by",
    "moderated_by",
  ]);

function eventLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    );
}

function removeExpertise(
  value:
    | Record<string, unknown>
    | null,
) {
  if (!value) {
    return value;
  }

  const next = {
    ...value,
  };

  delete next.expertise;

  return next;
}

function cleanForPlayer(
  value:
    | Record<string, unknown>
    | null,
) {
  const withoutExpertise =
    removeExpertise(value);

  if (!withoutExpertise) {
    return withoutExpertise;
  }

  return Object.fromEntries(
    Object.entries(
      withoutExpertise,
    ).filter(
      ([key]) =>
        !PLAYER_HIDDEN_KEYS.has(
          key,
        ) &&
        !key.endsWith(
          "_user_id",
        ),
    ),
  );
}

function visibleFields(
  fields: string[],
  staffView: boolean,
) {
  return fields.filter(
    (key) =>
      key !== "expertise" &&
      (staffView ||
        (!PLAYER_HIDDEN_KEYS.has(
          key,
        ) &&
          !key.endsWith(
            "_user_id",
          ))),
  );
}

function isExpertiseOnlyUpdate(
  row: AuditRow,
) {
  return (
    row.operation === "update" &&
    row.entity_type ===
      "characters" &&
    (row.changed_fields ??
      []).length > 0 &&
    (row.changed_fields ??
      []).every(
      (field) =>
        field === "expertise",
    )
  );
}

function actorDescription(
  row: AuditRow,
  staffView: boolean,
  viewerUserId: string,
) {
  if (
    row.actor_type === "system"
  ) {
    return "System";
  }

  if (
    row.actor_type ===
      "player" &&
    row.actor_user_id ===
      viewerUserId
  ) {
    return "You";
  }

  if (
    row.actor_type ===
    "player"
  ) {
    return staffView
      ? row.actor_label ??
          "Player"
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
    ? `Staff · ${eventLabel(
        row.actor_staff_role,
      )}`
    : "Staff";
}

function toDisplayRow(
  row: AuditRow,
  staffView: boolean,
  viewerUserId: string,
): CharacterAuditDisplayRow {
  return {
    id: row.id,
    event_type:
      row.event_type,
    entity_type:
      row.entity_type,
    entity_id:
      row.entity_id,
    actor_type:
      row.actor_type,
    actor_label:
      actorDescription(
        row,
        staffView,
        viewerUserId,
      ),
    actor_staff_role:
      staffView
        ? row.actor_staff_role
        : null,
    source: row.source,
    changed_fields:
      visibleFields(
        row.changed_fields ?? [],
        staffView,
      ),
    old_values: staffView
      ? removeExpertise(
          row.old_values,
        )
      : cleanForPlayer(
          row.old_values,
        ),
    new_values: staffView
      ? removeExpertise(
          row.new_values,
        )
      : cleanForPlayer(
          row.new_values,
        ),
    metadata: staffView
      ? row.metadata
      : null,
    created_at:
      row.created_at,
  };
}

export async function CharacterAuditTrail({
  characterId,
  staffView = false,
}: {
  characterId: string;
  staffView?: boolean;
}) {
  const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const staffSession =
    await getStaffSession();

  let authorised =
    staffSession !== null;

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

    authorised =
      ownedCharacter !== null;
  }

  if (!authorised) {
    return null;
  }

  const admin =
    createAdminClient();

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

  if (!characterRecord) {
    return null;
  }

  let query = admin
    .from(
      "character_audit_log",
    )
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
    .order(
      "created_at",
      {
        ascending: false,
      },
    )
    .limit(500);

  if (
    characterRecord.user_id
  ) {
    query = query.or(
      [
        `character_id.eq.${characterId}`,
        `and(event_type.eq.account_registered,actor_user_id.eq.${characterRecord.user_id})`,
      ].join(","),
    );
  } else {
    query = query.eq(
      "character_id",
      characterId,
    );
  }

  const {
    data,
    error,
  } = await query;

  if (error) {
    throw new Error(
      `Unable to load Character Log: ${error.message}`,
    );
  }

  const rows = (
    (data ?? []) as AuditRow[]
  )
    .filter(
      (row) =>
        !isExpertiseOnlyUpdate(
          row,
        ),
    )
    .map((row) =>
      toDisplayRow(
        row,
        staffView,
        user.id,
      ),
    );

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
          Permanent history of recorded material changes to this Character, newest first.
        </p>
      </div>

      <CharacterAuditTrailClient
        rows={rows}
        staffView={staffView}
      />
    </section>
  );
}
