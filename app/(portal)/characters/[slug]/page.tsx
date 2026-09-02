import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { PublicCharacterProfileView } from "@/components/characters/public-character-profile";
import type { CharacterSheetTab } from "@/components/characters/character-sheet-tabs";
import { LiveCharacterSheetRefresh } from "@/components/characters/live-character-sheet-refresh";
import { getPublicCharacter } from "@/lib/characters/get-public-character";
import { getStaffSession } from "@/lib/auth/require-staff";
import { isCharacterStaff } from "@/lib/auth/is-character-staff";
import { hasCharacterFeature } from "@/lib/features/character-feature-entitlements";
import { createClient } from "@/lib/supabase/server";
import { getEquippedCosmetic } from "@/lib/cosmetics/get-equipped-cosmetic";

type PublicCharacterPageProps = {
  params: Promise<{
    slug: string;
  }>;

  searchParams: Promise<{
    from?: string;
    tab?: string;
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

function normalisePublicCharacterSheetTab(
  value: string | undefined,
): CharacterSheetTab {
  const allowed: CharacterSheetTab[] = [
    "short",
    "profile",
    "inventory",
    "trophies",
    "gifts",
    "warping",
    "offgame",
    "audit",
  ];

  return value && allowed.includes(value as CharacterSheetTab)
    ? (value as CharacterSheetTab)
    : "short";
}

export default async function PublicCharacterPage({
  params,
  searchParams,
}: PublicCharacterPageProps) {
  const [{ slug }, { from, tab }] = await Promise.all([
    params,
    searchParams,
  ]);

  const activeTab =
    normalisePublicCharacterSheetTab(
      tab,
    );

  const character =
    await getPublicCharacter(slug);

  if (!character) {
    notFound();
  }

  const supabase = await createClient();

  const equippedSheetFrame =
    await getEquippedCosmetic(
      character.id,
      "sheet_frame",
    );

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

  let canUseFriendList = false;
  let isInFriendList = false;
  let blockedByViewer = false;
  let blockedViewer = false;

  const targetIsStaff =
    await isCharacterStaff(
      character.id,
    );

  if (
    activeCharacter &&
    activeCharacter.id !== character.id
  ) {
    const { data: blockRows, error: blockError } = await supabase
      .from("character_blocks")
      .select("blocker_character_id, blocked_character_id")
      .or([
        `and(blocker_character_id.eq.${activeCharacter.id},blocked_character_id.eq.${character.id})`,
        `and(blocker_character_id.eq.${character.id},blocked_character_id.eq.${activeCharacter.id})`,
      ].join(","));

    if (blockError) throw new Error(`Unable to check block state: ${blockError.message}`);

    blockedByViewer = (blockRows ?? []).some((row) =>
      row.blocker_character_id === activeCharacter.id &&
      row.blocked_character_id === character.id
    );
    blockedViewer = (blockRows ?? []).some((row) =>
      row.blocker_character_id === character.id &&
      row.blocked_character_id === activeCharacter.id
    );

    canUseFriendList =
      !blockedByViewer &&
      !blockedViewer &&
      (await hasCharacterFeature(activeCharacter.id, "friend_list"));

    if (canUseFriendList) {
      const {
        count: friendEntryCount,
        error: friendEntryError,
      } = await supabase
        .from(
          "character_friend_entries",
        )
        .select(
          "id",
          {
            count: "exact",
            head: true,
          },
        )
        .eq(
          "owner_character_id",
          activeCharacter.id,
        )
        .eq(
          "target_character_id",
          character.id,
        );

      if (friendEntryError) {
        throw new Error(
          `Unable to check Friend List entry: ${friendEntryError.message}`,
        );
      }

      isInFriendList =
        (friendEntryCount ?? 0) > 0;
    }
  }

  const returnHref =
  from === "game"
    ? null
    : "/characters";

const returnLabel =
  from === "game"
    ? null
    : "Back to characters";

  return (
    <div
      data-sep-public-character-sheet="other"
      className="mx-auto w-full max-w-7xl p-6"
    >
      <LiveCharacterSheetRefresh
        characterId={character.id}
        raceId={
          character.race?.id ??
          null
        }
      />

      <PublicCharacterProfileView
        character={character}
        activeTab={activeTab}
        returnHref={returnHref}
        returnLabel={returnLabel}
        canMessage={
          Boolean(activeCharacter) &&
          activeCharacter?.id !== character.id &&
          !blockedByViewer &&
          !blockedViewer
        }
        canBlock={
          Boolean(activeCharacter) &&
          activeCharacter?.id !==
            character.id &&
          !targetIsStaff
        }
        canReport={
          Boolean(activeCharacter) &&
          activeCharacter?.id !== character.id
        }
        blockedByViewer={blockedByViewer}
        hasGlobalBlock={blockedByViewer || blockedViewer}
        canViewLastActivity={
          character.show_last_activity ||
          staffSession !== null ||
          activeCharacter?.id === character.id
        }
        canViewInventory={
          character.show_inventory ||
          staffSession !== null ||
          activeCharacter?.id === character.id
        }
        viewerIsStaff={
          staffSession !== null
        }
        canUseFriendList={
          canUseFriendList
        }
        isInFriendList={
          isInFriendList
        }
        sheetFrameUrl={
          equippedSheetFrame?.assetUrl ??
          null
        }
      />
    </div>
  );
}