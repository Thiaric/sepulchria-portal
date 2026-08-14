import Image from "next/image";
import Link from "next/link";

import { startConversation } from "@/app/(portal)/messages/actions";
import { CharacterAttributesDisplay } from "@/components/characters/character-attributes-display";
import { CharacterExpertiseTotal } from "@/components/characters/character-expertise-total";
import { CharacterHealthDisplay } from "@/components/characters/character-health-display";
import { CharacterMusicPlayer } from "@/components/characters/character-music-player";
import { LiveCharacterPresence } from "@/components/characters/live-character-presence";
import { PublicCharacterAgeDetail } from "@/components/characters/public-character-age-detail";
import { PublicCharacterOrder } from "@/components/characters/public-character-order";
import type {
  PublicCharacterProfile,
  PublicCodexReference,
} from "@/types/public-character";

type PublicCharacterProfileProps = {
  character: PublicCharacterProfile;
  returnHref: string;
  returnLabel: string;
  canMessage: boolean;
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

export function PublicCharacterProfileView({
  character,
  returnHref,
  returnLabel,
  canMessage,
}: PublicCharacterProfileProps) {
  const fullName =
    character.display_name?.trim() ||
    `${character.first_name} ${character.surname}`.trim();



  return (
    <article className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={returnHref}
          className="inline-flex items-center gap-2 border border-[#60482e]/55 bg-[#15100d] px-4 py-2 text-[9px] uppercase tracking-[0.18em] text-[#c6ab80] transition hover:border-[#987344] hover:bg-[#261b12] hover:text-[#ead2a5]"
        >
          <span aria-hidden="true">←</span>
          {returnLabel}
        </Link>

        {canMessage ? (
          <form action={startConversation}>
            <input
              type="hidden"
              name="recipientId"
              value={character.id}
            />

            <button
              type="submit"
              className="inline-flex items-center gap-2 border border-[#987344] bg-[#3b2919] px-4 py-2 text-[9px] uppercase tracking-[0.18em] text-[#efd6a8] transition hover:border-[#b98c50] hover:bg-[#50371f]"
            >
              <span aria-hidden="true">✉</span>
              Send private message
            </button>
          </form>
        ) : null}
      </div>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.9fr)]">
        <div className="min-w-0">
          <section className="grid gap-4 border border-[#654b2e]/50 bg-[#17110d] p-4 sm:p-5 lg:grid-cols-[180px_minmax(0,1fr)]">
            <div className="relative mx-auto aspect-[3/4] w-full max-w-[180px] overflow-hidden border border-[#60482e]/50 bg-[#0d0a08] lg:mx-0">
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
                <div className="flex h-full items-center justify-center font-serif text-5xl text-[#5f503f]">
                  {character.first_name
                    .charAt(0)
                    .toUpperCase()}
                  {character.surname
                    .charAt(0)
                    .toUpperCase()}
                </div>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#5d452d]/35 pb-3">
                <div className="min-w-0">
                  <p className="text-[8px] uppercase tracking-[0.26em] text-[#876a46]">
                    Character profile
                  </p>

                  <h1 className="mt-1 break-words font-serif text-3xl text-[#ecd9b2] sm:text-[2.15rem]">
                    {fullName}
                  </h1>
                </div>
              </div>

              <div className="mt-3 grid gap-px bg-[#4f3b28]/35 sm:grid-cols-2 lg:grid-cols-3">
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

                <div className="min-w-0 bg-[#17110d] px-3 py-2 [&_dt]:text-[7px] [&_dt]:uppercase [&_dt]:tracking-[0.19em] [&_dt]:text-[#796448] [&_dd]:mt-1 [&_dd]:text-[11px] [&_dd]:leading-5 [&_dd]:text-[#cab89b]">
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

                <div className="min-w-0 bg-[#17110d] px-3 py-2 [&_dt]:!text-[7px] [&_dt]:!uppercase [&_dt]:!tracking-[0.19em] [&_dt]:!text-[#796448] [&_dd]:!mt-1 [&_dd]:!block [&_dd>span:first-child]:!font-sans [&_dd>span:first-child]:!text-[11px] [&_dd>span:first-child]:!font-normal [&_dd>span:first-child]:!leading-5 [&_dd>span:first-child]:!text-[#cab89b] [&_dd>span:last-child]:!hidden">
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
                  compact
                />
              </div>

              <div className="mt-3">
                <CompactHeritageCard
                  label="Ancestry"
                  entry={character.race}
                  href={
                    character.race
                      ? `/races/${character.race.slug}`
                      : "/races"
                  }
                />

                <div className="mt-3">
                  <PublicCharacterOrder
                    membership={
                      character.orderMembership
                    }
                  />
                </div>
              </div>
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
          <CharacterAttributesDisplay
            character={character}
          />

          <div className="mt-4">
            <CharacterHealthDisplay
              character={character}
            />
          </div>

        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
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

      <ProfileSection
        title="Biography"
        content={character.biography}
      />

      <ProfileSection
        title="Public Notes"
        content={character.public_notes}
        subtle
      />

      {!character.biography &&
      !character.physical_description &&
      !character.personality &&
      !character.public_notes ? (
        <section className="border border-[#60482e]/45 bg-[#15100d]/95 p-8 text-center">
          <p className="font-serif text-lg text-[#b9a88f]">
            This character has not yet shared
            any public information.
          </p>
        </section>
      ) : null}
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
    <div className="min-w-0 bg-[#17110d] px-3 py-2">
      <p className="text-[7px] uppercase tracking-[0.19em] text-[#796448]">
        {label}
      </p>

      <p className="mt-1 break-words text-[11px] leading-5 text-[#cab89b]">
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
      className="group flex min-w-0 items-center gap-3 border bg-[#120e0b] p-3 transition hover:bg-[#1b140f]"
      style={{
        borderColor: `${colour}66`,
      }}
    >
      <div
        className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden border bg-black/20 font-serif text-sm"
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
            sizes="40px"
            className="object-cover"
          />
        ) : (
          entry?.name
            .charAt(0)
            .toUpperCase() ?? "?"
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[7px] uppercase tracking-[0.2em] text-[#806b50]">
          {label}
        </p>

        <p className="mt-0.5 truncate font-serif text-base text-[#e1c99f]">
          {entry?.name ?? "Not assigned"}
        </p>
      </div>

      <span
        aria-hidden="true"
        className="shrink-0 text-xs text-[#8d6d3e] transition group-hover:translate-x-0.5 group-hover:text-[#d2ad73]"
      >
        →
      </span>
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
      className={`h-full border border-[#6b5032]/50 p-4 sm:p-5 ${
        subtle
          ? "bg-[#130f0c]"
          : "bg-[#17110d]"
      }`}
    >
      <h2 className="font-serif text-xl text-[#dfc79c] sm:text-2xl">
        {title}
      </h2>

      <p className="mt-3 whitespace-pre-line break-words text-sm leading-7 text-[#b0a18d]">
        {content}
      </p>
    </section>
  );
}
