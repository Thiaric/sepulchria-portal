"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

import { PortalContextPanel } from "@/components/portal/portal-context-panel";
import type { PortalContext } from "@/types/portal";

type PortalMobileContextDrawerProps = {
  context: PortalContext;
};

export function PortalMobileContextDrawer({
  context,
}: PortalMobileContextDrawerProps) {
  const [open, setOpen] = useState(false);
  const { character } = context;

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open context panel"
        aria-expanded={open}
        className="fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center border border-[#765937] bg-[#1d160f] font-serif text-xl text-[#d8bf91] shadow-[0_12px_35px_rgba(0,0,0,0.45)] transition hover:border-[#a37b45] hover:text-[#f0d39d] xl:hidden"
      >
        ◈
      </button>

      {open ? (
        <div className="fixed inset-0 z-[70] xl:hidden">
          <button
            type="button"
            aria-label="Close context panel"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
          />

          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Context panel"
            className="absolute inset-y-0 right-0 flex w-[min(88vw,360px)] flex-col border-l border-[#6e5535]/50 bg-[#100d0b] shadow-[-18px_0_50px_rgba(0,0,0,0.55)]"
          >
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-[#6e5535]/40 px-4">
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
                onClick={() => setOpen(false)}
                aria-label="Close context panel"
                className="flex h-9 w-9 items-center justify-center border border-[#60482e]/55 bg-[#17120f] text-[#bca47e] transition hover:border-[#977242] hover:text-[#efd6a3]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-4">
              <section className="shrink-0 border border-[#60482e]/45 bg-[#15100d] p-4">
                <p className="text-[8px] uppercase tracking-[0.28em] text-[#876a46]">
                  Current location
                </p>
                <h2 className="mt-2 truncate font-serif text-xl text-[#d6bd91]">
                  {character?.currentRoom?.name ?? "No location"}
                </h2>
                <p className="mt-1 truncate text-[11px] text-[#8f8271]">
                  {character?.currentRoom?.area?.name ??
                    "Your character has not entered the city yet."}
                </p>
              </section>

              <section className="min-h-0 flex-1 overflow-y-auto overscroll-contain border border-[#60482e]/45 bg-[#15100d] p-4">
                <PortalContextPanel context={context} />
              </section>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
