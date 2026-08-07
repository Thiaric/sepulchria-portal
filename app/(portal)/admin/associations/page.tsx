import Image from "next/image";

import { RichTextContent } from "@/components/editor/rich-text-content";
import { RichTextEditor } from "@/components/editor/rich-text-editor";
import { requireStaff } from "@/lib/auth/require-staff";
import { createClient } from "@/lib/supabase/server";

import {
  createAssociation,
  deleteAssociation,
  updateAssociation,
} from "./actions";

type AssociationRow = {
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

type AssociationQueryRow = {
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

type AdminAssociationsPageProps = {
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

export default async function AdminAssociationsPage({
  searchParams,
}: AdminAssociationsPageProps) {
  await requireStaff();

  const resolvedSearchParams =
    (await searchParams) ?? {};

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("associations")
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
      `Unable to load associations: ${error.message}`,
    );
  }

  const associations = (
    (data ?? []) as unknown as AssociationQueryRow[]
  ).map(
    (association): AssociationRow => ({
      id: association.id,
      name: association.name,
      slug: association.slug,
      summary: association.summary,
      description: association.description,
      image_url: association.image_url,
      banner_url: association.banner_url,
      icon_url: association.icon_url,
      colour: association.colour,
      is_active: association.is_active,
      sort_order: association.sort_order,
      created_at: association.created_at,
      updated_at: association.updated_at,
      character_count: getCount(
        association.characters,
      ),
    }),
  );

  const activeAssociationCount =
    associations.filter(
      (association) =>
        association.is_active,
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
              Association Management
            </h2>

            <p className="mt-3 max-w-3xl text-sm leading-7 text-[#a99b89]">
              Create and maintain the
              organisations, orders and
              factions of Sepulchria.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <AdminCounter>
              {associations.length}{" "}
              {associations.length === 1
                ? "association"
                : "associations"}
            </AdminCounter>

            <AdminCounter>
              {activeAssociationCount} active
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
          id="association-new"
          className="scroll-mt-24 mt-8 border border-[#60482e]/45 bg-[#15100d] p-5 sm:p-6"
        >
          <p className="text-[9px] uppercase tracking-[0.24em] text-[#8c704b]">
            New association
          </p>

          <h3 className="mt-2 font-serif text-2xl text-[#dfc99f]">
            Create an association
          </h3>

          <form
            action={createAssociation}
            className="mt-6"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <AdminField label="Name">
                <input
                  type="text"
                  name="name"
                  required
                  maxLength={120}
                  placeholder="The Eyes"
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
                <input
                  type="text"
                  name="colour"
                  maxLength={32}
                  placeholder="#8c704b"
                  className="w-full border border-[#60482e]/55 bg-[#100c09] px-3 py-3 text-sm text-[#d7c4a5] outline-none placeholder:text-[#625747] focus:border-[#a17a49]"
                />
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
                            placeholder="Describe the association, its purpose, culture, hierarchy and role in the city."
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
                  placeholder="/images/associations/eyes.jpg"
                  className="w-full border border-[#60482e]/55 bg-[#100c09] px-3 py-3 text-sm text-[#d7c4a5] outline-none placeholder:text-[#625747] focus:border-[#a17a49]"
                />
              </AdminField>

              <AdminField label="Banner URL">
                <input
                  type="text"
                  name="bannerUrl"
                  maxLength={2000}
                  placeholder="/images/associations/eyes-banner.jpg"
                  className="w-full border border-[#60482e]/55 bg-[#100c09] px-3 py-3 text-sm text-[#d7c4a5] outline-none placeholder:text-[#625747] focus:border-[#a17a49]"
                />
              </AdminField>

              <div className="md:col-span-2">
                <AdminField label="Icon URL">
                  <input
                    type="text"
                    name="iconUrl"
                    maxLength={2000}
                    placeholder="/images/associations/eyes-icon.png"
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
                Create association
              </button>
            </div>
          </form>
        </section>

        <div className="mt-6 space-y-5">
          {associations.map(
            (association) => (
              <section
                key={association.id}
                id={`association-${association.slug}`}
                className="scroll-mt-24 overflow-hidden border border-[#60482e]/45 bg-[#15100d]"
              >
                {association.banner_url ? (
                  <div className="relative h-44 border-b border-[#60482e]/40 bg-[#0b0807]">
                    <Image
                      src={
                        association.banner_url
                      }
                      alt={`${association.name} banner`}
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
                          association.colour,
                        )
                          ? {
                              borderColor:
                                association.colour ??
                                undefined,
                            }
                          : undefined
                      }
                    >
                      {association.image_url ? (
                        <Image
                          src={
                            association.image_url
                          }
                          alt={association.name}
                          fill
                          sizes="260px"
                          className="object-cover"
                          unoptimized
                        />
                      ) : association.icon_url ? (
                        <div className="flex h-full items-center justify-center p-10">
                          <Image
                            src={
                              association.icon_url
                            }
                            alt={`${association.name} icon`}
                            width={110}
                            height={110}
                            className="max-h-full w-auto object-contain"
                            unoptimized
                          />
                        </div>
                      ) : (
                        <div className="flex h-full items-center justify-center font-serif text-5xl text-[#705334]">
                          {association.name
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                      )}
                    </div>

                    <div className="mt-4 text-center">
                      <StatusBadge
                        isActive={
                          association.is_active
                        }
                      />

                      <p className="mt-3 text-[10px] uppercase tracking-[0.16em] text-[#887967]">
                        /{association.slug}
                      </p>

                      {association.colour ? (
                        <div className="mt-3 flex items-center justify-center gap-2 text-[9px] text-[#817461]">
                          <span
                            className="h-3 w-3 rounded-full border border-white/15"
                            style={{
                              backgroundColor:
                                association.colour,
                            }}
                          />

                          {association.colour}
                        </div>
                      ) : null}

                      <div className="mt-5 grid grid-cols-2 gap-2">
                        <InfoCounter
                          label="Characters"
                          value={
                            association.character_count
                          }
                        />

                        <InfoCounter
                          label="Order"
                          value={
                            association.sort_order
                          }
                        />
                      </div>

                      <p className="mt-4 text-[9px] text-[#756957]">
                        Updated{" "}
                        {formatDate(
                          association.updated_at,
                        )}
                      </p>
                    </div>
                  </aside>

                  <div className="p-5 sm:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-[9px] uppercase tracking-[0.2em] text-[#8c704b]">
                          City association
                        </p>

                        <h3 className="mt-1 font-serif text-3xl text-[#e3cda5]">
                          {association.name}
                        </h3>

                  
                      </div>

                      {association.icon_url ? (
                        <div className="relative h-16 w-16 border border-[#60482e]/45 bg-[#0f0b09]">
                          <Image
                            src={
                              association.icon_url
                            }
                            alt={`${association.name} icon`}
                            fill
                            sizes="64px"
                            className="object-contain p-2"
                            unoptimized
                          />
                        </div>
                      ) : null}
                    </div>

                    <form
                      action={
                        updateAssociation
                      }
                      className="mt-6"
                    >
                      <input
                        type="hidden"
                        name="associationId"
                        value={association.id}
                      />

                      <div className="grid gap-4 md:grid-cols-2">
                        <AdminField label="Name">
                          <input
                            type="text"
                            name="name"
                            required
                            maxLength={120}
                            defaultValue={
                              association.name
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
                              association.slug
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
                              association.sort_order
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
                              association.colour ??
                              ""
                            }
                            placeholder="#8c704b"
                            className="w-full border border-[#60482e]/55 bg-[#100c09] px-3 py-3 text-sm text-[#d7c4a5] outline-none placeholder:text-[#625747] focus:border-[#a17a49]"
                          />
                        </AdminField>

                        <div className="md:col-span-2">
                          <AdminField label="Summary">
                            <RichTextEditor
                            name="summary"
                            defaultValue={association.summary}
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
                            defaultValue={association.description}
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
                              association.image_url ??
                              ""
                            }
                            placeholder="/images/associations/association.jpg"
                            className="w-full border border-[#60482e]/55 bg-[#100c09] px-3 py-3 text-sm text-[#d7c4a5] outline-none placeholder:text-[#625747] focus:border-[#a17a49]"
                          />
                        </AdminField>

                        <AdminField label="Banner URL">
                          <input
                            type="text"
                            name="bannerUrl"
                            maxLength={2000}
                            defaultValue={
                              association.banner_url ??
                              ""
                            }
                            placeholder="/images/associations/association-banner.jpg"
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
                                association.icon_url ??
                                ""
                              }
                              placeholder="/images/associations/association-icon.png"
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
                              association.is_active
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
                      action={
                        deleteAssociation
                      }
                      className="mt-6 border-t border-[#60482e]/30 pt-5"
                    >
                      <input
                        type="hidden"
                        name="associationId"
                        value={association.id}
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
                          Delete association
                        </button>
                      </div>

                      {association.character_count >
                      0 ? (
                        <p className="mt-3 text-[10px] leading-5 text-[#8e7462]">
                          Deletion is blocked
                          because this
                          association is
                          currently assigned
                          to{" "}
                          {
                            association.character_count
                          }{" "}
                          {association.character_count ===
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
            ),
          )}

          {associations.length === 0 ? (
            <section className="border border-[#60482e]/45 bg-[#15100d] p-10 text-center">
              <p className="font-serif text-xl text-[#b9a88f]">
                No associations were
                found.
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