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
    <div className="mx-auto w-full max-w-7xl space-y-6 py-2 px-2">
      

      <CharacterDirectory
        characters={characters}
        viewerCharacterId={viewerCharacterId}
      />
    </div>
  );
}
