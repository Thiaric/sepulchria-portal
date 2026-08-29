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
  revalidatePath("/character");
  revalidatePath("/characters");
}

function validTrophyKey(value: string) {
  return /^[a-z0-9]+(?:_[a-z0-9]+)*$/.test(
    value,
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

    const threshold = numeric(
      formData,
      "threshold",
      "Threshold",
    );

    if (threshold < 0) {
      throw new Error(
        "Threshold cannot be negative.",
      );
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
        metric_key: requiredText(
          formData,
          "metric_key",
          "Metric key",
        ),
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

    const threshold = numeric(
      formData,
      "threshold",
      "Threshold",
    );

    if (threshold < 0) {
      throw new Error(
        "Threshold cannot be negative.",
      );
    }

    const sortOrder = integer(
      formData,
      "sort_order",
      "Sort order",
    );

    const supabase = createAdminClient();

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
        metric_key: requiredText(
          formData,
          "metric_key",
          "Metric key",
        ),
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
