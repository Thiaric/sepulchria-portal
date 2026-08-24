

import { AdminActionForm } from "@/components/admin/admin-action-form";
import { AdminRaceEditor } from "@/components/admin/admin-race-editor";
import { RichTextEditor } from "@/components/editor/rich-text-editor";
import {
  requireAdminSection,
} from "@/lib/auth/require-staff";
import { getAdminRaces } from "@/lib/races/get-admin-races";

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
  is_selectable: boolean;
  muscles_modifier: number;
  reflexes_modifier: number;
  vigour_modifier: number;
  shrewd_modifier: number;
  brains_modifier: number;
  presence_modifier: number;
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
  is_selectable: boolean;
  muscles_modifier: number;
  reflexes_modifier: number;
  vigour_modifier: number;
  shrewd_modifier: number;
  brains_modifier: number;
  presence_modifier: number;
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
  await requireAdminSection("races");

  const resolvedSearchParams =
    (await searchParams) ?? {};

  const races = await getAdminRaces();

  const activeRaceCount = races.filter(
    (race) => race.is_active,
  ).length;

  return (
    <main className="p-5 sm:p-7 lg:p-9">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[9px] uppercase tracking-[0.28em] text-[rgb(var(--sep-colour-8c704b))]">
              Administration
            </p>

            <h2 className="mt-2 font-serif text-4xl text-[rgb(var(--sep-colour-ead5ac))]">
              Ancestry Management
            </h2>

            <p className="mt-3 max-w-3xl text-sm leading-7 text-[rgb(var(--sep-colour-a99b89))]">
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
          className="scroll-mt-24 mt-8 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-5 sm:p-6"
        >
          <p className="text-[9px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-8c704b))]">
            New ancestry
          </p>

          <h3 className="mt-2 font-serif text-2xl text-[rgb(var(--sep-colour-dfc99f))]">
            Create an ancestry
          </h3>

          <AdminActionForm
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
                  className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none placeholder:text-[rgb(var(--sep-colour-625747))] focus:border-[rgb(var(--sep-colour-a17a49))]"
                />
              </AdminField>

              <AdminField label="Slug">
                <input
                  type="text"
                  name="slug"
                  maxLength={100}
                  placeholder="Generated automatically"
                  className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none placeholder:text-[rgb(var(--sep-colour-625747))] focus:border-[rgb(var(--sep-colour-a17a49))]"
                />
              </AdminField>

              <AdminField label="Sort order">
                <input
                  type="number"
                  name="sortOrder"
                  defaultValue={0}
                  min={-9999}
                  max={9999}
                  className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))]"
                />
              </AdminField>

              <AdminField label="Colour">
                <div className="grid grid-cols-[56px_minmax(0,1fr)] gap-2">
                  <input
                    type="color"
                    defaultValue="#8c704b"
                    aria-label="Race colour picker"
                    className="h-[46px] w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] p-1"
                  />

                  <input
                    type="text"
                    name="colour"
                    maxLength={32}
                    placeholder="#8c704b"
                    className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none placeholder:text-[rgb(var(--sep-colour-625747))] focus:border-[rgb(var(--sep-colour-a17a49))]"
                  />
                </div>
              </AdminField>

              <div className="md:col-span-2">
                <AttributeModifierFields />
              </div>

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
                  className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none placeholder:text-[rgb(var(--sep-colour-625747))] focus:border-[rgb(var(--sep-colour-a17a49))]"
                />
              </AdminField>

              <AdminField label="Banner URL">
                <input
                  type="text"
                  name="bannerUrl"
                  maxLength={2000}
                  placeholder="/images/races/human-banner.jpg"
                  className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none placeholder:text-[rgb(var(--sep-colour-625747))] focus:border-[rgb(var(--sep-colour-a17a49))]"
                />
              </AdminField>

              <div className="md:col-span-2">
                <AdminField label="Icon URL">
                  <input
                    type="text"
                    name="iconUrl"
                    maxLength={2000}
                    placeholder="/images/races/human-icon.png"
                    className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none placeholder:text-[rgb(var(--sep-colour-625747))] focus:border-[rgb(var(--sep-colour-a17a49))]"
                  />
                </AdminField>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-6">
                <label className="flex items-center gap-3 text-sm text-[rgb(var(--sep-colour-bbaa90))]">
                  <input
                    type="checkbox"
                    name="isActive"
                    defaultChecked
                    className="h-4 w-4 accent-[rgb(var(--sep-colour-8b673d))]"
                  />

                  Active
                </label>

                <label className="flex items-center gap-3 text-sm text-[rgb(var(--sep-colour-bbaa90))]">
                  <input
                    type="checkbox"
                    name="isSelectable"
                    defaultChecked
                    className="h-4 w-4 accent-[rgb(var(--sep-colour-8b673d))]"
                  />

                  Selectable at character creation
                </label>
              </div>

              <button
                type="submit"
                className="border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-5 py-3 text-[9px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-efd6a8))] transition hover:border-[rgb(var(--sep-colour-b98c50))] hover:bg-[rgb(var(--sep-colour-50371f))]"
              >
                Create race
              </button>
            </div>
          </AdminActionForm>
        </section>

        <div className="mt-6 space-y-5">
          {races.map((race) => (
            <AdminRaceEditor
              key={race.id}
              race={race}
            />
          ))}

          {races.length === 0 ? (
            <section className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-10 text-center">
              <p className="font-serif text-xl text-[rgb(var(--sep-colour-b9a88f))]">
                No ancestries were found.
              </p>
            </section>
          ) : null}
        </div>
      </div>
    </main>
  );
}

