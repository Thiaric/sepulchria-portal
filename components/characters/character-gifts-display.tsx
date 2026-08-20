import "server-only";

import { createClient } from "@/lib/supabase/server";

type Gift = {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  effect_mode: "none" | "passive" | "temporary";
  duration_minutes: number | null;
  cooldown_minutes: number;
  health_delta: number;
  max_health_modifier: number;
  muscles_modifier: number;
  reflexes_modifier: number;
  vigour_modifier: number;
  shrewd_modifier: number;
  brains_modifier: number;
  presence_modifier: number;
};

type Activation = {
  activated_at: string;
  expires_at: string;
  ended_at: string | null;
  health_reverted_at: string | null;
};

type Ownership = {
  id: string;
  acquisition_source: "ancestry" | "order" | "staff";
  expires_at: string | null;
  gift: Gift | Gift[] | null;
  activations: Activation[] | null;
};

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function signed(value: number) {
  return value >= 0 ? `+${value}` : String(value);
}

function sourceLabel(value: Ownership["acquisition_source"]) {
  if (value === "ancestry") return "Ancestry";
  if (value === "order") return "Order";
  return "Staff";
}

function modifierText(gift: Gift) {
  return [
    ["HP", gift.health_delta],
    ["Max HP", gift.max_health_modifier],
    ["Mus", gift.muscles_modifier],
    ["Ref", gift.reflexes_modifier],
    ["Vig", gift.vigour_modifier],
    ["Shr", gift.shrewd_modifier],
    ["Bra", gift.brains_modifier],
    ["Pre", gift.presence_modifier],
  ]
    .filter(([, value]) => Number(value) !== 0)
    .map(
      ([label, value]) =>
        `${label} ${signed(Number(value))}`,
    )
    .join(" · ");
}

export async function CharacterGiftsDisplay({
  characterId,
  compact = false,
}: {
  characterId: string;
  compact?: boolean;
}) {
  const supabase = await createClient();

  const { error: staffExpiryError } = await supabase.rpc(
    "reconcile_expired_staff_gifts",
    { p_character_id: characterId },
  );

  if (staffExpiryError) {
    throw new Error(`Unable to reconcile expired staff Feats: ${staffExpiryError.message}`);
  }

  const { data, error } = await supabase
    .from("character_gifts")
    .select(`
      id,
      acquisition_source,
      expires_at,
      gift:gifts(
        id,
        name,
        description,
        is_active,
        effect_mode,
        duration_minutes,
        cooldown_minutes,
        health_delta,
        max_health_modifier,
        muscles_modifier,
        reflexes_modifier,
        vigour_modifier,
        shrewd_modifier,
        brains_modifier,
        presence_modifier
      ),
      activations:gift_activations(
        activated_at,
        expires_at,
        ended_at,
        health_reverted_at
      )
    `)
    .eq("character_id", characterId);

  if (error) {
    throw new Error(
      `Unable to load character Feats: ${error.message}`,
    );
  }

  const ownerships =
    (data ?? []) as unknown as Ownership[];

  const shell = compact
    ? "border border-[#60482e]/45 bg-[#100c09] p-4"
    : "border border-[#60482e]/45 bg-[#15100d]/95 p-5 sm:p-6";

  if (!ownerships.length) {
    return (
      <section className={shell}>
        <p className="text-[8px] uppercase tracking-[0.22em] text-[#806b50]">
          Character Feats
        </p>
        <p className="mt-2 text-[10px] italic leading-5 text-[#756957]">
          No Feats have been assigned.
        </p>
      </section>
    );
  }

  const now = Date.now();

  return (
    <section className={shell}>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[8px] uppercase tracking-[0.22em] text-[#806b50]">
            Character Feats
          </p>
          <h2 className="mt-1 font-serif text-xl text-[#dec89f]">
            Feats
          </h2>
        </div>

        <p className="text-[7px] uppercase tracking-[0.14em] text-[#756958]">
          {ownerships.length} owned
        </p>
      </div>

      <div className="mt-4 space-y-2">
        {ownerships.map((ownership) => {
          const gift = one(ownership.gift);

          if (!gift) {
            return null;
          }

          const activation =
            (ownership.activations ?? []).find(
              (item) =>
                item.ended_at === null &&
                item.health_reverted_at === null &&
                Date.parse(item.activated_at) <= now &&
                Date.parse(item.expires_at) > now,
            ) ?? null;

          let state = "Usable";

          const latestActivation =
            [...(ownership.activations ?? [])]
              .sort(
                (a, b) =>
                  Date.parse(b.activated_at) -
                  Date.parse(a.activated_at),
              )[0] ?? null;

          const cooldownUntil =
            gift.effect_mode === "temporary" &&
            latestActivation &&
            gift.cooldown_minutes > 0
              ? Date.parse(latestActivation.activated_at) +
                gift.cooldown_minutes * 60_000
              : null;

          if (!gift.is_active) {
            state = "Inactive";
          } else if (gift.effect_mode === "passive") {
            state = "Passive";
          } else if (gift.effect_mode === "temporary") {
            state = activation
              ? `Active until ${new Date(
                  activation.expires_at,
                ).toLocaleTimeString("en-GB", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}`
              : cooldownUntil &&
                  cooldownUntil > now
                ? `Cooldown · ${Math.ceil(
                    (cooldownUntil - now) /
                      60_000,
                  )} min`
                : `Ready · ${gift.duration_minutes ?? "?"} min`;
          }

          const modifiers = modifierText(gift);

          return (
            <div
              key={ownership.id}
              className="border border-[#59432c]/35 bg-[#100c09] p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-serif text-sm text-[#d8bf91]">
                    {gift.name}
                  </p>
                  <p className="mt-1 text-[7px] uppercase tracking-[0.12em] text-[#756958]">
                    {sourceLabel(
                      ownership.acquisition_source,
                    )}
                    {ownership.acquisition_source === "staff" && ownership.expires_at
                      ? ` · Granted until ${new Date(ownership.expires_at).toLocaleDateString("en-GB")}`
                      : ""}{" "}
                    · {state}
                  </p>
                </div>

                {modifiers ? (
                  <p className="text-[7px] uppercase tracking-[0.08em] text-[#a68a61]">
                    {modifiers}
                  </p>
                ) : null}
              </div>

              {gift.description ? (
                <p className="mt-2 text-[10px] leading-5 text-[#8f8271]">
                  {gift.description}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
