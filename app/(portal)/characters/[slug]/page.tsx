import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { PublicCharacterProfileView } from "@/components/characters/public-character-profile";
import { LiveCharacterSheetRefresh } from "@/components/characters/live-character-sheet-refresh";
import { getPublicCharacter } from "@/lib/characters/get-public-character";
import { getStaffSession } from "@/lib/auth/require-staff";
import { hasCharacterFeature } from "@/lib/features/character-feature-entitlements";
import { createClient } from "@/lib/supabase/server";

type PublicCharacterPageProps = {
  params: Promise<{
    slug: string;
  }>;

  searchParams: Promise<{
    from?: string;
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
  searchParams,
}: PublicCharacterPageProps) {
  const [{ slug }, { from }] = await Promise.all([
    params,
    searchParams,
  ]);

  const character =
    await getPublicCharacter(slug);

  if (!character) {
    notFound();
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const [
    activeCharacterResult,
    staffSession,
  ] = await Promise.all([
    supabase
      .from("characters")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle(),
    getStaffSession(),
  ]);

  const {
    data: activeCharacter,
    error: activeCharacterError,
  } = activeCharacterResult;

  if (activeCharacterError) {
    throw new Error(
      `Unable to identify active character: ${activeCharacterError.message}`,
    );
  }

  const canUseFriendList =
    activeCharacter &&
    activeCharacter.id !== character.id
      ? await hasCharacterFeature(
          activeCharacter.id,
          "friend_list",
        )
      : false;

  const returnHref =
    from === "game"
      ? "/game"
      : "/characters";

  const returnLabel =
    from === "game"
      ? "Back to chat"
      : "Back to characters";

  return (
    <div className="mx-auto w-full max-w-7xl p-6">
      <LiveCharacterSheetRefresh
        characterId={character.id}
        raceId={
          character.race?.id ??
          null
        }
      />

      <PublicCharacterProfileView
        character={character}
        returnHref={returnHref}
        returnLabel={returnLabel}
        canMessage={
          Boolean(activeCharacter) &&
          activeCharacter?.id !== character.id
        }
        canViewLastActivity={
          character.show_last_activity ||
          staffSession !== null ||
          activeCharacter?.id === character.id
        }
        canUseFriendList={
          canUseFriendList
        }
      />
    </div>
  );
}