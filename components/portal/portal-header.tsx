import Link from "next/link";

import { SubmittedCharacterBadge } from "@/components/admin/submitted-character-badge";
import { PortalSoundToggle } from "@/components/audio/portal-sound-toggle";
import { LogoutButton } from "@/components/logout-button";
import { UnreadMessageBadge } from "@/components/messages/unread-message-badge";
import { ActiveCityCounter } from "@/components/portal/active-city-counter";
import { HeaderCharacterIdentity } from "@/components/portal/header-character-identity";
import { WorldIndicator } from "@/components/world/world-indicator";
import { getStaffSession } from "@/lib/auth/require-staff";
import type { PortalContext } from "@/types/portal";

type PortalHeaderProps = { context: PortalContext };

export async function PortalHeader({ context }: PortalHeaderProps) {
  const staffSession = await getStaffSession();
  const { character, presence, unreadMessageCount, onlineCharacterCount } = context;

  return (
    <>
      <header className="sticky top-0 z-50 h-[clamp(56px,8dvh,80px)] border-b border-[#6e5535]/40 bg-[#0d0b0a]/95 backdrop-blur">
        <div className="mx-auto flex h-full w-full max-w-[1800px] items-center justify-between gap-2 px-3 sm:gap-3 sm:px-5 lg:gap-4 lg:px-6 2xl:px-8">
          <Link href="/" className="min-w-0 shrink">
            <span className="block truncate font-serif text-lg font-semibold tracking-[0.18em] text-[#d9bd82] sm:text-xl sm:tracking-[0.22em] 2xl:text-2xl">
              SEPULCHRIA
            </span>
            <span className="mt-0.5 hidden truncate text-[8px] uppercase tracking-[0.24em] text-[#8f806d] md:block lg:text-[9px] 2xl:mt-1 2xl:text-[10px] 2xl:tracking-[0.35em]">
              Built upon the remains of The First, shaped by your choices.
            </span>
          </Link>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2 lg:gap-2.5 2xl:gap-3">
            <WorldIndicator
  characterId={
    character?.id ?? null
  }
/>
            <ActiveCityCounter
              initialCount={onlineCharacterCount}
              isStaff={
                staffSession !== null
              }
            />
            <PortalSoundToggle />

            <Link
              href="/messages"
              aria-label={`${unreadMessageCount} unread messages`}
              className="relative flex h-8 w-8 items-center justify-center border border-[#614b31] bg-[#17120f] text-base text-[#c69b5c] transition hover:border-[#977242] hover:text-[#efd6a3] sm:h-9 sm:w-9 2xl:h-10 2xl:w-10 2xl:text-lg"
            >
              ✉
              <UnreadMessageBadge initialCount={unreadMessageCount} variant="floating" />
            </Link>

            {staffSession ? (
              <Link
                href="/admin"
                aria-label="Open administration panel"
                title={`Administration — ${staffSession.role}`}
                className="relative flex h-8 w-8 items-center justify-center border border-[#7b5d36] bg-[#24180f] font-serif text-base text-[#d4ad70] transition hover:border-[#b1844b] hover:bg-[#382517] hover:text-[#ffe0a6] sm:h-9 sm:w-9 2xl:h-10 2xl:w-10 2xl:text-lg"
              >
                ⚙
                <SubmittedCharacterBadge variant="floating" />
              </Link>
            ) : null}

            <HeaderCharacterIdentity
              userId={context.user.id}
              character={character}
              initialPresenceStatus={
                presence?.status ??
                "online"
              }
            />

            <LogoutButton />
          </div>
        </div>
      </header>

      </>
  );
}
