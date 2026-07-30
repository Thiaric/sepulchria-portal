"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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
    label: "World",
    icon: "◈",
    href: "/world",
    activePaths: ["/world"],
    disabled: true,
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
    label: "Races",
    icon: "♢",
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
    icon: "✧",
    href: "/spells",
    activePaths: ["/spells"],
    disabled: true,
  },
];

const serviceNavigationItems: NavigationItem[] = [
  {
    label: "Market",
    icon: "◆",
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

export function PortalSidebar({
  unreadMessageCount,
  unreadForumCount,
}: PortalSidebarProps) {
  const pathname = usePathname();

  function isActive(activePaths: string[]) {
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
    const active = isActive(item.activePaths);
    const isMessages =
      item.label === "Messages";
    const isForum =
      item.label === "Forum";

    const notificationCount = isMessages
      ? unreadMessageCount
      : isForum
        ? unreadForumCount
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
            : hasNotification && isForum
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
            className={`ml-auto inline-flex min-w-4 items-center justify-center rounded-full px-1 py-0.5 text-[8px] font-semibold leading-none ${
              isForum
                ? "bg-[#9a6728] text-[#fff0cf]"
                : "bg-[#7a291f] text-[#ffe1ac]"
            }`}
          >
            {notificationCount > 99
              ? "99+"
              : notificationCount}
          </span>
        ) : null}
      </Link>
    );
  }

  return (
    <aside className="border-b border-[#6e5535]/30 bg-[#100d0b]/90 lg:sticky lg:top-20 lg:h-[calc(100vh-5rem)] lg:overflow-y-auto lg:border-b-0 lg:border-r">
      <div className="p-3 lg:p-4">
        <section className="mb-4 hidden border border-[#6e5535]/40 bg-[#1b1511] p-3 lg:block">
          <p className="text-[8px] uppercase tracking-[0.28em] text-[#887660]">
            Current chronicle
          </p>

          <p className="mt-1.5 font-serif text-base text-[#dbc28d]">
            The City Beneath
          </p>

          <p className="mt-1.5 text-[11px] leading-4 text-[#9e907d]">
            A sealed city, a dying covenant and the first whispers from below.
          </p>
        </section>

        <nav aria-label="Main navigation">
          <NavigationGroup
            title="Navigation"
            items={mainNavigationItems.map(
              renderNavigationItem,
            )}
          />

          <NavigationGroup
            title="Codex"
            items={codexNavigationItems.map(
              renderNavigationItem,
            )}
          />

          <NavigationGroup
            title="City services"
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