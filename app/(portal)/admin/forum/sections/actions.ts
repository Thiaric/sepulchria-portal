"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

const VALID_SECTION_TYPES = [
  "ongame",
  "offgame",
  "organisation",
] as const;

const VALID_VISIBILITIES = [
  "public",
  "members",
  "staff",
] as const;

type SectionType =
  (typeof VALID_SECTION_TYPES)[number];

type SectionVisibility =
  (typeof VALID_VISIBILITIES)[number];

type ForumSectionRecord = {
  id: string;
  slug: string;
  parent_id: string | null;
};

type ValidatedSectionData = {
  name: string;
  slug: string;
  description: string | null;
  section_type: SectionType;
  visibility: SectionVisibility;
  association_id: string | null;
  parent_id: string | null;
  icon_url: string | null;
  banner_url: string | null;
  colour: string | null;
  sort_order: number;
  is_active: boolean;
};

function getStringValue(
  formData: FormData,
  fieldName: string,
): string {
  const value = formData.get(fieldName);

  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function createSlug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/['â€™]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function isValidSectionType(
  value: string,
): value is SectionType {
  return VALID_SECTION_TYPES.includes(
    value as SectionType,
  );
}

function isValidVisibility(
  value: string,
): value is SectionVisibility {
  return VALID_VISIBILITIES.includes(
    value as SectionVisibility,
  );
}

function isValidOptionalUrl(
  value: string,
): boolean {
  if (!value) {
    return true;
  }

  try {
    const parsedUrl = new URL(value);

    return (
      parsedUrl.protocol === "http:" ||
      parsedUrl.protocol === "https:"
    );
  } catch {
    return false;
  }
}

function isValidOptionalColour(
  value: string,
): boolean {
  if (!value) {
    return true;
  }

  return /^#[0-9a-f]{6}$/i.test(value);
}

function redirectToCreateError(
  message: string,
): never {
  redirect(
    `/admin/forum/sections/new?error=${encodeURIComponent(
      message,
    )}`,
  );
}

function redirectToEditError(
  sectionId: string,
  message: string,
): never {
  redirect(
    `/admin/forum/sections/${encodeURIComponent(
      sectionId,
    )}?error=${encodeURIComponent(
      message,
    )}`,
  );
}

function redirectToEditSuccess(
  sectionId: string,
  message: string,
): never {
  redirect(
    `/admin/forum/sections/${encodeURIComponent(
      sectionId,
    )}?success=${encodeURIComponent(
      message,
    )}`,
  );
}

async function requireStaff(
  redirectPath: string,
) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect(
      `/login?redirect=${encodeURIComponent(
        redirectPath,
      )}`,
    );
  }

  const {
    data: staffResult,
    error: staffError,
  } = await supabase.rpc(
    "current_user_is_staff",
  );

  if (
    staffError ||
    staffResult !== true
  ) {
    redirect("/forum");
  }

  return {
    supabase,
    user,
  };
}

