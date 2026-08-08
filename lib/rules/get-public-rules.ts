import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

export type PublicRuleCategory = {
  id: string;
  name: string;
  slug: string;
  summary: string | null;
  sort_order: number;
};

export type PublicRuleEntry = {
  id: string;
  category_id: string;
  title: string;
  slug: string;
  summary: string | null;
  body: string;
  sort_order: number;
};

export type PublicRuleLink = {
  source_rule_id: string;
  target_rule_id: string;
  label: string | null;
  sort_order: number;
};

export type PublicGlossaryEntry = {
  id: string;
  term: string;
  slug: string;
  definition: string;
  related_rule_id: string | null;
  sort_order: number;
};

export type PublicRulesData = {
  categories: PublicRuleCategory[];
  rules: PublicRuleEntry[];
  links: PublicRuleLink[];
  glossary: PublicGlossaryEntry[];
};

export const getPublicRules = cache(
  async (): Promise<PublicRulesData> => {
    const supabase = await createClient();

    const [
      categoriesResult,
      rulesResult,
      linksResult,
      glossaryResult,
    ] = await Promise.all([
      supabase
        .from("rule_categories")
        .select(
          "id, name, slug, summary, sort_order",
        )
        .eq("is_active", true)
        .order("sort_order", {
          ascending: true,
        })
        .order("name", {
          ascending: true,
        }),

      supabase
        .from("rule_entries")
        .select(
          "id, category_id, title, slug, summary, body, sort_order",
        )
        .eq("status", "published")
        .order("sort_order", {
          ascending: true,
        })
        .order("title", {
          ascending: true,
        }),

      supabase
        .from("rule_links")
        .select(
          "source_rule_id, target_rule_id, label, sort_order",
        )
        .order("sort_order", {
          ascending: true,
        }),

      supabase
        .from("rule_glossary")
        .select(
          "id, term, slug, definition, related_rule_id, sort_order",
        )
        .eq("status", "published")
        .order("sort_order", {
          ascending: true,
        })
        .order("term", {
          ascending: true,
        }),
    ]);

    const error =
      categoriesResult.error ??
      rulesResult.error ??
      linksResult.error ??
      glossaryResult.error;

    if (error) {
      throw new Error(
        `Unable to load Rules: ${error.message}`,
      );
    }

    return {
      categories:
        (categoriesResult.data ??
          []) as PublicRuleCategory[],
      rules:
        (rulesResult.data ??
          []) as PublicRuleEntry[],
      links:
        (linksResult.data ??
          []) as PublicRuleLink[],
      glossary:
        (glossaryResult.data ??
          []) as PublicGlossaryEntry[],
    };
  },
);
