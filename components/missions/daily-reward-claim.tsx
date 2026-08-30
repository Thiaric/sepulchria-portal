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
            ? "border border-[rgb(var(--sep-colour-765937))]/65 bg-[rgb(var(--sep-colour-21170f))] px-3 py-2 text-[9px] uppercase tracking-[0.14em]"
            : "w-full border border-[rgb(var(--sep-colour-765937))]/65 bg-[rgb(var(--sep-colour-21170f))] px-3 py-2 text-[10px] uppercase tracking-[0.16em]",
          "text-[rgb(var(--sep-colour-d9c092))] transition-colors enabled:hover:border-[rgb(var(--sep-colour-a07945))] enabled:hover:bg-[rgb(var(--sep-colour-302116))] disabled:cursor-not-allowed disabled:opacity-45",
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