function validateSectionForm(
  formData: FormData,
  onError: (message: string) => never,
): ValidatedSectionData {
  const name = getStringValue(
    formData,
    "name",
  );

  const submittedSlug = getStringValue(
    formData,
    "slug",
  );

  const description = getStringValue(
    formData,
    "description",
  );

  const sectionType = getStringValue(
    formData,
    "section_type",
  );

  const visibility = getStringValue(
    formData,
    "visibility",
  );

  const associationId = getStringValue(
    formData,
    "association_id",
  );

  const parentId = getStringValue(
    formData,
    "parent_id",
  );

  const iconUrl = getStringValue(
    formData,
    "icon_url",
  );

  const bannerUrl = getStringValue(
    formData,
    "banner_url",
  );

  const colour = getStringValue(
    formData,
    "colour",
  );

  const sortOrderValue = getStringValue(
    formData,
    "sort_order",
  );

  const isActive =
    formData.get("is_active") === "on";

  if (!name) {
    onError(
      "The section name is required.",
    );
  }

  if (name.length > 120) {
    onError(
      "The section name cannot exceed 120 characters.",
    );
  }

  const slug = createSlug(
    submittedSlug || name,
  );

  if (!slug) {
    onError(
      "A valid section slug could not be generated.",
    );
  }

  if (slug.length > 140) {
    onError(
      "The section slug cannot exceed 140 characters.",
    );
  }

  if (!isValidSectionType(sectionType)) {
    onError(
      "The selected section type is invalid.",
    );
  }

  if (!isValidVisibility(visibility)) {
    onError(
      "The selected visibility is invalid.",
    );
  }

  const sortOrder =
    sortOrderValue === ""
      ? 0
      : Number(sortOrderValue);

  if (
    !Number.isInteger(sortOrder) ||
    sortOrder < 0
  ) {
    onError(
      "The display order must be a non-negative whole number.",
    );
  }

  if (description.length > 2000) {
    onError(
      "The description cannot exceed 2,000 characters.",
    );
  }

  if (!isValidOptionalUrl(iconUrl)) {
    onError(
      "The icon URL must be a valid HTTP or HTTPS address.",
    );
  }

  if (!isValidOptionalUrl(bannerUrl)) {
    onError(
      "The banner URL must be a valid HTTP or HTTPS address.",
    );
  }

  if (!isValidOptionalColour(colour)) {
    onError(
      "The colour must use the hexadecimal format #RRGGBB.",
    );
  }

  return {
    name,
    slug,
    description:
      description || null,
    section_type: sectionType,
    visibility,
    association_id:
      associationId || null,
    parent_id: parentId || null,
    icon_url: iconUrl || null,
    banner_url: bannerUrl || null,
    colour: colour || null,
    sort_order: sortOrder,
    is_active: isActive,
  };
}

async function verifyAssociation(
  supabase: Awaited<
    ReturnType<typeof createClient>
  >,
  associationId: string | null,
  onError: (message: string) => never,
): Promise<void> {
  if (!associationId) {
    return;
  }

  const {
    data: association,
    error: associationError,
  } = await supabase
    .from("associations")
    .select("id")
    .eq("id", associationId)
    .maybeSingle();

  if (associationError) {
    onError(
      `Unable to verify the organisation: ${associationError.message}`,
    );
  }

  if (!association) {
    onError(
      "The selected organisation no longer exists.",
    );
  }
}

async function verifyParentSection(
  supabase: Awaited<
    ReturnType<typeof createClient>
  >,
  parentId: string | null,
  currentSectionId: string | null,
  onError: (message: string) => never,
): Promise<void> {
  if (!parentId) {
    return;
  }

  if (
    currentSectionId &&
    parentId === currentSectionId
  ) {
    onError(
      "A section cannot be its own parent.",
    );
  }

  const {
    data: parentSection,
    error: parentError,
  } = await supabase
    .from("forum_sections")
    .select(
      `
        id,
        slug,
        parent_id
      `,
    )
    .eq("id", parentId)
    .maybeSingle<ForumSectionRecord>();

  if (parentError) {
    onError(
      `Unable to verify the parent section: ${parentError.message}`,
    );
  }

  if (!parentSection) {
    onError(
      "The selected parent section no longer exists.",
    );
  }

  if (!currentSectionId) {
    return;
  }

  let nextParentId =
    parentSection.parent_id;

  const visitedSectionIds =
    new Set<string>([
      parentSection.id,
    ]);

  while (nextParentId) {
    if (
      nextParentId === currentSectionId
    ) {
      onError(
        "This parent selection would create a circular section hierarchy.",
      );
    }

    if (
      visitedSectionIds.has(
        nextParentId,
      )
    ) {
      onError(
        "The selected parent belongs to an invalid circular hierarchy.",
      );
    }

    visitedSectionIds.add(
      nextParentId,
    );

    const {
      data: nextParent,
      error: nextParentError,
    } = await supabase
      .from("forum_sections")
      .select(
        `
          id,
          slug,
          parent_id
        `,
      )
      .eq("id", nextParentId)
      .maybeSingle<ForumSectionRecord>();

    if (nextParentError) {
      onError(
        `Unable to verify the section hierarchy: ${nextParentError.message}`,
      );
    }

    if (!nextParent) {
      break;
    }

    nextParentId =
      nextParent.parent_id;
  }
}

