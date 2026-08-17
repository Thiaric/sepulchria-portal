"use client";

import type { ReactNode } from "react";
import { useState } from "react";

type TabId =
  | "short"
  | "description"
  | "notes"
  | "gifts"
  | "warping"
  | "edit";

const PUBLIC_TABS: { id: TabId; label: string }[] = [
  { id: "short", label: "In Short" },
  { id: "description", label: "Description" },
  { id: "notes", label: "Notes" },
  { id: "gifts", label: "Gifts" },
  { id: "warping", label: "Warping" },
];

export function CharacterSheetTabs({
  own = false,
  children,
}: {
  own?: boolean;
  children: ReactNode;
}) {
  const [activeTab, setActiveTab] = useState<TabId>("short");

  const tabs = own
    ? [...PUBLIC_TABS, { id: "edit" as const, label: "Edit" }]
    : PUBLIC_TABS;

  return (
    <div
      className="character-sheet-tabs mt-4"
      data-character-sheet-active-tab={activeTab}
    >
      <nav
        aria-label="Character sheet sections"
        role="tablist"
        className="flex min-w-0 flex-wrap border border-[#60482e]/45 bg-[#120e0b]"
      >
        {tabs.map((tab) => {
          const active = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveTab(tab.id)}
              className={`relative min-w-[110px] flex-1 border-r border-[#59432c]/35 px-4 py-3 text-[8px] uppercase tracking-[0.18em] transition last:border-r-0 ${
                active
                  ? "bg-[#342617] text-[#efd6a5]"
                  : "bg-[#120e0b] text-[#81715d] hover:bg-[#1c140f] hover:text-[#c6a97e]"
              }`}
            >
              {tab.label}
              {active ? (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-4 bottom-0 h-px bg-[#b98b50]"
                />
              ) : null}
            </button>
          );
        })}
      </nav>

      <div className="mt-4">{children}</div>

      <style>{`
        .character-sheet-tabs [data-character-sheet-panel] { display: none; }
        .character-sheet-tabs[data-character-sheet-active-tab="short"] [data-character-sheet-panel="short"],
        .character-sheet-tabs[data-character-sheet-active-tab="description"] [data-character-sheet-panel="description"],
        .character-sheet-tabs[data-character-sheet-active-tab="notes"] [data-character-sheet-panel="notes"],
        .character-sheet-tabs[data-character-sheet-active-tab="gifts"] [data-character-sheet-panel="gifts"],
        .character-sheet-tabs[data-character-sheet-active-tab="warping"] [data-character-sheet-panel="warping"],
        .character-sheet-tabs[data-character-sheet-active-tab="edit"] [data-character-sheet-panel="edit"] {
          display: block;
        }
      `}</style>
    </div>
  );
}
