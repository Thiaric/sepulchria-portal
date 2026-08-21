import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ApprovalNotice } from "@/components/character/approval-notice";
import { PendingSubmitButton } from "@/components/forms/pending-submit-button";
import { CharacterExpertiseTotal } from "@/components/characters/character-expertise-total";
import { CharacterMusicPlayer } from "@/components/characters/character-music-player";
import { CharacterOrderSummary } from "@/components/characters/character-order-summary";
import { CharacterSheetTabs } from "@/components/characters/character-sheet-tabs";


import {
  submitCharacterForReview,
  updateApprovedCharacterProfile,
} from "./actions";
import { CharacterMechanicsDisplay } from "@/components/characters/character-mechanics-display";
import { CharacterGiftsDisplay } from "@/components/characters/character-gifts-display";
import { CharacterShapesDisplay } from "@/components/characters/character-shapes-display";
import { CharacterInventoryDisplay } from "@/components/characters/character-inventory-display";
import { CharacterRemnantsWallet } from "@/components/characters/character-remnants-wallet";
import { CharacterLedger } from "@/components/characters/character-ledger";
import { LiveCharacterSheetRefresh } from "@/components/characters/live-character-sheet-refresh";
import { getEffectiveCharacterAttributes } from "@/lib/characters/get-effective-character-attributes";
import { createClient } from "@/lib/supabase/server";

type CharacterStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "rejected";

type CodexRelation = {
  id: string;
  name: string;
  slug: string;
  icon_url: string | null;
  colour: string | null;
};

type CharacterProfile = {
  id?: string;
  pronouns?: string | null;
  age?: number | null;
  date_of_birth?: string | null;
  birthplace?: string | null;
  origin?: string | null;
  title?: string | null;
  physical_description?: string | null;
  personality?: string | null;
  biography?: string | null;
  public_notes?: string | null;
  offgame?: string | null;
  portrait_url?: string | null;
  music_url?: string | null;
  display_name?: string | null;
  approval_notice_seen_at?: string | null;
  muscles?: number | null;
  reflexes?: number | null;
  vigor?: number | null;
  brains?: number | null;
  shrewd?: number | null;
  presence_score?: number | null;
  current_health?: number | null;
  gender?: string | null;
  sexual_orientation?: string | null;
  show_last_activity?: boolean | null;

  status?: CharacterStatus | null;
  rejection_reason?: string | null;
  submitted_at?: string | null;
  approved_at?: string | null;

  race:
    | CodexRelation
    | CodexRelation[]
    | null;

  association:
    | CodexRelation
    | CodexRelation[]
    | null;
};

type CharacterPageProps = {
  searchParams: Promise<{
    created?: string;
    updated?: string;
    submitted?: string;
    error?: string;
  }>;
};

export default async function CharacterPage({
  searchParams,
}: CharacterPageProps) {
  const params = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const {
    data: character,
    error,
  } = await supabase
    .from("characters")
    .select(`
      id,
      pronouns,
      gender,
      sexual_orientation,
      age,
      date_of_birth,
      birthplace,
      origin,
      title,
      physical_description,
      personality,
      biography,
      public_notes,
      offgame,
      portrait_url,
      music_url,
      display_name,
      status,
      rejection_reason,
      submitted_at,
      approved_at,
      approval_notice_seen_at,
      muscles,
      reflexes,
      vigor,
      brains,
      shrewd,
      presence_score,
      current_health,
      show_last_activity,

      race:races!characters_race_id_fkey(
        id,
        name,
        slug,
        icon_url,
        colour
      ),

      association:associations!characters_association_id_fkey(
        id,
        name,
        slug,
        icon_url,
        colour
      )
    `)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!character) {
    redirect("/character/create");
  }

  const effectiveAttributes =
    await getEffectiveCharacterAttributes(
      character.id,
      {
        muscles: character.muscles,
        reflexes: character.reflexes,
        vigor: character.vigor,
        brains: character.brains,
        shrewd: character.shrewd,
        presence_score:
          character.presence_score,
      },
    );

  const characterWithEffectiveAttributes = {
    ...character,
    ...effectiveAttributes,
  };

  const notice = getPageNotice(params);

  const liveRace =
    normaliseRelation(
      character.race as
        | CodexRelation
        | CodexRelation[]
        | null,
    );

  return (
    <>
      <LiveCharacterSheetRefresh
        characterId={character.id}
        raceId={liveRace?.id ?? null}
      />

      <Profile
        character={
          characterWithEffectiveAttributes as unknown as CharacterProfile
        }
        own
        notice={notice}
      />
    </>
  );
}

