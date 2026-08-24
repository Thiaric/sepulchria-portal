"use server";



import { redirect } from "next/navigation";
import {
  revalidatePath,
} from "next/cache";

import {
  requireAdminSection,
} from "@/lib/auth/require-staff";
import { sanitizeRichHtml } from "@/lib/rich-text";
import { createClient } from "@/lib/supabase/server";

function cleanText(
  value: FormDataEntryValue | null,
) {
  return String(value ?? "").trim();
}

function cleanOptionalText(
  value: FormDataEntryValue | null,
) {
  const result = cleanText(value);
  return result || null;
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

function refreshRules() {
  revalidatePath("/rules");
  revalidatePath("/admin/rules");
}

export async function createRuleCategory(
  formData: FormData,
) {
  await requireAdminSection("rules");

  const name = cleanText(
    formData.get("name"),
  );
  const slug = cleanText(
    formData.get("slug"),
  );

  if (!name || !slug) {
    throw new Error(
      "Name and slug are required.",
    );
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("rule_categories")
    .insert({
      name,
      slug,
      summary: cleanOptionalText(
        formData.get("summary"),
      ),
      sort_order: cleanInteger(
        formData.get("sort_order"),
      ),
      is_active:
        formData.get("is_active") ===
        "on",
    });

  if (error) {
    throw new Error(error.message);
  }

  refreshRules();
}

export async function updateRuleCategory(
  formData: FormData,
) {
  await requireAdminSection("rules");

  const id = cleanText(
    formData.get("id"),
  );

  if (!id) {
    throw new Error(
      "Category id is required.",
    );
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("rule_categories")
    .update({
      name: cleanText(
        formData.get("name"),
      ),
      slug: cleanText(
        formData.get("slug"),
      ),
      summary: cleanOptionalText(
        formData.get("summary"),
      ),
      sort_order: cleanInteger(
        formData.get("sort_order"),
      ),
      is_active:
        formData.get("is_active") ===
        "on",
    })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  refreshRules();
}

export async function createRuleEntry(
  formData: FormData,
) {
  await requireAdminSection("rules");

  const title = cleanText(
    formData.get("title"),
  );
  const slug = cleanText(
    formData.get("slug"),
  );
  const categoryId = cleanText(
    formData.get("category_id"),
  );

  if (
    !title ||
    !slug ||
    !categoryId
  ) {
    throw new Error(
      "Title, slug and category are required.",
    );
  }

  const rawSummary = cleanText(
    formData.get("summary"),
  );
  const rawBody = cleanText(
    formData.get("body"),
  );

  const status =
    formData.get("status") ===
    "published"
      ? "published"
      : "draft";

  const supabase = await createClient();

  const { error } = await supabase
    .from("rule_entries")
    .insert({
      category_id: categoryId,
      title,
      slug,
      summary: rawSummary
        ? sanitizeRichHtml(rawSummary)
        : null,
      body: sanitizeRichHtml(rawBody),
      sort_order: cleanInteger(
        formData.get("sort_order"),
      ),
      status,
      published_at:
        status === "published"
          ? new Date().toISOString()
          : null,
    });

  if (error) {
    throw new Error(error.message);
  }

  refreshRules();
}

export async function updateRuleEntry(
  formData: FormData,
) {
  await requireAdminSection("rules");

  const id = cleanText(
    formData.get("id"),
  );

  if (!id) {
    throw new Error(
      "Rule id is required.",
    );
  }

  const rawSummary = cleanText(
    formData.get("summary"),
  );
  const rawBody = cleanText(
    formData.get("body"),
  );

  const status =
    formData.get("status") ===
    "published"
      ? "published"
      : "draft";

  const supabase = await createClient();

  const { error } = await supabase
    .from("rule_entries")
    .update({
      category_id: cleanText(
        formData.get("category_id"),
      ),
      title: cleanText(
        formData.get("title"),
      ),
      slug: cleanText(
        formData.get("slug"),
      ),
      summary: rawSummary
        ? sanitizeRichHtml(rawSummary)
        : null,
      body: sanitizeRichHtml(rawBody),
      sort_order: cleanInteger(
        formData.get("sort_order"),
      ),
      status,
      published_at:
        status === "published"
          ? new Date().toISOString()
          : null,
    })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  refreshRules();
}

export async function deleteRuleEntry(
  formData: FormData,
) {
  await requireAdminSection("rules");

  const id = cleanText(
    formData.get("id"),
  );

  const supabase = await createClient();

  const { error } = await supabase
    .from("rule_entries")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  refreshRules();
}

export async function createGlossaryEntry(
  formData: FormData,
) {
  await requireAdminSection("rules");

  const term = cleanText(
    formData.get("term"),
  );
  const slug = cleanText(
    formData.get("slug"),
  );
  const definition = cleanText(
    formData.get("definition"),
  );

  if (!term || !slug || !definition) {
    throw new Error(
      "Term, slug and definition are required.",
    );
  }

  const status =
    formData.get("status") ===
    "published"
      ? "published"
      : "draft";

  const supabase = await createClient();

  const { error } = await supabase
    .from("rule_glossary")
    .insert({
      term,
      slug,
      definition:
        sanitizeRichHtml(
          definition,
        ),
      related_rule_id:
        cleanOptionalText(
          formData.get(
            "related_rule_id",
          ),
        ),
      sort_order: cleanInteger(
        formData.get("sort_order"),
      ),
      status,
      published_at:
        status === "published"
          ? new Date().toISOString()
          : null,
    });

  if (error) {
    throw new Error(error.message);
  }

  refreshRules();
}

export async function updateGlossaryEntry(
  formData: FormData,
) {
  await requireAdminSection("rules");

  const id = cleanText(
    formData.get("id"),
  );

  const status =
    formData.get("status") ===
    "published"
      ? "published"
      : "draft";

  const supabase = await createClient();

  const { error } = await supabase
    .from("rule_glossary")
    .update({
      term: cleanText(
        formData.get("term"),
      ),
      slug: cleanText(
        formData.get("slug"),
      ),
      definition:
        sanitizeRichHtml(
          cleanText(
            formData.get(
              "definition",
            ),
          ),
        ),
      related_rule_id:
        cleanOptionalText(
          formData.get(
            "related_rule_id",
          ),
        ),
      sort_order: cleanInteger(
        formData.get("sort_order"),
      ),
      status,
      published_at:
        status === "published"
          ? new Date().toISOString()
          : null,
    })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  refreshRules();
}

export async function deleteGlossaryEntry(
  formData: FormData,
) {
  await requireAdminSection("rules");

  const id = cleanText(
    formData.get("id"),
  );

  const supabase = await createClient();

  const { error } = await supabase
    .from("rule_glossary")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  refreshRules();
}

export async function createRuleLink(
  formData: FormData,
) {
  await requireAdminSection("rules");

  const sourceRuleId = cleanText(
    formData.get("source_rule_id"),
  );
  const targetRuleId = cleanText(
    formData.get("target_rule_id"),
  );

  if (
    !sourceRuleId ||
    !targetRuleId
  ) {
    throw new Error(
      "Both rules are required.",
    );
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("rule_links")
    .insert({
      source_rule_id:
        sourceRuleId,
      target_rule_id:
        targetRuleId,
      label: cleanOptionalText(
        formData.get("label"),
      ),
      sort_order: cleanInteger(
        formData.get("sort_order"),
      ),
    });

  if (error) {
    throw new Error(error.message);
  }

  refreshRules();
}

export async function deleteRuleLink(
  formData: FormData,
) {
  await requireAdminSection("rules");

  const id = cleanText(
    formData.get("id"),
  );

  const supabase = await createClient();

  const { error } = await supabase
    .from("rule_links")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  refreshRules();
}
