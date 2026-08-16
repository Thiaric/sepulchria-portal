"use client";

import { useMemo, useState } from "react";

import {
  headAddMember,
} from "@/app/(portal)/orders/manage/actions";

import type {
  OrderHeadLevelOption,
} from "@/components/orders/order-head-member-form";

type Props = {
  orderId: string;
  characters: {
    id: string;
    display_name: string;
  }[];
  levels: OrderHeadLevelOption[];
};

export function OrderHeadAddMemberForm({
  orderId,
  characters,
  levels,
}: Props) {
  const defaultLevel =
    levels.find(
      (level) =>
        level.level === 1,
    ) ??
    levels[levels.length - 1] ??
    null;

  const [levelId, setLevelId] =
    useState(defaultLevel?.id ?? "");

  const [jobId, setJobId] =
    useState("");

  const selectedLevel =
    useMemo(
      () =>
        levels.find(
          (level) =>
            level.id === levelId,
        ) ?? null,
      [levelId, levels],
    );

  return (
    <form
      action={headAddMember}
      className="mt-4 border border-dashed border-[#765937]/45 bg-[#100c09] p-4"
    >
      <input type="hidden" name="orderId" value={orderId} />

      <p className="text-[8px] uppercase tracking-[0.18em] text-[#806b50]">
        Add member
      </p>

      <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(220px,1fr)_130px_minmax(190px,1fr)_auto] lg:items-end">
        <label>
          <span className="mb-1 block text-[7px] uppercase tracking-[0.14em] text-[#756958]">
            Character
          </span>
          <select
            name="characterId"
            required
            defaultValue=""
            disabled={characters.length === 0}
            className="w-full border border-[#60482e]/50 bg-[#15100d] px-2 py-2 text-xs text-[#d7c4a5] outline-none disabled:opacity-50"
          >
            <option value="" disabled>
              {characters.length
                ? "Select character"
                : "No characters available"}
            </option>

            {characters.map((character) => (
              <option key={character.id} value={character.id}>
                {character.display_name}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="mb-1 block text-[7px] uppercase tracking-[0.14em] text-[#756958]">
            Level
          </span>
          <select
            name="levelId"
            required
            value={levelId}
            onChange={(event) => {
              setLevelId(event.target.value);
              setJobId("");
            }}
            className="w-full border border-[#60482e]/50 bg-[#15100d] px-2 py-2 text-xs text-[#d7c4a5] outline-none"
          >
            {levels.map((level) => (
              <option key={level.id} value={level.id}>
                Level {level.level}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="mb-1 block text-[7px] uppercase tracking-[0.14em] text-[#756958]">
            Role
          </span>
          <select
            name="jobId"
            required
            value={jobId}
            onChange={(event) =>
              setJobId(event.target.value)
            }
            className="w-full border border-[#60482e]/50 bg-[#15100d] px-2 py-2 text-xs text-[#d7c4a5] outline-none"
          >
            <option value="" disabled>
              Select Role
            </option>

            {(selectedLevel?.jobs ?? []).map((job) => (
              <option key={job.id} value={job.id}>
                {job.name}
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          disabled={!characters.length || !levelId || !jobId}
          className="border border-[#987344] bg-[#3b2919] px-4 py-2 text-[8px] uppercase tracking-[0.14em] text-[#efd6a8] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Add member
        </button>
      </div>
    </form>
  );
}
