"use client";

import {
  useEffect,
  useState,
} from "react";
import { X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { InstantChatDock } from "@/components/instant-chat/instant-chat-dock";
import { AdminContextPanel } from "@/components/portal/admin-context-panel";
import { ForumSectionActivityContext } from "@/components/portal/forum-section-activity-context";
import { PortalContextPanel } from "@/components/portal/portal-context-panel";
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

  const pathname =
    usePathname();

  const { character } =
    context;

  const forumSectionMatch =
    pathname.match(
      /^\/forum\/([^/]+)$/,
    );

  const forumSectionSlug =
    forumSectionMatch
      ? decodeURIComponent(
          forumSectionMatch[1],
        )
      : null;

  const isAdminPath =
    pathname === "/admin" ||
    pathname.startsWith(
      "/admin/",
    );

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

  return (
    <>
      <button
        type="button"
        onClick={() =>
          setOpen(true)
        }
        aria-label="Open context panel"
        aria-expanded={open}
        className="fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center border border-[#765937] bg-[#1d160f] font-serif text-xl text-[#d8bf91] shadow-[0_12px_35px_rgba(0,0,0,0.45)] transition hover:border-[#a37b45] hover:text-[#f0d39d] xl:hidden"
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
        className={[
          "z-[70] flex min-h-0 min-w-0 flex-col border-l border-[#6e5535]/40 bg-[#100d0b]",
          "fixed inset-y-0 right-0 w-[min(88vw,360px)] overflow-hidden overscroll-contain shadow-[-18px_0_50px_rgba(0,0,0,0.55)] transition-transform duration-200 ease-out",
          open
            ? "translate-x-0"
            : "translate-x-full",
          "xl:relative xl:inset-auto xl:z-auto xl:h-full xl:w-auto xl:translate-x-0 xl:self-stretch xl:overflow-hidden xl:shadow-none xl:transition-none",
        ].join(" ")}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-[#6e5535]/40 px-4 xl:hidden">
          <div>
            <p className="text-[8px] uppercase tracking-[0.28em] text-[#876a46]">
              Context
            </p>

            <p className="mt-1 font-serif text-lg text-[#d6bd91]">
              Sepulchria
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              setOpen(false)
            }
            aria-label="Close context panel"
            className="flex h-9 w-9 items-center justify-center border border-[#60482e]/55 bg-[#17120f] text-[#bca47e] transition hover:border-[#977242] hover:text-[#efd6a3]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col p-4 xl:p-[var(--portal-column-pad,1rem)]">
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain xl:gap-[var(--portal-column-gap,0.75rem)]">
            <div className="shrink-0">
              <p className="mb-1.5 px-1 text-[8px] uppercase tracking-[0.24em] text-[#a88658]">
                Current location
              </p>

              <section className="relative min-h-[108px] overflow-hidden border border-[#60482e]/45 bg-[#15100d]">
                {character
                  ?.currentRoom
                  ?.image_url ? (
                  <LocationAtmosphericImage
                    src={
                      character
                        .currentRoom
                        .image_url
                    }
                    alt={
                      character
                        .currentRoom
                        .name
                    }
                    sizes="300px"
                    objectFit="cover"
                  />
                ) : null}

                <div className="pointer-events-none absolute inset-0 z-[6] bg-[#0b0806]/48" />

                <div className="pointer-events-none absolute inset-0 z-[6] bg-gradient-to-r from-[#100b08]/78 via-[#100b08]/52 to-[#100b08]/28" />

                <div className="relative z-10 flex min-h-[108px] items-end p-4 xl:p-[var(--portal-section-pad,1rem)]">
                  <div className="flex w-full min-w-0 items-end justify-between gap-2">
                    <div className="min-w-0">
                      <h2 className="break-words font-serif text-[16px] leading-tight text-[#ead2a6] [text-shadow:0_2px_3px_rgba(0,0,0,1),0_0_6px_rgba(0,0,0,0.95)]">
                        {character
                          ?.currentRoom
                          ?.name ??
                          "No location"}
                      </h2>

                      <p className="mt-1 break-words text-[10px] leading-snug text-[#d0c0a8] [text-shadow:0_1px_2px_rgba(0,0,0,1),0_0_4px_rgba(0,0,0,0.95)]">
                        {character
                          ?.currentRoom
                          ?.area
                          ?.name ??
                          "Your character has not entered the city yet."}
                      </p>
                    </div>

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
                          className="flex h-8 w-8 shrink-0 items-center justify-center border border-[#765937]/70 bg-[#160f0a]/80 text-[11px] text-[#d8bc8d] backdrop-blur-sm transition hover:border-[#a07945] hover:bg-[#332217] hover:text-[#f0d4a2]"
                        >
                          →
                        </Link>
                      </div>
                    ) : null}
                  </div>
                </div>
              </section>
            </div>

            <section className="min-h-0 flex-1 border border-[#60482e]/45 bg-[#15100d] p-4 xl:p-[var(--portal-section-pad,1rem)]">
              {isAdminPath ? (
                <AdminContextPanel
                  pathname={
                    pathname
                  }
                />
              ) : forumSectionSlug ? (
                <ForumSectionActivityContext
                  sectionSlug={
                    forumSectionSlug
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
          "approved" ? (
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