export function Profile({
  character,
  own = false,
  messageAction = null,
  notice = null,
}: {
  character: CharacterProfile;
  own?: boolean;
  messageAction?: ReactNode;
  notice?: PageNotice | null;
}) {
  const race = normaliseRelation(
    character.race,
  );

  const status =
    character.status ?? "draft";

  const canEdit =
    own &&
    (status === "draft" ||
      status === "rejected");

  const canSubmit =
    own &&
    (status === "draft" ||
      status === "rejected");

  const items = [
  [
    "Gender",
    formatGender(
      character.gender,
    ),
  ],
  [
    "Sexual orientation",
    character.sexual_orientation,
  ],
  [
    "Pronouns",
    character.pronouns,
  ],
  [
    "Age",
    character.age !== null &&
    character.age !== undefined
      ? `${character.age} years`
      : null,
  ],
  [
    "Birthplace",
    character.birthplace ??
      "Sepulchria",
  ],
  [
    "Title",
    character.title ?? "Citizen",
  ],
];



  return (
    <div className="p-5 sm:p-7 lg:p-9">
      <div className="mx-auto max-w-5xl">
        {notice ? (
          <PageNoticeBanner notice={notice} />
        ) : null}

        {own &&
        character.status === "approved" &&
        !character.approval_notice_seen_at ? (
          <ApprovalNotice />
        ) : null}

        {own ? (
          <CharacterStatusPanel
            status={status}
            rejectionReason={
              character.rejection_reason
            }
            submittedAt={
              character.submitted_at
            }
            approvedAt={
              character.approved_at
            }
          />
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          

          <div className="flex flex-wrap items-center justify-end gap-2">
            {messageAction}

            {canSubmit ? (
              <form action={submitCharacterForReview}>
                <PendingSubmitButton
                  idleText={
                    status === "rejected"
                      ? "Submit again"
                      : "Submit for approval"
                  }
                  pendingText={
                    status === "rejected"
                      ? "Submitting again..."
                      : "Submitting..."
                  }
                  className="border border-[rgb(var(--sep-colour-a47b43))] bg-[rgb(var(--sep-colour-472d18))] px-4 py-2 text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-f3d7a5))] transition hover:border-[rgb(var(--sep-colour-d0a15c))] hover:bg-[rgb(var(--sep-colour-5c391d))] disabled:cursor-not-allowed disabled:opacity-60"
                />
              </form>
            ) : null}
          </div>
        </div>

        <CharacterSheetTabs own={own}>
          <div data-character-sheet-panel="short">
            <section className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.9fr)]">
          <div className="min-w-0">
            <section className="grid gap-4 border border-[rgb(var(--sep-colour-654b2e))]/50 bg-[rgb(var(--sep-colour-17110d))] p-4 sm:p-5 lg:grid-cols-[180px_minmax(0,1fr)]">
              <div className="mx-auto w-full max-w-[180px] lg:mx-0">
                {character.portrait_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={character.portrait_url}
                    alt={`Portrait of ${
                      character.display_name ??
                      "character"
                    }`}
                    className="aspect-[3/4] w-full border border-[rgb(var(--sep-colour-60482e))]/50 object-cover"
                  />
                ) : (
                  <div className="flex aspect-[3/4] w-full items-center justify-center border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-0d0a08))] font-serif text-5xl text-[rgb(var(--sep-colour-5f503f))]">
                    ?
                  </div>
                )}
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[rgb(var(--sep-colour-5d452d))]/35 pb-3">
                  <div className="min-w-0">
                    <p className="text-[8px] uppercase tracking-[0.26em] text-[rgb(var(--sep-colour-876a46))]">
                      Character profile
                    </p>

                    <h1 className="mt-1 break-words font-serif text-3xl text-[rgb(var(--sep-colour-ecd9b2))] sm:text-[2.15rem]">
                      {character.display_name ??
                        "Unnamed character"}
                    </h1>
                  </div>

                  {own ? (
                    <CharacterStatusBadge
                      status={status}
                    />
                  ) : null}
                </div>

                <div className="mt-3 grid gap-px bg-[rgb(var(--sep-colour-4f3b28))]/35 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map(([label, value]) => (
                    <div
                      key={label}
                      className="min-w-0 bg-[rgb(var(--sep-colour-17110d))] px-3 py-2"
                    >
                      <p className="text-[7px] uppercase tracking-[0.19em] text-[rgb(var(--sep-colour-796448))]">
                        {label}
                      </p>

                      <p className="mt-1 break-words text-[11px] leading-5 text-[rgb(var(--sep-colour-cab89b))]">
                        {value || "Not recorded"}
                      </p>
                    </div>
                  ))}

                  <div className="min-w-0 bg-[rgb(var(--sep-colour-17110d))] px-3 py-2 sm:col-span-2 lg:col-span-1">
                    <CharacterExpertiseTotal
                      characterId={character.id!}
                    />
                  </div>
                 <div className="min-w-0 bg-[rgb(var(--sep-colour-17110d))] px-3 py-2 sm:col-span-2 lg:col-span-2">
                   
                  {own && character.id ? (
              <CharacterRemnantsWallet characterId={character.id} />
            ) : null} </div>
                </div>

              </div>

              <div className="h-full">
                <CompactHeritageCard
                  label="Ancestry"
                  entry={race}
                  href={
                    race
                      ? `/ancestries/${race.slug}`
                      : "/ancestries"
                  }
                />
              </div>

              <div className="h-full">
                {character.id ? (
                  <CharacterOrderSummary
                    characterId={character.id}
                  />
                ) : null}
              </div>
            </section>

            

            {character.music_url ? (
              <div className="mt-4">
                <CharacterMusicPlayer
                  src={character.music_url}
                />
              </div>
            ) : null}
          </div>

              <div className="min-w-0">
                {character.id ? (
                  <CharacterMechanicsDisplay
                    characterId={character.id}
                  />
                ) : null}
              </div>
            </section>
          </div>

          <div data-character-sheet-panel="profile" className="py-2 border border-[rgb(var(--sep-colour-6b5032))]/50">
          <section className="grid gap-4 md:grid-cols-2 px-2">
          <ProfileTextSection
            title="Physical description"
            value={character.physical_description}
          />

          <ProfileTextSection
            title="Personality"
            value={character.personality}
          />
        </section>

            <div className="mt-4 px-2">
              <ProfileTextSection
                title="Biography"
                value={character.biography}
              />
            </div>

            <div className="mt-4 px-2">
              <ProfileTextSection
                title="Public notes"
                value={character.public_notes}
                subtle
              />
            </div>
          </div>

          <div data-character-sheet-panel="inventory">
            {character.id ? (
              <CharacterInventoryDisplay characterId={character.id} own />
            ) : null}
          </div>

          <div data-character-sheet-panel="ledger">
            {own && character.id ? (
              <CharacterLedger characterId={character.id} />
            ) : null}
          </div>

          <div data-character-sheet-panel="gifts">
            {character.id ? (
              <CharacterGiftsDisplay characterId={character.id} />
            ) : null}
          </div>

          <div data-character-sheet-panel="warping">
            {character.id ? (
              <CharacterShapesDisplay characterId={character.id} />
            ) : null}
          </div>

          <div data-character-sheet-panel="offgame"  className="py-2 border border-[rgb(var(--sep-colour-6b5032))]/50">
            <section className="grid gap-4 px-2">
            <ProfileTextSection
              title="Offgame"
              value={character.offgame}
              subtle
            />
            </section>
          </div>

          <div data-character-sheet-panel="edit">
            {canEdit ? (
              <section className="border border-[rgb(var(--sep-colour-6b5032))]/50 bg-[rgb(var(--sep-colour-17110d))] p-5">
                <p className="text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-806b50))]">Character editing</p>
                <h2 className="mt-2 font-serif text-xl text-[rgb(var(--sep-colour-dfc79c))]">Edit character</h2>
                <p className="mt-2 text-[11px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">This character is still editable through the full character editor.</p>
                <Link
                  href="/character/edit"
                  className="mt-4 inline-flex border border-[rgb(var(--sep-colour-8d6d3e))] bg-[rgb(var(--sep-colour-332719))] px-4 py-2 text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-efd9aa))] transition hover:bg-[rgb(var(--sep-colour-49351f))]"
                >
                  Open character editor
                </Link>
              </section>
            ) : null}

            {own &&
            status === "approved" ? (
          <section className="mt-4 border border-[rgb(var(--sep-colour-6b5032))]/50 bg-[rgb(var(--sep-colour-17110d))]">
  <div className="px-4 py-3 sm:px-5">
    <h2 className="font-serif text-lg text-[rgb(var(--sep-colour-dfc79c))] sm:text-xl">
      Edit profile
    </h2>

    <p className="mt-1 text-[11px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">
      Update portrait and public character information without staff review.
    </p>
  </div>

  <div className="border-t border-[rgb(var(--sep-colour-5d452d))]/40 px-4 py-5 sm:px-5">
    <form
                action={updateApprovedCharacterProfile}
                className="space-y-5"
              >
                <label className="block">
                  <span className="text-[9px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-806b50))]">
                    Portrait URL
                  </span>

                  <input
                    type="url"
                    name="portrait_url"
                    defaultValue={
                      character.portrait_url ?? ""
                    }
                    placeholder="https://..."
                    className="mt-2 w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0d0907))] px-3 py-2.5 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))]"
                  />
                </label>

                <label className="block">
                  <span className="text-[9px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-806b50))]">
                    Character music URL
                  </span>

                  <input
                    type="url"
                    name="music_url"
                    defaultValue={
                      character.music_url ?? ""
                    }
                    placeholder="https://.../theme.mp3"
                    className="mt-2 w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0d0907))] px-3 py-2.5 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))]"
                  />

                
                </label>

                <label className="block">
  <span className="text-[9px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-806b50))]">
    Sexual orientation
  </span>

  <input
    type="text"
    name="sexual_orientation"
    maxLength={120}
    defaultValue={
      character.sexual_orientation ??
      ""
    }
    placeholder="Optional"
    className="mt-2 w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0d0907))] px-3 py-2.5 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))]"
  />
</label>

                <div className="grid gap-5 md:grid-cols-2">
                  <ApprovedProfileTextArea
                    label="Physical description"
                    name="physical_description"
                    defaultValue={
                      character.physical_description
                    }
                    required
                    rows={7}
                  />

                  <ApprovedProfileTextArea
                    label="Personality"
                    name="personality"
                    defaultValue={
                      character.personality
                    }
                    required
                    rows={7}
                  />
                </div>

                <ApprovedProfileTextArea
                  label="Biography"
                  name="biography"
                  defaultValue={
                    character.biography
                  }
                  required
                  rows={10}
                />

                <ApprovedProfileTextArea
                  label="Public notes"
                  name="public_notes"
                  defaultValue={
                    character.public_notes
                  }
                  rows={6}
                />

                <ApprovedProfileTextArea
                  label="Offgame"
                  name="offgame"
                  defaultValue={
                    character.offgame
                  }
                  rows={6}
                />

                <label className="flex items-start gap-3 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-100c09))] px-4 py-3">
                  <input
                    type="checkbox"
                    name="show_last_activity"
                    value="true"
                    defaultChecked={
                      character.show_last_activity === true
                    }
                    className="mt-0.5 h-4 w-4 shrink-0 accent-[rgb(var(--sep-colour-9a7543))]"
                  />

                  <span className="min-w-0">
                    <span className="block text-[9px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-b99768))]">
                      Show Last Activity publicly
                    </span>

                    <span className="mt-1 block text-[11px] leading-5 text-[rgb(var(--sep-colour-817463))]">
                      When enabled, other players can see when this character was last active.
                      Staff can always see Last Activity regardless of this setting.
                    </span>
                  </span>
                </label>

                <div className="flex justify-end border-t border-[rgb(var(--sep-colour-5d452d))]/40 pt-4">
                  <PendingSubmitButton
                    idleText="Save profile changes"
                    pendingText="Saving changes..."
                    className="border border-[rgb(var(--sep-colour-8d6d3e))] bg-[rgb(var(--sep-colour-332719))] px-5 py-2.5 text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-efd9aa))] transition hover:bg-[rgb(var(--sep-colour-49351f))] disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </div>
              </form>
  </div>
</section>
            ) : null}

            {own && !canEdit && status !== "approved" ? (
              <section className="border border-[rgb(var(--sep-colour-6b5032))]/50 bg-[rgb(var(--sep-colour-17110d))] p-5">
                <h2 className="font-serif text-xl text-[rgb(var(--sep-colour-dfc79c))]">Editing unavailable</h2>
                <p className="mt-2 text-[11px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">This character cannot currently be edited while it is awaiting staff review.</p>
              </section>
            ) : null}
          </div>
        </CharacterSheetTabs>
      </div>
    </div>
  );
}

