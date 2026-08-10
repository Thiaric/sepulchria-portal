"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";
import { UnreadMessageBadge } from "@/components/messages/unread-message-badge";
import { ForumSidebarMenu } from "@/components/portal/forum-sidebar-menu";

type PortalSidebarProps = {
  unreadMessageCount: number;
  unreadForumCount: number;
};

type NavigationItem = {
  label: string;
  icon: string;
  href: string;
  activePaths: string[];
  disabled?: boolean;
  opensModal?: boolean;
};

const mainNavigationItems: NavigationItem[] = [
  {
    label: "Dashboard",
    icon: "⌂",
    href: "/",
    activePaths: ["/"],
  },
  {
    label: "Play",
    icon: "✦",
    href: "/game",
    activePaths: ["/game"],
  },
  {
    label: "Characters",
    icon: "♙",
    href: "/characters",
    activePaths: ["/characters"],
  },
];

const codexNavigationItems: NavigationItem[] = [
  {
    label: "Codex",
    icon: "🕮",
    href: "/codex",
    activePaths: ["/codex"],
    opensModal: true,
  },
  {
    label: "Rules",
    icon: "🗊",
    href: "/rules",
    activePaths: ["/rules"],
    opensModal: true,
  },
  {
    label: "Ancestries",
    icon: "⚜",
    href: "/races",
    activePaths: ["/races"],
  },
  {
    label: "Associations",
    icon: "⌘",
    href: "/associations",
    activePaths: ["/associations"],
  },
  {
    label: "Warping",
    icon: "✵",
    href: "/spells",
    activePaths: ["/spells"],
    disabled: true,
  },
];

const marketItem: NavigationItem = {
  label: "Market",
  icon: "⚖",
  href: "/market",
  activePaths: ["/market"],
  disabled: true,
};

const messagesItem: NavigationItem = {
  label: "Messages",
  icon: "✉",
  href: "/messages",
  activePaths: ["/messages"],
};

function normalizeCount(
  value: unknown,
  fallback = 0,
): number {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return Math.max(0, value);
  }

  if (typeof value === "string") {
    const parsedCount =
      Number.parseInt(value, 10);

    if (Number.isFinite(parsedCount)) {
      return Math.max(
        0,
        parsedCount,
      );
    }
  }

  return fallback;
}

