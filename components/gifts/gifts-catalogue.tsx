"use client";

import { useMemo, useState } from "react";

type GiftType =
  | "all"
  | "ancestry"
  | "order"
  | "general";

type Gift = {
  id: string;
  name: string;
  description: string;
  isGeneral: boolean;
  effectMode:
    | "none"
    | "passive"
    | "temporary";
  durationMinutes: number | null;
  cooldownMinutes: number;
  healthDelta: number;
  maxHealthModifier: number;
  modifiers: {
    muscles: number;
    reflexes: number;
    vigour: number;
    shrewd: number;
    brains: number;
    presence: number;
  };
  ancestries: {
    id: string;
    name: string;
  }[];
  roles: {
    id: string;
    name: string;
    level: number | null;
    orderId: string | null;
    orderName: string | null;
  }[];
};

function signed(value: number) {
  return value > 0
    ? `+${value}`
    : String(value);
}

function effectLabel(gift: Gift) {
  if (gift.effectMode === "passive") {
    return "Passive";
  }

  if (gift.effectMode === "temporary") {
    return gift.durationMinutes
      ? `${gift.durationMinutes} min`
      : "Temporary";
  }

  return "Feat";
}

function typeLabels(gift: Gift) {
  const labels: string[] = [];

  if (gift.ancestries.length) {
    labels.push("Ancestry");
  }

  if (gift.roles.length) {
    labels.push("Order");
  }

  if (gift.isGeneral) {
    labels.push("General");
  }

  return labels;
}

function modifierLabels(gift: Gift) {
  return [
    ["HP", gift.healthDelta],
    ["Max HP", gift.maxHealthModifier],
    ["Mus", gift.modifiers.muscles],
    ["Ref", gift.modifiers.reflexes],
    ["Vig", gift.modifiers.vigour],
    ["Shr", gift.modifiers.shrewd],
    ["Bra", gift.modifiers.brains],
    ["Pre", gift.modifiers.presence],
  ]
    .filter(([, value]) => Number(value) !== 0)
    .map(
      ([label, value]) =>
        `${label} ${signed(Number(value))}`,
    );
}

