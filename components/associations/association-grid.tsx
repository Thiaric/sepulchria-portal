import { AssociationCard } from "@/components/associations/association-card";
import { CodexEntryGrid } from "@/components/codex/codex-entry-grid";
import type { Association } from "@/types/codex";

type AssociationGridProps = {
  associations: Association[];
};

export function AssociationGrid({
  associations,
}: AssociationGridProps) {
  return (
    <CodexEntryGrid
      emptyTitle="No associations available"
      emptyText="There are currently no active associations in the Sepulchria Codex."
    >
      {associations.map((association) => (
        <AssociationCard
          key={association.id}
          association={association}
        />
      ))}
    </CodexEntryGrid>
  );
}