export function PortalSidebar({
  unreadMessageCount,
  unreadForumCount,
}: PortalSidebarProps) {
  const pathname = usePathname();

  const [modalItem, setModalItem] =
    useState<NavigationItem | null>(
      null,
    );

  const [
    currentUnreadForumCount,
    setCurrentUnreadForumCount,
  ] = useState(
    normalizeCount(
      unreadForumCount,
    ),
  );

  useEffect(() => {
    setCurrentUnreadForumCount(
      normalizeCount(
        unreadForumCount,
      ),
    );
  }, [unreadForumCount]);

  useEffect(() => {
    if (!modalItem) {
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (event.key === "Escape") {
        setModalItem(null);
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [modalItem]);

  const refreshForumCount =
    useCallback(async () => {
      const supabase =
        createClient();

      const { data, error } =
        await supabase.rpc(
          "get_unread_forum_topic_count",
        );

      if (error) {
        console.error(
          "Could not refresh forum unread count:",
          error,
        );
        return;
      }

      setCurrentUnreadForumCount(
        normalizeCount(data),
      );
    }, []);

  useEffect(() => {
    const supabase =
      createClient();

    void refreshForumCount();

    const channel = supabase
      .channel(
        "forum-sidebar-unread-count",
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "forum_posts",
        },
        () => {
          void refreshForumCount();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table:
            "forum_topic_reads",
        },
        () => {
          void refreshForumCount();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table:
            "forum_topic_reads",
        },
        () => {
          void refreshForumCount();
        },
      )
      .subscribe((status, error) => {
        if (status === "SUBSCRIBED") {
          void refreshForumCount();
        }

        if (
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT"
        ) {
          console.error(
            "Forum sidebar realtime error:",
            error,
          );
        }
      });

    const pollingInterval =
      window.setInterval(() => {
        void refreshForumCount();
      }, 5000);

    function handleFocus() {
      void refreshForumCount();
    }

    function handleVisibility() {
      if (
        document.visibilityState ===
        "visible"
      ) {
        void refreshForumCount();
      }
    }

    window.addEventListener(
      "focus",
      handleFocus,
    );
    document.addEventListener(
      "visibilitychange",
      handleVisibility,
    );

    return () => {
      window.clearInterval(
        pollingInterval,
      );
      window.removeEventListener(
        "focus",
        handleFocus,
      );
      document.removeEventListener(
        "visibilitychange",
        handleVisibility,
      );
      void supabase.removeChannel(
        channel,
      );
    };
  }, [refreshForumCount]);

  function isActive(
    activePaths: string[],
  ) {
    return activePaths.some(
      (path) => {
        if (path === "/") {
          return pathname === "/";
        }

        return (
          pathname === path ||
          pathname.startsWith(
            `${path}/`,
          )
        );
      },
    );
  }

  function renderNavigationItem(
    item: NavigationItem,
  ) {
    const active = isActive(
      item.activePaths,
    );
    const isMessages =
      item.label === "Messages";

    if (item.disabled) {
      return (
        <div
          key={item.label}
          title="Coming soon"
          className="flex cursor-not-allowed items-center gap-2 border border-transparent px-2.5 py-2 text-[11px] text-[#62594d] opacity-65 lg:text-xs"
        >
          <span className="w-4 shrink-0 text-center text-[12px]">
            {item.icon}
          </span>

          <span className="truncate">
            {item.label}
          </span>

          <span className="ml-auto hidden text-[7px] uppercase tracking-[0.16em] text-[#504940] lg:block">
            Soon
          </span>
        </div>
      );
    }

    const itemClassName =
      `flex min-h-9 items-center gap-2 border px-2.5 py-2 text-[11px] transition lg:text-xs ${
        item.opensModal &&
        modalItem?.href === item.href
          ? "border-[#8d6d3e] bg-[#332719] text-[#efd9aa]"
          : active
            ? "border-[#8d6d3e] bg-[#332719] text-[#efd9aa]"
            : "border-transparent text-[#b6a894] hover:border-[#5d4930] hover:bg-[#1d1712] hover:text-[#e8d8ba]"
      }`;

    const contents = (
      <>
        <span className="w-4 shrink-0 text-center text-[12px] text-[#b68b4f]">
          {item.icon}
        </span>

        <span className="truncate">
          {item.label}
        </span>

        {isMessages ? (
          <UnreadMessageBadge
            initialCount={
              unreadMessageCount
            }
            variant="inline"
          />
        ) : null}
      </>
    );

    if (item.opensModal) {
      return (
        <button
          key={item.label}
          type="button"
          onClick={() =>
            setModalItem(item)
          }
          className={`${itemClassName} w-full text-left`}
          aria-haspopup="dialog"
          aria-expanded={
            modalItem?.href ===
            item.href
          }
        >
          {contents}
        </button>
      );
    }

    return (
      <Link
        key={item.label}
        href={item.href}
        className={itemClassName}
      >
        {contents}
      </Link>
    );
  }

  return (
    <>
      <aside className="border-b border-[#6e5535]/30 bg-[#100d0b]/90 lg:sticky lg:top-20 lg:h-[calc(100vh-5rem)] lg:overflow-y-auto lg:border-b-0 lg:border-r">
        <div className="p-3 lg:p-4">
          <nav aria-label="Main navigation">
            <NavigationGroup
              title="Navigate the World"
              items={mainNavigationItems.map(
                renderNavigationItem,
              )}
            />

            <NavigationGroup
              title="Codex and rules"
              items={codexNavigationItems.map(
                renderNavigationItem,
              )}
            />

            <section>
              <p className="mb-2.5 hidden text-[8px] uppercase tracking-[0.3em] text-[#766754] lg:block">
                services and utilities
              </p>

              <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5 lg:grid-cols-1">
                {renderNavigationItem(
                  marketItem,
                )}

                <ForumSidebarMenu
                  unreadCount={
                    currentUnreadForumCount
                  }
                />

                {renderNavigationItem(
                  messagesItem,
                )}
              </div>
            </section>
          </nav>

          <div className="mt-5 hidden border-t border-[#6e5535]/30 pt-3 lg:block">
            <span className="block py-1.5 text-[9px] uppercase tracking-[0.18em] text-[#5f5549]">
              Support · Coming soon
            </span>

            <span className="block py-1.5 text-[9px] uppercase tracking-[0.18em] text-[#5f5549]">
              Staff · Coming soon
            </span>
          </div>
        </div>
      </aside>

      {modalItem ? (
        <PublicPageModal
          item={modalItem}
          onClose={() =>
            setModalItem(null)
          }
        />
      ) : null}
    </>
  );
}

function PublicPageModal({
  item,
  onClose,
}: {
  item: NavigationItem;
  onClose: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={item.label}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 p-2 sm:p-4"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <div className="flex h-[85vh] w-[90vw] max-w-[1700px] flex-col overflow-hidden border border-[#6e5535]/65 bg-[#090705] shadow-[0_20px_80px_rgba(0,0,0,0.65)]">
        <div className="flex h-10 shrink-0 items-center justify-between border-b border-[#60482e]/45 bg-[#100c09] px-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="text-[#b68b4f]">
              {item.icon}
            </span>

            <span className="truncate font-serif text-sm text-[#d8c096]">
              {item.label}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={`Close ${item.label}`}
            title={`Close ${item.label}`}
            className="flex h-7 w-7 items-center justify-center border border-[#60482e]/50 bg-[#17110d] text-base leading-none text-[#aa9675] transition hover:border-[#967342] hover:text-[#f1d7a5]"
          >
            ×
          </button>
        </div>

        <iframe
          src={`${item.href}?embedded=1`}
          title={item.label}
          className="min-h-0 w-full flex-1 border-0 bg-[#090705]"
        />
      </div>
    </div>
  );
}

function NavigationGroup({
  title,
  items,
}: {
  title: string;
  items: React.ReactNode[];
}) {
  return (
    <section className="mb-4 border-b border-[#6e5535]/20 pb-4">
      <p className="mb-2.5 hidden text-[8px] uppercase tracking-[0.3em] text-[#766754] lg:block">
        {title}
      </p>

      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5 lg:grid-cols-1">
        {items}
      </div>
    </section>
  );
}
