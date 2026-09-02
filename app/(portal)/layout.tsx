import { Suspense, type ReactNode, type CSSProperties } from "react";

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
import { CosmeticRuntime } from "@/components/cosmetics/cosmetic-runtime";
import { getEquippedCosmetics } from "@/lib/cosmetics/get-equipped-cosmetic";
import { cssImageUrl } from "@/components/cosmetics/cosmetic-frame-overlay";

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

  const portalCosmetics =
    context.character
      ? await getEquippedCosmetics(
          context.character.id,
          [
            "header_control_frame",
            "left_panel_frame",
            "right_panel_frame",
            "centre_panel_frame",
            "location_frame",
            "location_atmosphere",
          ],
        )
      : {};

  const portalCosmeticStyle = {
    "--sep-cosmetic-header-control-frame":
      cssImageUrl(portalCosmetics.header_control_frame?.assetUrl),
    "--sep-cosmetic-left-panel-frame":
      cssImageUrl(portalCosmetics.left_panel_frame?.assetUrl),
    "--sep-cosmetic-right-panel-frame":
      cssImageUrl(portalCosmetics.right_panel_frame?.assetUrl),
    "--sep-cosmetic-centre-panel-frame":
      cssImageUrl(portalCosmetics.centre_panel_frame?.assetUrl),
    "--sep-cosmetic-location-frame":
      cssImageUrl(portalCosmetics.location_frame?.assetUrl),
    "--sep-cosmetic-location-atmosphere":
      cssImageUrl(portalCosmetics.location_atmosphere?.assetUrl),
  } as CSSProperties;

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
            data-has-cosmetic-header-controls={
              portalCosmetics.header_control_frame ? "true" : "false"
            }
            data-has-cosmetic-left-panel={
              portalCosmetics.left_panel_frame ? "true" : "false"
            }
            data-has-cosmetic-right-panel={
              portalCosmetics.right_panel_frame ? "true" : "false"
            }
            data-has-cosmetic-centre-panel={
              portalCosmetics.centre_panel_frame ? "true" : "false"
            }
            data-has-cosmetic-location-frame={
              portalCosmetics.location_frame ? "true" : "false"
            }
            data-has-cosmetic-location-atmosphere={
              portalCosmetics.location_atmosphere ? "true" : "false"
            }
            style={portalCosmeticStyle}
            className="flex h-full min-h-0 flex-col bg-[radial-gradient(circle_at_top,_rgba(var(--sep-rgb-116-82-42),0.16),_transparent_38%),linear-gradient(to_bottom,_#17120f,_#0d0b0a)]"
          >
            <PortalPresenceHeartbeat
              enabled={
                presenceEnabled
              }
            />

            <PortalSessionGuard />

            <PortalInteractionLayer />
            <CosmeticRuntime />

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

              /*
               * Location cosmetics work at every viewport size.
               */
              [data-portal-shell-inner][data-has-cosmetic-location-frame="true"]
                [data-game-location-surface] {
                position: relative;
                isolation: isolate;
              }

              [data-portal-shell-inner][data-has-cosmetic-location-frame="true"]
                [data-game-location-surface]::after {
                content: "";
                position: absolute;
                z-index: 40;
                inset: 0;
                border: 15px solid transparent;
                border-image-source: var(--sep-cosmetic-location-frame);
                border-image-slice: 11% 7%;
                border-image-width: 1;
                border-image-repeat: stretch;
                pointer-events: none;
                filter: drop-shadow(0 3px 8px rgba(0,0,0,.38));
              }

              [data-portal-shell-inner][data-has-cosmetic-location-atmosphere="true"]
                [data-game-location-surface] {
                background-image:
                  linear-gradient(
                    rgba(4,7,13,.58),
                    rgba(4,7,13,.66)
                  ),
                  var(--sep-cosmetic-location-atmosphere);
                background-size: cover;
                background-position: center;
                background-repeat: no-repeat;
              }

              .portal-left-collapse-toggle,
              .portal-right-collapse-toggle {
                display: none;
              }

              /*
               * MOBILE
               * Centre cosmetic frames the mobile viewport.
               * Left cosmetic frames the More drawer.
               * Right cosmetic frames the mobile context drawer.
               */
              @media (max-width: 1023px) {
                [data-portal-shell-inner][data-has-cosmetic-centre-panel="true"]
                  [data-portal-centre-host] {
                  position: relative;
                  box-sizing: border-box;
                  padding-top: 14px;
                  padding-bottom: 14px;
                  padding-right: 10px;
                  padding-left: 10px;
                  overflow: hidden;
                }

                [data-portal-shell-inner][data-has-cosmetic-centre-panel="true"]
                  [data-portal-centre-host]::after {
                  content: "";
                  position: absolute;
                  z-index: 35;
                  inset: 1px;
                  border: 24px solid transparent;
                  border-image-source: var(--sep-cosmetic-centre-panel-frame);
                  border-image-slice: 9% 7%;
                  border-image-width: 1;
                  border-image-repeat: stretch;
                  pointer-events: none;
                  filter: drop-shadow(0 3px 8px rgba(0,0,0,.35));
                }

                /*
                 * Do NOT set position on these surfaces here.
                 * Their components already use position: fixed on mobile.
                 */
                [data-portal-shell-inner][data-has-cosmetic-left-panel="true"]
                  [data-mobile-left-cosmetic-surface]::after {
                  content: "";
                  position: absolute;
                  inset: 0;
                  z-index: 100;
                  border: 24px solid transparent;
                  border-image-source: var(--sep-cosmetic-left-panel-frame);
                  border-image-slice: 10% 13%;
                  border-image-width: 1;
                  border-image-repeat: stretch;
                  pointer-events: none;
                  filter: drop-shadow(0 3px 8px rgba(0,0,0,.35));
                }

                [data-portal-shell-inner][data-has-cosmetic-right-panel="true"]
                  [data-mobile-right-cosmetic-surface]::after {
                  content: "";
                  position: absolute;
                  inset: 0;
                  z-index: 100;
                  border: 24px solid transparent;
                  border-image-source: var(--sep-cosmetic-right-panel-frame);
                  border-image-slice: 10% 13%;
                  border-image-width: 1;
                  border-image-repeat: stretch;
                  pointer-events: none;
                  filter: drop-shadow(0 3px 8px rgba(0,0,0,.35));
                }

                .sepulchria-viewport-body {
                  display: block;
                  width: 100%;
                  max-width: none;
                  overflow: hidden;
                  padding-bottom: 0;
                }

                .portal-left-shell {
                  display: contents !important;
                }

                .portal-left-shell > aside {
                  display: none !important;
                }

                .sepulchria-viewport-body
                  > [data-portal-centre-host] {
                  height:
                    calc(
                      100% - 64px - env(safe-area-inset-bottom)
                    );
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

              /*
               * DESKTOP / LAPTOP
               */
              @media (min-width: 1024px) {
                [data-portal-shell-inner][data-has-cosmetic-header-controls="true"]
                  [data-cosmetic-header-controls] :is(button,a) {
                  position: relative;
                  isolation: isolate;
                  overflow: visible;
                }

                [data-portal-shell-inner][data-has-cosmetic-header-controls="true"]
                  [data-cosmetic-header-controls] :is(button,a)::after {
                  content: "";
                  position: absolute;
                  z-index: 8;
                  inset: -3px;
                  border: 8px solid transparent;
                  border-image-source: var(--sep-cosmetic-header-control-frame);
                  border-image-slice: 18%;
                  border-image-width: 1;
                  border-image-repeat: stretch;
                  pointer-events: none;
                  filter: drop-shadow(0 2px 5px rgba(0,0,0,.42));
                }

                /*
                 * Panel frames live on non-scrolling shell wrappers.
                 * The scrolling columns keep their own overflow.
                 */
                [data-portal-shell-inner][data-has-cosmetic-left-panel="true"]
                  .portal-left-shell,
                [data-portal-shell-inner][data-has-cosmetic-right-panel="true"]
                  .portal-right-shell,
                [data-portal-shell-inner][data-has-cosmetic-centre-panel="true"]
                  [data-portal-centre-host] {
                  position: relative;
                }

                [data-portal-shell-inner][data-has-cosmetic-left-panel="true"]
                  .portal-left-shell::after,
                [data-portal-shell-inner][data-has-cosmetic-right-panel="true"]
                  .portal-right-shell::after,
                [data-portal-shell-inner][data-has-cosmetic-centre-panel="true"]
                  [data-portal-centre-host]::after {
                  content: "";
                  position: absolute;
                  z-index: 35;
                  inset: 1px;
                  border-style: solid;
                  border-color: transparent;
                  border-image-width: 1;
                  border-image-repeat: stretch;
                  pointer-events: none;
                  filter: drop-shadow(0 3px 8px rgba(0,0,0,.35));
                }

                [data-portal-shell-inner][data-has-cosmetic-left-panel="true"]
                  .portal-left-shell::after {
                  border-width: 42px;
                  border-image-source: var(--sep-cosmetic-left-panel-frame);
                  border-image-slice: 10% 13%;
                }

                [data-portal-shell-inner][data-has-cosmetic-right-panel="true"]
                  .portal-right-shell::after {
                  border-width: 42px;
                  border-image-source: var(--sep-cosmetic-right-panel-frame);
                  border-image-slice: 10% 13%;
                }

                [data-portal-shell-inner][data-has-cosmetic-centre-panel="true"]
                  [data-portal-centre-host]::after {
                  border-width: 50px;
                  border-image-source: var(--sep-cosmetic-centre-panel-frame);
                  border-image-slice: 9% 7%;
                  inset: -10px;
                }

                /*
                 * Reserve a genuine centre safe area so scrolling content never
                 * travels behind the fixed centre frame.
                 */
                [data-portal-shell-inner][data-has-cosmetic-centre-panel="true"]
                  [data-portal-centre-host] {
                  box-sizing: border-box;
                  padding-top: 14px;
                  padding-bottom: 14px;
                  padding-right: 10px;
                  padding-left: 10px;
                  overflow: hidden;
                }

                .sepulchria-viewport-body[data-left-collapsed="true"]
                  .portal-left-shell::after {
                  display: none !important;
                }

                .sepulchria-viewport-body[data-right-collapsed="true"]
                  .portal-right-shell::after {
                  display: none !important;
                }

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
                  border: 1px solid rgb(var(--sep-colour-987344));
                  background: rgb(var(--sep-colour-17120f));
                  color: rgb(var(--sep-colour-efd6a8));
                  font-family: Georgia, serif;
                  font-size: 22px;
                  font-weight: 700;
                  line-height: 1;
                  box-shadow: 4px 0 14px rgba(var(--sep-rgb-0-0-0),0.28);
                  transition:
                    color 150ms ease,
                    border-color 150ms ease,
                    background 150ms ease;
                }

                .portal-left-collapse-toggle:hover {
                  border-color: rgb(var(--sep-colour-b98c50));
                  background: rgb(var(--sep-colour-3b2919));
                  color: rgb(var(--sep-colour-efd6a8));
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

              /*
               * Full three-column desktop.
               */
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
                  border: 1px solid rgb(var(--sep-colour-987344));
                  background: rgb(var(--sep-colour-17120f));
                  color: rgb(var(--sep-colour-efd6a8));
                  font-family: Georgia, serif;
                  font-size: 22px;
                  font-weight: 700;
                  line-height: 1;
                  box-shadow: -4px 0 14px rgba(var(--sep-rgb-0-0-0),0.28);
                  transition:
                    color 150ms ease,
                    border-color 150ms ease,
                    background 150ms ease;
                }

                .portal-right-collapse-toggle:hover {
                  border-color: rgb(var(--sep-colour-b98c50));
                  background: rgb(var(--sep-colour-3b2919));
                  color: rgb(var(--sep-colour-efd6a8));
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
               * contenteditable fields.
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
              unreadForumCount={
                unreadForumCount
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