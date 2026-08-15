import Link from "next/link";
import Script from "next/script";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { ForumOrderSectionFields } from "@/components/admin/forum-order-section-fields";

import {
  createForumSectionAction,
} from "../actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type AssociationRecord = {
  id: string;
  name: string;
};

type OrderRecord = {
  id: string;
  name: string;
  association_id: string;
};

type ForumSectionRecord = {
  id: string;
  name: string;
  section_type:
    | "ongame"
    | "offgame"
    | "organisation";
  is_active: boolean;
};

type PageSearchParams = Promise<{
  error?: string | string[];
}>;

export default async function NewForumSectionPage({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      `/login?redirect=${encodeURIComponent(
        "/admin/forum/sections/new",
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
      data: associationRecords,
      error: associationsError,
    },
    {
      data: sectionRecords,
      error: sectionsError,
    },
  ] = await Promise.all([
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
      .from("forum_sections")
      .select(
        `
          id,
          name,
          section_type,
          is_active
        `,
      )
      .order("sort_order", {
        ascending: true,
      })
      .order("name", {
        ascending: true,
      }),
  ]);

  const {
    data: orderRecords,
    error: ordersError,
  } = await supabase
    .from("orders")
    .select("id, name, association_id")
    .eq("is_active", true)
    .order("name", {
      ascending: true,
    });

  if (ordersError) {
    throw new Error(
      `Unable to load Orders: ${ordersError.message}`,
    );
  }

  if (associationsError) {
    throw new Error(
      `Unable to load organisations: ${associationsError.message}`,
    );
  }

  if (sectionsError) {
    throw new Error(
      `Unable to load forum sections: ${sectionsError.message}`,
    );
  }

  const associations =
    (associationRecords ??
      []) as AssociationRecord[];

  const sections =
    (sectionRecords ??
      []) as ForumSectionRecord[];

  const orders =
    (orderRecords ?? []) as OrderRecord[];

  const associationNameById = new Map(
    associations.map((association) => [
      association.id,
      association.name,
    ]),
  );

  const orderOptions = orders.map((order) => ({
    id: order.id,
    name: order.name,
    associationName:
      associationNameById.get(
        order.association_id,
      ) ?? "Unassigned Association",
  }));

  const resolvedSearchParams =
    await searchParams;

  const errorValue =
    resolvedSearchParams.error;

  const errorMessage =
    Array.isArray(errorValue)
      ? errorValue[0]
      : errorValue;

  return (
    <>
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <nav
          aria-label="Forum breadcrumb"
          className="mb-6 flex flex-wrap items-center gap-2 text-[9px] uppercase tracking-[0.16em] text-[#746653]"
        >
          <Link
          href="/admin"
          className="transition hover:text-[#c7a16d]"
        >
          Administration
        </Link>

          <span aria-hidden="true">
            /
          </span>

          <Link
            href="/admin/forum"
            className="transition hover:text-[#c7a16d]"
          >
          Forum
        </Link>

          <span aria-hidden="true">
            /
          </span>

          <Link
            href="/admin/forum/sections"
            className="transition hover:text-[#c7a16d]"
          >
            Sections
          </Link>

          <span aria-hidden="true">
            /
          </span>

          <span className="text-[#a48c6c]">
            Create section
          </span>
        </nav>

        <header className="overflow-hidden border border-[#60482e]/45 bg-[#15100d]">
          <div className="border-b border-[#60482e]/35 bg-[#1a130e] px-5 py-7 sm:px-7">
            <p className="text-[8px] uppercase tracking-[0.22em] text-amber-500">
              Forum structure
            </p>

            <h1 className="mt-3 font-serif text-3xl text-[#dec69d] sm:text-4xl">
              Create Forum Section
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-[#817567]">
              Add a new public, private or
              organisation section to the
              Sepulchria forum.
            </p>
          </div>
        </header>

        {errorMessage ? (
          <div
            role="alert"
            className="mt-6 border border-red-900/60 bg-red-950/20 px-5 py-4"
          >
            <p className="text-[8px] uppercase tracking-[0.18em] text-red-400">
              Section not created
            </p>

            <p className="mt-2 text-sm leading-6 text-red-200/80">
              {errorMessage}
            </p>
          </div>
        ) : null}

        <form
          action={
            createForumSectionAction
          }
          className="mt-6 border border-[#60482e]/45 bg-[#15100d]"
        >
          <section className="border-b border-[#60482e]/30 px-5 py-6 sm:px-7">
            <SectionHeading
              eyebrow="Identity"
              title="Section details"
              description="Choose the name, address and description displayed to forum members."
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
                  placeholder="Example: City Chronicles"
                  className={inputClassName}
                />
              </FieldGroup>

              <FieldGroup
                label="Slug"
                htmlFor="forum-section-slug"
                description="Used in the section URL. It is generated automatically until edited manually."
              >
                <input
                  id="forum-section-slug"
                  name="slug"
                  type="text"
                  maxLength={140}
                  autoComplete="off"
                  placeholder="city-chronicles"
                  pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
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
                  placeholder="Describe what members should use this section for..."
                  className={`${inputClassName} min-h-32 resize-y`}
                />
              </FieldGroup>
            </div>
          </section>

          <section className="border-b border-[#60482e]/30 px-5 py-6 sm:px-7">
            <SectionHeading
              eyebrow="Classification"
              title="Type and access"
              description="Define where the section belongs and who may access it."
            />

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <FieldGroup
                label="Section type"
                htmlFor="forum-section-type"
                required
                description="Determines the category in which the section appears."
              >
                <select
                  id="forum-section-type"
                  name="section_type"
                  required
                  defaultValue="ongame"
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
                  defaultValue="public"
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

              <ForumOrderSectionFields
                orders={orderOptions}
                inputClassName={inputClassName}
              />

              <FieldGroup
                label="Parent section"
                htmlFor="forum-section-parent"
                description="Optionally place this section beneath another section."
              >
                <select
                  id="forum-section-parent"
                  name="parent_id"
                  defaultValue=""
                  className={inputClassName}
                >
                  <option value="">
                    No parent section
                  </option>

                  {sections.map(
                    (section) => (
                      <option
                        key={section.id}
                        value={section.id}
                      >
                        {section.name}
                        {!section.is_active
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
              description="Add optional imagery and a colour used to distinguish the section."
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
                  className={inputClassName}
                />
              </FieldGroup>

              <FieldGroup
                label="Section colour"
                htmlFor="forum-section-colour"
                description="Optional hexadecimal colour in the format #RRGGBB."
              >
                <div className="grid grid-cols-[70px_minmax(0,1fr)] gap-3">
                  <input
                    id="forum-section-colour-picker"
                    type="color"
                    defaultValue="#8c704b"
                    aria-label="Choose section colour"
                    className="h-12 w-full cursor-pointer border border-[#60482e]/55 bg-[#100c09] p-1"
                  />

                  <input
                    id="forum-section-colour"
                    name="colour"
                    type="text"
                    defaultValue="#8c704b"
                    maxLength={7}
                    pattern="#[0-9A-Fa-f]{6}"
                    placeholder="#8c704b"
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
                  defaultValue={0}
                  className={inputClassName}
                />
              </FieldGroup>
            </div>
          </section>

          <section className="px-5 py-6 sm:px-7">
            <SectionHeading
              eyebrow="Publication"
              title="Section status"
              description="Choose whether the new section should immediately appear on the forum."
            />

            <label
              htmlFor="forum-section-active"
              className="mt-6 flex cursor-pointer items-start gap-4 border border-[#60482e]/40 bg-[#100c09] px-4 py-4"
            >
              <input
                id="forum-section-active"
                name="is_active"
                type="checkbox"
                defaultChecked
                className="mt-1 h-4 w-4 accent-amber-700"
              />

              <span>
                <span className="block font-serif text-lg text-[#d2b991]">
                  Active section
                </span>

                <span className="mt-1 block text-sm leading-6 text-[#817567]">
                  Display this section on
                  the forum according to
                  its visibility rules.
                </span>
              </span>
            </label>
          </section>

          <footer className="flex flex-col-reverse gap-3 border-t border-[#60482e]/35 bg-[#110d0a] px-5 py-5 sm:flex-row sm:items-center sm:justify-end sm:px-7">
            <Link
              href="/admin/forum/sections"
              className="border border-[#60482e]/55 bg-[#15100d] px-5 py-3 text-center text-[8px] uppercase tracking-[0.17em] text-[#927b5b] transition hover:border-[#876640] hover:text-[#d8b986]"
            >
              Cancel
            </Link>

            <button
              type="submit"
              className="border border-amber-800/70 bg-amber-950/25 px-5 py-3 text-[8px] uppercase tracking-[0.17em] text-amber-300 transition hover:border-amber-600 hover:bg-amber-950/45"
            >
              Create section
            </button>
          </footer>
        </form>
      </main>

      <Script
        id="forum-section-form-behaviour"
        strategy="afterInteractive"
      >
        {`
          (() => {
            const nameInput = document.getElementById(
              "forum-section-name"
            );

            const slugInput = document.getElementById(
              "forum-section-slug"
            );

            const colourInput = document.getElementById(
              "forum-section-colour"
            );

            const colourPicker = document.getElementById(
              "forum-section-colour-picker"
            );

            if (
              !(nameInput instanceof HTMLInputElement) ||
              !(slugInput instanceof HTMLInputElement)
            ) {
              return;
            }

            let slugWasEditedManually = false;

            const makeSlug = (value) => {
              return value
                .normalize("NFD")
                .replace(/[\\u0300-\\u036f]/g, "")
                .toLowerCase()
                .trim()
                .replace(/['â€™]/g, "")
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-+|-+$/g, "")
                .replace(/-{2,}/g, "-");
            };

            slugInput.addEventListener(
              "input",
              () => {
                slugWasEditedManually = true;

                const cursorPosition =
                  slugInput.selectionStart;

                slugInput.value = makeSlug(
                  slugInput.value
                );

                if (
                  cursorPosition !== null
                ) {
                  slugInput.setSelectionRange(
                    Math.min(
                      cursorPosition,
                      slugInput.value.length
                    ),
                    Math.min(
                      cursorPosition,
                      slugInput.value.length
                    )
                  );
                }
              }
            );

            nameInput.addEventListener(
              "input",
              () => {
                if (
                  slugWasEditedManually
                ) {
                  return;
                }

                slugInput.value = makeSlug(
                  nameInput.value
                );
              }
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

