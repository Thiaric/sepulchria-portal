

import { CharacterGiftsDisplay } from "@/components/characters/character-gifts-display";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminCharacterEditForm } from "@/components/admin/admin-character-edit-form";
import {
  AdminAncestryGiftSelector,
  type AdminAncestryGiftOption,
} from "@/components/admin/admin-ancestry-gift-selector";
import { CharacterReviewFields } from "@/components/admin/character-review-fields";
import { CharacterConditionsEditor } from "@/components/characters/character-conditions-editor";
import Image from "next/image";
import {
  hasStaffCapability,
  requireAdminSection,
} from "@/lib/auth/require-staff";
import { createClient } from "@/lib/supabase/server";

import {
  deleteCharacterAdministration,
  updateCharacterAdministration,
} from "../actions";

type CharacterStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "rejected";

type CodexOption = {
  id: string;
  name: string;
};

type CodexRelation =
  | {
      id: string;
      name: string;
    }
  | {
      id: string;
      name: string;
    }[]
  | null;

type AttributeModifierSource = {
  muscles_modifier: number | null;
  reflexes_modifier: number | null;
  vigour_modifier: number | null;
  shrewd_modifier: number | null;
  brains_modifier: number | null;
  presence_modifier: number | null;
};

type CharacterRaceRelation =
  | ({
      id: string;
      name: string;
    } & AttributeModifierSource)
  | ({
      id: string;
      name: string;
    } & AttributeModifierSource)[]
  | null;

type OrderRoleRelation =
  | AttributeModifierSource
  | AttributeModifierSource[]
  | null;

type OrderMembershipRow = {
  role: OrderRoleRelation;
};

type CharacterRow = {
  id: string;
  user_id: string;
  public_slug: string;
  first_name: string;
  surname: string;
  display_name: string | null;
  pronouns: string | null;
  gender: string | null;
  sexual_orientation: string | null;
  date_of_birth: string | null;
  birthplace: string | null;
  origin: string | null;
  biography: string | null;
  portrait_url: string | null;
  music_url: string | null;
  status: CharacterStatus;
  created_at: string;
  updated_at: string;
  current_room_id: string | null;
  physical_description: string | null;
  personality: string | null;
  public_notes: string | null;
  master_notes: string | null;
  master_notes_expires_at: string | null;
  relationships: string | null;
  offgame: string | null;
  title: string | null;
  race_id: string | null;
  staff_notes: string | null;
  rejection_reason: string | null;
  approved_at: string | null;
  approved_by: string | null;
  muscles: number | null;
  reflexes: number | null;
  vigor: number | null;
  brains: number | null;
  shrewd: number | null;
  presence_score: number | null;
  current_health: number | null;
  warping_affinity: number;
  warps_per_day: number;
  race: CharacterRaceRelation;
};

type AdminCharacterPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function normaliseRelation<T>(
  value: T | T[] | null,
): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

function getDisplayName(
  character: CharacterRow,
): string {
  return (
    character.display_name?.trim() ||
    `${character.first_name} ${character.surname}`.trim() ||
    "Unnamed character"
  );
}

function formatDate(
  value: string | null,
): string {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(date);
}

function formatGender(
  value: string | null,
) {
  if (value === "male") {
    return "Male";
  }

  if (value === "female") {
    return "Female";
  }

  if (value === "non_binary") {
    return "Non-binary";
  }

  return null;
}

