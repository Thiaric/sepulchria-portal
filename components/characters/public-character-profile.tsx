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
import { CharacterConditionsDisplay } from "@/components/characters/character-conditions-display";
import { CharacterMasterNotes } from "@/components/characters/character-master-notes";
import { CharacterLifeStateBadge } from "@/components/characters/character-life-state";
import { AutoFitCharacterName } from "@/components/characters/auto-fit-character-name";
import { CharacterExpertiseTotal } from "@/components/characters/character-expertise-total";
import { CharacterMusicPlayer } from "@/components/characters/character-music-player";
import { CharacterSheetTabs, type CharacterSheetTab } from "@/components/characters/character-sheet-tabs";
import { CharacterAuditTrail } from "@/components/characters/character-audit-trail";
import { CharacterShapesDisplay } from "@/components/characters/character-shapes-display";
import { LiveCharacterPresence } from "@/components/characters/live-character-presence";
import { PublicCharacterAgeDetail } from "@/components/characters/public-character-age-detail";
import { PublicCharacterOrder } from "@/components/characters/public-character-order";
import { CharacterProfileReportButton } from "@/components/reports/character-profile-report-button";
import { cosmeticFrameStyle } from "@/components/cosmetics/cosmetic-frame-overlay";
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
  canViewInventory: boolean;
  viewerIsStaff: boolean;
  canUseFriendList: boolean;
  isInFriendList: boolean;
  canBlock: boolean;
  canReport: boolean;
  blockedByViewer: boolean;
  hasGlobalBlock: boolean;
  sheetFrameUrl: string | null;
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
  canViewInventory,
  viewerIsStaff,
  canUseFriendList,
  isInFriendList,
  canBlock,
  canReport,
  blockedByViewer,
  hasGlobalBlock,
  sheetFrameUrl,
}: PublicCharacterProfileProps) {
  const fullName =
    character.display_name?.trim() ||
    `${character.first_name} ${character.surname}`.trim();



  return (
    <article className="space-y-4 components_characters_public_character_profile_article_article">
      <div className="flex flex-wrap items-center justify-between gap-3 components_characters_public_character_profile_div_container">
        {returnHref && returnLabel ? (
  <CharacterReturnLink
    href={returnHref}
    label={returnLabel}
    className="inline-flex items-center gap-2 border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-15100d))] px-4 py-2 text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-c6ab80))] transition hover:border-[rgb(var(--sep-colour-987344))] hover:bg-[rgb(var(--sep-colour-261b12))] hover:text-[rgb(var(--sep-colour-ead2a5))]"
  />
) : null}

        <div className="flex flex-wrap items-center justify-end gap-2 components_characters_public_character_profile_div_container_2">
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
              className="flex flex-wrap items-stretch components_characters_public_character_profile_form_add_friend_list_entry"
            >
              <input className="components_characters_public_character_profile_input_field"
                type="hidden"
                name="targetCharacterId"
                value={character.id}
              />

              <select
                name="listScope"
                defaultValue="ingame"
                aria-label="Friend List section"
                className="border border-r-0 border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-2 text-[9px] text-[rgb(var(--sep-colour-c8b18d))] outline-none components_characters_public_character_profile_select_list_scope"
              >
                <option className="components_characters_public_character_profile_option_ingame" value="ingame">In-Game</option>
                <option className="components_characters_public_character_profile_option_offgame" value="offgame">Off-Game</option>
              </select>

              <select
                name="relationshipType"
                defaultValue="friend"
                aria-label="Relationship type"
                className="border border-r-0 border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-2 text-[9px] text-[rgb(var(--sep-colour-c8b18d))] outline-none components_characters_public_character_profile_select_relationship_type"
              >
                <option className="components_characters_public_character_profile_option_friend" value="friend">Friend</option>
                <option className="components_characters_public_character_profile_option_close_friend" value="close_friend">Close Friend</option>
                <option className="components_characters_public_character_profile_option_family" value="family">Family</option>
                <option className="components_characters_public_character_profile_option_romance" value="romance">Romance</option>
                <option className="components_characters_public_character_profile_option_lover" value="lover">Lover</option>
                <option className="components_characters_public_character_profile_option_partner" value="partner">Partner</option>
                <option className="components_characters_public_character_profile_option_spouse" value="spouse">Spouse</option>
              </select>

              <button
                type="submit"
                className="inline-flex items-center gap-2 border border-[rgb(var(--sep-colour-668657))] bg-[rgb(var(--sep-colour-172313))] px-4 py-2 text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-b8d8a7))] transition hover:bg-[rgb(var(--sep-colour-22321c))] components_characters_public_character_profile_button_add_friend_list"
              >
                Add to Friend List
              </button>
            </form>
          ) : null}

          {canBlock ? (
            <form className="components_characters_public_character_profile_form_toggle_global_character_block" action={toggleGlobalCharacterBlock}>
              <input className="components_characters_public_character_profile_input_field_2" type="hidden" name="targetCharacterId" value={character.id} />
              <input className="components_characters_public_character_profile_input_block" type="hidden" name="block" value={blockedByViewer ? "false" : "true"} />
              <button
                type="submit"
                className="inline-flex items-center gap-2 border border-[rgb(var(--sep-colour-7b4035))] bg-[rgb(var(--sep-colour-24100d))] px-4 py-2 text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-d99b8e))] transition hover:bg-[rgb(var(--sep-colour-351713))] components_characters_public_character_profile_button_action"
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
            <span className="inline-flex items-center border border-[rgb(var(--sep-colour-60482e))]/55 px-4 py-2 text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-8f8170))] components_characters_public_character_profile_span_text">
              Communication unavailable
            </span>
          ) : null}

          {canMessage ? (
            <form className="components_characters_public_character_profile_form_start_conversation" action={startConversation}>
              <input className="components_characters_public_character_profile_input_recipient_id"
                type="hidden"
                name="recipientId"
                value={character.id}
              />

              <button
                type="submit"
                className="inline-flex items-center gap-2 border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-4 py-2 text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-efd6a8))] transition hover:border-[rgb(var(--sep-colour-b98c50))] hover:bg-[rgb(var(--sep-colour-50371f))] components_characters_public_character_profile_button_send_private_message"
              >
                <span className="components_characters_public_character_profile_span_text_2" aria-hidden="true">✉</span>
                Send private message
              </button>
            </form>
          ) : null}
        </div>
      </div>

      <div
        data-cosmetic-character-id={character.id}
        data-cosmetic-surface="sheet"
        className="relative isolate components_characters_public_character_profile_div_container_3"
        style={cosmeticFrameStyle(
          sheetFrameUrl,
          "sheet",
        )}
      >
        <CharacterSheetTabs
        showAudit={viewerIsStaff}
        activeTab={activeTab}
        cacheKey={character.id}
