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
import {
  openPortalModal,
  type PortalModalPayload,
} from "@/components/portal/portal-modal-button";

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

type ModalRouteDefinition = {
  prefix: string;
  label: string;
  title: string;
  icon: string;
  exact?: boolean;
};

const MODAL_ROUTES: ModalRouteDefinition[] = [
  {
    prefix: "/character",
    label: "Character Sheet",
    title: "Open your character sheet.",
    icon: "/icons/characters.png",
  },
  {
    prefix: "/characters",
    label: "Sepulchria's People",
    title: "Browse the characters who inhabit Sepulchria.",
    icon: "/icons/characters.png",
  },
  {
    prefix: "/polls",
    label: "Polls",
    title: "Open community Polls and cast your vote.",
    icon: "/icons/forum.png",
  },
  {
    prefix: "/codex",
    label: "Codex",
    title: "Explore Aureth's history, locations and lore.",
    icon: "/icons/codex.png",
  },
  {
    prefix: "/rules",
    label: "Rules",
    title: "Read the official game rules and documentation.",
    icon: "/icons/rules.png",
  },
  {
    prefix: "/ancestries",
    label: "Ancestries",
    title: "Read about the playable ancestries of Sepulchria.",
    icon: "/icons/ancestries.png",
  },
  {
    prefix: "/associations",
    label: "Associations",
    title: "Explore the Associations of Sepulchria.",
    icon: "/icons/associations.png",
  },
  {
    prefix: "/orders",
    label: "Orders",
    title: "Read about the Orders of Sepulchria.",
    icon: "/icons/orders.png",
  },
  {
    prefix: "/warping",
    label: "Warping",
    title: "Read about magic and Warping in Sepulchria.",
    icon: "/icons/warping.png",
  },
  {
    prefix: "/feats",
    label: "Feats",
    title: "Browse available Feats.",
    icon: "/icons/gifts.png",
  },
  {
    prefix: "/market",
    label: "Market",
    title: "Browse the Sepulchria market.",
    icon: "/icons/market.png",
  },
  {
    prefix: "/crafting",
    label: "Crafting",
    title: "Open your crafting workbench.",
    icon: "/icons/crafting.png",
  },
  {
    prefix: "/missions",
    label: "Daily Missions",
    title: "Review today's missions, progress and rewards.",
    icon: "/icons/missions.png",
  },
  {
    prefix: "/friends",
    label: "Friend List",
    title: "Open your character relationships.",
    icon: "/icons/friends.png",
  },
  {
    prefix: "/messages",
    label: "Messages",
    title: "Open your private conversations.",
    icon: "/icons/messages.png",
  },
  {
    prefix: "/ranking",
    label: "Hall of Renown",
    title: "View Sepulchria's records of achievement.",
    icon: "/icons/ranking.png",
  },
  {
    prefix: "/forum",
    label: "Forum",
    title: "Open the Sepulchria community forum.",
    icon: "/icons/forum.png",
  },
  {
    prefix: "/community-rules",
    label: "Community Rules",
    title: "Read Sepulchria's Community Rules.",
    icon: "/icons/rules.png",
  },
  {
    prefix: "/safety",
    label: "Safety",
    title: "Read Sepulchria's safety information.",
    icon: "/icons/rules.png",
  },
  {
    prefix: "/age-policy",
    label: "18+ Policy",
    title: "Read Sepulchria's age policy.",
    icon: "/icons/rules.png",
  },
  {
    prefix: "/privacy",
    label: "Privacy",
    title: "Read Sepulchria's Privacy Notice.",
    icon: "/icons/rules.png",
  },
  {
    prefix: "/cookies",
    label: "Cookies",
    title: "Read Sepulchria's Cookie Notice.",
    icon: "/icons/rules.png",
  },
  {
    prefix: "/terms",
    label: "Terms",
    title: "Read Sepulchria's Terms of Service.",
    icon: "/icons/rules.png",
  },
];

