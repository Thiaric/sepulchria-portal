type CharacterMasterNotesProps = {
  notes: string | null | undefined;
};

export function CharacterMasterNotes({
  notes,
}: CharacterMasterNotesProps) {
  const value = notes?.trim();

  return (
    <section className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))]/80 p-4 components_characters_character_master_notes_section">
      <p className="text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-8c704b))] components_characters_character_master_notes_label">
        Masters&apos; Notes
      </p>

      {value ? (
        <p className="mt-3 whitespace-pre-wrap text-[11px] leading-5 text-[rgb(var(--sep-colour-c9b99d))] components_characters_character_master_notes_text">
          {value}
        </p>
      ) : (
        <p className="mt-3 text-[10px] italic leading-5 text-[rgb(var(--sep-colour-746958))] components_characters_character_master_notes_empty">
          No Masters&apos; Notes recorded.
        </p>
      )}
    </section>
  );
}
