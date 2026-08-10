import { Suspense, type ReactNode } from "react";

import { PortalAudioProvider } from "@/components/audio/portal-audio-provider";
import { PortalMessageSoundListener } from "@/components/audio/portal-message-sound-listener";

import { PortalHeader } from "@/components/portal/portal-header";
import { PortalPresenceHeartbeat } from "@/components/portal/portal-presence-heartbeat";
import { PortalResponsiveRightSidebar } from "@/components/portal/portal-responsive-right-sidebar";
import { PortalSidebar } from "@/components/portal/portal-sidebar";
import { TidingsTicker } from "@/components/tidings/tidings-ticker";
import { getPortalContext } from "@/lib/portal/get-portal-context";
import { createClient } from "@/lib/supabase/server";
import { getActiveTidings } from "@/lib/tidings/get-active-tidings";
import { getWorldState } from "@/lib/world/get-world-state";
import { WorldStateProvider } from "@/components/world/world-state-provider";

type PortalLayoutProps = {
  children: ReactNode;
};

export default function PortalLayout({
  children,
}: PortalLayoutProps) {
  return (
    <Suspense fallback={<PortalLoadingShell />}>
      <PortalLayoutContent>{children}</PortalLayoutContent>
    </Suspense>
  );
}

async function PortalLayoutContent({
  children,
}: PortalLayoutProps) {
  const [context, worldState, initialTidings] =
    await Promise.all([
      getPortalContext(),
      getWorldState(),
      getActiveTidings(),
    ]);

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let unreadForumCount = 0;

  if (user) {
    const {
      data: unreadForumResult,
      error: unreadForumError,
    } = await supabase.rpc(
      "get_unread_forum_topic_count",
    );

    if (!unreadForumError) {
      if (
        typeof unreadForumResult === "number" &&
        Number.isFinite(unreadForumResult)
      ) {
        unreadForumCount = unreadForumResult;
      } else if (
        typeof unreadForumResult === "string"
      ) {
        const parsedCount =
          Number.parseInt(unreadForumResult, 10);

        if (Number.isFinite(parsedCount)) {
          unreadForumCount = parsedCount;
        }
      }
    }
  }

  const presenceEnabled =
    context.character?.status === "approved";

  return (
    <WorldStateProvider initialState={worldState}>
      <PortalAudioProvider>
        <PortalMessageSoundListener
          characterId={context.character?.id ?? null}
          currentRoomId={context.character?.current_room_id ?? null}
        />

        <div className="h-dvh overflow-hidden bg-[#120f0d] text-[#e8dcc4]">
        <div className="flex h-full min-h-0 flex-col bg-[radial-gradient(circle_at_top,_rgba(116,82,42,0.16),_transparent_38%),linear-gradient(to_bottom,_#17120f,_#0d0b0a)]">
          <PortalPresenceHeartbeat
            enabled={presenceEnabled}
          />

          <div className="shrink-0">
            <PortalHeader context={context} />
          </div>

          <style>{`
            .sepulchria-viewport-body {
              --portal-left-width: 230px;
              --portal-right-width: 300px;
              --portal-column-pad: 1rem;
              --portal-column-gap: 0.75rem;
              --portal-section-pad: 1rem;
              --portal-nav-y: 0.5rem;
              --portal-nav-min-h: 2.25rem;
              --portal-group-gap: 1rem;
            }

            @media (min-width: 1024px) {
              .sepulchria-viewport-body {
                grid-template-columns:
                  clamp(180px, 14vw, var(--portal-left-width))
                  minmax(0, 1fr);
                overflow: hidden;
              }

              .sepulchria-viewport-body > [data-portal-column] {
                min-width: 0;
                min-height: 0;
                height: 100%;
              }
            }

            @media (min-width: 1280px) {
              .sepulchria-viewport-body {
                grid-template-columns:
                  clamp(180px, 13vw, var(--portal-left-width))
                  minmax(0, 1fr)
                  clamp(240px, 18vw, var(--portal-right-width));
              }
            }

            @media (min-width: 1024px) and (max-height: 820px) {
              .sepulchria-viewport-body {
                --portal-column-pad: 0.75rem;
                --portal-column-gap: 0.6rem;
                --portal-section-pad: 0.75rem;
                --portal-nav-y: 0.38rem;
                --portal-nav-min-h: 2rem;
                --portal-group-gap: 0.75rem;
              }
            }

            @media (min-width: 1024px) and (max-height: 720px) {
              .sepulchria-viewport-body {
                --portal-left-width: 210px;
                --portal-right-width: 275px;
                --portal-column-pad: 0.6rem;
                --portal-column-gap: 0.5rem;
                --portal-section-pad: 0.6rem;
                --portal-nav-y: 0.28rem;
                --portal-nav-min-h: 1.8rem;
                --portal-group-gap: 0.55rem;
              }
            }

            @media (min-width: 1024px) and (max-height: 640px) {
              .sepulchria-viewport-body {
                --portal-left-width: 195px;
                --portal-right-width: 255px;
                --portal-column-pad: 0.45rem;
                --portal-column-gap: 0.4rem;
                --portal-section-pad: 0.5rem;
                --portal-nav-y: 0.2rem;
                --portal-nav-min-h: 1.65rem;
                --portal-group-gap: 0.4rem;
              }
            }

            .sepulchria-viewport-body [data-portal-scroll] {
              scrollbar-width: thin;
              scrollbar-color: #5c472f transparent;
            }

            .sepulchria-viewport-body [data-portal-scroll]::-webkit-scrollbar {
              width: 7px;
            }

            .sepulchria-viewport-body [data-portal-scroll]::-webkit-scrollbar-track {
              background: transparent;
            }

            .sepulchria-viewport-body [data-portal-scroll]::-webkit-scrollbar-thumb {
              background: #5c472f;
              border-radius: 999px;
            }
          `}</style>

          <div className="sepulchria-viewport-body mx-auto grid min-h-0 w-full max-w-[1800px] flex-1 grid-cols-1 overflow-y-auto lg:overflow-hidden">
            <PortalSidebar
              unreadMessageCount={
                context.unreadMessageCount
              }
              unreadForumCount={
                unreadForumCount
              }
            />

            <main
              data-portal-column
              data-portal-scroll
              className="min-h-0 min-w-0 overflow-y-auto overscroll-contain"
            >
              {children}
            </main>

            <PortalResponsiveRightSidebar
              context={context}
            />
          </div>

          <TidingsTicker
            initialTidings={initialTidings}
          />
        </div>
      </div>
      </PortalAudioProvider>
    </WorldStateProvider>
  );
}

