import "server-only";

import {
  GiftsCatalogue,
  type GiftCard,
} from "@/components/gifts/gifts-catalogue";
import { createClient } from "@/lib/supabase/server";

function one<T>(
  value: T | T[] | null,
): T | null {
  return Array.isArray(value)
    ? value[0] ?? null
    : value;
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
    throw new Error(
      `Unable to reconcile expired staff Feats: ${staffExpiryError.message}`,
    );
  }

  const { data, error } = await supabase
    .from("character_gifts")
    .select(`
      id,
      expires_at,
      gift:gifts(
        id,
        name,
        description,
        is_active,
        is_general,
        effect_mode,
        target_mode,
        duration_minutes,
        cooldown_minutes,
        success_die,
        success_threshold,
        success_attribute,
        damage_dice,
        damage_type,
        health_delta,
        max_health_modifier,
        muscles_modifier,
        reflexes_modifier,
        vigour_modifier,
        shrewd_modifier,
        brains_modifier,
        presence_modifier,
        warping_affinity_modifier,
        warps_per_day_modifier,
        races:gift_races(
          race:races(id,name)
        ),
        roles:gift_order_jobs(
          role:order_jobs(
            id,
            name,
            level:order_levels(
              level,
              order:orders(id,name)
            )
          )
        )
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

  const now = Date.now();
  const gifts: GiftCard[] = [];

  for (const rawOwnership of data ?? []) {
    const ownership = rawOwnership as any;
    const gift = one<any>(ownership.gift);

    if (!gift) continue;

    const activations = Array.isArray(ownership.activations)
      ? ownership.activations
      : [];

    const active =
      activations.find(
        (item: any) =>
          item.ended_at === null &&
          item.health_reverted_at === null &&
          Date.parse(item.activated_at) <= now &&
          Date.parse(item.expires_at) > now,
      ) ?? null;

    const latest =
      [...activations].sort(
        (a: any, b: any) =>
          Date.parse(b.activated_at) -
          Date.parse(a.activated_at),
      )[0] ?? null;

    const cooldownUntil =
      gift.effect_mode === "temporary" &&
      latest &&
      Number(gift.cooldown_minutes) > 0
        ? Date.parse(latest.activated_at) +
          Number(gift.cooldown_minutes) * 60_000
        : null;

    let ownershipState = "Ready";

    if (!gift.is_active) {
      ownershipState = "Inactive";
    } else if (gift.effect_mode === "passive") {
      ownershipState = "Passive";
    } else if (active) {
      ownershipState = "Active";
    } else if (cooldownUntil && cooldownUntil > now) {
      ownershipState = `Cooldown · ${Math.ceil(
        (cooldownUntil - now) / 60_000,
      )} min`;
    }

    const ancestries = (gift.races ?? [])
      .map((entry: any) => one<any>(entry.race))
      .filter(Boolean)
      .map((race: any) => ({
        id: race.id,
        name: race.name,
      }));

    const roles = (gift.roles ?? [])
      .map((entry: any) => {
        const role = one<any>(entry.role);
        if (!role) return null;

        const level = one<any>(role.level);
        const order = level ? one<any>(level.order) : null;

        return {
          id: role.id,
          name: role.name,
          level: level?.level ?? null,
          orderId: order?.id ?? null,
          orderName: order?.name ?? null,
        };
      })
      .filter(Boolean) as GiftCard["roles"];

    gifts.push({
      id: gift.id,
      name: gift.name,
      description: gift.description ?? "",
      isGeneral: Boolean(gift.is_general),
      effectMode: gift.effect_mode,
      targetMode: gift.target_mode ?? "self",
      durationMinutes: gift.duration_minutes,
      cooldownMinutes: Number(gift.cooldown_minutes ?? 0),
      successDie: gift.success_die ?? null,
      successThreshold: gift.success_threshold ?? null,
      successAttribute: gift.success_attribute ?? null,
      damageDice: gift.damage_dice ?? null,
      damageType: gift.damage_type ?? null,
      healthDelta: Number(gift.health_delta ?? 0),
      maxHealthModifier: Number(gift.max_health_modifier ?? 0),
      warpingAffinityModifier: Number(
        gift.warping_affinity_modifier ?? 0,
      ),
      warpsPerDayModifier: Number(
        gift.warps_per_day_modifier ?? 0,
      ),
      modifiers: {
        muscles: Number(gift.muscles_modifier ?? 0),
        reflexes: Number(gift.reflexes_modifier ?? 0),
        vigour: Number(gift.vigour_modifier ?? 0),
        shrewd: Number(gift.shrewd_modifier ?? 0),
        brains: Number(gift.brains_modifier ?? 0),
        presence: Number(gift.presence_modifier ?? 0),
      },
      ancestries,
      roles,
      ownershipState,
    });
  }

  gifts.sort((a, b) => a.name.localeCompare(b.name));

  if (!gifts.length) {
    return (
      <section className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-100c09))] p-4">
        <p className="text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-806b50))]">
          Character Feats
        </p>
        <p className="mt-2 text-[10px] italic leading-5 text-[rgb(var(--sep-colour-756957))]">
          No Feats have been assigned.
        </p>
      </section>
    );
  }

  return (
    <section className={compact ? "" : ""}>
      <header className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] px-5 py-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-806b50))]">
              Character Feats
            </p>
            <h2 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-dec89f))]">
              Feats
            </h2>
          </div>

          <p className="text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-756958))]">
            {gifts.length} owned
          </p>
        </div>
      </header>

      <GiftsCatalogue
        gifts={gifts}
        characterMode
      />
    </section>
  );
}
