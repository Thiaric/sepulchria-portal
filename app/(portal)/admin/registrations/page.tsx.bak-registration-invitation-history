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
  ]);

  if (settingsError) throw new Error(settingsError.message);
  if (applicationsError) throw new Error(applicationsError.message);

  const registrationsOpen =
    settings?.registrations_open === true;

  return (
    <main className="p-5 sm:p-7 lg:p-9">
      <div className="mx-auto max-w-5xl">
        <p className="text-[9px] uppercase tracking-[0.28em] text-[rgb(var(--sep-colour-8b704e))]">
          Public access
        </p>

        <h2 className="mt-2 font-serif text-3xl text-[rgb(var(--sep-colour-e2cda4))]">
          Registrations
        </h2>

        <p className="mt-3 max-w-3xl text-sm leading-7 text-[rgb(var(--sep-colour-9f927f))]">
          Control public registration and review applications for the
          closed Alpha. Invitations can register while the City Gates
          remain closed.
        </p>

        <section className="mt-7 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[8px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-806a4d))]">
                City Gates
              </p>
              <p className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-dec69d))]">
                Public registrations
              </p>
            </div>

            <span
              className={
                registrationsOpen
                  ? "border border-emerald-700/60 bg-emerald-950/20 px-3 py-2 text-[9px] uppercase tracking-[0.18em] text-emerald-400"
                  : "border border-red-900/60 bg-red-950/20 px-3 py-2 text-[9px] uppercase tracking-[0.18em] text-red-400"
              }
            >
              {registrationsOpen ? "Open" : "Closed"}
            </span>
          </div>

          <AdminActionForm
            action={setRegistrationsOpenAction}
            className="mt-5"
          >
            <input
              type="hidden"
              name="registrationsOpen"
              value={registrationsOpen ? "false" : "true"}
            />
            <button
              type="submit"
              className="w-full border border-[rgb(var(--sep-colour-765937))]/60 bg-[rgb(var(--sep-colour-21170f))] px-5 py-3 text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-d8c29b))]"
            >
              {registrationsOpen
                ? "Close public registrations"
                : "Open public registrations"}
            </button>
          </AdminActionForm>
        </section>

        {params.inviteLink ? (
          <section className="mt-5 border border-[rgb(var(--sep-colour-987344))]/60 bg-[rgb(var(--sep-colour-21170f))] p-5">
            <p className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-b99765))]">
              Invitation created
            </p>
            <p className="mt-2 text-sm leading-6 text-[rgb(var(--sep-colour-c8b89d))]">
              {params.sent === "1"
                ? "The invitation email was sent. The link is also shown below."
                : "Email delivery is not configured or failed. Copy this link and send it to the applicant manually."}
            </p>
            {params.warning ? (
              <p className="mt-2 text-xs leading-5 text-amber-300">
                {params.warning}
              </p>
            ) : null}
            <input
              readOnly
              value={params.inviteLink}
              className="mt-3 w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0f0c09))] px-3 py-2 text-xs text-[rgb(var(--sep-colour-d8c29b))]"
            />
          </section>
        ) : null}

        <section className="mt-7">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[8px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-806a4d))]">
                Closed Alpha
              </p>
              <h3 className="mt-1 font-serif text-2xl text-[rgb(var(--sep-colour-dec69d))]">
                Applications
              </h3>
            </div>
            <span className="text-[9px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-806a4d))]">
              {applications?.length ?? 0} total
            </span>
          </div>

          <div className="mt-4 space-y-2">
            {(applications ?? []).map((application) => (
              <details
                key={application.id}
                className="border border-[rgb(var(--sep-colour-60482e))]/40 bg-[rgb(var(--sep-colour-15100d))]"
              >
                <summary className="cursor-pointer list-none px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-serif text-base text-[rgb(var(--sep-colour-e0ca9f))]">
                        {application.name}
                      </p>
                      <p className="mt-0.5 text-xs text-[rgb(var(--sep-colour-a99b89))]">
                        {application.email}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[8px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-b99765))]">
                        {application.status}
                      </span>
                      <span className="text-[8px] text-[rgb(var(--sep-colour-756957))]">
                        {new Date(application.created_at).toLocaleString("en-GB")}
                      </span>
                      <span aria-hidden="true">⌄</span>
                    </div>
                  </div>
                </summary>

                <div className="border-t border-[rgb(var(--sep-colour-60482e))]/30 p-4 sm:p-5">
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

                  <div className="mt-5 flex flex-wrap gap-2">
                    {application.status !== "registered" &&
                    application.status !== "declined" ? (
                      <form action={sendRegistrationInvitationAction}>
                        <input
                          type="hidden"
                          name="application_id"
                          value={application.id}
                        />
                        <button
                          type="submit"
                          className="border border-emerald-800/60 bg-emerald-950/20 px-4 py-2 text-[8px] uppercase tracking-[0.16em] text-emerald-400"
                        >
                          {application.status === "invited"
                            ? "Send new invitation"
                            : "Send invitation"}
                        </button>
                      </form>
                    ) : null}

                    {application.status !== "registered" &&
                    application.status !== "declined" ? (
                      <form action={declineRegistrationApplicationAction}>
                        <input
                          type="hidden"
                          name="application_id"
                          value={application.id}
                        />
                        <button
                          type="submit"
                          className="border border-red-900/60 bg-red-950/20 px-4 py-2 text-[8px] uppercase tracking-[0.16em] text-red-400"
                        >
                          Decline
                        </button>
                      </form>
                    ) : null}
                  </div>
                </div>
              </details>
            ))}

            {!applications?.length ? (
              <div className="border border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-15100d))] p-6 text-center text-sm text-[rgb(var(--sep-colour-8f8271))]">
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
    <div className="mb-4 border border-[rgb(var(--sep-colour-60482e))]/30 bg-[rgb(var(--sep-colour-100c09))] p-4">
      <p className="text-[8px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-806a4d))]">
        {label}
      </p>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[rgb(var(--sep-colour-b8aa95))]">
        {value}
      </p>
    </div>
  );
}
