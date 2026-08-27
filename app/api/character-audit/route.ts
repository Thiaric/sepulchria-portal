import {
  NextResponse,
} from "next/server";

import {
  canAccessAdminSection,
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
  event_type: string;
  entity_type: string;
  entity_id: string | null;
  operation: string;
  actor_user_id: string | null;
  actor_type:
    | "player"
    | "staff"
    | "system";
  actor_staff_role:
    | string
    | null;
  actor_label:
    | string
    | null;
  source: string;
  changed_fields: string[];
  old_values:
    | Record<string, unknown>
    | null;
  new_values:
    | Record<string, unknown>
    | null;
  metadata:
    | Record<string, unknown>
    | null;
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

function eventLabel(
  value: string,
) {
  return value
    .replaceAll("_", " ")
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase(),
    );
}

function cleanValues(
  value:
    | Record<string, unknown>
    | null,
  staffView: boolean,
) {
  if (!value) {
    return value;
  }

  const next = {
    ...value,
  };

  delete next.expertise;
  delete next.current_room_id;

  if (staffView) {
    return next;
  }

  return Object.fromEntries(
    Object.entries(next).filter(
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

function cleanFields(
  fields: string[],
  staffView: boolean,
) {
  return fields.filter(
    (key) =>
      key !== "expertise" &&
      key !==
        "current_room_id" &&
      (staffView ||
        (!PLAYER_HIDDEN_KEYS.has(
          key,
        ) &&
          !key.endsWith(
            "_user_id",
          ))),
  );
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
  oddJobTimes: number[],
) {
  if (
    row.event_type !==
      "currency_changed"
  ) {
    return false;
  }

  const changed =
    row.changed_fields ?? [];

  if (
    !changed.includes(
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

  return oddJobTimes.some(
    (oddJobTime) =>
      Math.abs(
        rowTime -
          oddJobTime,
      ) <= 5000,
  );
}

function actorLabel(
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
    row.actor_type === "player"
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

export async function GET(
  request: Request,
) {
  const url =
    new URL(request.url);

  const characterId =
    url.searchParams.get(
      "characterId",
    );

  const requestedStaffView =
    url.searchParams.get(
      "staffView",
    ) === "1";

  if (!characterId) {
    return NextResponse.json(
      {
        error:
          "Missing Character.",
      },
      {
        status: 400,
      },
    );
  }

  const supabase =
    await createClient();

  const {
    data: { user },
    error: authError,
  } =
    await supabase.auth.getUser();

  if (
    authError ||
    !user
  ) {
    return NextResponse.json(
      {
        error:
          "Not authenticated.",
      },
      {
        status: 401,
      },
    );
  }

  const staffSession =
    await getStaffSession();

  const canViewCharacterLogs =
    staffSession !== null &&
    canAccessAdminSection(
      staffSession.role,
      "character_logs",
    );

  const staffView =
    requestedStaffView &&
    canViewCharacterLogs;

  const admin =
    createAdminClient();

  const {
    data: character,
    error: characterError,
  } = await admin
    .from("characters")
    .select(
      "id, user_id",
    )
    .eq(
      "id",
      characterId,
    )
    .maybeSingle();

  if (
    characterError ||
    !character
  ) {
    return NextResponse.json(
      {
        error:
          "Character not found.",
      },
      {
        status: 404,
      },
    );
  }

  const ownsCharacter =
    character.user_id ===
    user.id;

  if (
    !ownsCharacter &&
    !canViewCharacterLogs
  ) {
    return NextResponse.json(
      {
        error:
          "Not authorised.",
      },
      {
        status: 403,
      },
    );
  }

  let query = admin
    .from(
      "character_audit_log",
    )
    .select(`
      id,
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

  if (character.user_id) {
    query = query.or(
      [
        `character_id.eq.${characterId}`,
        `and(event_type.eq.account_registered,actor_user_id.eq.${character.user_id})`,
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
    return NextResponse.json(
      {
        error:
          error.message,
      },
      {
        status: 500,
      },
    );
  }

  const rawRows =
    (data ?? []) as AuditRow[];

  const oddJobTimes =
    rawRows
      .filter(
        isOddJobsDirectRow,
      )
      .map((row) =>
        new Date(
          row.created_at,
        ).getTime(),
      )
      .filter(
        Number.isFinite,
      );

  const rows =
    rawRows
      .filter(
        (row) =>
          !isOddJobsDirectRow(
            row,
          ) &&
          !isNearbyOddJobCurrencyRow(
            row,
            oddJobTimes,
          ),
      )
      .filter((row) => {
        const visible =
          cleanFields(
            row.changed_fields ??
              [],
            staffView,
          );

        if (
          row.operation !==
            "update"
        ) {
          return true;
        }

        if (
          (row.changed_fields ??
            []).length === 0
        ) {
          return true;
        }

        return (
          visible.length > 0
        );
      })
      .map((row) => ({
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
          actorLabel(
            row,
            staffView,
            user.id,
          ),
        actor_staff_role:
          staffView
            ? row.actor_staff_role
            : null,
        source:
          row.source,
        changed_fields:
          cleanFields(
            row.changed_fields ??
              [],
            staffView,
          ),
        old_values:
          cleanValues(
            row.old_values,
            staffView,
          ),
        new_values:
          cleanValues(
            row.new_values,
            staffView,
          ),
        metadata:
          staffView
            ? row.metadata
            : null,
        created_at:
          row.created_at,
      }));

  return NextResponse.json({
    rows,
  });
}
