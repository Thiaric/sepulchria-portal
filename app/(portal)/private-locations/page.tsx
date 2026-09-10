import { redirect } from "next/navigation";
import { CollapsibleRoomDescription } from "@/components/world/collapsible-room-description";
import { LocationAtmosphericImage } from "@/components/world/location-atmospheric-image";
import { LocationImageLightbox } from "@/components/world/location-image-lightbox";
import {
  LocationImageSaveForm,
} from "@/components/world/location-image-save-form";
import {
  InvitationOwnerStateRefresh,
} from "@/components/invitations/invitation-owner-state-refresh";
import {
  cancelPrivateLocationInvitation,
  ensureOwnedPrivateLocation,
  enterPrivateLocation,
  invitePrivateLocation,
  kickPrivateLocationMember,
  updatePrivateLocation,
} from "../private-location/actions";
import {
  hasCharacterFeature,
} from "@/lib/features/character-feature-entitlements";
import {
  createClient,
} from "@/lib/supabase/server";
import {
  getVisiblePrivateLocations,
} from "@/lib/private-locations/access";

type CharacterSummary = {
  id: string;
  display_name: string | null;
  first_name: string;
  surname: string;
};

function label(
  character: CharacterSummary,
) {
  return (
    character.display_name?.trim() ||
    `${character.first_name} ${character.surname}`.trim()
  );
}

