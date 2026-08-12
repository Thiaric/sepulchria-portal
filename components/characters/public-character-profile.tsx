import Image from "next/image";
import Link from "next/link";

import { startConversation } from "@/app/(portal)/messages/actions";
import { CharacterAttributesDisplay } from "@/components/characters/character-attributes-display";
import { CharacterExpertiseTotal } from "@/components/characters/character-expertise-total";
import { CharacterHealthDisplay } from "@/components/characters/character-health-display";
import { CharacterMusicPlayer } from "@/components/characters/character-music-player";
import { LiveCharacterPresence } from "@/components/characters/live-character-presence";
import { PublicCharacterAgeDetail } from "@/components/characters/public-character-age-detail";
import type {
  PublicCharacterProfile,
} from "@/types/public-character";

type PublicCharacterProfileProps = {
  character: PublicCharacterProfile;
  returnHref: string;
  returnLabel: string;
  canMessage: boolean;
};

function ProfileSection({
  title,
  content,
}: {
  title: string;
  content: string | null;
}) {
  if (!content?.trim()) {
    return null;
  }

  return (
    <section className="border border-[#60482e]/45 bg-[#15100d]/95 p-5 sm:p-6">
      <h2 className="font-serif text-lg tracking-wide text-[#dec89f]">
        {title}
      </h2>

      <div className="mt-3 h-px bg-gradient-to-r from-[#806039]/70 via-[#806039]/20 to-transparent" />

      <p className="mt-4 whitespace-pre-line text-sm leading-7 text-[#b8aa98]">
        {content}
      </p>
    </section>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  if (!value?.trim()) {
    return null;
  }

  return (
    <div>
      <dt className="text-[9px] uppercase tracking-[0.22em] text-[#806b50]">
        {label}
      </dt>

      <dd className="mt-1 text-sm text-[#d4c4ad]">
        {value}
      </dd>
    </div>
  );
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
    <article className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={returnHref}
          className="inline-flex items-center gap-2 border border-[#60482e]/55 bg-[#15100d] px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-[#c6ab80] transition hover:border-[#987344] hover:bg-[#261b12] hover:text-[#ead2a5]"
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
              className="inline-flex items-center gap-2 border border-[#987344] bg-[#3b2919] px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-[#efd6a8] transition hover:border-[#b98c50] hover:bg-[#50371f]"
            >
              <span aria-hidden="true">✉</span>
              Send private message
            </button>
          </form>
        ) : null}
      </div>

      <section className="overflow-hidden border border-[#6a4e31]/55 bg-[#120e0b]">
        <div className="relative min-h-[260px] overflow-hidden bg-[radial-gradient(circle_at_top,#382719_0%,#17100c_45%,#0d0907_100%)]">
          <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(194,155,99,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(194,155,99,0.08)_1px,transparent_1px)] [background-size:32px_32px]" />

          <div className="relative grid gap-5 p-5 sm:p-7 xl:grid-cols-[240px_minmax(0,1fr)_300px] xl:items-stretch">
            <div className="relative mx-auto aspect-[3/4] w-full max-w-[240px] overflow-hidden border border-[#8a6840]/60 bg-[#0c0907] shadow-2xl xl:mx-0">
              {character.portrait_url ? (
                <Image
                  src={character.portrait_url}
                  alt={`Portrait of ${fullName}`}
                  fill
                  sizes="240px"
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="flex h-full items-center justify-center p-6 text-center">
                  <span className="font-serif text-5xl text-[#705334]">
                    {character.first_name
                      .charAt(0)
                      .toUpperCase()}
                    {character.surname
                      .charAt(0)
                      .toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            <div className="flex min-w-0 flex-col">
              <div className="flex flex-wrap gap-2">
                {character.race ? (
                  <Link
                    href={`/races/${character.race.slug}`}
                    className="border border-[#60482e]/50 bg-black/20 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-[#b9a991] transition hover:border-[#987344] hover:text-[#ead2a5]"
                  >
                    {character.race.name}
                  </Link>
                ) : null}

                {character.association ? (
                  <Link
                    href={`/associations/${character.association.slug}`}
                    className="border border-[#60482e]/50 bg-black/20 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-[#b9a991] transition hover:border-[#987344] hover:text-[#ead2a5]"
                  >
                    {character.association.name}
                  </Link>
                ) : null}
              </div>

              <p className="mt-5 text-[10px] uppercase tracking-[0.28em] text-[#8e704a]">
                Character record
              </p>

              <h1 className="mt-2 font-serif text-4xl leading-tight text-[#ead6ad] sm:text-5xl">
                {fullName}
              </h1>

              {character.title ? (
                <p className="mt-2 font-serif text-lg italic text-[#ae9470]">
                  {character.title}
                </p>
              ) : null}

              <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-[#a99b89]">
                {character.pronouns ? (
                  <span>{character.pronouns}</span>
                ) : null}

                {character.occupation ? (
                  <span>{character.occupation}</span>
                ) : null}
              </div>

              <div className="mt-6">
                <CharacterHealthDisplay
                  character={character}
                  compact
                />
              </div>

              <div className="mt-3">
                <CharacterAttributesDisplay
                  character={character}
                  compact
                />
              </div>
            </div>

            <LiveCharacterPresence
              characterId={character.id}
              initialPresence={
                character.presence
              }
              initialRoom={
                character.currentRoom
              }
            />
          </div>
        </div>
      </section>

      {character.music_url ? (
        <CharacterMusicPlayer
          src={character.music_url}
        />
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-5">
          
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

          <ProfileSection
            title="Biography"
            content={character.biography}
          />

          <ProfileSection
            title="Public Notes"
            content={character.public_notes}
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
        </div>

        <aside className="space-y-5">
          <section className="border border-[#60482e]/45 bg-[#15100d]/95 p-5">
            <h2 className="font-serif text-lg text-[#dec89f]">
              Character Details
            </h2>

            <dl className="mt-5 space-y-5">
              <CharacterExpertiseTotal
                characterId={character.id}
              />

              <PublicCharacterAgeDetail
                characterId={character.id}
              />

              <Detail
                label="Birthplace"
                value={
                  character.birthplace ??
                  "Sepulchria"
                }
              />

              <Detail
                label="Occupation"
                value={character.occupation}
              />

              <Detail
                label="Ancestry"
                value={
                  character.race?.name ??
                  null
                }
              />

              <Detail
                label="Association"
                value={
                  character.association
                    ?.name ?? null
                }
              />
            </dl>
          </section>
        </aside>
      </div>
    </article>
  );
}
