import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PublicCharacterProfileView } from "@/components/characters/public-character-profile";
import { getPublicCharacter } from "@/lib/characters/get-public-character";

type PublicCharacterPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({
  params,
}: PublicCharacterPageProps): Promise<Metadata> {
  const { slug } = await params;
  const character =
    await getPublicCharacter(slug);

  if (!character) {
    return {
      title: "Character Not Found | Sepulchria",
    };
  }

  const characterName =
    character.display_name?.trim() ||
    `${character.first_name} ${character.surname}`.trim();

  return {
    title: `${characterName} | Sepulchria`,
    description:
      character.biography?.slice(0, 155) ??
      `Public character profile for ${characterName}.`,
  };
}

export default async function PublicCharacterPage({
  params,
}: PublicCharacterPageProps) {
  const { slug } = await params;

  const character =
    await getPublicCharacter(slug);

  if (!character) {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-7xl">
      <PublicCharacterProfileView
        character={character}
      />
    </div>
  );
}