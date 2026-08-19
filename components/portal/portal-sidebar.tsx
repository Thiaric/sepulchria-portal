"use client";

import Link from "next/link";
import {
  usePathname,
  useSearchParams,
} from "next/navigation";
import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";
import { UnreadMessageBadge } from "@/components/messages/unread-message-badge";
import { ForumSidebarMenu } from "@/components/portal/forum-sidebar-menu";
import { enterRoomFromMap } from "@/app/(portal)/game/actions";

type PortalSidebarProps = {
  unreadMessageCount: number;
  unreadForumCount: number;
  isStaff: boolean;
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
    label: "Aureth's Map",
    title:
      "Your portal overview, recent activity and character information.",
    icon: "/icons/dashboard.png",
    href: "/",
    activePaths: ["/"],
  },
  {
  label: "Enter Sepulchria",
  title:
    "Open the Sepulchria map and choose where to go.",
  icon: "/icons/play.png",
  href: "/?map=sepulchria",
  activePaths: [],
},
  {
    label: "Characters",
    title:
      "Browse the characters who inhabit Sepulchria.",
    icon: "/icons/characters.png",
    href: "/characters",
    activePaths: ["/characters"],
  },
];

const codexItem: NavigationItem = {
  label: "Codex",
  title:
    "Open the in-world Codex and explore Aureth's history, locations and lore.",
  icon: "/icons/codex.png",
  href: "/codex",
  activePaths: ["/codex"],
  opensModal: true,
};

const rulesItem: NavigationItem = {
  label: "Rules",
  title:
    "Read the official game rules and off-game documentation.",
  icon: "/icons/rules.png",
  href: "/rules",
  activePaths: ["/rules"],
  opensModal: true,
};

const glossaryItem: NavigationItem = {
  label: "Glossary",
  title:
    "Look up Sepulchria terminology, meanings and related rules.",
  icon: "/icons/rules.png",
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
    icon: "/icons/ancestries.png",
    href: "/races",
    activePaths: ["/races"],
  },
  {
    label: "Associations",
    title:
      "Explore the Associations and their place in Sepulchrian society.",
    icon: "/icons/associations.png",
    href: "/associations",
    activePaths: ["/associations"],
  },
  {
    label: "Orders",
    title:
      "Read about the Orders, their ties to Associations, and their structure and scope.",
    icon: "/icons/orders.png",
    href: "/orders",
    activePaths: ["/orders"],
  },
  {
    label: "Warping",
    title:
      "Read about magic in Sepulchria, including Warping.",
    icon: "/icons/warping.png",
    href: "/spells",
    activePaths: ["/spells"],
    disabled: true,
  },
  {
    label: "Feats",
    title:
      "Browse the Feats available for Characters through Ancestries, Orders and other sources.",
    icon: "/icons/gifts.png",
    href: "/gifts",
    activePaths: ["/gifts"],
  },
];

const marketItem: NavigationItem = {
  label: "Market",
  title:
    "Browse the market and buy or sell items.",
  icon: "/icons/market.png",
  href: "/market",
  activePaths: ["/market"],
};

const privateLocationItem: NavigationItem = {
  label: "Private Location",
  title:
    "Manage or enter invitation-only Private Locations.",
  icon: "/icons/messages.png",
  href: "/private-locations",
  activePaths: ["/private-locations"],
};

const friendsItem: NavigationItem = {
  label: "Friend List",
  title:
    "Open your character relationships and relationship requests.",
  icon: "/icons/characters.png",
  href: "/friends",
  activePaths: ["/friends"],
};

const messagesItem: NavigationItem = {
  label: "Messages",
  title:
    "Open your private conversations with other characters.",
  icon: "/icons/messages.png",
  href: "/messages",
  activePaths: ["/messages"],
};

