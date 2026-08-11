"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";

type JumpEntry = {
  id: string;
  label: string;
  secondary?: string;
  active?: boolean;
};

type ContextMode =
  | "areas"
  | "rooms"
  | "races"
  | "associations"
  | "users"
  | "characters"
  | "forum";

function getMode(
  pathname: string,
): ContextMode | null {
  if (pathname === "/admin/areas") {
    return "areas";
  }

  if (pathname === "/admin/rooms") {
    return "rooms";
  }

  if (pathname === "/admin/races") {
    return "races";
  }

  if (
    pathname ===
    "/admin/associations"
  ) {
    return "associations";
  }

  if (pathname === "/admin/users") {
    return "users";
  }

  if (
    pathname ===
    "/admin/characters"
  ) {
    return "characters";
  }

  if (
    pathname === "/admin/forum" ||
    pathname.startsWith(
      "/admin/forum/",
    )
  ) {
    return "forum";
  }

  return null;
}

export function AdminContextPanel({
  pathname,
}: {
  pathname: string;
}) {
  const mode =
    useMemo(
      () => getMode(pathname),
      [pathname],
    );

  if (!mode) {
    return null;
  }

  if (mode === "forum") {
    return (
      <ForumModerationContext />
    );
  }

  return (
    <AdminRecordJumpContext
      mode={mode}
    />
  );
}

