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
import { ForumOrderSectionFields } from "@/components/admin/forum-order-section-fields";
import { ForumStaffRoleAccessFields } from "@/components/admin/forum-staff-role-access-fields";

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
  order_id: string | null;
  parent_id: string | null;
  visibility:
    | "public"
    | "members"
    | "staff";
  staff_read_roles: string[] | null;
  staff_write_roles: string[] | null;
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

type OrderRecord = {
  id: string;
  name: string;
  association_id: string;
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
        `/admin/forum/sections/${sectionId}`,
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
          order_id,
          parent_id,
          visibility,
          staff_read_roles,
          staff_write_roles,
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
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8 admin_forum_sections_sectionid_page_main_main">
        <nav
          aria-label="Forum breadcrumb"
          className="mb-6 flex flex-wrap items-center gap-2 text-[9px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-746653))] admin_forum_sections_sectionid_page_nav_forum_breadcrumb"
        >
          <Link
          href="/admin"
          className="transition hover:text-[rgb(var(--sep-colour-c7a16d))]"
        >
          Administration
        </Link>

          <span className="admin_forum_sections_sectionid_page_span_forum_breadcrumb" aria-hidden="true">
            /
          </span>

          <Link
            href="/admin/forum"
            className="transition hover:text-[rgb(var(--sep-colour-c7a16d))]"
          >
          Forum
        </Link>

          <span className="admin_forum_sections_sectionid_page_span_forum_breadcrumb_2" aria-hidden="true">
            /
          </span>

          <Link
            href="/admin/forum/sections"
            className="transition hover:text-[rgb(var(--sep-colour-c7a16d))]"
          >
            Sections
          </Link>

          <span className="admin_forum_sections_sectionid_page_span_forum_breadcrumb_3" aria-hidden="true">
            /
          </span>

          <span className="text-[rgb(var(--sep-colour-a48c6c))] admin_forum_sections_sectionid_page_span_forum_breadcrumb_4">
            {section.name}
          </span>
        </nav>

        <header className="overflow-hidden border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] admin_forum_sections_sectionid_page_header_header">
          <div className="flex flex-col gap-5 border-b border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-1a130e))] px-5 py-7 sm:px-7 lg:flex-row lg:items-start lg:justify-between admin_forum_sections_sectionid_page_div_container">
            <div className="admin_forum_sections_sectionid_page_div_edit_forum_section">
              <div className="flex flex-wrap items-center gap-2 admin_forum_sections_sectionid_page_div_edit_forum_section_2">
                <p className="text-[8px] uppercase tracking-[0.22em] text-amber-500 admin_forum_sections_sectionid_page_p_edit_forum_section">
                  Forum structure
                </p>

                <StatusBadge
                  active={
                    section.is_active
                  }
                />
              </div>

              <h1 className="mt-3 font-serif text-3xl text-[rgb(var(--sep-colour-dec69d))] sm:text-4xl admin_forum_sections_sectionid_page_h1_edit_forum_section">
                Edit Forum Section
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-[rgb(var(--sep-colour-817567))] admin_forum_sections_sectionid_page_p_edit_forum_section_2">
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
                className="shrink-0 border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-15100d))] px-5 py-3 text-center text-[8px] uppercase tracking-[0.17em] text-[rgb(var(--sep-colour-a58b68))] transition hover:border-[rgb(var(--sep-colour-947047))] hover:text-[rgb(var(--sep-colour-dec095))]"
              >
                Open section
              </Link>
            ) : null}
          </div>

          <dl className="grid grid-cols-2 divide-x divide-y divide-[rgb(var(--sep-colour-60482e))]/30 bg-[rgb(var(--sep-colour-100c09))] sm:grid-cols-4 sm:divide-y-0">
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
            className="mt-6 border border-red-900/60 bg-red-950/20 px-5 py-4 admin_forum_sections_sectionid_page_div_alert"
          >
            <p className="text-[8px] uppercase tracking-[0.18em] text-red-400 admin_forum_sections_sectionid_page_p_text">
              Changes not saved
            </p>

            <p className="mt-2 text-sm leading-6 text-red-200/80 admin_forum_sections_sectionid_page_p_text_2">
              {errorMessage}
            </p>
          </div>
        ) : null}

        {successMessage ? (
          <div
            role="status"
            className="mt-6 border border-emerald-900/60 bg-emerald-950/20 px-5 py-4 admin_forum_sections_sectionid_page_div_status"
          >
            <p className="text-[8px] uppercase tracking-[0.18em] text-emerald-400 admin_forum_sections_sectionid_page_p_text_3">
              Changes saved
            </p>

            <p className="mt-2 text-sm leading-6 text-emerald-200/80 admin_forum_sections_sectionid_page_p_text_4">
              {successMessage}
            </p>
          </div>
        ) : null}

        <form
          action={
            updateForumSectionAction
          }
          className="mt-6 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] admin_forum_sections_sectionid_page_form_update_forum_section_action"
        >
          <input className="admin_forum_sections_sectionid_page_input_section_id"
            type="hidden"
            name="section_id"
            value={section.id}
          />

          <section className="border-b border-[rgb(var(--sep-colour-60482e))]/30 px-5 py-6 sm:px-7 admin_forum_sections_sectionid_page_section_section">
            <SectionHeading
              eyebrow="Identity"
              title="Section details"
              description="Update the public name, URL slug and description."
            />

            <div className="mt-6 grid gap-5 md:grid-cols-2 admin_forum_sections_sectionid_page_div_container_2">
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
                  className={[((inputClassName)), "admin_forum_sections_sectionid_page_input_name"].filter(Boolean).join(" ")}
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
                  className={[((inputClassName)), "admin_forum_sections_sectionid_page_input_slug"].filter(Boolean).join(" ")}
                />
              </FieldGroup>
            </div>

            <div className="mt-5 admin_forum_sections_sectionid_page_div_container_3">
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
                  className={[((`${inputClassName} min-h-32 resize-y`)), "admin_forum_sections_sectionid_page_textarea_description"].filter(Boolean).join(" ")}
                />
              </FieldGroup>
            </div>
          </section>

          <section className="border-b border-[rgb(var(--sep-colour-60482e))]/30 px-5 py-6 sm:px-7 admin_forum_sections_sectionid_page_section_section_2">
            <SectionHeading
              eyebrow="Classification"
              title="Type and access"
              description="Define the category, visibility and any connected Order."
            />

            <div className="mt-6 grid gap-5 md:grid-cols-2 admin_forum_sections_sectionid_page_div_container_4">
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
                  className={[((inputClassName)), "admin_forum_sections_sectionid_page_select_section_type"].filter(Boolean).join(" ")}
                >
                  <option className="admin_forum_sections_sectionid_page_option_game" value="ongame">
                    Ongame
                  </option>

                  <option className="admin_forum_sections_sectionid_page_option_offgame" value="offgame">
                    Offgame
                  </option>

                  <option className="admin_forum_sections_sectionid_page_option_organisation" value="organisation">
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
                  className={[((inputClassName)), "admin_forum_sections_sectionid_page_select_visibility"].filter(Boolean).join(" ")}
                >
                  <option className="admin_forum_sections_sectionid_page_option_public" value="public">
                    Public
                  </option>

                  <option className="admin_forum_sections_sectionid_page_option_members" value="members">
                    Organisation members
                  </option>

                  <option className="admin_forum_sections_sectionid_page_option_staff" value="staff">
                    Staff only
                  </option>
                </select>
              </FieldGroup>

              <ForumStaffRoleAccessFields
                defaultReadRoles={section.staff_read_roles}
                defaultWriteRoles={section.staff_write_roles}
              />

              <ForumOrderSectionFields
                orders={orderOptions}
                defaultOrderId={section.order_id}
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
                  defaultValue={
                    section.parent_id ??
                    ""
                  }
                  className={[((inputClassName)), "admin_forum_sections_sectionid_page_select_parent_id"].filter(Boolean).join(" ")}
                >
                  <option className="admin_forum_sections_sectionid_page_option_forum_section_parent" value="">
                    No parent section
                  </option>

                  {parentSections.map(
                    (parentSection) => (
                      <option className="admin_forum_sections_sectionid_page_option_option"
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

          <section className="border-b border-[rgb(var(--sep-colour-60482e))]/30 px-5 py-6 sm:px-7 admin_forum_sections_sectionid_page_section_section_3">
            <SectionHeading
              eyebrow="Appearance"
              title="Visual presentation"
              description="Update the optional icon, banner and identifying colour."
            />

            <div className="mt-6 grid gap-5 md:grid-cols-2 admin_forum_sections_sectionid_page_div_container_5">
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
                  className={[((inputClassName)), "admin_forum_sections_sectionid_page_input_icon_url"].filter(Boolean).join(" ")}
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
                  className={[((inputClassName)), "admin_forum_sections_sectionid_page_input_banner_url"].filter(Boolean).join(" ")}
                />
              </FieldGroup>

              <FieldGroup
                label="Section colour"
                htmlFor="forum-section-colour"
                description="Hexadecimal colour in the format #RRGGBB."
              >
                <div className="grid grid-cols-[70px_minmax(0,1fr)] gap-3 admin_forum_sections_sectionid_page_div_container_6">
                  <input
                    id="forum-section-colour-picker"
                    type="color"
                    defaultValue={
                      sectionColour
                    }
                    aria-label="Choose section colour"
                    className="h-12 w-full cursor-pointer border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] p-1 admin_forum_sections_sectionid_page_input_forum_section_colour_picker"
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
                    className={[((inputClassName)), "admin_forum_sections_sectionid_page_input_colour"].filter(Boolean).join(" ")}
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
                  className={[((inputClassName)), "admin_forum_sections_sectionid_page_input_sort_order"].filter(Boolean).join(" ")}
                />
              </FieldGroup>
            </div>
          </section>

          <section className="px-5 py-6 sm:px-7 admin_forum_sections_sectionid_page_section_section_4">
            <SectionHeading
              eyebrow="Publication"
              title="Section status"
              description="Choose whether this section should appear on the forum."
            />

            <label
              htmlFor="forum-section-active"
              className="mt-6 flex cursor-pointer items-start gap-4 border border-[rgb(var(--sep-colour-60482e))]/40 bg-[rgb(var(--sep-colour-100c09))] px-4 py-4 admin_forum_sections_sectionid_page_label_forum_section_active"
            >
              <input
                id="forum-section-active"
                name="is_active"
                type="checkbox"
                defaultChecked={
                  section.is_active
                }
                className="mt-1 h-4 w-4 accent-amber-700 admin_forum_sections_sectionid_page_input_active"
              />

              <span className="admin_forum_sections_sectionid_page_span_text">
                <span className="block font-serif text-lg text-[rgb(var(--sep-colour-d2b991))] admin_forum_sections_sectionid_page_span_text_2">
                  Active section
                </span>

                <span className="mt-1 block text-sm leading-6 text-[rgb(var(--sep-colour-817567))] admin_forum_sections_sectionid_page_span_text_3">
                  Display this section
                  according to its
                  visibility rules.
                </span>
              </span>
            </label>
          </section>

          <footer className="flex flex-col-reverse gap-3 border-t border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-110d0a))] px-5 py-5 sm:flex-row sm:items-center sm:justify-end sm:px-7 admin_forum_sections_sectionid_page_footer_footer">
            <Link
              href="/admin/forum/sections"
              className="border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-15100d))] px-5 py-3 text-center text-[8px] uppercase tracking-[0.17em] text-[rgb(var(--sep-colour-927b5b))] transition hover:border-[rgb(var(--sep-colour-876640))] hover:text-[rgb(var(--sep-colour-d8b986))]"
            >
              Back
            </Link>

            <button
              type="submit"
              className="border border-amber-800/70 bg-amber-950/25 px-5 py-3 text-[8px] uppercase tracking-[0.17em] text-amber-300 transition hover:border-amber-600 hover:bg-amber-950/45 admin_forum_sections_sectionid_page_button_save_changes"
            >
              Save changes
            </button>
          </footer>
        </form>

        <section className="mt-7 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] admin_forum_sections_sectionid_page_section_section_5">
          <div className="border-b border-[rgb(var(--sep-colour-60482e))]/30 px-5 py-6 sm:px-7 admin_forum_sections_sectionid_page_div_container_7">
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
            className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7 admin_forum_sections_sectionid_page_form_toggle_forum_section_status_action"
          >
            <input className="admin_forum_sections_sectionid_page_input_section_id_2"
              type="hidden"
              name="section_id"
              value={section.id}
            />

            <p className="max-w-2xl text-sm leading-6 text-[rgb(var(--sep-colour-817567))] admin_forum_sections_sectionid_page_p_text_5">
              {section.is_active
                ? "Existing topics and posts will remain stored. Members will no longer see this section."
                : "The section will immediately become available again to authorised users."}
            </p>

            <button
              type="submit"
              className={[((section.is_active
                  ? "shrink-0 border border-orange-900/70 bg-orange-950/20 px-5 py-3 text-[8px] uppercase tracking-[0.17em] text-orange-300 transition hover:border-orange-700 hover:bg-orange-950/35"
                  : "shrink-0 border border-emerald-900/70 bg-emerald-950/20 px-5 py-3 text-[8px] uppercase tracking-[0.17em] text-emerald-300 transition hover:border-emerald-700 hover:bg-emerald-950/35")), "admin_forum_sections_sectionid_page_button_action"].filter(Boolean).join(" ")}
            >
              {section.is_active
                ? "Hide section"
                : "Activate section"}
            </button>
          </form>
        </section>

        <section className="mt-7 border border-red-950/60 bg-red-950/10 admin_forum_sections_sectionid_page_section_section_6">
          <div className="border-b border-red-950/50 px-5 py-6 sm:px-7 admin_forum_sections_sectionid_page_div_permanently_delete_section">
            <p className="text-[8px] uppercase tracking-[0.2em] text-red-500 admin_forum_sections_sectionid_page_p_permanently_delete_section">
              Danger zone
            </p>

            <h2 className="mt-2 font-serif text-2xl text-red-200/90 admin_forum_sections_sectionid_page_h2_permanently_delete_section">
              Permanently delete section
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-red-200/55 admin_forum_sections_sectionid_page_p_permanently_delete_section_2">
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
            className="px-5 py-6 sm:px-7 admin_forum_sections_sectionid_page_form_delete_forum_section_action"
          >
            <input className="admin_forum_sections_sectionid_page_input_section_id_3"
              type="hidden"
              name="section_id"
              value={section.id}
            />

            {!canDelete ? (
              <div className="border border-red-950/60 bg-black/15 px-4 py-4 admin_forum_sections_sectionid_page_div_container_8">
                <p className="text-sm leading-6 text-red-200/70 admin_forum_sections_sectionid_page_p_text_6">
                  This section cannot
                  currently be deleted.
                </p>

                <ul className="mt-3 space-y-2 text-xs leading-5 text-red-200/50 admin_forum_sections_sectionid_page_ul_list">
                  {topics.length > 0 ? (
                    <li className="admin_forum_sections_sectionid_page_li_item">
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
                    <li className="admin_forum_sections_sectionid_page_li_item_2">
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
                    className="w-full border border-red-950/70 bg-[rgb(var(--sep-colour-100909))] px-4 py-3 text-sm text-red-100 outline-none transition placeholder:text-red-950 focus:border-red-700 admin_forum_sections_sectionid_page_input_confirmation"
                  />
                </FieldGroup>

                <div className="mt-5 flex justify-end admin_forum_sections_sectionid_page_div_container_9">
                  <button
                    type="submit"
                    className="border border-red-900/70 bg-red-950/30 px-5 py-3 text-[8px] uppercase tracking-[0.17em] text-red-300 transition hover:border-red-700 hover:bg-red-950/50 admin_forum_sections_sectionid_page_button_permanently_delete"
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
  "w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-4 py-3 text-sm text-[rgb(var(--sep-colour-d5c2a4))] outline-none transition placeholder:text-[rgb(var(--sep-colour-5f5447))] focus:border-[rgb(var(--sep-colour-a47a44))] focus:ring-1 focus:ring-[rgb(var(--sep-colour-a47a44))]/40";

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
    <div className="admin_forum_sections_sectionid_page_div_container_10">
      <p className="text-[8px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-806a4d))] admin_forum_sections_sectionid_page_p_text_7">
        {eyebrow}
      </p>

      <h2 className="mt-2 font-serif text-2xl text-[rgb(var(--sep-colour-d8c09a))] admin_forum_sections_sectionid_page_h2_heading">
        {title}
      </h2>

      <p className="mt-2 max-w-3xl text-sm leading-6 text-[rgb(var(--sep-colour-817567))] admin_forum_sections_sectionid_page_p_text_8">
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
    <div className="admin_forum_sections_sectionid_page_div_container_11">
      <label
        htmlFor={htmlFor}
        className="block text-[8px] uppercase tracking-[0.17em] text-[rgb(var(--sep-colour-a48c6c))] admin_forum_sections_sectionid_page_label_label"
      >
        {label}

        {required ? (
          <span
            aria-hidden="true"
            className="ml-1 text-amber-500 admin_forum_sections_sectionid_page_span_text_4"
          >
            *
          </span>
        ) : null}
      </label>

      {description ? (
        <p className="mt-2 min-h-10 text-xs leading-5 text-[rgb(var(--sep-colour-6f6457))] admin_forum_sections_sectionid_page_p_text_9">
          {description}
        </p>
      ) : null}

      <div className="mt-2 admin_forum_sections_sectionid_page_div_container_12">
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
    <div className="px-4 py-4 text-center sm:px-5 admin_forum_sections_sectionid_page_div_container_13">
      <dt className="text-[7px] uppercase tracking-[0.17em] text-[rgb(var(--sep-colour-665946))]">
        {label}
      </dt>

      <dd className="mt-2 font-serif text-lg text-[rgb(var(--sep-colour-bda17b))]">
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
      className={[((active
          ? "border border-emerald-900/60 bg-emerald-950/20 px-2 py-1 text-[7px] uppercase tracking-[0.14em] text-emerald-400"
          : "border border-red-950/60 bg-red-950/20 px-2 py-1 text-[7px] uppercase tracking-[0.14em] text-red-400")), "admin_forum_sections_sectionid_page_span_text_5"].filter(Boolean).join(" ")}
    >
      {active
        ? "Active"
        : "Hidden"}
    </span>
  );
}

