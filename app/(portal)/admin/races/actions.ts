"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireStaff } from "@/lib/auth/require-staff";
import { createClient } from "@/lib/supabase/server";

function getRequiredText(
  formData: FormData,
  fieldName: string,
  label: string,
): string {
  const value = formData.get(fieldName);

  if (typeof value !== "string") {
    throw new Error(`${label} is required.`);
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    throw new Error(`${label} is required.`);
  }

  return trimmedValue;
}

function getOptionalText(
  formData: FormData,
  fieldName: string,
): string | null {
  const value = formData.get(fieldName);

  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();

  return trimmedValue || null;
}

function getTextOrEmpty(
  formData: FormData,
  fieldName: string,
): string {
  const value = formData.get(fieldName);

  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function getInteger(
  formData: FormData,
  fieldName: string,
  fallback = 0,
): number {
  const value = formData.get(fieldName);

  if (
    typeof value !== "string" ||
    value.trim() === ""
  ) {
    return fallback;
  }

  const parsedValue = Number.parseInt(
    value,
    10,
  );

  if (!Number.isFinite(parsedValue)) {
    return fallback;
  }

  return Math.max(
    -9999,
    Math.min(9999, parsedValue),
  );
}

function getCheckbox(
  formData: FormData,
  fieldName: string,
): boolean {
  return formData.get(fieldName) === "on";
}

function createSlug(value: string): string {
  return value
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .toLowerCase()
    .trim()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function redirectWithMessage(
  type: "success" | "error",
  message: string,
): never {
  const searchParams =
    new URLSearchParams();

  searchParams.set(type, message);

  redirect(
    `/admin/races?${searchParams.toString()}`,
  );
}

async function getUniqueSlug({
  requestedSlug,
  name,
  excludedRaceId,
}: {
  requestedSlug: string | null;
  name: string;
  excludedRaceId?: string;
}): Promise<string> {
  const supabase = await createClient();

  const baseSlug =
    createSlug(requestedSlug || name) ||
    "race";

  let candidateSlug = baseSlug;
  let suffix = 2;

  while (true) {
    let query = supabase
      .from("races")
      .select("id")
      .eq("slug", candidateSlug)
      .limit(1);

    if (excludedRaceId) {
      query = query.neq(
        "id",
        excludedRaceId,
      );
    }

    const { data, error } =
      await query.maybeSingle();

    if (error) {
      throw new Error(
        `Unable to verify the race slug: ${error.message}`,
      );
    }

    if (!data) {
      return candidateSlug;
    }

    candidateSlug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}

export async function createRace(
  formData: FormData,
): Promise<void> {
  await requireStaff();

  const supabase = await createClient();

  try {
    const name = getRequiredText(
      formData,
      "name",
      "Race name",
    );

    const requestedSlug =
      getOptionalText(
        formData,
        "slug",
      );

    const slug = await getUniqueSlug({
      requestedSlug,
      name,
    });

    const summary = getTextOrEmpty(
      formData,
      "summary",
    );

    const description =
      getTextOrEmpty(
        formData,
        "description",
      );

    const imageUrl = getOptionalText(
      formData,
      "imageUrl",
    );

    const bannerUrl = getOptionalText(
      formData,
      "bannerUrl",
    );

    const iconUrl = getOptionalText(
      formData,
      "iconUrl",
    );

    const colour = getOptionalText(
      formData,
      "colour",
    );

    const sortOrder = getInteger(
      formData,
      "sortOrder",
      0,
    );

    const isActive = getCheckbox(
      formData,
      "isActive",
    );

    const { error } = await supabase
      .from("races")
      .insert({
        name,
        slug,
        summary,
        description,
        image_url: imageUrl,
        banner_url: bannerUrl,
        icon_url: iconUrl,
        colour,
        sort_order: sortOrder,
        is_active: isActive,
        updated_at:
          new Date().toISOString(),
      });

    if (error) {
      throw new Error(error.message);
    }
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to create the race.";

    redirectWithMessage(
      "error",
      message,
    );
  }

  revalidatePath("/admin/races");
  revalidatePath("/character/create");

  redirectWithMessage(
    "success",
    "Race created successfully.",
  );
}

export async function updateRace(
  formData: FormData,
): Promise<void> {
  await requireStaff();

  const supabase = await createClient();

  try {
    const raceId = getRequiredText(
      formData,
      "raceId",
      "Race ID",
    );

    if (!isUuid(raceId)) {
      throw new Error(
        "The selected race is invalid.",
      );
    }

    const { data: existingRace, error } =
      await supabase
        .from("races")
        .select("id")
        .eq("id", raceId)
        .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!existingRace) {
      throw new Error(
        "The selected race no longer exists.",
      );
    }

    const name = getRequiredText(
      formData,
      "name",
      "Race name",
    );

    const requestedSlug =
      getOptionalText(
        formData,
        "slug",
      );

    const slug = await getUniqueSlug({
      requestedSlug,
      name,
      excludedRaceId: raceId,
    });

    const summary = getTextOrEmpty(
      formData,
      "summary",
    );

    const description =
      getTextOrEmpty(
        formData,
        "description",
      );

    const imageUrl = getOptionalText(
      formData,
      "imageUrl",
    );

    const bannerUrl = getOptionalText(
      formData,
      "bannerUrl",
    );

    const iconUrl = getOptionalText(
      formData,
      "iconUrl",
    );

    const colour = getOptionalText(
      formData,
      "colour",
    );

    const sortOrder = getInteger(
      formData,
      "sortOrder",
      0,
    );

    const isActive = getCheckbox(
      formData,
      "isActive",
    );

    const { error: updateError } =
      await supabase
        .from("races")
        .update({
          name,
          slug,
          summary,
          description,
          image_url: imageUrl,
          banner_url: bannerUrl,
          icon_url: iconUrl,
          colour,
          sort_order: sortOrder,
          is_active: isActive,
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", raceId);

    if (updateError) {
      throw new Error(
        updateError.message,
      );
    }
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to update the race.";

    redirectWithMessage(
      "error",
      message,
    );
  }

  revalidatePath("/admin/races");
  revalidatePath("/character/create");
  revalidatePath("/character");

  redirectWithMessage(
    "success",
    "Race updated successfully.",
  );
}

export async function deleteRace(
  formData: FormData,
): Promise<void> {
  await requireStaff();

  const supabase = await createClient();

  try {
    const raceId = getRequiredText(
      formData,
      "raceId",
      "Race ID",
    );

    if (!isUuid(raceId)) {
      throw new Error(
        "The selected race is invalid.",
      );
    }

    const confirmation =
      getRequiredText(
        formData,
        "confirmation",
        "Confirmation",
      );

    if (confirmation !== "DELETE") {
      throw new Error(
        'Type "DELETE" to confirm the deletion.',
      );
    }

    const { data: existingRace, error } =
      await supabase
        .from("races")
        .select("id, name")
        .eq("id", raceId)
        .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!existingRace) {
      throw new Error(
        "The selected race no longer exists.",
      );
    }

    const {
      count: characterCount,
      error: characterError,
    } = await supabase
      .from("characters")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("race_id", raceId);

    if (characterError) {
      throw new Error(
        `Unable to verify linked characters: ${characterError.message}`,
      );
    }

    if (
      characterCount &&
      characterCount > 0
    ) {
      throw new Error(
        `This race cannot be deleted because ${characterCount} ${
          characterCount === 1
            ? "character is"
            : "characters are"
        } currently assigned to it.`,
      );
    }

    const { error: deleteError } =
      await supabase
        .from("races")
        .delete()
        .eq("id", raceId);

    if (deleteError) {
      throw new Error(
        deleteError.message,
      );
    }
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to delete the race.";

    redirectWithMessage(
      "error",
      message,
    );
  }

  revalidatePath("/admin/races");
  revalidatePath("/character/create");

  redirectWithMessage(
    "success",
    "Race deleted successfully.",
  );
}