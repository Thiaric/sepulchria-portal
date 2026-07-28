import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

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
    .select(
      `
        id,
        first_name,
        surname,
        display_name,
        pronouns,
        date_of_birth,
        birthplace,
        origin,
        occupation,
        biography,
        portrait_url,
        status,
        created_at,
        updated_at
      `,
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load character: ${error.message}`);
  }

  if (!character) {
    redirect("/character/create");
  }

  const formattedBirthDate = character.date_of_birth
    ? new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date(`${character.date_of_birth}T00:00:00`))
    : "Not recorded";

  const formattedCreatedDate = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(character.created_at));

  return (
    <main className="min-h-screen bg-[#100d0b] text-[#e7d5b0]">
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(120,82,38,0.16),_transparent_38%),linear-gradient(to_bottom,_#18120e,_#0d0a08)]">
        <header className="border-b border-[#654b2e]/40 bg-[#0c0a08]/90">
          <div className="mx-auto flex min-h-20 max-w-[1400px] items-center justify-between gap-5 px-5 lg:px-8">
            <div>
              <Link
                href="/"
                className="font-serif text-2xl font-semibold tracking-[0.22em] text-[#d9bd82] sm:text-3xl"
              >
                SEPULCHRIA
              </Link>

              <p className="mt-1 text-[10px] uppercase tracking-[0.32em] text-[#887966]">
                Chronicle of the Veiled City
              </p>
            </div>

            <Link
              href="/"
              className="text-xs uppercase tracking-[0.22em] text-[#b8945d] transition hover:text-[#ecd29e]"
            >
              ← Return to dashboard
            </Link>
          </div>
        </header>

        <div className="mx-auto max-w-[1400px] px-5 py-10 lg:px-8 lg:py-14">
          <div className="mb-9 border-b border-[#60472d]/40 pb-8">
            <p className="text-xs uppercase tracking-[0.35em] text-[#9b7848]">
              Character record
            </p>

            <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="font-serif text-4xl text-[#ecd9b2] sm:text-5xl">
                  {character.display_name}
                </h1>

                <p className="mt-3 text-sm uppercase tracking-[0.2em] text-[#a38357]">
                  {character.occupation || "Occupation unspecified"}
                </p>
              </div>

              <div className="w-fit border border-[#765937] bg-[#241a12] px-4 py-2 text-[10px] uppercase tracking-[0.25em] text-[#d3b176]">
                Status: {character.status}
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
            <aside>
              <section className="border border-[#6a5032]/50 bg-[#17110d] p-5">
                <div className="flex aspect-[4/5] items-center justify-center overflow-hidden border border-dashed border-[#654c31] bg-[#0d0a08]">
                  {character.portrait_url ? (
                    <img
                      src={character.portrait_url}
                      alt={`Portrait of ${character.display_name}`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="font-serif text-sm italic text-[#756956]">
                      No portrait selected
                    </span>
                  )}
                </div>

                <div className="mt-5">
                  <p className="font-serif text-2xl text-[#dec69a]">
                    {character.display_name}
                  </p>

                  <p className="mt-2 text-xs uppercase tracking-[0.2em] text-[#9c7a4e]">
                    {character.pronouns || "Pronouns unspecified"}
                  </p>
                </div>

                <div className="mt-6 space-y-4 border-t border-[#59432c]/40 pt-5">
                  <SidebarDetail
                    label="Birthplace"
                    value={character.birthplace || "Not recorded"}
                  />

                  <SidebarDetail
                    label="Origin"
                    value={character.origin || "Not recorded"}
                  />

                  <SidebarDetail
                    label="Date of birth"
                    value={formattedBirthDate}
                  />

                  <SidebarDetail
                    label="Record created"
                    value={formattedCreatedDate}
                  />
                </div>
              </section>

              <section className="mt-6 border border-[#60482e]/40 bg-[#14100d] p-5">
                <p className="text-[10px] uppercase tracking-[0.3em] text-[#876a46]">
                  Record management
                </p>

                <p className="mt-3 text-xs leading-5 text-[#8f8271]">
                  Update your character&apos;s identity, background, occupation,
                  biography and portrait.
                </p>

                <Link
                  href="/character/edit"
                  className="mt-5 block border border-[#85653c] bg-[#342617] px-4 py-3 text-center text-[10px] uppercase tracking-[0.22em] text-[#efd4a0] transition hover:bg-[#4a351f]"
                >
                  Edit character
                </Link>
              </section>
            </aside>

            <section className="space-y-6">
              <article className="border border-[#6b5032]/50 bg-[#17110d]">
                <div className="border-b border-[#59432c]/40 px-6 py-5 sm:px-8">
                  <p className="text-[10px] uppercase tracking-[0.32em] text-[#927047]">
                    Personal record
                  </p>

                  <h2 className="mt-2 font-serif text-3xl text-[#dfc79c]">
                    Identity
                  </h2>
                </div>

                <div className="grid gap-px bg-[#4f3b28]/35 sm:grid-cols-2">
                  <DetailCard
                    label="First name"
                    value={character.first_name}
                  />

                  <DetailCard label="Surname" value={character.surname} />

                  <DetailCard
                    label="Pronouns"
                    value={character.pronouns || "Not recorded"}
                  />

                  <DetailCard
                    label="Occupation"
                    value={character.occupation || "Not recorded"}
                  />

                  <DetailCard
                    label="Birthplace"
                    value={character.birthplace || "Not recorded"}
                  />

                  <DetailCard
                    label="Origin"
                    value={character.origin || "Not recorded"}
                  />
                </div>
              </article>

              <article className="border border-[#6b5032]/50 bg-[#17110d]">
                <div className="border-b border-[#59432c]/40 px-6 py-5 sm:px-8">
                  <p className="text-[10px] uppercase tracking-[0.32em] text-[#927047]">
                    Written history
                  </p>

                  <h2 className="mt-2 font-serif text-3xl text-[#dfc79c]">
                    Biography
                  </h2>
                </div>

                <div className="px-6 py-7 sm:px-8">
                  {character.biography ? (
                    <p className="whitespace-pre-line text-sm leading-8 text-[#b0a18d] sm:text-base">
                      {character.biography}
                    </p>
                  ) : (
                    <p className="font-serif text-sm italic leading-7 text-[#776b5b]">
                      No biography has been written for this character yet.
                    </p>
                  )}
                </div>
              </article>

              <div className="grid gap-6 md:grid-cols-2">
                <article className="border border-[#60482f]/45 bg-[#15100d] p-6">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-[#886945]">
                    Future section
                  </p>

                  <h3 className="mt-3 font-serif text-2xl text-[#d6bd91]">
                    Inventory
                  </h3>

                  <p className="mt-3 text-sm leading-6 text-[#928574]">
                    Objects, currency, equipment and possessions will eventually
                    appear here.
                  </p>
                </article>

                <article className="border border-[#60482f]/45 bg-[#15100d] p-6">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-[#886945]">
                    Future section
                  </p>

                  <h3 className="mt-3 font-serif text-2xl text-[#d6bd91]">
                    Relationships
                  </h3>

                  <p className="mt-3 text-sm leading-6 text-[#928574]">
                    Contacts, allegiances, rivalries and character connections
                    will eventually appear here.
                  </p>
                </article>
              </div>

              <article className="border border-[#57422c]/35 bg-[#120e0b] px-6 py-5 text-xs leading-6 text-[#796e60]">
                This page displays the information saved in the Sepulchria
                database. Public profiles and staff-only fields will be
                introduced gradually.
              </article>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

type SidebarDetailProps = {
  label: string;
  value: string;
};

function SidebarDetail({ label, value }: SidebarDetailProps) {
  return (
    <div>
      <p className="text-[9px] uppercase tracking-[0.26em] text-[#75634d]">
        {label}
      </p>

      <p className="mt-1 text-sm leading-5 text-[#bba98f]">{value}</p>
    </div>
  );
}

type DetailCardProps = {
  label: string;
  value: string;
};

function DetailCard({ label, value }: DetailCardProps) {
  return (
    <div className="bg-[#17110d] px-6 py-5 sm:px-8">
      <p className="text-[9px] uppercase tracking-[0.28em] text-[#796448]">
        {label}
      </p>

      <p className="mt-2 text-sm text-[#cab89b]">{value}</p>
    </div>
  );
}