"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

export type GiftCard = {
  id: string;
  name: string;
  description: string;
  isGeneral: boolean;
  effectMode: "none" | "passive" | "temporary";
  targetMode: "self" | "other" | "either";
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
  ancestries: { id: string; name: string }[];
  roles: {
    id: string;
    name: string;
    level: number | null;
    orderId: string | null;
    orderName: string | null;
  }[];
  ownershipState?: string | null;
};

type GiftType = "all" | "ancestry" | "order" | "general";

const controlClass =
  "w-full border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-[9px] text-[rgb(var(--sep-colour-cbb89a))] outline-none transition focus:border-[rgb(var(--sep-colour-987344))]";

const ATTRIBUTE_LABELS: Record<
  NonNullable<GiftCard["successAttribute"]>,
  string
> = {
  muscles: "Muscles",
  reflexes: "Reflexes",
  vigor: "Vigour",
  brains: "Brains",
  shrewd: "Shrewd",
  presence_score: "Presence",
};

function signed(value: number) {
  return value > 0 ? `+${value}` : String(value);
}

function effectLabel(gift: GiftCard) {
  if (gift.effectMode === "passive") return "Passive";
  if (gift.effectMode === "temporary") {
    return gift.durationMinutes
      ? `${gift.durationMinutes} min`
      : "Temporary";
  }
  return "Standard";
}

function targetLabel(target: GiftCard["targetMode"]) {
  if (target === "other") return "Other";
  if (target === "either") return "Self / Other";
  return "Self";
}

function successLabel(gift: GiftCard) {
  if (gift.effectMode === "passive") return "No roll · Passive";
  if (!gift.successDie || !gift.successThreshold) return "Automatic";

  const attribute = gift.successAttribute
    ? ` + ${ATTRIBUTE_LABELS[gift.successAttribute]}`
    : "";

  return `d${gift.successDie}${attribute} ≥ ${gift.successThreshold}`;
}

function durationLabel(gift: GiftCard) {
  if (gift.effectMode === "passive") return "Permanent while owned";
  if (gift.effectMode !== "temporary") return "Instant use";
  if (gift.durationMinutes === 0) return "Instantaneous";
  return gift.durationMinutes ? `${gift.durationMinutes} min` : "Not set";
}

function typeLabels(gift: GiftCard) {
  const labels: string[] = [];
  if (gift.ancestries.length) labels.push("Ancestry");
  if (gift.roles.length) labels.push("Order");
  if (gift.isGeneral) labels.push("General");
  return labels;
}

function modifierLabels(gift: GiftCard) {
  return [
    ["Health", gift.healthDelta],
    ["Max Health", gift.maxHealthModifier],
    ["Muscles", gift.modifiers.muscles],
    ["Reflexes", gift.modifiers.reflexes],
    ["Vigour", gift.modifiers.vigour],
    ["Shrewd", gift.modifiers.shrewd],
    ["Brains", gift.modifiers.brains],
    ["Presence", gift.modifiers.presence],
    ["Affinity", gift.warpingAffinityModifier],
    ["Shapes/day", gift.warpsPerDayModifier],
  ]
    .filter(([, value]) => Number(value) !== 0)
    .map(([label, value]) => `${label} ${signed(Number(value))}`);
}

function RecapBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-100c09))] px-2.5 py-2">
      <p className="text-[6px] uppercase tracking-[0.13em] text-[rgb(var(--sep-colour-806a4c))]">
        {label}
      </p>

      <p className="mt-1 break-words text-[8px] leading-4 text-[rgb(var(--sep-colour-b8a382))]">
        {value}
      </p>
    </div>
  );
}

