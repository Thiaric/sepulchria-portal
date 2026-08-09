export function ExpertiseDisplay({
  expertise,
}: {
  expertise: number | null | undefined;
}) {
  const value = Number(expertise ?? 0);

  return (
    <div className="border border-[#60482e]/45 bg-[#15100d]/95 px-4 py-3">
      <p className="text-[9px] uppercase tracking-[0.22em] text-[#806b50]">
        Expertise
      </p>
      <p className="mt-1 font-serif text-2xl text-[#e0c79d]">
        {value.toFixed(1)}
      </p>
    </div>
  );
}
