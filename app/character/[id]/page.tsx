import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

type PublicCharacterPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function PublicCharacterPage({
  params,
}: PublicCharacterPageProps) {
  const { id } = await params;
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
        display_name,
        portrait_url
      `,
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load character: ${error.message}`);
  }

  if (!character) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#100d0b] px-5 py-10 text-[#e7d5b0]">
      <section className="mx-auto max-w-3xl border border-[#654b2e]/50 bg-[#17110d]">
        <div className="border-b border-[#59432c]/40 px-6 py-5">
          <Link
            href="/game"
            className="text-[10px] uppercase tracking-[0.22em] text-[#a98b61] transition hover:text-[#ecd29e]"
          >
            ← Return to game
          </Link>
        </div>

        <div className="grid gap-8 p-7 sm:grid-cols-[220px_minmax(0,1fr)] sm:p-10">
          <div className="aspect-[3/4] overflow-hidden border border-[#654b2e] bg-[#0d0a08]">
            {character.portrait_url ? (
              <img
                src={character.portrait_url}
                alt={`Portrait of ${character.display_name}`}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center font-serif text-5xl text-[#756956]">
                ?
              </div>
            )}
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-[#876a46]">
              Character profile
            </p>

            <h1 className="mt-3 font-serif text-4xl text-[#ecd9b2] sm:text-5xl">
              {character.display_name}
            </h1>

            <div className="mt-8 border border-dashed border-[#59432c]/60 bg-[#100c09] px-5 py-8">
              <p className="font-serif text-sm italic text-[#756956]">
                Additional public information will appear here.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}