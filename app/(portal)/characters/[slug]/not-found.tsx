import Link from "next/link";

export default function CharacterNotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center characters_slug_not_found_div_container">
      <section className="w-full max-w-xl border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-15100d))] p-8 text-center characters_slug_not_found_section_character_not_found">
        <p className="text-[10px] uppercase tracking-[0.26em] text-[rgb(var(--sep-colour-886b48))] characters_slug_not_found_p_character_not_found">
          Character archive
        </p>

        <h1 className="mt-4 font-serif text-3xl text-[rgb(var(--sep-colour-dfc9a3))] characters_slug_not_found_h1_character_not_found">
          Character not found
        </h1>

        <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-[rgb(var(--sep-colour-9f9282))] characters_slug_not_found_p_character_not_found_2">
          This character does not exist, is not
          currently approved, or is no longer
          publicly available.
        </p>

        <Link
          href="/game"
          className="mt-7 inline-flex border border-[rgb(var(--sep-colour-765937))] bg-[rgb(var(--sep-colour-271c12))] px-5 py-3 text-xs uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-dfc79c))] transition hover:border-[rgb(var(--sep-colour-b28a52))] hover:bg-[rgb(var(--sep-colour-342419))]"
        >
          Return to the game
        </Link>
      </section>
    </div>
  );
}