"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  shapeSchoolBorderClass,
} from "@/lib/warping/shape-school-style";

export type ShapeCard =
  Record<string, any> & {
    id: string;
    name: string;
    description: string;
    level: number;
    school: string;
    word_of_power: string;
    movement: string;
    target_mode: string;
  };

type ProfileKey =
  | "self"
  | "other"
  | "other_alt";

const ctl =
  "w-full border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-[9px] text-[rgb(var(--sep-colour-cbb89a))] outline-none transition focus:border-[rgb(var(--sep-colour-987344))]";

const pretty = (value: any) =>
  value
    ? String(value)
        .replaceAll("_", " ")
        .replace(
          /\b\w/g,
          (char: string) =>
            char.toUpperCase(),
        )
    : "—";

const signed = (value: number) =>
  value > 0
    ? `+${value}`
    : String(value);

const ATTRIBUTE_LABELS:
  Record<string, string> = {
    muscles: "Muscles",
    reflexes: "Reflexes",
    vigor: "Vigour",
    vigour: "Vigour",
    brains: "Brains",
    shrewd: "Shrewd",
    presence: "Presence",
    presence_score: "Presence",
  };

const SAVE_LABELS:
  Record<string, string> = {
    dodge: "Dodge · Reflexes",
    defend: "Defend · Vigour",
    resist_vigour: "Resist · Vigour",
    resist_vigor: "Resist · Vigour",
    resist_shrewd: "Resist · Shrewd",
    resist_brains: "Resist · Brains",
    resist_presence: "Resist · Presence",
  };

const PRICE_LABELS:
  Record<string, string> = {
    cinder_eyes: "Cinder Eyes",
    luminous_veins: "Luminous Veins",
    cinderblood: "Cinderblood",
    dreamtouched: "Dreamtouched",
    beastmarked: "Beastmarked",
    bloomwake: "Bloomwake",
    witherwake: "Witherwake",
    upstream: "Upstream",
    unbound_shadow: "Unbound Shadow",
    starbound: "Starbound",
    false_remembrance: "False Remembrance",
    current_sighted: "Current-Sighted",
    godwhispered: "Godwhispered",
    realitys_misstep: "Reality's Misstep",
    unmoored: "Unmoored",
  };

function durationLabel(shape: ShapeCard) {
  if (shape.is_instantaneous) {
    return "Instantaneous";
  }

  if (shape.duration_unit === "until_dispelled") {
    return "Until Dispelled";
  }

  return `${shape.duration_amount ?? 1} ${pretty(
    shape.duration_unit ?? "minutes",
  ).toLowerCase()}`;
}

function targetLabel(shape: ShapeCard) {
  const count =
    shape.target_scope === "multiple"
      ? ` · up to ${shape.max_targets}`
      : "";

  if (shape.target_mode === "self") {
    return "Self";
  }

  if (shape.target_mode === "written") {
    return "Written / Fate";
  }

  if (shape.target_mode === "other") {
    return `Other / Written${count}`;
  }

  return `Self / Other / Written${count}`;
}

function attributeRequirements(shape: ShapeCard) {
  return [
    ["Muscles", shape.min_muscles],
    ["Reflexes", shape.min_reflexes],
    ["Vigour", shape.min_vigour],
    ["Brains", shape.min_brains],
    ["Shrewd", shape.min_shrewd],
    ["Presence", shape.min_presence],
  ]
    .filter(([, value]) => Boolean(value))
    .map(([label, value]) => `${label} ${value}+`);
}

function resolutionFor(
  shape: ShapeCard,
  profile: ProfileKey,
) {
  const mode =
    shape[`${profile}_resolution_mode`] ??
    shape.resolution_mode ??
    (profile === "other_alt" ? "save" : "automatic");

  const dc =
    shape[`${profile}_dc_attribute`] ??
    shape.dc_attribute ??
    null;

  const saves =
    shape[`${profile}_save_options`] ??
    shape.save_options ??
    [];

  const saveResult =
    shape[`${profile}_save_success_damage`] ??
    shape.save_success_damage ??
    "none";

  return {
    mode,
    dc,
    saves: Array.isArray(saves) ? saves : [],
    saveResult,
  };
}

