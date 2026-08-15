import { CodexEntryHero } from "@/components/codex/codex-entry-hero";
import { AncestryAttributeModifiers } from "@/components/races/ancestry-attribute-modifiers";
import type { Race } from "@/types/codex";

type RaceHeroProps = {
  race: Race;
};

export function RaceHero({
  race,
}: RaceHeroProps) {
  return (
    <CodexEntryHero
      name={race.name}
      summary={race.summary}
      description={race.description}
      bannerUrl={race.banner_url}
      imageUrl={race.image_url}
      iconUrl={race.icon_url}
      colour={race.colour}
      categoryLabel="Ancestry"
      returnHref="/races"
      returnLabel="Back to ancestries"
      betweenHeroAndRecord={
        <AncestryAttributeModifiers modifiers={race} />
      }
    />
  );
}