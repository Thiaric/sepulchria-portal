"use server";

import { createClient } from "@/lib/supabase/server";
import { LedgerEntries } from "@/components/economy/ledger-entries";

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
    <section className="border border-[rgb(var(--sep-colour-60482e))]/40 bg-[rgb(var(--sep-colour-130f0c))]">
      <div className="border-b border-[rgb(var(--sep-colour-59432c))]/30 px-4 py-3 sm:px-5">
        <p className="text-[8px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-806b50))]">Economy</p>
        <h2 className="mt-1 font-serif text-2xl text-[rgb(var(--sep-colour-dfc79c))]">Immutable Ledger</h2>
        <p className="mt-1 text-[10px] leading-5 text-[rgb(var(--sep-colour-827564))]">
          Every Remnant gained or spent by this character is recorded permanently.
        </p>
      </div>
      {entries.length ? (
        <LedgerEntries entries={entries} />
      ) : (
        <p className="px-5 py-8 text-center text-[10px] text-[rgb(var(--sep-colour-756958))]">No Ledger transactions yet.</p>
      )}
    </section>
  );
}
