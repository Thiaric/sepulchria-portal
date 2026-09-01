"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";
import { X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { InstantChatDock } from "@/components/instant-chat/instant-chat-dock";
import { AdminContextPanel } from "@/components/portal/admin-context-panel";
import { AdminCommunicationLogsContext } from "@/components/portal/admin-communication-logs-context";
import { AdminOrdersContext } from "@/components/portal/admin-orders-context";
import { OrderSubmissionsContext } from "@/components/admin/order-submissions-context";
import { AdminRulesContext } from "@/components/portal/admin-rules-context";
import { AdminEventsTidingsContext } from "@/components/portal/admin-events-tidings-context";
import { AdminRecordSearchContext } from "@/components/portal/admin-record-search-context";
import { AdminJobsContext } from "@/components/portal/admin-jobs-context";
import { AdminMarketContext } from "@/components/portal/admin-market-context";
import { AdminMissionsContext } from "@/components/portal/admin-missions-context";
import { MarketShopsContext } from "@/components/portal/market-shops-context";
import { MarketItemsContext } from "@/components/portal/market-items-context";
import { CharacterDetailContextPanel } from "@/components/portal/character-detail-context-panel";
import { PortalContextPanel } from "@/components/portal/portal-context-panel";
import { PollsContextPanel } from "@/components/polls/polls-context-panel";
import { RoomInfoButton } from "@/components/portal/room-info-button";
import { LocationAtmosphericImage } from "@/components/world/location-atmospheric-image";
import type { PortalContext } from "@/types/portal";

type PortalResponsiveRightSidebarProps = {
  context: PortalContext;
};

export function PortalResponsiveRightSidebar({
  context,
}: PortalResponsiveRightSidebarProps) {
  const [open, setOpen] =
    useState(false);

  const [mobileButtonTop, setMobileButtonTop] =
  useState<number | null>(null);

const mobileButtonRef =
  useRef<HTMLButtonElement>(null);

const dragStartY =
  useRef(0);

const dragStartTop =
  useRef(0);

const dragging =
  useRef(false);

const suppressClick =
  useRef(false);

  const MOBILE_CONTEXT_BUTTON_MIN_TOP = 70;

  const [adminRevision, setAdminRevision] =
    useState(0);

  const pathname =
    usePathname();

  const { character } =
    context;

  const privateRoomBlocked =
    (
      pathname === "/game" ||
      pathname.startsWith(
        "/game/",
      )
    ) &&
    character?.currentRoom
      ?.area?.slug ===
      "private-locations" &&
    !context.currentRoomAccessAllowed;

  const publicCharacterMatch =
    pathname.match(
      /^\/characters\/([^/]+)$/,
    );

  const publicCharacterSlug =
    publicCharacterMatch
      ? decodeURIComponent(
          publicCharacterMatch[1],
        )
      : null;

  const isOwnCharacterPath =
    pathname === "/character" ||
    pathname.startsWith(
      "/character/",
    );

  const isAdminOrdersPath =
    pathname === "/admin/orders";

  const isAdminOrderSubmissionsPath =
    pathname === "/admin/order-submissions";

  const isAdminRulesPath =
    pathname === "/admin/rules";

  const isAdminEventsPath =
    pathname === "/admin/events";

  const isAdminTidingsPath =
    pathname === "/admin/tidings";

  const isAdminItemsPath =
    pathname === "/admin/items";

  const isAdminJobsPath =
    pathname === "/admin/jobs";

  const isAdminMarketPath =
    pathname === "/admin/market";

  const isAdminMissionsPath =
    pathname === "/admin/missions";

  const isAdminLocationsPath =
    pathname === "/admin/rooms";

  const isAdminUsersPath =
    pathname === "/admin/users";

  const isAdminCommunicationLogsPath =
    pathname === "/admin/communication-logs";

  const marketShopMatch =
    pathname.match(/^\/market\/([^/]+)$/);

  const marketShopSlug =
    marketShopMatch
      ? decodeURIComponent(marketShopMatch[1])
      : null;

  const isMarketPath =
    pathname === "/market";

  const isPollsPath =
    pathname === "/polls";

  const isAdminPath =
    pathname === "/admin" ||
    pathname.startsWith(
      "/admin/",
    );

    useEffect(() => {
  const saved =
    window.localStorage.getItem(
      "sepulchria-mobile-context-button-top",
    );

  if (saved !== null) {
    const value =
      Number(saved);

    if (
      Number.isFinite(value)
    ) {
      const maxTop =
  Math.max(
    MOBILE_CONTEXT_BUTTON_MIN_TOP,
    window.innerHeight -
      44 -
      76,
  );

setMobileButtonTop(
  Math.max(
    MOBILE_CONTEXT_BUTTON_MIN_TOP,
    Math.min(
      value,
      maxTop,
    ),
  ),
);
    }
  }

  const handleResize = () => {
    setMobileButtonTop(
      (current) => {
        if (current === null) {
          return null;
        }

        const maxTop =
          Math.max(
            MOBILE_CONTEXT_BUTTON_MIN_TOP,
            window.innerHeight -
              44 -
              76,
          );

        return Math.max(
          8,
          Math.min(
            current,
            maxTop,
          ),
        );
      },
    );
  };

  window.addEventListener(
    "resize",
    handleResize,
  );

  return () => {
    window.removeEventListener(
      "resize",
      handleResize,
    );
  };
}, []);

  useEffect(() => {
    const handleAdminDataChanged = () => {
      setAdminRevision((value) => value + 1);
    };

    window.addEventListener(
      "sepulchria:admin-data-changed",
      handleAdminDataChanged,
    );

    return () => {
      window.removeEventListener(
        "sepulchria:admin-data-changed",
        handleAdminDataChanged,
      );
    };
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    const handleKeyDown = (
      event: KeyboardEvent,
    ) => {
      if (
        event.key ===
        "Escape"
      ) {
        setOpen(false);
      }
    };

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
  }, [open]);

  if (privateRoomBlocked) {
    return (
      <aside
        aria-label="Unavailable location"
        data-portal-column
        data-portal-right-sidebar
        className="hidden h-full min-h-0 border-l border-[rgb(var(--sep-colour-6e5535))]/40 bg-[rgb(var(--sep-colour-0d0b0a))] xl:block"
      />
    );
  }

  return (
    <>
      <button
  ref={mobileButtonRef}
  type="button"
  data-sep-interaction-ignore="true"
  aria-label="Open context panel"
  aria-expanded={open}
  onPointerDown={(event) => {
    if (
      event.pointerType ===
        "mouse" &&
      event.button !== 0
    ) {
      return;
    }

    const element =
      mobileButtonRef.current;

    if (!element) {
      return;
    }

    const rect =
      element.getBoundingClientRect();

    dragStartY.current =
      event.clientY;

    dragStartTop.current =
      rect.top;

    dragging.current =
      true;

    suppressClick.current =
      false;

    event.currentTarget
      .setPointerCapture(
        event.pointerId,
      );
  }}
  onPointerMove={(event) => {
    if (!dragging.current) {
      return;
    }

    const delta =
      event.clientY -
      dragStartY.current;

    if (
      Math.abs(delta) > 4
    ) {
      suppressClick.current =
        true;
    }

    const maxTop =
  Math.max(
    MOBILE_CONTEXT_BUTTON_MIN_TOP,
    window.innerHeight -
      44 -
      76,
  );

const nextTop =
  Math.max(
    MOBILE_CONTEXT_BUTTON_MIN_TOP,
    Math.min(
      dragStartTop.current +
        delta,
      maxTop,
    ),
  );

    setMobileButtonTop(
      nextTop,
    );
  }}
  onPointerUp={(event) => {
    if (!dragging.current) {
      return;
    }

    dragging.current =
      false;

    try {
      event.currentTarget
        .releasePointerCapture(
          event.pointerId,
        );
    } catch {}

    if (
      mobileButtonTop !== null
    ) {
      window.localStorage.setItem(
        "sepulchria-mobile-context-button-top",
        String(
          mobileButtonTop,
        ),
      );
    }
  }}
  onPointerCancel={() => {
    dragging.current =
      false;
  }}
  onClick={() => {
    if (
      suppressClick.current
    ) {
      suppressClick.current =
        false;
      return;
    }

    setOpen(true);
  }}
  style={{
    top:
      mobileButtonTop ??
      undefined,

    bottom:
      mobileButtonTop ===
      null
        ? "calc(4.75rem + env(safe-area-inset-bottom))"
        : undefined,

    touchAction: "none",
  }}
  className="fixed right-3 z-40 flex h-11 w-11 select-none items-center justify-center border border-[rgb(var(--sep-colour-765937))] bg-[rgb(var(--sep-colour-1d160f))] font-serif text-xl text-[rgb(var(--sep-colour-d8bf91))] shadow-[0_12px_35px_rgba(var(--sep-rgb-0-0-0),0.45)] [transform:none!important] transition-colors hover:border-[rgb(var(--sep-colour-a37b45))] hover:text-[rgb(var(--sep-colour-f0d39d))] xl:hidden"
>
  ◈
</button>

      {open ? (
        <button
          type="button"
          aria-label="Close context panel"
          onClick={() =>
            setOpen(false)
          }
          className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-[2px] xl:hidden"
        />
      ) : null}

      <aside
        aria-label="Context sidebar"
        data-portal-column
        data-portal-scroll
        data-portal-right-sidebar
        className={[
          "z-[70] flex min-h-0 min-w-0 flex-col border-l border-[rgb(var(--sep-colour-6e5535))]/40 bg-[rgb(var(--sep-colour-100d0b))]",
          "fixed inset-y-0 right-0 w-[min(88vw,360px)] overflow-hidden overscroll-contain shadow-[-18px_0_50px_rgba(var(--sep-rgb-0-0-0),0.55)] transition-transform duration-200 ease-out",
          open
            ? "translate-x-0"
            : "translate-x-full",
          "xl:relative xl:inset-auto xl:z-auto xl:h-full xl:w-auto xl:translate-x-0 xl:self-stretch xl:overflow-hidden xl:shadow-none xl:transition-none",
        ].join(" ")}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-[rgb(var(--sep-colour-6e5535))]/40 px-4 xl:hidden">
          <div>
            <p className="text-[8px] uppercase tracking-[0.28em] text-[rgb(var(--sep-colour-876a46))]">
              Context
            </p>

            <p className="mt-1 font-serif text-lg text-[rgb(var(--sep-colour-d6bd91))]">
              Sepulchria
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              setOpen(false)
            }
            aria-label="Close context panel"
            className="flex h-9 w-9 items-center justify-center border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-17120f))] text-[rgb(var(--sep-colour-bca47e))] transition hover:border-[rgb(var(--sep-colour-977242))] hover:text-[rgb(var(--sep-colour-efd6a3))]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col p-4 xl:p-[var(--portal-column-pad,1rem)]">
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain xl:gap-[var(--portal-column-gap,0.75rem)]">
            {!isAdminOrderSubmissionsPath ? (
            <div className="shrink-0">
              <p className="mb-0.5 px-1 text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-a88658))]">
  Current Location
</p>
<p className="mb-2 mt-0.5 break-words px-1 text-[10px] leading-snug text-[rgb(var(--sep-colour-d0c0a8))]">
  {(
    character
      ?.currentRoom
      ?.area
      ?.name ??
    "Your character has not entered the city yet."
  ).replace(/\s+of Sepulchria$/i, "")}
  {" – "}
  {character
    ?.currentRoom
    ?.name ??
    "No location"}
</p>



<section className="relative min-h-[108px] overflow-hidden border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))]">{character
                  ?.currentRoom
                  ?.image_url ? (
                  <LocationAtmosphericImage
                    src={
                      character.currentRoom.image_url
                    }
                    alt={
                      character.currentRoom.name
                    }
                    priority
                    sizes="300px"
                    objectFit="cover"
                    isOutdoors={
                      character.currentRoom.is_outdoors
                    }
                  />
                ) : null}

                <div className="pointer-events-none absolute inset-0 z-[6] bg-black/48" />

                <div className="pointer-events-none absolute inset-0 z-[6] bg-gradient-to-r from-black/78 via-black/52 to-black/28" />

                <div className="relative z-10 flex min-h-[108px] items-end p-4 xl:p-[var(--portal-section-pad,1rem)]">
                  <div className="flex w-full items-end justify-end gap-2">
                    

                    {character
                      ?.currentRoom ? (
                      <div className="flex shrink-0 items-end gap-1.5">
                        <RoomInfoButton
                          roomId={
                            character
                              .currentRoom
                              .id
                          }
                        />

                        <Link
                          href="/game"
                          aria-label="Enter current location"
                          title="Enter current location"
                          className="flex h-8 w-8 shrink-0 items-center justify-center border border-[rgb(var(--sep-colour-765937))]/70 bg-[rgb(var(--sep-colour-160f0a))]/80 text-[11px] text-[rgb(var(--sep-colour-d8bc8d))] backdrop-blur-sm transition hover:border-[rgb(var(--sep-colour-a07945))] hover:bg-[rgb(var(--sep-colour-332217))] hover:text-[rgb(var(--sep-colour-f0d4a2))]"
                        >
                          →
                        </Link>
                      </div>
                    ) : null}
                  </div>
                </div>
              </section>
            </div>
            ) : null}

            <section className="min-h-0 flex-1 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-4 xl:p-[var(--portal-section-pad,1rem)]">
              {isAdminOrderSubmissionsPath ? (
                <OrderSubmissionsContext
                  key={`order-submissions-${adminRevision}`}
                />
              ) : isAdminOrdersPath ? (
                <AdminRecordSearchContext
                  key={`orders-${adminRevision}`}
                  mode="orders"
                />
              ) : isAdminRulesPath ? (
                <AdminRulesContext key={`rules-${adminRevision}`} />
              ) : isAdminEventsPath ? (
                <AdminRecordSearchContext
                  key={`events-${adminRevision}`}
                  mode="events"
                />
              ) : isAdminTidingsPath ? (
                <AdminRecordSearchContext
                  key={`tidings-${adminRevision}`}
                  mode="tidings"
                />
              ) : isAdminItemsPath ? (
                <AdminRecordSearchContext
                  key={`items-${adminRevision}`}
                  mode="items"
                />
              ) : isAdminJobsPath ? (
                <AdminJobsContext
                  key={`jobs-${adminRevision}`}
                />
              ) : isAdminMarketPath ? (
                <AdminMarketContext
                  key={`market-${adminRevision}`}
                />
              ) : isAdminMissionsPath ? (
                <AdminMissionsContext
                  key={`missions-${adminRevision}`}
                />
              ) : isAdminLocationsPath ? (
                <AdminRecordSearchContext
                  key={`locations-${adminRevision}`}
                  mode="locations"
                />
              ) : isAdminUsersPath ? (
                <AdminRecordSearchContext
                  key={`users-${adminRevision}`}
                  mode="users"
                />
              ) : isAdminCommunicationLogsPath ? (
                <AdminCommunicationLogsContext
                  key={`communication-logs-${adminRevision}`}
                />
              ) : isMarketPath ? (
                <MarketShopsContext />
              ) : isPollsPath ? (
                <PollsContextPanel />
              ) : marketShopSlug ? (
                <MarketItemsContext shopSlug={marketShopSlug} />
              ) : isOwnCharacterPath ? (
                <CharacterDetailContextPanel
                  characterId={
                    character?.id ?? null
                  }
                  ownCharacter={
                    character ?? null
                  }
                />
              ) : publicCharacterSlug ? (
                <CharacterDetailContextPanel
                  publicSlug={
                    publicCharacterSlug
                  }
                />
              ) : isAdminPath ? (
                <AdminContextPanel
                  key={`${pathname}-${adminRevision}`}
                  pathname={
                    pathname
                  }
                />
              ) : (
                <PortalContextPanel
                  context={
                    context
                  }
                />
              )}
            </section>
          </div>

          {character?.status ===
            "approved" &&
          !isAdminOrderSubmissionsPath ? (
            <div className="relative mt-3 shrink-0">
              <InstantChatDock
                characterId={
                  character.id
                }
              />
            </div>
          ) : null}
        </div>
      </aside>
    </>
  );
}
