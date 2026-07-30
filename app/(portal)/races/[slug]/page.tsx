import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { RaceHero } from "@/components/races/race-hero";
import { getRaceBySlug } from "@/lib/races";

type RacePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({
  params,
}: RacePageProps): Promise<Metadata> {
  const { slug } = await params;
  const race = await getRaceBySlug(slug);

  if (!race) {
    return {
      title: "Race Not Found | Sepulchria",
    };
  }

  return {
    title: `${race.name} | Races | Sepulchria`,
    description:
      race.summary ||
      `Read the Sepulchria Codex entry for ${race.name}.`,
  };
}

export default async function RacePage({
  params,
}: RacePageProps) {
  const { slug } = await params;
  const race = await getRaceBySlug(slug);

  if (!race) {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-7xl p-5 sm:p-7 lg:p-9">
      <RaceHero race={race} />
    </div>
  );
}