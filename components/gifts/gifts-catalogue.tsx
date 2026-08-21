"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

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
  targetMode:
    | "self"
    | "other"
    | "either";
  durationMinutes: number | null;
  cooldownMinutes: number;
  successDie: number | null;
  successThreshold: number | null;
  successAttribute:
    | "muscles"
    | "reflexes"
    | "vigor"
    | "brains"
    | "shrewd"
    | "presence_score"
    | null;
  damageDice: string | null;
  damageType: string | null;
  healthDelta: number;
  maxHealthModifier: number;
  warpingAffinityModifier: number;
  warpsPerDayModifier: number;
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
    ["Affinity", gift.warpingAffinityModifier],
    ["Shapes/day", gift.warpsPerDayModifier],
  ]
    .filter(([, value]) => Number(value) !== 0)
    .map(
      ([label, value]) =>
        `${label} ${signed(Number(value))}`,
    );
}

const ATTRIBUTE_LABELS: Record<
  NonNullable<Gift["successAttribute"]>,
  string
> = {
  muscles: "Muscles",
  reflexes: "Reflexes",
  vigor: "Vigour",
  brains: "Brains",
  shrewd: "Shrewd",
  presence_score: "Presence",
};

function targetLabel(target: Gift["targetMode"]) {
  if (target === "other") return "Other character";
  if (target === "either") return "Self or other character";
  return "Self";
}

function successLabel(gift: Gift) {
  if (gift.effectMode === "passive") {
    return "No roll (Passive)";
  }

  if (!gift.successDie || !gift.successThreshold) {
    return "Automatic";
  }

  const attribute = gift.successAttribute
    ? ` + ${ATTRIBUTE_LABELS[gift.successAttribute]}`
    : "";

  return `d${gift.successDie}${attribute} ≥ ${gift.successThreshold}`;
}

