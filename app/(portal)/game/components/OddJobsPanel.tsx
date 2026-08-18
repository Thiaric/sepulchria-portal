"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { workOddJob } from "../odd-jobs-actions";
import { formatRemnants } from "@/lib/economy/currency";

export type OddJobStateRow = {
  job_id: string;
  job_name: string;
  job_description: string;
  pay: number;
  starting_pay: number;
  claims_used: number;
  claims_remaining: number;
  max_claims: number;
  sort_order: number;
  claimed: boolean;
  claimed_job_id: string | null;
  claimed_job_name: string | null;
  claimed_pay: number | null;
  wallet_balance: number;
  work_date: string;
};

export function OddJobsPanel({ jobs }: { jobs: OddJobStateRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [pendingJobId, setPendingJobId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  if (!jobs.length) return null;

  const first = jobs[0];
  const alreadyWorked = jobs.some((job) => job.claimed);

  function work(jobId: string) {
    if (alreadyWorked || pending) return;

    const selected = jobs.find((job) => job.job_id === jobId);

    if (!selected || selected.claims_remaining <= 0) {
      setOk(false);
      setMessage("This job has no work slots remaining today.");
      return;
    }

    setPendingJobId(jobId);
    setMessage(null);

    startTransition(async () => {
      const result = await workOddJob(jobId);
      setOk(result.ok);
      setMessage(result.message);
      setPendingJobId(null);

      if (result.ok) {
        router.refresh();
      }
    });
  }

  return (
    <details open className="shrink-0 border-b border-[#60482e]/45 bg-[#120e0b]">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 [&::-webkit-details-marker]:hidden">
        <div>
          <p className="text-[7px] uppercase tracking-[0.18em] text-[#806b50]">
            Odd Jobs Bureau
          </p>

          <p className="mt-0.5 font-serif text-sm text-[#dec89f]">
            Today&apos;s work
          </p>
        </div>

        <div className="text-right">
          <p className="text-[7px] uppercase tracking-[0.12em] text-[#756958]">
            Wallet
          </p>

          <p className="font-serif text-base text-[#e4c589]">
            {formatRemnants(Number(first.wallet_balance))}
          </p>
        </div>
      </summary>

      <div className="border-t border-[#59432c]/30 px-3 py-3">
        {alreadyWorked ? (
          <p className="mb-3 border border-emerald-900/45 bg-emerald-950/10 px-3 py-2 text-[9px] text-emerald-400">
            You have already worked today
            {first.claimed_job_name ? ` — ${first.claimed_job_name}` : ""}
            {first.claimed_pay !== null ? ` (+${formatRemnants(first.claimed_pay)})` : ""}.
            Return tomorrow.
          </p>
        ) : (
          <p className="mb-3 text-[9px] leading-4 text-[#8f8271]">
            Choose one job for today. Each job begins with a daily rate between
            10 and 50 Remnants and has 50 work slots. After every 5 completed
            shifts, that job&apos;s pay falls by 10% of its starting rate, rounded up.
            Everything resets at midnight UK time.
          </p>
        )}

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {jobs.map((job) => {
            const soldOut = Number(job.claims_remaining) <= 0;

            return (
              <article
                key={job.job_id}
                className="flex min-h-[124px] flex-col border border-[#59432c]/40 bg-[#17110d] p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-serif text-[13px] text-[#d9c29a]">
                    {job.job_name}
                  </h3>

                  <span className="shrink-0 text-[10px] font-semibold text-[#d8ad69]">
                    {formatRemnants(job.pay)}
                  </span>
                </div>

                <p className="mt-1 flex-1 text-[8px] leading-4 text-[#807463]">
                  {job.job_description}
                </p>

                <div className="mt-2 flex items-center justify-between gap-2 text-[7px] uppercase tracking-[0.1em]">
                  <span className={soldOut ? "text-red-400" : "text-[#8e7a60]"}>
                    {soldOut
                      ? "Not available"
                      : `${job.claims_remaining} / ${job.max_claims} left`}
                  </span>

                  {job.pay < job.starting_pay ? (
                    <span className="text-[#8f6e49]">
                      Started {formatRemnants(job.starting_pay)}
                    </span>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={() => work(job.job_id)}
                  disabled={alreadyWorked || pending || soldOut}
                  className="mt-2 border border-[#85653c] bg-[#342617] px-3 py-1.5 text-[8px] uppercase tracking-[0.14em] text-[#efd4a0] transition hover:bg-[#4a351f] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {pending && pendingJobId === job.job_id
                    ? "Working..."
                    : alreadyWorked
                      ? "Worked today"
                      : soldOut
                        ? "Unavailable"
                        : "Work"}
                </button>
              </article>
            );
          })}
        </div>

        {message ? (
          <p
            aria-live="polite"
            className={`mt-3 text-[9px] ${
              ok ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {message}
          </p>
        ) : null}
      </div>
    </details>
  );
}
