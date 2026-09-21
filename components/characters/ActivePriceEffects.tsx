import "server-only";

import { createClient } from "@/lib/supabase/server";
import { PriceTooltip } from "@/components/warping/price-tooltip";

export async function ActivePriceEffects({
  characterId,
}: {
  characterId: string;
}) {
  const db =
    await createClient();

  const [effectsResult, pricesResult] =
    await Promise.all([
      db
        .from("character_price_effects")
        .select("id,price_key,stage,expires_at")
        .eq("character_id", characterId)
        .gt("expires_at", new Date().toISOString())
        .order("expires_at"),
      db
        .from("warping_prices")
        .select("key,name"),
    ]);

  if (effectsResult.error) {
    throw new Error(effectsResult.error.message);
  }

  if (pricesResult.error) {
    throw new Error(pricesResult.error.message);
  }

  if (!effectsResult.data?.length) {
    return null;
  }

  const priceNames =
    new Map(
      (pricesResult.data ?? []).map(
        (price) => [
          price.key,
          price.name,
        ],
      ),
    );

  return (
    <section
      data-profile-price-box="true"
      className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))]/95 p-5 sm:p-6 components_characters_activepriceeffects_section_price"
    >
      <h2 className="font-serif text-[0.9rem] text-[rgb(var(--sep-colour-dec89f))] components_characters_activepriceeffects_h2_price">
        The Price
      </h2>

      <div className="mt-3 flex flex-wrap gap-2 components_characters_activepriceeffects_div_price">
        {effectsResult.data.map(
          (effect) => (
            <PriceTooltip
              key={effect.id}
              priceKey={effect.price_key}
              expiresAt={effect.expires_at}
            >
              <span className="border border-[rgb(var(--sep-colour-765937))]/70 bg-[rgb(var(--sep-colour-21170f))] px-2 py-1 text-[8px] uppercase text-[rgb(var(--sep-colour-d9b77f))] underline decoration-dotted underline-offset-2 components_characters_activepriceeffects_span_text">
                {priceNames.get(effect.price_key) ?? effect.price_key}
                {" · Stage "}
                {effect.stage}
              </span>
            </PriceTooltip>
          ),
        )}
      </div>
    </section>
  );
}