function durationLabel(gift: Gift) {
  if (gift.effectMode === "passive") {
    return "Permanent while owned";
  }

  if (gift.effectMode !== "temporary") {
    return "Instant use";
  }

  if (gift.durationMinutes === 0) {
    return "Instantaneous";
  }

  return gift.durationMinutes
    ? `${gift.durationMinutes} min`
    : "Not set";
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

  useEffect(() => {
    const visibleGiftIds =
      filtered.map((gift) => gift.id);

    /*
     * The Feats catalogue and the portal context sidebar are separate
     * client components. Publish the catalogue's actual filtered result so
     * the sidebar always mirrors every filter on the page: type, Ancestry,
     * Order, name and description.
     */
    sessionStorage.setItem(
      "sepulchria:gifts-visible-ids",
      JSON.stringify(visibleGiftIds),
    );

    window.dispatchEvent(
      new CustomEvent(
        "sepulchria:gifts-filter-change",
        {
          detail: {
            ids: visibleGiftIds,
          },
        },
      ),
    );
  }, [filtered]);

  function reset() {
    setType("all");
    setAncestryId("");
    setOrderId("");
    setNameFilter("");
    setDescriptionFilter("");
  }

  return (
    <>
      <section className="mt-4 border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))] p-3">
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
            className="border border-[rgb(var(--sep-colour-765937))]/55 bg-[rgb(var(--sep-colour-21180f))] px-4 py-2 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-c8aa7b))] transition hover:border-[rgb(var(--sep-colour-9a7445))]"
          >
            Reset
          </button>
        </div>

        <div className="mt-2 flex items-center justify-between gap-3 border-t border-[rgb(var(--sep-colour-59432c))]/25 pt-2">
          <p className="text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-6f6353))]">
            A Feat may belong to more
            than one category.
          </p>

          <p className="text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-8a7558))]">
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
                id={`gift-${gift.id}`}
                className="scroll-mt-4 border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-100c09))] px-4 py-3"
              >
                <div className="grid gap-3 lg:grid-cols-[minmax(200px,0.8fr)_minmax(0,2.2fr)] lg:items-start">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {types.map(
                        (label) => (
                          <span
                            key={label}
                            className="border border-[rgb(var(--sep-colour-60482e))]/40 bg-[rgb(var(--sep-colour-17110d))] px-1.5 py-0.5 text-[6px] uppercase tracking-[0.1em] text-[rgb(var(--sep-colour-9b805c))]"
                          >
                            {label}
                          </span>
                        ),
                      )}

                      <span className="border border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-17110d))] px-1.5 py-0.5 text-[6px] uppercase tracking-[0.1em] text-[rgb(var(--sep-colour-746655))]">
                        {effectLabel(
                          gift,
                        )}
                      </span>
                    </div>

                    <h2 className="mt-1.5 truncate font-serif text-lg text-[rgb(var(--sep-colour-dec89f))]">
                      {gift.name}
                    </h2>

                    {modifiers.length ? (
                      <p className="mt-1 text-[7px] uppercase tracking-[0.08em] text-[rgb(var(--sep-colour-aa8c61))]">
                        {modifiers.join(
                          " · ",
                        )}
                      </p>
                    ) : null}
                  </div>

                  <p
                    className="whitespace-pre-line text-[11px] leading-5 text-[rgb(var(--sep-colour-9c8e7b))]"
                  >
                    {gift.description ||
                      "No description."}
                  </p>

                </div>

                <div className="mt-3 grid grid-cols-2 gap-1.5 border-t border-[rgb(var(--sep-colour-59432c))]/30 pt-3 md:grid-cols-3 xl:grid-cols-6">
                  <RecapBox
                    label="Use"
                    value={
                      <>
                        <span>
                          {gift.effectMode === "temporary"
                            ? "Activated"
                            : gift.effectMode === "passive"
                              ? "Passive"
                              : "Standard"}
                        </span>
                        <span className="text-[rgb(var(--sep-colour-725f49))]"> · </span>
                        <span>{targetLabel(gift.targetMode)}</span>
                      </>
                    }
                  />

                  <RecapBox
                    label="Success"
                    value={successLabel(gift)}
                  />

                  <RecapBox
                    label="Timing"
                    value={
                      <>
                        <span>{durationLabel(gift)}</span>
                        <span className="text-[rgb(var(--sep-colour-725f49))]"> · </span>
                        <span>
                          {gift.effectMode === "temporary"
                            ? gift.cooldownMinutes === 0
                              ? "No cooldown"
                              : `${gift.cooldownMinutes} min cooldown`
                            : "No cooldown"}
                        </span>
                      </>
                    }
                  />

                  <RecapBox
                    label="Health / Damage"
                    value={
                      <>
                        <span>
                          {gift.damageDice
                            ? `${gift.damageDice}${
                                gift.damageType
                                  ? ` ${gift.damageType}`
                                  : ""
                              }`
                            : "No damage"}
                        </span>
                        <span className="text-[rgb(var(--sep-colour-725f49))]"> · </span>
                        <span>
                          HP{" "}
                          {gift.healthDelta !== 0
                            ? signed(gift.healthDelta)
                            : "—"}
                        </span>
                        <span className="text-[rgb(var(--sep-colour-725f49))]"> · </span>
                        <span>
                          Max{" "}
                          {gift.maxHealthModifier !== 0
                            ? signed(gift.maxHealthModifier)
                            : "—"}
                        </span>
                      </>
                    }
                  />

                  <RecapBox
                    label="Attributes"
                    value={
                      modifiers.length
                        ? modifiers.join(" · ")
                        : "None"
                    }
                  />

                  <RecapBox
                    label="Eligibility"
                    value={
                      <div className="space-y-0.5">
                        <p>
                          {ancestryText
                            ? `Ancestry: ${ancestryText}`
                            : "Ancestry: None"}
                        </p>
                        <p>
                          {orderText
                            ? `Order: ${orderText}`
                            : "Order: None"}
                        </p>
                        <p>
                          General: {gift.isGeneral ? "Yes" : "No"}
                        </p>

                        {gift.roles.length ? (
                          <details className="pt-0.5">
                            <summary className="cursor-pointer text-[rgb(var(--sep-colour-b99a6d))] hover:text-[rgb(var(--sep-colour-dbc294))]">
                              Roles: {gift.roles.length}
                            </summary>

                            <div className="mt-1 max-h-24 overflow-y-auto border-l border-[rgb(var(--sep-colour-59432c))]/35 pl-2 text-[rgb(var(--sep-colour-8f8271))]">
                              {gift.roles.map((role) => (
                                <p key={role.id}>
                                  {role.orderName
                                    ? `${role.orderName} · `
                                    : ""}
                                  {role.level !== null
                                    ? `L${role.level} · `
                                    : ""}
                                  {role.name}
                                </p>
                              ))}
                            </div>
                          </details>
                        ) : (
                          <p>Roles: None</p>
                        )}
                      </div>
                    }
                  />
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <section className="mt-3 border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-100c09))] p-5 text-xs italic text-[rgb(var(--sep-colour-817565))]">
          No Feats match the selected
          filters.
        </section>
      )}
    </>
  );
}

function RecapBox({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="min-w-0 border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-15100d))] px-2.5 py-2">
      <p className="text-[6px] uppercase tracking-[0.13em] text-[rgb(var(--sep-colour-806a4c))]">
        {label}
      </p>
      <div className="mt-1 min-w-0 break-words text-[8px] leading-4 text-[rgb(var(--sep-colour-b8a382))]">
        {value}
      </div>
    </div>
  );
}

const controlClass =
  "min-w-0 border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-15100d))] px-3 py-2 text-[10px] text-[rgb(var(--sep-colour-d1bea0))] outline-none placeholder:text-[rgb(var(--sep-colour-665b4d))] focus:border-[rgb(var(--sep-colour-987344))]";