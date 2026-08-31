"use client";

import Link from "next/link";
import {
  BookOpen,
  BriefcaseBusiness,
  Building2,
  CircleHelp,
  Cookie,
  Crown,
  Ellipsis,
  FileText,
  Gavel,
  Home,
  Landmark,
  MessageCircle,
  Moon,
  ScrollText,
  Shield,
  ShoppingBag,
  Sparkles,
  Users,
  WandSparkles,
  X,
} from "lucide-react";
import {
  type ComponentType,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  usePathname,
  useSearchParams,
} from "next/navigation";

import { enterRoomFromMap } from "@/app/(portal)/game/actions";
import { createClient } from "@/lib/supabase/client";

type MobilePortalNavigationProps = {
  unreadMessageCount: number;
  isStaff: boolean;
};

type MenuEntry = {
  href: string;
  label: string;
  icon: ComponentType<{
    className?: string;
  }>;
  opensModal?: boolean;
  modalTitle?: string;
  modalIcon?: string;
};

type RoomEntry = {
  roomId: string;
  label: string;
  icon: ComponentType<{
    className?: string;
  }>;
  roomAction: true;
};

type MobileMenuEntry =
  | MenuEntry
  | RoomEntry;

function openPortalModal(
  entry: MenuEntry,
) {
  window.dispatchEvent(
    new CustomEvent(
      "sepulchria:open-public-modal",
      {
        detail: {
          label: entry.label,
          title:
            entry.modalTitle ??
            entry.label,
          icon:
            entry.modalIcon ??
            "/icons/dashboard.png",
          href: entry.href,
        },
      },
    ),
  );
}

function isRouteActive(
  pathname: string,
  href: string,
) {
  if (href === "/") {
    return pathname === "/";
  }

  const base =
    href.split("?")[0];

  return (
    pathname === base ||
    pathname.startsWith(
      `${base}/`,
    )
  );
}

