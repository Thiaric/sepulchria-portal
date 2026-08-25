from pathlib import Path

ROOT = Path.cwd()

PLAYER_ACTIONS = ROOT / "app/(portal)/character/actions.ts"
ADMIN_ACTIONS = ROOT / "app/(portal)/admin/characters/actions.ts"
AUDIT_API = ROOT / "app/api/character-audit/route.ts"
ADMIN_AUDIT = ROOT / "app/(portal)/admin/character-audit/page.tsx"


def fail(message: str) -> None:
    raise SystemExit(f"ERROR: {message}\nNo changes were applied.")


for path in [PLAYER_ACTIONS, ADMIN_ACTIONS, AUDIT_API, ADMIN_AUDIT]:
    if not path.exists():
        fail(f"Missing expected file: {path.relative_to(ROOT)}")

player = PLAYER_ACTIONS.read_text(encoding="utf-8")
admin = ADMIN_ACTIONS.read_text(encoding="utf-8")
audit_api = AUDIT_API.read_text(encoding="utf-8")
admin_audit = ADMIN_AUDIT.read_text(encoding="utf-8")

player_select_old = '''  } = await supabase
    .from("characters")
    .select("id, status")
    .eq("user_id", user.id)
    .maybeSingle();
'''

player_select_new = '''  } = await supabase
    .from("characters")
    .select(`
      id,
      status,
      portrait_url,
      music_url,
      sexual_orientation,
      physical_description,
      personality,
      biography,
      public_notes,
      relationships,
      offgame,
      show_last_activity
    `)
    .eq("user_id", user.id)
    .maybeSingle();
'''

idx = player.rfind(player_select_old)
if idx == -1:
    fail("Could not find approved-profile character select.")

player = player[:idx] + player_select_new + player[idx + len(player_select_old):]

player_update_old = '''  const { error } = await supabase
  .from("characters")
  .update({
    portrait_url: portraitUrl || null,
    music_url: musicUrl || null,

    sexual_orientation:
      sexualOrientation || null,

    physical_description:
      physicalDescription,

    personality,
    biography,

    public_notes:
      publicNotes || null,

    relationships:
      relationships || null,

    offgame:
      offgame || null,

    show_last_activity:
      showLastActivity,

    updated_at:
      new Date().toISOString(),
  })
    .eq("id", character.id)
    .eq("user_id", user.id)
    .eq("status", "approved")
      .eq("is_system", false);

  if (error) {
    redirectCharacterError(error.message);
  }

  redirect("/character?updated=true");
'''

player_update_new = '''  const updatePayload:
    Record<string, unknown> = {};

  function setIfChanged(
    key: string,
    currentValue: unknown,
    nextValue: unknown,
  ) {
    if (currentValue !== nextValue) {
      updatePayload[key] =
        nextValue;
    }
  }

  setIfChanged(
    "portrait_url",
    character.portrait_url,
    portraitUrl || null,
  );

  setIfChanged(
    "music_url",
    character.music_url,
    musicUrl || null,
  );

  setIfChanged(
    "sexual_orientation",
    character.sexual_orientation,
    sexualOrientation || null,
  );

  setIfChanged(
    "physical_description",
    character.physical_description,
    physicalDescription,
  );

  setIfChanged(
    "personality",
    character.personality,
    personality,
  );

  setIfChanged(
    "biography",
    character.biography,
    biography,
  );

  setIfChanged(
    "public_notes",
    character.public_notes,
    publicNotes || null,
  );

  setIfChanged(
    "relationships",
    character.relationships,
    relationships || null,
  );

  setIfChanged(
    "offgame",
    character.offgame,
    offgame || null,
  );

  setIfChanged(
    "show_last_activity",
    character.show_last_activity,
    showLastActivity,
  );

  if (
    Object.keys(
      updatePayload,
    ).length > 0
  ) {
    updatePayload.updated_at =
      new Date().toISOString();

    const { error } =
      await supabase
        .from("characters")
        .update(updatePayload)
        .eq(
          "id",
          character.id,
        )
        .eq(
          "user_id",
          user.id,
        )
        .eq(
          "status",
          "approved",
        )
        .eq(
          "is_system",
          false,
        );

    if (error) {
      redirectCharacterError(
        error.message,
      );
    }
  }

  redirect("/character?updated=true");
'''

