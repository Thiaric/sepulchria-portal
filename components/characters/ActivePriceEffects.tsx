import "server-only";
import { createClient } from "@/lib/supabase/server";
import { PriceTooltip } from "@/components/warping/price-tooltip";
import { getWarpingPriceDefinition } from "@/lib/warping/price-definitions";

export async function ActivePriceEffects({characterId}:{characterId:string}) {
  const db=await createClient();
  const q=await db.from("character_price_effects").select("id,price_key,stage,expires_at").eq("character_id",characterId).gt("expires_at",new Date().toISOString()).order("expires_at");
  if(q.error)throw Error(q.error.message);
  if(!q.data?.length)return null;

  return <section className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))]/95 p-5 sm:p-6">
    <h2 className="font-serif text-2xl text-[rgb(var(--sep-colour-dec89f))]">The Price</h2>
    <div className="mt-3 flex flex-wrap gap-2">
      {q.data.map(effect=>{
        const def=getWarpingPriceDefinition(effect.price_key);
        return <PriceTooltip key={effect.id} priceKey={effect.price_key}>
          <span className="border border-[rgb(var(--sep-colour-765937))]/70 bg-[rgb(var(--sep-colour-21170f))] px-2 py-1 text-[8px] uppercase text-[rgb(var(--sep-colour-d9b77f))] underline decoration-dotted underline-offset-2">
            {def?.name??effect.price_key} · Stage {effect.stage}
          </span>
        </PriceTooltip>;
      })}
    </div>
  </section>;
}
