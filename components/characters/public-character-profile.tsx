import Image from "next/image";
import Link from "next/link";

import { CharacterReturnLink } from "@/components/characters/character-return-link";
import { startConversation } from "@/app/(portal)/messages/actions";
import { addFriendListEntry } from "@/app/(portal)/friends/actions";
import { toggleGlobalCharacterBlock } from "@/app/(portal)/characters/block-actions";
import { CharacterHealthDisplay, CharacterMechanicsDisplay } from "@/components/characters/character-mechanics-display";
import { CharacterGiftsDisplay } from "@/components/characters/character-gifts-display";
import { CharacterInventoryDisplay } from "@/components/characters/character-inventory-display";
import { CharacterTrophiesDisplay } from "@/components/characters/character-trophies-display";
import { CharacterDisplayTrophies } from "@/components/characters/character-display-trophies";
import { CharacterExpertiseTotal } from "@/components/characters/character-expertise-total";
import { CharacterMusicPlayer } from "@/components/characters/character-music-player";
import { CharacterSheetTabs, type CharacterSheetTab } from "@/components/characters/character-sheet-tabs";
import { CharacterAuditTrail } from "@/components/characters/character-audit-trail";
import { CharacterShapesDisplay } from "@/components/characters/character-shapes-display";
import { LiveCharacterPresence } from "@/components/characters/live-character-presence";
import { PublicCharacterAgeDetail } from "@/components/characters/public-character-age-detail";
import { PublicCharacterOrder } from "@/components/characters/public-character-order";
import { CharacterProfileReportButton } from "@/components/reports/character-profile-report-button";
import type {
  PublicCharacterProfile,
  PublicCodexReference,
} from "@/types/public-character";

type PublicCharacterProfileProps = {
  character: PublicCharacterProfile;
  activeTab: CharacterSheetTab;
  returnHref: string | null;
  returnLabel: string | null;
  canMessage: boolean;
  canViewLastActivity: boolean;
  viewerIsStaff: boolean;
  canUseFriendList: boolean;
  isInFriendList: boolean;
  canBlock: boolean;
  canReport: boolean;
  blockedByViewer: boolean;
  hasGlobalBlock: boolean;
};

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

