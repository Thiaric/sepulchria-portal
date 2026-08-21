import { GiftsCatalogue } from "@/components/gifts/gifts-catalogue";
import { createClient } from "@/lib/supabase/server";

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

export default async function GiftsPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("gifts")
    .select(`
      id,
      name,
      description,
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
        race:races(
          id,
          name
        )
      ),
      roles:gift_order_jobs(
        role:order_jobs(
          id,
          name,
          level:order_levels(
            level,
            order:orders(
              id,
              name
            )
          )
        )
      )
    `)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw new Error(
      `Unable to load Feats: ${error.message}`,
    );
  }

  const gifts = (data ?? []).map((gift) => {
    const ancestries = (gift.races ?? [])
      .map((entry) => one(entry.race))
      .filter(
        (
          race,
        ): race is {
          id: string;
          name: string;
        } => Boolean(race),
      )
      .map((race) => ({
        id: race.id,
        name: race.name,
      }));

    const roles = (gift.roles ?? [])
      .map((entry) => {
        const role = one(entry.role);
        if (!role) return null;

        const level = one(role.level);
        const order = level
          ? one(level.order)
          : null;

        return {
          id: role.id,
          name: role.name,
          level: level?.level ?? null,
          orderId: order?.id ?? null,
          orderName: order?.name ?? null,
        };
      })
      .filter(
        (
          role,
        ): role is {
          id: string;
          name: string;
          level: number | null;
          orderId: string | null;
          orderName: string | null;
        } => Boolean(role),
      );

    return {
      id: gift.id,
      name: gift.name,
      description: gift.description,
      isGeneral: gift.is_general,
      effectMode: gift.effect_mode as
        | "none"
        | "passive"
        | "temporary",
      targetMode:
        (gift.target_mode ?? "self") as
          | "self"
          | "other"
          | "either",
      durationMinutes:
        gift.duration_minutes,
      cooldownMinutes:
        gift.cooldown_minutes,
      successDie:
        gift.success_die ?? null,
      successThreshold:
        gift.success_threshold ?? null,
      successAttribute:
        (gift.success_attribute ?? null) as
          | "muscles"
          | "reflexes"
          | "vigor"
          | "brains"
          | "shrewd"
          | "presence_score"
          | null,
      damageDice:
        gift.damage_dice ?? null,
      damageType:
        gift.damage_type ?? null,
      healthDelta:
        gift.health_delta,
      maxHealthModifier:
        gift.max_health_modifier,
      warpingAffinityModifier: gift.warping_affinity_modifier,
      warpsPerDayModifier: gift.warps_per_day_modifier,
      modifiers: {
        muscles: gift.muscles_modifier,
        reflexes: gift.reflexes_modifier,
        vigour: gift.vigour_modifier,
        shrewd: gift.shrewd_modifier,
        brains: gift.brains_modifier,
        presence: gift.presence_modifier,
      },
      ancestries,
      roles,
    };
  });

  return (
    <main className="p-5 sm:p-7 lg:p-9">
      <div className="mx-auto max-w-7xl">
        <header className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] px-5 py-5 sm:px-6">
          <p className="text-[8px] uppercase tracking-[0.26em] text-[rgb(var(--sep-colour-8c704b))]">
            Codex
          </p>

          <div className="mt-1 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-serif text-4xl text-[rgb(var(--sep-colour-ead5ac))]">
                Feats
              </h1>

              <p className="mt-2 max-w-3xl text-xs leading-6 text-[rgb(var(--sep-colour-9f927f))]">
                Innate, learned and bestowed capabilities available through Ancestries, Order Roles and general assignment.
              </p>
            </div>

            <p className="text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-766a59))]">
              {gifts.length} active Feats
            </p>
          </div>
        </header>

        <GiftsCatalogue gifts={gifts} />
      </div>
    </main>
  );
}