export default async function AdminCharacterPage({
  params,
}: AdminCharacterPageProps) {
  const staff =
    await requireAdminSection(
      "characters",
    );

  const canEditCharacter =
    hasStaffCapability(
      staff.role,
      "character_edit",
    );

  const canDeleteCharacter =
    hasStaffCapability(
      staff.role,
      "character_delete",
    );

  const canManageEconomy =
    hasStaffCapability(
      staff.role,
      "character_economy",
    );

  const canManageWarping =
    hasStaffCapability(
      staff.role,
      "character_warping",
    );

  const { id } = await params;
  const supabase =
    await createClient();

  const [
    characterResult,
    racesResult,
    orderMembershipResult,
  ] = await Promise.all([
    supabase
      .from("characters")
      .select(`
        id,
        user_id,
        public_slug,
        first_name,
        surname,
        display_name,
        pronouns,
        gender,
        sexual_orientation,
        date_of_birth,
        birthplace,
        origin,
        biography,
        portrait_url,
        music_url,
        status,
        created_at,
        updated_at,
        current_room_id,
        physical_description,
        personality,
        public_notes,
        master_notes,
        master_notes_expires_at,
        relationships,
        offgame,
        title,
        race_id,
        staff_notes,
        rejection_reason,
        approved_at,
        approved_by,
        muscles,
        reflexes,
        vigor,
        brains,
        shrewd,
        presence_score,
        current_health,
        warping_affinity,
        warps_per_day,

        race:races!characters_race_id_fkey(
          id,
          name,
          muscles_modifier,
          reflexes_modifier,
          vigour_modifier,
          shrewd_modifier,
          brains_modifier,
          presence_modifier
        )
      `)
      .eq("id", id)
      .maybeSingle(),

    supabase
      .from("races")
      .select("id, name")
      .order("name"),

    supabase
      .from("order_memberships")
      .select(`
        role:order_jobs!order_memberships_order_job_id_fkey(
          muscles_modifier,
          reflexes_modifier,
          vigour_modifier,
          shrewd_modifier,
          brains_modifier,
          presence_modifier
        )
      `)
      .eq("character_id", id)
      .limit(1)
      .maybeSingle(),

  ]);

  const firstError =
    characterResult.error ??
    racesResult.error ??
    orderMembershipResult.error;

  if (firstError) {
    throw new Error(
      `Unable to load character administration data: ${firstError.message}`,
    );
  }

  if (!characterResult.data) {
    notFound();
  }

  const character =
    characterResult.data as unknown as
      CharacterRow;

  const races =
    (racesResult.data ??
      []) as CodexOption[];

  const [
    ancestryGiftResult,
    selectedAncestryGiftResult,
  ] = await Promise.all([
    supabase
      .from("gifts")
      .select(`
        id,
        name,
        description,
        ancestry_choice_group,
        eligibility:gift_races(
          race_id
        )
      `)
      .eq("is_active", true)
      .order("sort_order", {
        ascending: true,
      })
      .order("name", {
        ascending: true,
      }),

    supabase
  .from("character_gifts")
  .select("gift_id")
  .eq("character_id", id),
  ]);

  if (
    ancestryGiftResult.error ||
    selectedAncestryGiftResult.error
  ) {
    throw new Error(
      `Unable to load character Ancestry Feats: ${
        ancestryGiftResult.error?.message ??
        selectedAncestryGiftResult.error?.message
      }`,
    );
  }

  const ancestryGiftOptions =
    (ancestryGiftResult.data ?? []).map((gift) => ({
      id: gift.id,
      name: gift.name,
      description: gift.description ?? "",
      choiceGroup:
        gift.ancestry_choice_group ?? null,
      raceIds: (gift.eligibility ?? []).map(
        (entry) => entry.race_id,
      ),
    })) satisfies AdminAncestryGiftOption[];

  const ownedGiftIds = new Set(
  (selectedAncestryGiftResult.data ?? []).map(
    (entry) => entry.gift_id,
  ),
);

const selectedAncestryGiftIds =
  ancestryGiftOptions
    .filter(
      (gift) =>
        character.race_id !== null &&
        gift.raceIds.includes(
          character.race_id,
        ) &&
        ownedGiftIds.has(gift.id),
    )
    .map((gift) => gift.id);
  const race =
    normaliseRelation(
      character.race,
    );

  const orderMembership =
    orderMembershipResult.data as
      | OrderMembershipRow
      | null;

  const orderRole =
    normaliseRelation(
      orderMembership?.role ??
        null,
    );

  const ancestryModifiers = {
    muscles:
      race?.muscles_modifier ?? 0,
    reflexes:
      race?.reflexes_modifier ?? 0,
    vigor:
      race?.vigour_modifier ?? 0,
    brains:
      race?.brains_modifier ?? 0,
    shrewd:
      race?.shrewd_modifier ?? 0,
    presence_score:
      race?.presence_modifier ?? 0,
  };

  const orderModifiers = {
    muscles:
      orderRole?.muscles_modifier ??
      0,
    reflexes:
      orderRole?.reflexes_modifier ??
      0,
    vigor:
      orderRole?.vigour_modifier ??
      0,
    brains:
      orderRole?.brains_modifier ??
      0,
    shrewd:
      orderRole?.shrewd_modifier ??
      0,
    presence_score:
      orderRole?.presence_modifier ??
      0,
  };

  const effectiveVigour =
    character.vigor === null
      ? null
      : character.vigor +
        ancestryModifiers.vigor +
        orderModifiers.vigor;

  const maximumHealth =
    effectiveVigour === null
      ? null
      : effectiveVigour * 10;

  const displayName =
    getDisplayName(character);

  return (
    <main className="p-5 sm:p-7 lg:p-9 admin_characters_id_page_main_main">
      <div className="mx-auto max-w-6xl admin_characters_id_page_div_container">
        <div className="flex flex-wrap items-center justify-between gap-4 admin_characters_id_page_div_container_2">
          <Link
            href="/admin/characters"
            className="border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-4 py-3 text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-efd6a8))] transition hover:border-[rgb(var(--sep-colour-b98c50))] hover:bg-[rgb(var(--sep-colour-50371f))]"
          >
            ← Character archive
          </Link>

          <div className="flex flex-wrap gap-2 admin_characters_id_page_div_container_3">
            {canManageEconomy ? (
              <Link
                href={`/admin/characters/${character.id}/inventory`}
                className="border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-4 py-3 text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-efd6a8))] transition hover:border-[rgb(var(--sep-colour-b98c50))] hover:bg-[rgb(var(--sep-colour-50371f))]"
              >
                Manage inventory
              </Link>
            ) : null}

            {canManageWarping ? (
              <Link
                href={`/admin/characters/${character.id}/warping`}
                className="border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-4 py-3 text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-efd6a8))] transition hover:border-[rgb(var(--sep-colour-b98c50))] hover:bg-[rgb(var(--sep-colour-50371f))]"
              >
                Manage Warping
              </Link>
            ) : null}

            {canManageEconomy ? (
              <Link
                href={`/admin/characters/${character.id}/premium-features`}
                className="border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-4 py-3 text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-efd6a8))] transition hover:border-[rgb(var(--sep-colour-b98c50))] hover:bg-[rgb(var(--sep-colour-50371f))]"
              >
                Premium Features
              </Link>
            ) : null}

            {canManageEconomy ? (
              <Link
                href={`/admin/characters/${character.id}/ledger`}
                className="border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-4 py-3 text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-efd6a8))] transition hover:border-[rgb(var(--sep-colour-b98c50))] hover:bg-[rgb(var(--sep-colour-50371f))]"
              >
                Ledger
              </Link>
            ) : null}

          <Link
            href={`/characters/${character.public_slug}`}
            className="border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-15100d))] px-4 py-3 text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-ac9879))] transition hover:border-[rgb(var(--sep-colour-987344))] hover:text-[rgb(var(--sep-colour-e7cca0))]"
          >
            Open public profile
          </Link>
          </div>
        </div>

        <section id="admin-character-summary" className="scroll-mt-4 mt-6 overflow-hidden border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] admin_characters_id_page_section_admin_character_summary">
          <div className="grid lg:grid-cols-[260px_minmax(0,1fr)] admin_characters_id_page_div_admin_character_summary">
            <div className="border-b border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-0f0b09))] p-6 lg:border-b-0 lg:border-r admin_characters_id_page_div_admin_character_summary_2">
              <div className="relative mx-auto aspect-[3/4] w-full max-w-[210px] overflow-hidden border border-[rgb(var(--sep-colour-765937))]/55 bg-[rgb(var(--sep-colour-090706))] admin_characters_id_page_div_admin_character_summary_3">
                {character.portrait_url ? (
                  <Image
                    src={
                      character.portrait_url
                    }
                    alt={`Portrait of ${displayName}`}
                    fill
                    sizes="210px"
                    className="object-cover"
                    priority
                  />
                ) : (
                  <div className="flex h-full items-center justify-center font-serif text-5xl text-[rgb(var(--sep-colour-705334))] admin_characters_id_page_div_container_4">
                    {character.first_name
                      .charAt(0)
                      .toUpperCase()}
                    {character.surname
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                )}
              </div>

              <div className="mt-5 text-center admin_characters_id_page_div_admin_character_summary_4">
                <StatusBadge
                  status={
                    character.status
                  }
                />

                <p className="mt-4 text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-756957))] admin_characters_id_page_p_admin_character_summary">
                  Created
                </p>

                <p className="mt-1 text-xs text-[rgb(var(--sep-colour-aa987d))] admin_characters_id_page_p_admin_character_summary_2">
                  {formatDate(
                    character.created_at,
                  )}
                </p>

                <p className="mt-4 text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-756957))] admin_characters_id_page_p_admin_character_summary_3">
                  Last updated
                </p>

                <p className="mt-1 text-xs text-[rgb(var(--sep-colour-aa987d))] admin_characters_id_page_p_admin_character_summary_4">
                  {formatDate(
                    character.updated_at,
                  )}
                </p>
              </div>
            </div>

            <div className="p-6 sm:p-8 admin_characters_id_page_div_admin_character_summary_5">
              <p className="text-[9px] uppercase tracking-[0.28em] text-[rgb(var(--sep-colour-8c704b))] admin_characters_id_page_p_admin_character_summary_5">
                Character administration
              </p>

              <h2 className="mt-2 font-serif text-4xl text-[rgb(var(--sep-colour-ead5ac))] admin_characters_id_page_h2_admin_character_summary">
                {displayName}
              </h2>

              <p className="mt-2 text-sm text-[rgb(var(--sep-colour-9f8968))] admin_characters_id_page_p_admin_character_summary_6">
                {race?.name ??
                  "No ancestry assigned"}
              </p>

              <div className="mt-7 grid gap-5 sm:grid-cols-2 xl:grid-cols-3 admin_characters_id_page_div_admin_character_summary_6">
                <ReadOnlyField
                  label="Legal name"
                  value={`${character.first_name} ${character.surname}`}
                />

                <ReadOnlyField
                  label="Display name"
                  value={
                    character.display_name
                  }
                />

                <ReadOnlyField
                  label="Pronouns"
                  value={
                    character.pronouns
                  }
                />

                <ReadOnlyField
                  label="Gender"
                  value={formatGender(
                    character.gender,
                  )}
                />

                <ReadOnlyField
                  label="Sexual orientation"
                  value={
                    character.sexual_orientation
                  }
                />

                <ReadOnlyField
                  label="Date of birth"
                  value={
                    character.date_of_birth
                  }
                />

                <ReadOnlyField
                  label="Birthplace"
                  value={
                    character.birthplace
                  }
                />

                <ReadOnlyField
                  label="Origin"
                  value={
                    character.origin
                  }
                />

                <ReadOnlyField
                  label="Public slug"
                  value={
                    character.public_slug
                  }
                />

                <ReadOnlyField
                  label="Owner user ID"
                  value={
                    character.user_id
                  }
                />
              </div>
            </div>
          </div>
        </section>

        {canEditCharacter ? (
          <section
            id="admin-character-conditions"
            className="mt-6 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-5 sm:p-6 admin_characters_id_page_section_admin_character_conditions"
          >
            <p className="text-[9px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-8c704b))] admin_characters_id_page_p_admin_character_conditions">
              Character state
            </p>

            <h3 className="mt-2 font-serif text-2xl text-[rgb(var(--sep-colour-dfc99f))] admin_characters_id_page_h3_admin_character_conditions">
              Conditions
            </h3>

            <p className="mt-2 max-w-3xl text-[11px] leading-5 text-[rgb(var(--sep-colour-8f8271))] admin_characters_id_page_p_admin_character_conditions_2">
              Owner, Administrators and Masters may add or remove visible Conditions on this Character.
            </p>

            <div className="mt-4 admin_characters_id_page_div_admin_character_conditions">
              <CharacterConditionsEditor
                scope="admin"
                characterId={character.id}
                characterName={displayName}
              />
            </div>
          </section>
        ) : null}

        <div className="mt-6 admin_characters_id_page_div_container_5">
          <section id="admin-character-review" className="scroll-mt-4 h-fit border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-5 sm:p-6 admin_characters_id_page_section_admin_character_review">
            <p className="text-[9px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-8c704b))] admin_characters_id_page_p_admin_character_review">
              Staff controls
            </p>

            <h3 className="mt-2 font-serif text-2xl text-[rgb(var(--sep-colour-dfc99f))] admin_characters_id_page_h3_admin_character_review">
              Review and classification
            </h3>

            {canEditCharacter ? (
              <AdminCharacterEditForm
                action={
                  updateCharacterAdministration
                }
                className="mt-6"
              >
              <input className="admin_characters_id_page_input_character_id"
                type="hidden"
                name="characterId"
                value={character.id}
              />

              <input className="admin_characters_id_page_input_return"
                type="hidden"
                name="returnTo"
                value={`/admin/characters/${character.id}`}
              />

              <div className="space-y-5 admin_characters_id_page_div_container_7">
                <div className="grid gap-4 sm:grid-cols-2 admin_characters_id_page_div_container_8">
                  <AdminField label="First name">
                    <input
                      type="text"
                      name="firstName"
                      required
                      maxLength={80}
                      defaultValue={
                        character.first_name
                      }
                      className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))] admin_characters_id_page_input_first_name"
                    />
                  </AdminField>

                  <AdminField label="Surname">
                    <input
                      type="text"
                      name="surname"
                      required
                      maxLength={80}
                      defaultValue={
                        character.surname
                      }
                      className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))] admin_characters_id_page_input_surname"
                    />
                  </AdminField>

                  <AdminField label="Public title">
                    <input
                      type="text"
                      name="title"
                      defaultValue={
                        character.title ??
                        ""
                      }
                      maxLength={120}
                      placeholder="Optional public title"
                      className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none placeholder:text-[rgb(var(--sep-colour-625747))] focus:border-[rgb(var(--sep-colour-a17a49))] admin_characters_id_page_input_title"
                    />
                  </AdminField>

                  <AdminField label="Pronouns">
                    <input
                      type="text"
                      name="pronouns"
                      maxLength={80}
                      defaultValue={
                        character.pronouns ??
                        ""
                      }
                      className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))] admin_characters_id_page_input_pronouns"
                    />
                  </AdminField>

                  <AdminField label="Gender">
                    <select
                      name="gender"
                      required
                      defaultValue={
                        character.gender ??
                        ""
                      }
                      className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))] admin_characters_id_page_select_gender"
                    >
                      <option className="admin_characters_id_page_option_gender" value="">
                        Choose gender
                      </option>

                      <option className="admin_characters_id_page_option_male" value="male">
                        Male
                      </option>

                      <option className="admin_characters_id_page_option_female" value="female">
                        Female
                      </option>

                      <option className="admin_characters_id_page_option_non_binary" value="non_binary">
                        Non-binary
                      </option>
                    </select>
                  </AdminField>

                  <AdminField label="Sexual orientation">
                    <input
                      type="text"
                      name="sexualOrientation"
                      maxLength={120}
                      defaultValue={
                        character.sexual_orientation ??
                        ""
                      }
                      placeholder="Optional"
                      className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))] admin_characters_id_page_input_sexual_orientation"
                    />
                  </AdminField>

                  <AdminField label="Date of birth">
                    <input
                      type="date"
                      name="dateOfBirth"
                      defaultValue={
                        character.date_of_birth ??
                        ""
                      }
                      className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))] admin_characters_id_page_input_date_birth"
                    />
                  </AdminField>

                  <AdminField label="Birthplace">
                    <input
                      type="text"
                      name="birthplace"
                      maxLength={160}
                      defaultValue={
                        character.birthplace ??
                        ""
                      }
                      className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))] admin_characters_id_page_input_birthplace"
                    />
                  </AdminField>

                  <AdminField label="Origin">
                    <input
                      type="text"
                      name="origin"
                      maxLength={160}
                      defaultValue={
                        character.origin ??
                        ""
                      }
                      className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))] admin_characters_id_page_input_origin"
                    />
                  </AdminField>

                  <AdminField label="Portrait URL">
                    <input
                      type="url"
                      name="portraitUrl"
                      maxLength={1000}
                      defaultValue={
                        character.portrait_url ??
                        ""
                      }
                      className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))] admin_characters_id_page_input_portrait_url"
                    />
                  </AdminField>

                  <AdminField label="Character music URL">
                    <input
                      type="url"
                      name="musicUrl"
                      maxLength={2000}
                      defaultValue={
                        character.music_url ??
                        ""
                      }
                      placeholder="https://.../theme.mp3"
                      className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))] admin_characters_id_page_input_music_url"
                    />
                  </AdminField>
                </div>

                <AdminField label="Physical description">
                  <textarea
                    name="physicalDescription"
                    rows={7}
                    maxLength={10000}
                    defaultValue={
                      character.physical_description ??
                      ""
                    }
                    className="w-full resize-y border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm leading-6 text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))] admin_characters_id_page_textarea_physical_description"
                  />
                </AdminField>

                <AdminField label="Personality">
                  <textarea
                    name="personality"
                    rows={7}
                    maxLength={10000}
                    defaultValue={
                      character.personality ??
                      ""
                    }
                    className="w-full resize-y border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm leading-6 text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))] admin_characters_id_page_textarea_personality"
                  />
                </AdminField>

                <AdminField label="Biography">
                  <textarea
                    name="biography"
                    rows={10}
                    maxLength={20000}
                    defaultValue={
                      character.biography ??
                      ""
                    }
                    className="w-full resize-y border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm leading-6 text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))] admin_characters_id_page_textarea_biography"
                  />
                </AdminField>

                <AdminField label="Public notes">
                  <textarea
                    name="publicNotes"
                    rows={6}
                    maxLength={10000}
                    defaultValue={
                      character.public_notes ??
                      ""
                    }
                    className="w-full resize-y border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm leading-6 text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))] admin_characters_id_page_textarea_public_notes"
                  />
                </AdminField>

                <AdminField label="Masters' Notes">
                  <div className="space-y-3">
                    <textarea
                      name="masterNotes"
                      rows={8}
                      maxLength={10000}
                      defaultValue={
                        character.master_notes ??
                        ""
                      }
                      className="w-full resize-y border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm leading-6 text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))] admin_characters_id_page_textarea_master_notes"
                    />

                    <input
                      type="hidden"
                      name="masterNotesOriginalExpiresAt"
                      value={
                        character.master_notes_expires_at ??
                        ""
                      }
                    />

                    <input
                      type="hidden"
                      name="masterNotesOriginalDurationDays"
                      value={
                        character.master_notes_expires_at
                          ? Math.max(
                              1,
                              Math.ceil(
                                (
                                  new Date(
                                    character.master_notes_expires_at,
                                  ).getTime() -
                                  Date.now()
                                ) /
                                  86_400_000,
                              ),
                            )
                          : ""
                      }
                    />

                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block">
                        <span className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
                          Duration
                        </span>

                        <select
                          name="masterNotesDurationMode"
                          defaultValue={
                            character.master_notes_expires_at
                              ? "temporary"
                              : "permanent"
                          }
                          className="mt-2 w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))]"
                        >
                          <option value="permanent">
                            Permanent
                          </option>
                          <option value="temporary">
                            Temporary
                          </option>
                        </select>
                      </label>

                      <label className="block">
                        <span className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
                          Days
                        </span>

                        <input
                          type="number"
                          name="masterNotesDurationDays"
                          min={1}
                          max={36500}
                          step={1}
                          defaultValue={
                            character.master_notes_expires_at
                              ? Math.max(
                                  1,
                                  Math.ceil(
                                    (
                                      new Date(
                                        character.master_notes_expires_at,
                                      ).getTime() -
                                      Date.now()
                                    ) /
                                      86_400_000,
                                  ),
                                )
                              : 7
                          }
                          className="mt-2 w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))]"
                        />
                      </label>
                    </div>

                    <p className="text-[10px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">
                      Permanent notes remain until manually removed.
                      Temporary notes disappear automatically from the
                      character sheet when their duration ends.
                    </p>
                  </div>
                </AdminField>

                <AdminField label="Relationships">
                  <textarea
                    name="relationships"
                    rows={8}
                    maxLength={10000}
                    defaultValue={
                      character.relationships ??
                      ""
                    }
                    className="w-full resize-y border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm leading-6 text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))] admin_characters_id_page_textarea_relationships"
                  />
                </AdminField>

                <AdminField label="Offgame">
                  <textarea
                    name="offgame"
                    rows={6}
                    maxLength={10000}
                    defaultValue={
                      character.offgame ??
                      ""
                    }
                    className="w-full resize-y border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm leading-6 text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))] admin_characters_id_page_textarea_offgame"
                  />
                </AdminField>

                <div id="admin-character-health" className="scroll-mt-4 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-100c09))] p-4 admin_characters_id_page_div_admin_character_health">
                  <p className="text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-806b50))] admin_characters_id_page_p_admin_character_health">
                    Character Health
                  </p>

                  <p className="mt-2 text-xs leading-5 text-[rgb(var(--sep-colour-8f8271))] admin_characters_id_page_p_admin_character_health_2">
                    Maximum Health uses effective Vigour: Base + Ancestry + Order, then × 10. The editable Attribute fields below remain BASE values only.
                  </p>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 admin_characters_id_page_div_admin_character_health_2">
                    <label className="block admin_characters_id_page_label_admin_character_health">
                      <span className="text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-806b50))] admin_characters_id_page_span_admin_character_health">
                        Current Health
                      </span>

                      <input
                        type="number"
                        name="currentHealth"
                        min={0}
                        step={1}
                        defaultValue={
                          character.current_health ===
                          null
                            ? ""
                            : character.current_health
                        }
                        className="mt-2 w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0d0907))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))] admin_characters_id_page_input_admin_character_health"
                      />
                    </label>

                    <div className="admin_characters_id_page_div_admin_character_health_3">
                      <span className="text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-806b50))] admin_characters_id_page_span_admin_character_health_2">
                        Maximum Health
                      </span>

                      <div className="mt-2 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-0d0907))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-bfae92))] admin_characters_id_page_div_admin_character_health_4">
                        {maximumHealth ===
                        null
                          ? "Not available"
                          : maximumHealth}
                      </div>
                    </div>
                  </div>

                  {effectiveVigour !== null ? (
                    <div className="mt-3 border border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-0d0907))] px-3 py-3 text-[10px] leading-5 text-[rgb(var(--sep-colour-9f917c))] admin_characters_id_page_div_admin_character_health_5">
                      Effective Vigour:{" "}
                      <span className="text-[rgb(var(--sep-colour-d7c4a5))] admin_characters_id_page_span_text">
                        Base {character.vigor ?? 0}
                      </span>{" "}
                      + Ancestry{" "}
                      <span className="text-[rgb(var(--sep-colour-d7c4a5))] admin_characters_id_page_span_text_2">
                        {formatModifier(
                          ancestryModifiers.vigor,
                        )}
                      </span>{" "}
                      + Order{" "}
                      <span className="text-[rgb(var(--sep-colour-d7c4a5))] admin_characters_id_page_span_text_3">
                        {formatModifier(
                          orderModifiers.vigor,
                        )}
                      </span>{" "}
                      ={" "}
                      <span className="font-semibold text-[rgb(var(--sep-colour-e6c994))] admin_characters_id_page_span_text_4">
                        {effectiveVigour}
                      </span>
                    </div>
                  ) : null}
                </div>

                <div id="admin-character-attributes" className="scroll-mt-4 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-100c09))] p-4 admin_characters_id_page_div_admin_character_attributes">
                  <div className="flex flex-wrap items-end justify-between gap-3 admin_characters_id_page_div_admin_character_attributes_2">
                    <div className="admin_characters_id_page_div_admin_character_attributes_3">
                      <p className="text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-806b50))] admin_characters_id_page_p_admin_character_attributes">
                        Character attributes
                      </p>

                      <p className="mt-2 text-xs leading-5 text-[rgb(var(--sep-colour-8f8271))] admin_characters_id_page_p_admin_character_attributes_2">
                        The number field is the BASE Attribute controlled by staff. Ancestry and Order modifiers are shown separately and are never written into the base value.
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 admin_characters_id_page_div_admin_character_attributes_4">
                    {[
                      {
                        name: "muscles",
                        label: "Muscles",
                        value:
                          character.muscles,
                        ancestry:
                          ancestryModifiers.muscles,
                        order:
                          orderModifiers.muscles,
                      },
                      {
                        name: "reflexes",
                        label: "Reflexes",
                        value:
                          character.reflexes,
                        ancestry:
                          ancestryModifiers.reflexes,
                        order:
                          orderModifiers.reflexes,
                      },
                      {
                        name: "vigor",
                        label: "Vigour",
                        value:
                          character.vigor,
                        ancestry:
                          ancestryModifiers.vigor,
                        order:
                          orderModifiers.vigor,
                      },
                      {
                        name: "brains",
                        label: "Brains",
                        value:
                          character.brains,
                        ancestry:
                          ancestryModifiers.brains,
                        order:
                          orderModifiers.brains,
                      },
                      {
                        name: "shrewd",
                        label: "Shrewd",
                        value:
                          character.shrewd,
                        ancestry:
                          ancestryModifiers.shrewd,
                        order:
                          orderModifiers.shrewd,
                      },
                      {
                        name:
                          "presence_score",
                        label: "Presence",
                        value:
                          character.presence_score,
                        ancestry:
                          ancestryModifiers.presence_score,
                        order:
                          orderModifiers.presence_score,
                      },
                    ].map(
                      ({
                        name,
                        label,
                        value,
                        ancestry,
                        order,
                      }) => {
                        const effective =
                          value === null
                            ? null
                            : Number(
                                value,
                              ) +
                              ancestry +
                              order;

                        return (
                          <div
                            key={name}
                            className="border border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-0d0907))] p-3 admin_characters_id_page_div_container_9"
                          >
                            <label className="block admin_characters_id_page_label_label">
                              <span className="text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-806b50))] admin_characters_id_page_span_text_5">
                                {label} — Base
                              </span>

                              <input
                                type="number"
                                name={name}
                                min={1}
                                max={8}
                                step={1}
                                defaultValue={
                                  value ===
                                  null
                                    ? ""
                                    : Number(
                                        value,
                                      )
                                }
                                className="mt-2 w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))] admin_characters_id_page_input_field"
                              />
                            </label>

                            <div className="mt-3 grid grid-cols-3 gap-2 text-center admin_characters_id_page_div_container_10">
                              <AttributeModifierBox
                                label="Ancestry"
                                value={
                                  ancestry
                                }
                              />
                              <AttributeModifierBox
                                label="Order"
                                value={
                                  order
                                }
                              />
                              <AttributeEffectiveBox
                                value={
                                  effective
                                }
                              />
                            </div>
                          </div>
                        );
                      },
                    )}
                  </div>
                </div>

                <div className="space-y-3 admin_characters_id_page_div_ancestry_and_feats">
                  <AdminField label="Ancestry">
                    <select
                      name="raceId"
                      defaultValue={
                        character.race_id ??
                        ""
                      }
                      className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))] admin_characters_id_page_select_race_id"
                    >
                      <option className="admin_characters_id_page_option_race_id" value="">
                        No ancestry assigned
                      </option>

                      {races.map(
                        (option) => (
                          <option className="admin_characters_id_page_option_option"
                            key={
                              option.id
                            }
                            value={
                              option.id
                            }
                          >
                            {
                              option.name
                            }
                          </option>
                        ),
                      )}
                    </select>
                  </AdminField>

                  <AdminAncestryGiftSelector
                    gifts={ancestryGiftOptions}
                    initialRaceId={character.race_id ?? ""}
                    initialSelectedIds={selectedAncestryGiftIds}
                  />
                </div>

                {/* PHASE6_ADMIN_GIFTS_DISPLAY */}
                <div
  data-admin-full-row="true"
  className="mt-4 w-full admin_characters_id_page_div_container_11"
