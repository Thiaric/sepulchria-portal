import { AdminActionForm } from "@/components/admin/admin-action-form";
import {
  requireAdminSection,
} from "@/lib/auth/require-staff";
import { createClient } from "@/lib/supabase/server";
import {
  createTidingAction,
  deleteTidingAction,
  editTidingAction,
  toggleTidingAction,
} from "./actions";

export default async function TidingsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{
    created?: string;
  }>;
}) {
  await requireAdminSection(
    "tidings",
  );

  const supabase =
    await createClient();

  const {
    created,
  } = await searchParams;

  const {
    data: entries,
  } = await supabase
    .from("tidings")
    .select(
      "id, title, message, priority, is_active, starts_at, expires_at, created_at",
    )
    .order(
      "created_at",
      {
        ascending: false,
      },
    )
    .limit(50);

  return (
    <main className="p-5 sm:p-7 lg:p-9 admin_tidings_page_main_main">
      <div className="mx-auto max-w-6xl admin_tidings_page_div_tidings">
        <p className="text-[9px] uppercase tracking-[0.28em] text-[rgb(var(--sep-colour-8b704e))] admin_tidings_page_p_tidings">
          City notices
        </p>

        <h2 className="mt-2 font-serif text-3xl text-[rgb(var(--sep-colour-e2cda4))] admin_tidings_page_h2_tidings">
          Tidings
        </h2>

        <p className="mt-3 max-w-3xl text-sm leading-7 text-[rgb(var(--sep-colour-9f927f))] admin_tidings_page_p_tidings_2">
          Publish brief news,
          notices and urgent
          announcements to the
          persistent portal ticker.
          Active changes are pushed
          live to connected players.
        </p>

        {created ? (
          <p className="mt-5 border border-[rgb(var(--sep-colour-42624a))] bg-[rgb(var(--sep-colour-122019))] px-4 py-3 text-sm text-[rgb(var(--sep-colour-9fd0a9))] admin_tidings_page_p_tidings_3">
            Tidings published.
          </p>
        ) : null}

        {/* =========================================================
            CREATE TIDING
           ========================================================= */}
        <section className="mt-7 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] admin_tidings_page_section_tidings">
          <div className="border-b border-[rgb(var(--sep-colour-60482e))]/35 px-5 py-4 sm:px-6 admin_tidings_page_div_publish_tidings">
            <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-806a4d))] admin_tidings_page_p_publish_tidings">
              New notice
            </p>

            <h3 className="mt-2 font-serif text-2xl text-[rgb(var(--sep-colour-dec69d))] admin_tidings_page_h3_publish_tidings">
              Publish Tidings
            </h3>
          </div>

          <AdminActionForm
            action={
              createTidingAction
            }
            className="grid gap-5 p-5 sm:p-6 lg:grid-cols-2"
          >
            <label className="block text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-9f8765))] admin_tidings_page_label_tidings">
              Title

              <input
                name="title"
                required
                maxLength={80}
                placeholder="The Western Gate Reopens"
                className="mt-2 w-full border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-0d0907))] px-4 py-3 text-sm normal-case tracking-normal text-[rgb(var(--sep-colour-d8c4a4))] outline-none focus:border-[rgb(var(--sep-colour-aa7f47))] admin_tidings_page_input_title"
              />
            </label>

            <label className="block text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-9f8765))] admin_tidings_page_label_tidings_2">
              Priority

              <select
                name="priority"
                defaultValue="normal"
                className="mt-2 w-full border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-0d0907))] px-4 py-3 text-sm normal-case tracking-normal text-[rgb(var(--sep-colour-d8c4a4))] outline-none focus:border-[rgb(var(--sep-colour-aa7f47))] admin_tidings_page_select_priority"
              >
                <option className="admin_tidings_page_option_normal" value="normal">
                  Normal
                </option>

                <option className="admin_tidings_page_option_important" value="important">
                  Important
                </option>

                <option className="admin_tidings_page_option_urgent" value="urgent">
                  Urgent
                </option>
              </select>
            </label>

            <label className="block text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-9f8765))] lg:col-span-2 admin_tidings_page_label_tidings_3">
              Message

              <textarea
                name="message"
                required
                maxLength={300}
                rows={3}
                placeholder="The gate is open once more. Travellers may enter through the western road."
                className="mt-2 w-full resize-y border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-0d0907))] px-4 py-3 text-sm normal-case leading-6 tracking-normal text-[rgb(var(--sep-colour-d8c4a4))] outline-none focus:border-[rgb(var(--sep-colour-aa7f47))] admin_tidings_page_textarea_message"
              />
            </label>

            <label className="block text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-9f8765))] admin_tidings_page_label_tidings_4">
              Expire after

              <select
                name="duration"
                defaultValue="24"
                className="mt-2 w-full border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-0d0907))] px-4 py-3 text-sm normal-case tracking-normal text-[rgb(var(--sep-colour-d8c4a4))] outline-none focus:border-[rgb(var(--sep-colour-aa7f47))] admin_tidings_page_select_duration"
              >
                <option className="admin_tidings_page_option_1" value="1">
                  1 hour
                </option>

                <option className="admin_tidings_page_option_6" value="6">
                  6 hours
                </option>

                <option className="admin_tidings_page_option_12" value="12">
                  12 hours
                </option>

                <option className="admin_tidings_page_option_24" value="24">
                  24 hours
                </option>

                <option className="admin_tidings_page_option_72" value="72">
                  3 days
                </option>

                <option className="admin_tidings_page_option_168" value="168">
                  7 days
                </option>

                <option className="admin_tidings_page_option_720" value="720">
                  30 days
                </option>

                <option className="admin_tidings_page_option_never" value="never">
                  Never
                </option>
              </select>
            </label>

            <div className="flex items-end admin_tidings_page_div_tidings_2">
              <button
                type="submit"
                className="w-full border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-6 py-3 text-[9px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-efd6a8))] transition hover:border-[rgb(var(--sep-colour-b98c50))] hover:bg-[rgb(var(--sep-colour-50371f))] admin_tidings_page_button_publish_now"
              >
                Publish now
              </button>
            </div>
          </AdminActionForm>
        </section>

        {/* =========================================================
            EXISTING TIDINGS
           ========================================================= */}
        <section className="mt-7 admin_tidings_page_section_tidings_2">
          <div className="flex items-end justify-between gap-4 admin_tidings_page_div_tidings_3">
            <div className="admin_tidings_page_div_published_tidings">
              <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-806a4d))] admin_tidings_page_p_published_tidings">
                Recent notices
              </p>

              <h3 className="mt-2 font-serif text-2xl text-[rgb(var(--sep-colour-dec69d))] admin_tidings_page_h3_published_tidings">
                Published Tidings
              </h3>
            </div>

            <span className="text-[9px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-746653))] admin_tidings_page_span_tidings">
              {entries?.length ?? 0}{" "}
              shown
            </span>
          </div>

          <div className="mt-4 space-y-3 admin_tidings_page_div_tidings_4">
            {(entries ?? []).length ===
            0 ? (
              <div className="border border-[rgb(var(--sep-colour-60482e))]/40 bg-[rgb(var(--sep-colour-15100d))] p-6 text-sm text-[rgb(var(--sep-colour-837665))] admin_tidings_page_div_container">
                No Tidings have been
                published yet.
              </div>
            ) : (
              (entries ?? []).map(
                (entry) => {
                  const expired =
                    entry.expires_at !==
                      null &&
                    Date.parse(
                      entry.expires_at,
                    ) <= Date.now();

                  return (
                    <article
  key={entry.id}
  data-tidings-static-card="true"
  className="border border-[rgb(var(--sep-colour-60482e))]/40 bg-[rgb(var(--sep-colour-15100d))] p-5 admin_tidings_page_article_article"
>
                      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between admin_tidings_page_div_container_2">
                        {/* =========================
                            TIDING CONTENT
                           ========================= */}
                        <div className="min-w-0 flex-1 admin_tidings_page_div_container_3">
                          <div className="flex flex-wrap items-center gap-2 admin_tidings_page_div_container_4">
                            <span
                              className={[((`border px-2 py-1 text-[8px] uppercase tracking-[0.14em] ${
                                entry.priority ===
                                "urgent"
                                  ? "border-[rgb(var(--sep-colour-915344))] bg-[rgb(var(--sep-colour-2b130e))] text-[rgb(var(--sep-colour-e4a58d))]"
                                  : entry.priority ===
                                      "important"
                                    ? "border-[rgb(var(--sep-colour-80613b))] bg-[rgb(var(--sep-colour-21170f))] text-[rgb(var(--sep-colour-d9b97f))]"
                                    : "border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-18110d))] text-[rgb(var(--sep-colour-9f8d73))]"
                              }`)), "admin_tidings_page_span_text"].filter(Boolean).join(" ")}
                            >
                              {
                                entry.priority
                              }
                            </span>

                            <span
                              className={[((`border px-2 py-1 text-[8px] uppercase tracking-[0.14em] ${
                                !entry.is_active ||
                                expired
                                  ? "border-[rgb(var(--sep-colour-4b4540))] bg-[rgb(var(--sep-colour-12100e))] text-[rgb(var(--sep-colour-77706a))]"
                                  : "border-[rgb(var(--sep-colour-42624a))] bg-[rgb(var(--sep-colour-122019))] text-[rgb(var(--sep-colour-9fd0a9))]"
                              }`)), "admin_tidings_page_span_text_2"].filter(Boolean).join(" ")}
                            >
                              {expired
                                ? "Expired"
                                : entry.is_active
                                  ? "Active"
                                  : "Hidden"}
                            </span>
                          </div>

                          <h4 className="mt-3 font-serif text-xl text-[rgb(var(--sep-skin-c1))] admin_tidings_page_h4_heading">
  {entry.title}
</h4>

                          <p className="mt-2 text-sm leading-6 text-[rgb(var(--sep-colour-a99b89))] admin_tidings_page_p_text">
                            {
                              entry.message
                            }
                          </p>

                          <p className="mt-3 text-[9px]  text-[rgb(var(--sep-skin-c1))] admin_tidings_page_p_text_2">
                            Published{" "}
                            {new Date(
                              entry.created_at,
                            ).toLocaleString(
                              "en-GB",
                            )}

                            {entry.expires_at
                              ? ` · Expires ${new Date(
                                  entry.expires_at,
                                ).toLocaleString(
                                  "en-GB",
                                )}`
                              : " · No expiry"}
                          </p>
                        </div>

                        {/* =========================
    ACTIONS + INLINE EDITOR
   ========================= */}
<div className="w-full shrink-0 md:w-[430px] admin_tidings_page_div_container_5">
  <div className="flex flex-wrap justify-end gap-2 admin_tidings_page_div_container_6">

    {/* EDIT */}
    <details className="group w-auto open:w-full admin_tidings_page_details_edit">
      <summary className="tiding-edit-summary admin_tidings_page_summary_edit">
  Edit
</summary>

      <div className="mt-3 w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] p-4 admin_tidings_page_div_edit">
        <AdminActionForm
          action={editTidingAction}
          className="grid gap-3"
        >
          <input className="admin_tidings_page_input_id"
            type="hidden"
            name="id"
            value={entry.id}
          />

          <label className="grid gap-1 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-9f8765))] admin_tidings_page_label_edit">
            Title

            <input
              name="title"
              required
              maxLength={80}
              defaultValue={entry.title}
              className="border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-0d0907))] px-3 py-2 text-sm normal-case tracking-normal text-[rgb(var(--sep-colour-d8c4a4))] outline-none focus:border-[rgb(var(--sep-skin-c1))] admin_tidings_page_input_title_2"
            />
          </label>

          <label className="grid gap-1 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-9f8765))] admin_tidings_page_label_edit_2">
            Priority

            <select
              name="priority"
              defaultValue={entry.priority}
              className="border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-0d0907))] px-3 py-2 text-sm normal-case tracking-normal text-[rgb(var(--sep-colour-d8c4a4))] outline-none focus:border-[rgb(var(--sep-skin-c1))] admin_tidings_page_select_priority_2"
            >
              <option className="admin_tidings_page_option_normal_2" value="normal">
                Normal
              </option>

              <option className="admin_tidings_page_option_important_2" value="important">
                Important
              </option>

              <option className="admin_tidings_page_option_urgent_2" value="urgent">
                Urgent
              </option>
            </select>
          </label>

          <label className="grid gap-1 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-9f8765))] admin_tidings_page_label_edit_3">
            Message

            <textarea
              name="message"
              required
              maxLength={300}
              rows={4}
              defaultValue={entry.message}
              className="resize-y border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-0d0907))] px-3 py-2 text-sm normal-case leading-6 tracking-normal text-[rgb(var(--sep-colour-d8c4a4))] outline-none focus:border-[rgb(var(--sep-skin-c1))] admin_tidings_page_textarea_message_2"
            />
          </label>

          <label className="grid gap-1 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-9f8765))] admin_tidings_page_label_edit_4">
            Expiry

            <select
              name="duration"
              defaultValue="keep"
              className="border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-0d0907))] px-3 py-2 text-sm normal-case tracking-normal text-[rgb(var(--sep-colour-d8c4a4))] outline-none focus:border-[rgb(var(--sep-skin-c1))] admin_tidings_page_select_duration_2"
            >
              <option className="admin_tidings_page_option_keep" value="keep">
                Keep current expiry
              </option>

              <option className="admin_tidings_page_option_1_2" value="1">
                1 hour from now
              </option>

              <option className="admin_tidings_page_option_6_2" value="6">
                6 hours from now
              </option>

              <option className="admin_tidings_page_option_12_2" value="12">
                12 hours from now
              </option>

              <option className="admin_tidings_page_option_24_2" value="24">
                24 hours from now
              </option>

              <option className="admin_tidings_page_option_72_2" value="72">
                3 days from now
              </option>

              <option className="admin_tidings_page_option_168_2" value="168">
                7 days from now
              </option>

              <option className="admin_tidings_page_option_720_2" value="720">
                30 days from now
              </option>

              <option className="admin_tidings_page_option_never_2" value="never">
                Never
              </option>
            </select>
          </label>

          <button
            type="submit"
            data-skin-role="primary-control"
            className="mt-1 border px-4 py-2 text-[8px] uppercase tracking-[0.16em] transition hover:brightness-125 admin_tidings_page_button_save_changes"
            style={{
              borderColor:
                "rgb(var(--sep-skin-c1) / 0.65)",
              backgroundColor:
                "rgb(var(--sep-colour-18110d))",
              color:
                "rgb(var(--sep-skin-c2))",
            }}
          >
            Save changes
          </button>
        </AdminActionForm>
      </div>
    </details>

    {/* HIDE / SHOW */}
    {!expired ? (
      <AdminActionForm
        action={toggleTidingAction}
      >
        <input className="admin_tidings_page_input_id_2"
          type="hidden"
          name="id"
          value={entry.id}
        />

        <input className="admin_tidings_page_input_next_active"
          type="hidden"
          name="nextActive"
          value={
            entry.is_active
              ? "false"
              : "true"
          }
        />

        <button
          type="submit"
          className="border border-[rgb(var(--sep-colour-685036))] bg-[rgb(var(--sep-colour-18110d))] px-3 py-2 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-bea27b))] transition hover:border-[rgb(var(--sep-colour-987344))] admin_tidings_page_button_action"
        >
          {entry.is_active
            ? "Hide"
            : "Show"}
        </button>
      </AdminActionForm>
    ) : null}

    {/* DELETE */}
    <AdminActionForm
      action={deleteTidingAction}
    >
      <input className="admin_tidings_page_input_id_3"
        type="hidden"
        name="id"
        value={entry.id}
      />

      <button
  type="submit"
  data-sep-danger="true"
  className="red-danger border px-3 py-2 text-[8px] uppercase tracking-[0.14em] transition admin_tidings_page_button_delete"
>
  Delete
</button>
    </AdminActionForm>
  </div>
</div>
                      </div>
                    </article>
                  );
                },
              )
            )}
          </div>
        </section>
      </div>
    </main>
  );
}