function FeatCard({
  gift,
}: {
  gift: GiftCard;
}) {
  const modifiers =
    modifierLabels(gift);

  const types =
    typeLabels(gift);

  const ancestryText =
    gift.ancestries
      .map((ancestry) => ancestry.name)
      .join(", ");

  const orders =
    Array.from(
      new Set(
        gift.roles
          .map((role) => role.orderName)
          .filter(Boolean),
      ),
    ).join(", ");

  return (
    <article
  id={`gift-${gift.id}`}
  className="min-h-[430px] scroll-mt-4 border border-[rgb(var(--sep-colour-8d6d3e))]/65 bg-[rgb(var(--sep-colour-18110c))] p-4"
>
      <div className="flex gap-3">
        

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-serif text-base text-[rgb(var(--sep-colour-dec89f))]">
                {gift.name}
              </p>

              <p className="mt-1 text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-776957))]">
                {types.length
                  ? types.join(" · ")
                  : "Feat"}
                {" · "}
                {effectLabel(gift)}
              </p>

              <p className="mt-1 text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-9b815d))]">
                {targetLabel(gift.targetMode)}
                {" · "}
                {durationLabel(gift)}
              </p>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {gift.ownershipState ? (
                <span className="border border-[rgb(var(--sep-colour-8d6d3e))]/55 bg-[rgb(var(--sep-colour-21180f))] px-2 py-1 text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-d3b278))]">
                  {gift.ownershipState}
                </span>
              ) : null}

              {types.map((label) => (
                <span
                  key={label}
                  className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-17110d))] px-2 py-1 text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-a88d67))]"
                >
                  {label}
                </span>
              ))}

              <span className="border border-[rgb(var(--sep-colour-49634f))]/55 px-2 py-1 text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-9cbe9f))]">
                {effectLabel(gift)}
              </span>
            </div>
          </div>

          {gift.description?.trim() ? (
            <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-[rgb(var(--sep-colour-9f927f))]">
              {gift.description}
            </p>
          ) : null}

          <div className="mt-2 grid grid-cols-2 gap-1.5 border-t border-[rgb(var(--sep-colour-59432c))]/30 pt-2 sm:grid-cols-3">
            <RecapBox
              label="Target"
              value={targetLabel(gift.targetMode)}
            />

            <RecapBox
              label="Success"
              value={successLabel(gift)}
            />

            <RecapBox
              label="Timing"
              value={`${durationLabel(gift)} · ${
                gift.cooldownMinutes
                  ? `${gift.cooldownMinutes} min cooldown`
                  : "No cooldown"
              }`}
            />
          </div>

          <div className="mt-3 border-t border-[rgb(var(--sep-colour-59432c))]/30 pt-2">
            <p className="text-[7px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-806b50))]">
              Effects
            </p>

            <div className="mt-2 flex flex-wrap gap-1.5">
              {gift.damageDice ? (
                <span className="border border-red-900/65 bg-red-950/20 px-2 py-1 text-[7px] uppercase tracking-[0.1em] text-red-400">
                  Damage · {gift.damageDice}
                  {gift.damageType
                    ? ` ${gift.damageType}`
                    : ""}
                </span>
              ) : null}

              {gift.healthDelta !== 0 ? (
                <span
                  className={`border px-2 py-1 text-[7px] uppercase tracking-[0.1em] ${
                    gift.healthDelta > 0
                      ? "border-emerald-900/65 bg-emerald-950/20 text-emerald-400"
                      : "border-red-900/65 bg-red-950/20 text-red-400"
                  }`}
                >
                  Health · {signed(gift.healthDelta)}
                </span>
              ) : null}

              {gift.maxHealthModifier !== 0 ? (
                <span
                  className={`border px-2 py-1 text-[7px] uppercase tracking-[0.1em] ${
                    gift.maxHealthModifier > 0
                      ? "border-emerald-900/65 bg-emerald-950/20 text-emerald-400"
                      : "border-red-900/65 bg-red-950/20 text-red-400"
                  }`}
                >
                  Max Health · {signed(gift.maxHealthModifier)}
                </span>
              ) : null}

              {modifiers.map((modifier) => (
                <span
                  key={modifier}
                  className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-17110d))] px-2 py-1 text-[7px] uppercase tracking-[0.1em] text-[rgb(var(--sep-colour-a88d67))]"
                >
                  {modifier}
                </span>
              ))}

              {!gift.damageDice &&
              gift.healthDelta === 0 &&
              gift.maxHealthModifier === 0 &&
              !modifiers.length ? (
                <span className="text-[8px] italic leading-4 text-[rgb(var(--sep-colour-756957))]">
                  No direct mechanical modifiers.
                </span>
              ) : null}
            </div>
          </div>

          {ancestryText || orders || gift.isGeneral ? (
            <div className="mt-3 border-t border-[rgb(var(--sep-colour-59432c))]/30 pt-2.5">
              <p className="text-[7px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-806b50))]">
                Available through
              </p>

              <div className="mt-2 flex flex-wrap gap-1.5">
                {ancestryText ? (
                  <span className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-17110d))] px-2 py-1 text-[7px] uppercase tracking-[0.1em] text-[rgb(var(--sep-colour-a88d67))]">
                    Ancestry · {ancestryText}
                  </span>
                ) : null}

                {orders ? (
                  <span className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-17110d))] px-2 py-1 text-[7px] uppercase tracking-[0.1em] text-[rgb(var(--sep-colour-a88d67))]">
                    Order · {orders}
                  </span>
                ) : null}

                {gift.isGeneral ? (
                  <span className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-17110d))] px-2 py-1 text-[7px] uppercase tracking-[0.1em] text-[rgb(var(--sep-colour-a88d67))]">
                    General
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function GiftsCatalogue({
  gifts,
  characterMode = false,
}: {
  gifts: GiftCard[];
  characterMode?: boolean;
}) {
  const [type, setType] = useState<GiftType>("all");
  const [ancestryId, setAncestryId] = useState("");
  const [orderId, setOrderId] = useState("");
  const [search, setSearch] = useState("");
  const [effectMode, setEffectMode] = useState("");
  const [targetMode, setTargetMode] = useState("");

  const ancestries = useMemo(() => {
    const byId = new Map<string, string>();

    for (const gift of gifts) {
      for (const ancestry of gift.ancestries) {
        byId.set(ancestry.id, ancestry.name);
      }
    }

    return Array.from(byId, ([id, name]) => ({ id, name })).sort(
      (a, b) => a.name.localeCompare(b.name),
    );
  }, [gifts]);

  const orders = useMemo(() => {
    const byId = new Map<string, string>();

    for (const gift of gifts) {
      for (const role of gift.roles) {
        if (role.orderId && role.orderName) {
          byId.set(role.orderId, role.orderName);
        }
      }
    }

    return Array.from(byId, ([id, name]) => ({ id, name })).sort(
      (a, b) => a.name.localeCompare(b.name),
    );
  }, [gifts]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return gifts.filter((gift) => {
      if (
        query &&
        !`${gift.name} ${gift.description}`
          .toLowerCase()
          .includes(query)
      ) {
        return false;
      }

      if (effectMode && gift.effectMode !== effectMode) return false;
      if (targetMode && gift.targetMode !== targetMode) return false;

      if (type === "ancestry" && !gift.ancestries.length) return false;
      if (type === "order" && !gift.roles.length) return false;
      if (type === "general" && !gift.isGeneral) return false;

      if (
        ancestryId &&
        !gift.ancestries.some((ancestry) => ancestry.id === ancestryId)
      ) {
        return false;
      }

      if (
        orderId &&
        !gift.roles.some((role) => role.orderId === orderId)
      ) {
        return false;
      }

      return true;
    });
  }, [
    gifts,
    search,
    effectMode,
    targetMode,
    type,
    ancestryId,
    orderId,
  ]);

  useEffect(() => {
    const ids = filtered.map((gift) => gift.id);

    sessionStorage.setItem(
      "sepulchria:gifts-visible-ids",
      JSON.stringify(ids),
    );

    window.dispatchEvent(
      new CustomEvent("sepulchria:gifts-filter-change", {
        detail: { ids },
      }),
    );
  }, [filtered]);

  function reset() {
    setType("all");
    setAncestryId("");
    setOrderId("");
    setSearch("");
    setEffectMode("");
    setTargetMode("");
  }

  return (
    <>
      <section className="mt-5 border border-[rgb(var(--sep-colour-60482e))]/40 bg-[rgb(var(--sep-colour-120e0b))] p-3 sm:p-4">
        <div className="grid gap-2 lg:grid-cols-2 xl:grid-cols-[minmax(220px,2fr)_repeat(5,minmax(0,1fr))_auto]">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search Feats..."
            className={controlClass}
          />

          <select
            value={effectMode}
            onChange={(event) => setEffectMode(event.target.value)}
            className={controlClass}
          >
            <option value="">All Effects</option>
            <option value="none">Standard</option>
            <option value="passive">Passive</option>
            <option value="temporary">Temporary</option>
          </select>

          <select
            value={targetMode}
            onChange={(event) => setTargetMode(event.target.value)}
            className={controlClass}
          >
            <option value="">All Targets</option>
            <option value="self">Self</option>
            <option value="other">Other</option>
            <option value="either">Self / Other</option>
          </select>

          {!characterMode ? (
            <>
              <select
                value={type}
                onChange={(event) =>
                  setType(event.target.value as GiftType)
                }
                className={controlClass}
              >
                <option value="all">All Types</option>
                <option value="ancestry">Ancestry</option>
                <option value="order">Order</option>
                <option value="general">General</option>
              </select>

              <select
                value={ancestryId}
                onChange={(event) => setAncestryId(event.target.value)}
                className={controlClass}
              >
                <option value="">All Ancestries</option>
                {ancestries.map((ancestry) => (
                  <option key={ancestry.id} value={ancestry.id}>
                    {ancestry.name}
                  </option>
                ))}
              </select>

              <select
                value={orderId}
                onChange={(event) => setOrderId(event.target.value)}
                className={controlClass}
              >
                <option value="">All Orders</option>
                {orders.map((order) => (
                  <option key={order.id} value={order.id}>
                    {order.name}
                  </option>
                ))}
              </select>
            </>
          ) : null}

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
            Live filtering
          </p>
          <p className="text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-8a7558))]">
            {filtered.length} / {gifts.length}
          </p>
        </div>
      </section>

      {filtered.length ? (
        <section className="mt-3 grid items-start gap-3 md:grid-cols-2">
          {filtered.map((gift) => (
            <FeatCard key={gift.id} gift={gift} />
          ))}
        </section>
      ) : (
        <p className="mt-3 border border-[rgb(var(--sep-colour-59432c))]/30 bg-[rgb(var(--sep-colour-100c09))] p-4 text-[11px] text-[rgb(var(--sep-colour-8f8271))]">
          No Feats match these filters.
        </p>
      )}
    </>
  );
}