const ATTRIBUTE_MODIFIER_FIELDS = [
  {
    key: "muscles",
    label: "Muscles",
  },
  {
    key: "reflexes",
    label: "Reflexes",
  },
  {
    key: "vigour",
    label: "Vigour",
  },
  {
    key: "shrewd",
    label: "Shrewd",
  },
  {
    key: "brains",
    label: "Brains",
  },
  {
    key: "presence",
    label: "Presence",
  },
] as const;

function AttributeModifierFields({
  values,
}: {
  values?: Partial<
    Record<
      (typeof ATTRIBUTE_MODIFIER_FIELDS)[number]["key"],
      number
    >
  >;
}) {
  return (
    <section className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-100c09))] p-4">
      <p className="text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-806b50))]">
        Attribute modifiers
      </p>

      <p className="mt-2 text-[11px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">
        These values are added to the character&apos;s base attributes. Order Level modifiers are applied separately.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {ATTRIBUTE_MODIFIER_FIELDS.map(
          ({ key, label }) => (
            <label
              key={key}
              className="block"
            >
              <span className="mb-1.5 block text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-776956))]">
                {label}
              </span>

              <input
                type="number"
                name={`${key}Modifier`}
                min={-10}
                max={10}
                step={1}
                defaultValue={
                  values?.[key] ?? 0
                }
                className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-15100d))] px-2 py-2 text-center text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-9b7446))]"
              />
            </label>
          ),
        )}
      </div>

      <p className="mt-3 text-[9px] leading-5 text-[rgb(var(--sep-colour-756957))]">
        Effective attribute = Base + Ancestry modifier + Order modifier.
      </p>
    </section>
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
      <div className="mb-2 block text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-806b50))]">
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
    <span className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-a99069))]">
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

function SelectableBadge({
  isSelectable,
}: {
  isSelectable: boolean;
}) {
  return (
    <span
      className={
        isSelectable
          ? "inline-block border border-[rgb(var(--sep-colour-8b673d))]/70 bg-black/20 px-2.5 py-1 text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-d6b273))]"
          : "inline-block border border-stone-600/60 bg-black/20 px-2.5 py-1 text-[8px] uppercase tracking-[0.18em] text-stone-400"
      }
    >
      {isSelectable
        ? "Selectable"
        : "Not selectable"}
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
    <div className="border border-[rgb(var(--sep-colour-60482e))]/30 bg-[rgb(var(--sep-colour-15100d))] px-2 py-3 text-center">
      <p className="font-serif text-lg text-[rgb(var(--sep-colour-c9ad82))]">
        {value}
      </p>

      <p className="mt-1 text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-756957))]">
        {label}
      </p>
    </div>
  );
}