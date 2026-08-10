import { CodexEntryCard } from "@/components/codex/codex-entry-card";
import type { Association } from "@/types/codex";

type AssociationCardProps = {
  association: Association;
};

export function AssociationCard({
  association,
}: AssociationCardProps) {
  return (
    <CodexEntryCard
      name={association.name}
      slug={association.slug}
      summary={association.summary}
      hrefBase="/associations"
      imageUrl={association.image_url}
      iconUrl={association.icon_url}
      colour={association.colour}
      categoryLabel="Body of the City"
      enableImagePreview
    />
  );
}
