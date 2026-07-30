import Link from "next/link";
import { redirect } from "next/navigation";

import CharacterForm from "../CharacterForm";
import { createCharacter } from "./actions";

import { getAssociations } from "@/lib/associations";
import { getRaces } from "@/lib/races";
import { createClient } from "@/lib/supabase/server";

type CreateCharacterPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function CreateCharacterPage({
  searchParams,
}: CreateCharacterPageProps) {
  const { error } = await searchParams;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const {
    data: existing,
    error: existingError,
  } = await supabase
    .from("characters")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existing) {
    redirect("/character");
  }

  const [races, associations] =
    await Promise.all([
      getRaces(),
      getAssociations(),
    ]);

  return (
    <main className="min-h-screen bg-[#100d0b] px-5 py-8 text-[#e7d5b0] sm:py-10">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/"
          className="text-sm text-[#b8945d] transition hover:text-[#e3c28c]"
        >
          ← Return to dashboard
        </Link>

        <header className="my-8 max-w-3xl">
          <p className="text-[10px] uppercase tracking-[0.34em] text-[#957448]">
            Character creator
          </p>

          <h1 className="mt-3 font-serif text-4xl text-[#ecd9b2] sm:text-5xl">
            Create your character
          </h1>

          <p className="mt-4 text-sm leading-7 text-[#9e907d] sm:text-base">
            Build the person who will enter
            Sepulchria. You can review every
            section before creating the final
            character record.
          </p>
        </header>

        {error ? (
          <p className="mb-6 border border-[#8c463d] bg-[#2a1513] p-4 text-[#e4b4aa]">
            {error}
          </p>
        ) : null}

        <CharacterForm
          action={createCharacter}
          races={races}
          associations={associations}
          submitLabel="Create character"
          mode="create"
        />
      </div>
    </main>
  );
}