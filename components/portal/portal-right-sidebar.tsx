import Link from "next/link";

import { PortalContextPanel } from "@/components/portal/portal-context-panel";
import type { PortalContext } from "@/types/portal";

type PortalRightSidebarProps = {
  context: PortalContext;
};

export function PortalRightSidebar({
  context,
}: PortalRightSidebarProps) {
  const { character } = context;

  return (
    <aside className="hidden border-l border-[#6e5535]/30 bg-[#100d0b]/75 xl:sticky xl:top-20 xl:block xl:h-[calc(100vh-5rem)] xl:overflow-hidden">
      <div className="flex h-full min-h-0 flex-col gap-3 p-4">
        <section className="shrink-0 border border-[#60482e]/45 bg-[#15100d] p-4">
          <p className="text-[8px] uppercase tracking-[0.28em] text-[#876a46]">
            Current location
          </p>

          <div className="mt-2 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate font-serif text-xl text-[#d6bd91]">
                {character?.currentRoom?.name ?? "No location"}
              </h2>

              <p className="mt-1 truncate text-[11px] text-[#8f8271]">
                {character?.currentRoom?.area?.name ??
                  "Your character has not entered the city yet."}
              </p>
            </div>

            {character?.currentRoom ? (
              <Link
                href="/game"
                aria-label="Enter current location"
                title="Enter current location"
                className="shrink-0 border border-[#60482e]/55 bg-[#1d160f] px-2.5 py-2 text-xs text-[#c59a5a] transition hover:border-[#977242] hover:text-[#ebcc91]"
              >
                →
              </Link>
            ) : null}
          </div>
        </section>

        <section className="min-h-0 flex-1 overflow-hidden border border-[#60482e]/45 bg-[#15100d] p-4">
          <PortalContextPanel context={context} />
        </section>
      </div>
    </aside>
  );
}