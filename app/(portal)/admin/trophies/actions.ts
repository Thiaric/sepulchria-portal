"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  requireAdminSection,
} from "@/lib/auth/require-staff";
import { createAdminClient } from "@/lib/supabase/admin";

function requiredText(
  formData: FormData,
  name: string,
  label: string,
) {
  const value = formData.get(name);

  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    throw new Error(`${label} is required.`);
  }

  return value.trim();
}

function optionalText(
  formData: FormData,
  name: string,
) {
  const value = formData.get(name);

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
}

function numeric(
  formData: FormData,
  name: string,
  label: string,
) {
  const raw = requiredText(
    formData,
    name,
    label,
  );

  const value = Number(raw);

  if (!Number.isFinite(value)) {
    throw new Error(
      `${label} must be a number.`,
    );
  }

  return value;
}

function integer(
  formData: FormData,
  name: string,
  label: string,
) {
  const value = numeric(
    formData,
    name,
    label,
  );

  if (!Number.isInteger(value)) {
    throw new Error(
      `${label} must be a whole number.`,
    );
  }

  return value;
}

function checkbox(
  formData: FormData,
  name: string,
) {
  return formData.get(name) === "on";
}

function fail(message: string): never {
  const params = new URLSearchParams();
  params.set("error", message);

  redirect(
    `/admin/trophies?${params.toString()}`,
  );
}

function failForTrophy(
  id: string,
  message: string,
): never {
  const params = new URLSearchParams();
  params.set("error", message);
  params.set("status_trophy", id);

  redirect(
    `/admin/trophies?${params.toString()}#admin-trophy-${id}`,
  );
}

function refresh() {
  revalidatePath("/admin/trophies");
  revalidatePath("/admin/characters");
  revalidatePath("/character");
  revalidatePath("/characters");
}

function validTrophyKey(value: string) {
  return /^[a-z0-9]+(?:_[a-z0-9]+)*$/.test(
    value,
  );
}

function isManualMetricKey(
  value: string | null | undefined,
) {
  return Boolean(
    value?.startsWith("manual:"),
  );
}

function successRedirect(
  message: string,
  hash = "",
): never {
  const params = new URLSearchParams();
  params.set("notice", message);

  redirect(
    `/admin/trophies?${params.toString()}${hash}`,
  );
}

export async function createTrophy(
  formData: FormData,
) {
  await requireAdminSection("trophies");

  try {
    const trophyKey = requiredText(
      formData,
      "trophy_key",
      "Trophy key",
    );

    if (!validTrophyKey(trophyKey)) {
      throw new Error(
        "Trophy key may contain lowercase letters, numbers and underscores only.",
      );
    }

    const awardMode =
      optionalText(
        formData,
        "award_mode",
      ) ?? "automatic";

    if (
      awardMode !== "automatic" &&
      awardMode !== "manual"
    ) {
      throw new Error(
        "Invalid Trophy award mode.",
      );
    }

    let metricKey: string;
    let threshold: number;

    if (awardMode === "manual") {
      metricKey =
        `manual:${trophyKey}`;
      threshold = 1;
    } else {
      metricKey = requiredText(
        formData,
        "metric_key",
        "Metric key",
      );

      threshold = numeric(
        formData,
        "threshold",
        "Threshold",
      );

      if (threshold < 0) {
        throw new Error(
          "Threshold cannot be negative.",
        );
      }
    }

    const sortOrder = integer(
      formData,
      "sort_order",
      "Sort order",
    );

    const supabase = createAdminClient();

    const { error } = await supabase
      .from("trophy_definitions")
      .insert({
        trophy_key: trophyKey,
        category: requiredText(
          formData,
          "category",
          "Category",
        ),
        name: requiredText(
          formData,
          "name",
          "Name",
        ),
        description: requiredText(
          formData,
          "description",
          "Description",
        ),
        metric_key: metricKey,
        threshold,
        sort_order: sortOrder,
        is_active: checkbox(
          formData,
          "is_active",
        ),
        icon_url: optionalText(
          formData,
          "icon_url",
        ),
      });

    if (error) {
      throw new Error(error.message);
    }
  } catch (error) {
    fail(
      error instanceof Error
        ? error.message
        : "Unable to create Trophy.",
    );
  }

  refresh();
  redirect("/admin/trophies");
}

