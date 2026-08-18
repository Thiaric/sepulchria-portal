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
    <section className="mt-4 border border-[#60482e]/40 bg-[#130f0c]">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div>
          <p className="text-[7px] uppercase tracking-[0.18em] text-[#806b50]">Remnants</p>
          <p className="mt-1 font-serif text-2xl text-[#e2c389]">{formatRemnants(balance)}</p>
        </div>
        <p className="max-w-sm text-right text-[8px] leading-4 text-[#776b5b]">
          Every change to this balance is recorded permanently in your Ledger.
        </p>
      </div>
    </section>
  );
}