function MenuSection({
  title,
  entries,
  pathname,
}: {
  title: string;
  entries: MobileMenuEntry[];
  pathname: string;
}) {
  if (!entries.length) {
    return null;
  }

  return (
    <section>
      <p className="mb-2 px-1 text-[8px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-756957))]">
        {title}
      </p>

      <div className="grid grid-cols-2 gap-2">
        {entries.map((entry) => {
          const Icon = entry.icon;

          if (
            "roomAction" in entry &&
            entry.roomAction
          ) {
            return (
              <form
                key={`${title}-${entry.label}`}
                action={enterRoomFromMap}
              >
                <input
                  type="hidden"
                  name="roomId"
                  value={entry.roomId}
                />

                <button
                  type="submit"
                  className="flex min-h-[58px] w-full items-center gap-3 border border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-15100d))] px-3 py-2 text-left"
                >
                  <Icon className="h-5 w-5 shrink-0 text-[rgb(var(--sep-colour-a88658))]" />
                  <span className="text-[11px] leading-tight text-[rgb(var(--sep-colour-b8a98f))]">
                    {entry.label}
                  </span>
                </button>
              </form>
            );
          }

          if (!("href" in entry)) {
            return null;
          }

          const active =
            isRouteActive(
              pathname,
              entry.href,
            );

          const className = [
            "flex min-h-[58px] w-full items-center gap-3 border px-3 py-2 text-left",
            active
              ? "border-[rgb(var(--sep-colour-876a46))] bg-[rgb(var(--sep-colour-21170f))]"
              : "border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-15100d))]",
          ].join(" ");

          const contents = (
            <>
              <Icon className="h-5 w-5 shrink-0 text-[rgb(var(--sep-colour-a88658))]" />
              <span className="text-[11px] leading-tight text-[rgb(var(--sep-colour-b8a98f))]">
                {entry.label}
              </span>
            </>
          );

          if (entry.opensModal) {
            return (
              <button
                key={`${title}-${entry.label}`}
                type="button"
                onClick={() =>
                  openPortalModal(entry)
                }
                className={className}
                aria-haspopup="dialog"
              >
                {contents}
              </button>
            );
          }

          return (
            <Link
              key={`${title}-${entry.label}`}
              href={entry.href}
              className={className}
            >
              {contents}
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export function MobilePortalNavigation({
  unreadMessageCount,
  isStaff,
}: MobilePortalNavigationProps) {
  const pathname =
    usePathname();

  const searchParams =
    useSearchParams();

  const [moreOpen, setMoreOpen] =
    useState(false);

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
  ] = useState<string | null>(
    null,
  );

  const [
    breezeLodgingsRoomId,
    setBreezeLodgingsRoomId,
  ] = useState<string | null>(
    null,
  );

  const sepulchriaMapOpen =
    searchParams.get("map") ===
    "sepulchria";

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname, searchParams]);

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

  const refreshConditionalAccess =
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
        setHasPrivateLocationAccess(
          false,
        );
        setHasOrderLeadership(
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
        setHasFriendListFeature(
          false,
        );
        setHasPrivateLocationAccess(
          false,
        );
        setHasOrderLeadership(
          false,
        );
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
          .eq(
            "status",
            "active",
          )
          .eq(
            "role",
            "member",
          )
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
        friendResult.data
          ?.enabled === true,
      );

      setHasPrivateLocationAccess(
        isStaff ||
        privateEntitlementResult
          .data?.enabled === true ||
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

          return (
            relation?.level === 6
          );
        }),
      );
    }, [isStaff]);

  useEffect(() => {
    void refreshConditionalAccess();

    const handleFocus = () => {
      void refreshConditionalAccess();
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
  }, [refreshConditionalAccess]);

  useEffect(() => {
    let cancelled = false;

    async function loadRoomIds() {
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

    void loadRoomIds();

    return () => {
      cancelled = true;
    };
  }, []);

  const personalEntries =
    useMemo<MenuEntry[]>(
      () => [
        {
          href: "/character",
          label: "My Character",
          icon: Users,
        },
        ...(hasFriendListFeature
          ? [
              {
                href: "/friends",
                label: "Friends",
                icon: Users,
                opensModal: true,
                modalTitle:
                  "Open your character relationships and relationship requests.",
                modalIcon:
                  "/icons/friends.png",
              },
            ]
          : []),
        ...(hasPrivateLocationAccess
          ? [
              {
                href: "/private-locations",
                label:
                  "Private Location",
                icon: Moon,
              },
            ]
          : []),
      ],
      [
        hasFriendListFeature,
        hasPrivateLocationAccess,
      ],
    );

  const loreEntries:
    MenuEntry[] = [
      {
        href: "/codex",
        label: "Codex",
        icon: BookOpen,
        opensModal: true,
        modalTitle:
          "Open the in-world Codex and explore Aureth's history, locations and lore.",
        modalIcon:
          "/icons/codex.png",
      },
      {
        href: "/rules",
        label: "Rules",
        icon: ScrollText,
        opensModal: true,
        modalTitle:
          "Read the official game rules and off-game documentation.",
        modalIcon:
          "/icons/rules.png",
      },
      {
        href: "/rules?view=glossary",
        label: "Glossary",
        icon: BookOpen,
        opensModal: true,
        modalTitle:
          "Look up Sepulchria terminology, meanings and related rules.",
        modalIcon:
          "/icons/rules.png",
      },
      {
        href: "/ancestries",
        label: "Ancestries",
        icon: Users,
        opensModal: true,
        modalTitle:
          "Read about the playable ancestries of Sepulchria.",
        modalIcon:
          "/icons/ancestries.png",
      },
      {
        href: "/associations",
        label: "Associations",
        icon: Landmark,
        opensModal: true,
        modalTitle:
          "Explore the Associations and their place in Sepulchrian society.",
        modalIcon:
          "/icons/associations.png",
      },
      {
        href: "/orders",
        label: "Orders",
        icon: Crown,
        opensModal: true,
        modalTitle:
          "Read about the Orders, their ties to Associations, and their structure and scope.",
        modalIcon:
          "/icons/orders.png",
      },
      {
        href: "/warping",
        label: "Warping",
        icon: WandSparkles,
        opensModal: true,
        modalTitle:
          "Read about magic in Sepulchria, including Warping.",
        modalIcon:
          "/icons/warping.png",
      },
      {
        href: "/feats",
        label: "Feats",
        icon: Sparkles,
        opensModal: true,
        modalTitle:
          "Browse the Feats available for Characters through Ancestries, Orders and other sources.",
        modalIcon:
          "/icons/gifts.png",
      },
    ];

  const serviceEntries =
    useMemo<MobileMenuEntry[]>(
      () => [
        {
          href: "/market",
          label: "Market",
          icon: ShoppingBag,
          opensModal: true,
          modalTitle:
            "Browse the market and buy or sell items.",
          modalIcon:
            "/icons/market.png",
        },
        {
          href: "/crafting",
          label: "Crafting",
          icon: Sparkles,
          opensModal: true,
          modalTitle:
            "Open your crafting workbench and create items from known recipes.",
          modalIcon:
            "/icons/crafting.png",
        },
        {
          href: "/missions",
          label: "Daily Missions",
          icon: BriefcaseBusiness,
          opensModal: true,
          modalTitle:
            "Review today's missions, progress and rewards.",
          modalIcon:
            "/icons/missions.png",
        },
        ...(oddJobsRoomId
          ? [
              {
                roomId:
                  oddJobsRoomId,
                label:
                  "Odd Jobs Bureau",
                icon: Building2,
                roomAction:
                  true as const,
              },
            ]
          : []),
        ...(breezeLodgingsRoomId
          ? [
              {
                roomId:
                  breezeLodgingsRoomId,
                label:
                  "Breeze Lodgings",
                icon: Building2,
                roomAction:
                  true as const,
              },
            ]
          : []),
        ...(hasOrderLeadership
          ? [
              {
                href:
                  "/orders/manage",
                label:
                  "Manage Order",
                icon: Crown,
              },
            ]
          : []),
        {
          href: "/ranking",
          label:
            "Hall of Renown",
          icon: Crown,
          opensModal: true,
          modalTitle:
            "Enter the Hall of Renown and view Sepulchria's records of standing and achievement.",
          modalIcon:
            "/icons/ranking.png",
        },
        {
          href: "/forum",
          label: "Forum",
          icon: MessageCircle,
          opensModal: true,
          modalTitle:
            "Open the Sepulchria community forum.",
          modalIcon:
            "/icons/forum.png",
        },
      ],
      [
        oddJobsRoomId,
        breezeLodgingsRoomId,
        hasOrderLeadership,
      ],
    );

  const helpEntries:
    MenuEntry[] = [
      {
        href: "/support",
        label: "Support",
        icon: CircleHelp,
      },
      {
        href: "/sanctions",
        label: "Sanctions",
        icon: Gavel,
      },
      {
        href: "/community-rules",
        label:
          "Community Rules",
        icon: Shield,
        opensModal: true,
        modalTitle:
          "Read Sepulchria's Community Rules and safety requirements.",
        modalIcon:
          "/icons/rules.png",
      },
      {
        href: "/safety",
        label: "Safety",
        icon: Shield,
        opensModal: true,
        modalTitle:
          "Read Sepulchria's public safety and reporting information.",
        modalIcon:
          "/icons/rules.png",
      },
      {
        href: "/age-policy",
        label: "18+ Policy",
        icon: Shield,
        opensModal: true,
        modalTitle:
          "Read Sepulchria's age and 18+ eligibility policy.",
        modalIcon:
          "/icons/rules.png",
      },
      {
        href: "/privacy",
        label: "Privacy",
        icon: FileText,
        opensModal: true,
        modalTitle:
          "Read Sepulchria's Privacy Notice.",
        modalIcon:
          "/icons/rules.png",
      },
      {
        href: "/cookies",
        label: "Cookies",
        icon: Cookie,
        opensModal: true,
        modalTitle:
          "Read Sepulchria's Cookie Notice.",
        modalIcon:
          "/icons/rules.png",
      },
      {
        href: "/terms",
        label: "Terms",
        icon: FileText,
        opensModal: true,
        modalTitle:
          "Read Sepulchria's Terms of Service.",
        modalIcon:
          "/icons/rules.png",
      },
    ];

  const aurethActive =
    pathname === "/" &&
    !sepulchriaMapOpen;

  const enterActive =
    pathname === "/" &&
    sepulchriaMapOpen;

  return (
    <>
      <nav
        data-mobile-portal-nav
        data-sep-interaction-ignore="true"
        aria-label="Mobile portal navigation"
        className="fixed inset-x-0 bottom-0 z-[85] border-t border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0d0b0a))]/[0.97] px-2 pb-[max(0.45rem,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-10px_32px_rgba(var(--sep-rgb-0-0-0),0.42)] backdrop-blur lg:hidden"
      >
        <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
          <Link
            href="/"
            className={[
              "flex min-h-[50px] flex-col items-center justify-center gap-1 px-1 text-[9px]",
              aurethActive
                ? "bg-[rgb(var(--sep-colour-21170f))] text-[rgb(var(--sep-colour-d4b47d))]"
                : "text-[rgb(var(--sep-colour-8f806d))]",
            ].join(" ")}
          >
            <img
              src="/icons/dashboard.png"
              alt=""
              aria-hidden="true"
              className="h-[20px] w-[20px] object-contain"
            />
            <span>Aureth</span>
          </Link>

          <Link
            href="/?map=sepulchria"
            className={[
              "flex min-h-[50px] flex-col items-center justify-center gap-1 px-1 text-[9px]",
              enterActive
                ? "bg-[rgb(var(--sep-colour-21170f))] text-[rgb(var(--sep-colour-d4b47d))]"
                : "text-[rgb(var(--sep-colour-8f806d))]",
            ].join(" ")}
          >
            <img
              src="/icons/play.png"
              alt=""
              aria-hidden="true"
              className="h-[20px] w-[20px] object-contain"
            />
            <span>Enter</span>
          </Link>

          <button
            type="button"
            onClick={() =>
              openPortalModal({
                href: "/characters",
                label:
                  "Sepulchria's People",
                icon: Users,
                opensModal: true,
                modalTitle:
                  "Browse the characters who inhabit Sepulchria.",
                modalIcon:
                  "/icons/characters.png",
              })
            }
            className={[
              "flex min-h-[50px] flex-col items-center justify-center gap-1 px-1 text-[9px]",
              isRouteActive(
                pathname,
                "/characters",
              )
                ? "bg-[rgb(var(--sep-colour-21170f))] text-[rgb(var(--sep-colour-d4b47d))]"
                : "text-[rgb(var(--sep-colour-8f806d))]",
            ].join(" ")}
            aria-haspopup="dialog"
          >
            <img
              src="/icons/characters.png"
              alt=""
              aria-hidden="true"
              className="h-[20px] w-[20px] object-contain"
            />
            <span>People</span>
          </button>

          <button
            type="button"
            onClick={() =>
              openPortalModal({
                href: "/messages",
                label: "Messages",
                icon: MessageCircle,
                opensModal: true,
                modalTitle:
                  "Open your private conversations with other characters.",
                modalIcon:
                  "/icons/messages.png",
              })
            }
            className={[
              "relative flex min-h-[50px] flex-col items-center justify-center gap-1 px-1 text-[9px]",
              isRouteActive(
                pathname,
                "/messages",
              )
                ? "bg-[rgb(var(--sep-colour-21170f))] text-[rgb(var(--sep-colour-d4b47d))]"
                : "text-[rgb(var(--sep-colour-8f806d))]",
            ].join(" ")}
            aria-haspopup="dialog"
          >
            <img
              src="/icons/messages.png"
              alt=""
              aria-hidden="true"
              className="h-[20px] w-[20px] object-contain"
            />
            <span>Messages</span>

            {unreadMessageCount >
            0 ? (
              <span className="absolute right-[20%] top-1 min-w-4 rounded-full bg-[rgb(var(--sep-colour-8a382d))] px-1 text-center text-[8px] leading-4 text-white">
                {unreadMessageCount >
                99
                  ? "99+"
                  : unreadMessageCount}
              </span>
            ) : null}
          </button>

          <button
            type="button"
            onClick={() =>
              setMoreOpen(true)
            }
            aria-expanded={
              moreOpen
            }
            aria-label="More portal options"
            className="flex min-h-[50px] flex-col items-center justify-center gap-1 px-1 text-[9px] text-[rgb(var(--sep-colour-8f806d))]"
          >
            <Ellipsis className="h-[19px] w-[19px]" />
            <span>More</span>
          </button>
        </div>
      </nav>

      {moreOpen ? (
        <>
          <button
            type="button"
            aria-label="Close mobile menu"
            onClick={() =>
              setMoreOpen(false)
            }
            className="fixed inset-0 z-[90] bg-black/70 backdrop-blur-[2px] lg:hidden"
          />

          <section
            role="dialog"
            aria-modal="true"
            aria-label="More Sepulchria navigation"
            data-sep-interaction-ignore="true"
            className="fixed inset-x-0 bottom-0 z-[95] flex max-h-[88dvh] flex-col overflow-hidden rounded-t-[18px] border-t border-[rgb(var(--sep-colour-60482e))]/65 bg-[rgb(var(--sep-colour-100d0b))] shadow-[0_-24px_55px_rgba(var(--sep-rgb-0-0-0),0.58)] lg:hidden"
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
                onClick={() =>
                  setMoreOpen(false)
                }
                aria-label="Close"
                className="flex h-9 w-9 items-center justify-center border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-17120f))] text-[rgb(var(--sep-colour-a99b89))]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <MenuSection
                title="My Character"
                entries={
                  personalEntries
                }
                pathname={pathname}
              />

              <MenuSection
                title="Lore"
                entries={
                  loreEntries
                }
                pathname={pathname}
              />

              <MenuSection
                title="Services"
                entries={
                  serviceEntries
                }
                pathname={pathname}
              />

              <MenuSection
                title="Help & Safety"
                entries={
                  helpEntries
                }
                pathname={pathname}
              />

              {isStaff ? (
                <MenuSection
                  title="Staff"
                  entries={[
                    {
                      href: "/admin",
                      label:
                        "Administration",
                      icon: Crown,
                    },
                  ]}
                  pathname={
                    pathname
                  }
                />
              ) : null}
            </div>
          </section>
        </>
      ) : null}
    </>
  );
}
