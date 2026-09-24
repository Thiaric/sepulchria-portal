import Image from "next/image";
import { notFound } from "next/navigation";

import { CharacterConditionsDisplay } from "@/components/characters/character-conditions-display";
import { CharacterGiftsDisplay } from "@/components/characters/character-gifts-display";
import { CharacterInventoryDisplay } from "@/components/characters/character-inventory-display";
import { CharacterLifeStateBadge } from "@/components/characters/character-life-state";
import {
  CharacterHealthDisplay,
  CharacterMechanicsDisplay,
} from "@/components/characters/character-mechanics-display";
import { CharacterShapesDisplay } from "@/components/characters/character-shapes-display";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { PublicCharacterAgeDetail } from "@/components/characters/public-character-age-detail";

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function formatGender(value: string | null) {
  if (value === "male") return "Male";
  if (value === "female") return "Female";
  if (value === "non_binary") return "Non-binary";
  return null;
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="min-w-0 bg-[rgb(var(--sep-colour-17110d))] px-3 py-2">
      <p className="text-[7px] uppercase tracking-[0.19em] text-[rgb(var(--sep-colour-796448))]">
        {label}
      </p>
      <p className="mt-1 break-words text-[11px] leading-5 text-[rgb(var(--sep-colour-cab89b))]">
        {value?.trim() || "Not recorded"}
      </p>
    </div>
  );
}

function TextSection({
  title,
  content,
}: {
  title: string;
  content: string | null;
}) {
  if (!content?.trim()) return null;

  return (
    <section className="h-full border border-[rgb(var(--sep-colour-6b5032))]/50 bg-[rgb(var(--sep-colour-17110d))] p-4 sm:p-5">
      <h2 className="font-serif text-xl text-[rgb(var(--sep-skin-c1,var(--sep-colour-dfc79c)))] sm:text-2xl">
        {title}
      </h2>
      <p className="mt-3 whitespace-pre-line break-words text-sm leading-7 text-[rgb(var(--sep-skin-c2,var(--sep-colour-b0a18d)))]">
        {content}
      </p>
    </section>
  );
}

export default async function NpcSheetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await createClient();
  const auth = await session.auth.getUser();

  if (!auth.data.user) {
    notFound();
  }

  const db = createAdminClient();

  const { data: npc, error } = await db
    .from("npcs")
    .select(`
      id,
      name,
      pronouns,
      portrait_url,
      description,
      is_active,
      is_location_active,
      current_room_id,
      order:orders(id,name),
      character:characters!npcs_character_id_fkey(
  id,
  first_name,
  surname,
  display_name,
  pronouns,
  gender,
  sexual_orientation,
  age,
  birthplace,
  origin,
        physical_description,
        personality,
        biography,
        public_notes,
        title,
        current_health,
        life_state,
        status,
        race:races(
          id,
          name,
          slug,
          icon_url,
          colour
        )
      )
    `)
    .eq("id", id)
    .eq("is_active", true)
    .eq("is_location_active", true)
    .maybeSingle();

  if (error || !npc) {
    notFound();
  }

  const character = one(npc.character) as any;

  if (!character || character.status !== "approved") {
    notFound();
  }

  const race = one(character.race) as any;
  const order = one(npc.order) as any;

  const fullName =
    [character.first_name, character.surname]
      .map((value) => String(value ?? "").trim())
      .filter(Boolean)
      .join(" ") ||
    character.display_name?.trim() ||
    npc.name;

  const portrait =
    character.portrait_url ||
    npc.portrait_url ||
    null;

  return (
    <main className="mx-auto w-full max-w-7xl p-4 sm:p-6">
      <article className="space-y-6">
        <section>
          <div className="mb-3">
            <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-876a46))]">
              NPC profile
            </p>
            <h1 className="mt-1 font-serif text-2xl text-[rgb(var(--sep-colour-ecd9b2))] sm:text-3xl">
              {fullName}
            </h1>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.9fr)]">
            <section className="grid gap-4 border border-[rgb(var(--sep-colour-654b2e))]/50 bg-[rgb(var(--sep-colour-17110d))] p-4 sm:p-5 lg:grid-cols-[180px_minmax(0,1fr)]">
              <div className="mx-auto w-full max-w-[180px] lg:mx-0">
                <div className="relative aspect-[3/4] w-full overflow-hidden border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-0d0a08))]">
                  {portrait ? (
                    <Image
                      src={portrait}
                      alt={`Portrait of ${fullName}`}
                      fill
                      sizes="180px"
                      className="object-cover"
                      priority
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center font-serif text-5xl text-[rgb(var(--sep-colour-5f503f))]">
                      {fullName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="mt-2 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5">
                  <p className="text-[7px] uppercase tracking-[0.19em] text-[rgb(var(--sep-colour-796448))]">
                    Type
                  </p>
                  <p className="mt-1 text-[11px] leading-5 text-[rgb(var(--sep-colour-cab89b))]">
                    NPC
                  </p>
                </div>
              </div>

              <div className="min-w-0">
                <div className="border-b border-[rgb(var(--sep-colour-5d452d))]/35 pb-3">
                  <p className="text-[8px] uppercase tracking-[0.26em] text-[rgb(var(--sep-colour-876a46))]">
                    In short
                  </p>
                  <h2 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-ecd9b2))]">
                    {fullName}
                  </h2>

                  <CharacterConditionsDisplay characterId={character.id} />
                  <CharacterLifeStateBadge characterId={character.id} />
                </div>

                <div className="mt-3 grid gap-px bg-[rgb(var(--sep-colour-4f3b28))]/35 sm:grid-cols-2 lg:grid-cols-3">
                  <Detail label="Gender" value={formatGender(character.gender)} />
