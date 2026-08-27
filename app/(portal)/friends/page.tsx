import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  addFriendListEntry,
  removeFriendListEntry,
  updateFriendListEntry,
} from "./actions";
import { FriendLivePresence } from "@/components/friends/friend-live-presence";
import { MessageCharacterModalButton } from "@/components/messages/message-character-modal-button";
import { getStaffSession } from "@/lib/auth/require-staff";
import { hasCharacterFeature } from "@/lib/features/character-feature-entitlements";
import {
  getVisiblePrivateLocations,
} from "@/lib/private-locations/access";
import {
  getOrderHeadquartersVisibility,
} from "@/lib/order-headquarters/access";
import { createClient } from "@/lib/supabase/server";

type FriendEntryRow = {
  id: string;
  target_character_id: string;
  list_scope: "ingame" | "offgame";
  relationship_type: string;
  created_at: string;
};

type CharacterRow = {
  id: string;
  first_name: string;
  surname: string;
  display_name: string | null;
  public_slug: string;
  portrait_url: string | null;
};

function relationshipLabel(value: string) {
  const labels: Record<string, string> = {
    friend: "Friend",
    close_friend: "Close Friend",
    family: "Family",
    romance: "Romance",
    lover: "Lover",
    partner: "Partner",
    spouse: "Spouse",
  };

  return labels[value] ?? value;
}

function displayName(character: CharacterRow) {
  return (
    character.display_name?.trim() ||
    `${character.first_name} ${character.surname}`.trim()
  );
}