function formatGender(
  value: string | null | undefined,
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

function ApprovedProfileTextArea({
  label,
  name,
  defaultValue,
  required = false,
  rows = 8,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  required?: boolean;
  rows?: number;
}) {
  return (
    <label className="block">
      <span className="text-[9px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-806b50))]">
        {label}
      </span>
      <textarea
        name={name}
        defaultValue={defaultValue ?? ""}
        required={required}
        rows={rows}
        className="mt-2 w-full resize-y border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0d0907))] px-3 py-3 text-sm leading-7 text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))]"
      />
    </label>
  );
}

function CharacterStatusPanel({
  status,
  rejectionReason,
  submittedAt,
  approvedAt,
}: {
  status: CharacterStatus;
  rejectionReason?: string | null;
  submittedAt?: string | null;
  approvedAt?: string | null;
}) {
  if (status === "submitted") {
    return (
      <section className="mb-6 border border-[rgb(var(--sep-colour-75613d))]/65 bg-[rgb(var(--sep-colour-282112))]/75 p-5">
        <p className="text-[9px] uppercase tracking-[0.25em] text-[rgb(var(--sep-colour-c0a166))]">
          Awaiting staff review
        </p>

        <h2 className="mt-2 font-serif text-2xl text-[rgb(var(--sep-colour-ead3a4))]">
          Your character has been
          submitted
        </h2>

        <p className="mt-3 text-sm leading-6 text-[rgb(var(--sep-colour-aa9c84))]">
          The character sheet is
          currently locked while the
          staff reviews it. You will be
          able to edit it again if
          corrections are requested.
        </p>

        {submittedAt ? (
          <p className="mt-3 text-xs text-[rgb(var(--sep-colour-837661))]">
            Submitted{" "}
            {formatDateTime(
              submittedAt,
            )}
          </p>
        ) : null}
      </section>
    );
  }

  if (status === "approved") {
    return null;
  }

  if (status === "rejected") {
    return (
      <section className="mb-6 border border-[rgb(var(--sep-colour-853e35))]/70 bg-[rgb(var(--sep-colour-2d1512))]/75 p-5">
        <p className="text-[9px] uppercase tracking-[0.25em] text-[rgb(var(--sep-colour-d2786d))]">
          Corrections requested
        </p>

        <h2 className="mt-2 font-serif text-2xl text-[rgb(var(--sep-colour-efb4aa))]">
          Your character was not
          approved
        </h2>

        <p className="mt-3 text-sm leading-6 text-[rgb(var(--sep-colour-bd958e))]">
          Review the staff feedback
          below, edit the character
          sheet, and submit it again
          when the requested changes
          have been completed.
        </p>

        <div className="mt-4 border border-[rgb(var(--sep-colour-70352f))]/55 bg-[rgb(var(--sep-colour-170b0a))]/60 p-4">
          <p className="text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-aa655d))]">
            Staff reason
          </p>

          <p className="mt-2 whitespace-pre-line text-sm leading-6 text-[rgb(var(--sep-colour-ddb2aa))]">
            {rejectionReason ||
              "No rejection reason was provided. Contact the staff for clarification."}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-6 border border-[rgb(var(--sep-colour-615039))]/60 bg-[rgb(var(--sep-colour-1b1710))]/75 p-5">
      <p className="text-[9px] uppercase tracking-[0.25em] text-[rgb(var(--sep-colour-a58b61))]">
        Draft character
      </p>

      <h2 className="mt-2 font-serif text-2xl text-[rgb(var(--sep-colour-dfc79c))]">
        Complete your character sheet
      </h2>

      <p className="mt-3 text-sm leading-6 text-[rgb(var(--sep-colour-a89a84))]">
        You may continue editing this
        record. When every required
        section is complete, submit it
        to the staff for approval.
      </p>
    </section>
  );
}

function CharacterStatusBadge({
  status,
}: {
  status: CharacterStatus;
}) {
  const styles: Record<
    CharacterStatus,
    string
  > = {
    draft:
      "border-[rgb(var(--sep-colour-76603e))] bg-[rgb(var(--sep-colour-2a2115))] text-[rgb(var(--sep-colour-d0ac72))]",
    submitted:
      "border-[rgb(var(--sep-colour-81703f))] bg-[rgb(var(--sep-colour-302813))] text-[rgb(var(--sep-colour-dbc27a))]",
    approved:
      "border-[rgb(var(--sep-colour-4c744f))] bg-[rgb(var(--sep-colour-17291a))] text-[rgb(var(--sep-colour-a7d1a5))]",
    rejected:
      "border-[rgb(var(--sep-colour-843f37))] bg-[rgb(var(--sep-colour-311512))] text-[rgb(var(--sep-colour-e0968c))]",
  };

  return (
    <span
      className={`inline-flex border px-3 py-2 text-[8px] uppercase tracking-[0.22em] ${styles[status]}`}
    >
      {status}
    </span>
  );
}

type PageNotice = {
  tone: "success" | "error";
  message: string;
};

function PageNoticeBanner({
  notice,
}: {
  notice: PageNotice;
}) {
  const classes =
    notice.tone === "error"
      ? "border-[rgb(var(--sep-colour-873e35))]/65 bg-[rgb(var(--sep-colour-351613))]/70 text-[rgb(var(--sep-colour-e0a39a))]"
      : "border-[rgb(var(--sep-colour-4f704e))]/65 bg-[rgb(var(--sep-colour-172619))]/70 text-[rgb(var(--sep-colour-b7d2ae))]";

  return (
    <div
      role={
        notice.tone === "error"
          ? "alert"
          : "status"
      }
      className={`mb-6 border px-4 py-3 text-sm ${classes}`}
    >
      {notice.message}
    </div>
  );
}

function getPageNotice(
  params: {
    created?: string;
    updated?: string;
    submitted?: string;
    error?: string;
  },
): PageNotice | null {
  if (params.error) {
    return {
      tone: "error",
      message: params.error,
    };
  }

  if (
    params.submitted === "true"
  ) {
    return {
      tone: "success",
      message:
        "Your character has been submitted to the staff for review.",
    };
  }

  if (params.created === "true") {
    return {
      tone: "success",
      message:
        "Your character was created successfully. Review the sheet and submit it when it is complete.",
    };
  }

  if (params.updated === "true") {
    return {
      tone: "success",
      message:
        "Your character sheet was updated successfully.",
    };
  }

  return null;
}

function CompactHeritageCard({
  label,
  entry,
  href,
}: {
  label: string;
  entry: CodexRelation | null;
  href: string;
}) {
  const colour =
    entry?.colour ?? "#8d6d3e";

  return (
    <Link
      href={href}
      className="group flex h-full min-w-0 items-center gap-3 border bg-[rgb(var(--sep-colour-120e0b))] p-3 transition hover:bg-[rgb(var(--sep-colour-1b140f))]"
      style={{
        borderColor: `${colour}66`,
      }}
    >
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden border bg-black/20 font-serif text-sm"
        style={{
          borderColor: `${colour}88`,
          color: colour,
        }}
      >
        {entry?.icon_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={entry.icon_url}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          entry?.name
            .charAt(0)
            .toUpperCase() ?? "?"
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[7px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-806b50))]">
          {label}
        </p>

        <p className="mt-0.5 font-serif text-base text-[rgb(var(--sep-colour-e1c99f))]">
          {entry?.name ?? "Not assigned"}
        </p>
      </div>

      <span
        aria-hidden="true"
        className="shrink-0 text-xs text-[rgb(var(--sep-colour-8d6d3e))] transition group-hover:translate-x-0.5 group-hover:text-[rgb(var(--sep-colour-d2ad73))]"
      >
        →
      </span>
    </Link>
  );
}

function ProfileTextSection({
  title,
  value,
  subtle = false,
}: {
  title: string;
  value?: string | null;
  subtle?: boolean;
}) {
  return (
    <article
      className={`h-full border border-[rgb(var(--sep-colour-6b5032))]/50 p-4 sm:p-5 ${
        subtle
          ? "bg-[rgb(var(--sep-colour-130f0c))]"
          : "bg-[rgb(var(--sep-colour-17110d))]"
      }`}
    >
      <h2 className="font-serif text-xl text-[rgb(var(--sep-colour-dfc79c))] sm:text-2xl">
        {title}
      </h2>

      <p className="mt-3 whitespace-pre-line break-words text-sm leading-7 text-[rgb(var(--sep-colour-b0a18d))]">
        {value ||
          "No information has been added yet."}
      </p>
    </article>
  );
}

function normaliseRelation<T>(
  value: T | T[] | null,
): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

function formatDateTime(
  value: string,
) {
  const date = new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(date);
}