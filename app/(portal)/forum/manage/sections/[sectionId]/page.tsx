import Link from "next/link";
import Script from "next/script";
import {
  notFound,
  redirect,
} from "next/navigation";

import {
  deleteForumSectionAction,
  toggleForumSectionStatusAction,
  updateForumSectionAction,
} from "../actions";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type EditForumSectionPageProps = {
  params: Promise<{
    sectionId: string;
  }>;

  searchParams: Promise<{
    error?: string | string[];
    success?: string | string[];
  }>;
};

type ForumSectionRecord = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  section_type:
    | "ongame"
    | "offgame"
    | "organisation";
  association_id: string | null;
  parent_id: string | null;
  visibility:
    | "public"
    | "members"
    | "staff";
  icon_url: string | null;
  banner_url: string | null;
  colour: string | null;
  is_active: boolean;
  sort_order: number;
};

type ParentSectionRecord = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
};

type AssociationRecord = {
  id: string;
  name: string;
};

type TopicRecord = {
  id: string;
  deleted_at: string | null;
};

function getSearchParamValue(
  value: string | string[] | undefined,
): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

export default async function EditForumSectionPage({
  params,
  searchParams,
}: EditForumSectionPageProps) {
  const {
    sectionId,
  } = await params;

  const resolvedSearchParams =
    await searchParams;

  const errorMessage =
    getSearchParamValue(
      resolvedSearchParams.error,
    );

  const successMessage =
    getSearchParamValue(
      resolvedSearchParams.success,
    );

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      `/login?redirect=${encodeURIComponent(
        `/forum/manage/sections/${sectionId}`,
      )}`,
    );
  }

  const {
    data: staffResult,
    error: staffError,
  } = await supabase.rpc(
    "current_user_is_staff",
  );

  if (
    staffError ||
    staffResult !== true
  ) {
    redirect("/forum");
  }

  const [
    {
      data: sectionRecord,
      error: sectionError,
    },
    {
      data: parentSectionRecords,
      error: parentSectionsError,
    },
    {
      data: associationRecords,
      error: associationsError,
    },
    {
      data: topicRecords,
      error: topicsError,
    },
    {
      count: childSectionCount,
      error: childSectionCountError,
    },
  ] = await Promise.all([
    supabase
      .from("forum_sections")
      .select(
        `
          id,
          name,
          slug,
          description,
          section_type,
          association_id,
          parent_id,
          visibility,
          icon_url,
          banner_url,
          colour,
          is_active,
          sort_order
        `,
      )
      .eq("id", sectionId)
      .maybeSingle<ForumSectionRecord>(),

    supabase
      .from("forum_sections")
      .select(
        `
          id,
          name,
          slug,
          is_active
        `,
      )
      .neq("id", sectionId)
      .order("sort_order", {
        ascending: true,
      })
      .order("name", {
        ascending: true,
      }),

    supabase
      .from("associations")
      .select(
        `
          id,
          name
        `,
      )
      .order("name", {
        ascending: true,
      }),

    supabase
      .from("forum_topics")
      .select(
        `
          id,
          deleted_at
        `,
      )
      .eq("section_id", sectionId),

    supabase
      .from("forum_sections")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("parent_id", sectionId),
  ]);

  if (sectionError) {
    throw new Error(
      `Unable to load the forum section: ${sectionError.message}`,
    );
  }

  if (!sectionRecord) {
    notFound();
  }

  if (parentSectionsError) {
    throw new Error(
      `Unable to load parent sections: ${parentSectionsError.message}`,
    );
  }

  if (associationsError) {
    throw new Error(
      `Unable to load organisations: ${associationsError.message}`,
    );
  }

  if (topicsError) {
    throw new Error(
      `Unable to load section topics: ${topicsError.message}`,
    );
  }

  if (childSectionCountError) {
    throw new Error(
      `Unable to inspect child sections: ${childSectionCountError.message}`,
    );
  }

  const section =
    sectionRecord as ForumSectionRecord;

  const parentSections =
    (parentSectionRecords ??
      []) as ParentSectionRecord[];

  const associations =
    (associationRecords ??
      []) as AssociationRecord[];

  const topics =
    (topicRecords ??
      []) as TopicRecord[];

  const activeTopics =
    topics.filter(
      (topic) => !topic.deleted_at,
    ).length;

  const deletedTopics =
    topics.filter(
      (topic) =>
        Boolean(topic.deleted_at),
    ).length;

  const numberOfChildSections =
    typeof childSectionCount === "number"
      ? childSectionCount
      : 0;

  const canDelete =
    topics.length === 0 &&
    numberOfChildSections === 0;

  const sectionColour =
    section.colour &&
    /^#[0-9a-f]{6}$/i.test(
      section.colour,
    )
      ? section.colour
      : "#8c704b";

  return (
    <>
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <nav
          aria-label="Forum breadcrumb"
          className="mb-6 flex flex-wrap items-center gap-2 text-[9px] uppercase tracking-[0.16em] text-[#746653]"
        >
          <Link
            href="/forum"
            className="transition hover:text-[#c7a16d]"
          >
            Forum
          </Link>

          <span aria-hidden="true">
            /
          </span>

          <Link
            href="/forum/manage"
            className="transition hover:text-[#c7a16d]"
          >
            Staff management
          </Link>

          <span aria-hidden="true">
            /
          </span>

          <Link
            href="/forum/manage/sections"
            className="transition hover:text-[#c7a16d]"
          >
            Sections
          </Link>

          <span aria-hidden="true">
            /
          </span>

          <span className="text-[#a48c6c]">
            {section.name}
          </span>
        </nav>

        <header className="overflow-hidden border border-[#60482e]/45 bg-[#15100d]">
          <div className="flex flex-col gap-5 border-b border-[#60482e]/35 bg-[#1a130e] px-5 py-7 sm:px-7 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[8px] uppercase tracking-[0.22em] text-amber-500">
                  Forum structure
                </p>

                <StatusBadge
                  active={
                    section.is_active
                  }
                />
              </div>

              <h1 className="mt-3 font-serif text-3xl text-[#dec69d] sm:text-4xl">
                Edit Forum Section
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-[#817567]">
                Update the section&apos;s
                identity, access,
                appearance and publication
                status.
              </p>
            </div>

            {section.is_active ? (
              <Link
                href={`/forum/${encodeURIComponent(
                  section.slug,
                )}`}
                className="shrink-0 border border-[#60482e]/55 bg-[#15100d] px-5 py-3 text-center text-[8px] uppercase tracking-[0.17em] text-[#a58b68] transition hover:border-[#947047] hover:text-[#dec095]"
              >
                Open section
              </Link>
            ) : null}
          </div>

          <dl className="grid grid-cols-2 divide-x divide-y divide-[#60482e]/30 bg-[#100c09] sm:grid-cols-4 sm:divide-y-0">
            <Statistic
              label="Active topics"
              value={activeTopics}
            />

            <Statistic
              label="Deleted topics"
              value={deletedTopics}
            />

            <Statistic
              label="Child sections"
              value={
                numberOfChildSections
              }
            />

            <Statistic
              label="Display order"
              value={section.sort_order}
            />
          </dl>
        </header>

        {errorMessage ? (
          <div
            role="alert"
            className="mt-6 border border-red-900/60 bg-red-950/20 px-5 py-4"
          >
            <p className="text-[8px] uppercase tracking-[0.18em] text-red-400">
              Changes not saved
            </p>

            <p className="mt-2 text-sm leading-6 text-red-200/80">
              {errorMessage}
            </p>
          </div>
        ) : null}

        {successMessage ? (
          <div
            role="status"
            className="mt-6 border border-emerald-900/60 bg-emerald-950/20 px-5 py-4"
          >
            <p className="text-[8px] uppercase tracking-[0.18em] text-emerald-400">
              Changes saved
            </p>

            <p className="mt-2 text-sm leading-6 text-emerald-200/80">
              {successMessage}
            </p>
          </div>
        ) : null}

        <form
          action={
            updateForumSectionAction
          }
          className="mt-6 border border-[#60482e]/45 bg-[#15100d]"
        >
          <input
            type="hidden"
            name="section_id"
            value={section.id}
          />

          <section className="border-b border-[#60482e]/30 px-5 py-6 sm:px-7">
            <SectionHeading
              eyebrow="Identity"
              title="Section details"
              description="Update the public name, URL slug and description."
            />

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <FieldGroup
                label="Section name"
                htmlFor="forum-section-name"
                required
                description="The public name displayed on the forum."
              >
                <input
                  id="forum-section-name"
                  name="name"
                  type="text"
                  required
                  maxLength={120}
                  autoComplete="off"
                  defaultValue={
                    section.name
                  }
                  className={inputClassName}
                />
              </FieldGroup>

              <FieldGroup
                label="Slug"
                htmlFor="forum-section-slug"
                required
                description="Used in the section URL. Changing it changes the public address."
              >
                <input
                  id="forum-section-slug"
                  name="slug"
                  type="text"
                  required
                  maxLength={140}
                  autoComplete="off"
                  pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                  defaultValue={
                    section.slug
                  }
                  className={inputClassName}
                />
              </FieldGroup>
            </div>

            <div className="mt-5">
              <FieldGroup
                label="Description"
                htmlFor="forum-section-description"
                description="A concise explanation of the section's purpose."
              >
                <textarea
                  id="forum-section-description"
                  name="description"
                  rows={5}
                  maxLength={2000}
                  defaultValue={
                    section.description ??
                    ""
                  }
                  className={`${inputClassName} min-h-32 resize-y`}
                />
              </FieldGroup>
            </div>
          </section>

          <section className="border-b border-[#60482e]/30 px-5 py-6 sm:px-7">
            <SectionHeading
              eyebrow="Classification"
              title="Type and access"
              description="Define the category, visibility and any connected organisation."
            />

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <FieldGroup
                label="Section type"
                htmlFor="forum-section-type"
                required
                description="Determines where the section appears on the forum index."
              >
                <select
                  id="forum-section-type"
                  name="section_type"
                  required
                  defaultValue={
                    section.section_type
                  }
                  className={inputClassName}
                >
                  <option value="ongame">
                    Ongame
                  </option>

                  <option value="offgame">
                    Offgame
                  </option>

                  <option value="organisation">
                    Organisation
                  </option>
                </select>
              </FieldGroup>

              <FieldGroup
                label="Visibility"
                htmlFor="forum-section-visibility"
                required
                description="Controls which users may view the section."
              >
                <select
                  id="forum-section-visibility"
                  name="visibility"
                  required
                  defaultValue={
                    section.visibility
                  }
                  className={inputClassName}
                >
                  <option value="public">
                    Public
                  </option>

                  <option value="members">
                    Organisation members
                  </option>

                  <option value="staff">
                    Staff only
                  </option>
                </select>
              </FieldGroup>

              <FieldGroup
                label="Organisation"
                htmlFor="forum-section-association"
                description="Optional organisation connected to this section."
              >
                <select
                  id="forum-section-association"
                  name="association_id"
                  defaultValue={
                    section.association_id ??
                    ""
                  }
                  className={inputClassName}
                >
                  <option value="">
                    No organisation
                  </option>

                  {associations.map(
                    (association) => (
                      <option
                        key={
                          association.id
                        }
                        value={
                          association.id
                        }
                      >
                        {
                          association.name
                        }
                      </option>
                    ),
                  )}
                </select>
              </FieldGroup>

              <FieldGroup
                label="Parent section"
                htmlFor="forum-section-parent"
                description="Optionally place this section beneath another section."
              >
                <select
                  id="forum-section-parent"
                  name="parent_id"
                  defaultValue={
                    section.parent_id ??
                    ""
                  }
                  className={inputClassName}
                >
                  <option value="">
                    No parent section
                  </option>

                  {parentSections.map(
                    (parentSection) => (
                      <option
                        key={
                          parentSection.id
                        }
                        value={
                          parentSection.id
                        }
                      >
                        {
                          parentSection.name
                        }
                        {!parentSection.is_active
                          ? " — Hidden"
                          : ""}
                      </option>
                    ),
                  )}
                </select>
              </FieldGroup>
            </div>
          </section>

          <section className="border-b border-[#60482e]/30 px-5 py-6 sm:px-7">
            <SectionHeading
              eyebrow="Appearance"
              title="Visual presentation"
              description="Update the optional icon, banner and identifying colour."
            />

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <FieldGroup
                label="Icon URL"
                htmlFor="forum-section-icon"
                description="Optional HTTP or HTTPS address for the section icon."
              >
                <input
                  id="forum-section-icon"
                  name="icon_url"
                  type="url"
                  inputMode="url"
                  placeholder="https://..."
                  defaultValue={
                    section.icon_url ??
                    ""
                  }
                  className={inputClassName}
                />
              </FieldGroup>

              <FieldGroup
                label="Banner URL"
                htmlFor="forum-section-banner"
                description="Optional background image displayed behind the section."
              >
                <input
                  id="forum-section-banner"
                  name="banner_url"
                  type="url"
                  inputMode="url"
                  placeholder="https://..."
                  defaultValue={
                    section.banner_url ??
                    ""
                  }
                  className={inputClassName}
                />
              </FieldGroup>

              <FieldGroup
                label="Section colour"
                htmlFor="forum-section-colour"
                description="Hexadecimal colour in the format #RRGGBB."
              >
                <div className="grid grid-cols-[70px_minmax(0,1fr)] gap-3">
                  <input
                    id="forum-section-colour-picker"
                    type="color"
                    defaultValue={
                      sectionColour
                    }
                    aria-label="Choose section colour"
                    className="h-12 w-full cursor-pointer border border-[#60482e]/55 bg-[#100c09] p-1"
                  />

                  <input
                    id="forum-section-colour"
                    name="colour"
                    type="text"
                    maxLength={7}
                    pattern="#[0-9A-Fa-f]{6}"
                    defaultValue={
                      sectionColour
                    }
                    className={inputClassName}
                  />
                </div>
              </FieldGroup>

              <FieldGroup
                label="Display order"
                htmlFor="forum-section-order"
                required
                description="Lower numbers appear before higher numbers."
              >
                <input
                  id="forum-section-order"
                  name="sort_order"
                  type="number"
                  required
                  min={0}
                  step={1}
                  defaultValue={
                    section.sort_order
                  }
                  className={inputClassName}
                />
              </FieldGroup>
            </div>
          </section>

          <section className="px-5 py-6 sm:px-7">
            <SectionHeading
              eyebrow="Publication"
              title="Section status"
              description="Choose whether this section should appear on the forum."
            />

            <label
              htmlFor="forum-section-active"
              className="mt-6 flex cursor-pointer items-start gap-4 border border-[#60482e]/40 bg-[#100c09] px-4 py-4"
            >
              <input
                id="forum-section-active"
                name="is_active"
                type="checkbox"
                defaultChecked={
                  section.is_active
                }
                className="mt-1 h-4 w-4 accent-amber-700"
              />

              <span>
                <span className="block font-serif text-lg text-[#d2b991]">
                  Active section
                </span>

                <span className="mt-1 block text-sm leading-6 text-[#817567]">
                  Display this section
                  according to its
                  visibility rules.
                </span>
              </span>
            </label>
          </section>

          <footer className="flex flex-col-reverse gap-3 border-t border-[#60482e]/35 bg-[#110d0a] px-5 py-5 sm:flex-row sm:items-center sm:justify-end sm:px-7">
            <Link
              href="/forum/manage/sections"
              className="border border-[#60482e]/55 bg-[#15100d] px-5 py-3 text-center text-[8px] uppercase tracking-[0.17em] text-[#927b5b] transition hover:border-[#876640] hover:text-[#d8b986]"
            >
              Back
            </Link>

            <button
              type="submit"
              className="border border-amber-800/70 bg-amber-950/25 px-5 py-3 text-[8px] uppercase tracking-[0.17em] text-amber-300 transition hover:border-amber-600 hover:bg-amber-950/45"
            >
              Save changes
            </button>
          </footer>
        </form>

        <section className="mt-7 border border-[#60482e]/45 bg-[#15100d]">
          <div className="border-b border-[#60482e]/30 px-5 py-6 sm:px-7">
            <SectionHeading
              eyebrow="Publication controls"
              title={
                section.is_active
                  ? "Hide section"
                  : "Activate section"
              }
              description={
                section.is_active
                  ? "Temporarily remove this section from the forum without deleting its content."
                  : "Restore this section to the forum according to its visibility rules."
              }
            />
          </div>

          <form
            action={
              toggleForumSectionStatusAction
            }
            className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7"
          >
            <input
              type="hidden"
              name="section_id"
              value={section.id}
            />

            <p className="max-w-2xl text-sm leading-6 text-[#817567]">
              {section.is_active
                ? "Existing topics and posts will remain stored. Members will no longer see this section."
                : "The section will immediately become available again to authorised users."}
            </p>

            <button
              type="submit"
              className={
                section.is_active
                  ? "shrink-0 border border-orange-900/70 bg-orange-950/20 px-5 py-3 text-[8px] uppercase tracking-[0.17em] text-orange-300 transition hover:border-orange-700 hover:bg-orange-950/35"
                  : "shrink-0 border border-emerald-900/70 bg-emerald-950/20 px-5 py-3 text-[8px] uppercase tracking-[0.17em] text-emerald-300 transition hover:border-emerald-700 hover:bg-emerald-950/35"
              }
            >
              {section.is_active
                ? "Hide section"
                : "Activate section"}
            </button>
          </form>
        </section>

        <section className="mt-7 border border-red-950/60 bg-red-950/10">
          <div className="border-b border-red-950/50 px-5 py-6 sm:px-7">
            <p className="text-[8px] uppercase tracking-[0.2em] text-red-500">
              Danger zone
            </p>

            <h2 className="mt-2 font-serif text-2xl text-red-200/90">
              Permanently delete section
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-red-200/55">
              This action cannot be
              undone. A section can only
              be deleted when it contains
              no topics and has no child
              sections.
            </p>
          </div>

          <form
            action={
              deleteForumSectionAction
            }
            className="px-5 py-6 sm:px-7"
          >
            <input
              type="hidden"
              name="section_id"
              value={section.id}
            />

            {!canDelete ? (
              <div className="border border-red-950/60 bg-black/15 px-4 py-4">
                <p className="text-sm leading-6 text-red-200/70">
                  This section cannot
                  currently be deleted.
                </p>

                <ul className="mt-3 space-y-2 text-xs leading-5 text-red-200/50">
                  {topics.length > 0 ? (
                    <li>
                      It contains{" "}
                      {topics.length}{" "}
                      {topics.length === 1
                        ? "topic"
                        : "topics"}
                      , including deleted
                      topics.
                    </li>
                  ) : null}

                  {numberOfChildSections >
                  0 ? (
                    <li>
                      It is the parent of{" "}
                      {
                        numberOfChildSections
                      }{" "}
                      {numberOfChildSections ===
                      1
                        ? "section"
                        : "sections"}
                      .
                    </li>
                  ) : null}
                </ul>
              </div>
            ) : (
              <>
                <FieldGroup
                  label='Type "DELETE" to confirm'
                  htmlFor="forum-section-delete-confirmation"
                  required
                  description="The confirmation must be written exactly in uppercase."
                >
                  <input
                    id="forum-section-delete-confirmation"
                    name="confirmation"
                    type="text"
                    required
                    autoComplete="off"
                    pattern="DELETE"
                    placeholder="DELETE"
                    className="w-full border border-red-950/70 bg-[#100909] px-4 py-3 text-sm text-red-100 outline-none transition placeholder:text-red-950 focus:border-red-700"
                  />
                </FieldGroup>

                <div className="mt-5 flex justify-end">
                  <button
                    type="submit"
                    className="border border-red-900/70 bg-red-950/30 px-5 py-3 text-[8px] uppercase tracking-[0.17em] text-red-300 transition hover:border-red-700 hover:bg-red-950/50"
                  >
                    Permanently delete
                  </button>
                </div>
              </>
            )}
          </form>
        </section>
      </main>

      <Script
        id="forum-section-edit-form-behaviour"
        strategy="afterInteractive"
      >
        {`
          (() => {
            const colourInput = document.getElementById(
              "forum-section-colour"
            );

            const colourPicker = document.getElementById(
              "forum-section-colour-picker"
            );

            if (
              colourInput instanceof HTMLInputElement &&
              colourPicker instanceof HTMLInputElement
            ) {
              colourPicker.addEventListener(
                "input",
                () => {
                  colourInput.value =
                    colourPicker.value;
                }
              );

              colourInput.addEventListener(
                "input",
                () => {
                  if (
                    /^#[0-9a-f]{6}$/i.test(
                      colourInput.value
                    )
                  ) {
                    colourPicker.value =
                      colourInput.value;
                  }
                }
              );
            }
          })();
        `}
      </Script>
    </>
  );
}

