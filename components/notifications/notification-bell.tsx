"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { createClient } from "@/lib/supabase/client";

type NotificationRow = {
  id: string;
  type: string;
  title: string;
  body: string;
  href: string | null;
  starts_at: string;
  is_automatic: boolean;
  is_unread: boolean;
};

export function NotificationBell() {
  const supabase = useMemo(() => createClient(), []);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [panelPosition, setPanelPosition] = useState({
    top: 0,
    right: 12,
  });

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc("get_my_notifications");

    if (error) {
      console.warn("Notifications:", error.message);
      setLoading(false);
      return;
    }

    setRows((data ?? []) as NotificationRow[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 60_000);
    return () => window.clearInterval(timer);
  }, [load]);

  useEffect(() => {
    function updatePanelPosition() {
      const button = buttonRef.current;
      if (!button) return;

      const rect = button.getBoundingClientRect();

      setPanelPosition({
        top: rect.bottom + 8,
        right: Math.max(
          12,
          window.innerWidth - rect.right,
        ),
      });
    }

    function onMouseDown(event: MouseEvent) {
      if (!open) return;

      const target = event.target as Node;

      if (
        rootRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return;
      }

      setOpen(false);
    }

    if (open) {
      updatePanelPosition();
      window.addEventListener("resize", updatePanelPosition);
      window.addEventListener("scroll", updatePanelPosition, true);
    }

    document.addEventListener("mousedown", onMouseDown);

    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("resize", updatePanelPosition);
      window.removeEventListener("scroll", updatePanelPosition, true);
    };
  }, [open]);

  const unreadCount = rows.filter((row) => row.is_unread).length;

  async function toggle() {
    const next = !open;
    setOpen(next);

    if (!next || unreadCount === 0) return;

    const { error } = await supabase.rpc("mark_my_notifications_viewed");

    if (!error) {
      setRows((current) =>
        current.map((row) => ({ ...row, is_unread: false })),
      );
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => void toggle()}
        aria-label={`${unreadCount} unread notifications`}
        aria-expanded={open}
        title="Notifications"
        className="relative flex h-8 w-8 items-center justify-center border border-[rgb(var(--sep-colour-614b31))] bg-[rgb(var(--sep-colour-17120f))] text-[rgb(var(--sep-colour-c69b5c))] transition hover:border-[rgb(var(--sep-colour-977242))] hover:text-[rgb(var(--sep-colour-efd6a3))] sm:h-9 sm:w-9 2xl:h-10 2xl:w-10"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full border border-[rgb(var(--sep-colour-17120f))] bg-red-700 px-1 text-[8px] font-bold leading-none text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={panelRef}
              data-vocabulary-static
              className="fixed z-[9999] w-[min(390px,calc(100vw-24px))] !translate-x-0 !translate-y-0 !scale-100 !transform-none !animate-none !opacity-100 !transition-none !filter-none border border-[rgb(var(--sep-colour-6e5535))]/70 bg-[rgb(var(--sep-colour-100c09))] shadow-2xl"
              style={{
                top: panelPosition.top,
                right: panelPosition.right,
                transform: "none",
                filter: "none",
                animation: "none",
                transition: "none",
                opacity: 1,
              }}
            >
          <div className="border-b border-[rgb(var(--sep-colour-59432c))]/45 px-4 py-3">
            <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-806b50))]">Offgame</p>
            <div className="mt-1 flex items-center justify-between gap-3">
              <h2 className="font-serif text-lg text-[rgb(var(--sep-colour-d8bf91))]">Notifications</h2>
              <span className="text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-756958))]">{rows.length} active</span>
            </div>
          </div>

          <div className="max-h-[min(65vh,560px)] overflow-y-auto">
            {loading ? (
              <p className="px-4 py-6 text-center text-xs text-[rgb(var(--sep-colour-8f8271))]">Loading notifications...</p>
            ) : rows.length ? (
              rows.map((row) => {
                const content = (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-[7px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-806b50))]">
                        {row.type.replaceAll("_", " ")}{row.is_automatic ? " · Auto" : ""}
                      </span>
                      <span className="shrink-0 text-[8px] text-[rgb(var(--sep-colour-6f6252))]">
                        {new Date(row.starts_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-1 font-serif text-[15px] text-[rgb(var(--sep-colour-d8bf91))]">{row.title}</p>
                    <p className="mt-1 text-[11px] leading-5 text-[rgb(var(--sep-colour-a99b89))]">{row.body}</p>
                    {row.href ? <span className="mt-2 block text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-b28a53))]">Open →</span> : null}
                  </>
                );

                const className = [
                  "block border-b border-[rgb(var(--sep-colour-59432c))]/30 px-4 py-3 transition",
                  row.is_unread ? "bg-[rgb(var(--sep-colour-21170f))]" : "",
                  row.href ? "hover:bg-[rgb(var(--sep-colour-21170f))]" : "",
                ].join(" ");

                return row.href ? (
                  <Link key={row.id} href={row.href} onClick={() => setOpen(false)} className={className}>{content}</Link>
                ) : (
                  <div key={row.id} className={className}>{content}</div>
                );
              })
            ) : (
              <p className="px-4 py-8 text-center text-xs text-[rgb(var(--sep-colour-8f8271))]">Nothing to report.</p>
            )}
          </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