if player.count(player_update_old) != 1:
    fail("Could not find approved-profile full-row update block.")

player = player.replace(player_update_old, player_update_new, 1)

admin_payload_old = '''  const updatePayload = {
    first_name: firstName,
    surname,
    pronouns,
    gender,
    sexual_orientation:
      sexualOrientation,
    date_of_birth:
      dateOfBirth,
    birthplace,
    origin,
    portrait_url:
      portraitUrl,
    music_url: musicUrl,
    physical_description:
      physicalDescription,
    personality,
    biography,
    public_notes:
      publicNotes,
    relationships,
    offgame,
    ...attributes,
    current_health:
      currentHealth,
    race_id: raceId,
    status,
    title,
    staff_notes:
      staffNotes,
    rejection_reason:
      rejectionReason,
    approved_at:
      approvalData.approved_at,
    approved_by:
      approvalData.approved_by,
    updated_at: now,
    ...(approvalData
      .approval_notice_seen_at !==
    undefined
      ? {
          approval_notice_seen_at:
            approvalData
              .approval_notice_seen_at,
        }
      : {}),
  };

  const {
    error: updateError,
  } = await supabase
    .from("characters")
    .update(updatePayload)
    .eq("id", characterId);

  if (updateError) {
    throw new Error(
      `Unable to update character: ${updateError.message}`,
    );
  }
'''

admin_payload_new = '''  const candidatePayload:
    Record<string, unknown> = {
      first_name: firstName,
      surname,
      pronouns,
      gender,
      sexual_orientation:
        sexualOrientation,
      date_of_birth:
        dateOfBirth,
      birthplace,
      origin,
      portrait_url:
        portraitUrl,
      music_url: musicUrl,
      physical_description:
        physicalDescription,
      personality,
      biography,
      public_notes:
        publicNotes,
      relationships,
      offgame,
      ...attributes,
      current_health:
        currentHealth,
      race_id: raceId,
      status,
      title,
      staff_notes:
        staffNotes,
      rejection_reason:
        rejectionReason,
      approved_at:
        approvalData.approved_at,
      approved_by:
        approvalData.approved_by,
      ...(approvalData
        .approval_notice_seen_at !==
      undefined
        ? {
            approval_notice_seen_at:
              approvalData
                .approval_notice_seen_at,
          }
        : {}),
    };

  const currentValues:
    Record<string, unknown> = {
      first_name:
        character.first_name,
      surname:
        character.surname,
      pronouns:
        character.pronouns,
      gender:
        character.gender,
      sexual_orientation:
        character.sexual_orientation,
      date_of_birth:
        character.date_of_birth,
      birthplace:
        character.birthplace,
      origin:
        character.origin,
      portrait_url:
        character.portrait_url,
      music_url:
        character.music_url,
      physical_description:
        character.physical_description,
      personality:
        character.personality,
      biography:
        character.biography,
      public_notes:
        character.public_notes,
      relationships:
        character.relationships,
      offgame:
        character.offgame,
      muscles:
        character.muscles,
      reflexes:
        character.reflexes,
      vigor:
        character.vigor,
      brains:
        character.brains,
      shrewd:
        character.shrewd,
      presence_score:
        character.presence_score,
      current_health:
        character.current_health,
      race_id:
        character.race_id,
      status:
        character.status,
      title:
        character.title,
      staff_notes:
        character.staff_notes,
      rejection_reason:
        character.rejection_reason,
      approved_at:
        character.approved_at,
      approved_by:
        character.approved_by,
      approval_notice_seen_at:
        character
          .approval_notice_seen_at,
    };

  const updatePayload:
    Record<string, unknown> =
      Object.fromEntries(
        Object.entries(
          candidatePayload,
        ).filter(
          ([key, value]) =>
            currentValues[key] !==
            value,
        ),
      );

  if (
    Object.keys(
      updatePayload,
    ).length > 0
  ) {
    updatePayload.updated_at =
      now;

    const {
      error: updateError,
    } = await supabase
      .from("characters")
      .update(updatePayload)
      .eq(
        "id",
        characterId,
      );

    if (updateError) {
      throw new Error(
        `Unable to update character: ${updateError.message}`,
      );
    }
  }
'''

