

import { AdminActionForm } from "@/components/admin/admin-action-form";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  requireAdminSection,
} from "@/lib/auth/require-staff";

import { createOddJob, updateOddJob } from "./actions";

type OddJobRow = {
  id: string;
  name: string;
  description: string;
  sort_order: number;
};

export default async function AdminJobsPage() {
  await requireAdminSection("jobs");

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
    <main className="p-5 sm:p-7 lg:p-9 admin_jobs_page_main_main">
      <div className="mx-auto max-w-7xl admin_jobs_page_div_container">
        <div className="flex flex-wrap items-end justify-between gap-4 admin_jobs_page_div_container_2">
          <div className="admin_jobs_page_div_odd_jobs">
            <p className="text-[9px] uppercase tracking-[0.28em] text-[rgb(var(--sep-colour-8c704b))] admin_jobs_page_p_odd_jobs">
              Administration
            </p>
            <h2 className="mt-2 font-serif text-4xl text-[rgb(var(--sep-colour-ead5ac))] admin_jobs_page_h2_odd_jobs">
              Odd Jobs
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[rgb(var(--sep-colour-a99b89))] admin_jobs_page_p_odd_jobs_2">
              Manage the jobs offered by the Odd Jobs Bureau. Daily pay,
              pay decay and the fifty-work daily limit remain fixed by the
              economy system.
            </p>
          </div>

          <div className="border border-[rgb(var(--sep-colour-765937))]/55 bg-[rgb(var(--sep-colour-21170f))] px-3 py-2 text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-c1a477))] admin_jobs_page_div_container_3">
            {jobs.length} {jobs.length === 1 ? "Job" : "Jobs"}
          </div>
        </div>

        <section
          id="job-new"
          className="mt-8 scroll-mt-6 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-5 sm:p-6 admin_jobs_page_section_job_new"
        >
          <p className="text-[9px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-8c704b))] admin_jobs_page_p_job_new">
            New job
          </p>
          <h3 className="mt-2 font-serif text-2xl text-[rgb(var(--sep-colour-dfc99f))] admin_jobs_page_h3_job_new">
            Create an Odd Job
          </h3>

          <AdminActionForm action={createOddJob} className="mt-5 grid gap-4">
            <label className="admin_jobs_page_label_job_new">
              <span className="mb-1.5 block text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-806b50))] admin_jobs_page_span_job_new">
                Name
              </span>
              <input
                type="text"
                name="name"
                required
                maxLength={120}
                placeholder="Job name"
                className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none placeholder:text-[rgb(var(--sep-colour-625747))] focus:border-[rgb(var(--sep-colour-a17a49))] admin_jobs_page_input_name"
              />
            </label>

            <label className="admin_jobs_page_label_job_new_2">
              <span className="mb-1.5 block text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-806b50))] admin_jobs_page_span_job_new_2">
                Description
              </span>
              <textarea
                name="description"
                required
                maxLength={1000}
                rows={4}
                placeholder="Describe the work involved."
                className="w-full resize-y border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm leading-6 text-[rgb(var(--sep-colour-d7c4a5))] outline-none placeholder:text-[rgb(var(--sep-colour-625747))] focus:border-[rgb(var(--sep-colour-a17a49))] admin_jobs_page_textarea_description"
              />
            </label>

            <div className="flex justify-end admin_jobs_page_div_job_new">
              <button
                type="submit"
                className="border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-5 py-3 text-[9px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-efd6a8))] transition hover:border-[rgb(var(--sep-colour-b98c50))] hover:bg-[rgb(var(--sep-colour-50371f))] admin_jobs_page_button_create_job"
              >
                Create Job
              </button>
            </div>
          </AdminActionForm>
        </section>

        <div className="mt-6 space-y-4 admin_jobs_page_div_container_4">
          {jobs.map((job) => (
            <section
              id={`job-${job.id}`}
              key={job.id}
              className="scroll-mt-6 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-5 sm:p-6 admin_jobs_page_section_section"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 admin_jobs_page_div_container_5">
                <div className="admin_jobs_page_div_container_6">
                  <p className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))] admin_jobs_page_p_text">
                    Odd Jobs Bureau
                  </p>
                  <h3 className="mt-1 font-serif text-2xl text-[rgb(var(--sep-colour-dfc99f))] admin_jobs_page_h3_heading">
                    {job.name}
                  </h3>
                </div>

                <span className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-100c09))] px-2.5 py-1 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-8f806c))] admin_jobs_page_span_text">
                  Daily rules fixed
                </span>
              </div>

              <AdminActionForm action={updateOddJob} className="mt-5 grid gap-4">
                <input className="admin_jobs_page_input_job_id" type="hidden" name="jobId" value={job.id} />

                <label className="admin_jobs_page_label_label">
                  <span className="mb-1.5 block text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-806b50))] admin_jobs_page_span_text_2">
                    Name
                  </span>
                  <input
                    type="text"
                    name="name"
                    required
                    maxLength={120}
                    defaultValue={job.name}
                    className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))] admin_jobs_page_input_name_2"
                  />
                </label>

                <label className="admin_jobs_page_label_label_2">
                  <span className="mb-1.5 block text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-806b50))] admin_jobs_page_span_text_3">
                    Description
                  </span>
                  <textarea
                    name="description"
                    required
                    maxLength={1000}
                    rows={4}
                    defaultValue={job.description}
                    className="w-full resize-y border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm leading-6 text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))] admin_jobs_page_textarea_description_2"
                  />
                </label>

                <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[rgb(var(--sep-colour-60482e))]/30 pt-4 admin_jobs_page_div_container_7">
                  <p className="text-[9px] leading-5 text-[rgb(var(--sep-colour-756958))] admin_jobs_page_p_text_2">
                    Pay range, pay decay and daily capacity are intentionally not editable here.
                  </p>

                  <button
                    type="submit"
                    className="border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-5 py-3 text-[9px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-efd6a8))] transition hover:border-[rgb(var(--sep-colour-b98c50))] hover:bg-[rgb(var(--sep-colour-50371f))] admin_jobs_page_button_save_job"
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
