"use client";

import { useEffect } from "react";

import { markApprovalNoticeSeen } from "@/app/(portal)/character/actions";

export function ApprovalNotice() {
  useEffect(() => {
    void markApprovalNoticeSeen();
  }, []);

  return (
    <section className="mb-6 border border-[rgb(var(--sep-colour-486b49))]/70 bg-[rgb(var(--sep-colour-17271a))]/75 p-5">
      <p className="text-[9px] uppercase tracking-[0.25em] text-[rgb(var(--sep-colour-89b58b))]">
        Character approved
      </p>

      <h2 className="mt-2 font-serif text-2xl text-[rgb(var(--sep-colour-cce2c4))]">
        You are ready to enter Sepulchria
      </h2>

      <p className="mt-3 text-sm leading-6 text-[rgb(var(--sep-colour-9fb39c))]">
        Your character has been approved by the
        staff. You may now enter the city and begin
        playing.
      </p>
    </section>
  );
}