if admin.count(admin_payload_old) != 1:
    fail("Could not find admin full-row update block.")

admin = admin.replace(admin_payload_old, admin_payload_new, 1)

api_helper_anchor = '''function actorLabel(
'''

api_helpers = '''function isOddJobsDirectRow(
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

'''

if audit_api.count(api_helper_anchor) != 1:
    fail("Could not find audit API helper insertion point.")
audit_api = audit_api.replace(api_helper_anchor, api_helpers + api_helper_anchor, 1)

api_rows_old = '''  const rows =
    ((data ?? []) as AuditRow[])
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
'''

api_rows_new = '''  const rawRows =
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
'''

if audit_api.count(api_rows_old) != 1:
    fail("Could not find Character Log API rows pipeline.")
audit_api = audit_api.replace(api_rows_old, api_rows_new, 1)

admin_audit_anchor = '''function removeExpertise(
'''

admin_audit_helpers = '''function isOddJobsDirectRow(
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

'''

if admin_audit.count(admin_audit_anchor) != 1:
    fail("Could not find admin audit helper insertion point.")
admin_audit = admin_audit.replace(admin_audit_anchor, admin_audit_helpers + admin_audit_anchor, 1)

admin_rows_old = '''  const rawRows = (
    (data ?? []) as AuditRow[]
  )
    .filter(
      (row) =>
        !isExpertiseOnlyUpdate(row),
    )
    .map(scrubExpertise);
'''

admin_rows_new = '''  const allRows =
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
'''

if admin_audit.count(admin_rows_old) != 1:
    fail("Could not find admin audit rows pipeline.")
admin_audit = admin_audit.replace(admin_rows_old, admin_rows_new, 1)

for marker in ["setIfChanged(", "character.music_url"]:
    if marker not in player:
        fail(f"Player safety check failed: {marker}")

for marker in ["const candidatePayload:", "const currentValues:", "Object.fromEntries("]:
    if marker not in admin:
        fail(f"Admin safety check failed: {marker}")

for marker in ["function isOddJobsDirectRow(", "const oddJobTimes ="]:
    if marker not in audit_api:
        fail(f"Audit API safety check failed: {marker}")

for marker in ["const oddJobMarkers =", "!isNearbyOddJobCurrencyRow("]:
    if marker not in admin_audit:
        fail(f"Admin audit safety check failed: {marker}")

PLAYER_ACTIONS.write_text(player, encoding="utf-8", newline="\n")
ADMIN_ACTIONS.write_text(admin, encoding="utf-8", newline="\n")
AUDIT_API.write_text(audit_api, encoding="utf-8", newline="\n")
ADMIN_AUDIT.write_text(admin_audit, encoding="utf-8", newline="\n")

print("WROTE  app/(portal)/character/actions.ts")
print("WROTE  app/(portal)/admin/characters/actions.ts")
print("WROTE  app/api/character-audit/route.ts")
print("WROTE  app/(portal)/admin/character-audit/page.tsx")
print()
print("CHARACTER SAVE + LOG CLEANUP APPLIED")
print("- Approved player edits now update only changed fields.")
print("- Admin character edits now update only changed fields.")
print("- updated_at changes only when a real field changed.")
print("- Odd Jobs Bureau job/ledger/balance audit entries are hidden from Character Logs.")
print("- Ledger data itself is untouched.")
print("- Odd Jobs gameplay is untouched.")
print()
print("Next: npm run build")
