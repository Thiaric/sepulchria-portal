"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import {
  useMechanicalFeat,
  type MechanicalFeatActionState,
} from "../feat-mechanics-actions";
import {
  EffectDispelPicker,
} from "./EffectDispelPicker";

type PresentCharacter = {
  id: string;
  display_name: string;
};

type Gift = {
  characterGiftId: string;
  name: string;
  description: string;
  cooldownUntil: string | null;
  mechanicsShape: Record<string, any> | null;
};

const initialState: MechanicalFeatActionState = {
  ok: false,
  message: "",
};

const ATTR_LABEL: Record<string, string> = {
  muscles: "Muscles",
  reflexes: "Reflexes",
  vigor: "Vigour",
  vigour: "Vigour",
  brains: "Brains",
  shrewd: "Shrewd",
  presence: "Presence",
  presence_score: "Presence",
};

function signed(value: number) {
  return value > 0 ? `+${value}` : String(value);
}

function durationLabel(shape: Record<string, any>) {
  if (shape.is_instantaneous) return "Instantaneous";
  if (shape.duration_unit === "until_dispelled") return "Until Dispelled";
  return `${shape.duration_amount ?? 1} ${shape.duration_unit ?? "minutes"}`;
}

function cooldownLabel(
  cooldownUntil: string | null,
) {
  if (!cooldownUntil) return null;

  const remaining =
    Date.parse(cooldownUntil) -
    Date.now();

  if (remaining <= 0) {
    return null;
  }

  const totalMinutes =
    Math.ceil(
      remaining / 60_000,
    );

  const hours =
    Math.floor(
      totalMinutes / 60,
    );

  const minutes =
    totalMinutes % 60;

  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m remaining`;
  }

  if (hours > 0) {
    return `${hours}h remaining`;
  }

  return `${minutes}m remaining`;
}

function profileBits(
  shape: Record<string, any>,
  profile: "self" | "other" | "other_alt",
) {
  const bits: string[] = [];

  const damage = [
    shape[`${profile}_damage_dice`],
    shape[`${profile}_damage_attribute`]
      ? `+ ${
          ATTR_LABEL[shape[`${profile}_damage_attribute`]] ??
          shape[`${profile}_damage_attribute`]
        }`
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (damage) {
    bits.push(
      `Damage ${damage}${shape.damage_type ? ` ${shape.damage_type}` : ""}`,
    );
  }

  const healing = [
    shape[`${profile}_heal_dice`],
    shape[`${profile}_heal_attribute`]
      ? `+ ${
          ATTR_LABEL[shape[`${profile}_heal_attribute`]] ??
          shape[`${profile}_heal_attribute`]
        }`
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (healing) bits.push(`Healing ${healing}`);

  const conditions = Array.isArray(shape[`${profile}_conditions`])
    ? shape[`${profile}_conditions`]
    : [];

  if (conditions.length) bits.push(`Conditions: ${conditions.join(", ")}`);

  for (const [key, label] of [
    ["muscles", "Muscles"],
    ["reflexes", "Reflexes"],
    ["vigour", "Vigour"],
    ["brains", "Brains"],
    ["shrewd", "Shrewd"],
    ["presence", "Presence"],
  ]) {
    const amount = Number(shape[`${profile}_${key}_modifier`] ?? 0);
    if (amount) bits.push(`${label} ${signed(amount)}`);
  }

  if (shape[`${profile}_max_hp_change`]) {
    bits.push(`Max HP ${shape[`${profile}_max_hp_change`]}`);
  }

  return bits;
}

export function MechanicalFeatPanel({
  gift,
  viewerCharacterId,
  presentCharacters,
  onResolved,
}: {
  gift: Gift;
  viewerCharacterId: string;
  presentCharacters: PresentCharacter[];
  onResolved?: () => void | Promise<void>;
}) {
  const router = useRouter();

  if (!gift.mechanicsShape) {
    return null;
  }

  const shape = gift.mechanicsShape;

  const [state, action] = useActionState(
    useMechanicalFeat,
    initialState,
  );

  const targetMode = String(shape.target_mode ?? "self");
  const maxTargets =
    shape.target_scope === "multiple"
      ? Math.max(1, Number(shape.max_targets ?? 1))
      : 1;

  const [targets, setTargets] = useState<string[]>(
    () =>
      targetMode === "self" || targetMode === "either"
        ? [viewerCharacterId]
        : [],
  );

  const [choices, setChoices] = useState<
    Record<string, "beneficial" | "harmful">
  >({});

  useEffect(() => {
    setTargets(
      targetMode === "self" || targetMode === "either"
        ? [viewerCharacterId]
        : [],
    );
    setChoices({});
  }, [gift.characterGiftId, targetMode, viewerCharacterId]);

  useEffect(() => {
    if (!state.ok || !state.submittedAt) return;

    if (onResolved) {
      void onResolved();
      return;
    }

    router.refresh();
  }, [onResolved, router, state.ok, state.submittedAt]);

  const candidates = useMemo(
    () => [
      ...(targetMode === "either"
        ? [{ id: viewerCharacterId, display_name: "Self" }]
        : []),
      ...presentCharacters,
    ],
    [presentCharacters, targetMode, viewerCharacterId],
  );

  function toggleTarget(id: string) {
    if (targetMode === "self") return;

    setTargets((current) => {
      if (current.includes(id)) {
        if (targetMode === "either" && current.length === 1) return current;
        return current.filter((value) => value !== id);
      }

      if (maxTargets === 1) return [id];
      return [...current, id].slice(-maxTargets);
    });
  }

  const selfBits = profileBits(shape, "self");
  const otherBits = profileBits(shape, "other");
  const harmfulBits = profileBits(shape, "other_alt");

 const cooldownRemaining =
  cooldownLabel(
    gift.cooldownUntil,
  );

const cooldown =
  Boolean(
    cooldownRemaining,
  );

  return (
    <div className="mt-3 border border-[rgb(var(--sep-colour-765937))]/45 bg-[rgb(var(--sep-colour-15100d))] p-3">
      <input
        type="hidden"
        name="mechanics_target_ids"
        value={JSON.stringify(targets)}
        readOnly
      />
      <input
        type="hidden"
        name="mechanics_effect_choices"
        value={JSON.stringify(choices)}
        readOnly
      />

      <div className="grid gap-2 text-[9px] sm:grid-cols-2 lg:grid-cols-3">
        <div className="border border-[rgb(var(--sep-skin-c1))]/35 bg-[rgb(var(--sep-skin-c1))]/10 px-3 py-2 text-[rgb(var(--sep-skin-c1))]">
          <b className="font-semibold">Target:</b>{" "}
          {targetMode} ·{" "}
          {shape.target_scope === "multiple"
            ? `up to ${maxTargets}`
            : "single"}
        </div>

        <div className="border border-[rgb(var(--sep-skin-c2))]/35 bg-[rgb(var(--sep-skin-c2))]/10 px-3 py-2 text-[rgb(var(--sep-skin-c2))]">
          <b className="font-semibold">Nature:</b>{" "}
          {shape.effect_nature ?? "—"}
        </div>

        <div className="border border-[rgb(var(--sep-skin-c1))]/35 bg-[rgb(var(--sep-skin-c1))]/10 px-3 py-2 text-[rgb(var(--sep-skin-c1))]">
          <b className="font-semibold">Duration:</b>{" "}
          {durationLabel(shape)}
        </div>
      </div>

      {selfBits.length ? (
        <div className="mt-3 border-l-2 border-[rgb(var(--sep-skin-c2))]/60 bg-[rgb(var(--sep-skin-c2))]/10 px-3 py-2 text-[9px] leading-5 text-[rgb(var(--sep-skin-c2))]">
          <b className="font-semibold">Self profile:</b>{" "}
          {selfBits.join(" · ")}
        </div>
      ) : null}

      {otherBits.length ? (
        <div className="mt-2 border-l-2 border-[rgb(var(--sep-skin-c1))]/60 bg-[rgb(var(--sep-skin-c1))]/10 px-3 py-2 text-[9px] leading-5 text-[rgb(var(--sep-skin-c1))]">
          <b className="font-semibold">Other profile:</b>{" "}
          {otherBits.join(" · ")}
        </div>
      ) : null}

      {shape.other_alternative_enabled &&
      harmfulBits.length ? (
        <div className="mt-2 border-l-2 border-[rgb(var(--sep-skin-c2))]/60 bg-[rgb(var(--sep-skin-c2))]/10 px-3 py-2 text-[9px] leading-5 text-[rgb(var(--sep-skin-c2))]">
          <b className="font-semibold">Harmful Other:</b>{" "}
          {harmfulBits.join(" · ")}
        </div>
      ) : null}

      {targetMode !== "self" ? (
        <div className="mt-3 space-y-2">
          <p className="text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-806b50))]">
            Targets
          </p>

          {candidates.map((target) => {
            const selected = targets.includes(target.id);
            const self = target.id === viewerCharacterId;

            return (
              <div key={target.id} className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleTarget(target.id)}
                  className={`border px-3 py-2 text-[8px] uppercase tracking-[0.12em] ${
                    selected
                      ? "border-[rgb(var(--sep-colour-a17a49))] bg-[rgb(var(--sep-colour-342617))] text-[rgb(var(--sep-colour-efd4a0))]"
                      : "border-[rgb(var(--sep-colour-60482e))] bg-[rgb(var(--sep-colour-17110d))] text-[rgb(var(--sep-colour-a99577))]"
                  }`}
                >
                  {selected ? "✓ " : ""}
                  {target.display_name}
                </button>

                {selected && !self && shape.other_alternative_enabled ? (
                  <select
                    value={choices[target.id] ?? "beneficial"}
                    onChange={(event) =>
                      setChoices((current) => ({
                        ...current,
                        [target.id]: event.target.value as
                          | "beneficial"
                          | "harmful",
                      }))
                    }
                    className="border border-[rgb(var(--sep-colour-60482e))] bg-[rgb(var(--sep-colour-0f0c09))] px-2 py-2 text-[8px] text-[rgb(var(--sep-colour-c7ad83))]"
                  >
                    <option value="beneficial">Beneficial</option>
                    <option value="harmful">Harmful</option>
                  </select>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}

      {shape.is_dispel &&
      targets.length === 1 ? (
        <EffectDispelPicker
          targetCharacterId={targets[0]!}
          dispelSourceType="feat"
          inputName="mechanics_dispel_effect_id"
        />
      ) : null}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          {cooldownRemaining ? (
            <div className="border border-[rgb(var(--sep-skin-c2))]/40 bg-[rgb(var(--sep-skin-c2))]/10 px-3 py-2">
              <p className="text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-skin-c2))]">
                Feat Cooldown
              </p>

              <p className="mt-1 text-xs font-medium text-[rgb(var(--sep-skin-c1))]">
                {cooldownRemaining}
              </p>
            </div>
          ) : state.message ? (
            <p
              aria-live="polite"
              className={`text-xs ${
                state.ok
                  ? "text-[rgb(var(--sep-skin-c1))]"
                  : "text-[rgb(var(--sep-skin-c2))]"
              }`}
            >
              {state.message}
            </p>
          ) : null}
        </div>

        <button
          type="submit"
          formAction={action}
          formNoValidate
          disabled={
            cooldown ||
            targets.length === 0
          }
          className={`border px-4 py-2.5 text-[8px] uppercase tracking-[0.14em] transition ${
            cooldown
              ? "cursor-not-allowed border-[rgb(var(--sep-skin-c2))]/35 bg-[rgb(var(--sep-skin-c2))]/10 text-[rgb(var(--sep-skin-c2))]"
              : "border-[rgb(var(--sep-skin-c1))]/45 bg-[rgb(var(--sep-skin-c1))]/10 text-[rgb(var(--sep-skin-c1))] hover:bg-[rgb(var(--sep-skin-c1))]/15"
          }`}
        >
          {cooldown
            ? `Cooldown · ${cooldownRemaining}`
            : "Use Feat"}
        </button>
      </div>
    </div>
  );
}