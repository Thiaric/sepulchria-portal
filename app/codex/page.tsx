import type { Metadata } from "next";
import Link from "next/link";

import { PublicCodex } from "@/components/codex/public-codex";
import { getPublicCodexChapters } from "@/lib/codex/get-codex";

export const metadata: Metadata = {
  title:
    "The Codex of the First | Sepulchria",
  description:
    "The ten chapters of the Codex of the First, the public lore record of Aureth and Sepulchria.",
};

type CodexPageProps = {
  searchParams?: Promise<{
    embedded?: string;
  }>;
};

export default async function CodexPage({
  searchParams,
}: CodexPageProps) {
  const chapters =
    await getPublicCodexChapters();

  const resolvedSearchParams =
    (await searchParams) ?? {};

  const isEmbedded =
    resolvedSearchParams.embedded === "1";

  return (
    <div className="relative">
      {!isEmbedded ? (
        <Link
          href="/homepage"
          className="fixed left-4 top-4 z-50 border border-[#60482e]/55 bg-[#100c09]/95 px-3 py-2 text-[8px] uppercase tracking-[0.18em] text-[#b89a6c] shadow-lg transition hover:border-[#9a7445] hover:text-[#e2c38e]"
        >
          ← Back to homepage
        </Link>
      ) : null}

      <PublicCodex chapters={chapters} />
    </div>
  );
}