export default async function PrivateLocationPage() {
  const supabase =
    await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const {
    data: character,
    error: characterError,
  } = await supabase
    .from("characters")
    .select(
      "id, display_name, first_name, surname",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (characterError) {
    throw new Error(
      characterError.message,
    );
  }

  if (!character) {
    redirect("/character/create");
  }

  const ownerEnabled =
    await hasCharacterFeature(
      character.id,
      "private_chat",
    );

  const ownedRoomId =
    ownerEnabled
      ? await ensureOwnedPrivateLocation()
      : null;

  const visibleLocations =
    await getVisiblePrivateLocations(
      character.id,
    );

  let accessible =
    visibleLocations.map(
      (location) => ({
        room: {
          id: location.roomId,
          name: location.name,
          description:
            location.description,
          image_url:
            location.imageUrl,
        },
        role: location.role,
        ownerName: location.ownerName,
      }),
    );

  let ownedRoom:
    | {
        id: string;
        name: string;
        description: string | null;
        image_url: string | null;
        background_image_url: string | null;
      }
    | null = null;

  let theme:
    | {
        background_colour: string;
        speech_colour: string;
        action_colour: string;
        system_colour: string;
        whisper_background_colour: string;
        whisper_text_colour: string;
        offgame_background_colour: string;
        offgame_text_colour: string;
      }
    | null = null;

  let members: Array<{
    character_id: string;
    role: string;
    character:
      | CharacterSummary
      | CharacterSummary[]
      | null;
  }> = [];

  let candidates:
    CharacterSummary[] = [];

  let pendingInvitations: Array<{
    id: string;
    recipient_character_id: string;
    recipient:
      | CharacterSummary
      | CharacterSummary[]
      | null;
  }> = [];

  if (ownedRoomId) {
    const [
      roomResult,
      themeResult,
      membersResult,
      candidateResult,
      pendingResult,
    ] = await Promise.all([
      supabase
        .from("rooms")
        .select(
          "id, name, description, image_url, background_image_url",
        )
        .eq("id", ownedRoomId)
        .single(),

      supabase
        .from("private_location_rooms")
        .select(
          "background_colour, speech_colour, action_colour, system_colour, whisper_background_colour, whisper_text_colour, offgame_background_colour, offgame_text_colour",
        )
        .eq("room_id", ownedRoomId)
        .single(),

      supabase
        .from("private_location_members")
        .select(`
          character_id,
          role,
          character:characters(
            id,
            display_name,
            first_name,
            surname
          )
        `)
        .eq("room_id", ownedRoomId)
        .eq("status", "active"),

      supabase
        .from("characters")
        .select(
          "id, display_name, first_name, surname",
        )
        .eq("status", "approved")
      .eq("is_system", false)
        .neq("id", character.id),

      supabase
        .from("private_location_invitations")
        .select(`
          id,
          recipient_character_id,
          recipient:characters!private_location_invitations_recipient_character_id_fkey(
            id,
            display_name,
            first_name,
            surname
          )
        `)
        .eq("room_id", ownedRoomId)
        .eq("status", "pending"),
    ]);

    const firstError =
      roomResult.error ??
      themeResult.error ??
      membersResult.error ??
      candidateResult.error ??
      pendingResult.error;

    if (firstError) {
      throw new Error(
        firstError.message,
      );
    }

    ownedRoom =
      roomResult.data;

    if (
      ownedRoom &&
      !accessible.some(
        (entry) =>
          entry.room.id ===
          ownedRoom?.id,
      )
    ) {
      accessible = [
        {
          room: ownedRoom,
          role: "owner",
          ownerName: label(
            character as CharacterSummary,
          ),
        },
        ...accessible,
      ];
    }

    theme =
      themeResult.data;

    members =
      membersResult.data ?? [];

    const memberIds =
      new Set(
        members.map(
          (member) =>
            member.character_id,
        ),
      );

    pendingInvitations =
      (pendingResult.data ?? []) as typeof pendingInvitations;

    const pendingIds =
      new Set(
        pendingInvitations
          .map(
            (row) =>
              row.recipient_character_id,
          ),
      );

    const availableCandidates =
      (candidateResult.data ??
        []) as CharacterSummary[];

    candidates =
      availableCandidates
        .filter(
          (candidate) =>
            !memberIds.has(
              candidate.id,
            ) &&
            !pendingIds.has(
              candidate.id,
            ),
        )
        .sort((a, b) =>
          label(a).localeCompare(
            label(b),
          ),
        );
  }

  return (
    <main className="mx-auto w-full max-w-6xl p-5 sm:p-7 lg:p-9 private_locations_page_main_main">
      <header className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] px-5 py-4 private_locations_page_header_private_locations">
        

        <h1 className="mt-1 font-serif text-3xl text-[rgb(var(--sep-colour-8c704b))] private_locations_page_h1_private_locations">
          Private Locations
        </h1>

        
      </header>

      {accessible.length > 0 ? (
        <section className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3 private_locations_page_section_section">
          {accessible.map(
            ({ room, ownerName }) => (
              <article
  key={room.id}
  className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-17110d))] private_locations_page_article_article"
>
  
{room.image_url ? (
  <div className="relative aspect-[16/7] w-full overflow-hidden border-b border-[rgb(var(--sep-colour-584128))]/45 bg-[rgb(var(--sep-colour-0b0806))] private_locations_page_div_container">
    <LocationAtmosphericImage
      src={room.image_url}
      alt={room.name}
      sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
      objectFit="cover"
    />

    <LocationImageLightbox
      src={room.image_url}
      name={room.name}
    />

    <div className="pointer-events-none absolute inset-0 z-[6] bg-gradient-to-t from-[rgb(var(--sep-colour-120e0b))]/65 via-transparent to-transparent private_locations_page_div_container_2" />
  </div>
) : null}
  <div className="p-4 private_locations_page_div_container_3">
                  <div className="flex items-center justify-between gap-3 private_locations_page_div_container_4">
                    <h2 className="font-serif text-xl text-[rgb(var(--sep-skin-c2))] private_locations_page_h2_heading">
  {room.name}
</h2>

                    <span className="text-[7px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-8e795c))] private_locations_page_span_text">
                      Owner · {ownerName}
                    </span>
                  </div>

                  {room.description ? (
  <CollapsibleRoomDescription
    body={room.description}
  />
) : (
  <p className="mt-2 text-[11px] leading-5 text-[rgb(var(--sep-colour-887b6a))] private_locations_page_p_text">
    Private indoor location.
  </p>
)}

                  <form
                    action={enterPrivateLocation}
                    className="mt-4 private_locations_page_form_enter_private_location"
                  >
                    <input className="private_locations_page_input_room_id"
                      type="hidden"
                      name="roomId"
                      value={room.id}
                    />

                    <button
                      type="submit"
                      className="w-full border border-[rgb(var(--sep-colour-8d6d3e))] bg-[rgb(var(--sep-colour-332719))] px-4 py-2 text-[9px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-efd9aa))] private_locations_page_button_enter_location"
                    >
                      Enter location
                    </button>
                  </form>
                </div>
              </article>
            ),
          )}
        </section>
      ) : (
        <section className="mt-5 border border-[rgb(var(--sep-colour-60482e))]/40 bg-[rgb(var(--sep-colour-15100d))] p-5 text-sm text-[rgb(var(--sep-colour-887b69))] private_locations_page_section_section_2">
          You currently have no accessible Private Location.
        </section>
      )}

      {ownedRoom && theme ? (
        <section className="mt-6 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] private_locations_page_section_section_3">
          <InvitationOwnerStateRefresh
            kind="private"
            scopeId={ownedRoom.id}
            pendingIds={
              pendingInvitations.map(
                (row) => row.id,
              )
            }
          />
          <div className="border-b border-[rgb(var(--sep-colour-60482e))]/35 px-5 py-4 private_locations_page_div_manage_private_location">
            <h2 className="font-serif text-2xl text-[rgb(var(--sep-colour-dfc79c))] private_locations_page_h2_manage_private_location">
              Manage my Private Location
            </h2>
          </div>

          <div className="grid gap-px bg-[rgb(var(--sep-colour-4f3b28))]/35 lg:grid-cols-2 private_locations_page_div_container_5">
            <LocationImageSaveForm
  action={updatePrivateLocation}
  className="grid gap-3 bg-[rgb(var(--sep-colour-17110d))] p-5"
>
              <input className="private_locations_page_input_room_id_2"
                type="hidden"
                name="roomId"
                value={ownedRoom.id}
              />

              <label className="grid gap-1 private_locations_page_label_label">
                <span className="text-[8px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-806b50))] private_locations_page_span_text_2">
                  Location Image URL
                </span>
                <input
                  name="imageUrl"
                  maxLength={2000}
                  defaultValue={
                    ownedRoom.image_url ??
                    ""
                  }
                  placeholder="https://..."
                  className="border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0d0907))] px-3 py-2 text-sm text-[rgb(var(--sep-colour-d7c4a5))] private_locations_page_input_image_url"
                />
              </label>

              <p className="text-[8px] leading-4 text-[rgb(var(--sep-colour-6f6252))] private_locations_page_p_text_2">
                Shown on the Private Locations page as this location&apos;s image.
              </p>

              <label className="grid gap-1 private_locations_page_label_label_2">
                <span className="text-[8px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-806b50))] private_locations_page_span_text_3">
                  Background Image URL
                </span>
                <input
                  name="backgroundImageUrl"
                  maxLength={2000}
                  defaultValue={
                    ownedRoom.background_image_url ??
                    ""
                  }
                  placeholder="https://..."
                  className="border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0d0907))] px-3 py-2 text-sm text-[rgb(var(--sep-colour-d7c4a5))] private_locations_page_input_background_image_url"
                />
              </label>

              <p className="text-[8px] leading-4 text-[rgb(var(--sep-colour-6f6252))] private_locations_page_p_text_3">
                Used only as the chat background while characters are inside this Private Location. It overrides each character&apos;s equipped Location Atmosphere cosmetic while they are here.
              </p>

              <button
                type="submit"
                className="border border-[rgb(var(--sep-colour-8d6d3e))] bg-[rgb(var(--sep-colour-332719))] px-4 py-2 text-[9px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-efd9aa))] private_locations_page_button_save_location_images"
              >
                Save location images
              </button>
            </LocationImageSaveForm>

            <div className="bg-[rgb(var(--sep-colour-17110d))] p-5 private_locations_page_div_access">
              <h3 className="font-serif text-xl text-[rgb(var(--sep-colour-dfc79c))] private_locations_page_h3_access">
                Access
              </h3>

              <form
                action={invitePrivateLocation}
                className="mt-4 private_locations_page_form_invite_private_location"
              >
                <input className="private_locations_page_input_room_id_3"
                  type="hidden"
                  name="roomId"
                  value={ownedRoom.id}
                />

                <select
                  name="recipientId"
                  required
                  defaultValue=""
                  className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0d0907))] px-3 py-2 text-sm text-[rgb(var(--sep-colour-d7c4a5))] private_locations_page_select_recipient_id"
                >
                  <option className="private_locations_page_option_recipient_id" value="" disabled>
                    Select character to invite...
                  </option>

                  {candidates.map(
                    (candidate) => (
                      <option className="private_locations_page_option_option"
                        key={candidate.id}
                        value={candidate.id}
                      >
                        {label(candidate)}
                      </option>
                    ),
                  )}
                </select>

                <button
                  type="submit"
                  className="mt-2 w-full border border-[rgb(var(--sep-colour-668657))] bg-[rgb(var(--sep-colour-172313))] px-4 py-2 text-[9px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-b8d8a7))] private_locations_page_button_invite"
                >
                  Invite
                </button>
              </form>

              {pendingInvitations.length > 0 ? (
                <div className="mt-5 space-y-2 border-t border-[rgb(var(--sep-colour-60482e))]/30 pt-4 private_locations_page_div_access_2">
                  <p className="text-[8px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-806b50))] private_locations_page_p_text_4">
                    Pending invitations
                  </p>

                  {pendingInvitations.map((row) => {
                    const relation =
                      row.recipient;

                    const recipient =
                      Array.isArray(relation)
                        ? relation[0]
                        : relation;

                    if (!recipient) {
                      return null;
                    }

                    return (
                      <div
                        key={row.id}
                        className="flex items-center justify-between gap-3 border border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 private_locations_page_div_container_6"
                      >
                        <span className="truncate text-xs text-[rgb(var(--sep-colour-cbb899))] private_locations_page_span_text_4">
                          {label(recipient)}
                        </span>

                        <form className="private_locations_page_form_cancel_private_location_invitation"
                          action={
                            cancelPrivateLocationInvitation
                          }
                        >
                          <input className="private_locations_page_input_room_id_4"
                            type="hidden"
                            name="roomId"
                            value={ownedRoom.id}
                          />
                          <input className="private_locations_page_input_invitation_id"
                            type="hidden"
                            name="invitationId"
                            value={row.id}
                          />

                          <button
                            type="submit"
                            className="text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-d18f83))] private_locations_page_button_cancel"
                          >
                            Cancel
                          </button>
                        </form>
                      </div>
                    );
                  })}
                </div>
              ) : null}

              <div className="mt-5 space-y-2 border-t border-[rgb(var(--sep-colour-60482e))]/30 pt-4 private_locations_page_div_access_3">
                {members.map(
                  (row) => {
                    const relation =
                      row.character;

                    const member =
                      Array.isArray(relation)
                        ? relation[0]
                        : relation;

                    if (!member) {
                      return null;
                    }

                    return (
                      <div
                        key={row.character_id}
                        className="flex items-center justify-between gap-3 border border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 private_locations_page_div_container_7"
                      >
                        <span className="truncate text-xs text-[rgb(var(--sep-colour-cbb899))] private_locations_page_span_text_5">
                          {label(member)}
                        </span>

                        {row.role === "owner" ? (
                          <span className="text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-806b50))] private_locations_page_span_text_6">
                            Owner
                          </span>
                        ) : (
                          <form className="private_locations_page_form_kick_private_location_member"
                            action={
                              kickPrivateLocationMember
                            }
                          >
                            <input className="private_locations_page_input_room_id_5"
                              type="hidden"
                              name="roomId"
                              value={ownedRoom.id}
                            />
                            <input className="private_locations_page_input_character_id"
                              type="hidden"
                              name="characterId"
                              value={row.character_id}
                            />

                            <button
                              type="submit"
                              className="text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-d18f83))] private_locations_page_button_kick"
                            >
                              Kick
                            </button>
                          </form>
                        )}
                      </div>
                    );
                  },
                )}
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}
