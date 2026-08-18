"use server";

import { createClient } from "@/lib/supabase/server";
import { formatRemnants, formatSignedRemnants } from "@/lib/economy/currency";

export async function CharacterLedger({ characterId }: { characterId: string }) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("remnant_ledger")
    .select("id, amount, balance_after, reason, created_at")
    .eq("character_id", characterId)
    .order("created_at", { ascending: false })
    .limit(250);

  if (error) throw new Error(`Unable to load Ledger: ${error.message}`);
  const entries = data ?? [];

  return (
    <section className="border border-[#60482e]/40 bg-[#130f0c]">
      <div className="border-b border-[#59432c]/30 px-4 py-3 sm:px-5">
        <p className="text-[8px] uppercase tracking-[0.2em] text-[#806b50]">Economy</p>
        <h2 className="mt-1 font-serif text-2xl text-[#dfc79c]">Immutable Ledger</h2>
        <p className="mt-1 text-[10px] leading-5 text-[#827564]">
          Every Remnant gained or spent by this character is recorded permanently.
        </p>
      </div>
      {entries.length ? (
        <div className="max-h-[520px] overflow-y-auto">
          {entries.map((entry) => (
            <div key={entry.id} className="grid gap-2 border-b border-[#59432c]/25 px-4 py-3 last:border-b-0 sm:grid-cols-[120px_minmax(0,1fr)_130px_145px] sm:items-center sm:px-5">
              <span className={Number(entry.amount) > 0 ? "text-[11px] text-emerald-400" : "text-[11px] text-red-400"}>
                {formatSignedRemnants(Number(entry.amount))}
              </span>
              <span className="min-w-0 text-[10px] leading-5 text-[#a99578]">{entry.reason}</span>
              <span className="text-[9px] text-[#756958] sm:text-right">Balance {formatRemnants(Number(entry.balance_after))}</span>
              <time className="text-[8px] text-[#665b4d] sm:text-right">{new Date(entry.created_at).toLocaleString("en-GB")}</time>
            </div>
          ))}
        </div>
      ) : (
        <p className="px-5 py-8 text-center text-[10px] text-[#756958]">No Ledger transactions yet.</p>
      )}
    </section>
  );
}
