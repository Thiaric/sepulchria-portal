import type { Metadata } from "next";

import { CharacterDirectory } from "@/components/characters/character-directory";
import { getPublicCharacters } from "@/lib/characters/get-public-character";

export const metadata: Metadata = {
  title: "Characters | Sepulchria",
  description:
    "Browse the approved characters of Sepulchria.",
};

export default async function CharactersPage() {
  const characters = await getPublicCharacters();

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <header className="border border-[#60482e]/45 bg-[#15100d]/95 p-6 sm:p-8">
        <p className="text-[10px] uppercase tracking-[0.28em] text-[#886c48]">
          Sepulchria archive
        </p>

        <h1 className="mt-3 font-serif text-4xl text-[#e0c99e] sm:text-5xl">
          Characters
        </h1>

        <p className="mt-4 max-w-3xl text-sm leading-7 text-[#9f9281]">
          Browse the people currently shaping the
          history, politics and daily life of
          Sepulchria.
        </p>
      </header>

      <CharacterDirectory
        characters={characters}
      />
    </div>
  );
}