"use client";

import { useState } from "react";

export function TakeLeaveButton() {
  const [leaving, setLeaving] =
    useState(false);

  async function takeLeave() {
    if (leaving) {
      return;
    }

    setLeaving(true);

    try {
      const response =
        await fetch(
          "/api/game/leave-location",
          {
            method: "POST",
            credentials:
              "same-origin",
            cache: "no-store",
          },
        );

      const result =
        (await response.json()) as {
          ok?: boolean;
          message?: string;
        };

      if (
        !response.ok ||
        result.ok !== true
      ) {
        throw new Error(
          result.message ??
            "Unable to take leave from this Location.",
        );
      }

      window.location.assign(
        "/?map=sepulchria",
      );
    } catch (error) {
      console.error(
        "Unable to take leave:",
        error,
      );

      setLeaving(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() =>
        void takeLeave()
      }
      disabled={leaving}
      title="Take Leave"
      aria-label="Take Leave"
      className="flex h-6 min-w-6 items-center justify-center border border-[rgb(var(--sep-colour-8f3f36))] bg-[rgb(var(--sep-colour-351714))] px-1 text-[8px] uppercase text-[rgb(var(--sep-colour-e6a097))] transition hover:border-[rgb(var(--sep-colour-c65a4d))] hover:text-[rgb(var(--sep-colour-ffd0c9))] disabled:cursor-not-allowed disabled:opacity-40 game_components_roomchatform_button_take_leave"
    >
      {leaving ? (
        <span className="px-1">
          Leaving...
        </span>
      ) : (
        <span
          className="game_components_roomchatform_span_take_leave"
          aria-hidden="true"
        >
          ↪
        </span>
      )}
    </button>
  );
}
