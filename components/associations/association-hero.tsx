import { CodexEntryHero } from "@/components/codex/codex-entry-hero";
import type { Association } from "@/types/codex";

type AssociationHeroProps = {
  association: Association;
};

export function AssociationHero({
  association,
}: AssociationHeroProps) {
  return (
    <CodexEntryHero
      name={association.name}
      summary={association.summary}
      description={association.description}
      bannerUrl={association.banner_url}
      imageUrl={association.image_url}
      iconUrl={association.icon_url}
      colour={association.colour}
      categoryLabel="Association"
      returnHref="/associations"
      returnLabel="Back to associations"
    />
  );
}