function formatSepulchriaSince(
  value: string | null,
) {
  if (!value) {
    return "Not recorded";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not recorded";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function PublicCharacterProfileView({
  character,
  activeTab,
  returnHref,
  returnLabel,
  canMessage,
  canViewLastActivity,
  viewerIsStaff,
  canUseFriendList,
  isInFriendList,
  canBlock,
  canReport,
  blockedByViewer,
  hasGlobalBlock,
}: PublicCharacterProfileProps) {
  const fullName =
    character.display_name?.trim() ||
    `${character.first_name} ${character.surname}`.trim();



  return (
    <article className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {returnHref && returnLabel ? (
  <CharacterReturnLink
    href={returnHref}
    label={returnLabel}
    className="inline-flex items-center gap-2 border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-15100d))] px-4 py-2 text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-c6ab80))] transition hover:border-[rgb(var(--sep-colour-987344))] hover:bg-[rgb(var(--sep-colour-261b12))] hover:text-[rgb(var(--sep-colour-ead2a5))]"
  />
) : null}

        <div className="flex flex-wrap items-center justify-end gap-2">
          {canUseFriendList &&
          isInFriendList ? (
            <Link
              href="/friends"
              className="inline-flex items-center gap-2 border border-[rgb(var(--sep-colour-668657))] bg-[rgb(var(--sep-colour-172313))] px-4 py-2 text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-b8d8a7))] transition hover:bg-[rgb(var(--sep-colour-22321c))]"
            >
              ✓ In Friend List
            </Link>
          ) : canUseFriendList ? (
            <form
              action={addFriendListEntry}
              className="flex flex-wrap items-stretch"
            >
              <input
                type="hidden"
                name="targetCharacterId"
                value={character.id}
              />

              <select
                name="listScope"
                defaultValue="ingame"
                aria-label="Friend List section"
                className="border border-r-0 border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-2 text-[9px] text-[rgb(var(--sep-colour-c8b18d))] outline-none"
              >
                <option value="ingame">In-Game</option>
                <option value="offgame">Off-Game</option>
              </select>

              <select
                name="relationshipType"
                defaultValue="friend"
                aria-label="Relationship type"
                className="border border-r-0 border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-2 text-[9px] text-[rgb(var(--sep-colour-c8b18d))] outline-none"
              >
                <option value="friend">Friend</option>
                <option value="close_friend">Close Friend</option>
                <option value="family">Family</option>
                <option value="romance">Romance</option>
                <option value="lover">Lover</option>
                <option value="partner">Partner</option>
                <option value="spouse">Spouse</option>
              </select>

              <button
                type="submit"
                className="inline-flex items-center gap-2 border border-[rgb(var(--sep-colour-668657))] bg-[rgb(var(--sep-colour-172313))] px-4 py-2 text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-b8d8a7))] transition hover:bg-[rgb(var(--sep-colour-22321c))]"
              >
                Add to Friend List
              </button>
            </form>
          ) : null}

          {canBlock ? (
            <form action={toggleGlobalCharacterBlock}>
              <input type="hidden" name="targetCharacterId" value={character.id} />
              <input type="hidden" name="block" value={blockedByViewer ? "false" : "true"} />
              <button
                type="submit"
                className="inline-flex items-center gap-2 border border-[rgb(var(--sep-colour-7b4035))] bg-[rgb(var(--sep-colour-24100d))] px-4 py-2 text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-d99b8e))] transition hover:bg-[rgb(var(--sep-colour-351713))]"
              >
                {blockedByViewer ? "Unblock Character" : "Block Character"}
              </button>
            </form>
          ) : null}

          {canReport ? (
            <CharacterProfileReportButton
              characterId={character.id}
              availableFields={[
                ...(character.personality?.trim() ? ["bio" as const] : []),
                ...(character.physical_description?.trim() ? ["physical" as const] : []),
                ...(character.biography?.trim() ? ["background" as const] : []),
                ...(character.public_notes?.trim() ? ["public_notes" as const] : []),
                ...(character.relationships?.trim() ? ["relationships" as const] : []),
                ...(character.offgame?.trim() ? ["offgame" as const] : []),
                ...(character.portrait_url?.trim() ? ["profile_picture" as const] : []),
                ...(character.music_url?.trim() ? ["mp3_music" as const] : []),
              ]}
            />
          ) : null}

          {hasGlobalBlock && !blockedByViewer ? (
            <span className="inline-flex items-center border border-[rgb(var(--sep-colour-60482e))]/55 px-4 py-2 text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-8f8170))]">
              Communication unavailable
            </span>
          ) : null}

          {canMessage ? (
            <form action={startConversation}>
              <input
                type="hidden"
                name="recipientId"
                value={character.id}
              />

              <button
                type="submit"
                className="inline-flex items-center gap-2 border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-4 py-2 text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-efd6a8))] transition hover:border-[rgb(var(--sep-colour-b98c50))] hover:bg-[rgb(var(--sep-colour-50371f))]"
              >
                <span aria-hidden="true">✉</span>
                Send private message
              </button>
            </form>
          ) : null}
        </div>
      </div>

      <CharacterSheetTabs
        showAudit={viewerIsStaff}
        activeTab={activeTab}
        cacheKey={character.id}
>
        <div data-character-sheet-panel="short">
          {activeTab === "short" ? (
          <section className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.9fr)]">
        <div className="min-w-0">
          <section className="grid gap-4 border border-[rgb(var(--sep-colour-654b2e))]/50 bg-[rgb(var(--sep-colour-17110d))] p-4 sm:p-5 lg:grid-cols-[180px_minmax(0,1fr)]">
            <div className="mx-auto w-full max-w-[180px] lg:mx-0">

              <div className="relative aspect-[3/4] w-full overflow-hidden border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-0d0a08))]">

              {character.portrait_url ? (
                <Image
                  src={character.portrait_url}
                  alt={`Portrait of ${fullName}`}
                  fill
                  sizes="180px"
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="flex h-full items-center justify-center font-serif text-5xl text-[rgb(var(--sep-colour-5f503f))]">
                  {character.first_name
                    .charAt(0)
                    .toUpperCase()}
                  {character.surname
                    .charAt(0)
                    .toUpperCase()}
                </div>
              )}

              </div>


              <div className="mt-2 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5">

                <p className="text-[7px] uppercase tracking-[0.19em] text-[rgb(var(--sep-colour-796448))]">

                  In Sepulchria since

                </p>

                <p className="mt-1 text-[11px] leading-5 text-[rgb(var(--sep-colour-cab89b))]">

                  {formatSepulchriaSince(character.sepulchria_since)}

                </p>

              </div>

            </div>


            <div className="min-w-0">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[rgb(var(--sep-colour-5d452d))]/35 pb-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[8px] uppercase tracking-[0.26em] text-[rgb(var(--sep-colour-876a46))]">
                    Character profile
                  </p>

                  <div className="mt-1 grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
                    <h1 className="min-w-0 break-words font-serif text-3xl text-[rgb(var(--sep-colour-ecd9b2))] sm:text-[2.15rem]">
                      {fullName}
                    </h1>

                    <div className="justify-self-end">
                      <CharacterDisplayTrophies
                        characterId={character.id}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-3 grid gap-px bg-[rgb(var(--sep-colour-4f3b28))]/35 sm:grid-cols-2 lg:grid-cols-3">
                <CompactDetail
  label="Gender"
  value={
    formatGender(
      character.gender,
    )
  }
/>
                
                <CompactDetail
                  label="Pronouns"
                  value={character.pronouns}
                />

                <CompactDetail
  label="Sexual orientation"
  value={
    character.sexual_orientation
  }
/>

                <div className="min-w-0 bg-[rgb(var(--sep-colour-17110d))] px-3 py-2 [&_dt]:text-[7px] [&_dt]:uppercase [&_dt]:tracking-[0.19em] [&_dt]:text-[rgb(var(--sep-colour-796448))] [&_dd]:mt-1 [&_dd]:text-[11px] [&_dd]:leading-5 [&_dd]:text-[rgb(var(--sep-colour-cab89b))]">
                  <PublicCharacterAgeDetail
                    characterId={character.id}
                  />
                </div>

                <CompactDetail
                  label="Birthplace"
                  value={
                    character.birthplace ??
                    "Sepulchria"
                  }
                />

                <CompactDetail
                  label="Title"
                  value={
                    character.title ??
                    "Citizen"
                  }
                />

                <div className="min-w-0 bg-[rgb(var(--sep-colour-17110d))] px-3 py-2 [&_dt]:!text-[7px] [&_dt]:!uppercase [&_dt]:!tracking-[0.19em] [&_dt]:!text-[rgb(var(--sep-colour-796448))] [&_dd]:!mt-1 [&_dd]:!block [&_dd>span:first-child]:!font-sans [&_dd>span:first-child]:!text-[11px] [&_dd>span:first-child]:!font-normal [&_dd>span:first-child]:!leading-5 [&_dd>span:first-child]:!text-[rgb(var(--sep-colour-cab89b))] [&_dd>span:last-child]:!hidden">
                  <CharacterExpertiseTotal
                    characterId={character.id}
                  />
                </div>

                <LiveCharacterPresence
                  characterId={character.id}
                  initialPresence={
                    character.presence
                  }
                  initialRoom={
                    character.currentRoom
                  }
                  showLastActivity={
                    canViewLastActivity
                  }
                  viewerIsStaff={
                    viewerIsStaff
                  }
                  compact
                />
              </div>

            </div>

            <div className="mx-auto w-full max-w-[180px] space-y-2 lg:mx-0">
              <CompactHeritageCard
                label="Ancestry"
                entry={character.race}
                href={
                  character.race
                    ? `/ancestries/${character.race.slug}`
                    : "/ancestries"
                }
              />

              <PublicCharacterOrder
                membership={
                  character.orderMembership
                }
              />
            </div>

            <div className="h-full">
              <CharacterHealthDisplay
                characterId={character.id}
              />
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
              <CharacterMechanicsDisplay characterId={character.id} />
            </div>
          </section>
        
          ) : null}
        </div>

        <div data-character-sheet-panel="profile" className="py-2 border border-[rgb(var(--sep-colour-6b5032))]/50">
          <section className="grid gap-4 md:grid-cols-2 px-2">
        <ProfileSection
          title="Physical Description"
          content={
            character.physical_description
          }
        />

        <ProfileSection
          title="Personality"
          content={character.personality}
        />
      </section>

          <div className="mt-4 px-2">
            <ProfileSection title="Biography" content={character.biography} />
          </div>

          <div className="mt-4 px-2">
            <ProfileSection
              title="Public Notes"
              content={character.public_notes}
              subtle
            />
          </div>

          <div className="mt-4 px-2">
            <ProfileSection
              title="Relationships"
              content={character.relationships}
            />
          </div>
        </div>

        <div data-character-sheet-panel="inventory">
          {activeTab === "inventory" ? (
            <CharacterInventoryDisplay
              characterId={character.id}
            />
          ) : null}
        </div>

        <div data-character-sheet-panel="trophies">
          {activeTab === "trophies" ? (
            <CharacterTrophiesDisplay
              characterId={character.id}
            />
          ) : null}
        </div>

        <div data-character-sheet-panel="gifts">
          {activeTab === "gifts" ? (
            <CharacterGiftsDisplay
              characterId={character.id}
            />
          ) : null}
        </div>

        <div data-character-sheet-panel="warping">
          {activeTab === "warping" ? (
            <CharacterShapesDisplay
              characterId={character.id}
            />
          ) : null}
        </div>

        <div data-character-sheet-panel="offgame"  className="py-2 border border-[rgb(var(--sep-colour-6b5032))]/50">
            <section className="grid gap-4 px-2">
          <ProfileSection
            title="Offgame"
            content={character.offgame}
            subtle
          />
          </section>
        </div>

        <div data-character-sheet-panel="audit">
          {activeTab === "audit" &&
          viewerIsStaff ? (
            <CharacterAuditTrail
              characterId={character.id}
              staffView
            />
          ) : null}
        </div>
      </CharacterSheetTabs>
    </article>
  );
}

