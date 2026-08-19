import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  removeFriendListEntry,
  updateFriendListEntry,
} from "./actions";
import { hasCharacterFeature } from "@/lib/features/character-feature-entitlements";
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
              Friend List access can be enabled for this character by staff
              through a reward, real-money purchase, or staff grant.
            </p>
          </div>
        </section>
      </main>
    );
  }

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
      .in("id", targetIds);

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

  return (
    <main className="mx-auto w-full max-w-6xl p-5 sm:p-7 lg:p-9">
      <header className="border border-[#60482e]/45 bg-[#15100d] p-6">
        <p className="text-[9px] uppercase tracking-[0.24em] text-[#8c704b]">
          Personal character record
        </p>
        <h1 className="mt-2 font-serif text-3xl text-[#e1c89f]">
          Friend List
        </h1>
        <p className="mt-2 text-sm leading-7 text-[#928572]">
          This list belongs only to your character. Adding someone does not
          notify them and does not require their approval.
        </p>
      </header>

      <FriendSection
        title="In-Game"
        subtitle="Relationships and connections belonging to your character's in-character life."
        entries={ingame}
        targetById={targetById}
      />

      <FriendSection
        title="Off-Game"
        subtitle="Off-game contacts or player-side records kept separately from in-character relationships."
        entries={offgame}
        targetById={targetById}
      />
    </main>
  );
}

function FriendSection({
  title,
  subtitle,
  entries,
  targetById,
}: {
  title: string;
  subtitle: string;
  entries: FriendEntryRow[];
  targetById: Map<string, CharacterRow>;
}) {
  return (
    <section className="mt-5 border border-[#60482e]/45 bg-[#17110d]">
      <div className="border-b border-[#60482e]/35 px-5 py-4">
        <h2 className="font-serif text-2xl text-[#dfc79c]">
          {title}
        </h2>
        <p className="mt-1 text-[11px] leading-5 text-[#837665]">
          {subtitle}
        </p>
      </div>

      {entries.length > 0 ? (
        <div className="grid gap-px bg-[#4f3b28]/35 md:grid-cols-2">
          {entries.map((entry) => {
            const target = targetById.get(
              entry.target_character_id,
            );

            if (!target) return null;

            return (
              <article
                key={entry.id}
                className="bg-[#17110d] p-5"
              >
                <Link
                  href={`/characters/${target.public_slug}`}
                  className="group flex min-w-0 items-center gap-3"
                >
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden border border-[#60482e]/50 bg-[#0d0907]">
                    {target.portrait_url ? (
                      <Image
                        src={target.portrait_url}
                        alt=""
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center font-serif text-lg text-[#7b6549]">
                        {target.first_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate font-serif text-lg text-[#dcc399] transition group-hover:text-[#f0d7aa]">
                      {displayName(target)}
                    </p>
                    <p className="mt-1 text-[8px] uppercase tracking-[0.16em] text-[#756958]">
                      {relationshipLabel(entry.relationship_type)}
                    </p>
                  </div>
                </Link>

                <form
                  action={updateFriendListEntry}
                  className="mt-4 grid gap-2 border-t border-[#60482e]/30 pt-4 sm:grid-cols-2"
                >
                  <input
                    type="hidden"
                    name="entryId"
                    value={entry.id}
                  />

                  <select
                    name="relationshipType"
                    defaultValue={entry.relationship_type}
                    className="border border-[#60482e]/55 bg-[#100c09] px-2 py-2 text-[10px] text-[#c8b18d] outline-none"
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
                    className="border border-[#60482e]/55 bg-[#100c09] px-2 py-2 text-[10px] text-[#c8b18d] outline-none"
                  >
                    <option value="ingame">In-Game</option>
                    <option value="offgame">Off-Game</option>
                  </select>

                  <button
                    type="submit"
                    className="border border-[#8d6d3e] bg-[#332719] px-3 py-2 text-[8px] uppercase tracking-[0.16em] text-[#efd9aa] sm:col-span-2"
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
                    className="text-[8px] uppercase tracking-[0.15em] text-[#9e675e] transition hover:text-[#db9d93]"
                  >
                    Remove from Friend List
                  </button>
                </form>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="p-5 text-sm text-[#807463]">
          Nothing recorded in this section yet.
        </p>
      )}
    </section>
  );
}