<Detail label="Pronouns" value={character.pronouns || npc.pronouns} />
<Detail label="Sexual orientation" value={character.sexual_orientation} />

<div className="min-w-0 bg-[rgb(var(--sep-colour-17110d))] px-3 py-2 [&_dt]:text-[7px] [&_dt]:uppercase [&_dt]:tracking-[0.19em] [&_dt]:text-[rgb(var(--sep-colour-796448))] [&_dd]:mt-1 [&_dd]:text-[11px] [&_dd]:leading-5 [&_dd]:text-[rgb(var(--sep-colour-cab89b))]">
  <PublicCharacterAgeDetail
    characterId={character.id}
  />
</div>

<Detail label="Birthplace" value={character.birthplace} />
                  <Detail label="Origin" value={character.origin} />
                  <Detail label="Title" value={character.title || "NPC"} />
                  <Detail label="Ancestry" value={race?.name} />
                  <Detail label="Order" value={order?.name} />
                  <Detail label="Location status" value="Active in Location" />
                </div>
              </div>

              <div className="lg:col-span-2">
                <CharacterHealthDisplay characterId={character.id} />
              </div>
            </section>

            <CharacterMechanicsDisplay characterId={character.id} />
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <TextSection
              title="Physical Description"
              content={character.physical_description || npc.description}
            />
            <TextSection title="Personality" content={character.personality} />
            <TextSection title="Biography" content={character.biography} />
            <TextSection title="Public Notes" content={character.public_notes} />
          </div>
        </section>

        <section className="border-t border-[rgb(var(--sep-colour-60482e))]/45 pt-6">
          <CharacterShapesDisplay characterId={character.id} />
        </section>

        <section className="border-t border-[rgb(var(--sep-colour-60482e))]/45 pt-6">
          <CharacterGiftsDisplay characterId={character.id} twoColumns />
        </section>

        <section className="border-t border-[rgb(var(--sep-colour-60482e))]/45 pt-6">
          <div className="mb-4">
            <p className="text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-806b50))]">
              Possessions
            </p>
            <h2 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-dec89f))]">
              Equipment & Items
            </h2>
          </div>

          <CharacterInventoryDisplay
            characterId={character.id}
            own={false}
            showInventoryItems
          />
        </section>
      </article>
    </main>
  );
}
