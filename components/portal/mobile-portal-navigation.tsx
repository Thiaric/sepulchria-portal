"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  usePathname,
  useSearchParams,
} from "next/navigation";

import { enterRoomFromMap } from "@/app/(portal)/game/actions";
import { ForumSidebarMenu } from "@/components/portal/forum-sidebar-menu";
import {
  openPortalModal,
  type PortalModalPayload,
} from "@/components/portal/portal-modal-button";
import { usePortalNotificationCounts } from "@/components/notifications/portal-notification-counts-provider";
import { UnreadMessageBadge } from "@/components/messages/unread-message-badge";
import { TicketNotificationBadge } from "@/components/support/ticket-notification-badge";
import { SanctionNotificationBadge } from "@/components/sanctions/sanction-notification-badge";
import {
  canClientReadForumSection,
  getClientForumAccessContext,
} from "@/lib/forum/client-forum-access";
import { createClient } from "@/lib/supabase/client";

type MobilePortalNavigationProps = {
  unreadMessageCount: number;
  unreadForumCount: number;
  isStaff: boolean;
};

type LinkEntry = {
  href: string;
  label: string;
  icon: string;
  modal?: PortalModalPayload;
};

function MobileIcon({
  src,
  size = 22,
}: {
  src: string;
  size?: number;
}) {
  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      className="shrink-0 object-contain"
      style={{
        width: size,
        height: size,
      }}
    />
  );
}

function Badge({
  count,
}: {
  count: number;
}) {
  if (count <= 0) {
    return null;
  }

  return (
    <span className="ml-auto inline-flex min-w-4 items-center justify-center rounded-full border border-[rgb(var(--sep-colour-d19a4c))] bg-[rgb(var(--sep-colour-7a291f))] px-1 text-[8px] font-bold leading-4 text-[rgb(var(--sep-colour-ffe1ac))]">
      {count > 99 ? "99+" : count}
    </span>
  );
}

function EntryButton({
  entry,
  onBeforeOpen,
  badgeCount = 0,
  badge,
}: {
  entry: LinkEntry;
  onBeforeOpen?: () => void;
  badgeCount?: number;
  badge?: ReactNode;
}) {
  const pathname = usePathname();
  const base = entry.href.split("?")[0];
  const active =
    pathname === base ||
    (
      base !== "/" &&
      pathname.startsWith(`${base}/`)
    );

  const className = [
    "flex min-h-[52px] w-full items-center gap-3 border px-3 py-2 text-left",
    active
      ? "border-[rgb(var(--sep-colour-876a46))] bg-[rgb(var(--sep-colour-21170f))]"
      : "border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-15100d))]",
  ].join(" ");

  const contents = (
    <>
      <MobileIcon src={entry.icon} />
      <span className="min-w-0 flex-1 truncate text-[11px] text-[rgb(var(--sep-colour-b8a98f))]">
        {entry.label}
      </span>
      {badge ?? <Badge count={badgeCount} />}
    </>
  );

  if (entry.modal) {
    return (
      <button
        type="button"
        className={className}
        aria-haspopup="dialog"
        onClick={() => {
          onBeforeOpen?.();
          openPortalModal(entry.modal!);
        }}
      >
        {contents}
      </button>
    );
  }

  return (
    <Link
      href={entry.href}
      className={className}
      onClick={onBeforeOpen}
    >
      {contents}
    </Link>
  );
}

function SectionTitle({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <p className="mb-2 px-1 text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-756957))]">
      {children}
    </p>
  );
}

