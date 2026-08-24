"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  requireAdminSection,
} from "@/lib/auth/require-staff";
import { sanitizeRichHtml } from "@/lib/rich-text";
import { createClient } from "@/lib/supabase/server";

function readRequiredUuid(
  value: FormDataEntryValue | null,
): string {
  if (
    typeof value !== "string" ||
    value.trim() === ""
  ) {
    throw new Error(
      "The area identifier is missing.",
    );
  }

  const trimmed = value.trim();

  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!uuidPattern.test(trimmed)) {
    throw new Error(
      "The submitted area identifier is invalid.",
    );
  }

  return trimmed;
}

function readRequiredText(
  value: FormDataEntryValue | null,
  fieldName: string,
  maxLength: number,
): string {
  if (typeof value !== "string") {
    throw new Error(
      `${fieldName} is required.`,
    );
  }

  const trimmed = value.trim();

  if (!trimmed) {
    throw new Error(
      `${fieldName} is required.`,
    );
  }

  return trimmed.slice(0, maxLength);
}

function readOptionalText(
  value: FormDataEntryValue | null,
  maxLength: number,
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  return trimmed.slice(0, maxLength);
}

function readSortOrder(
  value: FormDataEntryValue | null,
): number {
  if (
    typeof value !== "string" ||
    value.trim() === ""
  ) {
    return 0;
  }

  const parsed = Number.parseInt(
    value.trim(),
    10,
  );

  if (!Number.isFinite(parsed)) {
    throw new Error(
      "The area order must be a valid number.",
    );
  }

  return Math.max(-9999, Math.min(9999, parsed));
}

function readCheckbox(
  value: FormDataEntryValue | null,
): boolean {
  return value === "on" || value === "true";
}

function normaliseSlug(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

function readSlug(
  value: FormDataEntryValue | null,
  fallbackName: string,
): string {
  const submitted =
    typeof value === "string"
      ? value.trim()
      : "";

  const slug = normaliseSlug(
    submitted || fallbackName,
  );

  if (!slug) {
    throw new Error(
      "A valid area slug could not be generated.",
    );
  }

  return slug;
}

async function assertUniqueSlug(
  slug: string,
  excludedAreaId?: string,
) {
  const supabase = await createClient();

  let query = supabase
    .from("areas")
    .select("id")
    .eq("slug", slug)
    .limit(1);

  if (excludedAreaId) {
    query = query.neq(
      "id",
      excludedAreaId,
    );
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(
      `Unable to verify the area slug: ${error.message}`,
    );
  }

  if (data && data.length > 0) {
    throw new Error(
      "Another area already uses this slug.",
    );
  }
}

function refreshAreaPages() {
  revalidatePath("/admin");
  revalidatePath("/admin/areas");
  revalidatePath("/admin/rooms");
}

export async function createArea(
  formData: FormData,
) {
  await requireAdminSection("areas");

  const name = readRequiredText(
    formData.get("name"),
    "Area name",
    120,
  );

  const slug = readSlug(
    formData.get("slug"),
    name,
  );

  const descriptionRaw = readOptionalText(
    formData.get("description"),
    100000,
  );

  const description = descriptionRaw
    ? sanitizeRichHtml(descriptionRaw) || null
    : null;

  const imageUrl = readOptionalText(
    formData.get("imageUrl"),
    2000,
  );

  const sortOrder = readSortOrder(
    formData.get("sortOrder"),
  );

  const isActive = readCheckbox(
    formData.get("isActive"),
  );

  await assertUniqueSlug(slug);

  const supabase = await createClient();

  const { error } = await supabase
    .from("areas")
    .insert({
      name,
      slug,
      description,
      image_url: imageUrl,
      sort_order: sortOrder,
      is_active: isActive,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    throw new Error(
      `Unable to create area: ${error.message}`,
    );
  }

  refreshAreaPages();
}

export async function updateArea(
  formData: FormData,
) {
  await requireAdminSection("areas");

  const areaId = readRequiredUuid(
    formData.get("areaId"),
  );

  const name = readRequiredText(
    formData.get("name"),
    "Area name",
    120,
  );

  const slug = readSlug(
    formData.get("slug"),
    name,
  );

  const descriptionRaw = readOptionalText(
    formData.get("description"),
    100000,
  );

  const description = descriptionRaw
    ? sanitizeRichHtml(descriptionRaw) || null
    : null;

  const imageUrl = readOptionalText(
    formData.get("imageUrl"),
    2000,
  );

  const sortOrder = readSortOrder(
    formData.get("sortOrder"),
  );

  const isActive = readCheckbox(
    formData.get("isActive"),
  );

  await assertUniqueSlug(
    slug,
    areaId,
  );

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("areas")
    .update({
      name,
      slug,
      description,
      image_url: imageUrl,
      sort_order: sortOrder,
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", areaId)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(
      `Unable to update area: ${error.message}`,
    );
  }

  if (!data) {
    throw new Error(
      "The selected area no longer exists.",
    );
  }

  refreshAreaPages();
}

export async function deleteArea(
  formData: FormData,
) {
  await requireAdminSection("areas");

  const areaId = readRequiredUuid(
    formData.get("areaId"),
  );

  const confirmation =
    typeof formData.get("confirmation") ===
    "string"
      ? String(
          formData.get("confirmation"),
        )
          .trim()
          .toUpperCase()
      : "";

  if (confirmation !== "DELETE") {
    throw new Error(
      'Type "DELETE" to confirm area deletion.',
    );
  }

  const supabase = await createClient();

  const {
    count: roomCount,
    error: roomCountError,
  } = await supabase
    .from("rooms")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("area_id", areaId);

  if (roomCountError) {
    throw new Error(
      `Unable to inspect the area's rooms: ${roomCountError.message}`,
    );
  }

  if ((roomCount ?? 0) > 0) {
    throw new Error(
      `This area cannot be deleted because it still contains ${roomCount} ${
        roomCount === 1 ? "room" : "rooms"
      }. Move or delete those rooms first.`,
    );
  }

  const { data, error } = await supabase
    .from("areas")
    .delete()
    .eq("id", areaId)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(
      `Unable to delete area: ${error.message}`,
    );
  }

  if (!data) {
    throw new Error(
      "The selected area no longer exists.",
    );
  }

  refreshAreaPages();
}