function AdminRecordJumpContext({
  mode,
}: {
  mode: Exclude<
    ContextMode,
    "forum"
  >;
}) {
  const [entries, setEntries] =
    useState<JumpEntry[]>([]);
  const [loading, setLoading] =
    useState(true);
  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const supabase =
        createClient();

      try {
        let next: JumpEntry[] =
          [];

        if (mode === "areas") {
          const { data, error } =
            await supabase
              .from("areas")
              .select(
                "id, name, slug, is_active, sort_order",
              )
              .order(
                "sort_order",
                {
                  ascending: true,
                },
              )
              .order("name");

          if (error) {
            throw error;
          }

          next = (data ?? []).map(
            (row) => ({
              id: String(row.id),
              label: String(
                row.name,
              ),
              secondary: String(
                row.slug,
              ),
              active:
                row.is_active ===
                true,
            }),
          );
        }

        if (mode === "rooms") {
          const { data, error } =
            await supabase
              .from("rooms")
              .select(
                "id, name, slug, is_active, sort_order, area:areas(name)",
              )
              .order(
                "sort_order",
                {
                  ascending: true,
                },
              )
              .order("name");

          if (error) {
            throw error;
          }

          next = (data ?? []).map(
            (row) => {
              const area =
                Array.isArray(
                  row.area,
                )
                  ? row.area[0]
                  : row.area;

              return {
                id: String(row.id),
                label: String(
                  row.name,
                ),
                secondary:
                  area &&
                  typeof area ===
                    "object" &&
                  "name" in area
                    ? String(
                        area.name,
                      )
                    : String(
                        row.slug,
                      ),
                active:
                  row.is_active ===
                  true,
              };
            },
          );
        }

        if (mode === "races") {
          const { data, error } =
            await supabase
              .from("races")
              .select(
                "id, name, slug, is_active, sort_order",
              )
              .order(
                "sort_order",
                {
                  ascending: true,
                },
              )
              .order("name");

          if (error) {
            throw error;
          }

          next = (data ?? []).map(
            (row) => ({
              id: String(row.id),
              label: String(
                row.name,
              ),
              secondary: String(
                row.slug,
              ),
              active:
                row.is_active ===
                true,
            }),
          );
        }

        if (
          mode ===
          "associations"
        ) {
          const { data, error } =
            await supabase
              .from(
                "associations",
              )
              .select(
                "id, name, slug, is_active, sort_order",
              )
              .order(
                "sort_order",
                {
                  ascending: true,
                },
              )
              .order("name");

          if (error) {
            throw error;
          }

          next = (data ?? []).map(
            (row) => ({
              id: String(row.id),
              label: String(
                row.name,
              ),
              secondary: String(
                row.slug,
              ),
              active:
                row.is_active ===
                true,
            }),
          );
        }

        if (mode === "users") {
          const { data, error } =
            await supabase.rpc(
              "list_admin_users",
            );

          if (error) {
            throw error;
          }

          next = (
            (data ?? []) as Array<{
              user_id: string;
              email:
                | string
                | null;
              staff_role:
                | string
                | null;
            }>
          ).map((row) => ({
            id: row.user_id,
            label:
              row.email ??
              "Email unavailable",
            secondary:
              row.staff_role ??
              "Player",
          }));
        }

        if (
          mode === "characters"
        ) {
          const { data, error } =
            await supabase
              .from("characters")
              .select(
                "id, first_name, surname, display_name, status, updated_at",
              )
              .order(
                "updated_at",
                {
                  ascending: false,
                },
              );

          if (error) {
            throw error;
          }

          next = (data ?? []).map(
            (row) => ({
              id: String(row.id),
              label:
                String(
                  row.display_name ??
                    "",
                ).trim() ||
                `${String(
                  row.first_name ??
                    "",
                )} ${String(
                  row.surname ?? "",
                )}`.trim() ||
                "Unnamed character",
              secondary: String(
                row.status ??
                  "draft",
              ),
            }),
          );
        }

        if (!cancelled) {
          setEntries(next);
          setError(null);
          setLoading(false);
        }
      } catch (caught) {
        if (!cancelled) {
          setError(
            caught instanceof Error
              ? caught.message
              : "Unable to load records.",
          );
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [mode]);

  const title =
    mode === "rooms"
      ? "Locations"
      : mode === "races"
        ? "Ancestries"
        : mode ===
            "associations"
          ? "Associations"
          : mode ===
              "characters"
            ? "Characters"
            : mode ===
                "users"
              ? "Users"
              : "Areas";

  function jumpTo(
    entry: JumpEntry,
  ) {
    let target:
      | HTMLElement
      | null = null;

    if (mode === "races") {
      target =
        document.getElementById(
          `race-${entry.secondary}`,
        );
    } else if (
      mode === "associations"
    ) {
      target =
        document.getElementById(
          `association-${entry.secondary}`,
        );
    } else if (
      mode === "areas"
    ) {
      target =
        document
          .querySelector<HTMLInputElement>(
            `input[name="areaId"][value="${CSS.escape(
              entry.id,
            )}"]`,
          )
          ?.closest<HTMLElement>(
            "section",
          ) ?? null;
    } else if (
      mode === "rooms"
    ) {
      target =
        document
          .querySelector<HTMLInputElement>(
            `input[name="roomId"][value="${CSS.escape(
              entry.id,
            )}"]`,
          )
          ?.closest<HTMLElement>(
            "section",
          ) ?? null;
    } else if (
      mode === "users"
    ) {
      target =
        document
          .querySelector<HTMLInputElement>(
            `input[name="userId"][value="${CSS.escape(
              entry.id,
            )}"]`,
          )
          ?.closest<HTMLElement>(
            "section",
          ) ?? null;
    } else if (
      mode === "characters"
    ) {
      const link =
        document.querySelector<HTMLAnchorElement>(
          `a[href="/admin/characters/${CSS.escape(
            entry.id,
          )}"]`,
        );

      target =
        link?.closest<HTMLElement>(
          "article, section",
        ) ?? null;

      if (!target) {
        window.location.href =
          `/admin/characters/${entry.id}`;
        return;
      }
    }

    if (!target) {
      return;
    }

    target.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function jumpToConnections() {
    document
      .getElementById(
        "room-connections",
      )
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
  }

  function jumpToCreate() {
    if (mode === "races") {
      document
        .getElementById(
          "race-new",
        )
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      return;
    }

    if (
      mode === "associations"
    ) {
      document
        .getElementById(
          "association-new",
        )
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      return;
    }

    const firstSection =
      document.querySelector<HTMLElement>(
        ".admin-compact main section",
      );

    firstSection?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <p className="text-[8px] uppercase tracking-[0.24em] text-[#806b50]">
        Administration
      </p>

      <h2 className="mt-1 font-serif text-xl text-[#d8bf91]">
        Jump to {title}
      </h2>

      <p className="mt-2 text-[11px] leading-5 text-[#8f8271]">
        Jump directly to the
        record you want to work
        on.
      </p>

      {![
        "users",
        "characters",
      ].includes(mode) ? (
        <button
          type="button"
          onClick={jumpToCreate}
          className="mt-3 flex w-full items-center justify-between border border-[#765937]/55 bg-[#271c12] px-3 py-2.5 text-left text-[9px] uppercase tracking-[0.16em] text-[#d6b37d] transition hover:border-[#9a7445] hover:bg-[#342318]"
        >
          <span>
            Create new
          </span>
          <span>+</span>
        </button>
      ) : null}

      {error ? (
        <p className="mt-3 border border-[#743d35] bg-[#2a1512] p-2.5 text-[10px] leading-5 text-[#d8a49a]">
          {error}
        </p>
      ) : null}

      <div className="mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
        {loading ? (
          <div className="space-y-2">
            {Array.from({
              length: 6,
            }).map(
              (_, index) => (
                <div
                  key={index}
                  className="h-10 animate-pulse border border-[#59432c]/30 bg-[#19120d]"
                />
              ),
            )}
          </div>
        ) : (
          <div className="space-y-1.5">
            {entries.map(
              (entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() =>
                    jumpTo(entry)
                  }
                  className="group flex w-full items-center justify-between gap-2 border border-[#59432c]/40 bg-[#100c09] px-3 py-2 text-left transition hover:border-[#8d693e] hover:bg-[#1d150f]"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-serif text-[13px] text-[#cbb28a] group-hover:text-[#ead0a0]">
                      {entry.label}
                    </span>

                    {entry.secondary ? (
                      <span className="mt-0.5 block truncate text-[8px] uppercase tracking-[0.12em] text-[#6f6252]">
                        {
                          entry.secondary
                        }
                      </span>
                    ) : null}
                  </span>

                  {typeof entry.active ===
                  "boolean" ? (
                    <span
                      title={
                        entry.active
                          ? "Active"
                          : "Inactive"
                      }
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                        entry.active
                          ? "bg-emerald-600"
                          : "bg-[#66594b]"
                      }`}
                    />
                  ) : (
                    <span className="shrink-0 text-[10px] text-[#725a3d]">
                      ↓
                    </span>
                  )}
                </button>
              ),
            )}
          </div>
        )}

        {!loading &&
        !error &&
        entries.length === 0 ? (
          <p className="border border-[#59432c]/30 bg-[#100c09]/60 p-3 text-[11px] text-[#8f8271]">
            No records found.
          </p>
        ) : null}
      </div>

      {mode === "rooms" ? (
        <div className="mt-3 shrink-0 border-t border-[#59432c]/35 pt-3">
          <p className="text-[8px] uppercase tracking-[0.2em] text-[#806b50]">
            Connections
          </p>

          <button
            type="button"
            onClick={jumpToConnections}
            className="mt-2 flex w-full items-center justify-between border border-[#765937]/55 bg-[#271c12] px-3 py-2.5 text-left transition hover:border-[#9a7445] hover:bg-[#342318]"
          >
            <span>
              <span className="block font-serif text-[13px] text-[#d6b37d]">
                Room connections
              </span>

              <span className="mt-0.5 block text-[8px] uppercase tracking-[0.12em] text-[#6f6252]">
                Existing paths
              </span>
            </span>

            <span className="shrink-0 text-[11px] text-[#8d693e]">
              ↓
            </span>
          </button>
        </div>
      ) : null}
    </div>
  );
}

type ModerationLog = {
  id: string;
  action: string;
  created_at: string;
  details:
    | Record<
        string,
        unknown
      >
    | null;
};

function ForumModerationContext() {
  const [logs, setLogs] =
    useState<ModerationLog[]>(
      [],
    );
  const [loading, setLoading] =
    useState(true);
  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const supabase =
        createClient();

      const { data, error } =
        await supabase
          .from(
            "forum_moderation_log",
          )
          .select(
            "id, action, created_at, details",
          )
          .order(
            "created_at",
            {
              ascending: false,
            },
          )
          .limit(12);

      if (cancelled) {
        return;
      }

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      setLogs(
        (data ??
          []) as ModerationLog[],
      );
      setError(null);
      setLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  function formatAction(
    value: string,
  ) {
    return value
      .replace(/_/g, " ")
      .replace(
        /\b\w/g,
        (letter) =>
          letter.toUpperCase(),
      );
  }

  function formatDate(
    value: string,
  ) {
    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime(),
      )
    ) {
      return value;
    }

    return new Intl.DateTimeFormat(
      "en-GB",
      {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      },
    ).format(date);
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <p className="text-[8px] uppercase tracking-[0.24em] text-amber-500">
        Forum administration
      </p>

      <h2 className="mt-1 font-serif text-xl text-[#d8bf91]">
        Moderation Log
      </h2>

      <p className="mt-2 text-[11px] leading-5 text-[#8f8271]">
        Latest recorded staff
        actions across the forum.
      </p>

      <Link
        href="/admin/forum/moderation"
        className="mt-3 border border-amber-800/60 bg-amber-950/20 px-3 py-2.5 text-center text-[9px] uppercase tracking-[0.16em] text-amber-300 transition hover:border-amber-600 hover:bg-amber-950/40"
      >
        Open full log
      </Link>

      {error ? (
        <p className="mt-3 border border-[#743d35] bg-[#2a1512] p-2.5 text-[10px] text-[#d8a49a]">
          The moderation log
          could not be loaded.
        </p>
      ) : null}

      <div className="mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
        {loading ? (
          <div className="space-y-2">
            {Array.from({
              length: 5,
            }).map(
              (_, index) => (
                <div
                  key={index}
                  className="h-12 animate-pulse border border-[#59432c]/30 bg-[#19120d]"
                />
              ),
            )}
          </div>
        ) : (
          <div className="space-y-1.5">
            {logs.map((log) => {
              const topic =
                typeof log.details
                  ?.topic_title ===
                "string"
                  ? log.details
                      .topic_title
                  : null;

              return (
                <div
                  key={log.id}
                  className="border border-[#59432c]/40 bg-[#100c09] px-3 py-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[9px] uppercase tracking-[0.13em] text-amber-400">
                      {formatAction(
                        log.action,
                      )}
                    </span>

                    <span className="shrink-0 text-[8px] text-[#665a4b]">
                      {formatDate(
                        log.created_at,
                      )}
                    </span>
                  </div>

                  {topic ? (
                    <p className="mt-1 truncate font-serif text-xs text-[#baa68a]">
                      {topic}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}

        {!loading &&
        !error &&
        logs.length === 0 ? (
          <p className="text-[11px] text-[#8f8271]">
            No moderation actions
            have been recorded yet.
          </p>
        ) : null}
      </div>
    </div>
  );
}
