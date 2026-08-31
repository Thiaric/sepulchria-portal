"use client";

import Link from "next/link";
import {
  usePathname,
  useSearchParams,
} from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";
import {
  canClientReadForumSection,
  getClientForumAccessContext,
} from "@/lib/forum/client-forum-access";
import { UnreadMessageBadge } from "@/components/messages/unread-message-badge";
import { TicketNotificationBadge } from "@/components/support/ticket-notification-badge";
import { PlayerSanctionsSidebarLink } from "@/components/sanctions/player-sanctions-sidebar-link";
import { ForumSidebarMenu } from "@/components/portal/forum-sidebar-menu";
import {
  PollUnreadBadge,
  usePollUnreadCount,
} from "@/components/polls/poll-unread-badge";
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
    label: "Sepulchria's People",
    title:
      "Browse the characters who inhabit Sepulchria.",
    icon: "/icons/characters.png",
    href: "/characters",
    activePaths: ["/characters"],
    opensModal: true,
  },
];

const pollsItem: NavigationItem = {
  label: "Polls",
  title:
    "Open community Polls and cast your vote.",
  icon: "/icons/polls.png",
  href: "/polls",
  activePaths: ["/polls"],
  opensModal: true,
};

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
    href: "/ancestries",
    activePaths: ["/ancestries"],
    opensModal: true,
  },
  {
    label: "Associations",
    title:
      "Explore the Associations and their place in Sepulchrian society.",
    icon: "/icons/associations.png",
    href: "/associations",
    activePaths: ["/associations"],
    opensModal: true,
  },
  {
    label: "Orders",
    title:
      "Read about the Orders, their ties to Associations, and their structure and scope.",
    icon: "/icons/orders.png",
    href: "/orders",
    activePaths: ["/orders"],
    opensModal: true,
  },
  {
    label: "Warping",
    title:
      "Read about magic in Sepulchria, including Warping.",
    icon: "/icons/warping.png",
    href: "/warping",
    activePaths: ["/spells"],
    opensModal: true,
  },
  {
    label: "Feats",
    title:
      "Browse the Feats available for Characters through Ancestries, Orders and other sources.",
    icon: "/icons/gifts.png",
    href: "/feats",
    activePaths: ["/feats"],
    opensModal: true,
  },
];

const marketItem: NavigationItem = {
  label: "Market",
  title:
    "Browse the market and buy or sell items.",
  icon: "/icons/market.png",
  href: "/market",
  activePaths: ["/market"],
  opensModal: true,
};

const craftingItem: NavigationItem = {
  label: "Crafting",
  title:
    "Open your crafting workbench and create items from known recipes.",
  icon: "/icons/crafting.png",
  href: "/crafting",
  activePaths: ["/crafting"],
  opensModal: true,
};

const missionsItem: NavigationItem = {
  label: "Daily Missions",
  title:
    "Review today's missions, progress and rewards.",
  icon: "/icons/missions.png",
  href: "/missions",
  activePaths: ["/missions"],
  opensModal: true,
};

const privateLocationItem: NavigationItem = {
  label: "Private Location",
  title:
    "Manage or enter invitation-only Private Locations.",
  icon: "/icons/private.png",
  href: "/private-locations",
  activePaths: ["/private-locations"],
};

const friendsItem: NavigationItem = {
  label: "Friend List",
  title:
    "Open your character relationships and relationship requests.",
  icon: "/icons/friends.png",
  href: "/friends",
  activePaths: ["/friends"],
  opensModal: true,
};

const messagesItem: NavigationItem = {
  label: "Messages",
  title:
    "Open your private conversations with other characters.",
  icon: "/icons/messages.png",
  href: "/messages",
  activePaths: ["/messages"],
  opensModal: true,
};

const rankingItem: NavigationItem = {
  label: "Hall of Renown",
  title:
    "Enter the Hall of Renown and view Sepulchria's records of standing and achievement.",
  icon: "/icons/ranking.png",
  href: "/ranking",
  activePaths: ["/ranking"],
  opensModal: true,
};

const forumItem: NavigationItem = {
  label: "Forum",
  title:
    "Open the Sepulchria community forum.",
  icon: "/icons/forum.png",
  href: "/forum",
  activePaths: ["/forum"],
  opensModal: true,
};

const communityRulesItem: NavigationItem = {
  label: "Community Rules",
  title:
    "Read Sepulchria's Community Rules and safety requirements.",
  icon: "/icons/rules.png",
  href: "/community-rules",
  activePaths: [
    "/community-rules",
  ],
  opensModal: true,
};

const safetyItem: NavigationItem = {
  label: "Safety",
  title:
    "Read Sepulchria's public safety and reporting information.",
  icon: "/icons/rules.png",
  href: "/safety",
  activePaths: ["/safety"],
  opensModal: true,
  subItem: true,
};

const agePolicyItem: NavigationItem = {
  label: "18+ Policy",
  title:
    "Read Sepulchria's age and 18+ eligibility policy.",
  icon: "/icons/rules.png",
  href: "/age-policy",
  activePaths: ["/age-policy"],
  opensModal: true,
  subItem: true,
};

const privacyItem: NavigationItem = {
  label: "Privacy",
  title:
    "Read Sepulchria's Privacy Notice.",
  icon: "/icons/rules.png",
  href: "/privacy",
  activePaths: ["/privacy"],
  opensModal: true,
  subItem: true,
};

const cookiesItem: NavigationItem = {
  label: "Cookies",
  title:
    "Read Sepulchria's Cookie Notice.",
  icon: "/icons/rules.png",
  href: "/cookies",
  activePaths: ["/cookies"],
  opensModal: true,
  subItem: true,
};

const termsItem: NavigationItem = {
  label: "Terms",
  title:
    "Read Sepulchria's Terms of Service.",
  icon: "/icons/rules.png",
  href: "/terms",
  activePaths: ["/terms"],
  opensModal: true,
  subItem: true,
};

const legalSafetyItems: NavigationItem[] = [
  communityRulesItem,
  safetyItem,
  agePolicyItem,
  privacyItem,
  cookiesItem,
  termsItem,
];

