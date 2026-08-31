import { Suspense, type ReactNode } from "react";

import "@/components/sepulchria/sep-ui-unified.css";

import { PortalAudioProvider } from "@/components/audio/portal-audio-provider";
import { PortalMessageSoundListener } from "@/components/audio/portal-message-sound-listener";
import { PortalCollapsibleColumns } from "@/components/portal/portal-collapsible-columns";
import { PortalHeader } from "@/components/portal/portal-header";
import { MobilePortalNavigation } from "@/components/portal/mobile-portal-navigation";
import { PortalInteractionLayer } from "@/components/portal/portal-interaction-layer";
import { PortalNotificationCountsProvider } from "@/components/notifications/portal-notification-counts-provider";
import { PortalPresenceHeartbeat } from "@/components/portal/portal-presence-heartbeat";
import { PortalSessionGuard } from "@/components/portal/portal-session-guard";
import { PrivateLocationInvitationPopup } from "@/components/private-location/private-location-invitation-popup";
import { OrderHeadquartersInvitationPopup } from "@/components/orders/order-headquarters-invitation-popup";
import { PortalResponsiveRightSidebar } from "@/components/portal/portal-responsive-right-sidebar";
import { PortalSidebar } from "@/components/portal/portal-sidebar";
import { PortalSkinProvider } from "@/components/portal/portal-skin-provider";
import { TidingsTicker } from "@/components/tidings/tidings-ticker";
import { WorldStateProvider } from "@/components/world/world-state-provider";
import { getStaffSession } from "@/lib/auth/require-staff";
import { getPortalContext } from "@/lib/portal/get-portal-context";
import { getActiveTidings } from "@/lib/tidings/get-active-tidings";
import { getUnreadForumCount } from "@/lib/forum/get-unread-forum-count";
import { getWorldState } from "@/lib/world/get-world-state";
import { ExperienceLogoutGuard } from "@/components/experience/experience-logout-guard";

type PortalLayoutProps = {
  children: ReactNode;
};

export default function PortalLayout({
  children,
}: PortalLayoutProps) {
  return (
    <Suspense fallback={<PortalLoadingShell />}>
      <PortalLayoutContent>
        {children}
      <ExperienceLogoutGuard />
      </PortalLayoutContent>
    </Suspense>
  );
}

