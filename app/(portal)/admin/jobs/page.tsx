import { AdminActionForm } from "@/components/admin/admin-action-form";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff } from "@/lib/auth/require-staff";

import { createOddJob, updateOddJob } from "./actions";

type OddJobRow = {
  id: string;
  name: string;
  description: string;
  sort_order: number;
};

export default async function AdminJobsPage() {
  await requireStaff();

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("odd_jobs")
    .select("id, name, description, sort_order")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Unable to load Odd Jobs: ${error.message}`);
  }

  const jobs = (data ?? []) as OddJobRow[];

  return (
    <main className="p-5 sm:p-7 lg:p-9">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[9px] uppercase tracking-[0.28em] text-[#8c704b]">
              Administration
            </p>
            <h2 className="mt-2 font-serif text-4xl text-[#ead5ac]">
              Odd Jobs
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[#a99b89]">
              Manage the jobs offered by the Odd Jobs Bureau. Daily pay,
              pay decay and the fifty-work daily limit remain fixed by the
              economy system.
            </p>
          </div>

          <div className="border border-[#765937]/55 bg-[#21170f] px-3 py-2 text-[9px] uppercase tracking-[0.18em] text-[#c1a477]">
            {jobs.length} {jobs.length === 1 ? "Job" : "Jobs"}
          </div>
        </div>

        <section
          id="job-new"
          className="mt-8 scroll-mt-6 border border-[#60482e]/45 bg-[#15100d] p-5 sm:p-6"
        >
          <p className="text-[9px] uppercase tracking-[0.24em] text-[#8c704b]">
            New job
          </p>
          <h3 className="mt-2 font-serif text-2xl text-[#dfc99f]">
            Create an Odd Job
          </h3>

          <AdminActionForm action={createOddJob} className="mt-5 grid gap-4">
            <label>
              <span className="mb-1.5 block text-[8px] uppercase tracking-[0.14em] text-[#806b50]">
                Name
              </span>
              <input
                type="text"
                name="name"
                required
                maxLength={120}
                placeholder="Job name"
                className="w-full border border-[#60482e]/55 bg-[#100c09] px-3 py-3 text-sm text-[#d7c4a5] outline-none placeholder:text-[#625747] focus:border-[#a17a49]"
              />
            </label>

            <label>
              <span className="mb-1.5 block text-[8px] uppercase tracking-[0.14em] text-[#806b50]">
                Description
              </span>
              <textarea
                name="description"
                required
                maxLength={1000}
                rows={4}
                placeholder="Describe the work involved."
                className="w-full resize-y border border-[#60482e]/55 bg-[#100c09] px-3 py-3 text-sm leading-6 text-[#d7c4a5] outline-none placeholder:text-[#625747] focus:border-[#a17a49]"
              />
            </label>

            <div className="flex justify-end">
              <button
                type="submit"
                className="border border-[#987344] bg-[#3b2919] px-5 py-3 text-[9px] uppercase tracking-[0.2em] text-[#efd6a8] transition hover:border-[#b98c50] hover:bg-[#50371f]"
              >
                Create Job
              </button>
            </div>
          </AdminActionForm>
        </section>

        <div className="mt-6 space-y-4">
          {jobs.map((job) => (
            <section
              id={`job-${job.id}`}
              key={job.id}
              className="scroll-mt-6 border border-[#60482e]/45 bg-[#15100d] p-5 sm:p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[8px] uppercase tracking-[0.18em] text-[#806b50]">
                    Odd Jobs Bureau
                  </p>
                  <h3 className="mt-1 font-serif text-2xl text-[#dfc99f]">
                    {job.name}
                  </h3>
                </div>

                <span className="border border-[#60482e]/45 bg-[#100c09] px-2.5 py-1 text-[8px] uppercase tracking-[0.14em] text-[#8f806c]">
                  Daily rules fixed
                </span>
              </div>

              <AdminActionForm action={updateOddJob} className="mt-5 grid gap-4">
                <input type="hidden" name="jobId" value={job.id} />

                <label>
                  <span className="mb-1.5 block text-[8px] uppercase tracking-[0.14em] text-[#806b50]">
                    Name
                  </span>
                  <input
                    type="text"
                    name="name"
                    required
                    maxLength={120}
                    defaultValue={job.name}
                    className="w-full border border-[#60482e]/55 bg-[#100c09] px-3 py-3 text-sm text-[#d7c4a5] outline-none focus:border-[#a17a49]"
                  />
                </label>

                <label>
                  <span className="mb-1.5 block text-[8px] uppercase tracking-[0.14em] text-[#806b50]">
                    Description
                  </span>
                  <textarea
                    name="description"
                    required
                    maxLength={1000}
                    rows={4}
                    defaultValue={job.description}
                    className="w-full resize-y border border-[#60482e]/55 bg-[#100c09] px-3 py-3 text-sm leading-6 text-[#d7c4a5] outline-none focus:border-[#a17a49]"
                  />
                </label>

                <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#60482e]/30 pt-4">
                  <p className="text-[9px] leading-5 text-[#756958]">
                    Pay range, pay decay and daily capacity are intentionally not editable here.
                  </p>

                  <button
                    type="submit"
                    className="border border-[#987344] bg-[#3b2919] px-5 py-3 text-[9px] uppercase tracking-[0.2em] text-[#efd6a8] transition hover:border-[#b98c50] hover:bg-[#50371f]"
                  >
                    Save Job
                  </button>
                </div>
              </AdminActionForm>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
