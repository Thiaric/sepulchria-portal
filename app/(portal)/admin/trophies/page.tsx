import Link from "next/link";
import { PendingSubmitButton } from "@/components/forms/pending-submit-button";
import { TrophySaveFeedback } from "@/components/admin/trophy-save-feedback";
import type { ReactNode } from "react";

import {
  requireAdminSection,
} from "@/lib/auth/require-staff";
import { createAdminClient } from "@/lib/supabase/admin";

import {
  assignManualTrophy,
  createTrophy,
  deleteManualTrophy,
  revokeManualTrophy,
  updateTrophy,
} from "./actions";

type TrophyDefinition = {
  id: string;
  trophy_key: string;
  category: string;
  name: string;
  description: string;
  metric_key: string;
  threshold: number | string;
  sort_order: number;
  is_active: boolean;
  icon_url: string | null;
};

type CharacterOption = {
  id: string;
  display_name: string;
  is_system: boolean | null;
};

type ManualAward = {
  id: string;
  character_id: string;
  trophy_id: string;
  earned_at: string;
};

type Props = {
  searchParams?: Promise<{
    error?: string;
    notice?: string;
    saved?: string;
    status_trophy?: string;
  }>;
};

const inputClass =
  "w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-[11px] text-[rgb(var(--sep-colour-d7c4a5))] outline-none placeholder:text-[rgb(var(--sep-colour-625747))] focus:border-[rgb(var(--sep-colour-a17a49))]";

const labelClass =
  "text-[8px] uppercase tracking-[0.17em] text-[rgb(var(--sep-colour-8b765a))]";

