"use client";

import { useMemo, useState } from "react";

import {
  headAddMember,
} from "@/app/(portal)/orders/manage/actions";
import { InlineActionForm } from "@/components/forms/inline-action-form";

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

  const selectedJob =
    useMemo(
      () =>
        selectedLevel?.jobs.find(
          (job) =>
            job.id === jobId,
        ) ?? null,
      [jobId, selectedLevel],
    );

  return (
    <InlineActionForm
      action={headAddMember}
      successMessage="Member added."
      className="mt-4 border border-dashed border-[rgb(var(--sep-skin-c1,var(--sep-colour-765937)))]/45 bg-[rgb(var(--sep-colour-100c09))] p-4"
    >
      <input className="components_orders_order_head_add_member_form_input_order_id" type="hidden" name="orderId" value={orderId} />

      <p className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))] components_orders_order_head_add_member_form_p_text">
        Add member
      </p>

      <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(220px,1fr)_130px_minmax(190px,1fr)_auto] lg:items-end components_orders_order_head_add_member_form_div_container">
        <label className="components_orders_order_head_add_member_form_label_label">
          <span className="mb-1 block text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-756958))] components_orders_order_head_add_member_form_span_text">
            Character
          </span>
          <select
            name="characterId"
            required
            defaultValue=""
            disabled={characters.length === 0}
            className="w-full border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-15100d))] px-2 py-2 text-xs text-[rgb(var(--sep-colour-d7c4a5))] outline-none disabled:opacity-50 components_orders_order_head_add_member_form_select_character_id"
          >
            <option className="components_orders_order_head_add_member_form_option_character_id" value="" disabled>
              {characters.length
                ? "Select character"
                : "No characters available"}
            </option>

            {characters.map((character) => (
              <option className="components_orders_order_head_add_member_form_option_option" key={character.id} value={character.id}>
                {character.display_name}
              </option>
            ))}
          </select>
        </label>

        <label className="components_orders_order_head_add_member_form_label_label_2">
          <span className="mb-1 block text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-756958))] components_orders_order_head_add_member_form_span_text_2">
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
            className="w-full border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-15100d))] px-2 py-2 text-xs text-[rgb(var(--sep-colour-d7c4a5))] outline-none components_orders_order_head_add_member_form_select_level_id"
          >
            {levels.map((level) => (
              <option className="components_orders_order_head_add_member_form_option_option_2" key={level.id} value={level.id}>
                Level {level.level}
              </option>
            ))}
          </select>
        </label>

        <label className="components_orders_order_head_add_member_form_label_label_3">
          <span className="mb-1 block text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-756958))] components_orders_order_head_add_member_form_span_text_3">
            Role
          </span>
          <select
            name="jobId"
            required
            value={jobId}
            onChange={(event) =>
              setJobId(event.target.value)
            }
            className="w-full border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-15100d))] px-2 py-2 text-xs text-[rgb(var(--sep-colour-d7c4a5))] outline-none components_orders_order_head_add_member_form_select_job_id"
          >
            <option className="components_orders_order_head_add_member_form_option_job_id" value="" disabled>
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
                <option className="components_orders_order_head_add_member_form_option_option_3"
                  key={job.id}
                  value={job.id}
                >
                  {job.name} — {before} · {after}
                </option>
              );
            })}
          </select>

          {selectedJob ? (
            <span className="mt-1.5 block text-[8px] leading-4 text-[rgb(var(--sep-colour-6f665a))] components_orders_order_head_add_member_form_span_text_4">
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

        <button
          type="submit"
          disabled={!characters.length || !levelId || !jobId}
          className="border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-4 py-2 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-efd6a8))] disabled:cursor-not-allowed disabled:opacity-40 components_orders_order_head_add_member_form_button_add_member"
        >
          Add member
        </button>
      </div>
    </InlineActionForm>
  );
}
