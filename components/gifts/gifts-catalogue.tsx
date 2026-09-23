"use client";

import {
  useEffect,
  useMemo,
  useRef,
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
  healthDice: string | null;
  mechanicsShape?: Record<string, any> | null;
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
  return "Activated";
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

function minutesLabel(minutes: number) {
  const value = Math.max(0, Math.trunc(minutes));

  if (value > 0 && value % 1440 === 0) {
    const days = value / 1440;
    return `${days} ${days === 1 ? "day" : "days"}`;
  }

  if (value > 0 && value % 60 === 0) {
    const hours = value / 60;
    return `${hours} ${hours === 1 ? "hour" : "hours"}`;
  }

  return `${value} ${value === 1 ? "minute" : "minutes"}`;
}

function durationLabel(gift: GiftCard) {
  if (gift.effectMode === "passive") return "Permanent while owned";
  if (gift.effectMode === "none") return "Instantaneous";
  if (gift.durationMinutes === 0) return "Instantaneous";
  return gift.durationMinutes ? minutesLabel(gift.durationMinutes) : "Not set";
}

function mechanicalDurationLabel(
  shape: Record<string, any>,
) {
  if (shape.is_instantaneous) return "Instantaneous";
  if (shape.duration_unit === "until_dispelled") return "Until Dispelled";
  return `${shape.duration_amount ?? 1} ${shape.duration_unit ?? "minutes"}`;
}

function mechanicalProfileSummary(
  shape: Record<string, any>,
  profile: "self" | "other" | "other_alt",
) {
  const values: string[] = [];

  const damage = String(shape[`${profile}_damage_dice`] ?? "").trim();
  if (damage) {
    values.push(
      `Damage ${damage}${shape.damage_type ? ` ${shape.damage_type}` : ""}`,
    );
  }

  const healing = String(shape[`${profile}_heal_dice`] ?? "").trim();
  if (healing) values.push(`Healing ${healing}`);

  const conditions = Array.isArray(shape[`${profile}_conditions`])
    ? shape[`${profile}_conditions`]
    : [];

  if (conditions.length) values.push(conditions.join(", "));

  return values.join(" · ");
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

const FEAT_ANCESTRY_BACKGROUND_SLUGS: Record<string, string> = {
  "Aelari": "aelari",
  "Birdfolk": "birdfolk",
  "Cambions": "cambions",
  "Dwarves": "dwarves",
  "Fair Folk": "fair-folk",
  "Gharuk": "gharuk",
  "Littlings": "littlings",
  "Humans": "humans",
  "Karesh": "karesh",
  "Reptilian Folk": "reptilian-folk",
  "Siranthi": "siranthi",
  "Vampires": "vampires",
  "Vaskari": "vaskari",
  "Werewolves": "werewolves",
};

function featBackgroundSlug(name: string) {
  return (
    FEAT_ANCESTRY_BACKGROUND_SLUGS[name] ??
    name
      .trim()
      .toLowerCase()
      .replace(/[\'’]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
  );
}

function featBackgroundImage(gift: GiftCard) {
  if (gift.ancestries.length === 1) {
    return `/backgrounds/feats/ancestries/${featBackgroundSlug(
      gift.ancestries[0].name,
    )}.png`;
  }

  if (gift.ancestries.length > 1) {
    return "/backgrounds/feats/ancestry.png";
  }

  if (gift.roles.length > 0) {
    return "/backgrounds/feats/order.png";
  }

  return "/backgrounds/feats/general.png";
}

function RecapBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-100c09))] px-2.5 py-2 components_gifts_gifts_catalogue_div_container">
      <p className="text-[6px] uppercase tracking-[0.13em] text-[rgb(var(--sep-colour-806a4c))] components_gifts_gifts_catalogue_p_text">
        {label}
      </p>

      <p className="mt-1 break-words text-[8px] leading-4 text-[rgb(var(--sep-colour-b8a382))] components_gifts_gifts_catalogue_p_text_2">
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

  const backgroundImage =
    featBackgroundImage(gift);

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
      data-sep-interactive-surface="card"
      data-feat-background={backgroundImage}
      style={{
        backgroundImage: `
          linear-gradient(
            rgb(var(--sep-colour-100d0b) / 80%),
            rgb(var(--sep-colour-100d0b) / 80%)
          ),
          url("${backgroundImage}")
        `,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
      className="relative min-h-[430px] scroll-mt-4 overflow-hidden border border-[rgb(var(--sep-colour-8d6d3e))]/65 bg-[rgb(var(--sep-colour-18110c))] p-4 components_gifts_gifts_catalogue_article_article"
    >
      <div className="relative z-[1] flex gap-3 components_gifts_gifts_catalogue_div_container_2">
        

        <div className="min-w-0 flex-1 components_gifts_gifts_catalogue_div_container_3">
          <div className="flex flex-wrap items-start justify-between gap-2 components_gifts_gifts_catalogue_div_container_4">
            <div className="min-w-0 components_gifts_gifts_catalogue_div_container_5">
              <p className="font-serif text-base text-[rgb(var(--sep-colour-dec89f))] components_gifts_gifts_catalogue_p_text_3">
                {gift.name}
              </p>

              <p className="mt-1 text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-776957))] components_gifts_gifts_catalogue_p_text_4">
                {types.length
                  ? types.join(" · ")
                  : "Feat"}
                {" · "}
                {effectLabel(gift)}
              </p>

              <p className="mt-1 text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-9b815d))] components_gifts_gifts_catalogue_p_text_5">
                {targetLabel(gift.targetMode)}
                {" · "}
                {durationLabel(gift)}
              </p>
            </div>

            <div className="flex flex-wrap gap-1.5 components_gifts_gifts_catalogue_div_container_6">
              {gift.ownershipState ? (
                <span className="border border-[rgb(var(--sep-colour-8d6d3e))]/55 bg-[rgb(var(--sep-colour-21180f))] px-2 py-1 text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-d3b278))] components_gifts_gifts_catalogue_span_text">
                  {gift.ownershipState}
                </span>
              ) : null}

              {types.map((label) => (
                <span
                  key={label}
                  className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-17110d))] px-2 py-1 text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-a88d67))] components_gifts_gifts_catalogue_span_text_2"
                >
                  {label}
                </span>
              ))}

              <span className="border border-[rgb(var(--sep-colour-49634f))]/55 px-2 py-1 text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-9cbe9f))] components_gifts_gifts_catalogue_span_text_3">
                {effectLabel(gift)}
              </span>
            </div>
          </div>

          {gift.description?.trim() ? (
            <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-[rgb(var(--sep-colour-9f927f))] components_gifts_gifts_catalogue_p_text_6">
              {gift.description}
            </p>
          ) : null}

          <div className="mt-2 grid grid-cols-2 gap-1.5 border-t border-[rgb(var(--sep-colour-59432c))]/30 pt-2 sm:grid-cols-3 components_gifts_gifts_catalogue_div_container_7">
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
                  ? `${minutesLabel(gift.cooldownMinutes)} cooldown`
                  : "No cooldown"
              }`}
            />
          </div>

          {gift.mechanicsShape ? (
            <div className="mt-3 border-t border-[rgb(var(--sep-colour-59432c))]/30 pt-2">
              <p className="text-[7px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-806b50))]">
                Advanced Mechanics
              </p>

              <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                <RecapBox
                  label="Target / Duration"
                  value={`${gift.mechanicsShape.target_mode ?? "self"} · ${
                    gift.mechanicsShape.target_scope === "multiple"
                      ? `up to ${gift.mechanicsShape.max_targets ?? 1}`
                      : "single"
                  } · ${mechanicalDurationLabel(gift.mechanicsShape)}`}
                />

                <RecapBox
                  label="Resolution"
                  value={`Self: ${gift.mechanicsShape.self_resolution_mode ?? "automatic"} · Other: ${gift.mechanicsShape.other_resolution_mode ?? "automatic"}`}
                />
              </div>

              {mechanicalProfileSummary(gift.mechanicsShape, "self") ? (
                <p className="mt-2 text-[8px] leading-4 text-[rgb(var(--sep-colour-a99577))]">
                  <b>Self:</b>{" "}
                  {mechanicalProfileSummary(gift.mechanicsShape, "self")}
                </p>
              ) : null}

              {mechanicalProfileSummary(gift.mechanicsShape, "other") ? (
                <p className="mt-1 text-[8px] leading-4 text-[rgb(var(--sep-colour-a99577))]">
                  <b>Other:</b>{" "}
                  {mechanicalProfileSummary(gift.mechanicsShape, "other")}
                </p>
              ) : null}

              {gift.mechanicsShape.other_alternative_enabled &&
              mechanicalProfileSummary(gift.mechanicsShape, "other_alt") ? (
                <p className="mt-1 text-[8px] leading-4 text-[rgb(var(--sep-colour-a99577))]">
                  <b>Harmful Other:</b>{" "}
                  {mechanicalProfileSummary(gift.mechanicsShape, "other_alt")}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="mt-3 border-t border-[rgb(var(--sep-colour-59432c))]/30 pt-2 components_gifts_gifts_catalogue_div_container_8">
            <p className="text-[7px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-806b50))] components_gifts_gifts_catalogue_p_text_7">
              Effects
            </p>

            <div className="mt-2 flex flex-wrap gap-1.5 components_gifts_gifts_catalogue_div_container_9">
              {gift.damageDice ? (
                <span className="border border-red-900/65 bg-red-950/20 px-2 py-1 text-[7px] uppercase tracking-[0.1em] text-red-400 components_gifts_gifts_catalogue_span_text_4">
                  Damage · {gift.damageDice}
                  {gift.damageType
                    ? ` ${gift.damageType}`
                    : ""}
                </span>
              ) : null}

              {gift.healthDice ? (
                <span className="border border-emerald-900/65 bg-emerald-950/20 px-2 py-1 text-[7px] uppercase tracking-[0.1em] text-emerald-400">
                  Healing · {gift.healthDice}
                  {gift.healthDelta !== 0
                    ? ` ${signed(gift.healthDelta)}`
                    : ""}
                </span>
              ) : gift.healthDelta !== 0 ? (
                <span
                  className={[((`border px-2 py-1 text-[7px] uppercase tracking-[0.1em] ${
                    gift.healthDelta > 0
                      ? "border-emerald-900/65 bg-emerald-950/20 text-emerald-400"
                      : "border-red-900/65 bg-red-950/20 text-red-400"
                  }`)), "components_gifts_gifts_catalogue_span_text_5"].filter(Boolean).join(" ")}
                >
                  Health · {signed(gift.healthDelta)}
                </span>
              ) : null}

              {gift.maxHealthModifier !== 0 ? (
                <span
                  className={[((`border px-2 py-1 text-[7px] uppercase tracking-[0.1em] ${
                    gift.maxHealthModifier > 0
                      ? "border-emerald-900/65 bg-emerald-950/20 text-emerald-400"
                      : "border-red-900/65 bg-red-950/20 text-red-400"
                  }`)), "components_gifts_gifts_catalogue_span_text_6"].filter(Boolean).join(" ")}
                >
                  Max Health · {signed(gift.maxHealthModifier)}
                </span>
              ) : null}

              {modifiers.map((modifier) => (
                <span
                  key={modifier}
                  className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-17110d))] px-2 py-1 text-[7px] uppercase tracking-[0.1em] text-[rgb(var(--sep-colour-a88d67))] components_gifts_gifts_catalogue_span_text_7"
                >
                  {modifier}
                </span>
              ))}

              {!gift.damageDice &&
              !gift.healthDice &&
              gift.healthDelta === 0 &&
              gift.maxHealthModifier === 0 &&
              !modifiers.length ? (
                <span className="text-[8px] italic leading-4 text-[rgb(var(--sep-colour-756957))] components_gifts_gifts_catalogue_span_text_8">
                  No direct mechanical modifiers.
                </span>
              ) : null}
            </div>
          </div>

          {ancestryText || orders || gift.isGeneral ? (
            <div className="mt-3 border-t border-[rgb(var(--sep-colour-59432c))]/30 pt-2.5 components_gifts_gifts_catalogue_div_container_10">
              <p className="text-[7px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-806b50))] components_gifts_gifts_catalogue_p_text_8">
                Available through
              </p>

              <div className="mt-2 flex flex-wrap gap-1.5 components_gifts_gifts_catalogue_div_container_11">
                {ancestryText ? (
                  <span className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-17110d))] px-2 py-1 text-[7px] uppercase tracking-[0.1em] text-[rgb(var(--sep-colour-a88d67))] components_gifts_gifts_catalogue_span_text_9">
                    Ancestry · {ancestryText}
                  </span>
                ) : null}

                {orders ? (
                  <span className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-17110d))] px-2 py-1 text-[7px] uppercase tracking-[0.1em] text-[rgb(var(--sep-colour-a88d67))] components_gifts_gifts_catalogue_span_text_10">
                    Order · {orders}
                  </span>
                ) : null}

                {gift.isGeneral ? (
                  <span className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-17110d))] px-2 py-1 text-[7px] uppercase tracking-[0.1em] text-[rgb(var(--sep-colour-a88d67))] components_gifts_gifts_catalogue_span_text_11">
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
  twoColumns = false,
}: {
  gifts: GiftCard[];
  characterMode?: boolean;
  twoColumns?: boolean;
}) {
  const [type, setType] = useState<GiftType>("all");
  const [ancestryId, setAncestryId] = useState("");
  const [orderId, setOrderId] = useState("");
  const [search, setSearch] = useState("");
  const [effectMode, setEffectMode] = useState("");
  const [targetMode, setTargetMode] = useState("");

  const FEATS_BATCH_SIZE = 24;

  const [
    visibleCount,
    setVisibleCount,
  ] = useState(
    FEATS_BATCH_SIZE,
  );

  const loadMoreRef =
    useRef<HTMLDivElement>(null);

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

  const visibleFiltered =
    useMemo(
      () =>
        characterMode
          ? filtered
          : filtered.slice(
              0,
              visibleCount,
            ),
      [
        characterMode,
        filtered,
        visibleCount,
      ],
    );

  useEffect(() => {
    if (characterMode) {
      return;
    }

    setVisibleCount(
      FEATS_BATCH_SIZE,
    );
  }, [
    characterMode,
    search,
    effectMode,
    targetMode,
    type,
    ancestryId,
    orderId,
  ]);

  useEffect(() => {
    if (characterMode) {
      return;
    }

    const target =
      loadMoreRef.current;

    if (
      !target ||
      visibleCount >=
        filtered.length
    ) {
      return;
    }

    const observer =
      new IntersectionObserver(
        (entries) => {
          if (
            entries.some(
              (entry) =>
                entry.isIntersecting,
            )
          ) {
            setVisibleCount(
              (current) =>
                Math.min(
                  current +
                    FEATS_BATCH_SIZE,
                  filtered.length,
                ),
            );
          }
        },
        {
          rootMargin:
            "900px 0px",
        },
      );

    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [
    characterMode,
    filtered.length,
    visibleCount,
  ]);

  useEffect(() => {
    if (characterMode) {
      return;
    }

    function revealAndScroll(
      giftId: string,
    ) {
      const index =
        filtered.findIndex(
          (gift) =>
            gift.id === giftId,
        );

      if (index < 0) {
        return;
      }

      setVisibleCount(
        (current) =>
          Math.max(
            current,
            index + 1,
          ),
      );

      window.requestAnimationFrame(
        () => {
          window.requestAnimationFrame(
            () => {
              document
                .getElementById(
                  `gift-${giftId}`,
                )
                ?.scrollIntoView({
                  behavior:
                    "smooth",
                  block: "start",
                });
            },
          );
        },
      );
    }

    function handleJump(
      event: Event,
    ) {
      const giftId =
        (
          event as CustomEvent<{
            id?: string;
          }>
        ).detail?.id;

      if (giftId) {
        revealAndScroll(
          giftId,
        );
      }
    }

    window.addEventListener(
      "sepulchria:gift-jump",
      handleJump,
    );

    const hash =
      window.location.hash;

    if (
      hash.startsWith(
        "#gift-",
      )
    ) {
      revealAndScroll(
        hash.slice(
          "#gift-".length,
        ),
      );
    }

    return () => {
      window.removeEventListener(
        "sepulchria:gift-jump",
        handleJump,
      );
    };
  }, [
    characterMode,
    filtered,
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
      <section className="mt-5 border border-[rgb(var(--sep-colour-60482e))]/40 bg-[rgb(var(--sep-colour-120e0b))] p-3 sm:p-4 components_gifts_gifts_catalogue_section_section">
        <div className="grid gap-2 lg:grid-cols-2 xl:grid-cols-[minmax(220px,2fr)_repeat(5,minmax(0,1fr))_auto] components_gifts_gifts_catalogue_div_container_12">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search Feats..."
            className={[((controlClass)), "components_gifts_gifts_catalogue_input_search_feats"].filter(Boolean).join(" ")}
          />

          <select
            value={effectMode}
            onChange={(event) => setEffectMode(event.target.value)}
            className={[((controlClass)), "components_gifts_gifts_catalogue_select_select"].filter(Boolean).join(" ")}
          >
            <option className="components_gifts_gifts_catalogue_option_option" value="">All Effects</option>
            <option className="components_gifts_gifts_catalogue_option_none" value="none">Standard</option>
            <option className="components_gifts_gifts_catalogue_option_passive" value="passive">Passive</option>
            <option className="components_gifts_gifts_catalogue_option_temporary" value="temporary">Temporary</option>
          </select>

          <select
            value={targetMode}
            onChange={(event) => setTargetMode(event.target.value)}
            className={[((controlClass)), "components_gifts_gifts_catalogue_select_select_2"].filter(Boolean).join(" ")}
          >
            <option className="components_gifts_gifts_catalogue_option_option_2" value="">All Targets</option>
            <option className="components_gifts_gifts_catalogue_option_self" value="self">Self</option>
            <option className="components_gifts_gifts_catalogue_option_other" value="other">Other</option>
            <option className="components_gifts_gifts_catalogue_option_either" value="either">Self / Other</option>
          </select>

          {!characterMode ? (
            <>
              <select
                value={type}
                onChange={(event) =>
                  setType(event.target.value as GiftType)
                }
                className={[((controlClass)), "components_gifts_gifts_catalogue_select_select_3"].filter(Boolean).join(" ")}
              >
                <option className="components_gifts_gifts_catalogue_option_all" value="all">All Types</option>
                <option className="components_gifts_gifts_catalogue_option_ancestry" value="ancestry">Ancestry</option>
                <option className="components_gifts_gifts_catalogue_option_order" value="order">Order</option>
                <option className="components_gifts_gifts_catalogue_option_general" value="general">General</option>
              </select>

              <select
                value={ancestryId}
                onChange={(event) => setAncestryId(event.target.value)}
                className={[((controlClass)), "components_gifts_gifts_catalogue_select_select_4"].filter(Boolean).join(" ")}
              >
                <option className="components_gifts_gifts_catalogue_option_option_3" value="">All Ancestries</option>
                {ancestries.map((ancestry) => (
                  <option className="components_gifts_gifts_catalogue_option_option_4" key={ancestry.id} value={ancestry.id}>
                    {ancestry.name}
                  </option>
                ))}
              </select>

              <select
                value={orderId}
                onChange={(event) => setOrderId(event.target.value)}
                className={[((controlClass)), "components_gifts_gifts_catalogue_select_select_5"].filter(Boolean).join(" ")}
              >
                <option className="components_gifts_gifts_catalogue_option_option_5" value="">All Orders</option>
                {orders.map((order) => (
                  <option className="components_gifts_gifts_catalogue_option_option_6" key={order.id} value={order.id}>
                    {order.name}
                  </option>
                ))}
              </select>
            </>
          ) : null}

          <button
            type="button"
            onClick={reset}
            className="border border-[rgb(var(--sep-colour-765937))]/55 bg-[rgb(var(--sep-colour-21180f))] px-4 py-2 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-c8aa7b))] transition hover:border-[rgb(var(--sep-colour-9a7445))] components_gifts_gifts_catalogue_button_reset"
          >
            Reset
          </button>
        </div>

        <div className="mt-2 flex items-center justify-between gap-3 border-t border-[rgb(var(--sep-colour-59432c))]/25 pt-2 components_gifts_gifts_catalogue_div_container_13">
          <p className="text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-6f6353))] components_gifts_gifts_catalogue_p_text_9">
            Live filtering
          </p>
          <p className="text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-8a7558))] components_gifts_gifts_catalogue_p_text_10">
            {filtered.length} / {gifts.length}
          </p>
        </div>
      </section>

      {filtered.length ? (
        <section
          className={[
            "mt-3 grid items-start gap-3 grid-cols-1 md:grid-cols-2 components_gifts_gifts_catalogue_section_section_2",
            twoColumns ? "" : "xl:grid-cols-3",
          ]
            .filter(Boolean)
            .join(" ")}
        >
  {visibleFiltered.map((gift) => (
    <FeatCard key={gift.id} gift={gift} />
  ))}

  {!characterMode &&
  visibleCount < filtered.length ? (
    <div
      ref={loadMoreRef}
      className="col-span-full flex min-h-16 items-center justify-center border border-[rgb(var(--sep-colour-59432c))]/25 bg-[rgb(var(--sep-colour-100c09))] px-4 py-3 text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-756957))]"
    >
      Showing{" "}
      {Math.min(
        visibleCount,
        filtered.length,
      )}{" "}
      of {filtered.length} Feats
    </div>
  ) : null}
</section>
      ) : (
        <p className="mt-3 border border-[rgb(var(--sep-colour-59432c))]/30 bg-[rgb(var(--sep-colour-100c09))] p-4 text-[11px] text-[rgb(var(--sep-colour-8f8271))] components_gifts_gifts_catalogue_p_text_11">
          No Feats match these filters.
        </p>
      )}
    </>
  );
}
