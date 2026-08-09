"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";
import { X } from "lucide-react";
import { usePathname } from "next/navigation";

import { PortalContextPanel } from "@/components/portal/portal-context-panel";
import type { PortalContext } from "@/types/portal";

type PortalResponsiveRightSidebarProps = {
  context: PortalContext;
};

export function PortalResponsiveRightSidebar({
  context,
}: PortalResponsiveRightSidebarProps) {
  const [open, setOpen] = useState(false);
  const contextSectionRef =
    useRef<HTMLElement | null>(null);

  const pathname = usePathname();
  const { character } = context;

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
      if (event.key === "Escape") {
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

  useEffect(() => {
    if (
      pathname !== "/forum" &&
      !pathname.startsWith("/forum/")
    ) {
      return;
    }

    const container =
      contextSectionRef.current;

    if (!container) {
      return;
    }

    // Stable non-null reference for nested functions / MutationObserver.
    const forumContainer: HTMLElement =
      container;

    function htmlToPlainText(
      value: string,
    ): string {
      const parser = new DOMParser();

      const parsed =
        parser.parseFromString(
          value,
          "text/html",
        );

      return (
        parsed.body.textContent ?? ""
      )
        .replace(/\u00a0/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    }

    function cleanForumPreviews() {
      const previewElements =
        forumContainer.querySelectorAll<HTMLElement>(
          "p.line-clamp-3, p.line-clamp-5",
        );

      previewElements.forEach(
        (element) => {
          const currentText =
            element.textContent ?? "";

          if (
            !currentText.includes("<") ||
            !currentText.includes(">")
          ) {
            return;
          }

          const cleaned =
            htmlToPlainText(
              currentText,
            );

          if (
            cleaned &&
            cleaned !== currentText
          ) {
            element.textContent =
              cleaned;
          }
        },
      );
    }

    cleanForumPreviews();

    const observer =
      new MutationObserver(() => {
        cleanForumPreviews();
      });

    observer.observe(
      forumContainer,
      {
        childList: true,
        subtree: true,
        characterData: true,
      },
    );

    return () => {
      observer.disconnect();
    };
  }, [pathname]);

  return (
    <>
      {/* Mobile/tablet trigger. The desktop sidebar below is the SAME component
          instance, so realtime children are never mounted twice. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open context panel"
        aria-expanded={open}
        className="fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center border border-[#765937] bg-[#1d160f] font-serif text-xl text-[#d8bf91] shadow-[0_12px_35px_rgba(0,0,0,0.45)] transition hover:border-[#a37b45] hover:text-[#f0d39d] xl:hidden"
      >
        ◈
      </button>

      {/* Backdrop exists only on mobile/tablet. */}
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

      {/* ONE sidebar / ONE PortalContextPanel / ONE realtime subscription tree.
          On desktop it occupies the third grid column.
          Below xl it becomes an off-canvas drawer. */}
      <aside
        aria-label="Context sidebar"
        className={[
          "z-[70] flex min-h-0 flex-col border-l border-[#6e5535]/40 bg-[#100d0b]",
          "fixed inset-y-0 right-0 w-[min(88vw,360px)] shadow-[-18px_0_50px_rgba(0,0,0,0.55)] transition-transform duration-200 ease-out",
          open
            ? "translate-x-0"
            : "translate-x-full",
          "xl:sticky xl:top-20 xl:z-auto xl:h-[calc(100vh-5rem)] xl:w-auto xl:translate-x-0 xl:self-start xl:shadow-none xl:transition-none",
        ].join(" ")}
      >
        {/* Mobile drawer heading */}
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

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-4">
          <section className="shrink-0 border border-[#60482e]/45 bg-[#15100d] p-4">
            <p className="text-[8px] uppercase tracking-[0.28em] text-[#876a46]">
              Current location
            </p>

            <h2 className="mt-2 truncate font-serif text-xl text-[#d6bd91]">
              {character?.currentRoom
                ?.name ?? "No location"}
            </h2>

            <p className="mt-1 truncate text-[11px] text-[#8f8271]">
              {character?.currentRoom
                ?.area?.name ??
                "Your character has not entered the city yet."}
            </p>
          </section>

          <section
            ref={contextSectionRef}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain border border-[#60482e]/45 bg-[#15100d] p-4"
          >
            <PortalContextPanel
              context={context}
            />
          </section>
        </div>
      </aside>
    </>
  );
}
