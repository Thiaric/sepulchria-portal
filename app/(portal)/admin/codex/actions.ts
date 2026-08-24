"use server";

import {
  revalidatePath,
} from "next/cache";
import { redirect } from "next/navigation";

import {
  requireAdminSection,
} from "@/lib/auth/require-staff";
import { sanitizeRichHtml } from "@/lib/rich-text";
import { createAdminClient } from "@/lib/supabase/admin";

function cleanText(
  value: FormDataEntryValue | null,
) {
  return String(value ?? "").trim();
}

function cleanInteger(
  value: FormDataEntryValue | null,
  fallback = 0,
) {
  const parsed = Number.parseInt(
    String(value ?? ""),
    10,
  );

  return Number.isFinite(parsed)
    ? parsed
    : fallback;
}

function cleanSlug(
  value: FormDataEntryValue | null,
) {
  return cleanText(value).toLowerCase();
}

function validateSlug(slug: string) {
  if (
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(
      slug,
    )
  ) {
    throw new Error(
      "Slug may only contain lowercase letters, numbers and single hyphens.",
    );
  }
}

function validateChapterNumber(
  chapterNumber: number,
) {
  if (
    !Number.isInteger(chapterNumber) ||
    chapterNumber < 1 ||
    chapterNumber > 10
  ) {
    throw new Error(
      "Chapter number must be a whole number from 1 to 10.",
    );
  }
}

function visibleBodyHasText(
  body: string,
) {
  return body
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim().length > 0;
}

async function assertUnique(
  slug: string,
  chapterNumber: number,
  exceptId?: string,
) {
  const supabase =
    createAdminClient();

  let slugQuery = supabase
    .from("codex_chapters")
    .select("id")
    .ilike("slug", slug);

  let numberQuery = supabase
    .from("codex_chapters")
    .select("id")
    .eq(
      "chapter_number",
      chapterNumber,
    );

  if (exceptId) {
    slugQuery =
      slugQuery.neq("id", exceptId);
    numberQuery =
      numberQuery.neq(
        "id",
        exceptId,
      );
  }

  const [
    slugResult,
    numberResult,
  ] = await Promise.all([
    slugQuery.limit(1),
    numberQuery.limit(1),
  ]);

  if (slugResult.error) {
    throw new Error(
      slugResult.error.message,
    );
  }

  if (numberResult.error) {
    throw new Error(
      numberResult.error.message,
    );
  }

  if (
    (slugResult.data ?? []).length > 0
  ) {
    throw new Error(
      "Another Codex chapter already uses this slug.",
    );
  }

  if (
    (numberResult.data ?? []).length > 0
  ) {
    throw new Error(
      `Chapter ${chapterNumber} already exists.`,
    );
  }
}

function refreshCodex(id?: string) {
  revalidatePath("/codex");
  revalidatePath("/admin/codex");

  if (id) {
    revalidatePath(
      `/admin/codex/${id}`,
    );
    revalidatePath(
      `/admin/codex/${id}/preview`,
    );
  }
}

export async function createCodexChapter(
  formData: FormData,
) {
  const staff =
    await requireAdminSection(
      "codex",
    );

  const title = cleanText(
    formData.get("title"),
  );
  const slug = cleanSlug(
    formData.get("slug"),
  );
  const chapterNumber =
    cleanInteger(
      formData.get(
        "chapter_number",
      ),
    );
  const sortOrder =
    cleanInteger(
      formData.get("sort_order"),
      chapterNumber,
    );
  const body = sanitizeRichHtml(
    cleanText(
      formData.get("body"),
    ),
  );

  if (!title || !slug) {
    throw new Error(
      "Title and slug are required.",
    );
  }

  validateSlug(slug);
  validateChapterNumber(
    chapterNumber,
  );

  await assertUnique(
    slug,
    chapterNumber,
  );

  const supabase =
    createAdminClient();

  const now =
    new Date().toISOString();

  const { data, error } =
    await supabase
      .from("codex_chapters")
      .insert({
        title,
        slug,
        chapter_number:
          chapterNumber,
        sort_order: sortOrder,
        body,
        status: "draft",
        created_by:
          staff.userId,
        updated_by:
          staff.userId,
        created_at: now,
        updated_at: now,
        published_at: null,
      })
      .select("id")
      .single();

  if (error) {
    throw new Error(error.message);
  }

  refreshCodex(data.id);

  redirect(
    `/admin/codex/${data.id}`,
  );
}

