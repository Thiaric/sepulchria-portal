import Image from "next/image";

import { RichTextContent } from "@/components/editor/rich-text-content";
import { RichTextEditor } from "@/components/editor/rich-text-editor";
import { requireStaff } from "@/lib/auth/require-staff";
import { createClient } from "@/lib/supabase/server";

import {
  createRace,
  deleteRace,
  updateRace,
} from "./actions";

type RaceRow = {
  id: string;
  name: string;
  slug: string;
  summary: string;
  description: string;
  image_url: string | null;
  banner_url: string | null;
  icon_url: string | null;
  colour: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  character_count: number;
};

type RaceQueryRow = {
  id: string;
  name: string;
  slug: string;
  summary: string;
  description: string;
  image_url: string | null;
  banner_url: string | null;
  icon_url: string | null;
  colour: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  characters:
    | {
        count: number;
      }[]
    | null;
};

type AdminRacesPageProps = {
  searchParams?: Promise<{
    success?: string;
    error?: string;
  }>;
};

function getCount(
  value:
    | {
        count: number;
      }[]
    | null,
): number {
  if (!Array.isArray(value)) {
    return 0;
  }

  return value[0]?.count ?? 0;
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function isValidColour(value: string | null): boolean {
  if (!value) {
    return false;
  }

  return /^#[0-9a-f]{6}$/i.test(value);
}

export default async function AdminRacesPage({
  searchParams,
}: AdminRacesPageProps) {
  await requireStaff();

  const resolvedSearchParams =
    (await searchParams) ?? {};

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("races")
    .select(`
      id,
      name,
      slug,
      summary,
      description,
      image_url,
      banner_url,
      icon_url,
      colour,
      is_active,
      sort_order,
      created_at,
      updated_at,
      characters(count)
    `)
    .order("sort_order", {
      ascending: true,
    })
    .order("name", {
      ascending: true,
    });

  if (error) {
    throw new Error(
      `Unable to load ancestries: ${error.message}`,
    );
  }

  const races = (
    (data ?? []) as unknown as RaceQueryRow[]
  ).map(
    (race): RaceRow => ({
      id: race.id,
      name: race.name,
      slug: race.slug,
      summary: race.summary,
      description: race.description,
      image_url: race.image_url,
      banner_url: race.banner_url,
      icon_url: race.icon_url,
      colour: race.colour,
      is_active: race.is_active,
      sort_order: race.sort_order,
      created_at: race.created_at,
      updated_at: race.updated_at,
      character_count: getCount(
        race.characters,
      ),
    }),
  );

  const activeRaceCount = races.filter(
    (race) => race.is_active,
  ).length;

  return (
    <main className="p-5 sm:p-7 lg:p-9">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[9px] uppercase tracking-[0.28em] text-[#8c704b]">
              Administration
            </p>

            <h2 className="mt-2 font-serif text-4xl text-[#ead5ac]">
              Ancestry Management
            </h2>

            <p className="mt-3 max-w-3xl text-sm leading-7 text-[#a99b89]">
              Create and maintain the
              playable ancestries of
              Aureth.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <AdminCounter>
              {races.length}{" "}
              {races.length === 1
                ? "ancestry"
                : "ancestries"}
            </AdminCounter>

            <AdminCounter>
              {activeRaceCount} active
            </AdminCounter>
          </div>
        </div>

        {resolvedSearchParams.success ? (
          <div className="mt-6 border border-emerald-800/50 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-400">
            {
              resolvedSearchParams.success
            }
          </div>
        ) : null}

        {resolvedSearchParams.error ? (
          <div className="mt-6 border border-red-900/60 bg-red-950/20 px-4 py-3 text-sm text-red-400">
            {resolvedSearchParams.error}
          </div>
        ) : null}

        <section
          id="race-new"
          className="scroll-mt-24 mt-8 border border-[#60482e]/45 bg-[#15100d] p-5 sm:p-6"
        >
          <p className="text-[9px] uppercase tracking-[0.24em] text-[#8c704b]">
            New ancestry
          </p>

          <h3 className="mt-2 font-serif text-2xl text-[#dfc99f]">
            Create an ancestry
          </h3>

          <form
            action={createRace}
            className="mt-6"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <AdminField label="Name">
                <input
                  type="text"
                  name="name"
                  required
                  maxLength={120}
                  placeholder="Human"
                  className="w-full border border-[#60482e]/55 bg-[#100c09] px-3 py-3 text-sm text-[#d7c4a5] outline-none placeholder:text-[#625747] focus:border-[#a17a49]"
                />
              </AdminField>

              <AdminField label="Slug">
                <input
                  type="text"
                  name="slug"
                  maxLength={100}
                  placeholder="Generated automatically"
                  className="w-full border border-[#60482e]/55 bg-[#100c09] px-3 py-3 text-sm text-[#d7c4a5] outline-none placeholder:text-[#625747] focus:border-[#a17a49]"
                />
              </AdminField>

              <AdminField label="Sort order">
                <input
                  type="number"
                  name="sortOrder"
                  defaultValue={0}
                  min={-9999}
                  max={9999}
                  className="w-full border border-[#60482e]/55 bg-[#100c09] px-3 py-3 text-sm text-[#d7c4a5] outline-none focus:border-[#a17a49]"
                />
              </AdminField>

              <AdminField label="Colour">
                <div className="grid grid-cols-[56px_minmax(0,1fr)] gap-2">
                  <input
                    type="color"
                    defaultValue="#8c704b"
                    aria-label="Race colour picker"
                    className="h-[46px] w-full border border-[#60482e]/55 bg-[#100c09] p-1"
                  />

                  <input
                    type="text"
                    name="colour"
                    maxLength={32}
                    placeholder="#8c704b"
                    className="w-full border border-[#60482e]/55 bg-[#100c09] px-3 py-3 text-sm text-[#d7c4a5] outline-none placeholder:text-[#625747] focus:border-[#a17a49]"
                  />
                </div>
              </AdminField>

              <div className="md:col-span-2">
                <AdminField label="Summary">
                  <RichTextEditor
                            name="summary"
                            placeholder="A brief description shown in lists and selection screens."
                            maxTextLength={1100}
                            minHeight={150}
                            variant="lore"
                          />
                </AdminField>
              </div>

              <div className="md:col-span-2">
                <AdminField label="Full description">
                  <RichTextEditor
                            name="description"
                            placeholder="Describe appearance, culture, traits, aptitudes and place in the world."
                            maxTextLength={80000}
                            minHeight={320}
                            variant="lore"
                          />
                </AdminField>
              </div>

              <AdminField label="Main image URL">
                <input
                  type="text"
                  name="imageUrl"
                  maxLength={2000}
                  placeholder="/images/races/human.jpg"
                  className="w-full border border-[#60482e]/55 bg-[#100c09] px-3 py-3 text-sm text-[#d7c4a5] outline-none placeholder:text-[#625747] focus:border-[#a17a49]"
                />
              </AdminField>

              <AdminField label="Banner URL">
                <input
                  type="text"
                  name="bannerUrl"
                  maxLength={2000}
                  placeholder="/images/races/human-banner.jpg"
                  className="w-full border border-[#60482e]/55 bg-[#100c09] px-3 py-3 text-sm text-[#d7c4a5] outline-none placeholder:text-[#625747] focus:border-[#a17a49]"
                />
              </AdminField>

              <div className="md:col-span-2">
                <AdminField label="Icon URL">
                  <input
                    type="text"
                    name="iconUrl"
                    maxLength={2000}
                    placeholder="/images/races/human-icon.png"
                    className="w-full border border-[#60482e]/55 bg-[#100c09] px-3 py-3 text-sm text-[#d7c4a5] outline-none placeholder:text-[#625747] focus:border-[#a17a49]"
                  />
                </AdminField>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
              <label className="flex items-center gap-3 text-sm text-[#bbaa90]">
                <input
                  type="checkbox"
                  name="isActive"
                  defaultChecked
                  className="h-4 w-4 accent-[#8b673d]"
                />

                Active and selectable
              </label>

              <button
                type="submit"
                className="border border-[#987344] bg-[#3b2919] px-5 py-3 text-[9px] uppercase tracking-[0.2em] text-[#efd6a8] transition hover:border-[#b98c50] hover:bg-[#50371f]"
              >
                Create race
              </button>
            </div>
          </form>
        </section>

        <div className="mt-6 space-y-5">
          {races.map((race) => (
            <section
              key={race.id}
              id={`race-${race.slug}`}
              className="scroll-mt-24 overflow-hidden border border-[#60482e]/45 bg-[#15100d]"
            >
              {race.banner_url ? (
                <div className="relative h-44 border-b border-[#60482e]/40 bg-[#0b0807]">
                  <Image
                    src={race.banner_url}
                    alt={`${race.name} banner`}
                    fill
                    sizes="100vw"
                    className="object-cover opacity-70"
                    unoptimized
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-[#15100d] via-transparent to-black/20" />
                </div>
              ) : null}

              <div className="grid lg:grid-cols-[260px_minmax(0,1fr)]">
                <aside className="border-b border-[#60482e]/35 bg-[#0f0b09] p-5 lg:border-b-0 lg:border-r">
                  <div
                    className="relative aspect-[4/3] overflow-hidden border border-[#765937]/55 bg-[#090706]"
                    style={
                      isValidColour(
                        race.colour,
                      )
                        ? {
                            borderColor:
                              race.colour ??
                              undefined,
                          }
                        : undefined
                    }
                  >
                    {race.image_url ? (
                      <Image
                        src={race.image_url}
                        alt={race.name}
                        fill
                        sizes="260px"
                        className="object-cover"
                        unoptimized
                      />
                    ) : race.icon_url ? (
                      <div className="flex h-full items-center justify-center p-10">
                        <Image
                          src={race.icon_url}
                          alt={`${race.name} icon`}
                          width={110}
                          height={110}
                          className="max-h-full w-auto object-contain"
                          unoptimized
                        />
                      </div>
                    ) : (
                      <div className="flex h-full items-center justify-center font-serif text-5xl text-[#705334]">
                        {race.name
                          .charAt(0)
                          .toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 text-center">
                    <StatusBadge
                      isActive={
                        race.is_active
                      }
                    />

                    <p className="mt-3 text-[10px] uppercase tracking-[0.16em] text-[#887967]">
                      /{race.slug}
                    </p>

                    {race.colour ? (
                      <div className="mt-3 flex items-center justify-center gap-2 text-[9px] text-[#817461]">
                        <span
                          className="h-3 w-3 rounded-full border border-white/15"
                          style={{
                            backgroundColor:
                              race.colour,
                          }}
                        />

                        {race.colour}
                      </div>
                    ) : null}

                    <div className="mt-5 grid grid-cols-2 gap-2">
                      <InfoCounter
                        label="Characters"
                        value={
                          race.character_count
                        }
                      />

                      <InfoCounter
                        label="Order"
                        value={
                          race.sort_order
                        }
                      />
                    </div>

                    <p className="mt-4 text-[9px] text-[#756957]">
                      Updated{" "}
                      {formatDate(
                        race.updated_at,
                      )}
                    </p>
                  </div>
                </aside>

                <div className="p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-[9px] uppercase tracking-[0.2em] text-[#8c704b]">
                        Playable ancestry
                      </p>

                      <h3 className="mt-1 font-serif text-3xl text-[#e3cda5]">
                        {race.name}
                      </h3>

                    
                    </div>

                    {race.icon_url ? (
                      <div className="relative h-16 w-16 border border-[#60482e]/45 bg-[#0f0b09] p-2">
                        <Image
                          src={race.icon_url}
                          alt={`${race.name} icon`}
                          fill
                          sizes="64px"
                          className="object-contain p-2"
                          unoptimized
                        />
                      </div>
                    ) : null}
                  </div>

                  <form
                    action={updateRace}
                    className="mt-6"
                  >
                    <input
                      type="hidden"
                      name="raceId"
                      value={race.id}
                    />

                    <div className="grid gap-4 md:grid-cols-2">
                      <AdminField label="Name">
                        <input
                          type="text"
                          name="name"
                          required
                          maxLength={120}
                          defaultValue={
                            race.name
                          }
                          className="w-full border border-[#60482e]/55 bg-[#100c09] px-3 py-3 text-sm text-[#d7c4a5] outline-none focus:border-[#a17a49]"
                        />
                      </AdminField>

                      <AdminField label="Slug">
                        <input
                          type="text"
                          name="slug"
                          required
                          maxLength={100}
                          defaultValue={
                            race.slug
                          }
                          className="w-full border border-[#60482e]/55 bg-[#100c09] px-3 py-3 text-sm text-[#d7c4a5] outline-none focus:border-[#a17a49]"
                        />
                      </AdminField>

                      <AdminField label="Sort order">
                        <input
                          type="number"
                          name="sortOrder"
                          min={-9999}
                          max={9999}
                          defaultValue={
                            race.sort_order
                          }
                          className="w-full border border-[#60482e]/55 bg-[#100c09] px-3 py-3 text-sm text-[#d7c4a5] outline-none focus:border-[#a17a49]"
                        />
                      </AdminField>

                      <AdminField label="Colour">
                        <input
                          type="text"
                          name="colour"
                          maxLength={32}
                          defaultValue={
                            race.colour ?? ""
                          }
                          placeholder="#8c704b"
                          className="w-full border border-[#60482e]/55 bg-[#100c09] px-3 py-3 text-sm text-[#d7c4a5] outline-none placeholder:text-[#625747] focus:border-[#a17a49]"
                        />
                      </AdminField>

                      <div className="md:col-span-2">
                        <AdminField label="Summary">
                          <RichTextEditor
                            name="summary"
                            defaultValue={race.summary}
                            maxTextLength={1100}
                            minHeight={150}
                            variant="lore"
                          />
                        </AdminField>
                      </div>

                      <div className="md:col-span-2">
                        <AdminField label="Full description">
                          <RichTextEditor
                            name="description"
                            defaultValue={race.description}
                            maxTextLength={80000}
                            minHeight={320}
                            variant="lore"
                          />
                        </AdminField>
                      </div>

                      <AdminField label="Main image URL">
                        <input
                          type="text"
                          name="imageUrl"
                          maxLength={2000}
                          defaultValue={
                            race.image_url ??
                            ""
                          }
                          placeholder="/images/races/race.jpg"
                          className="w-full border border-[#60482e]/55 bg-[#100c09] px-3 py-3 text-sm text-[#d7c4a5] outline-none placeholder:text-[#625747] focus:border-[#a17a49]"
                        />
                      </AdminField>

                      <AdminField label="Banner URL">
                        <input
                          type="text"
                          name="bannerUrl"
                          maxLength={2000}
                          defaultValue={
                            race.banner_url ??
                            ""
                          }
                          placeholder="/images/races/race-banner.jpg"
                          className="w-full border border-[#60482e]/55 bg-[#100c09] px-3 py-3 text-sm text-[#d7c4a5] outline-none placeholder:text-[#625747] focus:border-[#a17a49]"
                        />
                      </AdminField>

                      <div className="md:col-span-2">
                        <AdminField label="Icon URL">
                          <input
                            type="text"
                            name="iconUrl"
                            maxLength={2000}
                            defaultValue={
                              race.icon_url ??
                              ""
                            }
                            placeholder="/images/races/race-icon.png"
                            className="w-full border border-[#60482e]/55 bg-[#100c09] px-3 py-3 text-sm text-[#d7c4a5] outline-none placeholder:text-[#625747] focus:border-[#a17a49]"
                          />
                        </AdminField>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
                      <label className="flex items-center gap-3 text-sm text-[#bbaa90]">
                        <input
                          type="checkbox"
                          name="isActive"
                          defaultChecked={
                            race.is_active
                          }
                          className="h-4 w-4 accent-[#8b673d]"
                        />

                        Active and
                        selectable
                      </label>

                      <button
                        type="submit"
                        className="border border-[#987344] bg-[#3b2919] px-5 py-3 text-[9px] uppercase tracking-[0.2em] text-[#efd6a8] transition hover:border-[#b98c50] hover:bg-[#50371f]"
                      >
                        Save changes
                      </button>
                    </div>
                  </form>

                  <form
                    action={deleteRace}
                    className="mt-6 border-t border-[#60482e]/30 pt-5"
                  >
                    <input
                      type="hidden"
                      name="raceId"
                      value={race.id}
                    />

                    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                      <input
                        type="text"
                        name="confirmation"
                        placeholder='Type "DELETE"'
                        className="w-full border border-red-900/50 bg-[#100909] px-3 py-3 text-sm text-red-200 outline-none placeholder:text-red-900/70 focus:border-red-700"
                      />

                      <button
                        type="submit"
                        className="border border-red-900/60 bg-red-950/20 px-5 py-3 text-[9px] uppercase tracking-[0.18em] text-red-500 transition hover:border-red-700 hover:bg-red-950/40"
                      >
                        Delete race
                      </button>
                    </div>

                    {race.character_count >
                    0 ? (
                      <p className="mt-3 text-[10px] leading-5 text-[#8e7462]">
                        Deletion is blocked
                        because this race is
                        currently assigned
                        to{" "}
                        {
                          race.character_count
                        }{" "}
                        {race.character_count ===
                        1
                          ? "character"
                          : "characters"}
                        .
                      </p>
                    ) : null}
                  </form>
                </div>
              </div>
            </section>
          ))}

          {races.length === 0 ? (
            <section className="border border-[#60482e]/45 bg-[#15100d] p-10 text-center">
              <p className="font-serif text-xl text-[#b9a88f]">
                No ancestries were found.
              </p>
            </section>
          ) : null}
        </div>
      </div>
    </main>
  );
}

function AdminField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="block">
      <div className="mb-2 block text-[8px] uppercase tracking-[0.22em] text-[#806b50]">
        {label}
      </div>

      {children}
    </div>
  );
}

function AdminCounter({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <span className="border border-[#60482e]/45 bg-[#15100d] px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-[#a99069]">
      {children}
    </span>
  );
}

function StatusBadge({
  isActive,
}: {
  isActive: boolean;
}) {
  return (
    <span
      className={
        isActive
          ? "inline-block border border-emerald-800/60 bg-black/20 px-2.5 py-1 text-[8px] uppercase tracking-[0.18em] text-emerald-500"
          : "inline-block border border-stone-600/60 bg-black/20 px-2.5 py-1 text-[8px] uppercase tracking-[0.18em] text-stone-400"
      }
    >
      {isActive
        ? "Active"
        : "Inactive"}
    </span>
  );
}

function InfoCounter({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="border border-[#60482e]/30 bg-[#15100d] px-2 py-3 text-center">
      <p className="font-serif text-lg text-[#c9ad82]">
        {value}
      </p>

      <p className="mt-1 text-[7px] uppercase tracking-[0.12em] text-[#756957]">
        {label}
      </p>
    </div>
  );
}