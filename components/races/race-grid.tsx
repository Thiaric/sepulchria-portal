import { CodexEntryGrid } from "@/components/codex/codex-entry-grid";
import { RaceCard } from "@/components/races/race-card";
import type { Race } from "@/types/codex";

type RaceGridProps = {
  races: Race[];
};

export function RaceGrid({
  races,
}: RaceGridProps) {
  return (
    <CodexEntryGrid
      emptyTitle="No ancestries available"
      emptyText="There are currently no active ancestries in the Sepulchria Codex."
    >
      {races.map((race) => (
        <RaceCard
          key={race.id}
          race={race}
        />
      ))}
    </CodexEntryGrid>
  );
}