function revalidateForumPaths(
  sectionSlug?: string,
): void {
  revalidatePath("/forum");
  revalidatePath("/admin/forum");
  revalidatePath(
    "/admin/forum/sections",
  );

  if (sectionSlug) {
    revalidatePath(
      `/forum/${sectionSlug}`,
    );
  }
}

export async function createForumSectionAction(
  formData: FormData,
): Promise<void> {
  const { supabase } =
    await requireStaff(
      "/admin/forum/sections/new",
    );

  const sectionData =
    validateSectionForm(
      formData,
      redirectToCreateError,
    );

  const {
    data: existingSection,
    error: duplicateCheckError,
  } = await supabase
    .from("forum_sections")
    .select("id")
    .eq("slug", sectionData.slug)
    .maybeSingle();

  if (duplicateCheckError) {
    redirectToCreateError(
      `Unable to verify the section slug: ${duplicateCheckError.message}`,
    );
  }

  if (existingSection) {
    redirectToCreateError(
      "Another forum section already uses this slug.",
    );
  }

  await verifyAssociation(
    supabase,
    sectionData.association_id,
    redirectToCreateError,
  );

  await verifyParentSection(
    supabase,
    sectionData.parent_id,
    null,
    redirectToCreateError,
  );

  const {
    error: insertionError,
  } = await supabase
    .from("forum_sections")
    .insert(sectionData);

  if (insertionError) {
    if (
      insertionError.code === "23505"
    ) {
      redirectToCreateError(
        "Another forum section already uses this slug.",
      );
    }

    redirectToCreateError(
      `Unable to create the forum section: ${insertionError.message}`,
    );
  }

  revalidateForumPaths(
    sectionData.slug,
  );

  redirect(
    "/admin/forum/sections",
  );
}

export async function updateForumSectionAction(
  formData: FormData,
): Promise<void> {
  const sectionId = getStringValue(
    formData,
    "section_id",
  );

  if (!sectionId) {
    redirect(
      "/admin/forum/sections",
    );
  }

  const editPath =
    `/admin/forum/sections/${encodeURIComponent(
      sectionId,
    )}`;

  const { supabase } =
    await requireStaff(editPath);

  const onError = (
    message: string,
  ): never =>
    redirectToEditError(
      sectionId,
      message,
    );

  const {
    data: currentSection,
    error: currentSectionError,
  } = await supabase
    .from("forum_sections")
    .select(
      `
        id,
        slug,
        parent_id
      `,
    )
    .eq("id", sectionId)
    .maybeSingle<ForumSectionRecord>();

  if (currentSectionError) {
    onError(
      `Unable to load the forum section: ${currentSectionError.message}`,
    );
  }

  if (!currentSection) {
    redirect(
      "/admin/forum/sections",
    );
  }

  const sectionData =
    validateSectionForm(
      formData,
      onError,
    );

  const {
    data: duplicateSection,
    error: duplicateCheckError,
  } = await supabase
    .from("forum_sections")
    .select("id")
    .eq("slug", sectionData.slug)
    .neq("id", sectionId)
    .maybeSingle();

  if (duplicateCheckError) {
    onError(
      `Unable to verify the section slug: ${duplicateCheckError.message}`,
    );
  }

  if (duplicateSection) {
    onError(
      "Another forum section already uses this slug.",
    );
  }

  await verifyAssociation(
    supabase,
    sectionData.association_id,
    onError,
  );

  await verifyParentSection(
    supabase,
    sectionData.parent_id,
    sectionId,
    onError,
  );

  const {
    error: updateError,
  } = await supabase
    .from("forum_sections")
    .update(sectionData)
    .eq("id", sectionId);

  if (updateError) {
    if (
      updateError.code === "23505"
    ) {
      onError(
        "Another forum section already uses this slug.",
      );
    }

    onError(
      `Unable to update the forum section: ${updateError.message}`,
    );
  }

  revalidateForumPaths(
    currentSection.slug,
  );

  if (
    sectionData.slug !==
    currentSection.slug
  ) {
    revalidateForumPaths(
      sectionData.slug,
    );
  }

  redirectToEditSuccess(
    sectionId,
    "The forum section has been updated.",
  );
}

