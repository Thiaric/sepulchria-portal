import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

export type PublicCodexChapter = {
  id: string;
  title: string;
  slug: string;
  chapter_number: number;
  summary: string | null;
  description: string | null;
  banner_url: string | null;
  image_url: string | null;
  colour: string | null;
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
          summary,
          description,
          banner_url,
          image_url,
          colour,
          sort_order
        `,
      )
      .eq("visibility", "public")
      .eq("status", "published")
      .not("chapter_number", "is", null)
      .gte("chapter_number", 1)
      .lte("chapter_number", 10)
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
    })) as PublicCodexChapter[];
  },
);