export async function updateTrophy(
  formData: FormData,
) {
  await requireAdminSection("trophies");

  let trophyId = "";

  try {
    const id = requiredText(
      formData,
      "id",
      "Trophy ID",
    );

    trophyId = id;

    const sortOrder = integer(
      formData,
      "sort_order",
      "Sort order",
    );

    const supabase = createAdminClient();

    const {
      data: existing,
      error: existingError,
    } = await supabase
      .from("trophy_definitions")
      .select("metric_key")
      .eq("id", id)
      .maybeSingle();

    if (existingError) {
      throw new Error(
        existingError.message,
      );
    }

    if (!existing) {
      throw new Error(
        "Trophy not found.",
      );
    }

    const manual =
      isManualMetricKey(
        existing.metric_key,
      );

    let metricKey =
      existing.metric_key;
    let threshold = 1;

    if (!manual) {
      metricKey = requiredText(
        formData,
        "metric_key",
        "Metric key",
      );

      threshold = numeric(
        formData,
        "threshold",
        "Threshold",
      );

      if (threshold < 0) {
        throw new Error(
          "Threshold cannot be negative.",
        );
      }
    }

    const { error } = await supabase
      .from("trophy_definitions")
      .update({
        category: requiredText(
          formData,
          "category",
          "Category",
        ),
        name: requiredText(
          formData,
          "name",
          "Name",
        ),
        description: requiredText(
          formData,
          "description",
          "Description",
        ),
        metric_key: metricKey,
        threshold,
        sort_order: sortOrder,
        is_active: checkbox(
          formData,
          "is_active",
        ),
        icon_url: optionalText(
          formData,
          "icon_url",
        ),
      })
      .eq("id", id);

    if (error) {
      throw new Error(error.message);
    }
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to update Trophy.";

    if (trophyId) {
      failForTrophy(
        trophyId,
        message,
      );
    }

    fail(message);
  }

  refresh();

  const params = new URLSearchParams();
  params.set("saved", "1");
  params.set(
    "status_trophy",
    trophyId,
  );

  redirect(
    `/admin/trophies?${params.toString()}#admin-trophy-${trophyId}`,
  );
}

export async function assignManualTrophy(
  formData: FormData,
) {
  await requireAdminSection("trophies");

  try {
    const characterId = requiredText(
      formData,
      "character_id",
      "Character",
    );

    const trophyId = requiredText(
      formData,
      "trophy_id",
      "Trophy",
    );

    const supabase = createAdminClient();

    const [
      characterResult,
      trophyResult,
    ] = await Promise.all([
      supabase
        .from("characters")
        .select(
          "id, status, is_system",
        )
        .eq("id", characterId)
        .maybeSingle(),

      supabase
        .from("trophy_definitions")
        .select(
          "id, metric_key, is_active",
        )
        .eq("id", trophyId)
        .maybeSingle(),
    ]);

    if (characterResult.error) {
      throw new Error(
        characterResult.error.message,
      );
    }

    if (
      !characterResult.data ||
      characterResult.data.status !==
        "approved" ||
      characterResult.data.is_system ===
        true
    ) {
      throw new Error(
        "Select an approved player character.",
      );
    }

    if (trophyResult.error) {
      throw new Error(
        trophyResult.error.message,
      );
    }

    if (
      !trophyResult.data ||
      !isManualMetricKey(
        trophyResult.data.metric_key,
      )
    ) {
      throw new Error(
        "Select a Manual Trophy.",
      );
    }

    if (
      trophyResult.data.is_active !==
      true
    ) {
      throw new Error(
        "Inactive Manual Trophies cannot be awarded.",
      );
    }

    const {
      data: existingAward,
      error: existingAwardError,
    } = await supabase
      .from("character_trophies")
      .select("id")
      .eq(
        "character_id",
        characterId,
      )
      .eq("trophy_id", trophyId)
      .maybeSingle();

    if (existingAwardError) {
      throw new Error(
        existingAwardError.message,
      );
    }

    if (existingAward) {
      throw new Error(
        "That character already has this Trophy.",
      );
    }

    const { error } = await supabase
      .from("character_trophies")
      .insert({
        character_id: characterId,
        trophy_id: trophyId,
        progress_value: 1,
        earned_at:
          new Date().toISOString(),
      });

    if (error) {
      throw new Error(error.message);
    }

    /*
     * The INSERT trigger creates the Trophy notification.
     * If this Trophy was previously revoked, the automatic notification
     * row already exists but was deactivated. Reactivate it and clear
     * any previous read marker so a re-award behaves like a fresh award.
     */
    const sourceId =
      `${characterId}:${trophyId}`;

    const {
      data: notification,
      error: notificationLookupError,
    } = await supabase
      .from("notifications")
      .select("id")
      .eq("source_type", "trophy")
      .eq("source_id", sourceId)
      .eq("source_trigger", "earned")
      .maybeSingle();

    if (notificationLookupError) {
      throw new Error(
        notificationLookupError.message,
      );
    }

    if (notification) {
      const {
        error: notificationUpdateError,
      } = await supabase
        .from("notifications")
        .update({
          is_active: true,
          starts_at:
            new Date().toISOString(),
          expires_at:
            new Date(
              Date.now() +
                30 *
                  24 *
                  60 *
                  60 *
                  1000,
            ).toISOString(),
        })
        .eq("id", notification.id);

      if (notificationUpdateError) {
        throw new Error(
          notificationUpdateError.message,
        );
      }

      const {
        error: readResetError,
      } = await supabase
        .from("notification_reads")
        .delete()
        .eq(
          "notification_id",
          notification.id,
        );

      if (readResetError) {
        throw new Error(
          readResetError.message,
        );
      }
    }
  } catch (error) {
    fail(
      error instanceof Error
        ? error.message
        : "Unable to award Manual Trophy.",
    );
  }

  refresh();
  successRedirect(
    "Manual Trophy awarded.",
    "#manual-trophy-awards",
  );
}

