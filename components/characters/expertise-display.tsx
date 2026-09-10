export function ExpertiseDisplay({
  expertise,
}: {
  expertise: number | null | undefined;
}) {
  const value = Number(expertise ?? 0);

  return (
    <div className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))]/95 px-4 py-3 components_characters_expertise_display_div_container">
      <p className="text-[9px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-806b50))] components_characters_expertise_display_p_text">
        Expertise
      </p>
      <p className="mt-1 font-serif text-2xl text-[rgb(var(--sep-colour-e0c79d))] components_characters_expertise_display_p_text_2">
        {value.toFixed(1)}
      </p>
    </div>
  );
}
