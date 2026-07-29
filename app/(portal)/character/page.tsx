import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export default async function CharacterPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: character, error } = await supabase
    .from("characters")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!character) {
    redirect("/character/create");
  }

  return <Profile character={character} own />;
}

type CharacterProfile = {
  id?: string;
  pronouns?: string | null;
  date_of_birth?: string | null;
  birthplace?: string | null;
  origin?: string | null;
  occupation?: string | null;
  faction?: string | null;
  title?: string | null;
  physical_description?: string | null;
  personality?: string | null;
  biography?: string | null;
  public_notes?: string | null;
  portrait_url?: string | null;
  display_name?: string | null;
};

export function Profile({
  character,
  own = false,
  messageAction = null,
}: {
  character: CharacterProfile;
  own?: boolean;
  messageAction?: React.ReactNode;
}) {
  const items = [
    ["Pronouns", character.pronouns],
    ["Born", character.date_of_birth],
    ["Birthplace", character.birthplace],
    ["Origin", character.origin],
    ["Occupation", character.occupation],
    ["Faction", character.faction],
    ["Title", character.title],
  ];

  const sections = [
    ["Physical description", character.physical_description],
    ["Personality", character.personality],
    ["Biography", character.biography],
    ["Public notes", character.public_notes],
  ];

  return (
    <div className="p-5 sm:p-7 lg:p-9">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href={own ? "/" : "/game"}
            className="text-sm text-[#b8945d] transition hover:text-[#e3c28c]"
          >
            ← Return
          </Link>

          <div className="flex items-center gap-3">
            {messageAction}

            {own ? (
              <Link
                href="/character/edit"
                className="border border-[#8d6d3e] bg-[#332719] px-4 py-2 text-[10px] uppercase tracking-[0.18em] text-[#efd9aa] transition hover:bg-[#49351f]"
              >
                Edit character
              </Link>
            ) : null}
          </div>
        </div>

        <section className="mt-6 grid gap-8 border border-[#654b2e]/50 bg-[#17110d] p-5 sm:p-7 lg:grid-cols-[240px_minmax(0,1fr)]">
          <div>
            {character.portrait_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={character.portrait_url}
                alt={`Portrait of ${character.display_name ?? "character"}`}
                className="aspect-[3/4] w-full border border-[#60482e]/50 object-cover"
              />
            ) : (
              <div className="flex aspect-[3/4] w-full items-center justify-center border border-[#60482e]/50 bg-[#0d0a08] text-5xl">
                ?
              </div>
            )}
          </div>

          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.3em] text-[#876a46]">
              Character profile
            </p>

            <h1 className="mt-3 break-words font-serif text-4xl text-[#ecd9b2] sm:text-5xl">
              {character.display_name ?? "Unnamed character"}
            </h1>

            <div className="mt-8 grid gap-px bg-[#4f3b28]/35 sm:grid-cols-2">
              {items.map(([label, value]) => (
                <div key={label} className="bg-[#17110d] p-4">
                  <p className="text-[9px] uppercase tracking-[0.25em] text-[#796448]">
                    {label}
                  </p>

                  <p className="mt-2 break-words text-sm text-[#cab89b]">
                    {value || "Not recorded"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="mt-6 space-y-6">
          {sections.map(([title, value]) => (
            <article
              key={title}
              className="border border-[#6b5032]/50 bg-[#17110d] p-5 sm:p-7"
            >
              <h2 className="font-serif text-2xl text-[#dfc79c] sm:text-3xl">
                {title}
              </h2>

              <p className="mt-5 whitespace-pre-line break-words text-sm leading-8 text-[#b0a18d]">
                {value || "No information has been added yet."}
              </p>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}