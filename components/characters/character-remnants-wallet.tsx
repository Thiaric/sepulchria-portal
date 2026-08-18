import "server-only";

import { createClient } from "@/lib/supabase/server";
import { formatRemnants, formatSignedRemnants } from "@/lib/economy/currency";

export async function CharacterRemnantsWallet({ characterId }: { characterId: string }) {
  const supabase = await createClient();

  const [walletResult, ledgerResult] = await Promise.all([
    supabase.from("character_wallets").select("balance").eq("character_id", characterId).maybeSingle(),
    supabase.from("remnant_ledger")
      .select("id, amount, balance_after, reason, created_at")
      .eq("character_id", characterId)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const error = walletResult.error ?? ledgerResult.error;
  if (error) throw new Error(`Unable to load Remnants: ${error.message}`);

  const balance = Number(walletResult.data?.balance ?? 0);

  return (
    <section className="mt-4 border border-[#60482e]/40 bg-[#130f0c]">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div>
          <p className="text-[7px] uppercase tracking-[0.18em] text-[#806b50]">Remnants</p>
          <p className="mt-1 font-serif text-2xl text-[#e2c389]">{formatRemnants(balance)}</p>
        </div>
        <p className="max-w-sm text-right text-[8px] leading-4 text-[#776b5b]">
          Every change to this balance is recorded permanently.
        </p>
      </div>

      {(ledgerResult.data ?? []).length ? (
        <div className="border-t border-[#59432c]/30 px-4 py-3">
          <p className="mb-2 text-[7px] uppercase tracking-[0.15em] text-[#756958]">Recent activity</p>
          <div className="space-y-1.5">
            {(ledgerResult.data ?? []).map((entry) => (
              <div key={entry.id} className="flex items-center justify-between gap-3 text-[9px]">
                <span className="min-w-0 truncate text-[#958774]">{entry.reason}</span>
                <span className={Number(entry.amount) > 0 ? "shrink-0 text-emerald-400" : "shrink-0 text-red-400"}>
                  {formatSignedRemnants(Number(entry.amount))}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