const manageOrderItem: NavigationItem = {
  label: "Manage Order",
  title:
    "Manage the members and affairs of the Order you lead.",
  icon: "/icons/orders.png",
  href: "/orders/manage",
  activePaths: ["/orders/manage"],
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
  isStaff,
}: PortalSidebarProps) {
  const pathname = usePathname();

  const searchParams =
    useSearchParams();

  const sepulchriaMapOpen =
    searchParams.get("map") ===
    "sepulchria";

  const [
    hasOrderLeadership,
    setHasOrderLeadership,
  ] = useState(false);

  const [
  mobileForumExpanded,
  setMobileForumExpanded,
] = useState(false);

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

  const [
    oddJobsRoomId,
    setOddJobsRoomId,
  ] = useState<string | null>(null);

  const [
    hasFriendListFeature,
    setHasFriendListFeature,
  ] = useState(false);

  const [
    hasPrivateLocationAccess,
    setHasPrivateLocationAccess,
  ] = useState(false);

  const refreshPrivateLocationAccess =
    useCallback(async () => {
      const supabase =
        createClient();

      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user) {
        setHasPrivateLocationAccess(
          false,
        );
        return;
      }

      const {
        data: character,
      } = await supabase
        .from("characters")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!character) {
        setHasPrivateLocationAccess(
          false,
        );
        return;
      }

      const [
        entitlementResult,
        membershipResult,
        invitationResult,
      ] = await Promise.all([
        supabase
          .from("character_feature_entitlements")
          .select("enabled")
          .eq(
            "character_id",
            character.id,
          )
          .eq(
            "feature_key",
            "private_chat",
          )
          .maybeSingle(),

        supabase
          .from("private_location_members")
          .select("room_id, role")
          .eq(
            "character_id",
            character.id,
          )
          .eq("status", "active")
          .eq("role", "member")
          .limit(1)
          .maybeSingle(),

        supabase
          .from("private_location_invitations")
          .select("id")
          .eq(
            "recipient_character_id",
            character.id,
          )
          .eq("status", "pending")
          .limit(1)
          .maybeSingle(),
      ]);

      setHasPrivateLocationAccess(
        isStaff ||
        entitlementResult.data?.enabled === true ||
        Boolean(membershipResult.data),
      );
    }, [isStaff]);

  const refreshFriendListFeature =
    useCallback(async () => {
      const supabase =
        createClient();

      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user) {
        setHasFriendListFeature(
          false,
        );
        return;
      }

      const {
        data: character,
        error: characterError,
      } = await supabase
        .from("characters")
        .select("id")
        .eq(
          "user_id",
          user.id,
        )
        .maybeSingle();

      if (
        characterError ||
        !character
      ) {
        if (characterError) {
          console.error(
            "Unable to identify character for Friend List access:",
            characterError,
          );
        }

        setHasFriendListFeature(
          false,
        );
        return;
      }

      const {
        data: entitlement,
        error: entitlementError,
      } = await supabase
        .from(
          "character_feature_entitlements",
        )
        .select("enabled")
        .eq(
          "character_id",
          character.id,
        )
        .eq(
          "feature_key",
          "friend_list",
        )
        .maybeSingle();

      if (entitlementError) {
        console.error(
          "Unable to check Friend List access:",
          entitlementError,
        );

        setHasFriendListFeature(
          false,
        );
        return;
      }

      setHasFriendListFeature(
        entitlement?.enabled ===
          true,
      );
    }, []);

  const refreshOrderLeadership =
    useCallback(async () => {
      const supabase =
        createClient();

      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user) {
        setHasOrderLeadership(false);
        return;
      }

      const {
        data: character,
        error: characterError,
      } = await supabase
        .from("characters")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (
        characterError ||
        !character
      ) {
        setHasOrderLeadership(false);
        return;
      }

      const {
        data: memberships,
        error: membershipError,
      } = await supabase
        .from("order_memberships")
        .select(`
          id,
          level:order_levels!order_memberships_order_level_id_fkey(
            level
          )
        `)
        .eq(
          "character_id",
          character.id,
        );

      if (membershipError) {
        console.error(
          "Unable to check Order leadership:",
          membershipError,
        );
        setHasOrderLeadership(false);
        return;
      }

      setHasOrderLeadership(
        (memberships ?? []).some(
          (membership) => {
            const relation =
              Array.isArray(
                membership.level,
              )
                ? membership.level[0]
                : membership.level;

            return (
              relation?.level === 6
            );
          },
        ),
      );
    }, []);

  useEffect(() => {
    void refreshPrivateLocationAccess();

    function handleFocus() {
      void refreshPrivateLocationAccess();
    }

    function handleVisibility() {
      if (
        document.visibilityState === "visible"
      ) {
        void refreshPrivateLocationAccess();
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
      window.removeEventListener(
        "focus",
        handleFocus,
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibility,
      );
    };
  }, [refreshPrivateLocationAccess]);

  useEffect(() => {
    void refreshFriendListFeature();

    function handleFocus() {
      void refreshFriendListFeature();
    }

    function handleVisibility() {
      if (
        document.visibilityState ===
        "visible"
      ) {
        void refreshFriendListFeature();
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
      window.removeEventListener(
        "focus",
        handleFocus,
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibility,
      );
    };
  }, [refreshFriendListFeature]);

  useEffect(() => {
    void refreshOrderLeadership();

    function handleFocus() {
      void refreshOrderLeadership();
    }

    function handleVisibility() {
      if (
        document.visibilityState ===
        "visible"
      ) {
        void refreshOrderLeadership();
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
      window.removeEventListener(
        "focus",
        handleFocus,
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibility,
      );
    };
  }, [refreshOrderLeadership]);

  useEffect(() => {
    setCurrentUnreadForumCount(
      normalizeCount(
        unreadForumCount,
      ),
    );
  }, [unreadForumCount]);

  useEffect(() => {
    let cancelled = false;

    async function loadOddJobsRoom() {
      const supabase =
        createClient();

      const {
        data: room,
        error,
      } = await supabase
        .from("rooms")
        .select("id")
        .eq(
          "slug",
          "odd-jobs-bureau",
        )
        .eq("is_active", true)
        .maybeSingle();

      if (cancelled) {
        return;
      }

      if (error) {
        console.error(
          "Unable to load The Odd Jobs Bureau:",
          error,
        );
        setOddJobsRoomId(null);
        return;
      }

      setOddJobsRoomId(
        room?.id ?? null,
      );
    }

    void loadOddJobsRoom();

    return () => {
      cancelled = true;
    };
  }, []);

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
  item?: NavigationItem,
) {
  if (
    item?.label === "Enter Sepulchria"
  ) {
    return (
      pathname === "/" &&
      sepulchriaMapOpen
    );
  }

  if (
  item?.label ===
  "Aureth's Map"
) {
    return (
      pathname === "/" &&
      !sepulchriaMapOpen
    );
  }

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
    item,
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
          <span
  className={`flex shrink-0 items-center justify-center ${
    item.subItem
      ? "h-4 w-4"
      : "h-[18px] w-[18px]"
  }`}
>
  <img
    src={item.icon}
    alt=""
    aria-hidden="true"
    className="h-full w-full object-contain opacity-35"
  />
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
  className={`flex shrink-0 items-center justify-center ${
    item.subItem
      ? "h-4 w-4"
      : "h-[18px] w-[18px]"
  }`}
>
  <img
    src={item.icon}
    alt=""
    aria-hidden="true"
    className="h-full w-full object-contain"
  />
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
            <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center">
  <img
    src={rulesItem.icon}
    alt=""
    aria-hidden="true"
    className="h-full w-full object-contain"
  />
</span>

            <span className="truncate">
              {
                rulesItem.label
              }
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              setRulesExpanded(
                (current) =>
                  !current,
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
            aria-expanded={
              rulesExpanded
            }
            className="ml-1 flex w-7 shrink-0 items-center justify-center gap-2 bg-transparent text-sm text-[#9e8767] transition hover:text-[#efd9aa]"
          >
            <span
              aria-hidden="true"
              className="h-4 w-px shrink-0 bg-[#60482e]/45"
            />

            <span>
              {rulesExpanded
                ? "−"
                : "+"}
            </span>
          </button>
        </div>

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
              <span className="flex h-4 w-4 shrink-0 items-center justify-center">
  <img
    src={glossaryItem.icon}
    alt=""
    aria-hidden="true"
    className="h-full w-full object-contain"
  />
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

  function renderMobileItem(
    item: NavigationItem,
  ) {
    const active =
  isActive(
    item.activePaths,
    item,
  );

    const className = `
      relative
      flex
      h-10
      min-w-0
      items-center
      justify-center
      border
      text-[17px]
      leading-none
      transition
      ${
        item.disabled
          ? "cursor-not-allowed border-transparent text-[#51483d] opacity-45"
          : active
            ? "border-[#8d6d3e] bg-[#332719] text-[#efd9aa]"
            : "border-transparent text-[#b68b4f] hover:border-[#5d4930] hover:bg-[#1d1712] hover:text-[#efd9aa]"
      }
    `;

    if (item.disabled) {
      return (
        <div
          key={item.label}
          title={`${item.label} — Coming soon`}
          aria-label={`${item.label} — Coming soon`}
          className={
            className
          }
        >
          <span
  className={`flex shrink-0 items-center justify-center ${
    item.subItem
      ? "h-4 w-4"
      : "h-[18px] w-[18px]"
  }`}
>
  <img
    src={item.icon}
    alt=""
    aria-hidden="true"
    className="h-full w-full object-contain"
  />
</span>
        </div>
      );
    }

    if (item.opensModal) {
      return (
        <button
          key={item.label}
          type="button"
          title={item.label}
          aria-label={
            item.label
          }
          onClick={() =>
            setModalItem(
              item,
            )
          }
          className={
            className
          }
        >
          <span
  className={`flex shrink-0 items-center justify-center ${
    item.subItem
      ? "h-4 w-4"
      : "h-[18px] w-[18px]"
  }`}
>
  <img
    src={item.icon}
    alt=""
    aria-hidden="true"
    className="h-full w-full object-contain"
  />
</span>
        </button>
      );
    }

    return (
      <Link
        key={item.label}
        href={item.href}
        title={item.label}
        aria-label={
          item.label
        }
        className={
          className
        }
      >
        <span
  className={`flex shrink-0 items-center justify-center ${
    item.subItem
      ? "h-4 w-4"
      : "h-[18px] w-[18px]"
  }`}
>
  <img
    src={item.icon}
    alt=""
    aria-hidden="true"
    className="h-full w-full object-contain"
  />
</span>

        {item.label ===
          "Messages" &&
        unreadMessageCount >
          0 ? (
          <span className="absolute right-0.5 top-0.5 inline-flex h-3.5 min-w-3.5 items-center justify-center rounded-full border border-[#d19a4c] bg-[#7a291f] px-0.5 text-[7px] font-bold leading-none text-[#ffe1ac]">
            {unreadMessageCount >
            9
              ? "9+"
              : unreadMessageCount}
          </span>
        ) : null}

      </Link>
    );
  }

  function renderMobileOddJobsItem() {
    const className = `
      relative
      flex
      h-10
      min-w-0
      items-center
      justify-center
      border
      text-[17px]
      leading-none
      transition
      ${
        oddJobsRoomId
          ? "border-transparent text-[#b68b4f] hover:border-[#5d4930] hover:bg-[#1d1712] hover:text-[#efd9aa]"
          : "cursor-not-allowed border-transparent text-[#51483d] opacity-45"
      }
    `;

    return (
      <form
        action={enterRoomFromMap}
        className="min-w-0"
      >
        <input
          type="hidden"
          name="roomId"
          value={oddJobsRoomId ?? ""}
        />

        <button
          type="submit"
          disabled={!oddJobsRoomId}
          title={
            oddJobsRoomId
              ? "The Odd Jobs Bureau"
              : "The Odd Jobs Bureau is currently unavailable."
          }
          aria-label="The Odd Jobs Bureau"
          className={`${className} w-full`}
        >
          <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center">
            <img
              src="/icons/bureau.png"
              alt=""
              aria-hidden="true"
              className="h-full w-full object-contain"
            />
          </span>
        </button>
      </form>
    );
  }

  const mobileNavigationItems = [
  ...mainNavigationItems,
  codexItem,
  ...otherCodexNavigationItems,
  marketItem,
  ...(hasOrderLeadership
    ? [manageOrderItem]
    : []),
];

  const forumActive =
    pathname === "/forum" ||
    pathname.startsWith(
      "/forum/",
    );

  return (
    <>
      <aside
        data-portal-column
        data-portal-scroll
        className="border-b border-[#6e5535]/30 bg-[#100d0b]/90 lg:h-full lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain lg:border-b-0 lg:border-r"
      >
        {/* MOBILE NAVIGATION */}
<div className="px-2 py-1.5 lg:hidden">
  <nav
    aria-label="Main navigation"
    className="grid grid-cols-5 gap-1 sm:grid-cols-6"
  >
    {mobileNavigationItems.map(
      renderMobileItem,
    )}

    {renderMobileOddJobsItem()}

    {/* RULES */}
    <div
      className={`relative flex h-10 min-w-0 border transition ${
        isActive(
          rulesItem.activePaths,
        ) ||
        modalItem?.href ===
          rulesItem.href
          ? "border-[#8d6d3e] bg-[#332719]"
          : "border-transparent hover:border-[#5d4930] hover:bg-[#1d1712]"
      }`}
    >
      <button
        type="button"
        title="Rules"
        aria-label="Rules"
        onClick={() =>
          setModalItem(
            rulesItem,
          )
        }
        className="flex min-w-0 flex-1 items-center justify-center"
      >
        <img
          src="/icons/rules.png"
          alt=""
          aria-hidden="true"
          className="h-[18px] w-[18px] object-contain"
        />
      </button>

      <button
        type="button"
        onClick={() =>
          setRulesExpanded(
            (current) =>
              !current,
          )
        }
        aria-label={
          rulesExpanded
            ? "Collapse Rules submenu"
            : "Expand Rules submenu"
        }
        className="flex w-5 shrink-0 items-center justify-center border-l border-[#60482e]/45 text-sm text-[#b68b4f]"
      >
        {rulesExpanded
          ? "−"
          : "+"}
      </button>
    </div>

    {/* FORUM */}
    <div
      className={`relative flex h-10 min-w-0 border transition ${
        forumActive
          ? "border-[#8d6d3e] bg-[#332719]"
          : currentUnreadForumCount >
              0
            ? "border-[#a87532] bg-[#24190f]"
            : "border-transparent hover:border-[#5d4930] hover:bg-[#1d1712]"
      }`}
    >
      <Link
        href="/forum"
        title="Forum"
        aria-label="Forum"
        className="relative flex min-w-0 flex-1 items-center justify-center"
      >
        <img
          src="/icons/forum.png"
          alt=""
          aria-hidden="true"
          className="h-[18px] w-[18px] object-contain"
        />

        {currentUnreadForumCount >
        0 ? (
          <span className="absolute right-0.5 top-0.5 inline-flex h-3.5 min-w-3.5 items-center justify-center rounded-full border border-[#d19a4c] bg-[#7a291f] px-0.5 text-[7px] font-bold leading-none text-[#ffe1ac]">
            {currentUnreadForumCount >
            9
              ? "9+"
              : currentUnreadForumCount}
          </span>
        ) : null}
      </Link>

      <button
        type="button"
        onClick={() =>
          setMobileForumExpanded(
            (current) =>
              !current,
          )
        }
        aria-label={
          mobileForumExpanded
            ? "Collapse Forum shortcuts"
            : "Expand Forum shortcuts"
        }
        className="flex w-5 shrink-0 items-center justify-center border-l border-[#60482e]/45 text-sm text-[#b68b4f]"
      >
        {mobileForumExpanded
          ? "−"
          : "+"}
      </button>
    </div>

    {hasPrivateLocationAccess
      ? renderMobileItem(
          privateLocationItem,
        )
      : null}

    {hasFriendListFeature
      ? renderMobileItem(
          friendsItem,
        )
      : null}

    {renderMobileItem(
      messagesItem,
    )}
  </nav>

  {rulesExpanded ? (
    <div className="mt-1 border border-[#60482e]/40 bg-[#100c09] p-1">
      <button
        type="button"
        title="Glossary"
        aria-label="Glossary"
        onClick={() =>
          setModalItem(
            glossaryItem,
          )
        }
        className="flex h-9 w-full items-center justify-center border border-transparent transition hover:border-[#59432c] hover:bg-[#19120d]"
      >
        <img
          src="/icons/rules.png"
          alt=""
          aria-hidden="true"
          className="h-4 w-4 object-contain"
        />
      </button>
    </div>
  ) : null}

  {mobileForumExpanded ? (
    <div className="mt-1 border border-[#60482e]/40 bg-[#100c09] p-1">
      <ForumSidebarMenu
        unreadCount={
          currentUnreadForumCount
        }
      />
    </div>
  ) : null}
</div>

        {/* DESKTOP SIDEBAR */}
        <div className="hidden p-[var(--portal-column-pad)] lg:block">
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
              <p className="mb-2 text-[8px] uppercase tracking-[0.3em] text-[#766754]">
                services and
                utilities
              </p>

              <div className="grid grid-cols-1 gap-1.5">
                {renderNavigationItem(
                  marketItem,
                )}

                <form
                  action={enterRoomFromMap}
                >
                  <input
                    type="hidden"
                    name="roomId"
                    value={
                      oddJobsRoomId ?? ""
                    }
                  />

                  <button
                    type="submit"
                    disabled={!oddJobsRoomId}
                    title={
                      oddJobsRoomId
                        ? "Go directly to The Odd Jobs Bureau."
                        : "The Odd Jobs Bureau is currently unavailable."
                    }
                    className="
                      flex
                      min-h-[var(--portal-nav-min-h)]
                      w-full
                      items-center
                      gap-2
                      border
                      border-transparent
                      px-2.5
                      py-[var(--portal-nav-y)]
                      text-left
                      text-[11px]
                      text-[#b6a894]
                      transition
                      hover:border-[#5d4930]
                      hover:bg-[#1d1712]
                      hover:text-[#e8d8ba]
                      disabled:cursor-not-allowed
                      disabled:opacity-45
                      lg:text-xs
                    "
                  >
                    <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center">
                      <img
                        src="/icons/bureau.png"
                        alt=""
                        aria-hidden="true"
                        className="h-full w-full object-contain"
                      />
                    </span>

                    <span className="truncate">
                      The Odd Jobs Bureau
                    </span>
                  </button>
                </form>

                <ForumSidebarMenu
                  unreadCount={
                    currentUnreadForumCount
                  }
                />

                {hasOrderLeadership
                  ? renderNavigationItem(
                      manageOrderItem,
                    )
                  : null}

                {hasPrivateLocationAccess
                  ? renderNavigationItem(
                      privateLocationItem,
                    )
                  : null}

                {hasFriendListFeature
                  ? renderNavigationItem(
                      friendsItem,
                    )
                  : null}

                {renderNavigationItem(
                  messagesItem,
                )}
              </div>
            </section>
          </nav>

          <div className="mt-[var(--portal-group-gap)] border-t border-[#6e5535]/30 pt-2">
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
            <span
  className={`flex shrink-0 items-center justify-center ${
    item.subItem
      ? "h-4 w-4"
      : "h-[18px] w-[18px]"
  }`}
>
  <img
    src={item.icon}
    alt=""
    aria-hidden="true"
    className="h-full w-full object-contain opacity-35"
  />
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
      <p className="mb-2 text-[8px] uppercase tracking-[0.3em] text-[#766754]">
        {title}
      </p>

      <div className="grid grid-cols-1 gap-1.5">
        {items}
      </div>
    </section>
  );
}