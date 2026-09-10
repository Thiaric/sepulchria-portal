

import { notFound } from "next/navigation";
import { AdminCharacterRemnants } from "@/components/admin/admin-character-remnants";
import Link from "next/link";
import {
  requireStaffCapability,
} from "@/lib/auth/require-staff";
import { createClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

type Character = {
  id: string;
  display_name: string | null;
  first_name: string;
  surname: string;
};

function characterName(
  character: Character,
) {
  return (
    character.display_name?.trim() ||
    `${character.first_name} ${character.surname}`.trim() ||
    "Unnamed character"
  );
}

const buttonClass =
  "border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-4 py-3 text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-efd6a8))] transition hover:border-[rgb(var(--sep-colour-b98c50))] hover:bg-[rgb(var(--sep-colour-50371f))]";

export default async function AdminCharacterLedgerPage({
  params,
}: Props) {
  await requireStaffCapability("character_economy");

  const { id } = await params;
  const supabase =
    await createClient();

  const {
    data: character,
    error,
  } = await supabase
    .from("characters")
    .select(`
      id,
      display_name,
      first_name,
      surname
    `)
    .eq("id", id)
    .maybeSingle();

  if (
    error ||
    !character
  ) {
    notFound();
  }

  return (
    <main className="p-5 sm:p-7 lg:p-9 admin_characters_id_ledger_page_main_main">
      <div className="mx-auto max-w-7xl admin_characters_id_ledger_page_div_container">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[rgb(var(--sep-colour-60482e))]/35 pb-5 admin_characters_id_ledger_page_div_container_2">
          <div className="admin_characters_id_ledger_page_div_ledger">
            <p className="text-[9px] uppercase tracking-[0.28em] text-[rgb(var(--sep-colour-8c704b))] admin_characters_id_ledger_page_p_ledger">
              Character Administration
            </p>

            <h1 className="mt-2 font-serif text-4xl text-[rgb(var(--sep-colour-ead5ac))] admin_characters_id_ledger_page_h1_ledger">
              Ledger
            </h1>

            <p className="mt-1 text-[11px] text-[rgb(var(--sep-colour-8f8271))] admin_characters_id_ledger_page_p_ledger_2">
              {characterName(
                character as Character,
              )}
            </p>
          </div>

          <Link
            href={`/admin/characters/${id}`}
            className={buttonClass}
          >
            Back to Character
          </Link>
        </div>

        <AdminCharacterRemnants
          characterId={id}
        />
      </div>
    </main>
  );
}
