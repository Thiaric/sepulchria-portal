"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type PortalSidebarProps = {
  unreadMessageCount: number;
};

const navigationItems = [
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
    label: "Character",
    icon: "♙",
    href: "/character",
    activePaths: ["/character"],
  },
  {
    label: "Codex",
    icon: "⌘",
    href: "/codex",
    activePaths: ["/codex"],
    disabled: true,
  },
  {
    label: "Spells",
    icon: "✧",
    href: "/spells",
    activePaths: ["/spells"],
    disabled: true,
  },
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
    disabled: true,
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
}: PortalSidebarProps) {
  const pathname = usePathname();

  function isActive(activePaths: string[]) {
    return activePaths.some((path) => {
      if (path === "/") {
        return pathname === "/";
      }

      return pathname === path || pathname.startsWith(`${path}/`);
    });
  }

  return (
    <aside className="border-b border-[#6e5535]/30 bg-[#100d0b]/90 lg:sticky lg:top-20 lg:h-[calc(100vh-5rem)] lg:overflow-y-auto lg:border-b-0 lg:border-r">
      <div className="p-4 lg:p-5">
        <section className="mb-5 hidden border border-[#6e5535]/40 bg-[#1b1511] p-4 lg:block">
          <p className="text-[9px] uppercase tracking-[0.3em] text-[#887660]">
            Current chronicle
          </p>

          <p className="mt-2 font-serif text-lg text-[#dbc28d]">
            The City Beneath
          </p>

          <p className="mt-2 text-xs leading-5 text-[#9e907d]">
            A sealed city, a dying covenant and the first whispers from below.
          </p>
        </section>

        <nav aria-label="Main navigation">
          <p className="mb-3 hidden text-[9px] uppercase tracking-[0.32em] text-[#766754] lg:block">
            Navigation
          </p>

          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-1">
            {navigationItems.map((item) => {
              const active = isActive(item.activePaths);
              const isMessages = item.label === "Messages";

              if (item.disabled) {
                return (
                  <div
                    key={item.label}
                    title="Coming soon"
                    className="flex cursor-not-allowed items-center gap-2 border border-transparent px-3 py-3 text-xs text-[#62594d] opacity-65 lg:text-sm"
                  >
                    <span className="w-5 text-center">{item.icon}</span>
                    <span className="truncate">{item.label}</span>
                  </div>
                );
              }

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex items-center gap-2 border px-3 py-3 text-xs transition lg:text-sm ${
                    active
                      ? "border-[#8d6d3e] bg-[#332719] text-[#efd9aa]"
                      : "border-transparent text-[#b6a894] hover:border-[#5d4930] hover:bg-[#1d1712] hover:text-[#e8d8ba]"
                  }`}
                >
                  <span className="w-5 text-center text-[#b68b4f]">
                    {item.icon}
                  </span>

                  <span className="truncate">{item.label}</span>

                  {isMessages && unreadMessageCount > 0 ? (
                    <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-[#7a291f] px-1.5 py-0.5 text-[9px] font-semibold text-[#ffe1ac]">
                      {unreadMessageCount > 99
                        ? "99+"
                        : unreadMessageCount}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="mt-7 hidden border-t border-[#6e5535]/30 pt-4 lg:block">
          <span className="block py-2 text-[10px] uppercase tracking-[0.2em] text-[#5f5549]">
            Rules · Coming soon
          </span>

          <span className="block py-2 text-[10px] uppercase tracking-[0.2em] text-[#5f5549]">
            Support · Coming soon
          </span>

          <span className="block py-2 text-[10px] uppercase tracking-[0.2em] text-[#5f5549]">
            Staff · Coming soon
          </span>
        </div>
      </div>
    </aside>
  );
}