>
  <CharacterGiftsDisplay
    characterId={id}
    compact
    twoColumns
  />
</div>

                <CharacterReviewFields
                  initialStatus={
                    character.status
                  }
                  initialRejectionReason={
                    character.rejection_reason
                  }
                />

                <AdminField label="Private staff notes">
                  <textarea
                    name="staffNotes"
                    defaultValue={
                      character.staff_notes ??
                      ""
                    }
                    maxLength={10000}
                    rows={7}
                    placeholder="These notes are visible only to staff."
                    className="w-full resize-y border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm leading-6 text-[rgb(var(--sep-colour-d7c4a5))] outline-none placeholder:text-[rgb(var(--sep-colour-625747))] focus:border-[rgb(var(--sep-colour-a17a49))] admin_characters_id_page_textarea_staff_notes"
                  />
                </AdminField>
              </div>

              {character.approved_at ? (
                <div id="admin-character-approval-record" className="scroll-mt-4 mt-5 border border-[rgb(var(--sep-colour-315742))]/55 bg-[rgb(var(--sep-colour-102019))] p-4 admin_characters_id_page_div_admin_character_approval_record">
                  <p className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-6fa381))] admin_characters_id_page_p_admin_character_approval_record">
                    Approval record
                  </p>

                  <p className="mt-2 text-xs leading-5 text-[rgb(var(--sep-colour-a8c2ae))] admin_characters_id_page_p_admin_character_approval_record_2">
                    Approved{" "}
                    {formatDate(
                      character.approved_at,
                    )}
                  </p>

                  {character.approved_by ? (
                    <p className="mt-1 break-all text-[9px] text-[rgb(var(--sep-colour-718d79))] admin_characters_id_page_p_admin_character_approval_record_3">
                      Staff ID:{" "}
                      {
                        character.approved_by
                      }
                    </p>
                  ) : null}
                </div>
              ) : null}

              <button
                type="submit"
                className="mt-6 w-full border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-5 py-3 text-[9px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-efd6a8))] transition hover:border-[rgb(var(--sep-colour-b98c50))] hover:bg-[rgb(var(--sep-colour-50371f))] admin_characters_id_page_button_save_character_record"
              >
                Save character record
              </button>
              </AdminCharacterEditForm>
            ) : (
              <div className="mt-6 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-100c09))] p-4 text-xs leading-6 text-[rgb(var(--sep-colour-9f917c))] admin_characters_id_page_div_admin_character_review">
                Moderator access is read-only on character records.
                You can review the sheet and moderation-relevant information,
                but gameplay and account data cannot be changed from this role.
              </div>
            )}

            {canDeleteCharacter ? (
            <div id="admin-character-danger-zone" className="scroll-mt-4 mt-8 border-t border-[rgb(var(--sep-colour-6f302b))]/45 pt-6 admin_characters_id_page_div_admin_character_danger_zone">
              <div className="border border-[rgb(var(--sep-colour-843a32))]/60 bg-[rgb(var(--sep-colour-26110f))]/65 p-4 admin_characters_id_page_div_permanently_delete_character">
                <p className="text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-c06d62))] admin_characters_id_page_p_permanently_delete_character">
                  Danger zone
                </p>

                <h4 className="mt-2 font-serif text-xl text-[rgb(var(--sep-colour-e1aaa2))] admin_characters_id_page_h4_permanently_delete_character">
                  Permanently delete
                  character
                </h4>

                <p className="mt-3 text-xs leading-5 text-[rgb(var(--sep-colour-a98782))] admin_characters_id_page_p_permanently_delete_character_2">
                  This removes the
                  character sheet
                  permanently but leaves
                  the user account intact.
                  The player will then be
                  able to create a new
                  character.
                </p>

                <p className="mt-3 text-xs leading-5 text-[rgb(var(--sep-colour-a98782))] admin_characters_id_page_p_permanently_delete_character_3">
                  Type{" "}
                  <strong className="text-[rgb(var(--sep-colour-e1aaa2))] admin_characters_id_page_strong_permanently_delete_character">
                    {getDisplayName(
                      character,
                    )}
                  </strong>{" "}
                  to confirm.
                </p>

                <form
                  action={
                    deleteCharacterAdministration
                  }
                  className="mt-4 admin_characters_id_page_form_delete_character_administration"
                >
                  <input className="admin_characters_id_page_input_character_id_2"
                    type="hidden"
                    name="characterId"
                    value={
                      character.id
                    }
                  />

                  <input
                    type="text"
                    name="confirmation"
                    autoComplete="off"
                    required
                    placeholder={getDisplayName(
                      character,
                    )}
                    className="w-full border border-[rgb(var(--sep-colour-71352f))] bg-[rgb(var(--sep-colour-100807))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-dfbbb5))] outline-none placeholder:text-[rgb(var(--sep-colour-684b47))] focus:border-[rgb(var(--sep-colour-bd6458))] admin_characters_id_page_input_confirmation"
                  />

                  <button
                    type="submit"
                    className="mt-3 w-full border border-[rgb(var(--sep-colour-a44c42))] bg-[rgb(var(--sep-colour-481d19))] px-5 py-3 text-[9px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-f1beb6))] transition hover:border-[rgb(var(--sep-colour-d66b5f))] hover:bg-[rgb(var(--sep-colour-622720))] admin_characters_id_page_button_delete_character_permanently"
                  >
                    Delete character
                    permanently
                  </button>
                </form>
              </div>
            </div>
            ) : null}
          </section>
        </div>
      </div>
    </main>
  );
}

