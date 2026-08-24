import { notFound } from "next/navigation";

import { PublicCodex } from "@/components/codex/public-codex";
import {
  requireAdminSection,
} from "@/lib/auth/require-staff";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  PublicCodexChapter,
} from "@/lib/codex/get-codex";

export const dynamic =
  "force-dynamic";

type CodexPreviewPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function CodexPreviewPage({
  params,
}: CodexPreviewPageProps) {
  await requireAdminSection(
    "codex",
  );

  const { id } = await params;

  const supabase =
    createAdminClient();

  const { data, error } =
    await supabase
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
      .eq("id", id)
      .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (
    !data ||
    data.chapter_number == null
  ) {
    notFound();
  }

  const chapter: PublicCodexChapter = {
    id: data.id,
    title: data.title,
    slug: data.slug,
    chapter_number:
      data.chapter_number,
    body: data.body ?? "",
    sort_order:
      data.sort_order ?? 0,
  };

  return (
    <PublicCodex
      chapters={[chapter]}
    />
  );
}