const manageOrderItem: NavigationItem = {
  label: "Manage Order",
  title:
    "Manage the members and affairs of the Order you lead.",
  icon: "/icons/manage-orders.png",
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

  type PortalModalWindow = {
    id: number;
    item: NavigationItem;
    zIndex: number;
  };

  const [
    modalWindows,
    setModalWindows,
  ] = useState<PortalModalWindow[]>([]);

  const nextModalWindowIdRef =
    useRef(1);

  const nextModalZIndexRef =
    useRef(10000);

  const modalItem =
    modalWindows.length > 0
      ? modalWindows.reduce(
          (top, candidate) =>
            candidate.zIndex >
            top.zIndex
              ? candidate
              : top,
        ).item
      : null;

  useEffect(() => {
    const root =
      document.documentElement;

    if (modalWindows.length > 0) {
      root.dataset.portalModalOpen =
        "true";
    } else {
      delete root.dataset
        .portalModalOpen;
    }

    return () => {
      delete root.dataset
        .portalModalOpen;
    };
  }, [modalWindows.length]);

  function setModalItem(
    item: NavigationItem | null,
  ) {
    setModalWindows((current) => {
      if (!item) {
        if (current.length === 0) {
          return current;
        }

        const top = current.reduce(
          (highest, candidate) =>
            candidate.zIndex >
            highest.zIndex
              ? candidate
              : highest,
        );

        return current.filter(
          (window) =>
            window.id !== top.id,
        );
      }

      const existing =
        current.find(
          (window) =>
            window.item.href ===
            item.href,
        );

      if (existing) {
        nextModalZIndexRef.current += 1;

        return current.map(
          (window) =>
            window.id ===
            existing.id
              ? {
                  ...window,
                  zIndex:
                    nextModalZIndexRef.current,
                }
              : window,
        );
      }

      nextModalZIndexRef.current += 1;

      const nextWindow = {
        id:
          nextModalWindowIdRef.current,
        item,
        zIndex:
          nextModalZIndexRef.current,
      };

      nextModalWindowIdRef.current += 1;

      return [
        ...current,
        nextWindow,
      ];
    });
  }

  function closeModalWindow(
    id: number,
  ) {
    setModalWindows((current) =>
      current.filter(
        (window) =>
          window.id !== id,
      ),
    );
  }

  function focusModalWindow(
    id: number,
  ) {
    nextModalZIndexRef.current += 1;

    const zIndex =
      nextModalZIndexRef.current;

    setModalWindows((current) =>
      current.map(
        (window) =>
          window.id === id
            ? {
                ...window,
                zIndex,
              }
            : window,
      ),
    );
  }

  const [
    rulesExpanded,
    setRulesExpanded,
  ] = useState(false);

  const [
    legalSafetyExpanded,
    setLegalSafetyExpanded,
  ] = useState(false);

  const [
    servicesExpanded,
    setServicesExpanded,
  ] = useState(true);

  const [
    economyCraftingExpanded,
    setEconomyCraftingExpanded,
  ] = useState(false);

  const [
    premiumExpanded,
    setPremiumExpanded,
  ] = useState(false);

  const unreadPollCount =
    usePollUnreadCount();

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
    breezeLodgingsRoomId,
    setBreezeLodgingsRoomId,
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
    let cancelled = false;

    async function loadBreezeLodgingsRoom() {
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
          "the-breeze-lodgings",
        )
        .eq("is_active", true)
        .maybeSingle();

      if (cancelled) {
        return;
      }

      if (error) {
        console.error(
          "Unable to load The Breeze Lodgings:",
          error,
        );
        setBreezeLodgingsRoomId(null);
        return;
      }

      setBreezeLodgingsRoomId(
        room?.id ?? null,
      );
    }

    void loadBreezeLodgingsRoom();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!modalItem) {
      return;
    }

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
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setCurrentUnreadForumCount(0);
        return;
      }

      const forumAccess =
        await getClientForumAccessContext(
          supabase,
          user.id,
        );

      const [
        sectionResult,
        topicResult,
        readResult,
      ] = await Promise.all([
        supabase
          .from("forum_sections")
          .select(
            "id, visibility, order_id, staff_read_roles",
          )
          .eq("is_active", true),
        supabase
          .from("forum_topics")
          .select(
            "id, section_id, last_post_at, deleted_at",
          )
          .is("deleted_at", null),
        supabase
          .from("forum_topic_reads")
          .select(
            "topic_id, last_read_at",
          )
          .eq("user_id", user.id),
      ]);

      if (
        sectionResult.error ||
        topicResult.error ||
        readResult.error
      ) {
        console.error(
          "Could not refresh forum unread count:",
          sectionResult.error ??
            topicResult.error ??
            readResult.error,
        );
        return;
      }

      const accessibleSectionIds =
        new Set(
          (sectionResult.data ?? [])
            .filter((section) =>
              canClientReadForumSection(
                forumAccess,
                section,
              ),
            )
            .map((section) => section.id),
        );

      const readMap =
        new Map(
          (readResult.data ?? []).map(
            (read) => [
              read.topic_id,
              read.last_read_at,
            ],
          ),
        );

      const unreadCount =
        (topicResult.data ?? []).filter(
          (topic) => {
            if (
              !accessibleSectionIds.has(
                topic.section_id,
              )
            ) {
              return false;
            }

            const lastReadAt =
              readMap.get(topic.id);

            if (!lastReadAt) {
              return true;
            }

            return (
              new Date(
                topic.last_post_at,
              ).getTime() >
              new Date(
                lastReadAt,
              ).getTime()
            );
          },
        ).length;

      setCurrentUnreadForumCount(
        unreadCount,
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
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "forum_sections",
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
              if (error) {
                console.warn(
                  "Forum sidebar realtime issue:",
                  error,
                );
              }
            }
          },
        );

    const pollingInterval =
      window.setInterval(
        () => {
          void refreshForumCount();
        },
        15000,
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

  function openModalItem(
  item: NavigationItem,
) {
  setModalItem(item);
}

  useEffect(() => {
    /*
     * The outer portal is the sole owner of portal modals.
     * Embedded pages can request a replacement modal through postMessage.
     */
    if (window.self !== window.top) {
      return;
    }

    type ExternalModalDetail = {
      label: string;
      title: string;
      icon: string;
      href: string;
    };

    function replaceCurrentModal(
      detail:
        | ExternalModalDetail
        | null
        | undefined,
    ) {
      if (!detail?.href) {
        return;
      }

      setModalItem({
        ...detail,
        activePaths: [
          detail.href.split("?")[0],
        ],
        opensModal: true,
      });
    }

    function handleExternalModalOpen(
      event: Event,
    ) {
      replaceCurrentModal(
        (
          event as CustomEvent<ExternalModalDetail>
        ).detail,
      );
    }

    function handleIframeModalOpen(
      event: MessageEvent,
    ) {
      if (
        event.origin !==
          window.location.origin ||
        event.data?.type !==
          "sepulchria:open-public-modal"
      ) {
        return;
      }

      replaceCurrentModal(
        event.data.detail as
          | ExternalModalDetail
          | undefined,
      );
    }

    window.addEventListener(
      "sepulchria:open-public-modal",
      handleExternalModalOpen,
    );

    window.addEventListener(
      "message",
      handleIframeModalOpen,
    );

    return () => {
      window.removeEventListener(
        "sepulchria:open-public-modal",
        handleExternalModalOpen,
      );

      window.removeEventListener(
        "message",
        handleIframeModalOpen,
      );
    };
  }, []);

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

    const isPolls =
      item.label ===
      "Polls";

    if (item.disabled) {
      return (
        <div
          key={item.label}
          title={`${item.title} — Coming soon`}
          className={`flex min-h-[var(--portal-nav-min-h)] cursor-not-allowed items-center gap-2 border border-transparent px-2.5 py-[var(--portal-nav-y)] text-[11px] text-[rgb(var(--sep-colour-62594d))] opacity-65 lg:text-xs ${
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

          <span className="ml-auto hidden text-[7px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-504940))] lg:block">
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
  ? "lg:ml-5 lg:w-[calc(100%-1.25rem)] lg:min-h-7 lg:py-1 lg:text-[10px]"
  : ""
      }
      ${
        modalActive ||
        active
          ? "border-[rgb(var(--sep-colour-8d6d3e))] bg-[rgb(var(--sep-colour-332719))] text-[rgb(var(--sep-colour-efd9aa))]"
          : item.subItem
            ? "border-transparent text-[rgb(var(--sep-colour-8f806d))] hover:border-[rgb(var(--sep-colour-59432c))] hover:bg-[rgb(var(--sep-colour-19120d))] hover:text-[rgb(var(--sep-colour-d7bd91))]"
            : isPolls && unreadPollCount > 0
              ? "border-[rgb(var(--sep-colour-a87532))] bg-[rgb(var(--sep-colour-24190f))] text-[rgb(var(--sep-colour-dfc699))] shadow-[inset_0_0_12px_rgba(var(--sep-rgb-177-132-75),0.08)] hover:border-[rgb(var(--sep-colour-c0914e))] hover:bg-[rgb(var(--sep-colour-2d1d11))]"
              : "border-transparent text-[rgb(var(--sep-colour-b6a894))] hover:border-[rgb(var(--sep-colour-5d4930))] hover:bg-[rgb(var(--sep-colour-1d1712))] hover:text-[rgb(var(--sep-colour-e8d8ba))]"
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

        {isPolls ? (
          <PollUnreadBadge
            count={
              unreadPollCount
            }
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
            void openModalItem(item)
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
        <div
          className={`flex min-h-[var(--portal-nav-min-h)] items-center border text-[11px] transition lg:text-xs ${
            modalActive ||
            active
              ? "border-[rgb(var(--sep-colour-8d6d3e))] bg-[rgb(var(--sep-colour-332719))] text-[rgb(var(--sep-colour-efd9aa))]"
              : "border-transparent text-[rgb(var(--sep-colour-b6a894))] hover:border-[rgb(var(--sep-colour-5d4930))] hover:bg-[rgb(var(--sep-colour-1d1712))] hover:text-[rgb(var(--sep-colour-e8d8ba))]"
          }`}
        >
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
            className="flex min-w-0 flex-1 items-center gap-2 px-2.5 py-[var(--portal-nav-y)] text-left"
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
              {rulesItem.label}
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
            className="relative mr-1 flex h-5 w-5 shrink-0 items-center justify-center text-[11px] leading-none text-[rgb(var(--sep-colour-b68b4f))] transition hover:bg-[rgb(var(--sep-colour-4a3420))]/45 hover:text-[rgb(var(--sep-colour-efd9aa))]"
          >
            <span
              aria-hidden="true"
              className="absolute left-0 top-1/2 h-3 w-px -translate-y-1/2 bg-[rgb(var(--sep-colour-6e5535))]/30"
            />

            {rulesExpanded
              ? "−"
              : "+"}
          </button>
        </div>

        {rulesExpanded ? (
          <div className="mt-1 border-l border-[rgb(var(--sep-colour-60482e))]/40 pl-3 lg:ml-4">
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
                  ? "border-[rgb(var(--sep-colour-8d6d3e))] bg-[rgb(var(--sep-colour-2a1d12))] text-[rgb(var(--sep-colour-efd9aa))]"
                  : "border-transparent text-[rgb(var(--sep-colour-8f806d))] hover:border-[rgb(var(--sep-colour-59432c))] hover:bg-[rgb(var(--sep-colour-19120d))] hover:text-[rgb(var(--sep-colour-d7bd91))]"
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
                Glossary
              </span>
            </button>
          </div>
        ) : null}
      </div>
    );
  }


  function renderPremiumMenu() {
    const visible =
      hasFriendListFeature ||
      hasPrivateLocationAccess;

    if (!visible) {
      return null;
    }

    const active =
      modalItem?.href ===
        friendsItem.href ||
      isActive(
        privateLocationItem.activePaths,
        privateLocationItem,
      );

    return (
      <div
        key="premium-menu"
        className="min-w-0"
      >
        <div
          className={`flex min-h-[var(--portal-nav-min-h)] items-center border text-[11px] transition lg:text-xs ${
            active
              ? "border-[rgb(var(--sep-colour-8d6d3e))] bg-[rgb(var(--sep-colour-332719))] text-[rgb(var(--sep-colour-efd9aa))]"
              : "border-transparent text-[rgb(var(--sep-colour-b6a894))] hover:border-[rgb(var(--sep-colour-5d4930))] hover:bg-[rgb(var(--sep-colour-1d1712))] hover:text-[rgb(var(--sep-colour-e8d8ba))]"
          }`}
        >
          <button
            type="button"
            onClick={() =>
              setPremiumExpanded(
                (current) => !current,
              )
            }
            className="flex min-w-0 flex-1 items-center gap-2 px-2.5 py-[var(--portal-nav-y)] text-left"
            aria-expanded={
              premiumExpanded
            }
            aria-controls="premium-submenu"
          >
            <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center">
              <img
                src="/icons/premium.png"
                alt=""
                aria-hidden="true"
                className="h-full w-full object-contain"
              />
            </span>

            <span className="truncate">
              Premium
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              setPremiumExpanded(
                (current) => !current,
              )
            }
            aria-label={
              premiumExpanded
                ? "Collapse Premium submenu"
                : "Expand Premium submenu"
            }
            aria-expanded={
              premiumExpanded
            }
            className="relative mr-1 flex h-5 w-5 shrink-0 items-center justify-center text-[11px] leading-none text-[rgb(var(--sep-colour-b68b4f))] transition hover:bg-[rgb(var(--sep-colour-4a3420))]/45 hover:text-[rgb(var(--sep-colour-efd9aa))]"
          >
            {premiumExpanded
              ? "−"
              : "+"}
          </button>
        </div>

        {premiumExpanded ? (
          <div
            id="premium-submenu"
            className="mt-1 border-l border-[rgb(var(--sep-colour-60482e))]/40 pl-2"
          >
            {hasFriendListFeature
              ? renderNavigationItem({
                  ...friendsItem,
                  subItem: true,
                })
              : null}

            {hasPrivateLocationAccess
              ? renderNavigationItem({
                  ...privateLocationItem,
                  subItem: true,
                })
              : null}
          </div>
        ) : null}
      </div>
    );
  }

  function renderLegalSafetyMenu() {
    const anyModalOpen =
      legalSafetyItems.some(
        (item) =>
          modalItem?.href ===
          item.href,
      );

    return (
      <div className="min-w-0">
        <button
          type="button"
          onClick={() =>
            setLegalSafetyExpanded(
              (current) =>
                !current,
            )
          }
          aria-expanded={
            legalSafetyExpanded
          }
          aria-controls="legal-safety-submenu"
          className={`flex w-full items-center justify-between py-0.5 text-left text-[9px] uppercase tracking-[0.18em] transition ${
            anyModalOpen
              ? "text-[rgb(var(--sep-colour-d8bf91))]"
              : "text-[rgb(var(--sep-colour-9f8b70))] hover:text-[rgb(var(--sep-colour-d8bf91))]"
          }`}
        >
          <span>
            Legal &amp; Safety
          </span>

          <span
            aria-hidden="true"
            className="ml-3 text-[12px] leading-none"
          >
            {legalSafetyExpanded
              ? "−"
              : "+"}
          </span>
        </button>

        {legalSafetyExpanded ? (
          <div
            id="legal-safety-submenu"
            className="mt-1 border-l border-[rgb(var(--sep-colour-60482e))]/40 pl-3"
          >
            {legalSafetyItems.map(
              (item) => (
                <button
                  key={item.href}
                  type="button"
                  title={item.title}
                  onClick={() =>
                    setModalItem(
                      item,
                    )
                  }
                  className={`block w-full py-1 text-left text-[9px] tracking-[0.08em] transition ${
                    modalItem?.href ===
                    item.href
                      ? "text-[rgb(var(--sep-colour-efd9aa))]"
                      : "text-[rgb(var(--sep-colour-8f806d))] hover:text-[rgb(var(--sep-colour-d8bf91))]"
                  }`}
                  aria-haspopup="dialog"
                >
                  {item.label}
                </button>
              ),
            )}
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
          ? "cursor-not-allowed border-transparent text-[rgb(var(--sep-colour-51483d))] opacity-45"
          : active
            ? "border-[rgb(var(--sep-colour-8d6d3e))] bg-[rgb(var(--sep-colour-332719))] text-[rgb(var(--sep-colour-efd9aa))]"
            : "border-transparent text-[rgb(var(--sep-colour-b68b4f))] hover:border-[rgb(var(--sep-colour-5d4930))] hover:bg-[rgb(var(--sep-colour-1d1712))] hover:text-[rgb(var(--sep-colour-efd9aa))]"
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
            void openModalItem(item)
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
          <span className="absolute right-0.5 top-0.5 inline-flex h-3.5 min-w-3.5 items-center justify-center rounded-full border border-[rgb(var(--sep-colour-d19a4c))] bg-[rgb(var(--sep-colour-7a291f))] px-0.5 text-[7px] font-bold leading-none text-[rgb(var(--sep-colour-ffe1ac))]">
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
          ? "border-transparent text-[rgb(var(--sep-colour-b68b4f))] hover:border-[rgb(var(--sep-colour-5d4930))] hover:bg-[rgb(var(--sep-colour-1d1712))] hover:text-[rgb(var(--sep-colour-efd9aa))]"
          : "cursor-not-allowed border-transparent text-[rgb(var(--sep-colour-51483d))] opacity-45"
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

  function renderMobileBreezeLodgingsItem() {
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
        breezeLodgingsRoomId
          ? "border-transparent text-[rgb(var(--sep-colour-b68b4f))] hover:border-[rgb(var(--sep-colour-5d4930))] hover:bg-[rgb(var(--sep-colour-1d1712))] hover:text-[rgb(var(--sep-colour-efd9aa))]"
          : "cursor-not-allowed border-transparent text-[rgb(var(--sep-colour-51483d))] opacity-45"
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
          value={
            breezeLodgingsRoomId ?? ""
          }
        />

        <button
          type="submit"
          disabled={!breezeLodgingsRoomId}
          title={
            breezeLodgingsRoomId
              ? "The Breeze Lodgings"
              : "The Breeze Lodgings are currently unavailable."
          }
          aria-label="The Breeze Lodgings"
          className={`${className} w-full`}
        >
          <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center">
            <img
              src="/icons/lodging.png"
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
  craftingItem,
  missionsItem,
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
        data-portal-navigation
        className="border-b border-[rgb(var(--sep-colour-6e5535))]/30 bg-[rgb(var(--sep-colour-100d0b))]/90 lg:h-full lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain lg:border-b-0 lg:border-r"
      >
        {/* MOBILE NAVIGATION */}
<div className="px-2 py-1.5 lg:hidden">
  <nav
    aria-label="Main navigation"
    className="grid grid-flow-col grid-rows-2 auto-cols-[minmax(42px,1fr)] gap-1 overflow-x-auto overscroll-x-contain pb-1"
  >
    {mobileNavigationItems.map(
      renderMobileItem,
    )}

    {renderMobileOddJobsItem()}
    {renderMobileBreezeLodgingsItem()}

    {/* RULES */}
    <div
      className={`relative flex h-10 min-w-0 border transition ${
        isActive(
          rulesItem.activePaths,
        ) ||
        modalItem?.href ===
          rulesItem.href
          ? "border-[rgb(var(--sep-colour-8d6d3e))] bg-[rgb(var(--sep-colour-332719))]"
          : "border-transparent hover:border-[rgb(var(--sep-colour-5d4930))] hover:bg-[rgb(var(--sep-colour-1d1712))]"
      }`}
    >
      <button
        type="button"
        title="Rules"
        aria-label="Rules"
        onClick={() =>
          void openModalItem(rulesItem)
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
        className="flex w-5 shrink-0 items-center justify-center border-l border-[rgb(var(--sep-colour-60482e))]/45 text-sm text-[rgb(var(--sep-colour-b68b4f))]"
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
          ? "border-[rgb(var(--sep-colour-8d6d3e))] bg-[rgb(var(--sep-colour-332719))]"
          : currentUnreadForumCount >
              0
            ? "border-[rgb(var(--sep-colour-a87532))] bg-[rgb(var(--sep-colour-24190f))]"
            : "border-transparent hover:border-[rgb(var(--sep-colour-5d4930))] hover:bg-[rgb(var(--sep-colour-1d1712))]"
      }`}
    >
      <button
        type="button"
        title="Forum"
        aria-label="Forum"
        onClick={() =>
          void openModalItem(forumItem)
        }
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
          <span className="absolute right-0.5 top-0.5 inline-flex h-3.5 min-w-3.5 items-center justify-center rounded-full border border-[rgb(var(--sep-colour-d19a4c))] bg-[rgb(var(--sep-colour-7a291f))] px-0.5 text-[7px] font-bold leading-none text-[rgb(var(--sep-colour-ffe1ac))]">
            {currentUnreadForumCount >
            9
              ? "9+"
              : currentUnreadForumCount}
          </span>
        ) : null}
      </button>

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
        className="flex w-5 shrink-0 items-center justify-center border-l border-[rgb(var(--sep-colour-60482e))]/45 text-sm text-[rgb(var(--sep-colour-b68b4f))]"
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

    {renderMobileItem(
      rankingItem,
    )}
  </nav>

  {rulesExpanded ? (
    <div className="mt-1 border border-[rgb(var(--sep-colour-60482e))]/40 bg-[rgb(var(--sep-colour-100c09))] p-1">
      <button
        type="button"
        title="Glossary"
        aria-label="Glossary"
        onClick={() =>
          void openModalItem(glossaryItem)
        }
        className="flex h-9 w-full items-center justify-center border border-transparent transition hover:border-[rgb(var(--sep-colour-59432c))] hover:bg-[rgb(var(--sep-colour-19120d))]"
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
    <div className="mt-1 border border-[rgb(var(--sep-colour-60482e))]/40 bg-[rgb(var(--sep-colour-100c09))] p-1">
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
              title="Explore Sepulchria"
              items={mainNavigationItems.map(
                renderNavigationItem,
              )}
            />

            <NavigationGroup
              title="Lore & World-Building"
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

            <section className="mb-[var(--portal-group-gap)] border-b border-[rgb(var(--sep-colour-6e5535))]/20 pb-[var(--portal-group-gap)]">
              <button
                type="button"
                onClick={() =>
                  setServicesExpanded(
                    (current) =>
                      !current,
                  )
                }
                aria-expanded={
                  servicesExpanded
                }
                className="mb-1 flex w-full items-center justify-between text-left text-[8px] uppercase tracking-[0.3em] text-[rgb(var(--sep-colour-766754))] transition hover:text-[rgb(var(--sep-colour-b4a07f))]"
              >
                <span>
                  Services and Utilities
                </span>
                <span
                  aria-hidden="true"
                  className="ml-3 text-[12px] leading-none"
                >
                  {servicesExpanded
                    ? "−"
                    : "+"}
                </span>
              </button>

              {servicesExpanded ? (
              <div className="grid grid-cols-1 gap-0">
                <div className="min-w-0">
                  <div
                    className={`flex min-h-[var(--portal-nav-min-h)] items-center border text-[11px] transition lg:text-xs ${
                      modalItem?.href === marketItem.href ||
                      modalItem?.href === craftingItem.href
                        ? "border-[rgb(var(--sep-colour-8d6d3e))] bg-[rgb(var(--sep-colour-332719))] text-[rgb(var(--sep-colour-efd9aa))]"
                        : "border-transparent text-[rgb(var(--sep-colour-b6a894))] hover:border-[rgb(var(--sep-colour-5d4930))] hover:bg-[rgb(var(--sep-colour-1d1712))] hover:text-[rgb(var(--sep-colour-e8d8ba))]"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setEconomyCraftingExpanded(
                          (current) => !current,
                        )
                      }
                      aria-expanded={
                        economyCraftingExpanded
                      }
                      aria-controls="economy-crafting-submenu"
                      className="flex min-w-0 flex-1 items-center gap-2 px-2.5 py-[var(--portal-nav-y)] text-left"
                    >
                      <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center">
                        <img
                          src="/icons/economy.png"
                          alt=""
                          aria-hidden="true"
                          className="h-full w-full object-contain"
                        />
                      </span>

                      <span className="truncate">
                        Economy &amp; Crafting
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setEconomyCraftingExpanded(
                          (current) => !current,
                        )
                      }
                      aria-label={
                        economyCraftingExpanded
                          ? "Collapse Economy & Crafting submenu"
                          : "Expand Economy & Crafting submenu"
                      }
                      aria-expanded={
                        economyCraftingExpanded
                      }
                      className="relative mr-1 flex h-5 w-5 shrink-0 items-center justify-center text-[11px] leading-none text-[rgb(var(--sep-colour-b68b4f))] transition hover:bg-[rgb(var(--sep-colour-4a3420))]/45 hover:text-[rgb(var(--sep-colour-efd9aa))]"
                    >
                      {economyCraftingExpanded
                        ? "−"
                        : "+"}
                    </button>
                  </div>                  {economyCraftingExpanded ? (
                    <div
                      id="economy-crafting-submenu"
                      className="mt-1 border-l border-[rgb(var(--sep-colour-60482e))]/40 pl-2"
                    >
                      {renderNavigationItem(
                        marketItem,
                      )}

                      {renderNavigationItem(
                        craftingItem,
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
                          className="flex min-h-[var(--portal-nav-min-h)] w-full items-center gap-2 border border-transparent px-2.5 py-[var(--portal-nav-y)] text-left text-[11px] text-[rgb(var(--sep-colour-b6a894))] transition hover:border-[rgb(var(--sep-colour-5d4930))] hover:bg-[rgb(var(--sep-colour-1d1712))] hover:text-[rgb(var(--sep-colour-e8d8ba))] disabled:cursor-not-allowed disabled:opacity-45 lg:text-xs"
                        >
                          <span className="flex h-4 w-4 shrink-0 items-center justify-center">
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
                    </div>
                  ) : null}
                </div>

                {renderNavigationItem(
                  missionsItem,
                )}

                <form
                  action={enterRoomFromMap}
                >
                  <input
                    type="hidden"
                    name="roomId"
                    value={
                      breezeLodgingsRoomId ?? ""
                    }
                  />

                  <button
                    type="submit"
                    disabled={!breezeLodgingsRoomId}
                    title={
                      breezeLodgingsRoomId
                        ? "Go directly to The Breeze Lodgings."
                        : "The Breeze Lodgings are currently unavailable."
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
                      text-[rgb(var(--sep-colour-b6a894))]
                      transition
                      hover:border-[rgb(var(--sep-colour-5d4930))]
                      hover:bg-[rgb(var(--sep-colour-1d1712))]
                      hover:text-[rgb(var(--sep-colour-e8d8ba))]
                      disabled:cursor-not-allowed
                      disabled:opacity-45
                      lg:text-xs
                    "
                  >
                    <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center">
                      <img
                        src="/icons/lodging.png"
                        alt=""
                        aria-hidden="true"
                        className="h-full w-full object-contain"
                      />
                    </span>

                    <span className="truncate">
                      The Breeze Lodgings
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

                {renderNavigationItem(
                  messagesItem,
                )}

                {renderPremiumMenu()}

                {renderNavigationItem(
                  pollsItem,
                )}

                {renderNavigationItem(
                  rankingItem,
                )}
              </div>
              ) : null}
            </section>
          </nav>

          <div className="mt-[var(--portal-group-gap)] border-t border-[rgb(var(--sep-colour-6e5535))]/30 pt-2">
            <Link href="/support" className="flex items-center py-0.5 text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-9f8b70))] transition hover:text-[rgb(var(--sep-colour-d8bf91))]">
              <span>Support</span><TicketNotificationBadge audience="player" variant="sidebar" />
            </Link>
            <PlayerSanctionsSidebarLink />

            {renderLegalSafetyMenu()}
          </div>
        </div>
      </aside>

      {modalWindows.map(
        (window) => (
          <PublicPageModal
            key={window.id}
            item={window.item}
            zIndex={
              window.zIndex
            }
            onFocus={() =>
              focusModalWindow(
                window.id,
              )
            }
            onClose={() =>
              closeModalWindow(
                window.id,
              )
            }
          />
        ),
      )}
    </>
  );
}

function PublicPageModal({
  item,
  zIndex,
  onFocus,
  onClose,
}: {
  item: NavigationItem;
  zIndex: number;
  onFocus: () => void;
  onClose: () => void;
}) {
  type ModalRect = {
    x: number;
    y: number;
    width: number;
    height: number;
  };

  type DragState = {
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  };

  type ResizeState = {
    pointerId: number;
    startX: number;
    startY: number;
    originWidth: number;
    originHeight: number;
  };

  const [collapsed, setCollapsed] =
    useState(false);

  const [maximized, setMaximized] =
    useState(true);

  const [rect, setRect] =
    useState<ModalRect>({
      x: 80,
      y: 60,
      width: 900,
      height: 700,
    });

  const initialisedRef =
    useRef(false);

  const dragRef =
    useRef<DragState | null>(
      null,
    );

  const resizeRef =
    useRef<ResizeState | null>(
      null,
    );

  /*
   * Build embedded modal URLs without corrupting hash anchors.
   *
   * Example:
   *   /missions#mission-foo
   *
   * must become:
   *   /missions?embedded=1#mission-foo
   *
   * NOT:
   *   /missions#mission-foo?embedded=1
   *
   * The latter changes the actual hash target and breaks native
   * anchor scrolling.
   */
  const hashIndex =
    item.href.indexOf("#");

  const hrefWithoutHash =
    hashIndex >= 0
      ? item.href.slice(0, hashIndex)
      : item.href;

  const hrefHash =
    hashIndex >= 0
      ? item.href.slice(hashIndex)
      : "";

  const separator =
    hrefWithoutHash.includes("?")
      ? "&"
      : "?";

  const iframeSrc =
    `${hrefWithoutHash}${separator}embedded=1${hrefHash}`;

  const clampRect =
    useCallback(
      (
        candidate: ModalRect,
      ): ModalRect => {
        const margin = 8;
        const viewportWidth =
          window.innerWidth;
        const viewportHeight =
          window.innerHeight;

        const maxWidth =
          Math.max(
            320,
            viewportWidth -
              margin * 2,
          );

        const maxHeight =
          Math.max(
            220,
            viewportHeight -
              margin * 2,
          );

        const minWidth =
          Math.min(
            420,
            maxWidth,
          );

        const minHeight =
          Math.min(
            280,
            maxHeight,
          );

        const width =
          Math.min(
            maxWidth,
            Math.max(
              minWidth,
              candidate.width,
            ),
          );

        const height =
          Math.min(
            maxHeight,
            Math.max(
              minHeight,
              candidate.height,
            ),
          );

        /*
         * Desktop-window behaviour:
         * the body of a restored window may travel partly off-screen.
         * Keep enough of the title bar reachable so the window can
         * always be recovered.
         */
        const reachableTitleWidth =
          Math.min(
            180,
            Math.max(
              96,
              width * 0.22,
            ),
          );

        const titleBarHeight = 40;

        const x =
          Math.min(
            viewportWidth -
              reachableTitleWidth,
            Math.max(
              -(width -
                reachableTitleWidth),
              candidate.x,
            ),
          );

        const y =
          Math.min(
            viewportHeight -
              titleBarHeight,
            Math.max(
              0,
              candidate.y,
            ),
          );

        return {
          x,
          y,
          width,
          height,
        };
      },
      [],
    );

  useEffect(() => {
    if (
      initialisedRef.current
    ) {
      return;
    }

    initialisedRef.current =
      true;

    const margin = 8;
    const viewportWidth =
      window.innerWidth;
    const viewportHeight =
      window.innerHeight;

    const preferredWidth =
      Math.min(
        viewportWidth -
          margin * 2,
        Math.max(
          720,
          viewportWidth * 0.76,
        ),
      );

    const preferredHeight =
      Math.min(
        viewportHeight -
          margin * 2,
        Math.max(
          520,
          viewportHeight * 0.76,
        ),
      );

    setRect(
      clampRect({
        x:
          (
            viewportWidth -
            preferredWidth
          ) / 2,
        y:
          (
            viewportHeight -
            preferredHeight
          ) / 2,
        width: preferredWidth,
        height: preferredHeight,
      }),
    );
  }, [clampRect]);

  useEffect(() => {
    function handleViewportResize() {
      setRect(
        (current) =>
          clampRect(
            current,
          ),
      );
    }

    window.addEventListener(
      "resize",
      handleViewportResize,
    );

    return () => {
      window.removeEventListener(
        "resize",
        handleViewportResize,
      );
    };
  }, [clampRect]);

  const collapsedWidth =
    Math.min(
      rect.width,
      420,
    );

  const frameLeft =
    collapsed
      ? `${rect.x}px`
      : maximized
        ? "8px"
        : `${rect.x}px`;

  const frameTop =
    collapsed
      ? `${rect.y}px`
      : maximized
        ? "8px"
        : `${rect.y}px`;

  const frameWidth =
    collapsed
      ? `${collapsedWidth}px`
      : maximized
        ? "calc(100vw - 16px)"
        : `${rect.width}px`;

  const frameHeight =
    collapsed
      ? "40px"
      : maximized
        ? "calc(100dvh - 16px)"
        : `${rect.height}px`;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label={item.label}
      data-sep-native-window="true"
      className="pointer-events-none fixed inset-0"
      style={{ zIndex }}
      onPointerDownCapture={
        onFocus
      }
    >
      <div
        style={{
          left: frameLeft,
          top: frameTop,
          width: frameWidth,
          height: frameHeight,
        }}
        className="pointer-events-auto fixed flex min-h-0 min-w-0 flex-col overflow-hidden border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-090705))] shadow-[0_20px_80px_rgba(var(--sep-rgb-0-0-0),0.65)]"
      >
        <div
          className="flex h-10 shrink-0 cursor-move select-none items-center justify-between border-b border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-100c09))] px-3"
          onPointerDown={(
            event,
          ) => {
            if (
              maximized ||
              event.button !== 0 ||
              (
                event.target as HTMLElement
              ).closest("button")
            ) {
              return;
            }

            dragRef.current = {
              pointerId:
                event.pointerId,
              startX:
                event.clientX,
              startY:
                event.clientY,
              originX:
                rect.x,
              originY:
                rect.y,
            };

            event.currentTarget.setPointerCapture(
              event.pointerId,
            );
          }}
          onPointerMove={(
            event,
          ) => {
            const drag =
              dragRef.current;

            if (
              !drag ||
              drag.pointerId !==
                event.pointerId
            ) {
              return;
            }

            const dx =
              event.clientX -
              drag.startX;

            const dy =
              event.clientY -
              drag.startY;

            setRect(
              (current) =>
                clampRect({
                  ...current,
                  x:
                    drag.originX +
                    dx,
                  y:
                    drag.originY +
                    dy,
                }),
            );
          }}
          onPointerUp={(
            event,
          ) => {
            if (
              dragRef.current
                ?.pointerId !==
              event.pointerId
            ) {
              return;
            }

            dragRef.current =
              null;

            if (
              event.currentTarget.hasPointerCapture(
                event.pointerId,
              )
            ) {
              event.currentTarget.releasePointerCapture(
                event.pointerId,
              );
            }
          }}
          onPointerCancel={() => {
            dragRef.current =
              null;
          }}
        >
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
                className="h-full w-full object-contain"
              />
            </span>

            <span className="truncate font-serif text-sm text-[rgb(var(--sep-colour-d8c096))]">
              {item.label}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                if (collapsed) {
                  setCollapsed(false);
                  return;
                }

                /*
                 * A collapsed window must always restore as a normal
                 * movable window. If it was maximized, leave maximized
                 * mode before collapsing it.
                 */
                if (maximized) {
                  setMaximized(false);
                }

                setCollapsed(true);
              }}
              aria-label={
                collapsed
                  ? `Restore ${item.label}`
                  : `Collapse ${item.label}`
              }
              title={
                collapsed
                  ? "Restore window"
                  : "Collapse window"
              }
              className="flex h-7 w-7 cursor-pointer items-center justify-center border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-17110d))] text-sm leading-none text-[rgb(var(--sep-colour-aa9675))] transition hover:border-[rgb(var(--sep-colour-967342))] hover:text-[rgb(var(--sep-colour-f1d7a5))]"
            >
              {collapsed
                ? "□"
                : "−"}
            </button>

            <button
              type="button"
              onClick={() => {
                setCollapsed(false);
                setMaximized(
                  (current) =>
                    !current,
                );
              }}
              aria-label={
                maximized
                  ? `Restore size of ${item.label}`
                  : `Maximize ${item.label}`
              }
              title={
                maximized
                  ? "Restore window size"
                  : "Maximize window"
              }
              aria-pressed={
                maximized
              }
              className="flex h-7 w-7 cursor-pointer items-center justify-center border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-17110d))] text-sm leading-none text-[rgb(var(--sep-colour-aa9675))] transition hover:border-[rgb(var(--sep-colour-967342))] hover:text-[rgb(var(--sep-colour-f1d7a5))]"
            >
              {maximized
                ? "❐"
                : "□"}
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label={`Close ${item.label}`}
              title={`Close ${item.label}`}
              className="flex h-7 w-7 cursor-pointer items-center justify-center border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-17110d))] text-base leading-none text-[rgb(var(--sep-colour-aa9675))] transition hover:border-[rgb(var(--sep-colour-967342))] hover:text-[rgb(var(--sep-colour-f1d7a5))]"
            >
              ×
            </button>
          </div>
        </div>

        <div
          className={
            collapsed
              ? "hidden"
              : "relative flex min-h-0 flex-1 flex-col"
          }
        >
          <iframe
            src={iframeSrc}
            title={item.label}
            onLoad={(event) => {
              const iframe =
                event.currentTarget;

              const doc =
                iframe.contentDocument;

              if (!doc) {
                return;
              }

              /*
               * Hash-aware modal scrolling.
               *
               * Native iframe anchor scrolling is usually enough once
               * the URL is constructed correctly, but some portal pages
               * finish rendering or rearranging content after load.
               *
               * Retry briefly so links such as:
               *   /missions#mission-...
               *   /polls#poll-...
               *   /character?...#...
               *   /ranking#...
               * and any future modal hash target land on the intended
               * element rather than at the top of the modal.
               */
              const rawHash =
                iframe.contentWindow
                  ?.location.hash
                  .slice(1) ?? "";

              if (rawHash) {
                let targetId = rawHash;

                try {
                  targetId =
                    decodeURIComponent(
                      rawHash,
                    );
                } catch {
                  // Keep the raw hash if decoding fails.
                }

                let scrollAttempt = 0;
                const maxScrollAttempts = 12;

                const scrollToHashTarget =
                  () => {
                    const target =
                      doc.getElementById(
                        targetId,
                      );

                    if (target) {
                      target.scrollIntoView({
                        behavior: "smooth",
                        block: "center",
                        inline: "nearest",
                      });

                      return;
                    }

                    scrollAttempt += 1;

                    if (
                      scrollAttempt <
                      maxScrollAttempts
                    ) {
                      window.setTimeout(
                        scrollToHashTarget,
                        100,
                      );
                    }
                  };

                /*
                 * Let the iframe finish the current load/layout pass
                 * before forcing the first scroll.
                 */
                window.setTimeout(
                  scrollToHashTarget,
                  0,
                );
              }

              const styleId =
                "sepulchria-stable-modal-style";

              let style =
                doc.getElementById(
                  styleId,
                ) as
                  | HTMLStyleElement
                  | null;

              if (!style) {
                style =
                  doc.createElement(
                    "style",
                  );

                style.id =
                  styleId;

                doc.head.appendChild(
                  style,
                );
              }

              style.textContent = `
                ${
                  item.href === "/crafting"
                    ? `
                .sepulchria-viewport-body {
                  grid-template-columns:
                    minmax(0, 1fr) !important;
                  max-width: none !important;
                  width: 100% !important;
                }

                .portal-left-shell,
                .portal-right-shell,
                .portal-left-collapse-toggle,
                .portal-right-collapse-toggle {
                  display: none !important;
                }

                [data-portal-centre-host] {
                  grid-column: 1 !important;
                  min-width: 0 !important;
                  width: 100% !important;
                }

                [data-portal-centre-host]
                  > [data-portal-column] {
                  width: 100% !important;
                  max-width: none !important;
                }
                `
                    : ""
                }

                ${
                  item.href === "/codex"
                    ? `
                /*
                 * CODEX EMBEDDED WINDOW
                 * Keep the entire Codex inside the modal height and make
                 * the centre column the sole vertical scroll container.
                 */
                html,
                body,
                [data-portal-shell],
                [data-portal-shell-inner] {
                  height: 100% !important;
                  min-height: 0 !important;
                  max-height: 100% !important;
                  overflow: hidden !important;
                }

                .sepulchria-viewport-body {
                  display: grid !important;
                  grid-template-columns:
                    minmax(0, 1fr) !important;
                  grid-template-rows:
                    minmax(0, 1fr) !important;
                  width: 100% !important;
                  height: 100% !important;
                  min-height: 0 !important;
                  max-height: 100% !important;
                  overflow: hidden !important;
                }

                .portal-left-shell,
                .portal-right-shell,
                .portal-left-collapse-toggle,
                .portal-right-collapse-toggle {
                  display: none !important;
                }

                [data-portal-centre-host] {
                  grid-column: 1 !important;
                  grid-row: 1 !important;
                  width: 100% !important;
                  height: 100% !important;
                  min-width: 0 !important;
                  min-height: 0 !important;
                  max-height: 100% !important;
                  overflow: hidden !important;
                }

                [data-portal-centre-host]
                  > [data-portal-column] {
                  position: relative !important;
                  width: 100% !important;
                  height: 100% !important;
                  min-width: 0 !important;
                  min-height: 0 !important;
                  max-width: none !important;
                  max-height: 100% !important;
                  overflow-x: hidden !important;
                  overflow-y: auto !important;
                  overscroll-behavior: contain !important;
                }

                [data-portal-centre-host]
                  > [data-portal-column]
                  > main,
                [data-portal-centre-host]
                  > [data-portal-column]
                  main {
                  min-height: 0 !important;
                  height: auto !important;
                  max-height: none !important;
                }
                `
                    : ""
                }

                [data-portal-header],
                .portal-left-shell,
                footer[aria-label="Tidings"] {
                  display: none !important;
                }

                html,
                body,
                [data-portal-shell],
                [data-portal-shell-inner] {
                  width: 100% !important;
                  height: 100% !important;
                  min-height: 100% !important;
                  max-width: none !important;
                  overflow: hidden !important;
                }

                .sepulchria-viewport-body {
                  display: grid !important;
                  grid-template-columns:
                    minmax(0, 1fr)
                    minmax(240px, 300px) !important;
                  width: 100% !important;
                  max-width: none !important;
                  height: 100% !important;
                  min-height: 0 !important;
                  overflow: hidden !important;
                }

                [data-portal-centre-host] {
                  grid-column: 1 !important;
                  width: 100% !important;
                  min-width: 0 !important;
                  height: 100% !important;
                  min-height: 0 !important;
                }

                [data-portal-centre-host]
                  > [data-portal-column] {
                  width: 100% !important;
                  max-width: none !important;
                  height: 100% !important;
                  min-height: 0 !important;
                  overflow-y: auto !important;
                  overflow-x: auto !important;
                }

                .portal-right-shell {
                  display: block !important;
                  grid-column: 2 !important;
                  width: 100% !important;
                  min-width: 0 !important;
                  height: 100% !important;
                  min-height: 0 !important;
                  overflow: hidden !important;
                }

                .portal-right-shell
                  > [data-portal-right-sidebar] {
                  position: relative !important;
                  inset: auto !important;
                  z-index: auto !important;
                  display: flex !important;
                  width: 100% !important;
                  min-width: 0 !important;
                  height: 100% !important;
                  min-height: 0 !important;
                  transform: none !important;
                  overflow: hidden !important;
                  box-shadow: none !important;
                  transition: none !important;
                }

                .portal-right-shell
                  > [data-portal-right-sidebar]
                  > div:first-child,
                .portal-right-shell
                  > button,
                .portal-right-collapse-toggle {
                  display: none !important;
                }

                .portal-right-shell
                  > [data-portal-right-sidebar]
                  > div:nth-child(2) {
                  padding:
                    var(
                      --portal-column-pad,
                      0.8rem
                    ) !important;
                }

                .portal-right-shell
                  > [data-portal-right-sidebar]
                  > div:nth-child(2)
                  > div:first-child
                  > div:first-child,
                .portal-right-shell
                  > [data-portal-right-sidebar]
                  > div:nth-child(2)
                  > div:last-child {
                  display: none !important;
                }

                @media (max-width: 959px) {
                  .sepulchria-viewport-body {
                    grid-template-columns:
                      minmax(0, 1fr) !important;
                    grid-template-rows:
                      minmax(0, 1fr) !important;
                  }

                  [data-portal-centre-host] {
                    grid-column: 1 !important;
                    grid-row: 1 !important;
                    width: 100% !important;
                    min-width: 0 !important;
                  }

                  .portal-right-shell {
                    display: contents !important;
                  }

                  .portal-right-shell
                    > button:not(
                      .portal-right-collapse-toggle
                    ) {
                    display: flex !important;
                  }

                  .portal-right-collapse-toggle {
                    display: none !important;
                  }

                  .portal-right-shell
                    > [data-portal-right-sidebar] {
                    position: fixed !important;
                    inset: 0 0 0 auto !important;
                    z-index: 70 !important;
                    display: flex !important;
                    flex-direction: column !important;
                    width: min(88vw, 360px) !important;
                    height: 100dvh !important;
                    min-height: 0 !important;
                    max-height: none !important;
                    overflow: hidden !important;
                    transform:
                      translateX(100%) !important;
                    box-shadow:
                      -18px 0 50px
                      rgba(
                        var(--sep-rgb-0-0-0),
                        0.55
                      ) !important;
                    transition:
                      transform 200ms ease-out !important;
                  }

                  .portal-right-shell
                    > [data-portal-right-sidebar].translate-x-0 {
                    transform:
                      translateX(0) !important;
                  }

                  .portal-right-shell
                    > [data-portal-right-sidebar].translate-x-full {
                    transform:
                      translateX(100%) !important;
                  }

                  .portal-right-shell
                    > [data-portal-right-sidebar]
                    > div:first-child {
                    display: flex !important;
                  }

                  .portal-right-shell
                    > [data-portal-right-sidebar]
                    > div:nth-child(2)
                    > div:first-child
                    > div:first-child {
                    display: none !important;
                  }

                  .portal-right-shell
                    > [data-portal-right-sidebar]
                    > div:nth-child(2)
                    > div:last-child {
                    display: none !important;
                  }
                }
              `;
            }}
            className="min-h-0 w-full flex-1 border-0 bg-[rgb(var(--sep-colour-090705))]"
          />

          {!collapsed ? (
            <div
              role="separator"
              aria-label={`Resize ${item.label}`}
              title="Resize window"
              className="absolute bottom-0 right-0 z-30 h-8 w-8 touch-none cursor-se-resize select-none"
              onPointerDown={(
                event,
              ) => {
                if (
                  event.button !== 0
                ) {
                  return;
                }

                event.preventDefault();

                let resizeOriginWidth =
                  rect.width;

                let resizeOriginHeight =
                  rect.height;

                if (maximized) {
                  /*
                   * Resizing a maximized window should feel like a desktop
                   * window: grabbing the corner immediately drops it out of
                   * maximized mode at the same visible size, then the drag
                   * shrinks/grows it from that exact corner.
                   */
                  const fullscreenRect =
                    clampRect({
                      x: 8,
                      y: 8,
                      width:
                        window.innerWidth -
                        16,
                      height:
                        window.innerHeight -
                        16,
                    });

                  resizeOriginWidth =
                    fullscreenRect.width;

                  resizeOriginHeight =
                    fullscreenRect.height;

                  setRect(fullscreenRect);
                  setMaximized(false);
                }

                resizeRef.current = {
                  pointerId:
                    event.pointerId,
                  startX:
                    event.clientX,
                  startY:
                    event.clientY,
                  originWidth:
                    resizeOriginWidth,
                  originHeight:
                    resizeOriginHeight,
                };

                event.currentTarget.setPointerCapture(
                  event.pointerId,
                );
              }}
              onPointerMove={(
                event,
              ) => {
                const resize =
                  resizeRef.current;

                if (
                  !resize ||
                  resize.pointerId !==
                    event.pointerId
                ) {
                  return;
                }

                const dx =
                  event.clientX -
                  resize.startX;

                const dy =
                  event.clientY -
                  resize.startY;

                setRect(
                  (current) =>
                    clampRect({
                      ...current,
                      width:
                        resize.originWidth +
                        dx,
                      height:
                        resize.originHeight +
                        dy,
                    }),
                );
              }}
              onPointerUp={(
                event,
              ) => {
                if (
                  resizeRef.current
                    ?.pointerId !==
                  event.pointerId
                ) {
                  return;
                }

                resizeRef.current =
                  null;

                if (
                  event.currentTarget.hasPointerCapture(
                    event.pointerId,
                  )
                ) {
                  event.currentTarget.releasePointerCapture(
                    event.pointerId,
                  );
                }
              }}
              onPointerCancel={() => {
                resizeRef.current =
                  null;
              }}
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute bottom-1.5 right-1.5 block h-3.5 w-3.5 border-b border-r border-[rgb(var(--sep-colour-a98b61))]/80"
              />
            </div>
          ) : null}
        </div>
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
  const [
    expanded,
    setExpanded,
  ] = useState(true);

  return (
    <section className="mb-[var(--portal-group-gap)] border-b border-[rgb(var(--sep-colour-6e5535))]/20 pb-[var(--portal-group-gap)]">
      <button
        type="button"
        onClick={() =>
          setExpanded(
            (current) =>
              !current,
          )
        }
        aria-expanded={expanded}
        className="mb-1 flex w-full items-center justify-between text-left text-[8px] uppercase tracking-[0.3em] text-[rgb(var(--sep-colour-766754))] transition hover:text-[rgb(var(--sep-colour-b4a07f))]"
      >
        <span>{title}</span>
        <span
          aria-hidden="true"
          className="ml-3 text-[12px] leading-none"
        >
          {expanded
            ? "−"
            : "+"}
        </span>
      </button>

      {expanded ? (
        <div className="grid grid-cols-1 gap-0">
          {items}
          
        </div>
      ) : null}
    </section>
  );
}