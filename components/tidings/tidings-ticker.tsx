"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";
import type { Tiding } from "@/lib/tidings/types";

const RESYNC_INTERVAL_MS = 3_000;

function stillVisible(tiding: Tiding, now: number) {
  if (!tiding.is_active) return false;

  const starts = Date.parse(tiding.starts_at);
  const expires = tiding.expires_at
    ? Date.parse(tiding.expires_at)
    : null;

  return (
    !Number.isNaN(starts) &&
    starts <= now &&
    (expires === null ||
      Number.isNaN(expires) ||
      expires > now)
  );
}

function priorityRank(priority: Tiding["priority"]) {
  if (priority === "urgent") return 2;
  if (priority === "important") return 1;
  return 0;
}

function sortTidings(entries: Tiding[]) {
  return [...entries].sort((a, b) => {
    const priority =
      priorityRank(b.priority) -
      priorityRank(a.priority);

    if (priority !== 0) return priority;

    return Date.parse(b.created_at) - Date.parse(a.created_at);
  });
}

function isTiding(value: unknown): value is Tiding {
  if (!value || typeof value !== "object") return false;

  const entry = value as Partial<Tiding>;

  return (
    typeof entry.id === "string" &&
    typeof entry.title === "string" &&
    typeof entry.message === "string" &&
    typeof entry.priority === "string" &&
    typeof entry.is_active === "boolean" &&
    typeof entry.starts_at === "string" &&
    typeof entry.created_at === "string" &&
    typeof entry.updated_at === "string"
  );
}

