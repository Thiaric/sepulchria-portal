"use client";

import { useEffect } from "react";

import { markApprovalNoticeSeen } from "@/app/(portal)/character/actions";

export function ApprovalNotice() {
  useEffect(() => {
    void markApprovalNoticeSeen();
  }, []);

  return (
    <section className="mb-6 border border-[#486b49]/70 bg-[#17271a]/75 p-5">
      <p className="text-[9px] uppercase tracking-[0.25em] text-[#89b58b]">
        Character approved
      </p>

      <h2 className="mt-2 font-serif text-2xl text-[#cce2c4]">
        You are ready to enter Sepulchria
      </h2>

      <p className="mt-3 text-sm leading-6 text-[#9fb39c]">
        Your character has been approved by the
        staff. You may now enter the city and begin
        playing.
      </p>
    </section>
  );
}