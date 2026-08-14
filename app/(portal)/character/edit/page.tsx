import Link from "next/link";
import { redirect } from "next/navigation";

import CharacterForm from "../CharacterForm";
import { updateCharacter } from "./actions";
import { getRaces } from "@/lib/races";
import { createClient } from "@/lib/supabase/server";

type EditCharacterPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function EditCharacterPage({
  searchParams,
}: EditCharacterPageProps) {
  const { error } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: character, error: characterError } = await supabase
    .from("characters")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (characterError) throw new Error(characterError.message);
  if (!character) redirect("/character/create");

  const races = await getRaces();

  return (
    <main className="min-h-screen bg-[#100d0b] px-5 py-8 text-[#e7d5b0] sm:py-10">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/character"
          className="text-sm text-[#b8945d] transition hover:text-[#e3c28c]"
        >
          ← Cancel editing
        </Link>

        <header className="my-8 max-w-3xl">
          <p className="text-[10px] uppercase tracking-[0.34em] text-[#957448]">
            Character record
          </p>
          <h1 className="mt-3 break-words font-serif text-4xl text-[#ecd9b2] sm:text-5xl">
            Edit {character.display_name}
          </h1>
          <p className="mt-4 text-sm leading-7 text-[#9e907d] sm:text-base">
            Review and update the character record. Ancestry remains locked;
            Association and Order membership are controlled by the Order system.
          </p>
        </header>

        {error ? (
          <p className="mb-6 border border-[#8c463d] bg-[#2a1513] p-4 text-[#e4b4aa]">
            {error}
          </p>
        ) : null}

        <CharacterForm
          action={updateCharacter}
          character={character}
          races={races}
          submitLabel="Save changes"
          mode="update"
        />
      </div>
    </main>
  );
}
