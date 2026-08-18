"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useState } from "react";

import { AdminActionForm } from "@/components/admin/admin-action-form";
import { deleteRace, updateRace } from "@/app/(portal)/admin/races/actions";

const RichTextEditor = dynamic(
  () => import("@/components/editor/rich-text-editor").then((module) => module.RichTextEditor),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[150px] animate-pulse border border-[#60482e]/45 bg-[#100c09]" />
    ),
  },
);

export type AdminRaceEditorRow = {
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

const ATTRIBUTE_MODIFIER_FIELDS = [
  { key: "muscles", label: "Muscles" },
  { key: "reflexes", label: "Reflexes" },
  { key: "vigour", label: "Vigour" },
  { key: "shrewd", label: "Shrewd" },
  { key: "brains", label: "Brains" },
  { key: "presence", label: "Presence" },
] as const;

function isValidColour(value: string | null) {
  return Boolean(value && /^#[0-9a-f]{6}$/i.test(value));
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function AdminField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="block">
      <div className="mb-2 block text-[8px] uppercase tracking-[0.22em] text-[#806b50]">{label}</div>
      {children}
    </div>
  );
}

function AttributeModifierFields({ race }: { race: AdminRaceEditorRow }) {
  const values = {
    muscles: race.muscles_modifier,
    reflexes: race.reflexes_modifier,
    vigour: race.vigour_modifier,
    shrewd: race.shrewd_modifier,
    brains: race.brains_modifier,
    presence: race.presence_modifier,
  };

  return (
    <section className="border border-[#60482e]/45 bg-[#100c09] p-4">
      <p className="text-[8px] uppercase tracking-[0.22em] text-[#806b50]">Attribute modifiers</p>
      <p className="mt-2 text-[11px] leading-5 text-[#8f8271]">
        These values are added to the character&apos;s base attributes. Order Level modifiers are applied separately.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {ATTRIBUTE_MODIFIER_FIELDS.map(({ key, label }) => (
          <label key={key} className="block">
            <span className="mb-1.5 block text-[8px] uppercase tracking-[0.12em] text-[#776956]">{label}</span>
            <input
              type="number"
              name={`${key}Modifier`}
              min={-10}
              max={10}
              step={1}
              defaultValue={values[key]}
              className="w-full border border-[#60482e]/55 bg-[#15100d] px-2 py-2 text-center text-sm text-[#d7c4a5] outline-none focus:border-[#9b7446]"
            />
          </label>
        ))}
      </div>
      <p className="mt-3 text-[9px] leading-5 text-[#756957]">Effective attribute = Base + Ancestry modifier + Order modifier.</p>
    </section>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className={active
      ? "inline-block border border-emerald-800/60 bg-black/20 px-2.5 py-1 text-[8px] uppercase tracking-[0.18em] text-emerald-500"
      : "inline-block border border-stone-600/60 bg-black/20 px-2.5 py-1 text-[8px] uppercase tracking-[0.18em] text-stone-400"}>
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function SelectableBadge({ selectable }: { selectable: boolean }) {
  return (
    <span className={selectable
      ? "inline-block border border-[#8b673d]/70 bg-black/20 px-2.5 py-1 text-[8px] uppercase tracking-[0.18em] text-[#d6b273]"
      : "inline-block border border-stone-600/60 bg-black/20 px-2.5 py-1 text-[8px] uppercase tracking-[0.18em] text-stone-400"}>
      {selectable ? "Selectable" : "Not selectable"}
    </span>
  );
}

function InfoCounter({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-[#60482e]/30 bg-[#15100d] px-2 py-3 text-center">
      <p className="font-serif text-lg text-[#c9ad82]">{value}</p>
      <p className="mt-1 text-[7px] uppercase tracking-[0.12em] text-[#756957]">{label}</p>
    </div>
  );
}

export function AdminRaceEditor({ race }: { race: AdminRaceEditorRow }) {
  const [open, setOpen] = useState(false);

  return (
    <details
      id={`race-${race.slug}`}
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
      className="group scroll-mt-24 overflow-hidden border border-[#60482e]/45 bg-[#15100d]"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 bg-[#100c09] px-4 py-3 transition hover:bg-[#18110d] group-open:border-b group-open:border-[#60482e]/35 [&::-webkit-details-marker]:hidden sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative h-11 w-11 shrink-0 overflow-hidden border border-[#60482e]/45 bg-[#090706]">
            {race.icon_url ? (
              <Image src={race.icon_url} alt="" fill sizes="44px" className="object-contain p-1.5" />
            ) : race.image_url ? (
              <Image src={race.image_url} alt="" fill sizes="44px" className="object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center font-serif text-lg text-[#705334]">
                {race.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-[7px] uppercase tracking-[0.18em] text-[#806b50]">Playable ancestry</p>
            <h3 className="mt-0.5 truncate font-serif text-lg text-[#dec69a]">{race.name}</h3>
            <p className="mt-0.5 truncate text-[8px] uppercase tracking-[0.1em] text-[#756957]">
              /{race.slug} · {race.character_count} {race.character_count === 1 ? "character" : "characters"}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className={race.is_active ? "text-[8px] uppercase tracking-[0.14em] text-emerald-500" : "text-[8px] uppercase tracking-[0.14em] text-[#746858]"}>
            {race.is_active ? "Active" : "Inactive"}
          </span>
          <span className="text-sm text-[#9b7446] transition-transform group-open:rotate-180" aria-hidden="true">▼</span>
        </div>
      </summary>

      {open ? (
        <div>
          {race.banner_url ? (
            <div className="relative h-44 border-b border-[#60482e]/40 bg-[#0b0807]">
              <Image
                src={race.banner_url}
                alt={`${race.name} banner`}
                fill
                sizes="(max-width: 1280px) 100vw, 1280px"
                quality={70}
                className="object-cover opacity-70"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#15100d] via-transparent to-black/20" />
            </div>
          ) : null}

          <div className="grid lg:grid-cols-[260px_minmax(0,1fr)]">
            <aside className="border-b border-[#60482e]/35 bg-[#0f0b09] p-5 lg:border-b-0 lg:border-r">
              <div
                className="relative aspect-[4/3] overflow-hidden border border-[#765937]/55 bg-[#090706]"
                style={isValidColour(race.colour) ? { borderColor: race.colour ?? undefined } : undefined}
              >
                {race.image_url ? (
                  <Image src={race.image_url} alt={race.name} fill sizes="260px" quality={70} className="object-cover" />
                ) : race.icon_url ? (
                  <div className="flex h-full items-center justify-center p-10">
                    <Image src={race.icon_url} alt={`${race.name} icon`} width={110} height={110} className="max-h-full w-auto object-contain" />
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center font-serif text-5xl text-[#705334]">{race.name.charAt(0).toUpperCase()}</div>
                )}
              </div>

              <div className="mt-4 text-center">
                <div className="flex flex-wrap justify-center gap-2">
                  <StatusBadge active={race.is_active} />
                  <SelectableBadge selectable={race.is_selectable} />
                </div>
                <p className="mt-3 text-[10px] uppercase tracking-[0.16em] text-[#887967]">/{race.slug}</p>
                {race.colour ? (
                  <div className="mt-3 flex items-center justify-center gap-2 text-[9px] text-[#817461]">
                    <span className="h-3 w-3 rounded-full border border-white/15" style={{ backgroundColor: race.colour }} />
                    {race.colour}
                  </div>
                ) : null}
                <div className="mt-5 grid grid-cols-2 gap-2">
                  <InfoCounter label="Characters" value={race.character_count} />
                  <InfoCounter label="Order" value={race.sort_order} />
                </div>
                <p className="mt-4 text-[9px] text-[#756957]">Updated {formatDate(race.updated_at)}</p>
              </div>
            </aside>

            <div className="p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[9px] uppercase tracking-[0.2em] text-[#8c704b]">Playable ancestry</p>
                  <h3 className="mt-1 font-serif text-3xl text-[#e3cda5]">{race.name}</h3>
                </div>
                {race.icon_url ? (
                  <div className="relative h-16 w-16 border border-[#60482e]/45 bg-[#0f0b09] p-2">
                    <Image src={race.icon_url} alt={`${race.name} icon`} fill sizes="64px" className="object-contain p-2" />
                  </div>
                ) : null}
              </div>

              <AdminActionForm action={updateRace} className="mt-6">
                <input type="hidden" name="raceId" value={race.id} />
                <div className="grid gap-4 md:grid-cols-2">
                  <AdminField label="Name">
                    <input type="text" name="name" required maxLength={120} defaultValue={race.name} className="w-full border border-[#60482e]/55 bg-[#100c09] px-3 py-3 text-sm text-[#d7c4a5] outline-none focus:border-[#a17a49]" />
                  </AdminField>
                  <AdminField label="Slug">
                    <input type="text" name="slug" required maxLength={100} defaultValue={race.slug} className="w-full border border-[#60482e]/55 bg-[#100c09] px-3 py-3 text-sm text-[#d7c4a5] outline-none focus:border-[#a17a49]" />
                  </AdminField>
                  <AdminField label="Sort order">
                    <input type="number" name="sortOrder" min={-9999} max={9999} defaultValue={race.sort_order} className="w-full border border-[#60482e]/55 bg-[#100c09] px-3 py-3 text-sm text-[#d7c4a5] outline-none focus:border-[#a17a49]" />
                  </AdminField>
                  <AdminField label="Colour">
                    <input type="text" name="colour" maxLength={32} defaultValue={race.colour ?? ""} placeholder="#8c704b" className="w-full border border-[#60482e]/55 bg-[#100c09] px-3 py-3 text-sm text-[#d7c4a5] outline-none placeholder:text-[#625747] focus:border-[#a17a49]" />
                  </AdminField>
                  <div className="md:col-span-2"><AttributeModifierFields race={race} /></div>
                  <div className="md:col-span-2">
                    <AdminField label="Summary">
                      <RichTextEditor name="summary" defaultValue={race.summary} maxTextLength={1100} minHeight={150} variant="lore" />
                    </AdminField>
                  </div>
                  <div className="md:col-span-2">
                    <AdminField label="Full description">
                      <RichTextEditor name="description" defaultValue={race.description} maxTextLength={80000} minHeight={320} variant="lore" />
                    </AdminField>
                  </div>
                  <AdminField label="Main image URL">
                    <input type="text" name="imageUrl" maxLength={2000} defaultValue={race.image_url ?? ""} placeholder="/images/races/race.jpg" className="w-full border border-[#60482e]/55 bg-[#100c09] px-3 py-3 text-sm text-[#d7c4a5] outline-none placeholder:text-[#625747] focus:border-[#a17a49]" />
                  </AdminField>
                  <AdminField label="Banner URL">
                    <input type="text" name="bannerUrl" maxLength={2000} defaultValue={race.banner_url ?? ""} placeholder="/images/races/race-banner.jpg" className="w-full border border-[#60482e]/55 bg-[#100c09] px-3 py-3 text-sm text-[#d7c4a5] outline-none placeholder:text-[#625747] focus:border-[#a17a49]" />
                  </AdminField>
                  <div className="md:col-span-2">
                    <AdminField label="Icon URL">
                      <input type="text" name="iconUrl" maxLength={2000} defaultValue={race.icon_url ?? ""} placeholder="/images/races/race-icon.png" className="w-full border border-[#60482e]/55 bg-[#100c09] px-3 py-3 text-sm text-[#d7c4a5] outline-none placeholder:text-[#625747] focus:border-[#a17a49]" />
                    </AdminField>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-6">
                    <label className="flex items-center gap-3 text-sm text-[#bbaa90]">
                      <input type="checkbox" name="isActive" defaultChecked={race.is_active} className="h-4 w-4 accent-[#8b673d]" />
                      Active
                    </label>
                    <label className="flex items-center gap-3 text-sm text-[#bbaa90]">
                      <input type="checkbox" name="isSelectable" defaultChecked={race.is_selectable} className="h-4 w-4 accent-[#8b673d]" />
                      Selectable at character creation
                    </label>
                  </div>
                  <button type="submit" className="border border-[#987344] bg-[#3b2919] px-5 py-3 text-[9px] uppercase tracking-[0.2em] text-[#efd6a8] transition hover:border-[#b98c50] hover:bg-[#50371f]">Save changes</button>
                </div>
              </AdminActionForm>

              <AdminActionForm action={deleteRace} className="mt-6 border-t border-[#60482e]/30 pt-5">
                <input type="hidden" name="raceId" value={race.id} />
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <input type="text" name="confirmation" placeholder='Type "DELETE"' className="w-full border border-red-900/50 bg-[#100909] px-3 py-3 text-sm text-red-200 outline-none placeholder:text-red-900/70 focus:border-red-700" />
                  <button type="submit" className="border border-red-900/60 bg-red-950/20 px-5 py-3 text-[9px] uppercase tracking-[0.18em] text-red-500 transition hover:border-red-700 hover:bg-red-950/40">Delete race</button>
                </div>
                {race.character_count > 0 ? (
                  <p className="mt-3 text-[10px] leading-5 text-[#8e7462]">Deletion is blocked because this race is currently assigned to {race.character_count} {race.character_count === 1 ? "character" : "characters"}.</p>
                ) : null}
              </AdminActionForm>
            </div>
          </div>
        </div>
      ) : null}
    </details>
  );
}
