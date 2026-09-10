"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  shapeSchoolBorderClass,
} from "@/lib/warping/shape-school-style";
import {
  ShapeExtendedDescription,
} from "@/components/warping/shape-extended-description";
import {
  PriceTooltip,
} from "@/components/warping/price-tooltip";

export type ShapeCard =
  Record<string, any> & {
    id: string;
    name: string;
    description: string;
    extended_description?: string | null;
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
    <span className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-17110d))] px-2 py-1 text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-a88d67))] components_warping_shapes_catalogue_span_text">
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
    <div className="border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-100c09))] p-3 components_warping_shapes_catalogue_div_container">
      <div className="flex flex-wrap items-start justify-between gap-2 components_warping_shapes_catalogue_div_container_2">
        <div className="components_warping_shapes_catalogue_div_container_3">
          <p className="font-serif text-base text-[rgb(var(--sep-colour-dec89f))] components_warping_shapes_catalogue_p_text">
            {title}
          </p>

          {subtitle ? (
            <p className="mt-1 text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-776957))] components_warping_shapes_catalogue_p_text_2">
              {subtitle}
            </p>
          ) : null}
        </div>

        <span
          className={[((`border px-2 py-1 text-[7px] uppercase tracking-[0.12em] ${
            resolution.mode === "automatic"
              ? "border-emerald-900/65 bg-emerald-950/20 text-emerald-400"
              : "border-[rgb(var(--sep-colour-8d6d3e))]/55 bg-[rgb(var(--sep-colour-21180f))] text-[rgb(var(--sep-colour-d3b278))]"
          }`)), "components_warping_shapes_catalogue_span_text_2"].filter(Boolean).join(" ")}
        >
          {resolution.mode === "automatic"
            ? "Automatic"
            : "Save Required"}
        </span>
      </div>

      {resolution.mode === "save" ? (
        <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3 components_warping_shapes_catalogue_div_container_4">
          <div className="border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-120e0b))] px-2.5 py-2 components_warping_shapes_catalogue_div_container_5">
            <p className="text-[6px] uppercase tracking-[0.13em] text-[rgb(var(--sep-colour-806a4c))] components_warping_shapes_catalogue_p_text_3">
              DC
            </p>
            <p className="mt-1 text-[8px] leading-4 text-[rgb(var(--sep-colour-b8a382))] components_warping_shapes_catalogue_p_text_4">
              11 +{" "}
              {resolution.dc
                ? ATTRIBUTE_LABELS[resolution.dc] ??
                  pretty(resolution.dc)
                : "0"}
            </p>
          </div>

          <div className="border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-120e0b))] px-2.5 py-2 components_warping_shapes_catalogue_div_container_6">
            <p className="text-[6px] uppercase tracking-[0.13em] text-[rgb(var(--sep-colour-806a4c))] components_warping_shapes_catalogue_p_text_5">
              Saves
            </p>
            <p className="mt-1 text-[8px] leading-4 text-[rgb(var(--sep-colour-b8a382))] components_warping_shapes_catalogue_p_text_6">
              {resolution.saves
                .map(
                  (save: string) =>
                    SAVE_LABELS[save] ?? pretty(save),
                )
                .join(" · ") || "None"}
            </p>
          </div>

          <div className="border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-120e0b))] px-2.5 py-2 components_warping_shapes_catalogue_div_container_7">
            <p className="text-[6px] uppercase tracking-[0.13em] text-[rgb(var(--sep-colour-806a4c))] components_warping_shapes_catalogue_p_text_7">
              Success
            </p>
            <p className="mt-1 text-[8px] leading-4 text-[rgb(var(--sep-colour-b8a382))] components_warping_shapes_catalogue_p_text_8">
              {resolution.saveResult === "half"
                ? "Half damage only"
                : "No effect"}
            </p>
          </div>
        </div>
      ) : null}

      {effects.length ? (
        <div className="mt-2 flex flex-wrap gap-1.5 components_warping_shapes_catalogue_div_container_8">
          {effects.map((effect, index) => (
            <span
              key={`${effect.label}-${index}`}
              className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-17110d))] px-2 py-1 text-[7px] uppercase tracking-[0.1em] text-[rgb(var(--sep-colour-a88d67))] components_warping_shapes_catalogue_span_text_3"
            >
              {effect.label} · {effect.value}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-[8px] italic leading-4 text-[rgb(var(--sep-colour-756957))] components_warping_shapes_catalogue_p_text_9">
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
  data-sep-interactive-surface="card"
  className={[((`min-h-[430px] scroll-mt-4 border bg-[rgb(var(--sep-colour-18110c))] p-4 transition-[border-color,box-shadow] duration-200 ${shapeSchoolBorderClass(
    shape.school,
  )}`)), "components_warping_shapes_catalogue_article_article"].filter(Boolean).join(" ")}
>
      <div className="flex gap-3 components_warping_shapes_catalogue_div_container_9">
        

        <div className="min-w-0 flex-1 components_warping_shapes_catalogue_div_container_10">
          <div className="flex flex-wrap items-start justify-between gap-2 components_warping_shapes_catalogue_div_container_11">
            <div className="min-w-0 components_warping_shapes_catalogue_div_container_12">
              <p className="font-serif text-base text-[rgb(var(--sep-colour-dec89f))] components_warping_shapes_catalogue_p_text_10">
                {shape.name}
              </p>

              <p className="mt-1 text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-776957))] components_warping_shapes_catalogue_p_text_11">
                Level {shape.level}
                {" · "}
                {pretty(shape.school)}
                {" · "}
                {shape.word_of_power}
              </p>

              <p className="mt-1 text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-9b815d))] components_warping_shapes_catalogue_p_text_12">
                {pretty(shape.movement)}
                {" · "}
                {durationLabel(shape)}
              </p>
            </div>

            <div className="flex flex-wrap gap-1.5 components_warping_shapes_catalogue_div_container_13">
              <span className="border border-[rgb(var(--sep-colour-8d6d3e))]/55 bg-[rgb(var(--sep-colour-21180f))] px-2 py-1 text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-d3b278))] components_warping_shapes_catalogue_span_text_4">
                Level {shape.level}
              </span>

              <span className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-17110d))] px-2 py-1 text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-a88d67))] components_warping_shapes_catalogue_span_text_5">
                {pretty(shape.effect_nature)}
              </span>

              <span className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-17110d))] px-2 py-1 text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-a88d67))] components_warping_shapes_catalogue_span_text_6">
                {targetLabel(shape)}
              </span>

              {shape.is_dispel ? (
                <span className="border border-[rgb(var(--sep-colour-65456f))]/55 px-2 py-1 text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-bda0c7))] components_warping_shapes_catalogue_span_text_7">
                  Dispel
                </span>
              ) : null}
            </div>
          </div>

          {shape.description?.trim() ? (
            <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-[rgb(var(--sep-colour-9f927f))] components_warping_shapes_catalogue_p_text_13">
              {shape.description}
            </p>
          ) : null}

          {shape.extended_description?.trim() ? (
            <ShapeExtendedDescription
              body={shape.extended_description}
            />
          ) : null}

          <div className="mt-2 grid grid-cols-2 gap-1.5 border-t border-[rgb(var(--sep-colour-59432c))]/30 pt-2 sm:grid-cols-3 components_warping_shapes_catalogue_div_container_14">
            <div className="min-w-0 border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-100c09))] px-2.5 py-2 components_warping_shapes_catalogue_div_container_15">
              <p className="text-[6px] uppercase tracking-[0.13em] text-[rgb(var(--sep-colour-806a4c))] components_warping_shapes_catalogue_p_text_14">
                Words
              </p>
              <p className="mt-1 break-words text-[8px] leading-4 text-[rgb(var(--sep-colour-b8a382))] components_warping_shapes_catalogue_p_text_15">
                {[
                  pretty(shape.essence_word),
                  pretty(shape.action_word),
                  pretty(shape.law_word),
                ].join(" · ")}
              </p>
            </div>

            <div className="min-w-0 border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-100c09))] px-2.5 py-2 components_warping_shapes_catalogue_div_container_16">
              <p className="text-[6px] uppercase tracking-[0.13em] text-[rgb(var(--sep-colour-806a4c))] components_warping_shapes_catalogue_p_text_16">
                Components
              </p>
              <p className="mt-1 break-words text-[8px] leading-4 text-[rgb(var(--sep-colour-b8a382))] components_warping_shapes_catalogue_p_text_17">
                {shape.requires_verbal ? "Verbal" : "No verbal"}
                {" · "}
                {shape.requires_movement ? "Movement" : "No movement"}
              </p>
            </div>

            <div className="min-w-0 border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-100c09))] px-2.5 py-2 components_warping_shapes_catalogue_div_container_17">
              <p className="text-[6px] uppercase tracking-[0.13em] text-[rgb(var(--sep-colour-806a4c))] components_warping_shapes_catalogue_p_text_18">
                Price
              </p>
              <p className="mt-1 break-words text-[8px] leading-4 text-[rgb(var(--sep-colour-b8a382))] components_warping_shapes_catalogue_p_text_19">
                {shape.price_key ? (
                  <PriceTooltip priceKey={shape.price_key}>
                    <span className="underline decoration-dotted underline-offset-2 components_warping_shapes_catalogue_span_text_8">
                      {PRICE_LABELS[shape.price_key] ?? pretty(shape.price_key)}
                    </span>
                  </PriceTooltip>
                ) : (
                  "None"
                )}
              </p>
            </div>
          </div>

          <div className="mt-3 border-t border-[rgb(var(--sep-colour-59432c))]/30 pt-2.5 components_warping_shapes_catalogue_div_container_18">
            <p className="text-[7px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-806b50))] components_warping_shapes_catalogue_p_text_20">
              Effects
            </p>

            <div className="mt-2 grid gap-2 components_warping_shapes_catalogue_div_container_19">
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
                <div className="border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 components_warping_shapes_catalogue_div_container_20">
                  <p className="font-serif text-base text-[rgb(var(--sep-colour-dec89f))] components_warping_shapes_catalogue_p_text_21">
                    Written / Fate
                  </p>
                  <p className="mt-1 text-[8px] leading-4 text-[rgb(var(--sep-colour-b8a382))] components_warping_shapes_catalogue_p_text_22">
                    Resolved narratively through its Written / Fate target.
                  </p>
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-3 border-t border-[rgb(var(--sep-colour-59432c))]/30 pt-2.5 components_warping_shapes_catalogue_div_container_21">
            <p className="text-[7px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-806b50))] components_warping_shapes_catalogue_p_text_23">
              Requirements
            </p>

            <div className="mt-2 flex flex-wrap gap-1.5 components_warping_shapes_catalogue_div_container_22">
              <span className="border border-emerald-900/65 bg-emerald-950/20 px-2 py-1 text-[7px] uppercase tracking-[0.1em] text-emerald-400 components_warping_shapes_catalogue_span_text_9">
                Affinity {shape.level}
              </span>

              {requirements.map((requirement) => (
                <span
                  key={requirement}
                  className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-17110d))] px-2 py-1 text-[7px] uppercase tracking-[0.1em] text-[rgb(var(--sep-colour-a88d67))] components_warping_shapes_catalogue_span_text_10"
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
      <section className="mt-5 border border-[rgb(var(--sep-colour-60482e))]/40 bg-[rgb(var(--sep-colour-120e0b))] p-3 sm:p-4 components_warping_shapes_catalogue_section_section">
        <div className="grid gap-2 lg:grid-cols-2 xl:grid-cols-[1.5fr_repeat(5,1fr)_auto] components_warping_shapes_catalogue_div_container_23">
          <input
            className={[((ctl)), "components_warping_shapes_catalogue_input_search_name_word_description"].filter(Boolean).join(" ")}
            type="search"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Search name, Word or description..."
          />

          <select
            className={[((ctl)), "components_warping_shapes_catalogue_select_select"].filter(Boolean).join(" ")}
            value={level}
            onChange={(event) =>
              setLevel(event.target.value)
            }
          >
            <option className="components_warping_shapes_catalogue_option_option" value="">All Levels</option>
            {Array.from(
              new Set(shapes.map((shape) => shape.level)),
            )
              .sort((a, b) => a - b)
              .map((value) => (
                <option className="components_warping_shapes_catalogue_option_option_2" key={value} value={value}>
                  Level {value}
                </option>
              ))}
          </select>

          <select
            className={[((ctl)), "components_warping_shapes_catalogue_select_select_2"].filter(Boolean).join(" ")}
            value={school}
            onChange={(event) =>
              setSchool(event.target.value)
            }
          >
            <option className="components_warping_shapes_catalogue_option_option_3" value="">All Schools</option>
            {schools.map((value) => (
              <option className="components_warping_shapes_catalogue_option_option_4" key={value} value={value}>
                {pretty(value)}
              </option>
            ))}
          </select>

          <select
            className={[((ctl)), "components_warping_shapes_catalogue_select_select_3"].filter(Boolean).join(" ")}
            value={movement}
            onChange={(event) =>
              setMovement(event.target.value)
            }
          >
            <option className="components_warping_shapes_catalogue_option_option_5" value="">All Movements</option>
            {movements.map((value) => (
              <option className="components_warping_shapes_catalogue_option_option_6" key={value} value={value}>
                {pretty(value)}
              </option>
            ))}
          </select>

          <select
            className={[((ctl)), "components_warping_shapes_catalogue_select_select_4"].filter(Boolean).join(" ")}
            value={target}
            onChange={(event) =>
              setTarget(event.target.value)
            }
          >
            <option className="components_warping_shapes_catalogue_option_option_7" value="">All Targets</option>
            <option className="components_warping_shapes_catalogue_option_self" value="self">Self</option>
            <option className="components_warping_shapes_catalogue_option_other" value="other">Other</option>
            <option className="components_warping_shapes_catalogue_option_either" value="either">Either</option>
            <option className="components_warping_shapes_catalogue_option_written" value="written">Written / Fate</option>
          </select>

          <select
            className={[((ctl)), "components_warping_shapes_catalogue_select_select_5"].filter(Boolean).join(" ")}
            value={nature}
            onChange={(event) =>
              setNature(event.target.value)
            }
          >
            <option className="components_warping_shapes_catalogue_option_option_8" value="">All Natures</option>
            <option className="components_warping_shapes_catalogue_option_beneficial" value="beneficial">Beneficial</option>
            <option className="components_warping_shapes_catalogue_option_harmful" value="harmful">Harmful</option>
            <option className="components_warping_shapes_catalogue_option_mixed" value="mixed">Mixed</option>
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
            className="border border-[rgb(var(--sep-colour-765937))]/55 bg-[rgb(var(--sep-colour-21180f))] px-4 py-2 text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-c8aa7b))] transition hover:border-[rgb(var(--sep-colour-9b7446))]/70 components_warping_shapes_catalogue_button_reset"
          >
            Reset
          </button>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 border-t border-[rgb(var(--sep-colour-59432c))]/20 pt-3 components_warping_shapes_catalogue_div_container_24">
          <p className="text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-6f6353))] components_warping_shapes_catalogue_p_text_24">
            Live Filtering
          </p>

          <p className="shrink-0 text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-9a7c54))] components_warping_shapes_catalogue_p_text_25">
            {filtered.length} / {shapes.length}
          </p>
        </div>
      </section>

      <section className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(380px,1fr))] items-start gap-3 components_warping_shapes_catalogue_section_section_2">
        {filtered.map((shape) => (
          <ShapeArticle
            key={shape.id}
            shape={shape}
          />
        ))}

        {!filtered.length ? (
          <p className="rounded-lg border border-[rgb(var(--sep-colour-59432c))]/30 bg-[rgb(var(--sep-colour-100c09))] p-5 text-[11px] text-[rgb(var(--sep-colour-8f8271))] components_warping_shapes_catalogue_p_text_26">
            No Shapes match these filters.
          </p>
        ) : null}
      </section>
    </>
  );
}
