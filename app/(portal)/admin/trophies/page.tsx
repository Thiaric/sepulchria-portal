import Link from "next/link";
import { PendingSubmitButton } from "@/components/forms/pending-submit-button";
import { TrophySaveFeedback } from "@/components/admin/trophy-save-feedback";
import type { ReactNode } from "react";

import {
  requireAdminSection,
} from "@/lib/auth/require-staff";
import { createAdminClient } from "@/lib/supabase/admin";

import {
  createTrophy,
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

type Props = {
  searchParams?: Promise<{
    error?: string;
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

            <Field label="Metric key" className="lg:col-span-2">
              <input
                name="metric_key"
                required
                placeholder="expertise_total"
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

        <section className="mt-5">
          <div className="mb-3">
            <p className="text-[8px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-8c704b))]">
              Existing Trophies
            </p>

            <p className="mt-1 text-[10px] leading-5 text-[rgb(var(--sep-colour-807464))]">
              Deactivate a Trophy instead
              of deleting it. Existing
              character awards remain in
              the database.
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

          <PendingSubmitButton
            idleText="Save Trophy"
            pendingText="Saving..."
            className={`${buttonClass} disabled:cursor-not-allowed disabled:opacity-60`}
          />
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