const buttonClass =
  "border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-4 py-2.5 text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-efd6a8))] transition hover:bg-[rgb(var(--sep-colour-4a321e))]";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminTrophiesPage({
  searchParams,
}: Props) {
  await requireAdminSection("trophies");

  const params =
    (await searchParams) ?? {};

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("trophy_definitions")
    .select(
      "id, trophy_key, category, name, description, metric_key, threshold, sort_order, is_active, icon_url",
    )
    .order("category", {
      ascending: true,
    })
    .order("sort_order", {
      ascending: true,
    })
    .order("name", {
      ascending: true,
    });

  if (error) {
    throw new Error(
      `Unable to load Trophy catalogue: ${error.message}`,
    );
  }

  const trophies =
    (data ?? []) as TrophyDefinition[];

  const manualTrophies =
    trophies.filter(
      (trophy) =>
        trophy.metric_key.startsWith(
          "manual:",
        ),
    );

  const {
    data: characterData,
    error: characterError,
  } = await supabase
    .from("characters")
    .select(
      "id, display_name, is_system",
    )
    .eq("status", "approved")
    .order("display_name", {
      ascending: true,
    });

  if (characterError) {
    throw new Error(
      `Unable to load characters for Trophy awards: ${characterError.message}`,
    );
  }

  const characters =
    (
      (characterData ?? []) as
        CharacterOption[]
    ).filter(
      (character) =>
        character.is_system !== true,
    );

  let manualAwards:
    ManualAward[] = [];

  if (manualTrophies.length > 0) {
    const {
      data: awardData,
      error: awardError,
    } = await supabase
      .from("character_trophies")
      .select(
        "id, character_id, trophy_id, earned_at",
      )
      .in(
        "trophy_id",
        manualTrophies.map(
          (trophy) => trophy.id,
        ),
      )
      .order("earned_at", {
        ascending: false,
      });

    if (awardError) {
      throw new Error(
        `Unable to load Manual Trophy awards: ${awardError.message}`,
      );
    }

    manualAwards =
      (awardData ?? []) as
        ManualAward[];
  }

  const characterNames =
    new Map(
      characters.map(
        (character) => [
          character.id,
          character.display_name,
        ],
      ),
    );

  const manualTrophyNames =
    new Map(
      manualTrophies.map(
        (trophy) => [
          trophy.id,
          trophy.name,
        ],
      ),
    );

  const categoryCount =
    new Set(
      trophies.map(
        (trophy) => trophy.category,
      ),
    ).size;

  const activeCount =
    trophies.filter(
      (trophy) => trophy.is_active,
    ).length;

  const withIconsCount =
    trophies.filter(
      (trophy) =>
        Boolean(trophy.icon_url?.trim()),
    ).length;

  return (
    <main>
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-8c704b))]">
              Administration
            </p>

            <h2 className="mt-1 font-serif text-3xl text-[rgb(var(--sep-colour-ead5ac))]">
              Trophy Catalogue
            </h2>

            <p className="mt-1 max-w-3xl text-xs leading-5 text-[rgb(var(--sep-colour-928674))]">
              Manage Trophy names,
              descriptions, metrics,
              thresholds, artwork and
              availability.
            </p>
          </div>

          <Link
            href="/admin/media"
            className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] px-3 py-2 text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-a99069))] transition hover:border-[rgb(var(--sep-colour-987344))] hover:text-[rgb(var(--sep-colour-e5c99a))]"
          >
            Open Media Library
          </Link>
        </div>

        {params.error ? (
          <section className="mt-4 border border-red-800/55 bg-red-950/15 px-4 py-3">
            <p className="text-[8px] uppercase tracking-[0.18em] text-red-400">
              Trophy update failed
            </p>

            <p className="mt-2 text-xs leading-5 text-red-200/80">
              {params.error}
            </p>
          </section>
        ) : null}

        {params.notice ? (
          <section className="mt-4 border border-[rgb(var(--sep-colour-56754f))]/55 bg-[rgb(var(--sep-colour-142016))] px-4 py-3">
            <p className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-9dc294))]">
              Trophy action complete
            </p>

            <p className="mt-2 text-xs leading-5 text-[rgb(var(--sep-colour-c5d7bd))]">
              {params.notice}
            </p>
          </section>
        ) : null}

        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <Stat label="Definitions" value={trophies.length} />
          <Stat label="Active" value={activeCount} />
          <Stat label="Categories" value={categoryCount} />
          <Stat label="With icons" value={withIconsCount} />
        </div>

        <section className="mt-5 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-100c09))] p-4">
          <p className="text-[8px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-8c704b))]">
            Add Trophy
          </p>

          <p className="mt-1 max-w-3xl text-[10px] leading-5 text-[rgb(var(--sep-colour-807464))]">
            Trophy keys become stable
            identifiers after creation.
            Create them carefully; edit
            the other catalogue fields
            later as needed.
          </p>

          <form
            action={createTrophy}
            className="mt-4 grid gap-3 lg:grid-cols-6"
          >
            <Field label="Trophy key" className="lg:col-span-2">
              <input
                name="trophy_key"
                required
                placeholder="example_trophy_10"
                className={inputClass}
              />
            </Field>

            <Field label="Name" className="lg:col-span-2">
              <input name="name" required className={inputClass} />
            </Field>

            <Field label="Category" className="lg:col-span-2">
              <input
                name="category"
                required
                placeholder="Expertise"
                className={inputClass}
              />
            </Field>

            <Field label="Award mode" className="lg:col-span-2">
              <select
                name="award_mode"
                defaultValue="automatic"
                className={inputClass}
              >
                <option value="automatic">
                  Automatic — metric based
                </option>
                <option value="manual">
                  Manual — staff awarded
                </option>
              </select>
            </Field>

            <Field label="Metric key" className="lg:col-span-2">
              <input
                name="metric_key"
                placeholder="expertise_total — leave blank for Manual"
                className={inputClass}
              />
            </Field>

            <Field label="Threshold">
              <input
                name="threshold"
                type="number"
                min="0"
                step="any"
                defaultValue="1"
                className={inputClass}
              />
            </Field>

            <Field label="Sort order">
              <input
                name="sort_order"
                required
                type="number"
                step="1"
                defaultValue="0"
                className={inputClass}
              />
            </Field>

            <Field label="Icon path / URL" className="lg:col-span-2">
              <input
                name="icon_url"
                placeholder="/images/trophies/example.png"
                className={inputClass}
              />
            </Field>

            <Field label="Description" className="lg:col-span-4">
              <textarea
                name="description"
                required
                rows={2}
                className={`${inputClass} resize-y`}
              />
            </Field>

            <label className="flex items-center gap-2 lg:col-span-2">
              <input
                name="is_active"
                type="checkbox"
                defaultChecked
                className="h-4 w-4 accent-[rgb(var(--sep-colour-9a7543))]"
              />
              <span className={labelClass}>Active</span>
            </label>

            <div className="flex justify-end lg:col-span-4">
              <button type="submit" className={buttonClass}>
                Create Trophy
              </button>
            </div>
          </form>
        </section>

        <section
          id="manual-trophy-awards"
          className="mt-5 scroll-mt-4 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-100c09))] p-4"
        >
          <p className="text-[8px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-8c704b))]">
            Manual Trophy Awards
          </p>

          <p className="mt-1 max-w-3xl text-[10px] leading-5 text-[rgb(var(--sep-colour-807464))]">
            Staff-awarded Trophies are never granted by metric progress.
            Assign them directly to approved player characters here.
          </p>

          <form
            action={assignManualTrophy}
            className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end"
          >
            <Field label="Character">
              <select
                name="character_id"
                required
                className={inputClass}
              >
                <option value="">
                  Select character...
                </option>
                {characters.map(
                  (character) => (
                    <option
                      key={character.id}
                      value={character.id}
                    >
                      {character.display_name}
                    </option>
                  ),
                )}
              </select>
            </Field>

            <Field label="Manual Trophy">
              <select
                name="trophy_id"
                required
                className={inputClass}
              >
                <option value="">
                  Select Trophy...
                </option>
                {manualTrophies
                  .filter(
                    (trophy) =>
                      trophy.is_active,
                  )
                  .map((trophy) => (
                    <option
                      key={trophy.id}
                      value={trophy.id}
                    >
                      {trophy.name}
                    </option>
                  ))}
              </select>
            </Field>

            <button
              type="submit"
              disabled={
                characters.length === 0 ||
                manualTrophies.filter(
                  (trophy) =>
                    trophy.is_active,
                ).length === 0
              }
              className={`${buttonClass} h-[34px] disabled:cursor-not-allowed disabled:opacity-45`}
            >
              Award Trophy
            </button>
          </form>

          <div className="mt-5 border-t border-[rgb(var(--sep-colour-60482e))]/35 pt-4">
            <div className="flex items-center justify-between gap-3">
              <p className={labelClass}>
                Current Manual Awards
              </p>

              <span className="text-[8px] text-[rgb(var(--sep-colour-746958))]">
                {manualAwards.length}
              </span>
            </div>

            {manualAwards.length === 0 ? (
              <p className="mt-3 text-[10px] text-[rgb(var(--sep-colour-746958))]">
                No Manual Trophies have been awarded yet.
              </p>
            ) : (
              <div className="mt-3 space-y-1.5">
                {manualAwards.map(
                  (award) => (
                    <div
                      key={award.id}
                      className="flex flex-wrap items-center justify-between gap-3 border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-120d0a))] px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="font-serif text-sm text-[rgb(var(--sep-colour-d8bf91))]">
                          {manualTrophyNames.get(
                            award.trophy_id,
                          ) ?? "Unknown Trophy"}
                        </p>

                        <p className="mt-0.5 text-[9px] text-[rgb(var(--sep-colour-8f8270))]">
                          {characterNames.get(
                            award.character_id,
                          ) ?? "Unknown character"}
                          {" · "}
                          {new Date(
                            award.earned_at,
                          ).toLocaleDateString(
                            "en-GB",
                          )}
                        </p>
                      </div>

                      <form
                        action={revokeManualTrophy}
                      >
                        <input
                          type="hidden"
                          name="character_id"
                          value={
                            award.character_id
                          }
                        />
                        <input
                          type="hidden"
                          name="trophy_id"
                          value={
                            award.trophy_id
                          }
                        />

                        <button
                          type="submit"
                          className="border border-red-900/60 bg-red-950/20 px-3 py-1.5 text-[7px] uppercase tracking-[0.14em] text-red-300 transition hover:border-red-700 hover:bg-red-950/40"
                        >
                          Revoke
                        </button>
                      </form>
                    </div>
                  ),
                )}
              </div>
            )}
          </div>
        </section>

        <section className="mt-5">
          <div className="mb-3">
            <p className="text-[8px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-8c704b))]">
              Existing Trophies
            </p>

            <p className="mt-1 text-[10px] leading-5 text-[rgb(var(--sep-colour-807464))]">
              Automatic Trophies should be deactivated rather than deleted.
              Manual Trophies can be permanently deleted by staff; deleting
              one also removes its current character awards.
            </p>
          </div>

          <div className="space-y-3">
            {trophies.map((trophy) => (
              <TrophyEditor
                key={trophy.id}
                trophy={trophy}
                saveSuccess={
                  params.saved === "1" &&
                  params.status_trophy ===
                    trophy.id
                }
                saveError={
                  params.status_trophy ===
                    trophy.id
                    ? params.error ?? null
                    : null
                }
              />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function TrophyEditor({
  trophy,
  saveSuccess,
  saveError,
}: {
  trophy: TrophyDefinition;
  saveSuccess: boolean;
  saveError: string | null;
}) {
  const isManual =
    trophy.metric_key.startsWith(
      "manual:",
    );

  return (
    <form
      id={`admin-trophy-${trophy.id}`}
      data-admin-trophy-id={trophy.id}
      data-admin-trophy-name={trophy.name}
      data-admin-trophy-category={trophy.category}
      data-admin-trophy-description={trophy.description}
      data-admin-trophy-active={
        trophy.is_active
          ? "true"
          : "false"
      }
      action={updateTrophy}
      className="scroll-mt-4 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-120d0a))] p-3 sm:p-4"
    >
      <input type="hidden" name="id" value={trophy.id} />

      <div className="grid gap-4 xl:grid-cols-[78px_minmax(0,1fr)_auto]">
        <div className="flex h-[78px] w-[78px] items-center justify-center overflow-hidden border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-0c0907))]">
          {trophy.icon_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={trophy.icon_url}
              alt=""
              className="h-full w-full object-contain p-1"
            />
          ) : (
            <span className="font-serif text-2xl text-[rgb(var(--sep-colour-5e5142))]">
              ?
            </span>
          )}
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-serif text-lg text-[rgb(var(--sep-colour-dbc396))]">
              {trophy.name}
            </h3>

            <span
              className={`border px-2 py-1 text-[7px] uppercase tracking-[0.14em] ${
                trophy.is_active
                  ? "border-[rgb(var(--sep-colour-56754f))]/55 text-[rgb(var(--sep-colour-9dc294))]"
                  : "border-[rgb(var(--sep-colour-6a5046))]/55 text-[rgb(var(--sep-colour-9a8178))]"
              }`}
            >
              {trophy.is_active ? "Active" : "Inactive"}
            </span>

            <span className="border border-[rgb(var(--sep-colour-725b3d))]/55 px-2 py-1 text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-b59b74))]">
              {isManual
                ? "Manual"
                : "Automatic"}
            </span>
          </div>

          <p className="mt-1 font-mono text-[9px] text-[rgb(var(--sep-colour-6f665b))]">
            {trophy.trophy_key}
          </p>

          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <Field label="Name" className="xl:col-span-2">
              <input
                name="name"
                required
                defaultValue={trophy.name}
                className={inputClass}
              />
            </Field>

            <Field label="Category" className="xl:col-span-2">
              <input
                name="category"
                required
                defaultValue={trophy.category}
                className={inputClass}
              />
            </Field>

            {isManual ? (
              <>
                <input
                  type="hidden"
                  name="metric_key"
                  value={trophy.metric_key}
                />
                <input
                  type="hidden"
                  name="threshold"
                  value="1"
                />

                <div className="xl:col-span-3">
                  <p className={labelClass}>
                    Award rule
                  </p>
                  <div className="mt-1.5 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-0d0a08))] px-3 py-2 text-[10px] text-[rgb(var(--sep-colour-a99472))]">
                    Staff assignment only
                  </div>
                </div>
              </>
            ) : (
              <>
                <Field label="Metric key" className="xl:col-span-2">
                  <input
                    name="metric_key"
                    required
                    defaultValue={trophy.metric_key}
                    className={inputClass}
                  />
                </Field>

                <Field label="Threshold">
                  <input
                    name="threshold"
                    required
                    type="number"
                    min="0"
                    step="any"
                    defaultValue={String(trophy.threshold)}
                    className={inputClass}
                  />
                </Field>
              </>
            )}

            <Field label="Sort order">
              <input
                name="sort_order"
                required
                type="number"
                step="1"
                defaultValue={trophy.sort_order}
                className={inputClass}
              />
            </Field>

            <Field label="Icon path / URL" className="xl:col-span-4">
              <input
                name="icon_url"
                defaultValue={trophy.icon_url ?? ""}
                placeholder="/images/trophies/example.png"
                className={inputClass}
              />
            </Field>

            <Field label="Description" className="xl:col-span-6">
              <textarea
                name="description"
                required
                rows={2}
                defaultValue={trophy.description}
                className={`${inputClass} resize-y`}
              />

              {saveSuccess ? (
                <TrophySaveFeedback
                  type="success"
                  message="Trophy saved successfully."
                />
              ) : saveError ? (
                <TrophySaveFeedback
                  type="error"
                  message={saveError}
                />
              ) : null}
            </Field>
          </div>
        </div>

        <div className="flex min-w-[120px] flex-col items-end justify-between gap-4">
          <label className="flex items-center gap-2">
            <input
              name="is_active"
              type="checkbox"
              defaultChecked={trophy.is_active}
              className="h-4 w-4 accent-[rgb(var(--sep-colour-9a7543))]"
            />
            <span className={labelClass}>Active</span>
          </label>

          <div className="flex flex-col items-end gap-2">
            <PendingSubmitButton
              idleText="Save Trophy"
              pendingText="Saving..."
              className={`${buttonClass} disabled:cursor-not-allowed disabled:opacity-60`}
            />

            {isManual ? (
              <button
                type="submit"
                formAction={deleteManualTrophy}
                name="id"
                value={trophy.id}
                className="border border-red-900/60 bg-red-950/20 px-3 py-2 text-[7px] uppercase tracking-[0.14em] text-red-300 transition hover:border-red-700 hover:bg-red-950/40"
              >
                Delete Manual Trophy
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </form>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className={labelClass}>{label}</span>
      <span className="mt-1.5 block">{children}</span>
    </label>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] px-4 py-3">
      <p className="text-[7px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-7d6a50))]">
        {label}
      </p>

      <p className="mt-1 font-serif text-2xl text-[rgb(var(--sep-colour-d8c097))]">
        {value}
      </p>
    </div>
  );
}