export default async function FriendsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: character, error: characterError } =
    await supabase
      .from("characters")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

  if (characterError) {
    throw new Error(characterError.message);
  }

  if (!character) redirect("/character/create");

  const enabled = await hasCharacterFeature(
    character.id,
    "friend_list",
  );

  if (!enabled) {
    return (
      <main className="mx-auto w-full max-w-5xl p-5 sm:p-7 lg:p-9">
        <section className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-6 sm:p-8">
          <p className="text-[9px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-8c704b))]">
            Character feature
          </p>
          <h1 className="mt-2 font-serif text-3xl text-[rgb(var(--sep-colour-e1c89f))]">
            Friend List
          </h1>
          <div className="mt-6 border border-[rgb(var(--sep-colour-6b4e35))]/55 bg-[rgb(var(--sep-colour-21160f))] p-5">
            <p className="font-serif text-xl text-[rgb(var(--sep-colour-d9bf94))]">
              This feature is not enabled.
            </p>
            <p className="mt-2 text-sm leading-7 text-[rgb(var(--sep-colour-9b8b75))]">
              Friend List access can be enabled for this character by staff
              through a reward, real-money purchase, or staff grant.
            </p>
          </div>
        </section>
      </main>
    );
  }

  const {
    data: availableCharacterData,
    error: availableCharacterError,
  } = await supabase
    .from("characters")
    .select(
      "id, first_name, surname, display_name, public_slug, portrait_url",
    )
    .eq("status", "approved")
      .eq("is_system", false)
    .neq("id", character.id);

  if (availableCharacterError) {
    throw new Error(
      availableCharacterError.message,
    );
  }

  const {
    data: blockRows,
    error: blockError,
  } = await supabase
    .from("character_blocks")
    .select(
      "blocker_character_id, blocked_character_id",
    )
    .or(
      [
        `blocker_character_id.eq.${character.id}`,
        `blocked_character_id.eq.${character.id}`,
      ].join(","),
    );

  if (blockError) {
    throw new Error(
      blockError.message,
    );
  }

  const blockedCharacterIds =
    new Set<string>();

  for (const row of blockRows ?? []) {
    const blocker = String(
      row.blocker_character_id,
    );
    const blocked = String(
      row.blocked_character_id,
    );

    blockedCharacterIds.add(
      blocker === character.id
        ? blocked
        : blocker,
    );
  }

  const availableCharacters =
    ((availableCharacterData ?? []) as CharacterRow[])
      .filter(
        (availableCharacter) =>
          !blockedCharacterIds.has(
            availableCharacter.id,
          ),
      )
      .sort((a, b) =>
        displayName(a).localeCompare(
          displayName(b),
          "en",
          {
            sensitivity: "base",
          },
        ),
      );

  const { data: entryData, error: entryError } = await supabase
    .from("character_friend_entries")
    .select(
      "id, target_character_id, list_scope, relationship_type, created_at",
    )
    .eq("owner_character_id", character.id)
    .order("created_at", { ascending: true });

  if (entryError) {
    throw new Error(entryError.message);
  }

  const entries = (entryData ?? []) as FriendEntryRow[];
  const targetIds = Array.from(
    new Set(entries.map((entry) => entry.target_character_id)),
  );

  let targets: CharacterRow[] = [];

  if (targetIds.length > 0) {
    const { data, error } = await supabase
      .from("characters")
      .select(
        "id, first_name, surname, display_name, public_slug, portrait_url",
      )
      .in("id", targetIds)
      .eq("is_system", false);

    if (error) throw new Error(error.message);

    targets = (data ?? []) as CharacterRow[];
  }

  const targetById = new Map(
    targets.map((target) => [target.id, target]),
  );

  const ingame = entries.filter(
    (entry) => entry.list_scope === "ingame",
  );
  const offgame = entries.filter(
    (entry) => entry.list_scope === "offgame",
  );

  const [
    staffSession,
    visiblePrivateLocations,
    headquartersVisibility,
  ] = await Promise.all([
    getStaffSession(),
    getVisiblePrivateLocations(
      character.id,
    ),
    getOrderHeadquartersVisibility(
      character.id,
    ),
  ]);

  const isStaff =
    staffSession !== null;

  const visiblePrivateRoomIds =
    visiblePrivateLocations.map(
      (location) => location.roomId,
    );

  return (
    <main className="mx-auto w-full max-w-6xl p-5 sm:p-7 lg:p-9">
      <header className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <div className="min-w-0">
            <p className="text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-8c704b))]">
              Personal character record
            </p>

            <h1 className="mt-0.5 font-serif text-2xl leading-none text-[rgb(var(--sep-colour-e1c89f))]">
              Friend List
            </h1>
          </div>

          <p className="min-w-[220px] flex-1 text-[11px] leading-5 text-[rgb(var(--sep-colour-928572))]">
            Your private In-Game and Off-Game contact record. Adding someone
            does not notify them or require approval.
          </p>
        </div>

        <form
          action={addFriendListEntry}
          className="mt-3 grid gap-2 border-t border-[rgb(var(--sep-colour-60482e))]/30 pt-3 sm:grid-cols-[minmax(180px,1fr)_130px_150px_auto]"
        >
          <label className="sr-only" htmlFor="friend-list-character">
            Character
          </label>

          <select
            id="friend-list-character"
            name="targetCharacterId"
            required
            defaultValue=""
            className="min-w-0 border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-[10px] text-[rgb(var(--sep-colour-c8b18d))] outline-none focus:border-[rgb(var(--sep-colour-9a7543))]"
          >
            <option value="" disabled>
              Select character...
            </option>

            {availableCharacters.map(
              (availableCharacter) => (
                <option
                  key={availableCharacter.id}
                  value={availableCharacter.id}
                >
                  {displayName(
                    availableCharacter,
                  )}
                </option>
              ),
            )}
          </select>

          <select
            name="listScope"
            defaultValue="ingame"
            aria-label="Friend List section"
            className="border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-[10px] text-[rgb(var(--sep-colour-c8b18d))] outline-none focus:border-[rgb(var(--sep-colour-9a7543))]"
          >
            <option value="ingame">
              In-Game
            </option>
            <option value="offgame">
              Off-Game
            </option>
          </select>

          <select
            name="relationshipType"
            defaultValue="friend"
            aria-label="Relationship type"
            className="border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-[10px] text-[rgb(var(--sep-colour-c8b18d))] outline-none focus:border-[rgb(var(--sep-colour-9a7543))]"
          >
            <option value="friend">
              Friend
            </option>
            <option value="close_friend">
              Close Friend
            </option>
            <option value="family">
              Family
            </option>
            <option value="romance">
              Romance
            </option>
            <option value="lover">
              Lover
            </option>
            <option value="partner">
              Partner
            </option>
            <option value="spouse">
              Spouse
            </option>
          </select>

          <button
            type="submit"
            className="border border-[rgb(var(--sep-colour-668657))] bg-[rgb(var(--sep-colour-172313))] px-4 py-2 text-[9px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-b8d8a7))] transition hover:bg-[rgb(var(--sep-colour-22321c))]"
          >
            Add
          </button>
        </form>
      </header>

      <FriendSection
        title="In-Game"
        subtitle="Relationships and connections belonging to your character's in-character life."
        entries={ingame}
        targetById={targetById}
        isStaff={isStaff}
        visiblePrivateRoomIds={
          visiblePrivateRoomIds
        }
        allOrderHeadquartersRoomIds={
          headquartersVisibility.allRoomIds
        }
        visibleOrderHeadquartersRoomIds={
          headquartersVisibility.visibleRoomIds
        }
      />

      <FriendSection
        title="Off-Game"
        subtitle="Off-game contacts or player-side records kept separately from in-character relationships."
        entries={offgame}
        targetById={targetById}
        isStaff={isStaff}
        visiblePrivateRoomIds={
          visiblePrivateRoomIds
        }
        allOrderHeadquartersRoomIds={
          headquartersVisibility.allRoomIds
        }
        visibleOrderHeadquartersRoomIds={
          headquartersVisibility.visibleRoomIds
        }
      />
    </main>
  );
}

