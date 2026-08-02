"use client";

import { useState } from "react";

type CharacterStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "rejected";

type CharacterReviewFieldsProps = {
  initialStatus: CharacterStatus;
  initialRejectionReason: string | null;
};

export function CharacterReviewFields({
  initialStatus,
  initialRejectionReason,
}: CharacterReviewFieldsProps) {
  const [status, setStatus] =
    useState<CharacterStatus>(initialStatus);

  const rejectionRequired =
    status === "rejected";

  return (
    <>
      <label className="block">
        <span className="mb-2 block text-[8px] uppercase tracking-[0.22em] text-[#806b50]">
          Status
        </span>

        <select
          name="status"
          value={status}
          onChange={(event) =>
            setStatus(
              event.target.value as CharacterStatus,
            )
          }
          className="w-full border border-[#60482e]/55 bg-[#100c09] px-3 py-3 text-sm text-[#d7c4a5] outline-none focus:border-[#a17a49]"
        >
          <option value="draft">Draft</option>
          <option value="submitted">Submitted</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </label>

      <label className="block">
        <span className="mb-2 flex items-center gap-2 text-[8px] uppercase tracking-[0.22em] text-[#806b50]">
          Rejection reason
          <span
            className={
              rejectionRequired
                ? "text-[#cf766b]"
                : "text-[#5f5548]"
            }
          >
            {rejectionRequired
              ? "Required"
              : "Optional"}
          </span>
        </span>

        <textarea
          name="rejectionReason"
          defaultValue={
            initialRejectionReason ?? ""
          }
          required={rejectionRequired}
          aria-required={rejectionRequired}
          maxLength={5000}
          rows={5}
          placeholder={
            rejectionRequired
              ? "Explain what must be corrected before rejecting the sheet."
              : "Only required when the selected status is Rejected."
          }
          className={`w-full resize-y border bg-[#100c09] px-3 py-3 text-sm leading-6 text-[#d7c4a5] outline-none placeholder:text-[#625747] ${
            rejectionRequired
              ? "border-[#8b443b]/80 focus:border-[#cf766b]"
              : "border-[#60482e]/55 focus:border-[#a17a49]"
          }`}
        />

        {rejectionRequired ? (
          <span className="mt-2 block text-[10px] leading-5 text-[#a98782]">
            A reason must be entered before this
            character can be rejected.
          </span>
        ) : null}
      </label>
    </>
  );
}
