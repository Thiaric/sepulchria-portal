import "server-only";

import { createClient } from "@/lib/supabase/server";
import { formatRemnants } from "@/lib/economy/currency";

export async function CharacterRemnantsWallet({ characterId }: { characterId: string }) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("character_wallets")
    .select("balance")
    .eq("character_id", characterId)
    .maybeSingle();

  if (error) throw new Error(`Unable to load Remnants: ${error.message}`);
  const balance = Number(data?.balance ?? 0);

  return (
    <section className="components_characters_character_remnants_wallet_section_section">
      
          <p className="text-[7px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))] components_characters_character_remnants_wallet_p_text">Currency (Remnants)</p>
          <dd className="mt-1 flex items-baseline gap-1">
          <span className="font-serif text-2xl text-[rgb(var(--sep-colour-e0c79d))] components_characters_character_remnants_wallet_span_text">{formatRemnants(balance)}</span>
        </dd>
    </section>
  );
}
