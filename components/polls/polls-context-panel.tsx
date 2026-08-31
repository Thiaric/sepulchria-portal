"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

type PollContextEntry = {
  id: string;
  title: string;
  description: string;
  state:
    | "open"
    | "closed"
    | "upcoming";
  voted: boolean;
  isNew: boolean;
};

function readPollsFromPage():
  PollContextEntry[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>(
      "[data-public-poll-id]",
    ),
  ).map((node) => ({
    id:
      node.dataset.publicPollId ??
      "",
    title:
      node.dataset.publicPollTitle ??
      "Untitled Poll",
    description:
      node.dataset
        .publicPollDescription ??
      "",
    state:
      (
        node.dataset.publicPollState ??
        "upcoming"
      ) as PollContextEntry["state"],
    voted:
      node.dataset.publicPollVoted ===
      "true",
    isNew:
      node.dataset.publicPollNew ===
      "true",
  }));
}

export function PollsContextPanel() {
  const [entries, setEntries] =
    useState<PollContextEntry[]>([]);

  const [search, setSearch] =
    useState("");

  const [state, setState] =
    useState<
      "all" |
      "open" |
      "closed" |
      "upcoming"
    >("all");

  useEffect(() => {
    const refresh = () => {
      setEntries(
        readPollsFromPage(),
      );
    };

    refresh();

    const frame =
      window.requestAnimationFrame(
        refresh,
      );

    const observer =
      new MutationObserver(
        refresh,
      );

    observer.observe(
      document.body,
      {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: [
          "data-public-poll-state",
          "data-public-poll-voted",
          "data-public-poll-new",
          "data-public-poll-title",
          "data-public-poll-description",
        ],
      },
    );

    window.addEventListener(
      "focus",
      refresh,
    );

    return () => {
      window.cancelAnimationFrame(
        frame,
      );
      observer.disconnect();
      window.removeEventListener(
        "focus",
        refresh,
      );
    };
  }, []);

  const query =
    search
      .trim()
      .toLocaleLowerCase();

  const visibleEntries =
    useMemo(
      () =>
        entries.filter(
          (entry) => {
            if (
              state !== "all" &&
              entry.state !== state
            ) {
              return false;
            }

            if (!query) {
              return true;
            }

            return [
              entry.title,
              entry.description,
              entry.state,
              entry.voted
                ? "voted"
                : "not voted",
            ]
              .join(" ")
              .toLocaleLowerCase()
              .includes(query);
          },
        ),
      [
        entries,
        query,
        state,
      ],
    );

  function jumpToPoll(
    id: string,
  ) {
    const target =
      document.getElementById(
        `poll-${id}`,
      );

    if (!target) return;

    target.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });

    history.replaceState(
      null,
      "",
      `#poll-${id}`,
    );

    window.dispatchEvent(
      new CustomEvent(
        "sepulchria:open-poll",
        {
          detail: {
            pollId: id,
          },
        },
      ),
    );

    const oldOutline =
      target.style.outline;
    const oldOffset =
      target.style.outlineOffset;
    const oldShadow =
      target.style.boxShadow;
    const oldTransform =
      target.style.transform;

    target.style.outline =
      "1px solid rgb(var(--sep-colour-8d6d3e))";
    target.style.outlineOffset =
      "3px";
    target.style.boxShadow =
      "0 0 20px rgba(var(--sep-rgb-177-132-75),0.17)";
    target.style.transform =
      "translateY(-1px)";

    window.setTimeout(() => {
      target.style.outline =
        oldOutline;
      target.style.outlineOffset =
        oldOffset;
      target.style.boxShadow =
        oldShadow;
      target.style.transform =
        oldTransform;
    }, 1200);
  }

  const counts = {
    open:
      entries.filter(
        (entry) =>
          entry.state === "open",
      ).length,
    closed:
      entries.filter(
        (entry) =>
          entry.state === "closed",
      ).length,
    upcoming:
      entries.filter(
        (entry) =>
          entry.state === "upcoming",
      ).length,
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-806b50))]">
        Community Polls
      </p>

      <h2 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-d8bf91))]">
        Find a Poll
      </h2>

      <p className="mt-2 text-[11px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">
        Search the Polls available
        to you and jump directly
        to the question you want
        to review or answer.
      </p>

      <input
        type="search"
        value={search}
        onChange={(event) =>
          setSearch(
            event.target.value,
          )
        }
        placeholder="Search Polls..."
        aria-label="Search Polls"
        className="mt-4 w-full border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-xs text-[rgb(var(--sep-colour-d4bea0))] outline-none transition placeholder:text-[rgb(var(--sep-colour-665b4d))] focus:border-[rgb(var(--sep-colour-987344))] focus:shadow-[0_0_14px_rgba(var(--sep-rgb-177-132-75),0.12)]"
      />

      <div className="mt-2 grid grid-cols-4 gap-1">
        {(
          [
            [
              "all",
              "All",
              entries.length,
            ],
            [
              "open",
              "Open",
              counts.open,
            ],
            [
              "upcoming",
              "Upcoming",
              counts.upcoming,
            ],
            [
              "closed",
              "Closed",
              counts.closed,
            ],
          ] as const
        ).map(
          ([
            value,
            label,
            count,
          ]) => (
            <button
              key={value}
              type="button"
              onClick={() =>
                setState(value)
              }
              className={[
                "min-w-0 border px-1 py-1.5 text-[6px] uppercase tracking-[0.06em] transition duration-150",
                state === value
                  ? "border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-332719))] text-[rgb(var(--sep-colour-efd9aa))] shadow-[0_0_10px_rgba(var(--sep-rgb-177-132-75),0.12)]"
                  : "border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-100c09))] text-[rgb(var(--sep-colour-8f806c))] hover:-translate-y-px hover:border-[rgb(var(--sep-colour-80613b))] hover:text-[rgb(var(--sep-colour-cbb28a))]",
              ].join(" ")}
            >
              <span className="block truncate">
                {label}
              </span>
              <span className="mt-0.5 block font-serif text-[9px] normal-case tracking-normal">
                {count}
              </span>
            </button>
          ),
        )}
      </div>

      <p className="mb-2 mt-4 text-[8px] uppercase tracking-[.18em] text-[rgb(var(--sep-colour-806b50))]">
        Polls ·{" "}
        {visibleEntries.length}
        {query ||
        state !== "all"
          ? ` / ${entries.length}`
          : ""}
      </p>

      <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
        {visibleEntries.length ? (
          visibleEntries.map(
            (entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() =>
                  jumpToPoll(
                    entry.id,
                  )
                }
                className={[
                  "group flex w-full items-center justify-between gap-3 border px-3 py-2.5 text-left transition duration-150 hover:-translate-y-px hover:translate-x-0.5 hover:shadow-[0_0_15px_rgba(var(--sep-rgb-177-132-75),0.13)]",
                  entry.isNew
                    ? "border-[rgb(var(--sep-colour-a87532))] bg-[rgb(var(--sep-colour-24190f))] shadow-[inset_0_0_12px_rgba(var(--sep-rgb-177-132-75),0.06)] hover:border-[rgb(var(--sep-colour-c0914e))] hover:bg-[rgb(var(--sep-colour-2d1d11))]"
                    : "border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))] hover:border-[rgb(var(--sep-colour-8a673f))] hover:bg-[rgb(var(--sep-colour-17110d))]",
                ].join(" ")}
              >
                <span className="min-w-0">
                  <span className="block truncate font-serif text-[13px] text-[rgb(var(--sep-colour-cbb28a))] transition group-hover:text-[rgb(var(--sep-colour-ead0a0))]">
                    {entry.title}
                  </span>

                  <span className="mt-0.5 block truncate text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-6f6252))]">
                    {entry.isNew
                      ? "New · "
                      : ""}
                    {entry.state}
                    {" · "}
                    {entry.voted
                      ? "Voted"
                      : entry.state ===
                          "open"
                        ? "Awaiting your vote"
                        : "Not voted"}
                  </span>
                </span>

                <span className="shrink-0 text-[rgb(var(--sep-colour-725a3d))] transition duration-150 group-hover:translate-x-1 group-hover:text-[rgb(var(--sep-colour-c89b5d))]">
                  →
                </span>
              </button>
            ),
          )
        ) : (
          <p className="text-xs text-[rgb(var(--sep-colour-8f826f))]">
            No matching Polls.
          </p>
        )}
      </div>
    </div>
  );
}
