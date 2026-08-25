"use client";

import type { ReactNode } from "react";
import { useState } from "react";

type TabId =
  | "short"
  | "profile"
  | "inventory"
  | "ledger"
  | "gifts"
  | "warping"
  | "offgame"
  | "audit"
  | "edit";

const PUBLIC_TABS: { id: TabId; label: string }[] = [
  { id: "short", label: "IN SHORT" },
  { id: "profile", label: "PROFILE" },
  { id: "inventory", label: "INVENTORY" },
  { id: "gifts", label: "FEATS" },
  { id: "warping", label: "WARPING" },
  { id: "offgame", label: "OFFGAME" },
];

export function CharacterSheetTabs({
  own = false,
  showAudit = false,
  children,
}: {
  own?: boolean;
  showAudit?: boolean;
  children: ReactNode;
}) {
  const [activeTab, setActiveTab] = useState<TabId>("short");

  const baseTabs = own
    ? [
        ...PUBLIC_TABS.slice(0, 3),
        { id: "ledger" as const, label: "LEDGER" },
        ...PUBLIC_TABS.slice(3),
      ]
    : [...PUBLIC_TABS];

  const tabs = [
    ...baseTabs,
    ...(own || showAudit
      ? [{ id: "audit" as const, label: "LOG" }]
      : []),
    ...(own
      ? [{ id: "edit" as const, label: "EDIT" }]
      : []),
  ];

  return (
    <div
      className="character-sheet-tabs mt-4"
      data-character-sheet-active-tab={activeTab}
    >
      <nav
  aria-label="Character sheet sections"
  role="tablist"
  className="
  flex min-w-0 flex-wrap items-end gap-1
  border-x border-t border-[rgb(var(--sep-colour-60482e))]/45
  bg-transparent
  px-2 pt-2
  rounded-t-xl
"
>
  {tabs.map((tab) => {
    const active =
      activeTab === tab.id;

    return (
      <button
        key={tab.id}
        type="button"
        role="tab"
        aria-selected={active}
        onClick={() => {
          setActiveTab(tab.id);

          window.dispatchEvent(
            new CustomEvent(
              "sepulchria-character-sheet-tab",
              {
                detail: tab.id,
              },
            ),
          );
        }}
        className={`
          relative min-w-[92px] flex-1 basis-[92px]
          rounded-t-lg
          border border-b-0
          px-2 py-3
          font-serif text-[10px]
          tracking-[0.08em]
          transition-all duration-200

          ${
            active
              ? `
                z-10
                -mb-px
                border-[rgb(var(--sep-colour-8a693f))]/70
                bg-[rgb(var(--sep-colour-17110d))]
                text-[rgb(var(--sep-colour-ead3a5))]
                shadow-[0_-4px_14px_rgba(var(--sep-rgb-0-0-0),0.22)]
              `
              : `
                border-[rgb(var(--sep-colour-4e3b29))]/45
                bg-[rgb(var(--sep-colour-120d0a))]
                text-[rgb(var(--sep-colour-8d7b64))]
                hover:border-[rgb(var(--sep-colour-745536))]/60
                hover:bg-[rgb(var(--sep-colour-1b130e))]
                hover:text-[rgb(var(--sep-colour-c9ad82))]
              `
          }
        `}
      >
        {tab.label}

        {active ? (
          <span
            aria-hidden="true"
            className="
              absolute inset-x-5 bottom-0
              h-px
              bg-[rgb(var(--sep-colour-c29456))]
              shadow-[0_0_7px_rgba(var(--sep-rgb-194-148-86),0.45)]
            "
          />
        ) : null}
      </button>
    );
  })}
</nav>

      <div className="-mt-8px">{children}</div>

      <style>{`
        .character-sheet-tabs [data-character-sheet-panel] { display: none; }
        .character-sheet-tabs[data-character-sheet-active-tab="short"] [data-character-sheet-panel="short"],
        .character-sheet-tabs[data-character-sheet-active-tab="profile"] [data-character-sheet-panel="profile"],
        .character-sheet-tabs[data-character-sheet-active-tab="inventory"] [data-character-sheet-panel="inventory"],
        .character-sheet-tabs[data-character-sheet-active-tab="ledger"] [data-character-sheet-panel="ledger"],
        .character-sheet-tabs[data-character-sheet-active-tab="gifts"] [data-character-sheet-panel="gifts"],
        .character-sheet-tabs[data-character-sheet-active-tab="warping"] [data-character-sheet-panel="warping"],
        .character-sheet-tabs[data-character-sheet-active-tab="offgame"] [data-character-sheet-panel="offgame"],
        .character-sheet-tabs[data-character-sheet-active-tab="audit"] [data-character-sheet-panel="audit"],
        .character-sheet-tabs[data-character-sheet-active-tab="edit"] [data-character-sheet-panel="edit"] {
          display: block;
        }
      `}</style>
    </div>
  );
}