function AdminField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const anchorId =
    `admin-character-field-${label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")}`;

  return (
    <div
      id={anchorId}
      className="scroll-mt-4 block admin_characters_id_page_div_container_12"
    >
      <div className="mb-2 block text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-806b50))] admin_characters_id_page_div_container_13">
        {label}
      </div>

      {children}
    </div>
  );
}

function ReadOnlyField({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  const anchorId =
    `admin-character-summary-${label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")}`;

  return (
    <div
      id={anchorId}
      className="scroll-mt-4 admin_characters_id_page_div_container_14"
    >
      <p className="text-[8px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-806b50))] admin_characters_id_page_p_text">
        {label}
      </p>

      <p className="mt-2 break-words text-sm text-[rgb(var(--sep-colour-c9b99e))] admin_characters_id_page_p_text_2">
        {value?.trim() ||
          "Not provided"}
      </p>
    </div>
  );
}

function CharacterTextSection({
  title,
  content,
}: {
  title: string;
  content: string | null;
}) {
  const anchorId =
    `admin-character-section-${title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")}`;

  return (
    <section
      id={anchorId}
      className="scroll-mt-4 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-5 sm:p-6 admin_characters_id_page_section_section"
    >
      <h3 className="font-serif text-2xl text-[rgb(var(--sep-colour-dfc99f))] admin_characters_id_page_h3_heading">
        {title}
      </h3>

      {content?.trim() ? (
        <div className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[rgb(var(--sep-colour-b8aa96))] admin_characters_id_page_div_container_15">
          {content}
        </div>
      ) : (
        <p className="mt-4 text-sm italic text-[rgb(var(--sep-colour-756957))] admin_characters_id_page_p_text_3">
          No information was
          provided.
        </p>
      )}
    </section>
  );
}

function formatModifier(
  value: number,
): string {
  if (value > 0) {
    return `+${value}`;
  }

  return String(value);
}

function AttributeModifierBox({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="border border-[rgb(var(--sep-colour-60482e))]/30 bg-black/20 px-2 py-2 admin_characters_id_page_div_container_16">
      <p className="text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-746856))] admin_characters_id_page_p_text_4">
        {label}
      </p>
      <p className="mt-1 text-xs text-[rgb(var(--sep-colour-c7b393))] admin_characters_id_page_p_text_5">
        {formatModifier(value)}
      </p>
    </div>
  );
}

function AttributeEffectiveBox({
  value,
}: {
  value: number | null;
}) {
  return (
    <div className="border border-[rgb(var(--sep-colour-8d6a3d))]/45 bg-[rgb(var(--sep-colour-1a120c))] px-2 py-2 admin_characters_id_page_div_container_17">
      <p className="text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-98784e))] admin_characters_id_page_p_text_6">
        Effective
      </p>
      <p className="mt-1 text-xs font-semibold text-[rgb(var(--sep-colour-e6c994))] admin_characters_id_page_p_text_7">
        {value === null
          ? "—"
          : value}
      </p>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: CharacterStatus;
}) {
  const classes = {
    draft:
      "border-stone-600/60 text-stone-400",
    submitted:
      "border-amber-700/60 text-amber-500",
    approved:
      "border-emerald-800/60 text-emerald-500",
    rejected:
      "border-red-800/60 text-red-500",
  };

  return (
    <span
      className={[((`inline-block border bg-black/20 px-2.5 py-1 text-[8px] uppercase tracking-[0.18em] ${classes[status]}`)), "admin_characters_id_page_span_text_6"].filter(Boolean).join(" ")}
    >
      {status}
    </span>
  );
}
