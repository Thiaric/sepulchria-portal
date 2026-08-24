

import { AdminActionForm } from "@/components/admin/admin-action-form";
import {
  requireAdminSection,
} from "@/lib/auth/require-staff";
import { createClient } from "@/lib/supabase/server";

import { setRegistrationsOpenAction } from "./actions";

export default async function RegistrationAdminPage() {
  await requireAdminSection("new_register");

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("registration_settings")
    .select("registrations_open, updated_at")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Unable to load registration settings: ${error.message}`,
    );
  }

  const registrationsOpen =
    data?.registrations_open === true;

  return (
    <main className="p-5 sm:p-7 lg:p-9">
      <div className="mx-auto max-w-4xl">
        <p className="text-[9px] uppercase tracking-[0.28em] text-[rgb(var(--sep-colour-8b704e))]">
          Public access
        </p>

        <h2 className="mt-2 font-serif text-3xl text-[rgb(var(--sep-colour-e2cda4))]">
          New Registrations
        </h2>

        <p className="mt-3 max-w-3xl text-sm leading-7 text-[rgb(var(--sep-colour-9f927f))]">
          Open or close the City Gates to new account registrations.
          Existing accounts and login are not affected.
        </p>

        <section className="mt-7 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))]">
          <div className="border-b border-[rgb(var(--sep-colour-60482e))]/35 px-5 py-5 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-806a4d))]">
                  Current status
                </p>

                <h3 className="mt-2 font-serif text-2xl text-[rgb(var(--sep-colour-dec69d))]">
                  City Gates
                </h3>
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
          </div>

          <div className="p-5 sm:p-6">
            <p className="text-sm leading-7 text-[rgb(var(--sep-colour-a99b89))]">
              {registrationsOpen
                ? "New visitors can currently see and submit the normal registration form."
                : "New visitors currently see the Beta announcement instead of the registration form."}
            </p>

            <div className="mt-5 border border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-100c09))] p-4">
              <p className="text-[8px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-806a4d))]">
                Public message while closed
              </p>

              <p className="mt-2 font-serif text-lg text-[rgb(var(--sep-colour-d8c4a4))]">
                We will soon open the City Gates to 50 Beta testers.
                Stay tuned.
              </p>
            </div>

            <AdminActionForm
              action={setRegistrationsOpenAction}
              className="mt-6"
            >
              <input
                type="hidden"
                name="registrationsOpen"
                value={registrationsOpen ? "false" : "true"}
              />

              <button
                type="submit"
                className={
                  registrationsOpen
                    ? "w-full border border-red-900/60 bg-red-950/20 px-6 py-3 text-[9px] uppercase tracking-[0.2em] text-red-400 transition hover:border-red-700 hover:bg-red-950/35"
                    : "w-full border border-emerald-800/60 bg-emerald-950/20 px-6 py-3 text-[9px] uppercase tracking-[0.2em] text-emerald-400 transition hover:border-emerald-600 hover:bg-emerald-950/35"
                }
              >
                {registrationsOpen
                  ? "Close registrations"
                  : "Open registrations"}
              </button>
            </AdminActionForm>

            {data?.updated_at ? (
              <p className="mt-3 text-right text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-716555))]">
                Last changed{" "}
                {new Date(data.updated_at).toLocaleString("en-GB")}
              </p>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
