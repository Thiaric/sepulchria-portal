"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  CharacterAuditTrailClient,
  type CharacterAuditDisplayRow,
} from "@/components/characters/character-audit-trail-client";

type LoadState =
  | "idle"
  | "loading"
  | "loaded"
  | "error";

export function CharacterAuditTrail({
  characterId,
  staffView = false,
}: {
  characterId: string;
  staffView?: boolean;
}) {
  const [state, setState] =
    useState<LoadState>("idle");

  const [rows, setRows] =
    useState<
      CharacterAuditDisplayRow[]
    >([]);

  const [errorMessage, setErrorMessage] =
    useState("");

  const load = useCallback(
    async () => {
      if (
        state === "loading" ||
        state === "loaded"
      ) {
        return;
      }

      setState("loading");
      setErrorMessage("");

      try {
        const params =
          new URLSearchParams({
            characterId,
            staffView:
              staffView
                ? "1"
                : "0",
          });

        const response =
          await fetch(
            `/api/character-audit?${params.toString()}`,
            {
              method: "GET",
              credentials:
                "same-origin",
              cache: "no-store",
            },
          );

        if (!response.ok) {
          throw new Error(
            `Character Log request failed (${response.status}).`,
          );
        }

        const payload =
          (await response.json()) as {
            rows?:
              CharacterAuditDisplayRow[];
          };

        setRows(
          payload.rows ?? [],
        );
        setState("loaded");
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to load Character Log.",
        );
        setState("error");
      }
    },
    [
      characterId,
      staffView,
      state,
    ],
  );

  useEffect(() => {
    function handleTab(
      event: Event,
    ) {
      const customEvent =
        event as CustomEvent<string>;

      if (
        customEvent.detail ===
        "audit"
      ) {
        void load();
      }
    }

    window.addEventListener(
      "sepulchria-character-sheet-tab",
      handleTab,
    );

    return () => {
      window.removeEventListener(
        "sepulchria-character-sheet-tab",
        handleTab,
      );
    };
  }, [load]);

  return (
    <section className="border border-[rgb(var(--sep-colour-6b5032))]/50 bg-[rgb(var(--sep-colour-17110d))] p-4 sm:p-5">
      <div className="border-b border-[rgb(var(--sep-colour-5d452d))]/35 pb-4">
        <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-806b50))]">
          Character history
        </p>

        <h2 className="mt-1 font-serif text-2xl text-[rgb(var(--sep-colour-dfc79c))]">
          Character Log
        </h2>

        <p className="mt-2 text-[10px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">
          Permanent history of recorded material changes to this Character, newest first.
        </p>
      </div>

      {state === "idle" ? (
        <p className="py-6 text-sm text-[rgb(var(--sep-colour-8f8271))]">
          Open this tab to load the Character Log.
        </p>
      ) : null}

      {state === "loading" ? (
        <p className="py-6 text-sm text-[rgb(var(--sep-colour-8f8271))]">
          Loading Character Log…
        </p>
      ) : null}

      {state === "error" ? (
        <div className="py-6">
          <p className="text-sm text-red-300">
            {errorMessage}
          </p>

          <button
            type="button"
            onClick={() => {
              setState("idle");
              window.setTimeout(
                () => {
                  void load();
                },
                0,
              );
            }}
            className="mt-3 border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-18110d))] px-3 py-2 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-ae9a7b))]"
          >
            Retry
          </button>
        </div>
      ) : null}

      {state === "loaded" ? (
        <CharacterAuditTrailClient
          rows={rows}
          staffView={staffView}
        />
      ) : null}
    </section>
  );
}