function profileEffects(
  shape: ShapeCard,
  profile: ProfileKey,
) {
  const effects: {
    label: string;
    value: string;
  }[] = [];

  const damageDice =
    shape[`${profile}_damage_dice`];

  const damageAttribute =
    shape[`${profile}_damage_attribute`];

  if (damageDice || damageAttribute) {
    const parts = [
      damageDice,
      damageAttribute
        ? `+ ${
            ATTRIBUTE_LABELS[damageAttribute] ??
            pretty(damageAttribute)
          }`
        : "",
      shape.damage_type || "",
    ].filter(Boolean);

    effects.push({
      label: "Damage",
      value: parts.join(" "),
    });
  }

  const healthDice =
    shape[`${profile}_heal_dice`];

  const healthAttribute =
    shape[`${profile}_heal_attribute`];

  if (healthDice || healthAttribute) {
    const parts = [
      healthDice,
      healthAttribute
        ? `+ ${
            ATTRIBUTE_LABELS[healthAttribute] ??
            pretty(healthAttribute)
          }`
        : "",
    ].filter(Boolean);

    effects.push({
      label: "Current Health",
      value: parts.join(" "),
    });
  }

  const maxHp =
    shape[`${profile}_max_hp_change`];

  if (maxHp) {
    effects.push({
      label: "Max Health",
      value: String(maxHp),
    });
  }

  const conditions =
    shape[`${profile}_conditions`];

  if (Array.isArray(conditions) && conditions.length) {
    effects.push({
      label:
        conditions.length > 1
          ? "Conditions"
          : "Condition",
      value: conditions.join(", "),
    });
  }

  const modifiers = [
    ["Muscles", shape[`${profile}_muscles_modifier`]],
    ["Reflexes", shape[`${profile}_reflexes_modifier`]],
    ["Vigour", shape[`${profile}_vigour_modifier`]],
    ["Brains", shape[`${profile}_brains_modifier`]],
    ["Shrewd", shape[`${profile}_shrewd_modifier`]],
    ["Presence", shape[`${profile}_presence_modifier`]],
  ]
    .filter(([, value]) => Number(value) !== 0)
    .map(
      ([label, value]) =>
        `${label} ${signed(Number(value))}`,
    );

  if (modifiers.length) {
    effects.push({
      label: "Attributes",
      value: modifiers.join(" · "),
    });
  }

  return effects;
}

function Badge({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <span className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-17110d))] px-2 py-1 text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-a88d67))]">
      {children}
    </span>
  );
}