>
        <div className="components_characters_public_character_profile_div_container_4" data-character-sheet-panel="short">
          {activeTab === "short" ? (
          <section className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.9fr)] components_characters_public_character_profile_section_section">
        <div className="min-w-0 components_characters_public_character_profile_div_container_5">
          <section className="grid gap-4 border border-[rgb(var(--sep-colour-654b2e))]/50 bg-[rgb(var(--sep-colour-17110d))] p-4 sm:p-5 lg:grid-cols-[180px_minmax(0,1fr)] components_characters_public_character_profile_section_section_2">
            <div className="mx-auto w-full max-w-[180px] lg:mx-0 components_characters_public_character_profile_div_container_6">

              <div
                data-cosmetic-character-id={character.id}
                data-cosmetic-surface="portrait"
                className="relative aspect-[3/4] w-full overflow-hidden border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-0d0a08))] components_characters_public_character_profile_div_container_7"
              >

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
                <div className="flex h-full items-center justify-center font-serif text-5xl text-[rgb(var(--sep-colour-5f503f))] components_characters_public_character_profile_div_container_8">
                  {character.first_name
                    .charAt(0)
                    .toUpperCase()}
                  {character.surname
                    .charAt(0)
                    .toUpperCase()}
                </div>
              )}

              </div>


              <div className="mt-2 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 components_characters_public_character_profile_div_container_9">

                <p className="text-[7px] uppercase tracking-[0.19em] text-[rgb(var(--sep-colour-796448))] components_characters_public_character_profile_p_text">

                  In Sepulchria since

                </p>

                <p className="mt-1 text-[11px] leading-5 text-[rgb(var(--sep-colour-cab89b))] components_characters_public_character_profile_p_text_2">

                  {formatSepulchriaSince(character.sepulchria_since)}

                </p>

              </div>

            </div>


            <div className="min-w-0 components_characters_public_character_profile_div_container_10">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[rgb(var(--sep-colour-5d452d))]/35 pb-3 components_characters_public_character_profile_div_container_11">
                <div className="min-w-0 flex-1 components_characters_public_character_profile_div_container_12">
                  <p className="text-[8px] uppercase tracking-[0.26em] text-[rgb(var(--sep-colour-876a46))] components_characters_public_character_profile_p_text_3">
                    Character profile
                  </p>

                  <div className="mt-1 grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-4 components_characters_public_character_profile_div_container_13">
                    <AutoFitCharacterName
                      characterId={character.id}
                      className="text-[0.9rem] text-[rgb(var(--sep-colour-ecd9b2))] sm:text-[1rem]"
                    >
                      {fullName}
                    </AutoFitCharacterName>

                    <div className="justify-self-end components_characters_public_character_profile_div_container_14">
                      <CharacterDisplayTrophies
                        characterId={character.id}
                      />
                    </div>
                  </div>

                  <>
                    <CharacterConditionsDisplay
                      characterId={character.id}
                    />
                    <CharacterLifeStateBadge
                      characterId={character.id}
                    />
                  </>
                </div>
              </div>

              <div className="mt-3 grid gap-px bg-[rgb(var(--sep-colour-4f3b28))]/35 sm:grid-cols-2 lg:grid-cols-3 components_characters_public_character_profile_div_container_15">
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

                <div className="min-w-0 bg-[rgb(var(--sep-colour-17110d))] px-3 py-2 [&_dt]:text-[7px] [&_dt]:uppercase [&_dt]:tracking-[0.19em] [&_dt]:text-[rgb(var(--sep-colour-796448))] [&_dd]:mt-1 [&_dd]:text-[11px] [&_dd]:leading-5 [&_dd]:text-[rgb(var(--sep-colour-cab89b))] components_characters_public_character_profile_div_container_16">
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

                <div className="min-w-0 bg-[rgb(var(--sep-colour-17110d))] px-3 py-2 [&_dt]:!text-[7px] [&_dt]:!uppercase [&_dt]:!tracking-[0.19em] [&_dt]:!text-[rgb(var(--sep-colour-796448))] [&_dd]:!mt-1 [&_dd]:!block [&_dd>span:first-child]:!font-sans [&_dd>span:first-child]:!text-[11px] [&_dd>span:first-child]:!font-normal [&_dd>span:first-child]:!leading-5 [&_dd>span:first-child]:!text-[rgb(var(--sep-colour-cab89b))] [&_dd>span:last-child]:!hidden components_characters_public_character_profile_div_container_17">
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

            <div className="mx-auto w-full max-w-[180px] space-y-2 lg:mx-0 components_characters_public_character_profile_div_container_18">
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

            <div className="h-full components_characters_public_character_profile_div_container_19">
              <CharacterHealthDisplay
                characterId={character.id}
              />
            </div>
          </section>

          {character.music_url ? (
            <div className="mt-4 components_characters_public_character_profile_div_container_20">
              <CharacterMusicPlayer
                src={character.music_url}
              />
            </div>
          ) : null}
        </div>

            <div className="min-w-0 space-y-4 components_characters_public_character_profile_div_container_21">
              <CharacterMechanicsDisplay characterId={character.id} />

              <CharacterMasterNotes
                notes={character.master_notes}
              />
            </div>
          </section>
        
          ) : null}
        </div>

        <div data-character-sheet-panel="profile" className="py-2 border border-[rgb(var(--sep-colour-6b5032))]/50 components_characters_public_character_profile_div_container_22">
          <section className="grid gap-4 md:grid-cols-2 px-2 components_characters_public_character_profile_section_section_3">
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

          <div className="mt-4 px-2 components_characters_public_character_profile_div_container_23">
            <ProfileSection title="Biography" content={character.biography} />
          </div>

          <div className="mt-4 px-2 components_characters_public_character_profile_div_container_24">
            <ProfileSection
              title="Public Notes"
              content={character.public_notes}
              subtle
            />
          </div>

          <div className="mt-4 px-2 components_characters_public_character_profile_div_container_25">
            <ProfileSection
              title="Relationships"
              content={character.relationships}
            />
          </div>
        </div>

        <div className="components_characters_public_character_profile_div_container_26" data-character-sheet-panel="inventory">
          {activeTab === "inventory" ? (
            <CharacterInventoryDisplay
              characterId={character.id}
              showInventoryItems={
                canViewInventory
              }
            />
          ) : null}
        </div>

        <div className="components_characters_public_character_profile_div_container_27" data-character-sheet-panel="trophies">
          {activeTab === "trophies" ? (
            <CharacterTrophiesDisplay
              characterId={character.id}
            />
          ) : null}
        </div>

        <div className="components_characters_public_character_profile_div_container_28" data-character-sheet-panel="gifts">
          {activeTab === "gifts" ? (
            <CharacterGiftsDisplay
              characterId={character.id}
            />
          ) : null}
        </div>

        <div className="components_characters_public_character_profile_div_container_29" data-character-sheet-panel="warping">
          {activeTab === "warping" ? (
            <CharacterShapesDisplay
              characterId={character.id}
            />
          ) : null}
        </div>

        <div data-character-sheet-panel="offgame"  className="py-2 border border-[rgb(var(--sep-colour-6b5032))]/50 components_characters_public_character_profile_div_container_30">
            <section className="grid gap-4 px-2 components_characters_public_character_profile_section_section_4">
          <ProfileSection
            title="Offgame"
            content={character.offgame}
            subtle
          />
          </section>
        </div>

        <div className="components_characters_public_character_profile_div_container_31" data-character-sheet-panel="audit">
          {activeTab === "audit" &&
          viewerIsStaff ? (
            <CharacterAuditTrail
              characterId={character.id}
              staffView
            />
          ) : null}
        </div>
        </CharacterSheetTabs>
      </div>
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
    <div className="min-w-0 bg-[rgb(var(--sep-colour-17110d))] px-3 py-2 components_characters_public_character_profile_div_container_32">
      <p className="text-[7px] uppercase tracking-[0.19em] text-[rgb(var(--sep-colour-796448))] components_characters_public_character_profile_p_text_4">
        {label}
      </p>

      <p className="mt-1 break-words text-[11px] leading-5 text-[rgb(var(--sep-colour-cab89b))] components_characters_public_character_profile_p_text_5">
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
        className="relative flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden border bg-black/20 font-serif text-[10px] components_characters_public_character_profile_div_container_33"
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

      <div className="min-w-0 flex-1 components_characters_public_character_profile_div_container_34">
        <p className="text-[7px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-806b50))] components_characters_public_character_profile_p_text_6">
          {label}
        </p>

        <p
  className="mt-0.5 break-words text-[11px] leading-4 components_characters_public_character_profile_p_text_7"
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
      className={[((`h-full border border-[rgb(var(--sep-colour-6b5032))]/50 p-4 sm:p-5 ${
        subtle
          ? "bg-[rgb(var(--sep-colour-130f0c))]"
          : "bg-[rgb(var(--sep-colour-17110d))]"
      }`)), "components_characters_public_character_profile_section_section_5"].filter(Boolean).join(" ")}
    >
      <h2 className="font-serif text-xl text-[rgb(var(--sep-skin-c1,var(--sep-colour-dfc79c)))] sm:text-2xl components_characters_public_character_profile_h2_heading">
        {title}
      </h2>

      <p className="mt-3 whitespace-pre-line break-words text-sm leading-7 text-[rgb(var(--sep-skin-c2,var(--sep-colour-b0a18d)))] components_characters_public_character_profile_p_text_8">
        {content}
      </p>
    </section>
  );
}