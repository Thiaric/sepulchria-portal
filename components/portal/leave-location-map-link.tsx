"use client";

import {
  useState,
  type ReactNode,
} from "react";
type LeaveLocationMapLinkProps = {
  href: "/" | "/?map=sepulchria";
  className?: string;
  title?: string;
  ariaLabel?: string;
  children: ReactNode;
};

export function LeaveLocationMapLink({
  href,
  className,
  title,
  ariaLabel,
  children,
}: LeaveLocationMapLinkProps) {
  const [
    leaving,
    setLeaving,
  ] = useState(false);

  async function handleClick() {
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
            cache: "no-store",
            headers: {
              "Content-Type":
                "application/json",
            },
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
            "Unable to leave the current Location.",
        );
      }

      /*
       * Important:
       * Do NOT use a redirecting Server Action here.
       *
       * The room is cleared through the API first while /game remains
       * untouched, then client navigation moves directly to the map.
       * This prevents /game from re-rendering with current_room_id = null
       * and showing its "Entering Sepulchria..." Suspense fallback.
       */
      window.location.assign(
        href,
      );
    } catch (error) {
      console.error(
        "Unable to leave Location for map navigation:",
        error,
      );

      setLeaving(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() =>
        void handleClick()
      }
      disabled={leaving}
      title={title}
      aria-label={
        ariaLabel
      }
      className={
        className
      }
    >
      {children}
    </button>
  );
}
