

import { notFound } from "next/navigation";
import {
  AdminCharacterFeatureAccess,
  type CharacterFeatureEntitlementRow,
  type CharacterPortalSkinEntitlementRow,
  type CharacterPortalSkinRow,
} from "@/components/admin/admin-character-feature-access";
import Link from "next/link";
import {
  requireStaffCapability,
} from "@/lib/auth/require-staff";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

type Character = {
  id: string;
  user_id: string;
  display_name: string | null;
  first_name: string;
  surname: string;
};

function characterName(
  character: Character,
) {
  return (
    character.display_name?.trim() ||
    `${character.first_name} ${character.surname}`.trim() ||
    "Unnamed character"
  );
}

const buttonClass =
  "border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-4 py-3 text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-efd6a8))] transition hover:border-[rgb(var(--sep-colour-b98c50))] hover:bg-[rgb(var(--sep-colour-50371f))]";

export default async function AdminCharacterPremiumFeaturesPage({
  params,
}: Props) {
  await requireStaffCapability("character_economy");

  const { id } = await params;
  const supabase =
    await createClient();

  const {
    data: character,
    error: characterError,
  } = await supabase
    .from("characters")
    .select(`
      id,
      user_id,
      display_name,
      first_name,
      surname
    `)
    .eq("id", id)
    .maybeSingle();

  if (
    characterError ||
    !character
  ) {
    notFound();
  }

  const privileged =
    createAdminClient();

  const [
    featureEntitlementsResult,
    portalSkinsResult,
    portalSkinEntitlementsResult,
  ] = await Promise.all([
    privileged
      .from(
        "character_feature_entitlements",
      )
      .select(
        "feature_key, enabled, source, note, granted_at, updated_at",
      )
      .eq(
        "character_id",
        id,
      ),

    privileged
      .from("portal_skins")
      .select(`
        id,
        slug,
        name,
        description,
        is_default
      `)
      .eq(
        "is_active",
        true,
      )
      .order(
        "sort_order",
        {
          ascending: true,
        },
      )
      .order(
        "name",
        {
          ascending: true,
        },
      ),

    privileged
      .from(
        "user_portal_skin_entitlements",
      )
      .select(`
        skin_id,
        enabled,
        source,
        note
      `)
      .eq(
        "user_id",
        character.user_id,
      ),
  ]);

  const firstError =
    featureEntitlementsResult.error ??
    portalSkinsResult.error ??
    portalSkinEntitlementsResult.error;

  if (firstError) {
    throw new Error(
      `Unable to load Premium Features administration: ${firstError.message}`,
    );
  }

  const entitlements =
    (featureEntitlementsResult.data ??
      []) as CharacterFeatureEntitlementRow[];

  const portalSkins =
    (portalSkinsResult.data ??
      []) as CharacterPortalSkinRow[];

  const portalSkinEntitlements =
    (portalSkinEntitlementsResult.data ??
      []) as CharacterPortalSkinEntitlementRow[];

  return (
    <main className="p-5 sm:p-7 lg:p-9">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[rgb(var(--sep-colour-60482e))]/35 pb-5">
          <div>
            <p className="text-[9px] uppercase tracking-[0.28em] text-[rgb(var(--sep-colour-8c704b))]">
              Character Administration
            </p>

            <h1 className="mt-2 font-serif text-4xl text-[rgb(var(--sep-colour-ead5ac))]">
              Premium Features
            </h1>

            <p className="mt-1 text-[11px] text-[rgb(var(--sep-colour-8f8271))]">
              {characterName(
                character as Character,
              )}
            </p>
          </div>

          <Link
            href={`/admin/characters/${id}`}
            className={buttonClass}
          >
            Back to Character
          </Link>
        </div>

        <AdminCharacterFeatureAccess
          characterId={id}
          entitlements={entitlements}
          portalSkins={portalSkins}
          portalSkinEntitlements={
            portalSkinEntitlements
          }
        />
      </div>
    </main>
  );
}