export async function toggleForumSectionStatusAction(
  formData: FormData,
): Promise<void> {
  const sectionId = getStringValue(
    formData,
    "section_id",
  );

  if (!sectionId) {
    redirect(
      "/admin/forum/sections",
    );
  }

  const editPath =
    `/admin/forum/sections/${encodeURIComponent(
      sectionId,
    )}`;

  const { supabase } =
    await requireStaff(editPath);

  const {
    data: section,
    error: sectionError,
  } = await supabase
    .from("forum_sections")
    .select(
      `
        id,
        slug,
        is_active
      `,
    )
    .eq("id", sectionId)
    .maybeSingle<{
      id: string;
      slug: string;
      is_active: boolean;
    }>();

  if (sectionError) {
    redirectToEditError(
      sectionId,
      `Unable to load the forum section: ${sectionError.message}`,
    );
  }

  if (!section) {
    redirect(
      "/admin/forum/sections",
    );
  }

  const nextStatus =
    !section.is_active;

  const {
    error: updateError,
  } = await supabase
    .from("forum_sections")
    .update({
      is_active: nextStatus,
    })
    .eq("id", sectionId);

  if (updateError) {
    redirectToEditError(
      sectionId,
      `Unable to change the section status: ${updateError.message}`,
    );
  }

  revalidateForumPaths(
    section.slug,
  );

  redirectToEditSuccess(
    sectionId,
    nextStatus
      ? "The forum section has been activated."
      : "The forum section has been hidden.",
  );
}

export async function deleteForumSectionAction(
  formData: FormData,
): Promise<void> {
  const sectionId = getStringValue(
    formData,
    "section_id",
  );

  if (!sectionId) {
    redirect(
      "/admin/forum/sections",
    );
  }

  const editPath =
    `/admin/forum/sections/${encodeURIComponent(
      sectionId,
    )}`;

  const { supabase } =
    await requireStaff(editPath);

  const confirmation =
    getStringValue(
      formData,
      "confirmation",
    );

  if (confirmation !== "DELETE") {
    redirectToEditError(
      sectionId,
      'Type "DELETE" to confirm permanent deletion.',
    );
  }

  const {
    data: section,
    error: sectionError,
  } = await supabase
    .from("forum_sections")
    .select(
      `
        id,
        slug
      `,
    )
    .eq("id", sectionId)
    .maybeSingle<{
      id: string;
      slug: string;
    }>();

  if (sectionError) {
    redirectToEditError(
      sectionId,
      `Unable to load the forum section: ${sectionError.message}`,
    );
  }

  if (!section) {
    redirect(
      "/admin/forum/sections",
    );
  }

  const [
    {
      count: topicCount,
      error: topicCountError,
    },
    {
      count: childSectionCount,
      error: childSectionCountError,
    },
  ] = await Promise.all([
    supabase
      .from("forum_topics")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("section_id", sectionId),

    supabase
      .from("forum_sections")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("parent_id", sectionId),
  ]);

  if (topicCountError) {
    redirectToEditError(
      sectionId,
      `Unable to inspect the section topics: ${topicCountError.message}`,
    );
  }

  if (childSectionCountError) {
    redirectToEditError(
      sectionId,
      `Unable to inspect child sections: ${childSectionCountError.message}`,
    );
  }

  if (
    typeof topicCount === "number" &&
    topicCount > 0
  ) {
    redirectToEditError(
      sectionId,
      "This section cannot be deleted because it contains forum topics. Move or delete those topics first.",
    );
  }

  if (
    typeof childSectionCount ===
      "number" &&
    childSectionCount > 0
  ) {
    redirectToEditError(
      sectionId,
      "This section cannot be deleted because other sections use it as their parent.",
    );
  }

  const {
    error: deletionError,
  } = await supabase
    .from("forum_sections")
    .delete()
    .eq("id", sectionId);

  if (deletionError) {
    redirectToEditError(
      sectionId,
      `Unable to delete the forum section: ${deletionError.message}`,
    );
  }

  revalidateForumPaths(
    section.slug,
  );

  redirect(
    `/admin/forum/sections?success=${encodeURIComponent(
      "The forum section has been permanently deleted.",
    )}`,
  );
}

