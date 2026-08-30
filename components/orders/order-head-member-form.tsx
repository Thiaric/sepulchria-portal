"use client";

import { useMemo, useState } from "react";

import {
  headRemoveMember,
  headUpdateMember,
} from "@/app/(portal)/orders/manage/actions";
import { InlineActionForm } from "@/components/forms/inline-action-form";

export type OrderHeadLevelOption = {
  id: string;
  level: number;
  monthlyPay?: number;
  jobs: {
    id: string;
    name: string;
    before: string[];
    after: string[];
  }[];
};

type Props = {
  orderId: string;
  membershipId: string;
  characterName: string;
  initialLevelId: string;
  initialJobId: string | null;
  levels: OrderHeadLevelOption[];
  embedded?: boolean;
};

export function OrderHeadMemberForm({
  orderId,
  membershipId,
  characterName,
  initialLevelId,
  initialJobId,
  levels,
  embedded = false,
}: Props) {
  const [levelId, setLevelId] =
    useState(initialLevelId);

  const [jobId, setJobId] =
    useState(initialJobId ?? "");

  const selectedLevel =
    useMemo(
      () =>
        levels.find(
          (level) =>
            level.id === levelId,
        ) ?? null,
      [levelId, levels],
    );

  const selectedJob =
    useMemo(
      () =>
        selectedLevel?.jobs.find(
          (job) =>
            job.id === jobId,
        ) ?? null,
      [jobId, selectedLevel],
    );

  function changeLevel(nextLevelId: string) {
    setLevelId(nextLevelId);

    const next =
      levels.find(
        (level) =>
          level.id === nextLevelId,
      );

    if (
      !next?.jobs.some(
        (job) =>
          job.id === jobId,
      )
    ) {
      setJobId("");
    }
  }

  async function memberAction(
    formData: FormData,
  ) {
    return formData.get("intent") ===
      "remove"
      ? headRemoveMember(formData)
      : headUpdateMember(formData);
  }

  return (
    <InlineActionForm
      action={memberAction}
      successMessage="Membership updated."
      className={
        embedded
          ? ""
          : "border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-100c09))] p-3"
      }
    >
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="membershipId" value={membershipId} />

      <div className="grid gap-3 lg:grid-cols-[minmax(180px,1fr)_130px_minmax(190px,1fr)_auto] lg:items-end">
        <div>
          <p className="text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-756958))]">
            Character
          </p>
          <p className="mt-1 font-serif text-sm text-[rgb(var(--sep-colour-d8bf91))]">
            {characterName}
          </p>
        </div>

        <label>
          <span className="mb-1 block text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-756958))]">
            Level
          </span>
          <select
            name="levelId"
            value={levelId}
            onChange={(event) =>
              changeLevel(event.target.value)
            }
            className="w-full border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-15100d))] px-2 py-2 text-xs text-[rgb(var(--sep-colour-d7c4a5))] outline-none"
          >
            {levels.map((level) => (
              <option key={level.id} value={level.id}>
                Level {level.level}{level.monthlyPay !== undefined ? ` · ${level.monthlyPay.toLocaleString("en-GB")} R/month` : ""}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="mb-1 block text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-756958))]">
            Role
          </span>
          <select
            name="jobId"
            required
            value={jobId}
            onChange={(event) =>
              setJobId(event.target.value)
            }
            className="w-full border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-15100d))] px-2 py-2 text-xs text-[rgb(var(--sep-colour-d7c4a5))] outline-none"
          >
            <option value="" disabled>
              Select Role
            </option>

            {(selectedLevel?.jobs ?? []).map((job) => {
              const before =
                job.before.length
                  ? `from ${job.before.join(" / ")}`
                  : "entry";

              const after =
                job.after.length
                  ? `to ${job.after.join(" / ")}`
                  : "final";

              return (
                <option
                  key={job.id}
                  value={job.id}
                >
                  {job.name} — {before} · {after}
                </option>
              );
            })}
          </select>

          {selectedJob ? (
            <span className="mt-1.5 block text-[8px] leading-4 text-[rgb(var(--sep-colour-6f665a))]">
              Before:{" "}
              {selectedJob.before.length
                ? selectedJob.before.join(", ")
                : "none"}
              {" · "}
              After:{" "}
              {selectedJob.after.length
                ? selectedJob.after.join(", ")
                : "none"}
            </span>
          ) : null}
        </label>

        <div className="flex gap-2">
          <button
            type="submit"
            name="intent"
            value="update"
            disabled={!jobId}
            className="border border-[rgb(var(--sep-colour-765937))]/55 bg-[rgb(var(--sep-colour-261b12))] px-3 py-2 text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-ccb083))] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Save
          </button>

          <button
            type="submit"
            name="intent"
            value="remove"
            data-confirm-message={`Remove ${characterName} from this Order? This will remove their current Order membership.`}
            className="border border-red-900/55 bg-red-950/20 px-3 py-2 text-[8px] uppercase tracking-[0.12em] text-red-300"
          >
            Remove
          </button>
        </div>
      </div>
    </InlineActionForm>
  );
}
