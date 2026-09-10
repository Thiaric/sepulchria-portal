import { AdminActionForm } from "@/components/admin/admin-action-form";
import { requireAdminSection } from "@/lib/auth/require-staff";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import { setRegistrationsOpenAction } from "../new-register/actions";
import {
  declineRegistrationApplicationAction,
  sendRegistrationInvitationAction,
} from "./actions";

type Props = {
  searchParams?: Promise<{
    inviteLink?: string;
    sent?: string;
    warning?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function RegistrationApplicationsAdminPage({
  searchParams,
}: Props) {
  await requireAdminSection("new_register");

  const params = searchParams ? await searchParams : {};
  const supabase = await createClient();
  const admin = createAdminClient();

  const [
    { data: settings, error: settingsError },
    { data: applications, error: applicationsError },
    { data: invitations, error: invitationsError },
  ] = await Promise.all([
    supabase
      .from("registration_settings")
      .select("registrations_open,updated_at")
      .eq("id", 1)
      .maybeSingle(),
    admin
      .from("registration_applications")
      .select(
        "id,name,email,heard_about,roleplay_enjoyment,rpg_experience,status,created_at,invited_at,registered_at",
      )
      .order("created_at", { ascending: false }),
    admin
      .from("registration_invitations")
      .select(
        "id,application_id,invitation_url,created_at,expires_at,used_at,sent_at",
      )
      .order("created_at", { ascending: false }),
  ]);

  if (settingsError) throw new Error(settingsError.message);
  if (applicationsError) throw new Error(applicationsError.message);
  if (invitationsError) throw new Error(invitationsError.message);

  const registrationsOpen =
    settings?.registrations_open === true;

  const allApplications = applications ?? [];
  const totalCount = allApplications.length;
  const invitedCount = allApplications.filter(
    (application) =>
      application.status === "invited" ||
      application.status === "registered",
  ).length;
  const declinedCount = allApplications.filter(
    (application) =>
      application.status === "declined",
  ).length;

  const invitationsByApplication = new Map<
    string,
    NonNullable<typeof invitations>
  >();

  for (const invitation of invitations ?? []) {
    const existing =
      invitationsByApplication.get(
        invitation.application_id,
      ) ?? [];

    existing.push(invitation);

    invitationsByApplication.set(
      invitation.application_id,
      existing,
    );
  }

  return (
    <main className="p-5 sm:p-7 lg:p-9 admin_registrations_page_main_main">
      <div className="mx-auto max-w-5xl admin_registrations_page_div_registrations">
        <p className="text-[9px] uppercase tracking-[0.28em] text-[rgb(var(--sep-colour-8b704e))] admin_registrations_page_p_registrations">
          Public access
        </p>

        <h2 className="mt-2 font-serif text-3xl text-[rgb(var(--sep-colour-e2cda4))] admin_registrations_page_h2_registrations">
          Registrations
        </h2>

        <p className="mt-3 max-w-3xl text-sm leading-7 text-[rgb(var(--sep-colour-9f927f))] admin_registrations_page_p_registrations_2">
          Control public registration and review applications for the
          closed Alpha. Invitations can register while the City Gates
          remain closed.
        </p>

        <section className="mt-7 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-5 sm:p-6 admin_registrations_page_section_registrations">
          <div className="flex flex-wrap items-center justify-between gap-4 admin_registrations_page_div_registrations_2">
            <div className="admin_registrations_page_div_registrations_3">
              <p className="text-[8px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-806a4d))] admin_registrations_page_p_registrations_3">
                City Gates
              </p>
              <p className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-dec69d))] admin_registrations_page_p_registrations_4">
                Public registrations
              </p>
            </div>

            <span
              className={[((registrationsOpen
                  ? "border border-emerald-700/60 bg-emerald-950/20 px-3 py-2 text-[9px] uppercase tracking-[0.18em] text-emerald-400"
                  : "border border-red-900/60 bg-red-950/20 px-3 py-2 text-[9px] uppercase tracking-[0.18em] text-red-400")), "admin_registrations_page_span_registrations"].filter(Boolean).join(" ")}
            >
              {registrationsOpen ? "Open" : "Closed"}
            </span>
          </div>

          <AdminActionForm
            action={setRegistrationsOpenAction}
            className="mt-5"
          >
            <input className="admin_registrations_page_input_registrations_open"
              type="hidden"
              name="registrationsOpen"
              value={registrationsOpen ? "false" : "true"}
            />
            <button
              type="submit"
              className="w-full border border-[rgb(var(--sep-colour-765937))]/60 bg-[rgb(var(--sep-colour-21170f))] px-5 py-3 text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-d8c29b))] admin_registrations_page_button_registrations"
            >
              {registrationsOpen
                ? "Close public registrations"
                : "Open public registrations"}
            </button>
          </AdminActionForm>
        </section>

        {params.inviteLink ? (
          <section className="mt-5 border border-[rgb(var(--sep-colour-987344))]/60 bg-[rgb(var(--sep-colour-21170f))] p-5 admin_registrations_page_section_registrations_2">
            <p className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-b99765))] admin_registrations_page_p_text">
              Invitation created
            </p>
            <p className="mt-2 text-sm leading-6 text-[rgb(var(--sep-colour-c8b89d))] admin_registrations_page_p_text_2">
              {params.sent === "1"
                ? "The invitation email was sent. The link is also shown below."
                : "Email delivery is not configured or failed. Copy this link and send it to the applicant manually."}
            </p>
            {params.warning ? (
              <p className="mt-2 text-xs leading-5 text-amber-300 admin_registrations_page_p_text_3">
                {params.warning}
              </p>
            ) : null}
            <input
              readOnly
              value={params.inviteLink}
              className="mt-3 w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0f0c09))] px-3 py-2 text-xs text-[rgb(var(--sep-colour-d8c29b))] admin_registrations_page_input_registrations"
            />
          </section>
        ) : null}

        <section className="mt-7 admin_registrations_page_section_registrations_3">
          <div className="flex items-end justify-between gap-4 admin_registrations_page_div_registrations_4">
            <div className="admin_registrations_page_div_applications">
              <p className="text-[8px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-806a4d))] admin_registrations_page_p_applications">
                Closed Alpha
              </p>
              <h3 className="mt-1 font-serif text-2xl text-[rgb(var(--sep-colour-dec69d))] admin_registrations_page_h3_applications">
                Applications
              </h3>
            </div>
            <span className="text-[9px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-806a4d))] admin_registrations_page_span_registrations_2">
              {totalCount} Total
              {" · "}
              {invitedCount} Invited
              {" · "}
              {declinedCount} Declined
            </span>
          </div>

          <div className="mt-4 space-y-2 admin_registrations_page_div_registrations_5">
            {allApplications.map((application) => (
              <details
                key={application.id}
                id={`registration-application-${application.id}`}
                data-registration-id={application.id}
                data-registration-name={application.name}
                data-registration-email={application.email}
                data-registration-status={application.status}
                className="scroll-mt-4 border border-[rgb(var(--sep-colour-60482e))]/40 bg-[rgb(var(--sep-colour-15100d))] admin_registrations_page_details_details"
              >
                <summary className="cursor-pointer list-none px-4 py-3 admin_registrations_page_summary_summary">
                  <div className="flex flex-wrap items-center justify-between gap-3 admin_registrations_page_div_container">
                    <div className="admin_registrations_page_div_container_2">
                      <p className="font-serif text-base text-[rgb(var(--sep-colour-e0ca9f))] admin_registrations_page_p_text_4">
                        {application.name}
                      </p>
                      <p className="mt-0.5 text-xs text-[rgb(var(--sep-colour-a99b89))] admin_registrations_page_p_text_5">
                        {application.email}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 admin_registrations_page_div_container_3">
                      <span className="text-[8px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-b99765))] admin_registrations_page_span_text">
                        {application.status}
                      </span>
                      <span className="text-[8px] text-[rgb(var(--sep-colour-756957))] admin_registrations_page_span_text_2">
                        {new Date(application.created_at).toLocaleString("en-GB")}
                      </span>
                      <span className="admin_registrations_page_span_text_3" aria-hidden="true">⌄</span>
                    </div>
                  </div>
                </summary>

                <div className="border-t border-[rgb(var(--sep-colour-60482e))]/30 p-4 sm:p-5 admin_registrations_page_div_container_4">
                  <ApplicationAnswer
                    label="How did they hear about the closed Alpha?"
                    value={application.heard_about}
                  />
                  <ApplicationAnswer
                    label="What do they enjoy about roleplay?"
                    value={application.roleplay_enjoyment}
                  />
                  <ApplicationAnswer
                    label="Previous RPG experience"
                    value={application.rpg_experience}
                  />

                  {(
                    invitationsByApplication.get(
                      application.id,
                    ) ?? []
                  ).length > 0 ? (
                    <div className="mt-5 border border-[rgb(var(--sep-colour-60482e))]/30 bg-[rgb(var(--sep-colour-100c09))] p-4 admin_registrations_page_div_container_5">
                      <p className="text-[8px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-806a4d))] admin_registrations_page_p_text_6">
                        Invitation history
                      </p>

                      <div className="mt-3 space-y-3 admin_registrations_page_div_container_6">
                        {(
                          invitationsByApplication.get(
                            application.id,
                          ) ?? []
                        ).map((invitation, index) => (
                          <div
                            key={invitation.id}
                            className="border border-[rgb(var(--sep-colour-60482e))]/25 bg-[rgb(var(--sep-colour-0d0a08))] p-3 admin_registrations_page_div_container_7"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2 admin_registrations_page_div_container_8">
                              <span className="text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-b99765))] admin_registrations_page_span_text_4">
                                {index === 0
                                  ? "Latest invitation"
                                  : "Previous invitation"}
                              </span>

                              <span className="text-[8px] text-[rgb(var(--sep-colour-756957))] admin_registrations_page_span_text_5">
                                {new Date(
                                  invitation.created_at,
                                ).toLocaleString("en-GB")}
                              </span>
                            </div>

                            {invitation.invitation_url ? (
                              <input
                                readOnly
                                value={invitation.invitation_url}
                                className="mt-2 w-full border border-[rgb(var(--sep-colour-60482e))]/40 bg-[rgb(var(--sep-colour-090706))] px-3 py-2 text-xs text-[rgb(var(--sep-colour-cdbb9c))] admin_registrations_page_input_field"
                              />
                            ) : (
                              <p className="mt-2 text-xs leading-5 text-[rgb(var(--sep-colour-7f7464))] admin_registrations_page_p_text_7">
                                This invitation was created before invitation-link history was enabled, so its original URL cannot be reconstructed from the stored token hash.
                              </p>
                            )}

                            <p className="mt-2 text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-756957))] admin_registrations_page_p_text_8">
                              {invitation.used_at
                                ? "Used"
                                : new Date(
                                      invitation.expires_at,
                                    ).getTime() <= Date.now()
                                  ? "Expired"
                                  : invitation.sent_at
                                    ? "Sent"
                                    : "Created"}
                              {" · "}
                              Expires{" "}
                              {new Date(
                                invitation.expires_at,
                              ).toLocaleString("en-GB")}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-5 flex flex-wrap gap-2 admin_registrations_page_div_container_9">
                    {application.status !== "registered" &&
                    application.status !== "declined" ? (
                      <form className="admin_registrations_page_form_send_registration_invitation_action" action={sendRegistrationInvitationAction}>
                        <input className="admin_registrations_page_input_application_id"
                          type="hidden"
                          name="application_id"
                          value={application.id}
                        />
                        <button
                          type="submit"
                          className="border border-emerald-800/60 bg-emerald-950/20 px-4 py-2 text-[8px] uppercase tracking-[0.16em] text-emerald-400 admin_registrations_page_button_action"
                        >
                          {application.status === "invited"
                            ? "Send new invitation"
                            : "Send invitation"}
                        </button>
                      </form>
                    ) : null}

                    {application.status === "pending" ? (
                      <form className="admin_registrations_page_form_decline_registration_application_action" action={declineRegistrationApplicationAction}>
                        <input className="admin_registrations_page_input_application_id_2"
                          type="hidden"
                          name="application_id"
                          value={application.id}
                        />
                        <button
                          type="submit"
                          className="border border-red-900/60 bg-red-950/20 px-4 py-2 text-[8px] uppercase tracking-[0.16em] text-red-400 admin_registrations_page_button_decline"
                        >
                          Decline
                        </button>
                      </form>
                    ) : null}
                  </div>
                </div>
              </details>
            ))}

            {!allApplications.length ? (
              <div className="border border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-15100d))] p-6 text-center text-sm text-[rgb(var(--sep-colour-8f8271))] admin_registrations_page_div_container_10">
                No applications yet.
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}

function ApplicationAnswer({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="mb-4 border border-[rgb(var(--sep-colour-60482e))]/30 bg-[rgb(var(--sep-colour-100c09))] p-4 admin_registrations_page_div_container_11">
      <p className="text-[8px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-806a4d))] admin_registrations_page_p_text_9">
        {label}
      </p>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[rgb(var(--sep-colour-b8aa95))] admin_registrations_page_p_text_10">
        {value}
      </p>
    </div>
  );
}