export function GiftsCatalogue({
  gifts,
}: {
  gifts: Gift[];
}) {
  const [type, setType] =
    useState<GiftType>("all");

  const [ancestryId, setAncestryId] =
    useState("");

  const [orderId, setOrderId] =
    useState("");

  const [nameFilter, setNameFilter] =
    useState("");

  const [
    descriptionFilter,
    setDescriptionFilter,
  ] = useState("");

  const ancestries = useMemo(() => {
    const byId =
      new Map<string, string>();

    for (const gift of gifts) {
      for (
        const ancestry
        of gift.ancestries
      ) {
        byId.set(
          ancestry.id,
          ancestry.name,
        );
      }
    }

    return Array.from(
      byId,
      ([id, name]) => ({
        id,
        name,
      }),
    ).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [gifts]);

  const orders = useMemo(() => {
    const byId =
      new Map<string, string>();

    for (const gift of gifts) {
      for (const role of gift.roles) {
        if (
          role.orderId &&
          role.orderName
        ) {
          byId.set(
            role.orderId,
            role.orderName,
          );
        }
      }
    }

    return Array.from(
      byId,
      ([id, name]) => ({
        id,
        name,
      }),
    ).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [gifts]);

  const filtered = useMemo(() => {
    const nameQuery =
      nameFilter
        .trim()
        .toLowerCase();

    const descriptionQuery =
      descriptionFilter
        .trim()
        .toLowerCase();

    return gifts.filter((gift) => {
      if (
        type === "ancestry" &&
        gift.ancestries.length === 0
      ) {
        return false;
      }

      if (
        type === "order" &&
        gift.roles.length === 0
      ) {
        return false;
      }

      if (
        type === "general" &&
        !gift.isGeneral
      ) {
        return false;
      }

      if (
        ancestryId &&
        !gift.ancestries.some(
          (ancestry) =>
            ancestry.id ===
            ancestryId,
        )
      ) {
        return false;
      }

      if (
        orderId &&
        !gift.roles.some(
          (role) =>
            role.orderId === orderId,
        )
      ) {
        return false;
      }

      if (
        nameQuery &&
        !gift.name
          .toLowerCase()
          .includes(nameQuery)
      ) {
        return false;
      }

      if (
        descriptionQuery &&
        !gift.description
          .toLowerCase()
          .includes(
            descriptionQuery,
          )
      ) {
        return false;
      }

      return true;
    });
  }, [
    gifts,
    type,
    ancestryId,
    orderId,
    nameFilter,
    descriptionFilter,
  ]);

  function reset() {
    setType("all");
    setAncestryId("");
    setOrderId("");
    setNameFilter("");
    setDescriptionFilter("");
  }

  return (
    <>
      <section className="mt-4 border border-[#59432c]/45 bg-[#100c09] p-3">
        <div className="grid gap-2 xl:grid-cols-[150px_1fr_1fr_1fr_1fr_auto]">
          <select
            value={type}
            onChange={(event) =>
              setType(
                event.target
                  .value as GiftType,
              )
            }
            className={controlClass}
          >
            <option value="all">
              All types
            </option>
            <option value="ancestry">
              Ancestry
            </option>
            <option value="order">
              Order
            </option>
            <option value="general">
              General
            </option>
          </select>

          <select
            value={ancestryId}
            onChange={(event) =>
              setAncestryId(
                event.target.value,
              )
            }
            className={controlClass}
          >
            <option value="">
              All Ancestries
            </option>

            {ancestries.map(
              (ancestry) => (
                <option
                  key={ancestry.id}
                  value={ancestry.id}
                >
                  {ancestry.name}
                </option>
              ),
            )}
          </select>

          <select
            value={orderId}
            onChange={(event) =>
              setOrderId(
                event.target.value,
              )
            }
            className={controlClass}
          >
            <option value="">
              All Orders
            </option>

            {orders.map((order) => (
              <option
                key={order.id}
                value={order.id}
              >
                {order.name}
              </option>
            ))}
          </select>

          <input
            type="search"
            value={nameFilter}
            onChange={(event) =>
              setNameFilter(
                event.target.value,
              )
            }
            placeholder="Filter name..."
            className={controlClass}
          />

          <input
            type="search"
            value={descriptionFilter}
            onChange={(event) =>
              setDescriptionFilter(
                event.target.value,
              )
            }
            placeholder="Filter description..."
            className={controlClass}
          />

          <button
            type="button"
            onClick={reset}
            className="border border-[#765937]/55 bg-[#21180f] px-4 py-2 text-[8px] uppercase tracking-[0.14em] text-[#c8aa7b] transition hover:border-[#9a7445]"
          >
            Reset
          </button>
        </div>

        <div className="mt-2 flex items-center justify-between gap-3 border-t border-[#59432c]/25 pt-2">
          <p className="text-[7px] uppercase tracking-[0.12em] text-[#6f6353]">
            A Feat may belong to more
            than one category.
          </p>

          <p className="text-[7px] uppercase tracking-[0.12em] text-[#8a7558]">
            {filtered.length} /{" "}
            {gifts.length}
          </p>
        </div>
      </section>

      {filtered.length ? (
        <section className="mt-3 space-y-2">
          {filtered.map((gift) => {
            const modifiers =
              modifierLabels(gift);

            const types =
              typeLabels(gift);

            const ancestryText =
              gift.ancestries
                .map(
                  (ancestry) =>
                    ancestry.name,
                )
                .join(", ");

            const orderText =
              Array.from(
                new Set(
                  gift.roles
                    .map(
                      (role) =>
                        role.orderName,
                    )
                    .filter(Boolean),
                ),
              ).join(", ");

            return (
              <article
                key={gift.id}
                className="border border-[#59432c]/40 bg-[#100c09] px-4 py-3"
              >
                <div className="grid gap-3 lg:grid-cols-[minmax(180px,0.8fr)_minmax(260px,1.6fr)_minmax(180px,1fr)] lg:items-start">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {types.map(
                        (label) => (
                          <span
                            key={label}
                            className="border border-[#60482e]/40 bg-[#17110d] px-1.5 py-0.5 text-[6px] uppercase tracking-[0.1em] text-[#9b805c]"
                          >
                            {label}
                          </span>
                        ),
                      )}

                      <span className="border border-[#60482e]/35 bg-[#17110d] px-1.5 py-0.5 text-[6px] uppercase tracking-[0.1em] text-[#746655]">
                        {effectLabel(
                          gift,
                        )}
                      </span>
                    </div>

                    <h2 className="mt-1.5 truncate font-serif text-lg text-[#dec89f]">
                      {gift.name}
                    </h2>

                    {modifiers.length ? (
                      <p className="mt-1 text-[7px] uppercase tracking-[0.08em] text-[#aa8c61]">
                        {modifiers.join(
                          " · ",
                        )}
                      </p>
                    ) : null}
                  </div>

                  <p
                    className="line-clamp-3 text-[11px] leading-5 text-[#9c8e7b]"
                    title={
                      gift.description
                    }
                  >
                    {gift.description ||
                      "No description."}
                  </p>

                  <div className="space-y-1 text-[8px] leading-4 text-[#7d7161]">
                    {ancestryText ? (
                      <p className="truncate">
                        <span className="uppercase tracking-[0.1em] text-[#9f825b]">
                          Ancestry:
                        </span>{" "}
                        {ancestryText}
                      </p>
                    ) : null}

                    {orderText ? (
                      <p className="truncate">
                        <span className="uppercase tracking-[0.1em] text-[#9f825b]">
                          Order:
                        </span>{" "}
                        {orderText}
                      </p>
                    ) : null}

                    {gift.isGeneral ? (
                      <p>
                        <span className="uppercase tracking-[0.1em] text-[#9f825b]">
                          General:
                        </span>{" "}
                        Yes
                      </p>
                    ) : null}

                    {gift.effectMode === "temporary" ? (
                      <p>
                        <span className="uppercase tracking-[0.1em] text-[#9f825b]">
                          Cooldown:
                        </span>{" "}
                        {gift.cooldownMinutes === 0
                          ? "None"
                          : `${gift.cooldownMinutes} min`}
                      </p>
                    ) : null}

                    {gift.roles.length ? (
                      <details className="pt-0.5">
                        <summary className="cursor-pointer text-[7px] uppercase tracking-[0.1em] text-[#91754f] hover:text-[#c3a06d]">
                          Show linked roles
                        </summary>

                        <div className="mt-1 max-h-28 overflow-y-auto border-l border-[#59432c]/35 pl-2 text-[8px] leading-4">
                          {gift.roles.map(
                            (role) => (
                              <p key={role.id}>
                                {role.orderName
                                  ? `${role.orderName} · `
                                  : ""}
                                {role.level !==
                                null
                                  ? `L${role.level} · `
                                  : ""}
                                {role.name}
                              </p>
                            ),
                          )}
                        </div>
                      </details>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <section className="mt-3 border border-[#59432c]/40 bg-[#100c09] p-5 text-xs italic text-[#817565]">
          No Feats match the selected
          filters.
        </section>
      )}
    </>
  );
}

const controlClass =
  "min-w-0 border border-[#59432c]/45 bg-[#15100d] px-3 py-2 text-[10px] text-[#d1bea0] outline-none placeholder:text-[#665b4d] focus:border-[#987344]";