async function PortalLayoutContent({
  children,
}: PortalLayoutProps) {
  const [
    context,
    worldState,
    initialTidings,
    unreadForumCount,
    staffSession,
  ] = await Promise.all([
    getPortalContext(),
    getWorldState(),
    getActiveTidings(),
    getUnreadForumCount(),
    getStaffSession(),
  ]);

  const presenceEnabled =
    context.character?.status ===
    "approved";

  return (
    <WorldStateProvider
      initialState={worldState}
    >
      <PortalSkinProvider>
        <PortalAudioProvider>
        <PortalNotificationCountsProvider
          staffRole={staffSession?.role ?? null}
        >
        <PortalMessageSoundListener
          characterId={
            context.character?.id ??
            null
          }
          currentRoomId={
            context.character
              ?.current_room_id ??
            null
          }
        />

        <PrivateLocationInvitationPopup
          characterId={
            context.character?.id ??
            null
          }
        />

        <OrderHeadquartersInvitationPopup
          characterId={
            context.character?.id ??
            null
          }
        />


        <div
          data-portal-shell
          className="h-dvh overflow-hidden bg-[rgb(var(--sep-colour-120f0d))] text-[rgb(var(--sep-colour-e8dcc4))]"
        >
          <div
            data-portal-shell-inner
            className="flex h-full min-h-0 flex-col bg-[radial-gradient(circle_at_top,_rgba(var(--sep-rgb-116-82-42),0.16),_transparent_38%),linear-gradient(to_bottom,_#17120f,_#0d0b0a)]"
          >
            <PortalPresenceHeartbeat
              enabled={
                presenceEnabled
              }
            />

            <PortalSessionGuard />

            <PortalInteractionLayer />

            <div className="shrink-0">
              <PortalHeader
                context={context}
              />
            </div>

            <style>{`
              .sepulchria-viewport-body {
                --portal-left-width: 230px;
                --portal-right-width: 300px;
                --portal-column-pad: 0.8rem;
                --portal-column-gap: 0.65rem;
                --portal-section-pad: 0.8rem;
                --portal-nav-y: 0.26rem;
                --portal-nav-min-h: 1.85rem;
                --portal-group-gap: 0.62rem;
                max-width: 1800px;
              }

              .portal-left-shell,
              .portal-right-shell {
                display: contents;
              }

              .portal-left-collapse-toggle,
              .portal-right-collapse-toggle {
                display: none;
              }

              @media (max-width: 1023px) {
                .sepulchria-viewport-body {
                  display: block;
                  width: 100%;
                  max-width: none;
                  overflow: hidden;
                  padding-bottom:
                    calc(64px + env(safe-area-inset-bottom));
                }

                .portal-left-shell {
                  display: none !important;
                }

                .sepulchria-viewport-body
                  > [data-portal-centre-host] {
                  height: 100%;
                  min-height: 0;
                  overflow: hidden;
                }

                .sepulchria-viewport-body
                  > [data-portal-centre-host]
                  > [data-portal-column] {
                  height: 100%;
                  min-height: 0;
                  overflow-y: auto;
                  overscroll-behavior: contain;
                }

                [data-portal-shell] {
                  padding-top: env(safe-area-inset-top);
                }
              }

              @media (min-width: 1024px) {
                .sepulchria-viewport-body {
                  grid-template-columns:
                    clamp(180px, 14vw, var(--portal-left-width))
                    minmax(0, 1fr);
                  overflow: hidden;
                }

                .sepulchria-viewport-body[data-left-collapsed="true"] {
                  grid-template-columns:
                    0
                    minmax(0, 1fr);
                }

                .portal-left-shell {
                  display: block;
                  height: 100%;
                  overflow: visible;
                }

                .sepulchria-viewport-body[data-left-collapsed="true"]
                  .portal-left-shell > aside {
                  visibility: hidden;
                  pointer-events: none;
                }

                .portal-left-collapse-toggle {
                  position: absolute;
                  top: 50%;
                  right: -11px;
                  z-index: 45;
                  display: flex;
                  width: 22px;
                  height: 52px;
                  transform: translateY(-50%);
                  align-items: center;
                  justify-content: center;
                  border: 1px solid rgba(var(--sep-rgb-110-85-53),0.62);
                  background: rgba(var(--sep-rgb-16-13-11),0.96);
                  color: rgb(var(--sep-colour-a98d65));
                  font-family: Georgia, serif;
                  font-size: 18px;
                  line-height: 1;
                  box-shadow: 4px 0 14px rgba(var(--sep-rgb-0-0-0),0.28);
                  transition:
                    color 150ms ease,
                    border-color 150ms ease,
                    background 150ms ease;
                }

                .portal-left-collapse-toggle:hover {
                  border-color: rgb(var(--sep-colour-9a7445));
                  background: rgb(var(--sep-colour-1d160f));
                  color: rgb(var(--sep-colour-efd39f));
                }

                .sepulchria-viewport-body
                  > [data-portal-centre-host],
                .sepulchria-viewport-body
                  > .portal-left-shell,
                .sepulchria-viewport-body
                  > .portal-right-shell {
                  min-width: 0;
                  min-height: 0;
                  height: 100%;
                }

                .sepulchria-viewport-body
                  > [data-portal-centre-host]
                  > [data-portal-column],
                .sepulchria-viewport-body
                  > .portal-left-shell
                  > [data-portal-column] {
                  min-width: 0;
                  min-height: 0;
                  height: 100%;
                }

                .sepulchria-viewport-body:is(
                    [data-left-collapsed="true"],
                    [data-right-collapsed="true"]
                  )
                  > [data-portal-centre-host]
                  > [data-portal-column]
                  > :is(main, section, article, div)
                  > .mx-auto:is(
                    .max-w-7xl,
                    .max-w-6xl,
                    .max-w-5xl,
                    .max-w-4xl
                  ),
                .sepulchria-viewport-body:is(
                    [data-left-collapsed="true"],
                    [data-right-collapsed="true"]
                  )
                  > [data-portal-centre-host]
                  > [data-portal-column]
                  > .mx-auto:is(
                    .max-w-7xl,
                    .max-w-6xl,
                    .max-w-5xl,
                    .max-w-4xl
                  ) {
                  max-width: none !important;
                  width: 100%;
                }
              }

              @media (min-width: 1280px) {
                .sepulchria-viewport-body {
                  grid-template-columns:
                    clamp(180px, 13vw, var(--portal-left-width))
                    minmax(0, 1fr)
                    clamp(240px, 18vw, var(--portal-right-width));
                }

                .sepulchria-viewport-body[data-left-collapsed="true"] {
                  grid-template-columns:
                    0
                    minmax(0, 1fr)
                    clamp(240px, 18vw, var(--portal-right-width));
                }

                .sepulchria-viewport-body[data-right-collapsed="true"] {
                  grid-template-columns:
                    clamp(180px, 13vw, var(--portal-left-width))
                    minmax(0, 1fr)
                    0;
                }

                .sepulchria-viewport-body[data-left-collapsed="true"][data-right-collapsed="true"] {
                  grid-template-columns:
                    0
                    minmax(0, 1fr)
                    0;
                  max-width: none;
                }

                .portal-right-shell {
                  display: block;
                  height: 100%;
                  overflow: visible;
                }

                .sepulchria-viewport-body[data-right-collapsed="true"]
                  .portal-right-shell > aside {
                  visibility: hidden;
                  pointer-events: none;
                }

                .portal-right-collapse-toggle {
                  position: absolute;
                  top: 50%;
                  left: -11px;
                  z-index: 45;
                  display: flex;
                  width: 22px;
                  height: 52px;
                  transform: translateY(-50%);
                  align-items: center;
                  justify-content: center;
                  border: 1px solid rgba(var(--sep-rgb-110-85-53),0.62);
                  background: rgba(var(--sep-rgb-16-13-11),0.96);
                  color: rgb(var(--sep-colour-a98d65));
                  font-family: Georgia, serif;
                  font-size: 18px;
                  line-height: 1;
                  box-shadow: -4px 0 14px rgba(var(--sep-rgb-0-0-0),0.28);
                  transition:
                    color 150ms ease,
                    border-color 150ms ease,
                    background 150ms ease;
                }

                .portal-right-collapse-toggle:hover {
                  border-color: rgb(var(--sep-colour-9a7445));
                  background: rgb(var(--sep-colour-1d160f));
                  color: rgb(var(--sep-colour-efd39f));
                }

                .sepulchria-viewport-body
                  > .portal-right-shell
                  > [data-portal-column] {
                  min-width: 0;
                  min-height: 0;
                  height: 100%;
                }
              }

              @media (min-width: 1024px) and (max-height: 820px) {
                .sepulchria-viewport-body {
                  --portal-column-pad: 0.65rem;
                  --portal-column-gap: 0.52rem;
                  --portal-section-pad: 0.65rem;
                  --portal-nav-y: 0.22rem;
                  --portal-nav-min-h: 1.72rem;
                  --portal-group-gap: 0.5rem;
                }
              }

              @media (min-width: 1024px) and (max-height: 720px) {
                .sepulchria-viewport-body {
                  --portal-left-width: 210px;
                  --portal-right-width: 275px;
                  --portal-column-pad: 0.52rem;
                  --portal-column-gap: 0.44rem;
                  --portal-section-pad: 0.52rem;
                  --portal-nav-y: 0.18rem;
                  --portal-nav-min-h: 1.6rem;
                  --portal-group-gap: 0.42rem;
                }
              }

              @media (min-width: 1024px) and (max-height: 640px) {
                .sepulchria-viewport-body {
                  --portal-left-width: 195px;
                  --portal-right-width: 255px;
                  --portal-column-pad: 0.4rem;
                  --portal-column-gap: 0.36rem;
                  --portal-section-pad: 0.45rem;
                  --portal-nav-y: 0.14rem;
                  --portal-nav-min-h: 1.5rem;
                  --portal-group-gap: 0.34rem;
                }
              }

              /*
               * Keep selected text clearly visible inside all rich-text
               * contenteditable fields. This is especially important for
               * pale/high-key skins such as Humans' Mark.
               */
              .portal-skin-scope [contenteditable="true"]::selection,
              .portal-skin-scope [contenteditable="true"] *::selection {
                background: rgba(55, 102, 224, 0.86);
                color: #ffffff;
              }

              .portal-skin-scope [contenteditable="true"]::-moz-selection,
              .portal-skin-scope [contenteditable="true"] *::-moz-selection {
                background: rgba(55, 102, 224, 0.86);
                color: #ffffff;
              }

              .sepulchria-viewport-body [data-portal-scroll] {
                scrollbar-width: thin;
                scrollbar-color: rgb(var(--sep-colour-5c472f)) transparent;
              }

              .sepulchria-viewport-body [data-portal-scroll]::-webkit-scrollbar {
                width: 7px;
              }

              .sepulchria-viewport-body [data-portal-scroll]::-webkit-scrollbar-track {
                background: transparent;
              }

              .sepulchria-viewport-body [data-portal-scroll]::-webkit-scrollbar-thumb {
                background: rgb(var(--sep-colour-5c472f));
                border-radius: 999px;
              }
            `}</style>

            <PortalCollapsibleColumns
              left={
                <PortalSidebar
                  unreadMessageCount={
                    context.unreadMessageCount
                  }
                  unreadForumCount={
                    unreadForumCount
                  }
                  isStaff={
                    context.isStaff
                  }
                />
              }
              centre={
                <main
                  data-portal-column
                  data-portal-scroll
                  className="min-h-0 min-w-0 overflow-visible lg:overflow-y-auto lg:overscroll-contain"
                >
                  {children}
                </main>
              }
              right={
                <PortalResponsiveRightSidebar
                  context={context}
                />
              }
            />

            <TidingsTicker
              initialTidings={
                initialTidings
              }
            />

            <MobilePortalNavigation
              unreadMessageCount={
                context.unreadMessageCount
              }
              isStaff={
                context.isStaff
              }
            />
          </div>
        </div>
        </PortalNotificationCountsProvider>
        </PortalAudioProvider>
      </PortalSkinProvider>
    </WorldStateProvider>
  );
}

