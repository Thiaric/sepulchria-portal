import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

export type PublicCodexChapter = {
  id: string;
  title: string;
  slug: string;
  chapter_number: number;
  body: string;
  sort_order: number;
};

export const getPublicCodexChapters = cache(
  async (): Promise<PublicCodexChapter[]> => {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("codex_chapters")
      .select(
        `
          id,
          title,
          slug,
          chapter_number,
          body,
          sort_order
        `,
      )
      .eq("status", "published")
      .not("chapter_number", "is", null)
      .gte("chapter_number", 1)
      .lte("chapter_number", 10)
      .order("sort_order", {
        ascending: true,
      })
      .order("chapter_number", {
        ascending: true,
      });

    if (error) {
      throw new Error(
        `Unable to load the Codex: ${error.message}`,
      );
    }

    return (data ?? []).map((chapter) => ({
      ...chapter,
      chapter_number:
        chapter.chapter_number as number,
      body: chapter.body ?? "",
      sort_order: chapter.sort_order ?? 0,
    })) as PublicCodexChapter[];
  },
);
