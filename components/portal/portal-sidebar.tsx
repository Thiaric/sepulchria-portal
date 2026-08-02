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
    disabled: true,
  },
  {
    label: "World",
    icon: "🌏︎",
    href: "/world",
    activePaths: ["/world"],
    disabled: true,
  },
  {
    label: "Races",
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
    label: "Spells",
    icon: "✵",
    href: "/spells",
    activePaths: ["/spells"],
    disabled: true,
  },
];

const serviceNavigationItems: NavigationItem[] = [
  {
    label: "Market",
    icon: "⚖",
    href: "/market",
    activePaths: ["/market"],
    disabled: true,
  },
  {
    label: "Forum",
    icon: "☷",
    href: "/forum",
    activePaths: ["/forum"],
  },
  {
    label: "Messages",
    icon: "✉",
    href: "/messages",
    activePaths: ["/messages"],
  },
];

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
    const parsedCount = Number.parseInt(
      value,
      10,
    );

    if (Number.isFinite(parsedCount)) {
      return Math.max(0, parsedCount);
    }
  }

  return fallback;
}

export function PortalSidebar({
  unreadMessageCount,
  unreadForumCount,
}: PortalSidebarProps) {
  const pathname = usePathname();

  const [
    currentUnreadForumCount,
    setCurrentUnreadForumCount,
  ] = useState(
    normalizeCount(unreadForumCount),
  );

  useEffect(() => {
    setCurrentUnreadForumCount(
      normalizeCount(unreadForumCount),
    );
  }, [unreadForumCount]);

  const refreshForumCount =
    useCallback(async () => {
      const supabase = createClient();

      const {
        data,
        error,
      } = await supabase.rpc(
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
    const supabase = createClient();

    void refreshForumCount();

    const channel = supabase
      .channel("forum-sidebar-unread-count")
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
          table: "forum_topic_reads",
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
          table: "forum_topic_reads",
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

    const handleWindowFocus = () => {
      void refreshForumCount();
    };

    const handleVisibilityChange = () => {
      if (
        document.visibilityState ===
        "visible"
      ) {
        void refreshForumCount();
      }
    };

    window.addEventListener(
      "focus",
      handleWindowFocus,
    );

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange,
    );

    return () => {
      window.clearInterval(
        pollingInterval,
      );

      window.removeEventListener(
        "focus",
        handleWindowFocus,
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );

      void supabase.removeChannel(channel);
    };
  }, [refreshForumCount]);

  function isActive(
    activePaths: string[],
  ) {
    return activePaths.some((path) => {
      if (path === "/") {
        return pathname === "/";
      }

      return (
        pathname === path ||
        pathname.startsWith(`${path}/`)
      );
    });
  }

  function renderNavigationItem(
    item: NavigationItem,
  ) {
    const active = isActive(
      item.activePaths,
    );

    const isMessages =
      item.label === "Messages";

    const isForum =
      item.label === "Forum";

    const notificationCount =
      isForum
        ? currentUnreadForumCount
        : 0;

    const hasNotification =
      notificationCount > 0;

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

    return (
      <Link
        key={item.label}
        href={item.href}
        className={`flex min-h-9 items-center gap-2 border px-2.5 py-2 text-[11px] transition lg:text-xs ${
          active
            ? "border-[#8d6d3e] bg-[#332719] text-[#efd9aa]"
            : hasNotification &&
                isForum
              ? "border-[#a87532] bg-[#24190f] text-[#efd9aa] shadow-[0_0_12px_rgba(168,117,50,0.15)] hover:border-[#c08b43] hover:bg-[#2c1e12]"
              : "border-transparent text-[#b6a894] hover:border-[#5d4930] hover:bg-[#1d1712] hover:text-[#e8d8ba]"
        }`}
      >
        <span className="w-4 shrink-0 text-center text-[12px] text-[#b68b4f]">
          {item.icon}
        </span>

        <span className="truncate">
          {item.label}
        </span>

        {hasNotification ? (
  <span
    title={`${notificationCount} unread forum notification${
      notificationCount === 1 ? "" : "s"
    }`}
    aria-label={`${notificationCount} unread forum notification${
      notificationCount === 1 ? "" : "s"
    }`}
    className="ml-auto inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-[#d19a4c] bg-[#7a291f] text-[7px] font-bold leading-none text-[#ffe1ac]"
  >
    {notificationCount > 9
      ? "9+"
      : notificationCount}
  </span>
) : null}

        {isMessages ? (
          <UnreadMessageBadge
            initialCount={
              unreadMessageCount
            }
            variant="inline"
          />
        ) : null}
      </Link>
    );
  }

  return (
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

          <NavigationGroup
            title="services and utilities"
            items={serviceNavigationItems.map(
              renderNavigationItem,
            )}
            last
          />
        </nav>

        <div className="mt-5 hidden border-t border-[#6e5535]/30 pt-3 lg:block">
          <span className="block py-1.5 text-[9px] uppercase tracking-[0.18em] text-[#5f5549]">
            Rules · Coming soon
          </span>

          <span className="block py-1.5 text-[9px] uppercase tracking-[0.18em] text-[#5f5549]">
            Support · Coming soon
          </span>

          <span className="block py-1.5 text-[9px] uppercase tracking-[0.18em] text-[#5f5549]">
            Staff · Coming soon
          </span>
        </div>
      </div>
    </aside>
  );
}

function NavigationGroup({
  title,
  items,
  last = false,
}: {
  title: string;
  items: React.ReactNode[];
  last?: boolean;
}) {
  return (
    <section
      className={
        last
          ? ""
          : "mb-4 border-b border-[#6e5535]/20 pb-4"
      }
    >
      <p className="mb-2.5 hidden text-[8px] uppercase tracking-[0.3em] text-[#766754] lg:block">
        {title}
      </p>

      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5 lg:grid-cols-1">
        {items}
      </div>
    </section>
  );
}