import type { Metadata } from "next";

import { RaceGrid } from "@/components/races/race-grid";
import { getRaces } from "@/lib/races";

export const metadata: Metadata = {
  title: "Ancestries | Sepulchria",
  description:
    "Discover the peoples and lineages available in the world of Aureth.",
};

export default async function RacesPage() {
  const races = await getRaces();

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-5 sm:p-7 lg:p-9 ancestries_page_div_container">
      <header className="relative overflow-hidden border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))]/95 px-6 py-5 sm:px-8 ancestries_page_header_header">
  <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_top_right,rgba(var(--sep-rgb-145-105-60),0.35),transparent_42%)] ancestries_page_div_container_2" />

  <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-8 ancestries_page_div_container_3">
    <div className="min-w-0 ancestries_page_div_container_4">
      <p className="text-[10px] uppercase tracking-[0.28em] text-[rgb(var(--sep-colour-886c48))] ancestries_page_p_text">
        The peoples of Aureth
      </p>


      <p className="mt-3 max-w-3xl text-sm leading-6 text-[rgb(var(--sep-colour-9f9281))] ancestries_page_p_text_2">
        The peoples of Aureth differ in ancestry, appearance,
        culture and their relationship with the Current. Explore
        each entry before choosing the lineage of your character.
      </p>
    </div>

    <div className="shrink-0 border border-[rgb(var(--sep-colour-60482e))]/45 bg-black/20 px-5 py-3 ancestries_page_div_container_5">
      <span className="block text-[9px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-806b50))] ancestries_page_span_text">
        Current Ancestries
      </span>

      <span className="mt-1 block font-serif text-xl text-[rgb(var(--sep-colour-d4bd94))] ancestries_page_span_text_2">
        {races.length}
      </span>
    </div>
  </div>
</header>

      <RaceGrid races={races} />
    </div>
  );
}