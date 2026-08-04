import { CodexEntryCard } from "@/components/codex/codex-entry-card";
import type { Race } from "@/types/codex";

type RaceCardProps = {
  race: Race;
};

export function RaceCard({
  race,
}: RaceCardProps) {
  return (
    <CodexEntryCard
      name={race.name}
      slug={race.slug}
      summary={race.summary}
      hrefBase="/races"
      imageUrl={race.image_url}
      iconUrl={race.icon_url}
      colour={race.colour}
      categoryLabel="People of Aureth"
    />
  );
}