function ProfileCard({
  shape,
  profile,
  title,
  subtitle,
}: {
  shape: ShapeCard;
  profile: ProfileKey;
  title: string;
  subtitle?: string;
}) {
  const effects =
    profileEffects(shape, profile);

  const resolution =
    resolutionFor(shape, profile);

  return (
    <div className="border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-100c09))] p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-serif text-base text-[rgb(var(--sep-colour-dec89f))]">
            {title}
          </p>

          {subtitle ? (
            <p className="mt-1 text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-776957))]">
              {subtitle}
            </p>
          ) : null}
        </div>

        <span
          className={`border px-2 py-1 text-[7px] uppercase tracking-[0.12em] ${
            resolution.mode === "automatic"
              ? "border-emerald-900/65 bg-emerald-950/20 text-emerald-400"
              : "border-[rgb(var(--sep-colour-8d6d3e))]/55 bg-[rgb(var(--sep-colour-21180f))] text-[rgb(var(--sep-colour-d3b278))]"
          }`}
        >
          {resolution.mode === "automatic"
            ? "Automatic"
            : "Save Required"}
        </span>
      </div>

      {resolution.mode === "save" ? (
        <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          <div className="border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-120e0b))] px-2.5 py-2">
            <p className="text-[6px] uppercase tracking-[0.13em] text-[rgb(var(--sep-colour-806a4c))]">
              DC
            </p>
            <p className="mt-1 text-[8px] leading-4 text-[rgb(var(--sep-colour-b8a382))]">
              11 +{" "}
              {resolution.dc
                ? ATTRIBUTE_LABELS[resolution.dc] ??
                  pretty(resolution.dc)
                : "0"}
            </p>
          </div>

          <div className="border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-120e0b))] px-2.5 py-2">
            <p className="text-[6px] uppercase tracking-[0.13em] text-[rgb(var(--sep-colour-806a4c))]">
              Saves
            </p>
            <p className="mt-1 text-[8px] leading-4 text-[rgb(var(--sep-colour-b8a382))]">
              {resolution.saves
                .map(
                  (save: string) =>
                    SAVE_LABELS[save] ?? pretty(save),
                )
                .join(" · ") || "None"}
            </p>
          </div>

          <div className="border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-120e0b))] px-2.5 py-2">
            <p className="text-[6px] uppercase tracking-[0.13em] text-[rgb(var(--sep-colour-806a4c))]">
              Success
            </p>
            <p className="mt-1 text-[8px] leading-4 text-[rgb(var(--sep-colour-b8a382))]">
              {resolution.saveResult === "half"
                ? "Half damage only"
                : "No effect"}
            </p>
          </div>
        </div>
      ) : null}

      {effects.length ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {effects.map((effect, index) => (
            <span
              key={`${effect.label}-${index}`}
              className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-17110d))] px-2 py-1 text-[7px] uppercase tracking-[0.1em] text-[rgb(var(--sep-colour-a88d67))]"
            >
              {effect.label} · {effect.value}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-[8px] italic leading-4 text-[rgb(var(--sep-colour-756957))]">
          No mechanical effect configured.
        </p>
      )}
    </div>
  );
}

