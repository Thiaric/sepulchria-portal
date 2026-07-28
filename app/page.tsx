import { AuthButton } from "@/components/auth-button";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

const navigationItems = [
  { label: "Play", icon: "✦", href: "#" },
  { label: "World", icon: "◈", href: "#" },
  { label: "Characters", icon: "♙", href: "/character" },
  { label: "Codex", icon: "⌘", href: "#" },
  { label: "Spells", icon: "✧", href: "#" },
  { label: "Market", icon: "◆", href: "#" },
  { label: "Forum", icon: "☷", href: "#" },
  { label: "Messages", icon: "✉", href: "#" },
];

const onlineCharacters = [
  {
    name: "Aurelia Voss",
    role: "Occultist",
    location: "The Ashen Square",
  },
  {
    name: "Silas Mordane",
    role: "Scholar",
    location: "The Black Archive",
  },
  {
    name: "Elara Vey",
    role: "Apothecary",
    location: "The Lantern Market",
  },
];

type Character = {
  id: string;
  display_name: string;
  occupation: string | null;
  birthplace: string | null;
  origin: string | null;
  biography: string | null;
  portrait_url: string | null;
  status: string;
};

export default function Home() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <Dashboard />
    </Suspense>
  );
}

async function Dashboard() {
  await connection();

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let character: Character | null = null;

  if (user) {
    const { data, error } = await supabase
      .from("characters")
      .select(
        "id, display_name, occupation, birthplace, origin, biography, portrait_url, status",
      )
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      throw new Error(`Unable to load character: ${error.message}`);
    }

    character = data;
  }

  return (
    <main className="min-h-screen bg-[#120f0d] text-[#e8dcc4]">
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(116,82,42,0.16),_transparent_38%),linear-gradient(to_bottom,_#17120f,_#0d0b0a)]">
        <header className="border-b border-[#6e5535]/40 bg-[#0d0b0a]/90 backdrop-blur">
          <div className="mx-auto flex min-h-20 w-full max-w-[1600px] items-center justify-between gap-6 px-5 py-4 lg:px-8">
            <div>
              <Link
                href="/"
                className="font-serif text-2xl font-semibold tracking-[0.22em] text-[#d9bd82] sm:text-3xl"
              >
                SEPULCHRIA
              </Link>

              <p className="mt-1 text-[10px] uppercase tracking-[0.35em] text-[#8f806d] sm:text-xs">
                Chronicle of the Veiled City
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Suspense
                fallback={
                  <span className="text-sm text-[#a99b87]">Loading...</span>
                }
              >
                <AuthButton />
              </Suspense>
            </div>
          </div>
        </header>

        <div className="mx-auto grid w-full max-w-[1600px] grid-cols-1 lg:grid-cols-[230px_minmax(0,1fr)] xl:grid-cols-[230px_minmax(0,1fr)_300px]">
          <aside className="border-b border-[#6e5535]/30 bg-[#100d0b]/75 p-5 lg:min-h-[calc(100vh-81px)] lg:border-b-0 lg:border-r">
            <div className="mb-6 rounded-sm border border-[#6e5535]/40 bg-[#1b1511] p-4">
              <p className="text-[10px] uppercase tracking-[0.3em] text-[#887660]">
                Current chronicle
              </p>

              <p className="mt-2 font-serif text-lg text-[#dbc28d]">
                The City Beneath
              </p>

              <p className="mt-2 text-xs leading-5 text-[#9e907d]">
                A sealed city, a dying covenant and the first whispers from
                below.
              </p>
            </div>

            <nav aria-label="Main navigation">
              <p className="mb-3 text-[10px] uppercase tracking-[0.32em] text-[#766754]">
                Navigation
              </p>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-1">
                {navigationItems.map((item, index) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-sm border px-3 py-3 text-sm transition ${
                      index === 0
                        ? "border-[#8d6d3e] bg-[#332719] text-[#efd9aa]"
                        : "border-transparent text-[#b6a894] hover:border-[#5d4930] hover:bg-[#1d1712] hover:text-[#e8d8ba]"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className="w-5 text-center text-[#b68b4f]"
                    >
                      {item.icon}
                    </span>

                    <span>{item.label}</span>
                  </Link>
                ))}
              </div>
            </nav>

            <div className="mt-8 border-t border-[#6e5535]/30 pt-5">
              <Link
                href="#"
                className="block py-2 text-xs uppercase tracking-[0.2em] text-[#887b69] transition hover:text-[#d9bd82]"
              >
                Rules
              </Link>

              <Link
                href="#"
                className="block py-2 text-xs uppercase tracking-[0.2em] text-[#887b69] transition hover:text-[#d9bd82]"
              >
                Support
              </Link>

              <Link
                href="#"
                className="block py-2 text-xs uppercase tracking-[0.2em] text-[#887b69] transition hover:text-[#d9bd82]"
              >
                Staff
              </Link>
            </div>
          </aside>

          <section className="min-w-0 p-5 sm:p-7 lg:p-9">
            <div className="mb-8 border-b border-[#6e5535]/30 pb-7">
              <p className="text-xs uppercase tracking-[0.35em] text-[#987c55]">
                Welcome to the chronicle
              </p>

              <h1 className="mt-3 max-w-4xl font-serif text-4xl leading-tight text-[#ead8b4] sm:text-5xl">
                Enter Sepulchria
              </h1>

              <p className="mt-4 max-w-3xl text-sm leading-7 text-[#aa9b87] sm:text-base">
                Create your character, enter the city and write your story
                alongside other players in a persistent gothic world.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <article className="group min-h-64 overflow-hidden rounded-sm border border-[#725735]/45 bg-[#1a1410]">
                <div className="flex h-full flex-col justify-end bg-[linear-gradient(to_top,_rgba(12,9,7,0.98),_rgba(20,15,11,0.3)),radial-gradient(circle_at_top_right,_rgba(150,105,50,0.22),_transparent_50%)] p-6">
                  <p className="text-[10px] uppercase tracking-[0.32em] text-[#ad8a57]">
                    Continue your story
                  </p>

                  <h2 className="mt-3 font-serif text-3xl text-[#ead7b1]">
                    Enter the city
                  </h2>

                  <p className="mt-3 max-w-md text-sm leading-6 text-[#a89a86]">
                    Return to your current location, read the latest actions and
                    continue the scene.
                  </p>

                  <Link
                    href="#"
                    className="mt-6 inline-flex w-fit items-center border border-[#967342] bg-[#3b2b1b] px-5 py-3 text-xs uppercase tracking-[0.22em] text-[#f1d9a7] transition hover:bg-[#513b25]"
                  >
                    Play now
                  </Link>
                </div>
              </article>

              <article className="min-h-64 rounded-sm border border-[#725735]/45 bg-[#17120f] p-6">
                <p className="text-[10px] uppercase tracking-[0.32em] text-[#90744f]">
                  Your identity
                </p>

                <h2 className="mt-3 font-serif text-3xl text-[#e0cda7]">
                  {character ? character.display_name : "Create a character"}
                </h2>

                <p className="mt-3 text-sm leading-6 text-[#9e907d]">
                  {character
                    ? character.biography ||
                      "Your character record has been created. More information can be added later."
                    : "Build the person who will walk the streets of Sepulchria. Their profile, history, belongings and relationships will all live here."}
                </p>

                <div className="mt-6 space-y-3 text-sm text-[#b4a58f]">
                  <div className="flex items-center justify-between border-b border-[#5e4930]/30 pb-3">
                    <span>Personal details</span>

                    <span className="text-[#816a4b]">
                      {character ? "Created" : "Not created"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-b border-[#5e4930]/30 pb-3">
                    <span>Background</span>

                    <span className="text-[#816a4b]">
                      {character?.biography ||
                      character?.origin ||
                      character?.birthplace
                        ? "Added"
                        : "Not created"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span>Portrait</span>

                    <span className="text-[#816a4b]">
                      {character?.portrait_url ? "Selected" : "Not selected"}
                    </span>
                  </div>
                </div>

                <Link
                  href={character ? "/character" : "/character/create"}
                  className="mt-7 inline-flex text-xs uppercase tracking-[0.22em] text-[#c59a5a] transition hover:text-[#ebcc91]"
                >
                  {character ? "View character →" : "Begin creation →"}
                </Link>
              </article>
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-3">
              <article className="rounded-sm border border-[#604a31]/40 bg-[#15110e] p-5">
                <p className="text-2xl text-[#ae8750]">✦</p>

                <h3 className="mt-4 font-serif text-xl text-[#d9c39c]">
                  Latest chronicle
                </h3>

                <p className="mt-2 text-sm leading-6 text-[#948775]">
                  Read recent events, announcements and changes in the living
                  world.
                </p>
              </article>

              <article className="rounded-sm border border-[#604a31]/40 bg-[#15110e] p-5">
                <p className="text-2xl text-[#ae8750]">⌘</p>

                <h3 className="mt-4 font-serif text-xl text-[#d9c39c]">
                  Consult the Codex
                </h3>

                <p className="mt-2 text-sm leading-6 text-[#948775]">
                  Explore rules, lore, factions, locations and the hidden laws
                  of Sepulchria.
                </p>
              </article>

              <article className="rounded-sm border border-[#604a31]/40 bg-[#15110e] p-5">
                <p className="text-2xl text-[#ae8750]">✉</p>

                <h3 className="mt-4 font-serif text-xl text-[#d9c39c]">
                  Private messages
                </h3>

                <p className="mt-2 text-sm leading-6 text-[#948775]">
                  Correspond privately with players and receive messages from
                  staff.
                </p>
              </article>
            </div>
          </section>

          <aside className="hidden border-l border-[#6e5535]/30 bg-[#100d0b]/65 p-6 xl:block">
            <div>
              <p className="text-[10px] uppercase tracking-[0.32em] text-[#766754]">
                Your character
              </p>

              <div className="mt-4 border border-[#684f32]/45 bg-[#19130f] p-4">
                {character ? (
                  <>
                    <div className="flex h-32 items-center justify-center overflow-hidden border border-dashed border-[#604a31] bg-[#100d0b]">
                      {character.portrait_url ? (
                        <img
                          src={character.portrait_url}
                          alt={`Portrait of ${character.display_name}`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="font-serif text-sm italic text-[#756956]">
                          No portrait
                        </span>
                      )}
                    </div>

                    <p className="mt-4 font-serif text-xl text-[#d8c39b]">
                      {character.display_name}
                    </p>

                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[#a17e4e]">
                      {character.occupation || "Occupation unspecified"}
                    </p>

                    <p className="mt-3 text-xs leading-5 text-[#8e816f]">
                      {character.origin ||
                        character.birthplace ||
                        "No origin has been recorded yet."}
                    </p>

                    <div className="mt-4 flex items-center justify-between border-t border-[#5d472e]/40 pt-3 text-[10px] uppercase tracking-[0.18em]">
                      <span className="text-[#776b5b]">Status</span>

                      <span className="capitalize text-[#c4a16b]">
                        {character.status}
                      </span>
                    </div>

                    <Link
                      href="/character"
                      className="mt-4 block border border-[#755936] px-4 py-2 text-center text-[10px] uppercase tracking-[0.22em] text-[#c5a56d] transition hover:bg-[#2e2217]"
                    >
                      View character
                    </Link>
                  </>
                ) : (
                  <>
                    <div className="flex h-32 items-center justify-center border border-dashed border-[#604a31] bg-[#100d0b]">
                      <span className="font-serif text-sm italic text-[#756956]">
                        No portrait
                      </span>
                    </div>

                    <p className="mt-4 font-serif text-xl text-[#d8c39b]">
                      No character created
                    </p>

                    <p className="mt-2 text-xs leading-5 text-[#8e816f]">
                      Create your first character to enter the city.
                    </p>

                    <Link
                      href="/character/create"
                      className="mt-4 block border border-[#755936] px-4 py-2 text-center text-[10px] uppercase tracking-[0.22em] text-[#c5a56d] transition hover:bg-[#2e2217]"
                    >
                      Create character
                    </Link>
                  </>
                )}
              </div>
            </div>

            <div className="mt-8">
              <div className="flex items-end justify-between">
                <p className="text-[10px] uppercase tracking-[0.32em] text-[#766754]">
                  Online now
                </p>

                <span className="text-xs text-[#88765c]">
                  {onlineCharacters.length}
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {onlineCharacters.map((onlineCharacter) => (
                  <div
                    key={onlineCharacter.name}
                    className="border-b border-[#59452e]/35 pb-3"
                  >
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-[#78915a]" />

                      <p className="font-serif text-sm text-[#d0bb94]">
                        {onlineCharacter.name}
                      </p>
                    </div>

                    <p className="mt-1 pl-4 text-xs text-[#8e806d]">
                      {onlineCharacter.role}
                    </p>

                    <p className="mt-1 pl-4 text-[11px] italic text-[#6f6455]">
                      {onlineCharacter.location}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

function DashboardLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#120f0d] text-[#e8dcc4]">
      <div className="text-center">
        <p className="font-serif text-3xl tracking-[0.22em] text-[#d9bd82]">
          SEPULCHRIA
        </p>

        <p className="mt-4 text-xs uppercase tracking-[0.3em] text-[#887966]">
          Opening the chronicle...
        </p>
      </div>
    </main>
  );
}