function PortalLoadingShell() {
  return (
    <div
      data-portal-shell
      className="h-dvh overflow-hidden bg-[rgb(var(--sep-colour-120f0d))] text-[rgb(var(--sep-colour-e8dcc4))]"
    >
      <div
        data-portal-shell-inner
        className="flex h-full min-h-0 flex-col bg-[radial-gradient(circle_at_top,_rgba(var(--sep-rgb-116-82-42),0.16),_transparent_38%),linear-gradient(to_bottom,_#17120f,_#0d0b0a)]"
      >
        <header className="h-[clamp(56px,8dvh,80px)] shrink-0 animate-pulse border-b border-[rgb(var(--sep-colour-6e5535))]/40 bg-[rgb(var(--sep-colour-0d0b0a))]" />

        <div className="mx-auto grid min-h-0 w-full max-w-[1800px] flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-[clamp(180px,14vw,230px)_minmax(0,1fr)] lg:overflow-hidden xl:grid-cols-[clamp(180px,13vw,230px)_minmax(0,1fr)_clamp(240px,18vw,300px)]">
          <aside className="hidden min-h-0 animate-pulse overflow-hidden border-r border-[rgb(var(--sep-colour-6e5535))]/30 bg-[rgb(var(--sep-colour-100d0b))] lg:block" />

          <main className="min-h-0 overflow-hidden p-5 sm:p-7 lg:p-9">
            <div className="h-4 w-52 animate-pulse bg-[rgb(var(--sep-colour-2c2118))]" />
            <div className="mt-5 h-12 max-w-xl animate-pulse bg-[rgb(var(--sep-colour-2c2118))]" />
            <div className="mt-5 h-5 max-w-2xl animate-pulse bg-[rgb(var(--sep-colour-211914))]" />

            <div className="mt-10 grid gap-5 md:grid-cols-2">
              <div className="h-64 animate-pulse border border-[rgb(var(--sep-colour-60482e))]/30 bg-[rgb(var(--sep-colour-17120f))]" />
              <div className="h-64 animate-pulse border border-[rgb(var(--sep-colour-60482e))]/30 bg-[rgb(var(--sep-colour-17120f))]" />
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-3">
              <div className="h-44 animate-pulse border border-[rgb(var(--sep-colour-60482e))]/30 bg-[rgb(var(--sep-colour-17120f))]" />
              <div className="h-44 animate-pulse border border-[rgb(var(--sep-colour-60482e))]/30 bg-[rgb(var(--sep-colour-17120f))]" />
              <div className="h-44 animate-pulse border border-[rgb(var(--sep-colour-60482e))]/30 bg-[rgb(var(--sep-colour-17120f))]" />
            </div>
          </main>

          <aside className="hidden min-h-0 animate-pulse overflow-hidden border-l border-[rgb(var(--sep-colour-6e5535))]/30 bg-[rgb(var(--sep-colour-100d0b))] xl:block" />
        </div>
      </div>
    </div>
  );
}