import Link from "next/link";

import { PortalContextPanel } from "@/components/portal/portal-context-panel";
import { RoomInfoButton } from "@/components/portal/room-info-button";
import type { PortalContext } from "@/types/portal";

type PortalRightSidebarProps = {
  context: PortalContext;
};

export function PortalRightSidebar({
  context,
}: PortalRightSidebarProps) {
  const { character } = context;

  return (
    <aside
      aria-label="Context sidebar"
      data-portal-column
      data-portal-scroll
      className="hidden min-h-0 min-w-0 overflow-y-auto overscroll-contain border-l border-[rgb(var(--sep-colour-6e5535))]/30 bg-[rgb(var(--sep-colour-100d0b))]/75 xl:flex xl:h-full xl:flex-col"
    >
      <div className="flex min-h-0 flex-1 flex-col gap-[var(--portal-column-gap)] p-[var(--portal-column-pad)]">
        <section className="shrink-0 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-[var(--portal-section-pad)]">
          <div className="flex items-center justify-between gap-2">
            
            <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-876a46))]">
              Current location
            </p>

            {character?.currentRoom ? (
              <div className="flex shrink-0 items-center gap-1.5">
                <RoomInfoButton
                  roomId={
                    character.currentRoom.id
                  }
                />

                <Link
                  href="/game"
                  aria-label="Enter current location"
                  title="Enter current location"
                  className="flex h-8 w-8 items-center justify-center border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-1d160f))] text-[11px] text-[rgb(var(--sep-colour-c59a5a))] transition hover:border-[rgb(var(--sep-colour-977242))] hover:text-[rgb(var(--sep-colour-ebcc91))]"
                >
                  →
                </Link>
              </div>
            ) : null}
          </div>

          <h2 className="mt-2 break-words font-serif text-[16px] leading-tight text-[rgb(var(--sep-colour-d6bd91))]">
            {character?.currentRoom?.name ??
              "No location"}
          </h2>

          <p className="mt-1 break-words text-[10px] leading-snug text-[rgb(var(--sep-colour-8f8271))]">
            {character?.currentRoom?.area?.name ??
              "Your character has not entered the city yet."}
          </p>
        </section>

        <section className="min-h-0 flex-1 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-[var(--portal-section-pad)]">
          <PortalContextPanel
            context={context}
          />
        </section>
      </div>
    </aside>
  );
}