const inputClassName =
  "w-full border border-[#60482e]/55 bg-[#100c09] px-4 py-3 text-sm text-[#d5c2a4] outline-none transition placeholder:text-[#5f5447] focus:border-[#a47a44] focus:ring-1 focus:ring-[#a47a44]/40";

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <p className="text-[8px] uppercase tracking-[0.2em] text-[#806a4d]">
        {eyebrow}
      </p>

      <h2 className="mt-2 font-serif text-2xl text-[#d8c09a]">
        {title}
      </h2>

      <p className="mt-2 max-w-3xl text-sm leading-6 text-[#817567]">
        {description}
      </p>
    </div>
  );
}

function FieldGroup({
  label,
  htmlFor,
  description,
  required = false,
  children,
}: {
  label: string;
  htmlFor: string;
  description?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="block text-[8px] uppercase tracking-[0.17em] text-[#a48c6c]"
      >
        {label}

        {required ? (
          <span
            aria-hidden="true"
            className="ml-1 text-amber-500"
          >
            *
          </span>
        ) : null}
      </label>

      {description ? (
        <p className="mt-2 min-h-10 text-xs leading-5 text-[#6f6457]">
          {description}
        </p>
      ) : null}

      <div className="mt-2">
        {children}
      </div>
    </div>
  );
}

function Statistic({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="px-4 py-4 text-center sm:px-5">
      <dt className="text-[7px] uppercase tracking-[0.17em] text-[#665946]">
        {label}
      </dt>

      <dd className="mt-2 font-serif text-lg text-[#bda17b]">
        {value}
      </dd>
    </div>
  );
}

function StatusBadge({
  active,
}: {
  active: boolean;
}) {
  return (
    <span
      className={
        active
          ? "border border-emerald-900/60 bg-emerald-950/20 px-2 py-1 text-[7px] uppercase tracking-[0.14em] text-emerald-400"
          : "border border-red-950/60 bg-red-950/20 px-2 py-1 text-[7px] uppercase tracking-[0.14em] text-red-400"
      }
    >
      {active
        ? "Active"
        : "Hidden"}
    </span>
  );
}