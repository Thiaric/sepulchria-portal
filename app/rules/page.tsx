import type { Metadata } from "next";
import Link from "next/link";

import { PublicRules } from "@/components/rules/public-rules";
import { getPublicRules } from "@/lib/rules/get-public-rules";

export const metadata: Metadata = {
  title: "Rules | Sepulchria",
  description:
    "Official offgame rules and gameplay documentation for Sepulchria.",
};

type RulesPageProps = {
  searchParams?: Promise<{
    embedded?: string;
    view?: string;
  }>;
};

export default async function RulesPage({
  searchParams,
}: RulesPageProps) {
  const data = await getPublicRules();

  const resolvedSearchParams =
    (await searchParams) ?? {};

  const isEmbedded =
    resolvedSearchParams.embedded === "1";

  const initialView =
    resolvedSearchParams.view === "glossary"
      ? "glossary"
      : "rules";

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

      <PublicRules
        data={data}
        initialView={initialView}
      />
    </div>
  );
}