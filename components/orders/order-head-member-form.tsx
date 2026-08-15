"use client";

import {
  useMemo,
  useState,
} from "react";

import {
  headRemoveMember,
  headUpdateMember,
} from "@/app/(portal)/orders/manage/actions";

export type OrderHeadLevelOption = {
  id: string;
  level: number;
  jobs: {
    id: string;
    name: string;
  }[];
};

type Props = {
  orderId: string;
  membershipId: string;
  characterName: string;
  initialLevelId: string;
  initialJobId: string | null;
  levels: OrderHeadLevelOption[];
};

export function OrderHeadMemberForm({
  orderId,
  membershipId,
  characterName,
  initialLevelId,
  initialJobId,
  levels,
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

  function changeLevel(
    nextLevelId: string,
  ) {
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

  function confirmRemoval(
    event: React.MouseEvent<HTMLButtonElement>,
  ) {
    const confirmed =
      window.confirm(
        `Remove ${characterName} from this Order?\n\nThis will remove their current Order membership.`,
      );

    if (!confirmed) {
      event.preventDefault();
    }
  }

  return (
    <form
      action={headUpdateMember}
      className="border border-[#59432c]/40 bg-[#100c09] p-3"
    >
      <input
        type="hidden"
        name="orderId"
        value={orderId}
      />

      <input
        type="hidden"
        name="membershipId"
        value={membershipId}
      />

      <div className="grid gap-3 lg:grid-cols-[minmax(180px,1fr)_130px_minmax(190px,1fr)_auto] lg:items-end">
        <div>
          <p className="text-[7px] uppercase tracking-[0.14em] text-[#756958]">
            Character
          </p>

          <p className="mt-1 font-serif text-sm text-[#d8bf91]">
            {characterName}
          </p>
        </div>

        <label>
          <span className="mb-1 block text-[7px] uppercase tracking-[0.14em] text-[#756958]">
            Level
          </span>

          <select
            name="levelId"
            value={levelId}
            onChange={(event) =>
              changeLevel(
                event.target.value,
              )
            }
            className="w-full border border-[#60482e]/50 bg-[#15100d] px-2 py-2 text-xs text-[#d7c4a5] outline-none"
          >
            {levels.map(
              (level) => (
                <option
                  key={level.id}
                  value={level.id}
                >
                  Level {level.level}
                </option>
              ),
            )}
          </select>
        </label>

        <label>
          <span className="mb-1 block text-[7px] uppercase tracking-[0.14em] text-[#756958]">
            Job / title
          </span>

          <select
            name="jobId"
            value={jobId}
            onChange={(event) =>
              setJobId(
                event.target.value,
              )
            }
            className="w-full border border-[#60482e]/50 bg-[#15100d] px-2 py-2 text-xs text-[#d7c4a5] outline-none"
          >
            <option value="">
              No specific job
            </option>

            {(selectedLevel?.jobs ??
              []).map(
              (job) => (
                <option
                  key={job.id}
                  value={job.id}
                >
                  {job.name}
                </option>
              ),
            )}
          </select>
        </label>

        <div className="flex gap-2">
          <button
            type="submit"
            className="border border-[#765937]/55 bg-[#261b12] px-3 py-2 text-[8px] uppercase tracking-[0.12em] text-[#ccb083]"
          >
            Save
          </button>

          <button
            type="submit"
            formAction={
              headRemoveMember
            }
            onClick={confirmRemoval}
            className="border border-red-900/55 bg-red-950/20 px-3 py-2 text-[8px] uppercase tracking-[0.12em] text-red-300"
          >
            Remove
          </button>
        </div>
      </div>
    </form>
  );
}