function ShapeArticle({
  shape,
}: {
  shape: ShapeCard;
}) {
  const requirements =
    attributeRequirements(shape);

  const hasSelf =
    shape.target_mode === "self" ||
    shape.target_mode === "either";

  const hasOther =
    shape.target_mode === "other" ||
    shape.target_mode === "either";

  return (
    <article
  id={`shape-${shape.id}`}
  className={`min-h-[430px] scroll-mt-4 border bg-[rgb(var(--sep-colour-18110c))] p-4 transition-[border-color,box-shadow] duration-200 ${shapeSchoolBorderClass(
    shape.school,
  )}`}
>
      <div className="flex gap-3">
        

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-serif text-base text-[rgb(var(--sep-colour-dec89f))]">
                {shape.name}
              </p>

              <p className="mt-1 text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-776957))]">
                Level {shape.level}
                {" · "}
                {pretty(shape.school)}
                {" · "}
                {shape.word_of_power}
              </p>

              <p className="mt-1 text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-9b815d))]">
                {pretty(shape.movement)}
                {" · "}
                {durationLabel(shape)}
              </p>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <span className="border border-[rgb(var(--sep-colour-8d6d3e))]/55 bg-[rgb(var(--sep-colour-21180f))] px-2 py-1 text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-d3b278))]">
                Level {shape.level}
              </span>

              <span className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-17110d))] px-2 py-1 text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-a88d67))]">
                {pretty(shape.effect_nature)}
              </span>

              <span className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-17110d))] px-2 py-1 text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-a88d67))]">
                {targetLabel(shape)}
              </span>

              {shape.is_dispel ? (
                <span className="border border-[rgb(var(--sep-colour-65456f))]/55 px-2 py-1 text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-bda0c7))]">
                  Dispel
                </span>
              ) : null}
            </div>
          </div>

          {shape.description?.trim() ? (
            <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-[rgb(var(--sep-colour-9f927f))]">
              {shape.description}
            </p>
          ) : null}

          <div className="mt-2 grid grid-cols-2 gap-1.5 border-t border-[rgb(var(--sep-colour-59432c))]/30 pt-2 sm:grid-cols-3">
            <div className="min-w-0 border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-100c09))] px-2.5 py-2">
              <p className="text-[6px] uppercase tracking-[0.13em] text-[rgb(var(--sep-colour-806a4c))]">
                Words
              </p>
              <p className="mt-1 break-words text-[8px] leading-4 text-[rgb(var(--sep-colour-b8a382))]">
                {[
                  pretty(shape.essence_word),
                  pretty(shape.action_word),
                  pretty(shape.law_word),
                ].join(" · ")}
              </p>
            </div>

            <div className="min-w-0 border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-100c09))] px-2.5 py-2">
              <p className="text-[6px] uppercase tracking-[0.13em] text-[rgb(var(--sep-colour-806a4c))]">
                Components
              </p>
              <p className="mt-1 break-words text-[8px] leading-4 text-[rgb(var(--sep-colour-b8a382))]">
                {shape.requires_verbal ? "Verbal" : "No verbal"}
                {" · "}
                {shape.requires_movement ? "Movement" : "No movement"}
              </p>
            </div>

            <div className="min-w-0 border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-100c09))] px-2.5 py-2">
              <p className="text-[6px] uppercase tracking-[0.13em] text-[rgb(var(--sep-colour-806a4c))]">
                Price
              </p>
              <p className="mt-1 break-words text-[8px] leading-4 text-[rgb(var(--sep-colour-b8a382))]">
                {shape.price_key
                  ? PRICE_LABELS[shape.price_key] ??
                    pretty(shape.price_key)
                  : "None"}
              </p>
            </div>
          </div>

          <div className="mt-3 border-t border-[rgb(var(--sep-colour-59432c))]/30 pt-2.5">
            <p className="text-[7px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-806b50))]">
              Effects
            </p>

            <div className="mt-2 grid gap-2">
              {hasSelf ? (
                <ProfileCard
                  shape={shape}
                  profile="self"
                  title="Self Effect"
                  subtitle="Applied when the caster is the recipient."
                />
              ) : null}

              {hasOther ? (
                <ProfileCard
                  shape={shape}
                  profile="other"
                  title={
                    shape.other_alternative_enabled
                      ? "Beneficial Other Effect"
                      : "Other Effect"
                  }
                  subtitle={
                    shape.other_alternative_enabled
                      ? "Chosen independently for each Other target."
                      : "Applied to another Character."
                  }
                />
              ) : null}

              {hasOther && shape.other_alternative_enabled ? (
                <ProfileCard
                  shape={shape}
                  profile="other_alt"
                  title="Harmful Other Effect"
                  subtitle="Chosen independently for each Other target."
                />
              ) : null}

              {shape.target_mode === "written" ? (
                <div className="border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5">
                  <p className="font-serif text-base text-[rgb(var(--sep-colour-dec89f))]">
                    Written / Fate
                  </p>
                  <p className="mt-1 text-[8px] leading-4 text-[rgb(var(--sep-colour-b8a382))]">
                    Resolved narratively through its Written / Fate target.
                  </p>
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-3 border-t border-[rgb(var(--sep-colour-59432c))]/30 pt-2.5">
            <p className="text-[7px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-806b50))]">
              Requirements
            </p>

            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="border border-emerald-900/65 bg-emerald-950/20 px-2 py-1 text-[7px] uppercase tracking-[0.1em] text-emerald-400">
                Affinity {shape.level}
              </span>

              {requirements.map((requirement) => (
                <span
                  key={requirement}
                  className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-17110d))] px-2 py-1 text-[7px] uppercase tracking-[0.1em] text-[rgb(var(--sep-colour-a88d67))]"
                >
                  {requirement}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

export function ShapesCatalogue({
  shapes,
}: {
  shapes: ShapeCard[];
}) {
  const [q, setQ] = useState("");
  const [level, setLevel] = useState("");
  const [school, setSchool] = useState("");
  const [movement, setMovement] = useState("");
  const [target, setTarget] = useState("");
  const [nature, setNature] = useState("");

  const schools = useMemo(
    () =>
      Array.from(
        new Set(shapes.map((shape) => shape.school)),
      ).sort(),
    [shapes],
  );

  const movements = useMemo(
    () =>
      Array.from(
        new Set(shapes.map((shape) => shape.movement)),
      ).sort(),
    [shapes],
  );

  const filtered = useMemo(
    () =>
      shapes.filter(
        (shape) =>
          (!q ||
            `${shape.name} ${shape.word_of_power} ${shape.description}`
              .toLowerCase()
              .includes(q.toLowerCase())) &&
          (!level || String(shape.level) === level) &&
          (!school || shape.school === school) &&
          (!movement || shape.movement === movement) &&
          (!target || shape.target_mode === target) &&
          (!nature || shape.effect_nature === nature),
      ),
    [
      shapes,
      q,
      level,
      school,
      movement,
      target,
      nature,
    ],
  );

  useEffect(() => {
    const ids =
      filtered.map((shape) => shape.id);

    sessionStorage.setItem(
      "sepulchria:shapes-visible-ids",
      JSON.stringify(ids),
    );

    window.dispatchEvent(
      new CustomEvent(
        "sepulchria:shapes-filter-change",
        {
          detail: { ids },
        },
      ),
    );
  }, [filtered]);

  return (
    <>
      <section className="mt-5 border border-[rgb(var(--sep-colour-60482e))]/40 bg-[rgb(var(--sep-colour-120e0b))] p-3 sm:p-4">
        <div className="grid gap-2 lg:grid-cols-2 xl:grid-cols-[1.5fr_repeat(5,1fr)_auto]">
          <input
            className={ctl}
            type="search"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Search name, Word or description..."
          />

          <select
            className={ctl}
            value={level}
            onChange={(event) =>
              setLevel(event.target.value)
            }
          >
            <option value="">All Levels</option>
            {Array.from(
              new Set(shapes.map((shape) => shape.level)),
            )
              .sort((a, b) => a - b)
              .map((value) => (
                <option key={value} value={value}>
                  Level {value}
                </option>
              ))}
          </select>

          <select
            className={ctl}
            value={school}
            onChange={(event) =>
              setSchool(event.target.value)
            }
          >
            <option value="">All Schools</option>
            {schools.map((value) => (
              <option key={value} value={value}>
                {pretty(value)}
              </option>
            ))}
          </select>

          <select
            className={ctl}
            value={movement}
            onChange={(event) =>
              setMovement(event.target.value)
            }
          >
            <option value="">All Movements</option>
            {movements.map((value) => (
              <option key={value} value={value}>
                {pretty(value)}
              </option>
            ))}
          </select>

          <select
            className={ctl}
            value={target}
            onChange={(event) =>
              setTarget(event.target.value)
            }
          >
            <option value="">All Targets</option>
            <option value="self">Self</option>
            <option value="other">Other</option>
            <option value="either">Either</option>
            <option value="written">Written / Fate</option>
          </select>

          <select
            className={ctl}
            value={nature}
            onChange={(event) =>
              setNature(event.target.value)
            }
          >
            <option value="">All Natures</option>
            <option value="beneficial">Beneficial</option>
            <option value="harmful">Harmful</option>
            <option value="mixed">Mixed</option>
          </select>

          <button
            type="button"
            onClick={() => {
              setQ("");
              setLevel("");
              setSchool("");
              setMovement("");
              setTarget("");
              setNature("");
            }}
            className="border border-[rgb(var(--sep-colour-765937))]/55 bg-[rgb(var(--sep-colour-21180f))] px-4 py-2 text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-c8aa7b))] transition hover:border-[rgb(var(--sep-colour-9b7446))]/70"
          >
            Reset
          </button>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 border-t border-[rgb(var(--sep-colour-59432c))]/20 pt-3">
          <p className="text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-6f6353))]">
            Live Filtering
          </p>

          <p className="shrink-0 text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-9a7c54))]">
            {filtered.length} / {shapes.length}
          </p>
        </div>
      </section>

      <section className="mt-3 grid items-start gap-3 md:grid-cols-2">
        {filtered.map((shape) => (
          <ShapeArticle
            key={shape.id}
            shape={shape}
          />
        ))}

        {!filtered.length ? (
          <p className="rounded-lg border border-[rgb(var(--sep-colour-59432c))]/30 bg-[rgb(var(--sep-colour-100c09))] p-5 text-[11px] text-[rgb(var(--sep-colour-8f8271))]">
            No Shapes match these filters.
          </p>
        ) : null}
      </section>
    </>
  );
}
