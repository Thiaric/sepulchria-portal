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
  title: string;
  icon: string;
  href: string;
  activePaths: string[];
  disabled?: boolean;
  opensModal?: boolean;
  subItem?: boolean;
};

const mainNavigationItems: NavigationItem[] = [
  {
    label: "Dashboard",
    title:
      "Your portal overview, recent activity and character information.",
    icon: "⌂",
    href: "/",
    activePaths: ["/"],
  },
  {
    label: "Play",
    title:
      "Enter the city, move between locations and roleplay with other characters.",
    icon: "✦",
    href: "/game",
    activePaths: ["/game"],
  },
  {
    label: "Characters",
    title:
      "Browse the characters who inhabit Sepulchria.",
    icon: "♙",
    href: "/characters",
    activePaths: ["/characters"],
  },
];

const codexItem: NavigationItem = {
  label: "Codex",
  title:
    "Open the in-world Codex and explore Aureth's history, locations and lore.",
  icon: "🕮",
  href: "/codex",
  activePaths: ["/codex"],
  opensModal: true,
};

const rulesItem: NavigationItem = {
  label: "Rules",
  title:
    "Read the official game rules and off-game documentation.",
  icon: "🗊",
  href: "/rules",
  activePaths: ["/rules"],
  opensModal: true,
};

const glossaryItem: NavigationItem = {
  label: "Glossary",
  title:
    "Look up Sepulchria terminology, meanings and related rules.",
  icon: "⌕",
  href: "/rules?view=glossary",
  activePaths: [],
  opensModal: true,
  subItem: true,
};

const otherCodexNavigationItems: NavigationItem[] = [
  {
    label: "Ancestries",
    title:
      "Read about the playable ancestries of Sepulchria.",
    icon: "⚜",
    href: "/races",
    activePaths: ["/races"],
  },
  {
    label: "Associations",
    title:
      "Explore the Associations and their place in Sepulchrian society.",
    icon: "⌘",
    href: "/associations",
    activePaths: ["/associations"],
  },
  {
    label: "Warping",
    title:
      "Read about magic in Sepulchria, including Warping.",
    icon: "✵",
    href: "/spells",
    activePaths: ["/spells"],
    disabled: true,
  },
];

const marketItem: NavigationItem = {
  label: "Market",
  title:
    "Browse the market and buy or sell items.",
  icon: "⚖",
  href: "/market",
  activePaths: ["/market"],
  disabled: true,
};

