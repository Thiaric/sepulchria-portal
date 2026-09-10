"use client";

import { useEffect, useMemo, useState } from "react";

export type AdminAncestryGiftOption = {
  id: string;
  name: string;
  description: string;
  raceIds: string[];
  choiceGroup: string | null;
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
    const gift =
      eligible.find((item) => item.id === giftId);

    if (!gift) return;

    setSelected((current) => {
      if (gift.choiceGroup) {
        const groupIds =
          eligible
            .filter(
              (item) =>
                item.choiceGroup === gift.choiceGroup,
            )
            .map((item) => item.id);

        const wholeGroupSelected =
          groupIds.length > 0 &&
          groupIds.every((id) =>
            current.includes(id),
          );

        if (wholeGroupSelected) {
          return current.filter(
            (id) => !groupIds.includes(id),
          );
        }

        if (groupIds.length > 2) {
          return current;
        }

        return groupIds;
      }

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
    <div className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-100c09))] p-4 components_admin_admin_ancestry_gift_selector_div_container">
      <p className="text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-806b50))] components_admin_admin_ancestry_gift_selector_p_text">
        Ancestry Feats
      </p>

      <p className="mt-2 text-xs leading-5 text-[rgb(var(--sep-colour-8f8271))] components_admin_admin_ancestry_gift_selector_p_text_2">
        Choose up to two Feats available to the selected Ancestry. Changing
        Ancestry removes selections that are no longer eligible.
      </p>

      {selected.map((giftId) => (
        <input className="components_admin_admin_ancestry_gift_selector_input_ancestry_gift_ids"
          key={giftId}
          type="hidden"
          name="ancestryGiftIds"
          value={giftId}
        />
      ))}

      {eligible.length ? (
        <div className="mt-4 grid gap-2 md:grid-cols-2 components_admin_admin_ancestry_gift_selector_div_container_2">
          {eligible.map((gift) => {
            const checked = selected.includes(gift.id);
            const disabled = !checked && selected.length >= 2;

            return (
              <button
                key={gift.id}
                type="button"
                disabled={disabled}
                onClick={() => toggle(gift.id)}
                className={[((`border p-3 text-left transition ${
                  checked
                    ? "border-[rgb(var(--sep-colour-a17a49))] bg-[rgb(var(--sep-colour-2b1e13))]"
                    : "border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-0d0907))] hover:border-[rgb(var(--sep-colour-765937))]"
                } disabled:cursor-not-allowed disabled:opacity-35`)), "components_admin_admin_ancestry_gift_selector_button_action"].filter(Boolean).join(" ")}
              >
                <div className="flex items-start justify-between gap-2 components_admin_admin_ancestry_gift_selector_div_container_3">
                  <span className="font-serif text-sm text-[rgb(var(--sep-colour-d8bf91))] components_admin_admin_ancestry_gift_selector_span_text">
                    {gift.name}
                  </span>
                  <span className="text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-8a765a))] components_admin_admin_ancestry_gift_selector_span_text_2">
                    {checked ? "Selected" : "Choose"}
                  </span>
                </div>

                {gift.description ? (
                  <p className="mt-2 text-[10px] leading-5 text-[rgb(var(--sep-colour-817565))] components_admin_admin_ancestry_gift_selector_p_text_3">
                    {gift.description}
                  </p>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="mt-4 text-[10px] italic text-[rgb(var(--sep-colour-746958))] components_admin_admin_ancestry_gift_selector_p_text_4">
          No active Ancestry Feats are available for this Ancestry.
        </p>
      )}

      <p className="mt-3 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-6f6353))] components_admin_admin_ancestry_gift_selector_p_text_5">
        {selected.length} / 2 selected
      </p>
    </div>
  );
}
