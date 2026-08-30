"use client";

import Link from "next/link";
import { Bell, BellOff } from "lucide-react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";
import { usePortalAudio } from "@/components/audio/portal-audio-provider";

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

type NotificationBundle = {
  muted: boolean;
  notifications: NotificationRow[];
};

export function NotificationBell() {
  const pathname = usePathname();
  const {
    playPortalSound,
  } = usePortalAudio();
  const supabase = useMemo(
    () => createClient(),
    [],
  );

  const rootRef =
    useRef<HTMLDivElement>(null);
  const buttonRef =
    useRef<HTMLButtonElement>(null);
  const panelRef =
    useRef<HTMLDivElement>(null);
  const previousUnreadRef =
    useRef(0);
  const loadedOnceRef =
    useRef(false);
  const suppressNextSoundRef =
    useRef(false);

  const [open, setOpen] =
    useState(false);
  const [rows, setRows] =
    useState<NotificationRow[]>([]);
  const [muted, setMuted] =
    useState(false);
  const [loading, setLoading] =
    useState(true);
  const [changingMute, setChangingMute] =
    useState(false);

  const [panelPosition, setPanelPosition] =
    useState({
      top: 0,
      right: 12,
    });

  const load = useCallback(
    async () => {
      const { data, error } =
        await supabase.rpc(
          "get_my_notification_bundle",
        );

      if (error) {
        console.warn(
          "Notifications:",
          error.message,
        );
        setLoading(false);
        return;
      }

      const bundle =
        (data ?? {
          muted: false,
          notifications: [],
        }) as NotificationBundle;

      const nextRows =
        Array.isArray(
          bundle.notifications,
        )
          ? bundle.notifications
          : [];

      const nextUnread =
        bundle.muted === true
          ? 0
          : nextRows.filter(
              (row) =>
                row.is_unread,
            ).length;

      if (
        loadedOnceRef.current &&
        !bundle.muted &&
        nextUnread >
          previousUnreadRef.current &&
        !suppressNextSoundRef.current
      ) {
        playPortalSound(
          "notification-chime",
        );
      }

      suppressNextSoundRef.current =
        false;
      loadedOnceRef.current =
        true;
      previousUnreadRef.current =
        nextUnread;

      setMuted(bundle.muted === true);
      setRows(nextRows);
      setLoading(false);
    },
    [
      playPortalSound,
      supabase,
    ],
  );

  useEffect(() => {
    void load();

    const handleAdminDataChanged =
      () => {
        void load();
      };

    window.addEventListener(
      "sepulchria:admin-data-changed",
      handleAdminDataChanged,
    );

    const timer =
      window.setInterval(
        () => void load(),
        60_000,
      );

    return () => {
      window.clearInterval(timer);
      window.removeEventListener(
        "sepulchria:admin-data-changed",
        handleAdminDataChanged,
      );
    };
  }, [load, pathname]);

  useEffect(() => {
    function updatePanelPosition() {
      const button =
        buttonRef.current;

      if (!button) return;

      const rect =
        button.getBoundingClientRect();

      setPanelPosition({
        top: rect.bottom + 8,
        right: Math.max(
          12,
          window.innerWidth -
            rect.right,
        ),
      });
    }

    function onMouseDown(
      event: MouseEvent,
    ) {
      if (!open) return;

      const target =
        event.target as Node;

      if (
        rootRef.current?.contains(
          target,
        ) ||
        panelRef.current?.contains(
          target,
        )
      ) {
        return;
      }

      setOpen(false);
    }

    if (open) {
      updatePanelPosition();

      window.addEventListener(
        "resize",
        updatePanelPosition,
      );
      window.addEventListener(
        "scroll",
        updatePanelPosition,
        true,
      );
    }

    document.addEventListener(
      "mousedown",
      onMouseDown,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        onMouseDown,
      );
      window.removeEventListener(
        "resize",
        updatePanelPosition,
      );
      window.removeEventListener(
        "scroll",
        updatePanelPosition,
        true,
      );
    };
  }, [open]);

  const unreadCount =
    muted
      ? 0
      : rows.filter(
          (row) => row.is_unread,
        ).length;

  async function toggle() {
    const next = !open;
    setOpen(next);

    if (
      !next ||
      muted ||
      unreadCount === 0
    ) {
      return;
    }

    const { error } =
      await supabase.rpc(
        "mark_my_notifications_viewed",
      );

    if (!error) {
      setRows((current) =>
        current.map((row) => ({
          ...row,
          is_unread: false,
        })),
      );
    }
  }

  async function toggleMute() {
    if (changingMute) return;

    setChangingMute(true);

    const next = !muted;

    const { error } =
      await supabase.rpc(
        "set_my_notifications_muted",
        {
          p_muted: next,
        },
      );

    if (error) {
      console.warn(
        "Notification mute:",
        error.message,
      );
      setChangingMute(false);
      return;
    }

    setMuted(next);

    if (next) {
      previousUnreadRef.current =
        0;
      setRows([]);
    } else {
      suppressNextSoundRef.current =
        true;
      await load();
    }

    setChangingMute(false);
  }

  return (
    <div
      ref={rootRef}
      className="relative"
    >
      <button
        ref={buttonRef}
        type="button"
        
        onClick={() =>
          void toggle()
        }
        aria-label={
          muted
            ? "Notifications muted"
            : `${unreadCount} unread notifications`
        }
        aria-expanded={open}
        title={
          muted
            ? "Notifications muted"
            : "Notifications"
        }
        className={[
          "relative flex h-8 w-8 items-center justify-center border transition sm:h-9 sm:w-9 2xl:h-10 2xl:w-10",
          muted
            ? "border-red-900/70 bg-red-950/35 text-red-400 hover:border-red-700/80 hover:text-red-300"
            : "border-[rgb(var(--sep-colour-614b31))] bg-[rgb(var(--sep-colour-17120f))] text-[rgb(var(--sep-colour-c69b5c))] hover:border-[rgb(var(--sep-colour-977242))] hover:text-[rgb(var(--sep-colour-efd6a3))]",
        ].join(" ")}
      >
        {muted ? (
          <BellOff className="pointer-events-none h-5 w-5" />
        ) : (
          <Bell className="pointer-events-none h-5 w-5" />
        )}

        {unreadCount > 0 ? (
          <span
            title={`${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`}
            aria-label={`${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`}
            className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full border border-[rgb(var(--sep-colour-d19a4c))] bg-[rgb(var(--sep-colour-7a291f))] text-[8px] font-bold leading-none text-[rgb(var(--sep-colour-ffe1ac))] shadow-[0_0_10px_rgba(var(--sep-rgb-209-154-76),0.32)]"
          >
            {unreadCount > 9
              ? "9+"
              : unreadCount}
          </span>
        ) : null}
      </button>

      {open &&
      typeof document !==
        "undefined"
        ? createPortal(
            <div
              ref={panelRef}
              data-vocabulary-static
              className="fixed z-[9999] w-[min(390px,calc(100vw-24px))] !translate-x-0 !translate-y-0 !scale-100 !transform-none !animate-none !opacity-100 !transition-none !filter-none border border-[rgb(var(--sep-colour-6e5535))]/70 bg-[rgb(var(--sep-colour-100c09))] shadow-2xl"
              style={{
                top: panelPosition.top,
                right:
                  panelPosition.right,
                transform: "none",
                filter: "none",
                animation: "none",
                transition: "none",
                opacity: 1,
              }}
            >
              <div className="border-b border-[rgb(var(--sep-colour-59432c))]/45 px-4 py-3">
                <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-806b50))]">
                  Offgame
                </p>

                <div className="mt-1 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="font-serif text-lg text-[rgb(var(--sep-colour-d8bf91))]">
                      Notifications
                    </h2>

                    <p
                      className={[
                        "mt-0.5 text-[8px] uppercase tracking-[0.14em]",
                        muted
                          ? "text-red-400"
                          : "text-[rgb(var(--sep-colour-756958))]",
                      ].join(
                        " ",
                      )}
                    >
                      {muted
                        ? "Muted"
                        : `${rows.length} active`}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      void toggleMute()
                    }
                    disabled={
                      changingMute
                    }
                    className={[
                      "flex items-center gap-1.5 border px-2.5 py-1.5 text-[8px] uppercase tracking-[0.14em] transition-all duration-150 hover:-translate-y-[1px] hover:shadow-[0_0_10px_rgba(var(--sep-rgb-177-132-75),0.08)] disabled:cursor-wait disabled:opacity-50",
                      muted
                        ? "border-red-800/70 bg-red-950/30 text-red-300 hover:border-red-600/80 hover:bg-red-950/50"
                        : "border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-17110d))] text-[rgb(var(--sep-colour-ae9570))] hover:border-[rgb(var(--sep-colour-8a673f))] hover:text-[rgb(var(--sep-colour-dbc091))]",
                    ].join(
                      " ",
                    )}
                  >
                    {muted ? (
                      <>
                        <Bell className="h-3.5 w-3.5" />
                        Unmute
                      </>
                    ) : (
                      <>
                        <BellOff className="h-3.5 w-3.5" />
                        Mute
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="max-h-[min(65vh,560px)] overflow-y-auto p-2">
                {loading ? (
                  <p className="px-4 py-6 text-center text-xs text-[rgb(var(--sep-colour-8f8271))]">
                    Loading
                    notifications...
                  </p>
                ) : muted ? (
                  <div className="border border-red-950/55 bg-red-950/15 px-4 py-6 text-center">
                    <BellOff className="mx-auto h-5 w-5 text-red-500/80" />
                    <p className="mt-3 font-serif text-sm text-[rgb(var(--sep-colour-c5aa83))]">
                      Notifications
                      are muted.
                    </p>
                    <p className="mt-1 text-[10px] leading-5 text-[rgb(var(--sep-colour-7f7466))]">
                      New notices
                      will remain
                      waiting until
                      you unmute
                      them.
                    </p>
                  </div>
                ) : rows.length ? (
                  <div className="space-y-1.5">
                    {rows.map(
                      (row) => {
                        const content =
                          (
                            <>
                              <div className="flex items-start justify-between gap-3">
                                <span className="text-[7px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-806b50))]">
                                  {row.type.replaceAll(
                                    "_",
                                    " ",
                                  )}
                                  {row.is_automatic
                                    ? " · Auto"
                                    : ""}
                                </span>

                                <span className="shrink-0 text-[8px] text-[rgb(var(--sep-colour-6f6252))]">
                                  {new Date(
                                    row.starts_at,
                                  ).toLocaleString()}
                                </span>
                              </div>

                              <p className="mt-1 font-serif text-[15px] text-[rgb(var(--sep-colour-d8bf91))]">
                                {
                                  row.title
                                }
                              </p>

                              <p className="mt-1 text-[11px] leading-5 text-[rgb(var(--sep-colour-a99b89))]">
                                {
                                  row.body
                                }
                              </p>

                              {row.href ? (
                                <span className="mt-2 inline-flex border border-[rgb(var(--sep-colour-765937))]/55 bg-[rgb(var(--sep-colour-21170f))] px-2 py-1 text-[8px] uppercase tracking-[0.14em] !text-[rgb(var(--sep-colour-d4ad70))] transition group-hover:border-[rgb(var(--sep-colour-a07945))] group-hover:!text-[rgb(var(--sep-colour-efd6a3))]">
                                  Open →
                                </span>
                              ) : null}
                            </>
                          );

                        const className =
                          [
                            "group block border px-3 py-3 transition-all duration-150 hover:-translate-y-[1px] hover:border-[rgb(var(--sep-colour-8a673f))] hover:bg-[rgb(var(--sep-colour-17110d))] hover:shadow-[0_0_12px_rgba(var(--sep-rgb-177-132-75),0.08)]",
                            row.is_unread
                              ? "border-[rgb(var(--sep-colour-765937))]/55 bg-[rgb(var(--sep-colour-21170f))]"
                              : "border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-100c09))]",
                          ].join(
                            " ",
                          );

                        return row.href ? (
                          <Link
                            key={
                              row.id
                            }
                            href={
                              row.href
                            }
                            onClick={() =>
                              setOpen(
                                false,
                              )
                            }
                            className={
                              className
                            }
                          >
                            {
                              content
                            }
                          </Link>
                        ) : (
                          <div
                            key={
                              row.id
                            }
                            className={
                              className
                            }
                          >
                            {
                              content
                            }
                          </div>
                        );
                      },
                    )}
                  </div>
                ) : (
                  <p className="px-4 py-8 text-center text-xs text-[rgb(var(--sep-colour-8f8271))]">
                    Nothing to
                    report.
                  </p>
                )}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