export function TidingsTicker({
  initialTidings,
}: {
  initialTidings: Tiding[];
}) {
  const supabase = useMemo(() => createClient(), []);

  const [tidings, setTidings] =
    useState(() => sortTidings(initialTidings));

  const sync = useCallback(async () => {
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("tidings")
      .select(
        "id, title, message, priority, is_active, starts_at, expires_at, created_at, updated_at",
      )
      .eq("is_active", true)
      .lte("starts_at", now)
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .order("priority_rank", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(12);

    if (!error && data) {
      setTidings(sortTidings(data as Tiding[]));
    }
  }, [supabase]);

  useEffect(() => {
    const channel = supabase
      .channel("portal-tidings-live-v2")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tidings",
        },
        (payload) => {
          /*
           * Update the footer IMMEDIATELY from the realtime payload.
           * No router.refresh() and no full-page refresh is involved.
           */
          setTidings((current) => {
            if (payload.eventType === "DELETE") {
              const deletedId =
                payload.old &&
                typeof payload.old === "object" &&
                "id" in payload.old &&
                typeof payload.old.id === "string"
                  ? payload.old.id
                  : null;

              if (!deletedId) return current;

              return current.filter(
                (entry) => entry.id !== deletedId,
              );
            }

            if (!isTiding(payload.new)) {
              return current;
            }

            const nextEntry = payload.new;
            const withoutOldVersion = current.filter(
              (entry) => entry.id !== nextEntry.id,
            );

            if (!stillVisible(nextEntry, Date.now())) {
              return sortTidings(withoutOldVersion);
            }

            return sortTidings([
              nextEntry,
              ...withoutOldVersion,
            ]).slice(0, 12);
          });

          /*
           * Then verify against the database. This catches scheduling,
           * expiry and policy edge-cases without delaying the visible update.
           */
          void sync();
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          void sync();
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, sync]);

  useEffect(() => {
    /*
     * Realtime is the fast path. A 3-second fallback means that even if
     * a websocket event is lost, only the Tidings footer self-corrects
     * almost immediately without refreshing the page.
     */
    const timer = window.setInterval(() => {
      void sync();
    }, RESYNC_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [sync]);

  useEffect(() => {
    const resync = () => {
      void sync();
    };

    const visibility = () => {
      if (document.visibilityState === "visible") {
        resync();
      }
    };

    window.addEventListener("focus", resync);
    window.addEventListener("online", resync);
    document.addEventListener("visibilitychange", visibility);

    return () => {
      window.removeEventListener("focus", resync);
      window.removeEventListener("online", resync);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [sync]);

  const visible = useMemo(() => {
    const now = Date.now();

    return sortTidings(
      tidings.filter((entry) => stillVisible(entry, now)),
    );
  }, [tidings]);

  const tickerText = useMemo(
    () =>
      visible
        .map((entry) => `${entry.title} — ${entry.message}`)
        .join("   ✦   "),
    [visible],
  );

  /*
   * Changing this key remounts only the moving text track, so a newly
   * inserted Tiding appears immediately and the animation restarts cleanly.
   */
  const tickerKey = useMemo(
    () =>
      visible
        .map((entry) => `${entry.id}:${entry.updated_at}`)
        .join("|"),
    [visible],
  );

  if (visible.length === 0) {
    return null;
  }

  const urgent = visible.some(
    (entry) => entry.priority === "urgent",
  );

  const duration = Math.max(
    22,
    Math.min(90, tickerText.length * 0.18),
  );

  return (
    <>
      <footer
        role="status"
        aria-live="polite"
        aria-label="Tidings"
        className={`relative z-30 h-9 shrink-0 overflow-hidden border-t backdrop-blur-sm ${
          urgent
            ? "border-[rgb(var(--sep-colour-985847))]/70 bg-[rgb(var(--sep-colour-1d0e0b))]/96"
            : "border-[rgb(var(--sep-colour-765937))]/65 bg-[rgb(var(--sep-colour-100c09))]/96"
        }`}
      >
        <div className="mx-auto flex h-full w-full max-w-[1800px] items-center">
          <div
            className={`relative z-10 flex h-full shrink-0 items-center border-r px-3 sm:px-4 ${
              urgent
                ? "border-[rgb(var(--sep-colour-985847))]/70 bg-[rgb(var(--sep-colour-2b130e))]"
                : "border-[rgb(var(--sep-colour-765937))]/55 bg-[rgb(var(--sep-colour-17100c))]"
            }`}
          >
            <span className="font-serif text-[11px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-e4c28e))]">
              Tidings
            </span>
          </div>

          <div className="group relative min-w-0 flex-1 overflow-hidden">
            <div
              key={tickerKey}
              className="sepulchria-tidings-track flex w-max items-center whitespace-nowrap pl-8 text-[10px] tracking-[0.07em] text-[rgb(var(--sep-colour-c9b391))] group-hover:[animation-play-state:paused]"
              style={{
                animationDuration: `${duration}s`,
              }}
            >
              <TickerSegment tidings={visible} />
              <span className="mx-10 text-[rgb(var(--sep-colour-80684b))]">✦</span>
              <TickerSegment tidings={visible} ariaHidden />
              <span className="mx-10 text-[rgb(var(--sep-colour-80684b))]">✦</span>
            </div>
          </div>
        </div>

        <style jsx global>{`
          .sepulchria-tidings-track {
            animation-name: sepulchria-tidings-scroll;
            animation-timing-function: linear;
            animation-iteration-count: infinite;
            will-change: transform;
          }

          @keyframes sepulchria-tidings-scroll {
            from {
              transform: translateX(0);
            }
            to {
              transform: translateX(-50%);
            }
          }

          @media (prefers-reduced-motion: reduce) {
            .sepulchria-tidings-track {
              animation: none !important;
              transform: none !important;
            }
          }
        `}</style>
      </footer>
    </>
  );
}

function TickerSegment({
  tidings,
  ariaHidden = false,
}: {
  tidings: Tiding[];
  ariaHidden?: boolean;
}) {
  return (
    <span aria-hidden={ariaHidden || undefined}>
      {tidings.map((entry, index) => (
        <span key={`${ariaHidden ? "copy-" : ""}${entry.id}`}>
          {index > 0 ? (
            <span className="mx-8 text-[rgb(var(--sep-colour-80684b))]">✦</span>
          ) : null}

          <span
            className={
              entry.priority === "urgent"
                ? "text-[rgb(var(--sep-colour-e4a58d))]"
                : entry.priority === "important"
                  ? "text-[rgb(var(--sep-colour-e1c28f))]"
                  : "text-[rgb(var(--sep-colour-c9b391))]"
            }
          >
            <strong
              data-tidings-role="title"
              className="font-serif font-normal text-[rgb(var(--sep-colour-ead1a7))]"
            >
              {entry.title}
            </strong>
            <span className="mx-2 text-[rgb(var(--sep-colour-80684b))]">—</span>
            <span data-tidings-role="description">
              {entry.message}
            </span>
          </span>
        </span>
      ))}
    </span>
  );
}
