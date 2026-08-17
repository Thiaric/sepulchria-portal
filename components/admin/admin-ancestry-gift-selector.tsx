"use client";

import { useEffect, useMemo, useState } from "react";

export type AdminAncestryGiftOption = {
  id: string;
  name: string;
  description: string;
  raceIds: string[];
};

export function AdminAncestryGiftSelector({
  gifts,
  initialRaceId,
  initialSelectedIds,
}: {
  gifts: AdminAncestryGiftOption[];
  initialRaceId: string;
  initialSelectedIds: string[];
}) {
  const [raceId, setRaceId] = useState(initialRaceId);
  const [selected, setSelected] = useState<string[]>(initialSelectedIds);

  useEffect(() => {
    const field = document.querySelector('select[name="raceId"]');

    if (!(field instanceof HTMLSelectElement)) {
      return;
    }

    setRaceId(field.value);

    const onChange = () => {
      const nextRaceId = field.value;
      setRaceId(nextRaceId);

      setSelected((current) =>
        current.filter((giftId) =>
          gifts.some(
            (gift) =>
              gift.id === giftId &&
              gift.raceIds.includes(nextRaceId),
          ),
        ),
      );
    };

    field.addEventListener("change", onChange);

    return () => {
      field.removeEventListener("change", onChange);
    };
  }, [gifts]);

  const eligible = useMemo(
    () => gifts.filter((gift) => gift.raceIds.includes(raceId)),
    [gifts, raceId],
  );

  function toggle(giftId: string) {
    setSelected((current) => {
      if (current.includes(giftId)) {
        return current.filter((id) => id !== giftId);
      }

      if (current.length >= 2) {
        return current;
      }

      return [...current, giftId];
    });
  }

  return (
    <div className="border border-[#60482e]/45 bg-[#100c09] p-4">
      <p className="text-[8px] uppercase tracking-[0.22em] text-[#806b50]">
        Ancestry Feats
      </p>

      <p className="mt-2 text-xs leading-5 text-[#8f8271]">
        Choose up to two Feats available to the selected Ancestry. Changing
        Ancestry removes selections that are no longer eligible.
      </p>

      {selected.map((giftId) => (
        <input
          key={giftId}
          type="hidden"
          name="ancestryGiftIds"
          value={giftId}
        />
      ))}

      {eligible.length ? (
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {eligible.map((gift) => {
            const checked = selected.includes(gift.id);
            const disabled = !checked && selected.length >= 2;

            return (
              <button
                key={gift.id}
                type="button"
                disabled={disabled}
                onClick={() => toggle(gift.id)}
                className={`border p-3 text-left transition ${
                  checked
                    ? "border-[#a17a49] bg-[#2b1e13]"
                    : "border-[#59432c]/45 bg-[#0d0907] hover:border-[#765937]"
                } disabled:cursor-not-allowed disabled:opacity-35`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-serif text-sm text-[#d8bf91]">
                    {gift.name}
                  </span>
                  <span className="text-[8px] uppercase tracking-[0.12em] text-[#8a765a]">
                    {checked ? "Selected" : "Choose"}
                  </span>
                </div>

                {gift.description ? (
                  <p className="mt-2 text-[10px] leading-5 text-[#817565]">
                    {gift.description}
                  </p>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="mt-4 text-[10px] italic text-[#746958]">
          No active Ancestry Feats are available for this Ancestry.
        </p>
      )}

      <p className="mt-3 text-[8px] uppercase tracking-[0.14em] text-[#6f6353]">
        {selected.length} / 2 selected
      </p>
    </div>
  );
}