export function MobilePortalNavigation({
  unreadMessageCount,
  unreadForumCount,
  isStaff,
}: MobilePortalNavigationProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const notificationCounts =
    usePortalNotificationCounts();

  const [
    renderMobileNavigation,
    setRenderMobileNavigation,
  ] = useState(false);

  const [moreOpen, setMoreOpen] =
    useState(false);

  const [
    currentUnreadForumCount,
    setCurrentUnreadForumCount,
  ] = useState(unreadForumCount);

  const [rulesExpanded, setRulesExpanded] =
    useState(false);
  const [
    economyExpanded,
    setEconomyExpanded,
  ] = useState(false);
  const [
    legalExpanded,
    setLegalExpanded,
  ] = useState(false);

  const [
    hasFriendListFeature,
    setHasFriendListFeature,
  ] = useState(false);
  const [
    hasPrivateLocationAccess,
    setHasPrivateLocationAccess,
  ] = useState(false);
  const [
    hasOrderLeadership,
    setHasOrderLeadership,
  ] = useState(false);
  const [
    oddJobsRoomId,
    setOddJobsRoomId,
  ] = useState<string | null>(null);
  const [
    breezeLodgingsRoomId,
    setBreezeLodgingsRoomId,
  ] = useState<string | null>(null);

  const mapOpen =
    searchParams.get("map") ===
    "sepulchria";

  useEffect(() => {
    /*
     * Portal modals render portal routes inside an iframe.
     * The mobile bottom navigation belongs only to the
     * top-level portal, never to modal iframe content.
     */
    setRenderMobileNavigation(
      window.self === window.top,
    );
  }, []);

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname, searchParams]);

  useEffect(() => {
    setCurrentUnreadForumCount(
      unreadForumCount,
    );
  }, [unreadForumCount]);

  const refreshForumCount =
    useCallback(async () => {
      const supabase =
        createClient();

      const {
        data: { user },
      } =
        await supabase.auth.getUser();

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
          "Could not refresh mobile forum unread count:",
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

      const nextCount =
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
        nextCount,
      );
    }, []);

  useEffect(() => {
    void refreshForumCount();

    const supabase =
      createClient();

    const channel = supabase
      .channel(
        "mobile-forum-unread-count",
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
          event: "*",
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
          event: "*",
          schema: "public",
          table: "forum_sections",
        },
        () => {
          void refreshForumCount();
        },
      )
      .subscribe();

    const intervalId =
      window.setInterval(
        () => {
          void refreshForumCount();
        },
        15_000,
      );

    const handleFocus = () => {
      void refreshForumCount();
    };

    window.addEventListener(
      "focus",
      handleFocus,
    );

    return () => {
      window.clearInterval(
        intervalId,
      );
      window.removeEventListener(
        "focus",
        handleFocus,
      );
      void supabase.removeChannel(
        channel,
      );
    };
  }, [refreshForumCount]);

  useEffect(() => {
    if (!moreOpen) {
      return;
    }

    const previous =
      document.body.style.overflow;
    document.body.style.overflow =
      "hidden";

    return () => {
      document.body.style.overflow =
        previous;
    };
  }, [moreOpen]);

  const refreshAccess =
    useCallback(async () => {
      const supabase =
        createClient();

      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user) {
        setHasFriendListFeature(false);
        setHasPrivateLocationAccess(false);
        setHasOrderLeadership(false);
        return;
      }

      const { data: character } =
        await supabase
          .from("characters")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

      if (!character) {
        setHasFriendListFeature(false);
        setHasPrivateLocationAccess(false);
        setHasOrderLeadership(false);
        return;
      }

      const [
        friendResult,
        privateEntitlementResult,
        privateMembershipResult,
        orderMembershipResult,
      ] = await Promise.all([
        supabase
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
          .maybeSingle(),

        supabase
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
            "private_chat",
          )
          .maybeSingle(),

        supabase
          .from(
            "private_location_members",
          )
          .select("room_id")
          .eq(
            "character_id",
            character.id,
          )
          .eq("status", "active")
          .eq("role", "member")
          .limit(1)
          .maybeSingle(),

        supabase
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
          ),
      ]);

      setHasFriendListFeature(
        friendResult.data?.enabled === true,
      );

      setHasPrivateLocationAccess(
        isStaff ||
        privateEntitlementResult.data
          ?.enabled === true ||
        Boolean(
          privateMembershipResult.data,
        ),
      );

      setHasOrderLeadership(
        (
          orderMembershipResult.data ??
          []
        ).some((membership) => {
          const relation =
            Array.isArray(
              membership.level,
            )
              ? membership.level[0]
              : membership.level;

          return relation?.level === 6;
        }),
      );
    }, [isStaff]);

  useEffect(() => {
    void refreshAccess();

    const handleFocus = () => {
      void refreshAccess();
    };

    window.addEventListener(
      "focus",
      handleFocus,
    );

    return () => {
      window.removeEventListener(
        "focus",
        handleFocus,
      );
    };
  }, [refreshAccess]);

  useEffect(() => {
    let cancelled = false;

    async function loadRooms() {
      const supabase =
        createClient();

      const [
        oddJobsResult,
        breezeResult,
      ] = await Promise.all([
        supabase
          .from("rooms")
          .select("id")
          .eq(
            "slug",
            "odd-jobs-bureau",
          )
          .eq("is_active", true)
          .maybeSingle(),

        supabase
          .from("rooms")
          .select("id")
          .eq(
            "slug",
            "the-breeze-lodgings",
          )
          .eq("is_active", true)
          .maybeSingle(),
      ]);

      if (cancelled) {
        return;
      }

      setOddJobsRoomId(
        oddJobsResult.data?.id ??
          null,
      );
      setBreezeLodgingsRoomId(
        breezeResult.data?.id ??
          null,
      );
    }

    void loadRooms();

    return () => {
      cancelled = true;
    };
  }, []);

  const personalEntries =
    useMemo<LinkEntry[]>(
      () => [
        {
          href: "/characters",
          label:
            "Sepulchria's People",
          icon:
            "/icons/characters.png",
          modal: {
            label:
              "Sepulchria's People",
            title:
              "Browse the characters who inhabit Sepulchria.",
            icon:
              "/icons/characters.png",
            href: "/characters",
          },
        },
        ...(hasFriendListFeature
          ? [
              {
                href: "/friends",
                label: "Friends",
                icon:
                  "/icons/friends.png",
                modal: {
                  label: "Friend List",
                  title:
                    "Open your character relationships and relationship requests.",
                  icon:
                    "/icons/friends.png",
                  href: "/friends",
                },
              },
            ]
          : []),
        ...(hasPrivateLocationAccess
          ? [
              {
                href:
                  "/private-locations",
                label:
                  "Private Location",
                icon:
                  "/icons/private.png",
              },
            ]
          : []),
      ],
      [
        hasFriendListFeature,
        hasPrivateLocationAccess,
      ],
    );

  const loreEntries: LinkEntry[] = [
    {
      href: "/codex",
      label: "Codex",
      icon: "/icons/codex.png",
      modal: {
        label: "Codex",
        title:
          "Open the in-world Codex and explore Aureth's history, locations and lore.",
        icon: "/icons/codex.png",
        href: "/codex",
      },
    },
    {
      href: "/ancestries",
      label: "Ancestries",
      icon:
        "/icons/ancestries.png",
      modal: {
        label: "Ancestries",
        title:
          "Read about the playable ancestries of Sepulchria.",
        icon:
          "/icons/ancestries.png",
        href: "/ancestries",
      },
    },
    {
      href: "/associations",
      label: "Associations",
      icon:
        "/icons/associations.png",
      modal: {
        label: "Associations",
        title:
          "Explore the Associations and their place in Sepulchrian society.",
        icon:
          "/icons/associations.png",
        href: "/associations",
      },
    },
    {
      href: "/orders",
      label: "Orders",
      icon: "/icons/orders.png",
      modal: {
        label: "Orders",
        title:
          "Read about the Orders, their ties to Associations, and their structure and scope.",
        icon: "/icons/orders.png",
        href: "/orders",
      },
    },
    {
      href: "/warping",
      label: "Warping",
      icon: "/icons/warping.png",
      modal: {
        label: "Warping",
        title:
          "Read about magic in Sepulchria, including Warping.",
        icon: "/icons/warping.png",
        href: "/warping",
      },
    },
    {
      href: "/feats",
      label: "Feats",
      icon: "/icons/gifts.png",
      modal: {
        label: "Feats",
        title:
          "Browse the Feats available for Characters through Ancestries, Orders and other sources.",
        icon: "/icons/gifts.png",
        href: "/feats",
      },
    },
  ];

  const ruleEntry: LinkEntry = {
    href: "/rules",
    label: "Rules",
    icon: "/icons/rules.png",
    modal: {
      label: "Rules",
      title:
        "Read the official game rules and off-game documentation.",
      icon: "/icons/rules.png",
      href: "/rules",
    },
  };

  const glossaryEntry: LinkEntry = {
    href: "/rules?view=glossary",
    label: "Glossary",
    icon: "/icons/rules.png",
    modal: {
      label: "Glossary",
      title:
        "Look up Sepulchria terminology, meanings and related rules.",
      icon: "/icons/rules.png",
      href:
        "/rules?view=glossary",
    },
  };

  const marketEntry: LinkEntry = {
    href: "/market",
    label: "Market",
    icon: "/icons/market.png",
    modal: {
      label: "Market",
      title:
        "Browse the market and buy or sell items.",
      icon: "/icons/market.png",
      href: "/market",
    },
  };

  const craftingEntry: LinkEntry = {
    href: "/crafting",
    label: "Crafting",
    icon: "/icons/crafting.png",
    modal: {
      label: "Crafting",
      title:
        "Open your crafting workbench and create items from known recipes.",
      icon:
        "/icons/crafting.png",
      href: "/crafting",
    },
  };

  const missionsEntry: LinkEntry = {
    href: "/missions",
    label: "Daily Missions",
    icon: "/icons/missions.png",
    modal: {
      label: "Daily Missions",
      title:
        "Review today's missions, progress and rewards.",
      icon:
        "/icons/missions.png",
      href: "/missions",
    },
  };

  const rankingEntry: LinkEntry = {
    href: "/ranking",
    label: "Hall of Renown",
    icon: "/icons/ranking.png",
    modal: {
      label: "Hall of Renown",
      title:
        "Enter the Hall of Renown and view Sepulchria's records of standing and achievement.",
      icon:
        "/icons/ranking.png",
      href: "/ranking",
    },
  };

  const legalEntries: LinkEntry[] = [
    {
      href: "/community-rules",
      label: "Community Rules",
      icon: "/icons/rules.png",
      modal: {
        label:
          "Community Rules",
        title:
          "Read Sepulchria's Community Rules and safety requirements.",
        icon: "/icons/rules.png",
        href:
          "/community-rules",
      },
    },
    {
      href: "/safety",
      label: "Safety",
      icon: "/icons/rules.png",
      modal: {
        label: "Safety",
        title:
          "Read Sepulchria's public safety and reporting information.",
        icon: "/icons/rules.png",
        href: "/safety",
      },
    },
    {
      href: "/age-policy",
      label: "18+ Policy",
      icon: "/icons/rules.png",
      modal: {
        label: "18+ Policy",
        title:
          "Read Sepulchria's age and 18+ eligibility policy.",
        icon: "/icons/rules.png",
        href: "/age-policy",
      },
    },
    {
      href: "/privacy",
      label: "Privacy",
      icon: "/icons/rules.png",
      modal: {
        label: "Privacy",
        title:
          "Read Sepulchria's Privacy Notice.",
        icon: "/icons/rules.png",
        href: "/privacy",
      },
    },
    {
      href: "/cookies",
      label: "Cookies",
      icon: "/icons/rules.png",
      modal: {
        label: "Cookies",
        title:
          "Read Sepulchria's Cookie Notice.",
        icon: "/icons/rules.png",
        href: "/cookies",
      },
    },
    {
      href: "/terms",
      label: "Terms",
      icon: "/icons/rules.png",
      modal: {
        label: "Terms",
        title:
          "Read Sepulchria's Terms of Service.",
        icon: "/icons/rules.png",
        href: "/terms",
      },
    },
  ];

  const closeMore = () => {
    setMoreOpen(false);
  };

  const moreAttentionCount =
    currentUnreadForumCount +
    notificationCounts.tickets.player +
    notificationCounts.sanctions.player;

  if (!renderMobileNavigation) {
    return null;
  }

  return (
    <>
      <nav
        data-mobile-portal-nav
        data-portal-navigation
        data-sep-interaction-ignore="true"
        aria-label="Mobile portal navigation"
        className="fixed inset-x-0 bottom-0 z-[85] border-t border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0d0b0a))]/[0.97] px-2 pb-[max(0.45rem,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-10px_32px_rgba(var(--sep-rgb-0-0-0),0.42)] backdrop-blur lg:hidden"
      >
        <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
          <Link
            href="/"
            className={[
              "flex min-h-[50px] flex-col items-center justify-center gap-1 px-1 text-[9px]",
              pathname === "/" &&
              !mapOpen
                ? "bg-[rgb(var(--sep-colour-21170f))] text-[rgb(var(--sep-colour-d4b47d))]"
                : "text-[rgb(var(--sep-colour-8f806d))]",
            ].join(" ")}
          >
            <MobileIcon
              src="/icons/dashboard.png"
              size={20}
            />
            <span>Aureth</span>
          </Link>

          <Link
            href="/?map=sepulchria"
            className={[
              "flex min-h-[50px] flex-col items-center justify-center gap-1 px-1 text-[9px]",
              pathname === "/" &&
              mapOpen
                ? "bg-[rgb(var(--sep-colour-21170f))] text-[rgb(var(--sep-colour-d4b47d))]"
                : "text-[rgb(var(--sep-colour-8f806d))]",
            ].join(" ")}
          >
            <MobileIcon
              src="/icons/play.png"
              size={20}
            />
            <span>Enter</span>
          </Link>

          <button
            type="button"
            aria-haspopup="dialog"
            onClick={() =>
              openPortalModal({
                label:
                  "Sepulchria's People",
                title:
                  "Browse the characters who inhabit Sepulchria.",
                icon:
                  "/icons/characters.png",
                href: "/characters",
              })
            }
            className="flex min-h-[50px] flex-col items-center justify-center gap-1 px-1 text-[9px] text-[rgb(var(--sep-colour-8f806d))]"
          >
            <MobileIcon
              src="/icons/characters.png"
              size={20}
            />
            <span>People</span>
          </button>

          <button
            type="button"
            aria-haspopup="dialog"
            onClick={() =>
              openPortalModal({
                label: "Messages",
                title:
                  "Open your private conversations with other characters.",
                icon:
                  "/icons/messages.png",
                href: "/messages",
              })
            }
            className="relative flex min-h-[50px] flex-col items-center justify-center gap-1 px-1 text-[9px] text-[rgb(var(--sep-colour-8f806d))]"
          >
            <MobileIcon
              src="/icons/messages.png"
              size={20}
            />
            <span>Messages</span>
            <span className="absolute right-[18%] top-1">
              <UnreadMessageBadge
                initialCount={
                  unreadMessageCount
                }
                variant="inline"
              />
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              setMoreOpen(true)
            }
            aria-expanded={moreOpen}
            className="relative flex min-h-[50px] flex-col items-center justify-center gap-1 px-1 text-[9px] text-[rgb(var(--sep-colour-8f806d))]"
          >
            <span
              aria-hidden="true"
              className="text-[22px] leading-none"
            >
              ⋯
            </span>
            <span>More</span>

            {moreAttentionCount > 0 ? (
              <span
                title={`${moreAttentionCount} item${moreAttentionCount === 1 ? "" : "s"} need attention`}
                className="absolute right-[18%] top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full border border-[rgb(var(--sep-colour-d19a4c))] bg-[rgb(var(--sep-colour-7a291f))] px-1 text-[7px] font-bold leading-none text-[rgb(var(--sep-colour-ffe1ac))]"
              >
                {moreAttentionCount > 9
                  ? "9+"
                  : moreAttentionCount}
              </span>
            ) : null}
          </button>
        </div>
      </nav>

      {moreOpen ? (
        <>
          <button
            type="button"
            aria-label="Close mobile menu"
            onClick={closeMore}
            className="fixed inset-0 z-[90] bg-black/70 backdrop-blur-[2px] lg:hidden"
          />

          <section
            role="dialog"
            aria-modal="true"
            aria-label="More Sepulchria navigation"
            data-portal-navigation
            data-sep-interaction-ignore="true"
            className="fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-[95] flex max-h-[calc(88dvh-64px-env(safe-area-inset-bottom))] flex-col overflow-hidden rounded-t-[18px] border-t border-[rgb(var(--sep-colour-60482e))]/65 bg-[rgb(var(--sep-colour-100d0b))] shadow-[0_-24px_55px_rgba(var(--sep-rgb-0-0-0),0.58)] [--portal-nav-min-h:2.5rem] [--portal-nav-y:0.35rem] lg:hidden"
          >
            <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-[rgb(var(--sep-colour-5c472f))]" />

            <div className="flex shrink-0 items-center justify-between border-b border-[rgb(var(--sep-colour-60482e))]/35 px-4 py-3">
              <div>
                <p className="text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-756957))]">
                  Sepulchria
                </p>
                <h2 className="mt-1 font-serif text-lg text-[rgb(var(--sep-colour-c9b184))]">
                  More
                </h2>
              </div>

              <button
                type="button"
                onClick={closeMore}
                aria-label="Close"
                className="flex h-9 w-9 items-center justify-center border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-17120f))] text-lg text-[rgb(var(--sep-colour-a99b89))]"
              >
                ×
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <section>
                <SectionTitle>
                  People & Character
                </SectionTitle>
                <div className="grid grid-cols-2 gap-2">
                  {personalEntries.map(
                    (entry) => (
                      <EntryButton
                        key={entry.label}
                        entry={entry}
                        onBeforeOpen={
                          entry.modal
                            ? undefined
                            : closeMore
                        }
                      />
                    ),
                  )}
                </div>
              </section>

              <section>
                <SectionTitle>
                  Lore
                </SectionTitle>

                <div className="grid grid-cols-2 gap-2">
                  {loreEntries.map(
                    (entry) => (
                      <EntryButton
                        key={entry.label}
                        entry={entry}
                      />
                    ),
                  )}

                  <div className="col-span-2 border border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-15100d))]">
                    <div className="flex min-h-[52px] items-stretch">
                      <button
                        type="button"
                        className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2 text-left"
                        onClick={() =>
                          openPortalModal(
                            ruleEntry.modal!,
                          )
                        }
                      >
                        <MobileIcon
                          src="/icons/rules.png"
                        />
                        <span className="text-[11px] text-[rgb(var(--sep-colour-b8a98f))]">
                          Rules
                        </span>
                      </button>

                      <button
                        type="button"
                        aria-expanded={
                          rulesExpanded
                        }
                        aria-label={
                          rulesExpanded
                            ? "Collapse Rules submenu"
                            : "Expand Rules submenu"
                        }
                        onClick={() =>
                          setRulesExpanded(
                            (value) =>
                              !value,
                          )
                        }
                        className="w-10 shrink-0 border-l border-[rgb(var(--sep-colour-60482e))]/45 text-lg text-[rgb(var(--sep-colour-b68b4f))]"
                      >
                        {rulesExpanded
                          ? "−"
                          : "+"}
                      </button>
                    </div>

                    {rulesExpanded ? (
                      <div className="border-t border-[rgb(var(--sep-colour-60482e))]/35 p-2">
                        <EntryButton
                          entry={
                            glossaryEntry
                          }
                        />
                      </div>
                    ) : null}
                  </div>
                </div>
              </section>

              <section>
                <SectionTitle>
                  Services & Utilities
                </SectionTitle>

                <div className="space-y-2">
                  <div className="border border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-15100d))]">
                    <div className="flex min-h-[52px] items-stretch">
                      <button
                        type="button"
                        onClick={() =>
                          setEconomyExpanded(
                            (value) =>
                              !value,
                          )
                        }
                        className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2 text-left"
                      >
                        <MobileIcon
                          src="/icons/economy.png"
                        />
                        <span className="text-[11px] text-[rgb(var(--sep-colour-b8a98f))]">
                          Economy & Crafting
                        </span>
                      </button>

                      <button
                        type="button"
                        aria-expanded={
                          economyExpanded
                        }
                        aria-label={
                          economyExpanded
                            ? "Collapse Economy & Crafting submenu"
                            : "Expand Economy & Crafting submenu"
                        }
                        onClick={() =>
                          setEconomyExpanded(
                            (value) =>
                              !value,
                          )
                        }
                        className="w-10 shrink-0 border-l border-[rgb(var(--sep-colour-60482e))]/45 text-lg text-[rgb(var(--sep-colour-b68b4f))]"
                      >
                        {economyExpanded
                          ? "−"
                          : "+"}
                      </button>
                    </div>

                    {economyExpanded ? (
                      <div className="grid grid-cols-2 gap-2 border-t border-[rgb(var(--sep-colour-60482e))]/35 p-2">
                        <EntryButton
                          entry={
                            marketEntry
                          }
                        />
                        <EntryButton
                          entry={
                            craftingEntry
                          }
                        />

                        {oddJobsRoomId ? (
                          <form
                            action={
                              enterRoomFromMap
                            }
                          >
                            <input
                              type="hidden"
                              name="roomId"
                              value={
                                oddJobsRoomId
                              }
                            />
                            <button
                              type="submit"
                              className="flex min-h-[52px] w-full items-center gap-3 border border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-15100d))] px-3 py-2 text-left"
                            >
                              <MobileIcon
                                src="/icons/bureau.png"
                              />
                              <span className="text-[11px] text-[rgb(var(--sep-colour-b8a98f))]">
                                Odd Jobs Bureau
                              </span>
                            </button>
                          </form>
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <EntryButton
                      entry={missionsEntry}
                    />

                    {breezeLodgingsRoomId ? (
                      <form
                        action={
                          enterRoomFromMap
                        }
                      >
                        <input
                          type="hidden"
                          name="roomId"
                          value={
                            breezeLodgingsRoomId
                          }
                        />
                        <button
                          type="submit"
                          className="flex min-h-[52px] w-full items-center gap-3 border border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-15100d))] px-3 py-2 text-left"
                        >
                          <MobileIcon
                            src="/icons/lodging.png"
                          />
                          <span className="text-[11px] text-[rgb(var(--sep-colour-b8a98f))]">
                            Breeze Lodgings
                          </span>
                        </button>
                      </form>
                    ) : null}

                    {hasOrderLeadership ? (
                      <EntryButton
                        entry={{
                          href:
                            "/orders/manage",
                          label:
                            "Manage Order",
                          icon:
                            "/icons/manage-orders.png",
                        }}
                        onBeforeOpen={
                          closeMore
                        }
                      />
                    ) : null}

                    <EntryButton
                      entry={rankingEntry}
                    />
                  </div>

                  <div className="border border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-15100d))] p-1.5">
                    <ForumSidebarMenu
                      unreadCount={
                        currentUnreadForumCount
                      }
                    />
                  </div>
                </div>
              </section>

              <section>
                <SectionTitle>
                  Help & Safety
                </SectionTitle>

                <div className="grid grid-cols-2 gap-2">
                  <EntryButton
                    entry={{
                      href: "/support",
                      label: "Support",
                      icon:
                        "/icons/rules.png",
                    }}
                    onBeforeOpen={
                      closeMore
                    }
                    badge={
                      <TicketNotificationBadge
                        audience="player"
                        variant="sidebar"
                      />
                    }
                  />

                  {notificationCounts
                    .sanctions
                    .playerHasSanctions ? (
                    <EntryButton
                      entry={{
                        href:
                          "/sanctions",
                        label:
                          "Sanctions",
                        icon:
                          "/icons/rules.png",
                      }}
                      onBeforeOpen={
                        closeMore
                      }
                      badge={
                        <SanctionNotificationBadge
                          audience="player"
                        />
                      }
                    />
                  ) : null}

                  <div className="col-span-2 border border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-15100d))]">
                    <button
                      type="button"
                      onClick={() =>
                        setLegalExpanded(
                          (value) =>
                            !value,
                        )
                      }
                      aria-expanded={
                        legalExpanded
                      }
                      className="flex min-h-[52px] w-full items-center gap-3 px-3 py-2 text-left"
                    >
                      <MobileIcon
                        src="/icons/rules.png"
                      />
                      <span className="min-w-0 flex-1 text-[11px] text-[rgb(var(--sep-colour-b8a98f))]">
                        Legal & Safety
                      </span>
                      <span className="text-lg text-[rgb(var(--sep-colour-b68b4f))]">
                        {legalExpanded
                          ? "−"
                          : "+"}
                      </span>
                    </button>

                    {legalExpanded ? (
                      <div className="grid grid-cols-2 gap-2 border-t border-[rgb(var(--sep-colour-60482e))]/35 p-2">
                        {legalEntries.map(
                          (entry) => (
                            <EntryButton
                              key={
                                entry.label
                              }
                              entry={entry}
                            />
                          ),
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>
              </section>


            </div>
          </section>
        </>
      ) : null}
    </>
  );
}
