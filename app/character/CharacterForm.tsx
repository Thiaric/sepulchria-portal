type CharacterData = Record<string, string | null | undefined>;

export default function CharacterForm({ action, character, submitLabel }: { action: (formData: FormData) => void | Promise<void>; character?: CharacterData; submitLabel: string }) {
  const fields = [
    ["First name", "first_name", true], ["Surname", "surname", true], ["Pronouns", "pronouns", false],
    ["Date of birth", "date_of_birth", false, "date"], ["Birthplace", "birthplace", false], ["Origin", "origin", false],
    ["Occupation", "occupation", false], ["Faction", "faction", false], ["Title", "title", false], ["Portrait URL", "portrait_url", false, "url"],
  ] as const;
  const areas = [["Physical description", "physical_description", 8], ["Personality", "personality", 8], ["Biography", "biography", 12], ["Public notes", "public_notes", 6]] as const;
  return (
    <form action={action} className="border border-[#6c5132]/50 bg-[#17110d]/95">
      <div className="grid gap-6 p-6 sm:grid-cols-2 sm:p-8">
        {fields.map(([label, name, required, type = "text"]) => <label key={name} className="block"><span className="mb-2 block text-[11px] uppercase tracking-[0.25em] text-[#a38357]">{label}{required ? " *" : ""}</span><input name={name} type={type} required={required} defaultValue={character?.[name] ?? ""} className="w-full border border-[#654c31] bg-[#0f0c09] px-4 py-3 text-sm text-[#dfceb0] outline-none focus:border-[#a17a45]" /></label>)}
        {areas.map(([label, name, rows]) => <label key={name} className="block sm:col-span-2"><span className="mb-2 block text-[11px] uppercase tracking-[0.25em] text-[#a38357]">{label}</span><textarea name={name} rows={rows} defaultValue={character?.[name] ?? ""} className="w-full resize-y border border-[#654c31] bg-[#0f0c09] px-4 py-3 text-sm leading-6 text-[#dfceb0] outline-none focus:border-[#a17a45]" /></label>)}
      </div>
      <div className="border-t border-[#5d452d]/40 bg-[#110d0a] p-6 text-right sm:p-8"><button className="border border-[#95703f] bg-[#3c2b1a] px-7 py-3 text-xs uppercase tracking-[0.25em] text-[#f0d39b] hover:bg-[#513923]">{submitLabel}</button></div>
    </form>
  );
}