function FriendSection({
  title,
  subtitle,
  entries,
  targetById,
  isStaff,
  visiblePrivateRoomIds,
  allOrderHeadquartersRoomIds,
  visibleOrderHeadquartersRoomIds,
}: {
  title: string;
  subtitle: string;
  entries: FriendEntryRow[];
  targetById: Map<string, CharacterRow>;
  isStaff: boolean;
  visiblePrivateRoomIds: string[];
  allOrderHeadquartersRoomIds: string[];
  visibleOrderHeadquartersRoomIds: string[];
}) {
  return (
    <section className="mt-5 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-17110d))]">
      <div className="border-b border-[rgb(var(--sep-colour-60482e))]/35 px-5 py-4">
        <h2 className="font-serif text-2xl text-[rgb(var(--sep-colour-dfc79c))]">
          {title}
        </h2>
        <p className="mt-1 text-[11px] leading-5 text-[rgb(var(--sep-colour-837665))]">
          {subtitle}
        </p>
      </div>

      {entries.length > 0 ? (
        <div className="grid gap-px bg-[rgb(var(--sep-colour-4f3b28))]/35 md:grid-cols-2">
          {entries.map((entry) => {
            const target = targetById.get(
              entry.target_character_id,
            );

            if (!target) return null;

            return (
              <article
                key={entry.id}
                id={`friend-${target.id}`}
                className="scroll-mt-4 bg-[rgb(var(--sep-colour-17110d))] p-5"
              >
                <Link
                  href={`/characters/${target.public_slug}`}
                  className="group flex min-w-0 items-center gap-3"
                >
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-0d0907))]">
                    {target.portrait_url ? (
                      <Image
                        src={target.portrait_url}
                        alt=""
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center font-serif text-lg text-[rgb(var(--sep-colour-7b6549))]">
                        {target.first_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate font-serif text-lg text-[rgb(var(--sep-colour-dcc399))] transition group-hover:text-[rgb(var(--sep-colour-f0d7aa))]">
                      {displayName(target)}
                    </p>
                    <p className="mt-1 text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-756958))]">
                      {relationshipLabel(entry.relationship_type)}
                    </p>
                  </div>
                </Link>

                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[rgb(var(--sep-colour-60482e))]/25 pt-3">
                  <FriendLivePresence
                    targetCharacterId={
                      target.id
                    }
                    isStaff={isStaff}
                    visiblePrivateRoomIds={
                      visiblePrivateRoomIds
                    }
                    allOrderHeadquartersRoomIds={
                      allOrderHeadquartersRoomIds
                    }
                    visibleOrderHeadquartersRoomIds={
                      visibleOrderHeadquartersRoomIds
                    }
                  />

                  <MessageCharacterModalButton
                    recipientId={target.id}
                    recipientName={
                      displayName(target)
                    }
                    className="inline-flex h-8 items-center justify-center gap-1.5 border border-[rgb(var(--sep-colour-725638))] bg-[rgb(var(--sep-colour-21170f))] px-3 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-d6bd94))] transition hover:border-[rgb(var(--sep-colour-a47b48))] hover:text-[rgb(var(--sep-colour-f0d7aa))]"
                  />
                </div>

                <form
                  action={updateFriendListEntry}
                  className="mt-4 grid gap-2 border-t border-[rgb(var(--sep-colour-60482e))]/30 pt-4 sm:grid-cols-2"
                >
                  <input
                    type="hidden"
                    name="entryId"
                    value={entry.id}
                  />

                  <select
                    name="relationshipType"
                    defaultValue={entry.relationship_type}
                    className="border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-2 py-2 text-[10px] text-[rgb(var(--sep-colour-c8b18d))] outline-none"
                  >
                    <option value="friend">Friend</option>
                    <option value="close_friend">Close Friend</option>
                    <option value="family">Family</option>
                    <option value="romance">Romance</option>
                    <option value="lover">Lover</option>
                    <option value="partner">Partner</option>
                    <option value="spouse">Spouse</option>
                  </select>

                  <select
                    name="listScope"
                    defaultValue={entry.list_scope}
                    className="border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-2 py-2 text-[10px] text-[rgb(var(--sep-colour-c8b18d))] outline-none"
                  >
                    <option value="ingame">In-Game</option>
                    <option value="offgame">Off-Game</option>
                  </select>

                  <button
                    type="submit"
                    className="border border-[rgb(var(--sep-colour-8d6d3e))] bg-[rgb(var(--sep-colour-332719))] px-3 py-2 text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-efd9aa))] sm:col-span-2"
                  >
                    Save changes
                  </button>
                </form>

                <form
                  action={removeFriendListEntry}
                  className="mt-2 text-right"
                >
                  <input
                    type="hidden"
                    name="entryId"
                    value={entry.id}
                  />
                  <button
                    type="submit"
                    className="text-[8px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-9e675e))] transition hover:text-[rgb(var(--sep-colour-db9d93))]"
                  >
                    Remove from Friend List
                  </button>
                </form>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="p-5 text-sm text-[rgb(var(--sep-colour-807463))]">
          Nothing recorded in this section yet.
        </p>
      )}
    </section>
  );
}
