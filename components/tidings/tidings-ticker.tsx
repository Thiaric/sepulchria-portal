"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";
import type { Tiding } from "@/lib/tidings/types";

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

export function TidingsTicker({
  initialTidings,
}: {
  initialTidings: Tiding[];
}) {
  const [tidings, setTidings] =
    useState(initialTidings);

  const sync = useCallback(async () => {
    const supabase = createClient();
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
      setTidings(data as Tiding[]);
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("portal-tidings-live")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tidings",
        },
        () => {
          void sync();
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          void sync();
        }
      });

    const timer = window.setInterval(() => {
      void sync();
    }, 60_000);

    return () => {
      window.clearInterval(timer);
      void supabase.removeChannel(channel);
    };
  }, [sync]);

  const visible = useMemo(() => {
    const now = Date.now();

    return [...tidings]
      .filter((entry) => stillVisible(entry, now))
      .sort((a, b) => {
        const priority =
          priorityRank(b.priority) -
          priorityRank(a.priority);

        if (priority !== 0) return priority;

        return (
          Date.parse(b.created_at) -
          Date.parse(a.created_at)
        );
      });
  }, [tidings]);

  const tickerText = useMemo(
    () =>
      visible
        .map((entry) =>
          `${entry.title} — ${entry.message}`,
        )
        .join("   ✦   "),
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
      <div aria-hidden="true" className="h-9" />

      <div
        role="status"
        aria-label="Tidings"
        className={`fixed inset-x-0 bottom-0 z-[90] h-9 overflow-hidden border-t backdrop-blur-sm ${
          urgent
            ? "border-[#985847]/70 bg-[#1d0e0b]/96"
            : "border-[#765937]/65 bg-[#100c09]/96"
        }`}
      >
        <div className="mx-auto flex h-full w-full max-w-[1800px] items-center">
          <div
            className={`relative z-10 flex h-full shrink-0 items-center border-r px-3 sm:px-4 ${
              urgent
                ? "border-[#985847]/70 bg-[#2b130e]"
                : "border-[#765937]/55 bg-[#17100c]"
            }`}
          >
            <span className="font-serif text-[11px] uppercase tracking-[0.22em] text-[#e4c28e]">
              Tidings
            </span>
          </div>

          <div className="group relative min-w-0 flex-1 overflow-hidden">
            <div
              className="sepulchria-tidings-track flex w-max items-center whitespace-nowrap pl-8 text-[10px] tracking-[0.07em] text-[#c9b391] group-hover:[animation-play-state:paused]"
              style={{
                animationDuration: `${duration}s`,
              }}
            >
              <TickerSegment
                tidings={visible}
              />
              <span className="mx-10 text-[#80684b]">✦</span>
              <TickerSegment
                tidings={visible}
                ariaHidden
              />
              <span className="mx-10 text-[#80684b]">✦</span>
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
      </div>
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
            <span className="mx-8 text-[#80684b]">✦</span>
          ) : null}

          <span
            className={
              entry.priority === "urgent"
                ? "text-[#e4a58d]"
                : entry.priority === "important"
                  ? "text-[#e1c28f]"
                  : "text-[#c9b391]"
            }
          >
            <strong className="font-serif font-normal text-[#ead1a7]">
              {entry.title}
            </strong>
            <span className="mx-2 text-[#80684b]">—</span>
            {entry.message}
          </span>
        </span>
      ))}
    </span>
  );
}
