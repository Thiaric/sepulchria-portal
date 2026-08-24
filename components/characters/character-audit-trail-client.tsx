"use client";

import {
  useMemo,
  useState,
} from "react";

export type CharacterAuditDisplayRow = {
  id: string;
  event_type: string;
  entity_type: string;
  entity_id: string | null;
  actor_type: "player" | "staff" | "system";
  actor_label: string;
  actor_staff_role: string | null;
  source: string;
  changed_fields: string[];
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

const controlClass =
  "h-9 min-w-0 border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 text-[9px] text-[rgb(var(--sep-colour-d7c4a5))] outline-none placeholder:text-[rgb(var(--sep-colour-625747))] focus:border-[rgb(var(--sep-colour-9b7446))]";

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(date);
}

function eventLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    );
}

function pretty(value: unknown) {
  if (
    value === null ||
    value === undefined
  ) {
    return "—";
  }

  if (typeof value === "string") {
    return value;
  }

  return JSON.stringify(
    value,
    null,
    2,
  );
}

function dayValue(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date
    .toISOString()
    .slice(0, 10);
}

export function CharacterAuditTrailClient({
  rows,
  staffView,
}: {
  rows: CharacterAuditDisplayRow[];
  staffView: boolean;
}) {
  const [search, setSearch] =
    useState("");
  const [eventType, setEventType] =
    useState("");
  const [actorType, setActorType] =
    useState("");
  const [source, setSource] =
    useState("");
  const [fromDate, setFromDate] =
    useState("");
  const [toDate, setToDate] =
    useState("");

  const eventOptions =
    useMemo(
      () =>
        Array.from(
          new Set(
            rows.map(
              (row) =>
                row.event_type,
            ),
          ),
        ).sort(),
      [rows],
    );

  const sourceOptions =
    useMemo(
      () =>
        Array.from(
          new Set(
            rows
              .map(
                (row) =>
                  row.source,
              )
              .filter(Boolean),
          ),
        ).sort(),
      [rows],
    );

  const filteredRows =
    useMemo(() => {
      const needle =
        search
          .trim()
          .toLowerCase();

      return rows.filter(
        (row) => {
          if (
            eventType &&
            row.event_type !==
              eventType
          ) {
            return false;
          }

          if (
            actorType &&
            row.actor_type !==
              actorType
          ) {
            return false;
          }

          if (
            source &&
            row.source !== source
          ) {
            return false;
          }

          const rowDay =
            dayValue(
              row.created_at,
            );

          if (
            fromDate &&
            rowDay < fromDate
          ) {
            return false;
          }

          if (
            toDate &&
            rowDay > toDate
          ) {
            return false;
          }

          if (!needle) {
            return true;
          }

          const haystack = [
            row.event_type,
            row.entity_type,
            row.entity_id,
            row.actor_label,
            row.actor_staff_role,
            row.source,
            ...(row.changed_fields ??
              []),
            JSON.stringify(
              row.old_values ?? {},
            ),
            JSON.stringify(
              row.new_values ?? {},
            ),
            staffView
              ? JSON.stringify(
                  row.metadata ?? {},
                )
              : "",
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return haystack.includes(
            needle,
          );
        },
      );
    }, [
      rows,
      search,
      eventType,
      actorType,
      source,
      fromDate,
      toDate,
      staffView,
    ]);

  const hasFilters =
    Boolean(
      search ||
        eventType ||
        actorType ||
        source ||
        fromDate ||
        toDate,
    );

  function resetFilters() {
    setSearch("");
    setEventType("");
    setActorType("");
    setSource("");
    setFromDate("");
    setToDate("");
  }

  return (
    <>
      <div className="mt-4 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-3">
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          <input
            type="search"
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value,
              )
            }
            placeholder="Search Character Log..."
            className={controlClass}
          />

          <select
            value={eventType}
            onChange={(event) =>
              setEventType(
                event.target.value,
              )
            }
            className={controlClass}
          >
            <option value="">
              All events
            </option>

            {eventOptions.map(
              (value) => (
                <option
                  key={value}
                  value={value}
                >
                  {eventLabel(
                    value,
                  )}
                </option>
              ),
            )}
          </select>

          <select
            value={actorType}
            onChange={(event) =>
              setActorType(
                event.target.value,
              )
            }
            className={controlClass}
          >
            <option value="">
              All actors
            </option>
            <option value="player">
              Player
            </option>
            <option value="staff">
              Staff
            </option>
            <option value="system">
              System
            </option>
          </select>

          <select
            value={source}
            onChange={(event) =>
              setSource(
                event.target.value,
              )
            }
            className={controlClass}
          >
            <option value="">
              All sources
            </option>

            {sourceOptions.map(
              (value) => (
                <option
                  key={value}
                  value={value}
                >
                  {eventLabel(
                    value,
                  )}
                </option>
              ),
            )}
          </select>

          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={fromDate}
              onChange={(event) =>
                setFromDate(
                  event.target.value,
                )
              }
              title="From date"
              className={controlClass}
            />

            <input
              type="date"
              value={toDate}
              onChange={(event) =>
                setToDate(
                  event.target.value,
                )
              }
              title="To date"
              className={controlClass}
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            <p className="text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-716654))]">
              {filteredRows.length}
              {" / "}
              {rows.length}
              {" entries"}
            </p>

            <button
              type="button"
              onClick={
                resetFilters
              }
              disabled={!hasFilters}
              className="h-9 border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-18110d))] px-3 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-ae9a7b))] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Reset
            </button>
          </div>
        </div>

        <p className="mt-2 text-[8px] text-[rgb(var(--sep-colour-756958))]">
          Filters update immediately. No reload required.
        </p>
      </div>

      {filteredRows.length === 0 ? (
        <p className="py-6 text-sm text-[rgb(var(--sep-colour-8f8271))]">
          No Character Log entries match these filters.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {filteredRows.map(
            (row) => (
              <article
                key={row.id}
                className="border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-100c09))]"
              >
                <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-a17f52))]">
                      {eventLabel(
                        row.event_type,
                      )}
                    </p>

                    <p className="mt-1 text-[10px] text-[rgb(var(--sep-colour-b8a488))]">
                      {
                        row.actor_label
                      }
                    </p>

                    {staffView ? (
                      <p className="mt-1 break-words text-[8px] text-[rgb(var(--sep-colour-706658))]">
                        {
                          row.entity_type
                        }
                        {row.entity_id
                          ? ` · ${row.entity_id}`
                          : ""}
                        {row.source
                          ? ` · ${row.source}`
                          : ""}
                      </p>
                    ) : null}
                  </div>

                  <time
                    dateTime={
                      row.created_at
                    }
                    className="text-right text-[9px] text-[rgb(var(--sep-colour-8c7c67))]"
                  >
                    {formatDateTime(
                      row.created_at,
                    )}
                  </time>
                </div>

                {row
                  .changed_fields
                  .length ? (
                  <div className="border-t border-[rgb(var(--sep-colour-59432c))]/30 px-4 py-2">
                    <p className="text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-756958))]">
                      Changed
                    </p>

                    <p className="mt-1 break-words text-[9px] text-[rgb(var(--sep-colour-ae9d83))]">
                      {row.changed_fields.join(
                        ", ",
                      )}
                    </p>
                  </div>
                ) : null}

                {row.old_values !==
                  null ||
                row.new_values !==
                  null ? (
                  <details className="border-t border-[rgb(var(--sep-colour-59432c))]/30">
                    <summary className="cursor-pointer px-4 py-2 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-a98d65))]">
                      Before / after
                    </summary>

                    <div className="grid gap-3 border-t border-[rgb(var(--sep-colour-59432c))]/25 p-4 lg:grid-cols-2">
                      <div>
                        <p className="text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-756958))]">
                          Before
                        </p>

                        <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-words text-[9px] leading-5 text-[rgb(var(--sep-colour-9f8d73))]">
                          {pretty(
                            row.old_values,
                          )}
                        </pre>
                      </div>

                      <div>
                        <p className="text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-756958))]">
                          After
                        </p>

                        <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-words text-[9px] leading-5 text-[rgb(var(--sep-colour-9f8d73))]">
                          {pretty(
                            row.new_values,
                          )}
                        </pre>
                      </div>
                    </div>

                    {staffView &&
                    row.metadata &&
                    Object.keys(
                      row.metadata,
                    ).length ? (
                      <div className="border-t border-[rgb(var(--sep-colour-59432c))]/25 p-4">
                        <p className="text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-756958))]">
                          Metadata
                        </p>

                        <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words text-[9px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">
                          {pretty(
                            row.metadata,
                          )}
                        </pre>
                      </div>
                    ) : null}
                  </details>
                ) : null}
              </article>
            ),
          )}
        </div>
      )}
    </>
  );
}
