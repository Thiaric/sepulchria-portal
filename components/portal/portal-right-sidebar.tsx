import Link from "next/link";

import type { PortalContext } from "@/types/portal";
import { PortalContextPanel } from "@/components/portal/portal-context-panel";

type PortalRightSidebarProps = {
  context: PortalContext;
};

const statusLabels = {
  draft: "Draft",
  submitted: "Awaiting approval",
  approved: "Approved",
  rejected: "Changes required",
};

const presenceLabels = {
  online: "Online",
  away: "Away",
  busy: "Busy",
};

export function PortalRightSidebar({
  context,
}: PortalRightSidebarProps) {
  const { character, presence, onlineCharacterCount } = context;

  return (
    <aside className="hidden border-l border-[#6e5535]/30 bg-[#100d0b]/75 xl:sticky xl:top-20 xl:block xl:h-[calc(100vh-5rem)] xl:overflow-y-auto">
      <div className="space-y-5 p-5">
        <section className="border border-[#60482e]/45 bg-[#17110d] p-5">
          <p className="text-[9px] uppercase tracking-[0.3em] text-[#876a46]">
            Your character
          </p>

          {character ? (
            <>
              <div className="mt-4 flex items-center gap-4">
                <div className="h-16 w-16 shrink-0 overflow-hidden border border-[#60482e] bg-[#0d0a08]">
                  {character.portrait_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={character.portrait_url}
                      alt={`Portrait of ${character.display_name}`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="flex h-full items-center justify-center font-serif text-2xl text-[#a98b61]">
                      {character.first_name.slice(0, 1)}
                    </span>
                  )}
                </div>

                <div className="min-w-0">
                  <p className="truncate font-serif text-xl text-[#dec69a]">
                    {character.display_name}
                  </p>

                  <p className="mt-1 truncate text-[9px] uppercase tracking-[0.18em] text-[#7f6d57]">
                    {character.title ||
                      character.occupation ||
                      "No occupation"}
                  </p>
                </div>
              </div>

              <dl className="mt-5 space-y-3 border-t border-[#59432c]/40 pt-4 text-xs">
                <div className="flex justify-between gap-4">
                  <dt className="text-[#786b5b]">Record</dt>
                  <dd className="text-right text-[#bba98d]">
                    {statusLabels[character.status]}
                  </dd>
                </div>

                <div className="flex justify-between gap-4">
                  <dt className="text-[#786b5b]">Presence</dt>
                  <dd className="text-right text-[#bba98d]">
                    {presence
                      ? presenceLabels[presence.status]
                      : "Offline"}
                  </dd>
                </div>

                <div className="flex justify-between gap-4">
                  <dt className="text-[#786b5b]">Faction</dt>
                  <dd className="text-right text-[#bba98d]">
                    {character.faction || "Unaffiliated"}
                  </dd>
                </div>
              </dl>

              <Link
                href="/character"
                className="mt-5 inline-flex text-[10px] uppercase tracking-[0.2em] text-[#c59a5a] hover:text-[#ebcc91]"
              >
                Open character →
              </Link>
            </>
          ) : (
            <>
              <p className="mt-4 text-sm leading-6 text-[#9e907d]">
                You have not created a character yet.
              </p>

              <Link
                href="/character/create"
                className="mt-5 inline-flex border border-[#8d6d3e] bg-[#332719] px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-[#efd9aa]"
              >
                Create character
              </Link>
            </>
          )}
        </section>

        <section className="border border-[#60482e]/45 bg-[#15100d] p-5">
          <p className="text-[9px] uppercase tracking-[0.3em] text-[#876a46]">
            Current location
          </p>

          <h2 className="mt-3 font-serif text-2xl text-[#d6bd91]">
            {character?.currentRoom?.name ?? "No location"}
          </h2>

          <p className="mt-2 text-xs text-[#8f8271]">
            {character?.currentRoom?.area?.name ??
              "Your character has not entered the city yet."}
          </p>

          {character?.currentRoom ? (
            <Link
              href="/game"
              className="mt-5 inline-flex text-[10px] uppercase tracking-[0.2em] text-[#c59a5a] hover:text-[#ebcc91]"
            >
              Enter location →
            </Link>
          ) : null}
        </section>

        <section className="border border-[#60482e]/45 bg-[#15100d] p-5">
          <p className="text-[9px] uppercase tracking-[0.3em] text-[#876a46]">
            City activity
          </p>

          <div className="mt-4 flex items-end justify-between">
            <div>
              <p className="font-serif text-4xl text-[#d8bf91]">
                {onlineCharacterCount}
              </p>

              <p className="mt-1 text-xs text-[#827461]">
                active characters
              </p>
            </div>

            <span className="mb-2 h-2.5 w-2.5 rounded-full bg-[#788d5e] shadow-[0_0_10px_rgba(120,141,94,0.55)]" />
          </div>
        </section>

        <section className="border border-[#60482e]/45 bg-[#15100d] p-5">
  <PortalContextPanel context={context} />
</section>
      </div>
    </aside>
  );
}