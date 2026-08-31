"use client";

import {
  useCallback,
  useEffect,
} from "react";

const POLL_HASH =
  /^#poll-([0-9a-f-]{36})$/i;

export function PollSeenMarker() {
  const mark =
    useCallback(
      async (
        pollId: string,
      ) => {
        try {
          const response =
            await fetch(
              "/api/polls/unread",
              {
                method: "POST",
                headers: {
                  "content-type":
                    "application/json",
                },
                body:
                  JSON.stringify({
                    pollId,
                  }),
              },
            );

          if (!response.ok) {
            return;
          }

          const payload =
            await response.json();

          if (
            payload?.marked ===
            true
          ) {
            document
              .getElementById(
                `poll-${pollId}`,
              )
              ?.setAttribute(
                "data-public-poll-new",
                "false",
              );

            window.dispatchEvent(
              new Event(
                "sepulchria:poll-unread-changed",
              ),
            );
          }
        } catch (error) {
          console.error(
            "Unable to mark Poll as seen:",
            error,
          );
        }
      },
      [],
    );

  useEffect(() => {
    const markHash =
      () => {
        const match =
          window.location.hash.match(
            POLL_HASH,
          );

        if (match?.[1]) {
          void mark(
            match[1],
          );
        }
      };

    const handleOpenPoll = (
      event: Event,
    ) => {
      const pollId =
        (
          event as CustomEvent<{
            pollId?: string;
          }>
        ).detail?.pollId;

      if (pollId) {
        void mark(pollId);
      }
    };

    markHash();

    window.addEventListener(
      "hashchange",
      markHash,
    );

    window.addEventListener(
      "sepulchria:open-poll",
      handleOpenPoll,
    );

    return () => {
      window.removeEventListener(
        "hashchange",
        markHash,
      );

      window.removeEventListener(
        "sepulchria:open-poll",
        handleOpenPoll,
      );
    };
  }, [mark]);

  return null;
}