export async function updateCodexChapter(
  formData: FormData,
) {
  const staff =
    await requireAdminSection(
      "codex",
    );

  const id = cleanText(
    formData.get("id"),
  );
  const title = cleanText(
    formData.get("title"),
  );
  const slug = cleanSlug(
    formData.get("slug"),
  );
  const chapterNumber =
    cleanInteger(
      formData.get(
        "chapter_number",
      ),
    );
  const sortOrder =
    cleanInteger(
      formData.get("sort_order"),
      chapterNumber,
    );
  const body = sanitizeRichHtml(
    cleanText(
      formData.get("body"),
    ),
  );

  if (!id) {
    throw new Error(
      "Chapter id is required.",
    );
  }

  if (!title || !slug) {
    throw new Error(
      "Title and slug are required.",
    );
  }

  validateSlug(slug);
  validateChapterNumber(
    chapterNumber,
  );

  await assertUnique(
    slug,
    chapterNumber,
    id,
  );

  const supabase =
    createAdminClient();

  const { error } =
    await supabase
      .from("codex_chapters")
      .update({
        title,
        slug,
        chapter_number:
          chapterNumber,
        sort_order: sortOrder,
        body,
        updated_by:
          staff.userId,
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  refreshCodex(id);
}

export async function publishCodexChapter(
  formData: FormData,
) {
  const staff =
    await requireAdminSection(
      "codex",
    );

  const id = cleanText(
    formData.get("id"),
  );

  if (!id) {
    throw new Error(
      "Chapter id is required.",
    );
  }

  const supabase =
    createAdminClient();

  const {
    data: chapter,
    error: loadError,
  } = await supabase
    .from("codex_chapters")
    .select(
      "id,title,slug,chapter_number,body",
    )
    .eq("id", id)
    .maybeSingle();

  if (loadError) {
    throw new Error(
      loadError.message,
    );
  }

  if (!chapter) {
    throw new Error(
      "Codex chapter not found.",
    );
  }

  const title =
    String(chapter.title ?? "").trim();
  const slug =
    String(chapter.slug ?? "")
      .trim()
      .toLowerCase();
  const chapterNumber =
    Number(chapter.chapter_number);
  const body =
    String(chapter.body ?? "");

  if (!title || !slug) {
    throw new Error(
      "A chapter needs a title and slug before it can be published.",
    );
  }

  validateSlug(slug);
  validateChapterNumber(
    chapterNumber,
  );

  if (!visibleBodyHasText(body)) {
    throw new Error(
      "Add chapter content before publishing.",
    );
  }

  await assertUnique(
    slug,
    chapterNumber,
    id,
  );

  const now =
    new Date().toISOString();

  const { error } =
    await supabase
      .from("codex_chapters")
      .update({
        status: "published",
        published_at: now,
        updated_at: now,
        updated_by:
          staff.userId,
      })
      .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  refreshCodex(id);
}

export async function unpublishCodexChapter(
  formData: FormData,
) {
  const staff =
    await requireAdminSection(
      "codex",
    );

  const id = cleanText(
    formData.get("id"),
  );

  if (!id) {
    throw new Error(
      "Chapter id is required.",
    );
  }

  const supabase =
    createAdminClient();

  const { error } =
    await supabase
      .from("codex_chapters")
      .update({
        status: "draft",
        published_at: null,
        updated_at:
          new Date().toISOString(),
        updated_by:
          staff.userId,
      })
      .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  refreshCodex(id);
}