const messagesItem: NavigationItem = {
  label: "Messages",
  title:
    "Open your private conversations with other characters.",
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

    if (
      Number.isFinite(parsedCount)
    ) {
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

  const [
    modalItem,
    setModalItem,
  ] =
    useState<NavigationItem | null>(
      null,
    );

  const [
    rulesExpanded,
    setRulesExpanded,
  ] = useState(false);

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
      if (
        event.key === "Escape"
      ) {
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
    const supabase =
      createClient();

    void refreshForumCount();

    const channel =
      supabase
        .channel(
          "forum-sidebar-unread-count",
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table:
              "forum_posts",
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
        .subscribe(
          (
            status,
            error,
          ) => {
            if (
              status ===
              "SUBSCRIBED"
            ) {
              void refreshForumCount();
            }

            if (
              status ===
                "CHANNEL_ERROR" ||
              status ===
                "TIMED_OUT"
            ) {
              console.error(
                "Forum sidebar realtime error:",
                error,
              );
            }
          },
        );

    const pollingInterval =
      window.setInterval(
        () => {
          void refreshForumCount();
        },
        5000,
      );

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
          return (
            pathname === "/"
          );
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
    const active =
      isActive(
        item.activePaths,
      );

    const isMessages =
      item.label ===
      "Messages";

    if (item.disabled) {
      return (
        <div
          key={item.label}
          title={`${item.title} — Coming soon`}
          className={`flex min-h-[var(--portal-nav-min-h)] cursor-not-allowed items-center gap-2 border border-transparent px-2.5 py-[var(--portal-nav-y)] text-[11px] text-[#62594d] opacity-65 lg:text-xs ${
            item.subItem
              ? "lg:ml-5"
              : ""
          }`}
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

    const modalActive =
      item.opensModal &&
      modalItem?.href ===
        item.href;

    const itemClassName = `
      flex
      min-h-[var(--portal-nav-min-h)]
      items-center
      gap-2
      border
      px-2.5
      py-[var(--portal-nav-y)]
      text-[11px]
      transition
      lg:text-xs
      ${
        item.subItem
          ? "lg:ml-5 lg:min-h-7 lg:py-1 lg:text-[10px]"
          : ""
      }
      ${
        modalActive ||
        active
          ? "border-[#8d6d3e] bg-[#332719] text-[#efd9aa]"
          : item.subItem
            ? "border-transparent text-[#8f806d] hover:border-[#59432c] hover:bg-[#19120d] hover:text-[#d7bd91]"
            : "border-transparent text-[#b6a894] hover:border-[#5d4930] hover:bg-[#1d1712] hover:text-[#e8d8ba]"
      }
    `;

    const contents = (
      <>
        <span
          className={`w-4 shrink-0 text-center text-[#b68b4f] ${
            item.subItem
              ? "text-[10px]"
              : "text-[12px]"
          }`}
        >
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
          title={
            item.title
          }
          onClick={() =>
            setModalItem(
              item,
            )
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
        title={item.title}
        className={
          itemClassName
        }
      >
        {contents}
      </Link>
    );
  }

  function renderRulesMenu() {
    const active =
      isActive(
        rulesItem.activePaths,
      );

    const modalActive =
      modalItem?.href ===
      rulesItem.href;

    return (
      <div
        key="rules-menu"
        className="min-w-0"
      >
        <div className="flex min-w-0 items-stretch">
          {/* RULES MAIN BUTTON */}
          <button
            type="button"
            title={
              rulesItem.title
            }
            onClick={() =>
              setModalItem(
                rulesItem,
              )
            }
            className={`flex min-h-[var(--portal-nav-min-h)] min-w-0 flex-1 items-center gap-2 border px-2.5 py-[var(--portal-nav-y)] text-left text-[11px] transition lg:text-xs ${
              modalActive ||
              active
                ? "border-[#8d6d3e] bg-[#332719] text-[#efd9aa]"
                : "border-transparent text-[#b6a894] hover:border-[#5d4930] hover:bg-[#1d1712] hover:text-[#e8d8ba]"
            }`}
            aria-haspopup="dialog"
            aria-expanded={
              modalActive
            }
          >
            <span className="w-4 shrink-0 text-center text-[12px] text-[#b68b4f]">
              {
                rulesItem.icon
              }
            </span>

            <span className="truncate">
              {
                rulesItem.label
              }
            </span>
          </button>

          {/* PLUS / MINUS */}
          <button
  type="button"
  onClick={() =>
    setRulesExpanded(
      (current) => !current,
    )
  }
  title={
    rulesExpanded
      ? "Hide Rules submenu"
      : "Show Rules submenu"
  }
  aria-label={
    rulesExpanded
      ? "Collapse Rules submenu"
      : "Expand Rules submenu"
  }
  aria-expanded={rulesExpanded}
  className="ml-1 flex w-7 shrink-0 items-center justify-center gap-2 bg-transparent text-sm text-[#9e8767] transition hover:text-[#efd9aa]"
>
  <span
    aria-hidden="true"
    className="h-4 w-px shrink-0 bg-[#60482e]/45"
  />

  <span>
    {rulesExpanded ? "−" : "+"}
  </span>
</button>
        </div>

        {/* RULES SUBMENU */}
        {rulesExpanded ? (
          <div className="mt-1 border-l border-[#60482e]/40 pl-3 lg:ml-4">
            <button
              type="button"
              title={
                glossaryItem.title
              }
              onClick={() =>
                setModalItem(
                  glossaryItem,
                )
              }
              className={`flex min-h-7 w-full items-center gap-2 border px-2 py-1 text-left text-[10px] transition ${
                modalItem?.href ===
                glossaryItem.href
                  ? "border-[#8d6d3e] bg-[#2a1d12] text-[#efd9aa]"
                  : "border-transparent text-[#8f806d] hover:border-[#59432c] hover:bg-[#19120d] hover:text-[#d7bd91]"
              }`}
              aria-haspopup="dialog"
            >
              <span className="w-4 shrink-0 text-center text-[10px] text-[#9b7446]">
                {
                  glossaryItem.icon
                }
              </span>

              <span className="truncate">
                {
                  glossaryItem.label
                }
              </span>
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <>
      <aside
        data-portal-column
        data-portal-scroll
        className="border-b border-[#6e5535]/30 bg-[#100d0b]/90 lg:h-full lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain lg:border-b-0 lg:border-r"
      >
        <div className="p-3 lg:p-[var(--portal-column-pad)]">
          <nav aria-label="Main navigation">
            <NavigationGroup
              title="Navigate the World"
              items={mainNavigationItems.map(
                renderNavigationItem,
              )}
            />

            <NavigationGroup
              title="Codex and rules"
              items={[
                renderNavigationItem(
                  codexItem,
                ),

                renderRulesMenu(),

                ...otherCodexNavigationItems.map(
                  renderNavigationItem,
                ),
              ]}
            />

            <section>
              <p className="mb-2 hidden text-[8px] uppercase tracking-[0.3em] text-[#766754] lg:block">
                services and
                utilities
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

          <div className="mt-[var(--portal-group-gap)] hidden border-t border-[#6e5535]/30 pt-2 lg:block">
            <span className="block py-1 text-[9px] uppercase tracking-[0.18em] text-[#5f5549]">
              Support · Coming
              soon
            </span>

            <span className="block py-1 text-[9px] uppercase tracking-[0.18em] text-[#5f5549]">
              Staff · Coming
              soon
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
  const separator =
    item.href.includes("?")
      ? "&"
      : "?";

  const iframeSrc =
    `${item.href}${separator}embedded=1`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={
        item.label
      }
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 p-2 sm:p-4"
      onMouseDown={(
        event,
      ) => {
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
          src={iframeSrc}
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
    <section className="mb-[var(--portal-group-gap)] border-b border-[#6e5535]/20 pb-[var(--portal-group-gap)]">
      <p className="mb-2 hidden text-[8px] uppercase tracking-[0.3em] text-[#766754] lg:block">
        {title}
      </p>

      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5 lg:grid-cols-1">
        {items}
      </div>
    </section>
  );
}