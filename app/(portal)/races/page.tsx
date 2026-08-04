import type { Metadata } from "next";

import { RaceGrid } from "@/components/races/race-grid";
import { getRaces } from "@/lib/races";

export const metadata: Metadata = {
  title: "Races | Sepulchria",
  description:
    "Discover the peoples and lineages available in the world of Aureth.",
};

export default async function RacesPage() {
  const races = await getRaces();

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-5 sm:p-7 lg:p-9">
      <header className="relative overflow-hidden border border-[#60482e]/45 bg-[#15100d]/95 p-6 sm:p-8">
        <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_top_right,rgba(145,105,60,0.35),transparent_42%)]" />

        <div className="relative">
          <p className="text-[10px] uppercase tracking-[0.28em] text-[#886c48]">
            The peoples of Aureth
          </p>

          <h1 className="mt-3 font-serif text-4xl text-[#e0c99e] sm:text-5xl">
            Races
          </h1>

          <p className="mt-4 max-w-3xl text-sm leading-7 text-[#9f9281]">
            The peoples of Aureth differ in ancestry, appearance,
            culture and their relationship with the Current. Explore
            each entry before choosing the lineage of your character.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <div className="border border-[#60482e]/45 bg-black/20 px-4 py-3">
              <span className="block text-[9px] uppercase tracking-[0.22em] text-[#806b50]">
                Current Races
              </span>

              <span className="mt-1 block font-serif text-xl text-[#d4bd94]">
                {races.length}
              </span>
            </div>


          </div>
        </div>
      </header>

      <RaceGrid races={races} />
    </div>
  );
}