import type { Metadata } from "next";

import { CharacterDirectory } from "@/components/characters/character-directory";
import { getPublicCharacters } from "@/lib/characters/get-public-character";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Characters | Sepulchria",
  description:
    "Browse the approved characters of Sepulchria.",
};

export default async function CharactersPage() {
  const supabase = await createClient();

  const [
    characters,
    {
      data: { user },
    },
  ] = await Promise.all([
    getPublicCharacters(),
    supabase.auth.getUser(),
  ]);

  let viewerCharacterId: string | null =
    null;

  if (user) {
    const {
      data: viewerCharacter,
      error,
    } = await supabase
      .from("characters")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    viewerCharacterId =
      viewerCharacter?.id ?? null;
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <header className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))]/95 p-6 sm:p-8">
        <p className="text-[10px] uppercase tracking-[0.28em] text-[rgb(var(--sep-colour-886c48))]">
          Sepulchria's People
        </p>

        

        <p className="mt-4 max-w-3xl text-sm leading-7 text-[rgb(var(--sep-colour-9f9281))]">
          Browse the people currently shaping the
          history, politics and daily life of
          Sepulchria.
        </p>
      </header>

      <CharacterDirectory
        characters={characters}
        viewerCharacterId={viewerCharacterId}
      />
    </div>
  );
}
