import { redirect } from "next/navigation";

import {
  ensureOwnedPrivateLocation,
  enterPrivateLocation,
  invitePrivateLocation,
  kickPrivateLocationMember,
  updatePrivateLocation,
} from "./actions";
import {
  hasCharacterFeature,
} from "@/lib/features/character-feature-entitlements";
import {
  createClient,
} from "@/lib/supabase/server";

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
    .select("id")
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

  const {
    data: memberships,
    error: membershipError,
  } = await supabase
    .from("private_location_members")
    .select(`
      room_id,
      role,
      status,
      room:rooms(
        id,
        name,
        description,
        image_url
      )
    `)
    .eq(
      "character_id",
      character.id,
    )
    .eq("status", "active");

  if (membershipError) {
    throw new Error(
      membershipError.message,
    );
  }

  const accessible =
    (memberships ?? [])
      .map((row) => {
        const relation =
          row.room;

        const room =
          Array.isArray(relation)
            ? relation[0]
            : relation;

        return room
          ? {
              room,
              role: row.role,
            }
          : null;
      })
      .filter(Boolean) as Array<{
        room: {
          id: string;
          name: string;
          description: string | null;
          image_url: string | null;
        };
        role: string;
      }>;

  let ownedRoom:
    | {
        id: string;
        name: string;
        description: string | null;
        image_url: string | null;
      }
    | null = null;

  let theme:
    | {
        background_colour: string;
        text_colour: string;
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
          "id, name, description, image_url",
        )
        .eq("id", ownedRoomId)
        .single(),

      supabase
        .from("private_location_rooms")
        .select(
          "background_colour, text_colour",
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
        .neq("id", character.id),

      supabase
        .from("private_location_invitations")
        .select("recipient_character_id")
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

    const pendingIds =
      new Set(
        (pendingResult.data ?? [])
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
    <main className="mx-auto w-full max-w-6xl p-5 sm:p-7 lg:p-9">
      <header className="border border-[#60482e]/45 bg-[#15100d] px-5 py-4">
        <p className="text-[8px] uppercase tracking-[0.22em] text-[#8c704b]">
          Invitation-only locations
        </p>

        <h1 className="mt-1 font-serif text-3xl text-[#e1c89f]">
          Private Locations
        </h1>

        <p className="mt-1 text-[11px] leading-5 text-[#918472]">
          These are genuine game locations. Entering one moves your character
          there, updates presence, and uses the normal room chat.
        </p>
      </header>

      {accessible.length > 0 ? (
        <section className="mt-5 grid gap-3 md:grid-cols-2">
          {accessible.map(
            ({ room, role }) => (
              <article
                key={room.id}
                className="border border-[#60482e]/45 bg-[#17110d]"
              >
                {room.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={room.image_url}
                    alt=""
                    className="h-28 w-full object-cover"
                  />
                ) : null}

                <div className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="font-serif text-xl text-[#dfc79c]">
                      {room.name}
                    </h2>

                    <span className="text-[7px] uppercase tracking-[0.15em] text-[#8e795c]">
                      {role}
                    </span>
                  </div>

                  <p className="mt-2 line-clamp-2 text-[11px] leading-5 text-[#887b6a]">
                    {room.description ??
                      "Private indoor location."}
                  </p>

                  <form
                    action={enterPrivateLocation}
                    className="mt-4"
                  >
                    <input
                      type="hidden"
                      name="roomId"
                      value={room.id}
                    />

                    <button
                      type="submit"
                      className="w-full border border-[#8d6d3e] bg-[#332719] px-4 py-2 text-[9px] uppercase tracking-[0.16em] text-[#efd9aa]"
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
        <section className="mt-5 border border-[#60482e]/40 bg-[#15100d] p-5 text-sm text-[#887b69]">
          You currently have no accessible Private Location.
        </section>
      )}

      {ownedRoom && theme ? (
        <section className="mt-6 border border-[#60482e]/45 bg-[#15100d]">
          <div className="border-b border-[#60482e]/35 px-5 py-4">
            <h2 className="font-serif text-2xl text-[#dfc79c]">
              Manage my Private Location
            </h2>
          </div>

          <div className="grid gap-px bg-[#4f3b28]/35 lg:grid-cols-2">
            <form
              action={updatePrivateLocation}
              className="grid gap-3 bg-[#17110d] p-5"
            >
              <input
                type="hidden"
                name="roomId"
                value={ownedRoom.id}
              />

              <label className="grid gap-1">
                <span className="text-[8px] uppercase tracking-[0.15em] text-[#806b50]">
                  Location name
                </span>
                <input
                  name="name"
                  maxLength={120}
                  defaultValue={ownedRoom.name}
                  className="border border-[#60482e]/55 bg-[#0d0907] px-3 py-2 text-sm text-[#d7c4a5]"
                />
              </label>

              <label className="grid gap-1">
                <span className="text-[8px] uppercase tracking-[0.15em] text-[#806b50]">
                  Info description
                </span>
                <textarea
                  name="description"
                  rows={6}
                  maxLength={10000}
                  defaultValue={
                    ownedRoom.description ??
                    ""
                  }
                  className="resize-y border border-[#60482e]/55 bg-[#0d0907] px-3 py-2 text-sm text-[#d7c4a5]"
                />
              </label>

              <label className="grid gap-1">
                <span className="text-[8px] uppercase tracking-[0.15em] text-[#806b50]">
                  Location picture URL
                </span>
                <input
                  name="imageUrl"
                  maxLength={2000}
                  defaultValue={
                    ownedRoom.image_url ??
                    ""
                  }
                  placeholder="https://..."
                  className="border border-[#60482e]/55 bg-[#0d0907] px-3 py-2 text-sm text-[#d7c4a5]"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1">
                  <span className="text-[8px] uppercase tracking-[0.15em] text-[#806b50]">
                    Chat background
                  </span>
                  <input
                    type="color"
                    name="backgroundColour"
                    defaultValue={
                      theme.background_colour
                    }
                    className="h-10 w-full border border-[#60482e]/55 bg-transparent"
                  />
                </label>

                <label className="grid gap-1">
                  <span className="text-[8px] uppercase tracking-[0.15em] text-[#806b50]">
                    Chat text
                  </span>
                  <input
                    type="color"
                    name="textColour"
                    defaultValue={
                      theme.text_colour
                    }
                    className="h-10 w-full border border-[#60482e]/55 bg-transparent"
                  />
                </label>
              </div>

              <button
                type="submit"
                className="border border-[#8d6d3e] bg-[#332719] px-4 py-2 text-[9px] uppercase tracking-[0.16em] text-[#efd9aa]"
              >
                Save location
              </button>
            </form>

            <div className="bg-[#17110d] p-5">
              <h3 className="font-serif text-xl text-[#dfc79c]">
                Access
              </h3>

              <form
                action={invitePrivateLocation}
                className="mt-4"
              >
                <input
                  type="hidden"
                  name="roomId"
                  value={ownedRoom.id}
                />

                <select
                  name="recipientId"
                  required
                  defaultValue=""
                  className="w-full border border-[#60482e]/55 bg-[#0d0907] px-3 py-2 text-sm text-[#d7c4a5]"
                >
                  <option value="" disabled>
                    Select character to invite...
                  </option>

                  {candidates.map(
                    (candidate) => (
                      <option
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
                  className="mt-2 w-full border border-[#668657] bg-[#172313] px-4 py-2 text-[9px] uppercase tracking-[0.16em] text-[#b8d8a7]"
                >
                  Invite
                </button>
              </form>

              <div className="mt-5 space-y-2 border-t border-[#60482e]/30 pt-4">
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
                        className="flex items-center justify-between gap-3 border border-[#60482e]/35 bg-[#100c09] px-3 py-2"
                      >
                        <span className="truncate text-xs text-[#cbb899]">
                          {label(member)}
                        </span>

                        {row.role === "owner" ? (
                          <span className="text-[7px] uppercase tracking-[0.14em] text-[#806b50]">
                            Owner
                          </span>
                        ) : (
                          <form
                            action={
                              kickPrivateLocationMember
                            }
                          >
                            <input
                              type="hidden"
                              name="roomId"
                              value={ownedRoom.id}
                            />
                            <input
                              type="hidden"
                              name="characterId"
                              value={row.character_id}
                            />

                            <button
                              type="submit"
                              className="text-[8px] uppercase tracking-[0.14em] text-[#d18f83]"
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