function normaliseNotificationHref(
  href: string,
) {
  try {
    const url = new URL(
      href,
      "https://sepulchria.local",
    );

    if (
      url.pathname ===
        "/character/trophies" ||
      url.pathname.startsWith(
        "/character/trophies/",
      )
    ) {
      url.pathname = "/character";
      url.searchParams.set(
        "tab",
        "trophies",
      );
    }

    if (
      url.pathname === "/character" &&
      url.hash.startsWith("#trophy-")
    ) {
      url.searchParams.set(
        "tab",
        "trophies",
      );
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return href;
  }
}

function modalPayloadForNotificationHref(
  href: string,
): PortalModalPayload | null {
  const normalisedHref =
    normaliseNotificationHref(href);

  const path =
    normalisedHref
      .split("#")[0]
      .split("?")[0];

  if (
    path === "/orders/manage" ||
    path.startsWith("/orders/manage/")
  ) {
    return null;
  }

  const definition =
    MODAL_ROUTES.find(
      (route) =>
        route.exact
          ? path === route.prefix
          : path === route.prefix ||
            path.startsWith(
              `${route.prefix}/`,
            ),
    );

  if (!definition) {
    return null;
  }

  return {
    label: definition.label,
    title: definition.title,
    icon: definition.icon,
    href: normalisedHref,
  };
}

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
  const [search, setSearch] =
    useState("");

  const [panelPosition, setPanelPosition] =
    useState({
      top: 0,
      right: 12,
    });

  const load = useCallback(
    async () => {
      await fetch(
        "/api/missions/notifications/sync",
        {
          method: "POST",
          cache: "no-store",
        },
      ).catch(() => null);

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
    window.addEventListener(
      "sepulchria:notifications-changed",
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
      window.removeEventListener(
        "sepulchria:notifications-changed",
        handleAdminDataChanged,
      );
    };
  }, [load, pathname]);

  useEffect(() => {
    const channel =
      supabase
        .channel(
          `item-exchange-notifications-${crypto.randomUUID()}`,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table:
              "notifications",
            filter:
              "source_type=eq.item_trade",
          },
          () => {
            /*
             * Item Exchange notifications emit a final UPDATE only after
             * notification_targets has been created, so this reload cannot
             * race ahead of the recipient assignment.
             */
            void load();
          },
        )
        .subscribe();

    return () => {
      void supabase.removeChannel(
        channel,
      );
    };
  }, [load, supabase]);

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

  const visibleRows =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLocaleLowerCase();

      if (!query) {
        return rows;
      }

      return rows.filter(
        (row) => {
          const date =
            new Date(
              row.starts_at,
            );

          const searchable = [
            row.type,
            row.title,
            row.body,
            row.href ?? "",
            row.is_automatic
              ? "automatic auto"
              : "manual",
            row.is_unread
              ? "unread new"
              : "read viewed",
            row.starts_at,
            date.toLocaleString(),
            date.toLocaleDateString(),
            date.toLocaleTimeString(),
          ]
            .join(" ")
            .toLocaleLowerCase();

          return searchable.includes(
            query,
          );
        },
      );
    }, [rows, search]);

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

    /*
     * Opening the notification panel is the read boundary.
     * Clear the badge immediately instead of waiting for network latency.
     */
    previousUnreadRef.current = 0;

    setRows((current) =>
      current.map((row) => ({
        ...row,
        is_unread: false,
      })),
    );

    const { error } =
      await supabase.rpc(
        "mark_my_notifications_viewed",
      );

    if (error) {
      console.warn(
        "Mark notifications viewed:",
        error.message,
      );

      await load();
      return;
    }

    window.dispatchEvent(
      new Event(
        "sepulchria:notifications-changed",
      ),
    );
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
            data-sep-counter-badge="true"
            title={`${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`}
            aria-label={`${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`}
            className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full border px-1 text-[8px] font-bold leading-none"
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
              className="fixed z-[9999] left-3 right-3 top-[calc(env(safe-area-inset-top)+3.75rem)] bottom-[calc(env(safe-area-inset-bottom)+4.75rem)] flex w-auto max-w-none flex-col !translate-x-0 !translate-y-0 !scale-100 !transform-none !animate-none !opacity-100 !transition-none !filter-none border border-[rgb(var(--sep-colour-6e5535))]/70 bg-[rgb(var(--sep-colour-100c09))] shadow-2xl sm:left-auto sm:bottom-auto sm:top-auto sm:w-[min(390px,calc(100vw-24px))] sm:max-w-[390px]"
              style={{
                ...(typeof window !== "undefined" &&
                window.innerWidth >= 640
                  ? {
                      top:
                        panelPosition.top,
                      right:
                        panelPosition.right,
                    }
                  : undefined),
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
                      "flex items-center gap-1.5 border px-2.5 py-1.5 text-[8px] font-semibold uppercase tracking-[0.14em] transition-all duration-150 hover:-translate-y-[1px] hover:shadow-[0_0_12px_rgba(var(--sep-rgb-177-132-75),0.14)] disabled:cursor-wait disabled:opacity-50",
                      muted
                        ? "border-red-700/80 bg-red-950/55 text-red-200 shadow-[inset_0_0_0_1px_rgba(185,65,55,0.18)] hover:border-red-500 hover:bg-red-900/45 hover:text-red-100"
                        : "border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] text-[rgb(var(--sep-colour-efd6a8))] shadow-[inset_0_0_0_1px_rgba(var(--sep-rgb-152-115-68),0.12)] hover:border-[rgb(var(--sep-colour-b98c50))] hover:bg-[rgb(var(--sep-colour-50371f))] hover:text-[rgb(var(--sep-colour-ffe4b5))]",
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

                {!muted ? (
                  <div className="mt-3">
                    <input
                      type="search"
                      value={search}
                      onChange={(event) =>
                        setSearch(
                          event.target.value,
                        )
                      }
                      placeholder="Filter notifications..."
                      aria-label="Filter notifications"
                      className="h-8 w-full border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-0d0907))] px-3 text-[10px] text-[rgb(var(--sep-colour-d4bea0))] outline-none placeholder:text-[rgb(var(--sep-colour-665b4d))] focus:border-[rgb(var(--sep-colour-987344))]"
                    />
                    {search.trim() ? (
                      <p className="mt-1 text-right text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-6f6252))]">
                        {visibleRows.length} / {rows.length}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-2 sm:max-h-[min(65vh,560px)] sm:flex-none">
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
                ) : visibleRows.length ? (
                  <div className="space-y-1.5">
                    {visibleRows.map(
                      (row) => {
                        const effectiveHref =
                          row.href
                            ? normaliseNotificationHref(
                                row.href,
                              )
                            : null;

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
                              effectiveHref!
                            }
                            onClick={(event) => {
  if (
    effectiveHref ===
    "/appearance"
  ) {
    event.preventDefault();

    window.dispatchEvent(
      new Event(
        "sepulchria:open-portal-appearance",
      ),
    );

    setOpen(false);
    return;
  }

  const modalPayload =
    modalPayloadForNotificationHref(
      effectiveHref!,
    );

  if (modalPayload) {
    event.preventDefault();
    openPortalModal(
      modalPayload,
    );
  }

  setOpen(false);
}}
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
                    {search.trim()
                      ? "No matching notifications."
                      : "Nothing to report."}
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