function CompactDetail({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div className="min-w-0 bg-[rgb(var(--sep-colour-17110d))] px-3 py-2">
      <p className="text-[7px] uppercase tracking-[0.19em] text-[rgb(var(--sep-colour-796448))]">
        {label}
      </p>

      <p className="mt-1 break-words text-[11px] leading-5 text-[rgb(var(--sep-colour-cab89b))]">
        {value || "Not recorded"}
      </p>
    </div>
  );
}

function CompactHeritageCard({
  label,
  entry,
  href,
}: {
  label: string;
  entry: PublicCodexReference | null;
  href: string;
}) {
  const colour =
    entry?.colour ?? "#8d6d3e";

  return (
    <Link
      href={href}
      className="group flex min-w-0 items-center gap-2.5 border bg-black/15 px-2.5 py-2 transition hover:bg-[rgb(var(--sep-colour-1b140f))]"
      style={{
        borderColor: `${colour}66`,
      }}
    >
      <div
        className="relative flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden border bg-black/20 font-serif text-[10px]"
        style={{
          borderColor: `${colour}88`,
          color: colour,
        }}
      >
        {entry?.icon_url ? (
          <Image
            src={entry.icon_url}
            alt=""
            fill
            sizes="24px"
            className="object-cover"
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

        <p
  className="mt-0.5 break-words text-[11px] leading-4"
  style={{
    color: entry ? colour : "#675e52",
  }}
>
  {entry?.name ?? "Not assigned"}
</p>
      </div>

      
    </Link>
  );
}

function ProfileSection({
  title,
  content,
  subtle = false,
}: {
  title: string;
  content: string | null;
  subtle?: boolean;
}) {
  if (!content?.trim()) {
    return null;
  }

  return (
    <section
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
        {content}
      </p>
    </section>
  );
}