function PortalLoadingShell() {
  return (
    <div className="h-dvh overflow-hidden bg-[#120f0d] text-[#e8dcc4]">
      <div className="flex h-full min-h-0 flex-col bg-[radial-gradient(circle_at_top,_rgba(116,82,42,0.16),_transparent_38%),linear-gradient(to_bottom,_#17120f,_#0d0b0a)]">
        <header className="h-[clamp(56px,8dvh,80px)] shrink-0 animate-pulse border-b border-[#6e5535]/40 bg-[#0d0b0a]" />

        <div className="mx-auto grid min-h-0 w-full max-w-[1800px] flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-[clamp(180px,14vw,230px)_minmax(0,1fr)] lg:overflow-hidden xl:grid-cols-[clamp(180px,13vw,230px)_minmax(0,1fr)_clamp(240px,18vw,300px)]">
          <aside className="hidden min-h-0 animate-pulse overflow-hidden border-r border-[#6e5535]/30 bg-[#100d0b] lg:block" />

          <main className="min-h-0 overflow-hidden p-5 sm:p-7 lg:p-9">
            <div className="h-4 w-52 animate-pulse bg-[#2c2118]" />
            <div className="mt-5 h-12 max-w-xl animate-pulse bg-[#2c2118]" />
            <div className="mt-5 h-5 max-w-2xl animate-pulse bg-[#211914]" />

            <div className="mt-10 grid gap-5 md:grid-cols-2">
              <div className="h-64 animate-pulse border border-[#60482e]/30 bg-[#17120f]" />
              <div className="h-64 animate-pulse border border-[#60482e]/30 bg-[#17120f]" />
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-3">
              <div className="h-44 animate-pulse border border-[#60482e]/30 bg-[#17120f]" />
              <div className="h-44 animate-pulse border border-[#60482e]/30 bg-[#17120f]" />
              <div className="h-44 animate-pulse border border-[#60482e]/30 bg-[#17120f]" />
            </div>
          </main>

          <aside className="hidden min-h-0 animate-pulse overflow-hidden border-l border-[#6e5535]/30 bg-[#100d0b] xl:block" />
        </div>
      </div>
    </div>
  );
}
