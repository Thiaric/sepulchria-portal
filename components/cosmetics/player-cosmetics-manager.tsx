"use client";

import { useState, useTransition } from "react";
import { setEquippedCosmetic } from "@/app/(portal)/cosmetics/actions";

export type PlayerCosmeticRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: "sheet_frame" | "chat_frame";
  previewImageUrl: string | null;
  assetUrl: string | null;
  sortOrder: number;
};

type Tab = "sheet_frame" | "chat_frame";

function tabLabel(tab: Tab) {
  return tab === "sheet_frame" ? "Sheet Frames" : "Chat Frames";
}

export function PlayerCosmeticsManager({
  initialCosmetics,
  initialSheetFrameId,
  initialChatFrameId,
}: {
  initialCosmetics: PlayerCosmeticRow[];
  initialSheetFrameId: string | null;
  initialChatFrameId: string | null;
}) {
  const [tab, setTab] = useState<Tab>("sheet_frame");
  const [sheetFrameId, setSheetFrameId] = useState(initialSheetFrameId);
  const [chatFrameId, setChatFrameId] = useState(initialChatFrameId);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();

  const visible = initialCosmetics.filter((item) => item.category === tab);
  const equippedId = tab === "sheet_frame" ? sheetFrameId : chatFrameId;

  function changeEquipped(cosmeticId: string | null) {
    setMessage("");
    setFailed(false);
    const data = new FormData();
    data.set("slot", tab);
    data.set("cosmeticId", cosmeticId ?? "");

    startTransition(async () => {
      try {
        await setEquippedCosmetic(data);
        if (tab === "sheet_frame") setSheetFrameId(cosmeticId);
        else setChatFrameId(cosmeticId);
        setMessage(cosmeticId ? "Cosmetic equipped." : "Cosmetic unequipped.");
      } catch (error) {
        setFailed(true);
        setMessage(error instanceof Error ? error.message : "Unable to update cosmetic.");
      }
    });
  }

  return (
    <section className="mt-7 overflow-hidden border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))]">
      <header className="border-b border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-100c09))] px-5 py-4">
        <p className="text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-a68152))]">Your collection</p>
        <h2 className="mt-1 font-serif text-2xl text-[rgb(var(--sep-colour-dfc99f))]">Equipped Appearance</h2>
        <p className="mt-2 text-[11px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">Cosmetics are visual only and never change gameplay.</p>
      </header>

      <div className="flex border-b border-[rgb(var(--sep-colour-60482e))]/35">
        {(["sheet_frame", "chat_frame"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => { setTab(value); setMessage(""); }}
            className={[
              "flex-1 px-4 py-3 text-[9px] uppercase tracking-[0.18em] transition",
              tab === value
                ? "bg-[rgb(var(--sep-colour-332719))] text-[rgb(var(--sep-colour-efd9aa))]"
                : "bg-[rgb(var(--sep-colour-120d0a))] text-[rgb(var(--sep-colour-8f806c))] hover:text-[rgb(var(--sep-colour-cbb28a))]",
            ].join(" ")}
          >
            {tabLabel(value)}
          </button>
        ))}
      </div>

      {message ? (
        <div className={[
          "mx-5 mt-5 border px-4 py-3 text-xs",
          failed ? "border-red-800/55 text-red-200" : "border-[rgb(var(--sep-colour-56754f))]/55 text-[rgb(var(--sep-colour-c5d7bd))]",
        ].join(" ")}>
          {message}
        </div>
      ) : null}

      <div className="p-5">
        {equippedId ? (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border border-[rgb(var(--sep-colour-765937))]/45 bg-[rgb(var(--sep-colour-21170f))] px-4 py-3">
            <div>
              <p className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-8c704b))]">Current</p>
              <p className="mt-1 font-serif text-lg text-[rgb(var(--sep-colour-dfc99f))]">
                {initialCosmetics.find((item) => item.id === equippedId)?.name ?? "Equipped cosmetic"}
              </p>
            </div>
            <button
              type="button"
              disabled={pending}
              onClick={() => changeEquipped(null)}
              className="border border-[rgb(var(--sep-colour-765937))]/55 px-4 py-2 text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-cbb28a))] disabled:opacity-45"
            >
              Unequip
            </button>
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((item) => {
            const equipped = item.id === equippedId;
            return (
              <article key={item.id} className={[
                "overflow-hidden border bg-[rgb(var(--sep-colour-100c09))]",
                equipped ? "border-[rgb(var(--sep-colour-987344))]" : "border-[rgb(var(--sep-colour-59432c))]/45",
              ].join(" ")}>
                <div className="flex h-44 items-center justify-center bg-[rgb(var(--sep-colour-0d0a08))] p-4">
                  {item.previewImageUrl ?? item.assetUrl ? (
                    <img src={item.previewImageUrl ?? item.assetUrl ?? ""} alt="" className="max-h-full max-w-full object-contain" />
                  ) : (
                    <span className="text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-625747))]">No preview</span>
                  )}
                </div>
                <div className="p-4">
                  <p className="text-[7px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
                    {tab === "sheet_frame" ? "Sheet Frame" : "Location Chat Frame"}
                  </p>
                  <h3 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-dfc99f))]">{item.name}</h3>
                  <p className="mt-2 min-h-10 text-[10px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">
                    {item.description || "Collectible Sepulchria cosmetic."}
                  </p>
                  <button
                    type="button"
                    disabled={pending || equipped}
                    onClick={() => changeEquipped(item.id)}
                    className="mt-4 w-full border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-4 py-2.5 text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-efd6a8))] disabled:opacity-45"
                  >
                    {equipped ? "Equipped" : pending ? "Working..." : "Equip"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        {visible.length === 0 ? (
          <div className="border border-dashed border-[rgb(var(--sep-colour-59432c))]/40 px-5 py-10 text-center">
            <p className="font-serif text-lg text-[rgb(var(--sep-colour-bba17a))]">No {tabLabel(tab).toLowerCase()} owned yet.</p>
            <p className="mt-2 text-[10px] leading-5 text-[rgb(var(--sep-colour-706452))]">Cosmetics unlocked later will appear here automatically.</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
