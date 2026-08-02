import Link from "next/link";

import { LogoutButton } from "@/components/logout-button";
import { getStaffSession } from "@/lib/auth/require-staff";
import type { PortalContext } from "@/types/portal";
import { ActiveCityCounter } from "@/components/portal/active-city-counter";
import { UnreadMessageBadge } from "@/components/messages/unread-message-badge";

type PortalHeaderProps = {
  context: PortalContext;
};

export async function PortalHeader({
  context,
}: PortalHeaderProps) {
  const staffSession =
    await getStaffSession();

  const {
    character,
    unreadMessageCount,
    onlineCharacterCount,
  } = context;

  return (
    <header className="sticky top-0 z-50 h-20 border-b border-[#6e5535]/40 bg-[#0d0b0a]/95 backdrop-blur">
      <div className="mx-auto flex h-full w-full max-w-[1800px] items-center justify-between gap-5 px-5 lg:px-8">
        <Link
          href="/"
          className="min-w-0"
        >
          <span className="block font-serif text-2xl font-semibold tracking-[0.22em] text-[#d9bd82] sm:text-2xl">
            SEPULCHRIA - THE CITY OF THE FIRST
          </span>

          <span className="mt-1 hidden text-[10px] uppercase tracking-[0.35em] text-[#8f806d] sm:block">
            Built upon the remains of The First, shaped by your choices.
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <ActiveCityCounter
  initialCount={
    onlineCharacterCount
  }
/>

          <Link
            href="/messages"
            aria-label={`${unreadMessageCount} unread messages`}
            className="relative flex h-10 w-10 items-center justify-center border border-[#614b31] bg-[#17120f] text-lg text-[#c69b5c] transition hover:border-[#977242] hover:text-[#efd6a3]"
          >
            ✉

            <UnreadMessageBadge
              initialCount={
                unreadMessageCount
              }
              variant="floating"
            />
          </Link>

          {staffSession ? (
            <Link
              href="/admin"
              aria-label="Open administration panel"
              title={`Administration — ${staffSession.role}`}
              className="flex h-10 w-10 items-center justify-center border border-[#7b5d36] bg-[#24180f] font-serif text-lg text-[#d4ad70] transition hover:border-[#b1844b] hover:bg-[#382517] hover:text-[#ffe0a6]"
            >
              ⚙
            </Link>
          ) : null}

          {character ? (
            <Link
              href="/character"
              className="hidden items-center gap-3 border-l border-[#5c472f]/60 pl-4 sm:flex"
            >
              <div className="h-10 w-10 overflow-hidden border border-[#6e5535] bg-[#15100d]">
                {character.portrait_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={character.portrait_url}
                    alt={`Portrait of ${character.display_name}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="flex h-full items-center justify-center font-serif text-[#a98b61]">
                    {character.first_name.slice(
                      0,
                      1,
                    )}
                  </span>
                )}
              </div>

              <div className="max-w-44 min-w-0">
                <p className="truncate font-serif text-sm text-[#dfc79c]">
                  {character.display_name}
                </p>

                <p className="truncate text-[9px] uppercase tracking-[0.18em] text-[#81725f]">
                  {character.title ||
                    character.occupation ||
                    "Citizen of Sepulchria"}
                </p>
              </div>
            </Link>
          ) : (
            <Link
              href="/character/create"
              className="hidden text-xs uppercase tracking-[0.18em] text-[#c59a5a] sm:block"
            >
              Create character
            </Link>
          )}

          <LogoutButton />
        </div>
      </div>
    </header>
  );
}