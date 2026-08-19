import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  cancelRelationshipRequest,
  removeRelationship,
  respondRelationshipRequest,
} from "./actions";
import {
  hasCharacterFeature,
} from "@/lib/features/character-feature-entitlements";
import { createClient } from "@/lib/supabase/server";

type RelationshipRow = {
  id: string;
  requester_character_id: string;
  recipient_character_id: string;
  relationship_type: string;
  status: "pending" | "accepted" | "declined";
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

  if (!user) {
    redirect("/auth/login");
  }

  const { data: character, error: characterError } =
    await supabase
      .from("characters")
      .select("id, first_name, surname, display_name")
      .eq("user_id", user.id)
      .maybeSingle();

  if (characterError) {
    throw new Error(characterError.message);
  }

  if (!character) {
    redirect("/character/create");
  }

  const enabled = await hasCharacterFeature(
    character.id,
    "friend_list",
  );

  if (!enabled) {
    return (
      <main className="mx-auto w-full max-w-5xl p-5 sm:p-7 lg:p-9">
        <section className="border border-[#60482e]/45 bg-[#15100d] p-6 sm:p-8">
          <p className="text-[9px] uppercase tracking-[0.24em] text-[#8c704b]">
            Character feature
          </p>
          <h1 className="mt-2 font-serif text-3xl text-[#e1c89f]">
            Friend List
          </h1>
          <div className="mt-6 border border-[#6b4e35]/55 bg-[#21160f] p-5">
            <p className="font-serif text-xl text-[#d9bf94]">
              This feature is not enabled.
            </p>
            <p className="mt-2 text-sm leading-7 text-[#9b8b75]">
              Friend List access can be enabled for a character by staff
              through a reward, purchase, or staff grant.
            </p>
          </div>
        </section>
      </main>
    );
  }

  const {
    data: relationshipData,
    error: relationshipError,
  } = await supabase
    .from("character_relationships")
    .select(
      "id, requester_character_id, recipient_character_id, relationship_type, status, created_at",
    )
    .or(
      `requester_character_id.eq.${character.id},recipient_character_id.eq.${character.id}`,
    )
    .in("status", ["pending", "accepted"])
    .order("created_at", { ascending: false });

  if (relationshipError) {
    throw new Error(relationshipError.message);
  }

  const relationships =
    (relationshipData ?? []) as RelationshipRow[];

  const counterpartIds = Array.from(
    new Set(
      relationships.map((relationship) =>
        relationship.requester_character_id === character.id
          ? relationship.recipient_character_id
          : relationship.requester_character_id,
      ),
    ),
  );

  let characters: CharacterRow[] = [];

  if (counterpartIds.length > 0) {
    const { data, error } = await supabase
      .from("characters")
      .select(
        "id, first_name, surname, display_name, public_slug, portrait_url",
      )
      .in("id", counterpartIds);

    if (error) {
      throw new Error(error.message);
    }

    characters = (data ?? []) as CharacterRow[];
  }

  const characterById = new Map(
    characters.map((entry) => [entry.id, entry]),
  );

  const accepted = relationships.filter(
    (relationship) =>
      relationship.status === "accepted",
  );

  const incoming = relationships.filter(
    (relationship) =>
      relationship.status === "pending" &&
      relationship.recipient_character_id === character.id,
  );

  const outgoing = relationships.filter(
    (relationship) =>
      relationship.status === "pending" &&
      relationship.requester_character_id === character.id,
  );

  return (
    <main className="mx-auto w-full max-w-6xl p-5 sm:p-7 lg:p-9">
      <header className="border border-[#60482e]/45 bg-[#15100d] p-6">
        <p className="text-[9px] uppercase tracking-[0.24em] text-[#8c704b]">
          Character relationships
        </p>
        <h1 className="mt-2 font-serif text-3xl text-[#e1c89f]">
          Friend List
        </h1>
        <p className="mt-2 text-sm leading-7 text-[#928572]">
          Manage accepted relationships and incoming or outgoing requests.
          New requests are sent from another character&apos;s public profile.
        </p>
      </header>

      {incoming.length > 0 ? (
        <section className="mt-5 border border-[#70533a]/55 bg-[#17110d]">
          <div className="border-b border-[#60482e]/35 px-5 py-4">
            <h2 className="font-serif text-xl text-[#dfc79c]">
              Incoming requests
            </h2>
          </div>
          <div className="divide-y divide-[#60482e]/30">
            {incoming.map((relationship) => {
              const other = characterById.get(
                relationship.requester_character_id,
              );

              if (!other) return null;

              return (
                <div
                  key={relationship.id}
                  className="flex flex-wrap items-center gap-4 p-5"
                >
                  <RelationshipIdentity character={other} />
                  <div className="ml-auto flex flex-wrap items-center gap-2">
                    <span className="border border-[#60482e]/50 bg-[#100c09] px-3 py-2 text-[9px] uppercase tracking-[0.16em] text-[#c4a77d]">
                      {relationshipLabel(
                        relationship.relationship_type,
                      )}
                    </span>

                    <form action={respondRelationshipRequest}>
                      <input
                        type="hidden"
                        name="relationshipId"
                        value={relationship.id}
                      />
                      <input
                        type="hidden"
                        name="response"
                        value="accept"
                      />
                      <button
                        type="submit"
                        className="border border-[#668657] bg-[#172313] px-3 py-2 text-[9px] uppercase tracking-[0.16em] text-[#b8d8a7]"
                      >
                        Accept
                      </button>
                    </form>

                    <form action={respondRelationshipRequest}>
                      <input
                        type="hidden"
                        name="relationshipId"
                        value={relationship.id}
                      />
                      <input
                        type="hidden"
                        name="response"
                        value="decline"
                      />
                      <button
                        type="submit"
                        className="border border-[#7b443b] bg-[#2a1513] px-3 py-2 text-[9px] uppercase tracking-[0.16em] text-[#d7a39a]"
                      >
                        Decline
                      </button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="mt-5 border border-[#60482e]/45 bg-[#17110d]">
        <div className="border-b border-[#60482e]/35 px-5 py-4">
          <h2 className="font-serif text-xl text-[#dfc79c]">
            Relationships
          </h2>
        </div>

        {accepted.length > 0 ? (
          <div className="grid gap-px bg-[#4f3b28]/35 md:grid-cols-2">
            {accepted.map((relationship) => {
              const otherId =
                relationship.requester_character_id === character.id
                  ? relationship.recipient_character_id
                  : relationship.requester_character_id;

              const other = characterById.get(otherId);

              if (!other) return null;

              return (
                <article
                  key={relationship.id}
                  className="bg-[#17110d] p-5"
                >
                  <RelationshipIdentity character={other} />
                  <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#60482e]/30 pt-4">
                    <span className="text-[9px] uppercase tracking-[0.17em] text-[#b99768]">
                      {relationshipLabel(
                        relationship.relationship_type,
                      )}
                    </span>

                    <form action={removeRelationship}>
                      <input
                        type="hidden"
                        name="relationshipId"
                        value={relationship.id}
                      />
                      <button
                        type="submit"
                        className="text-[8px] uppercase tracking-[0.15em] text-[#9e675e] transition hover:text-[#db9d93]"
                      >
                        Remove
                      </button>
                    </form>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="p-5 text-sm text-[#807463]">
            No accepted relationships yet.
          </p>
        )}
      </section>

      {outgoing.length > 0 ? (
        <section className="mt-5 border border-[#60482e]/45 bg-[#17110d]">
          <div className="border-b border-[#60482e]/35 px-5 py-4">
            <h2 className="font-serif text-xl text-[#dfc79c]">
              Sent requests
            </h2>
          </div>

          <div className="divide-y divide-[#60482e]/30">
            {outgoing.map((relationship) => {
              const other = characterById.get(
                relationship.recipient_character_id,
              );

              if (!other) return null;

              return (
                <div
                  key={relationship.id}
                  className="flex flex-wrap items-center gap-4 p-5"
                >
                  <RelationshipIdentity character={other} />

                  <span className="ml-auto border border-[#60482e]/50 bg-[#100c09] px-3 py-2 text-[9px] uppercase tracking-[0.16em] text-[#c4a77d]">
                    {relationshipLabel(
                      relationship.relationship_type,
                    )}
                  </span>

                  <form action={cancelRelationshipRequest}>
                    <input
                      type="hidden"
                      name="relationshipId"
                      value={relationship.id}
                    />
                    <button
                      type="submit"
                      className="text-[8px] uppercase tracking-[0.15em] text-[#9e675e] transition hover:text-[#db9d93]"
                    >
                      Cancel
                    </button>
                  </form>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}
    </main>
  );
}

function RelationshipIdentity({
  character,
}: {
  character: CharacterRow;
}) {
  return (
    <Link
      href={`/characters/${character.public_slug}`}
      className="group flex min-w-0 items-center gap-3"
    >
      <div className="relative h-12 w-12 shrink-0 overflow-hidden border border-[#60482e]/50 bg-[#0d0907]">
        {character.portrait_url ? (
          <Image
            src={character.portrait_url}
            alt=""
            fill
            sizes="48px"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center font-serif text-lg text-[#7b6549]">
            {character.first_name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      <div className="min-w-0">
        <p className="truncate font-serif text-lg text-[#dcc399] transition group-hover:text-[#f0d7aa]">
          {displayName(character)}
        </p>
        <p className="mt-1 text-[8px] uppercase tracking-[0.16em] text-[#756958]">
          Open character
        </p>
      </div>
    </Link>
  );
}