export async function revokeManualTrophy(
  formData: FormData,
) {
  await requireAdminSection("trophies");

  try {
    const characterId = requiredText(
      formData,
      "character_id",
      "Character",
    );

    const trophyId = requiredText(
      formData,
      "trophy_id",
      "Trophy",
    );

    const supabase = createAdminClient();

    const {
      data: trophy,
      error: trophyError,
    } = await supabase
      .from("trophy_definitions")
      .select("metric_key")
      .eq("id", trophyId)
      .maybeSingle();

    if (trophyError) {
      throw new Error(
        trophyError.message,
      );
    }

    if (
      !trophy ||
      !isManualMetricKey(
        trophy.metric_key,
      )
    ) {
      throw new Error(
        "Only Manual Trophy awards can be revoked here.",
      );
    }

    const { error } = await supabase
      .from("character_trophies")
      .delete()
      .eq(
        "character_id",
        characterId,
      )
      .eq("trophy_id", trophyId);

    if (error) {
      throw new Error(error.message);
    }

    const {
      error: notificationError,
    } = await supabase
      .from("notifications")
      .update({
        is_active: false,
      })
      .eq("source_type", "trophy")
      .eq(
        "source_id",
        `${characterId}:${trophyId}`,
      )
      .eq(
        "source_trigger",
        "earned",
      );

    if (notificationError) {
      throw new Error(
        notificationError.message,
      );
    }
  } catch (error) {
    fail(
      error instanceof Error
        ? error.message
        : "Unable to revoke Manual Trophy.",
    );
  }

  refresh();
  successRedirect(
    "Manual Trophy revoked.",
    "#manual-trophy-awards",
  );
}

export async function deleteManualTrophy(
  formData: FormData,
) {
  await requireAdminSection("trophies");

  try {
    const trophyId = requiredText(
      formData,
      "id",
      "Trophy ID",
    );

    const supabase = createAdminClient();

    const {
      data: trophy,
      error: trophyError,
    } = await supabase
      .from("trophy_definitions")
      .select(
        "id, name, metric_key",
      )
      .eq("id", trophyId)
      .maybeSingle();

    if (trophyError) {
      throw new Error(
        trophyError.message,
      );
    }

    if (
      !trophy ||
      !isManualMetricKey(
        trophy.metric_key,
      )
    ) {
      throw new Error(
        "Only Manual Trophies can be deleted. Deactivate automatic Trophies instead.",
      );
    }

    const {
      error: awardsError,
    } = await supabase
      .from("character_trophies")
      .delete()
      .eq("trophy_id", trophyId);

    if (awardsError) {
      throw new Error(
        awardsError.message,
      );
    }

    const {
      error: notificationError,
    } = await supabase
      .from("notifications")
      .update({
        is_active: false,
      })
      .eq("source_type", "trophy")
      .like(
        "source_id",
        `%:${trophyId}`,
      )
      .eq(
        "source_trigger",
        "earned",
      );

    if (notificationError) {
      throw new Error(
        notificationError.message,
      );
    }

    const { error } = await supabase
      .from("trophy_definitions")
      .delete()
      .eq("id", trophyId);

    if (error) {
      throw new Error(error.message);
    }
  } catch (error) {
    fail(
      error instanceof Error
        ? error.message
        : "Unable to delete Manual Trophy.",
    );
  }

  refresh();
  successRedirect(
    "Manual Trophy deleted.",
  );
}

