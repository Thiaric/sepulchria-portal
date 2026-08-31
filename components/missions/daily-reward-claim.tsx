"use client";

import {
  useActionState,
  useEffect,
  useState,
} from "react";

import type {
  DailyRewardClaimState,
} from "@/app/(portal)/missions/actions";

const initialState: DailyRewardClaimState = {
  success: false,
  message: "",
};

function rewardText({
  remnants,
  itemName,
  itemQuantity,
}: {
  remnants: number;
  itemName: string | null;
  itemQuantity: number;
}) {
  const parts: string[] = [];

  if (remnants > 0) {
    parts.push(`${remnants} Remnants`);
  }

  if (itemName && itemQuantity > 0) {
    parts.push(`${itemQuantity} × ${itemName}`);
  }

  return parts.join(" · ");
}

export function DailyRewardClaim({
  action,
  claimField,
  claimId,
  complete,
  claimed,
  remnants,
  itemName,
  itemQuantity,
  compact = false,
}: {
  action: (
    previousState: DailyRewardClaimState,
    formData: FormData,
  ) => Promise<DailyRewardClaimState>;
  claimField: "assignment_id" | "claim_id";
  claimId: string;
  complete: boolean;
  claimed: boolean;
  remnants: number;
  itemName: string | null;
  itemQuantity: number;
  compact?: boolean;
}) {
  const [state, formAction, pending] =
    useActionState(
      action,
      initialState,
    );

  const [showMessage, setShowMessage] = useState(false);

useEffect(() => {
  if (!state.message) return;

  setShowMessage(true);

  if (state.success) {
    window.dispatchEvent(
      new CustomEvent(
        "sepulchria:notifications-changed",
      ),
    );
  }

  const timer = window.setTimeout(() => {
    setShowMessage(false);
  }, 5000);

  return () => {
    window.clearTimeout(timer);
  };
}, [state]);

  const reward = rewardText({
    remnants,
    itemName,
    itemQuantity,
  });

  const dataProps =
    claimField === "assignment_id"
      ? { "data-mission-claim": true }
      : { "data-milestone-claim": true };

  return (
    <form
      action={formAction}
      className={
        compact ? "" : "mt-3"
      }
    >
      <input
        type="hidden"
        name={claimField}
        value={claimId}
      />

      <button
        {...dataProps}
        type="submit"
        disabled={
          !complete ||
          claimed ||
          pending
        }
        className={[
          compact
            ? "px-3 py-2 text-[9px] uppercase tracking-[0.14em]"
            : "w-full px-3 py-2 text-[10px] uppercase tracking-[0.16em]",
          complete && !claimed
            ? "border border-[rgb(var(--sep-colour-d19a4c))] bg-[rgb(var(--sep-colour-50371f))] font-semibold text-[rgb(var(--sep-colour-ffe4b5))] shadow-[0_0_14px_rgba(var(--sep-rgb-209-154-76),0.22)] transition hover:border-[rgb(var(--sep-colour-e0b062))] hover:bg-[rgb(var(--sep-colour-654321))]"
            : "border border-[rgb(var(--sep-colour-765937))]/65 bg-[rgb(var(--sep-colour-21170f))] text-[rgb(var(--sep-colour-d9c092))] transition-colors disabled:cursor-not-allowed disabled:opacity-45",
        ].join(" ")}
      >
        {pending
          ? "Claiming..."
          : claimed
            ? "Claimed"
            : complete
              ? compact
                ? "Claim"
                : "Claim Reward"
              : "In Progress"}
      </button>

      {state.message && showMessage ? (
        <p
          role="status"
          aria-live="polite"
          className={[
            compact
              ? "mt-2 max-w-[290px] text-right"
              : "mt-2 text-center",
            "text-[9px] leading-4",
            state.success
              ? "text-[rgb(var(--sep-colour-d8bf91))]"
              : "text-red-300",
          ].join(" ")}
        >
          {state.success ? "✦ " : ""}
          {state.success && reward
            ? `Reward received — ${reward}.`
            : state.message}
        </p>
      ) : null}
    </form>
  );
}
