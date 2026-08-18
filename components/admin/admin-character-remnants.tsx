import "server-only";

import { AdminActionForm } from "@/components/admin/admin-action-form";
import { LedgerEntries } from "@/components/economy/ledger-entries";
import { createClient } from "@/lib/supabase/server";
import { formatRemnants } from "@/lib/economy/currency";
import { adjustCharacterRemnants } from "@/app/(portal)/admin/characters/remnants-actions";

export async function AdminCharacterRemnants({ characterId }: { characterId: string }) {
  const supabase = await createClient();

  const [walletResult, ledgerResult] = await Promise.all([
    supabase.from("character_wallets").select("balance").eq("character_id", characterId).maybeSingle(),
    supabase.from("remnant_ledger")
      .select("id, amount, balance_after, reason, created_at")
      .eq("character_id", characterId)
      .order("created_at", { ascending: false })
      .limit(250),
  ]);

  const error = walletResult.error ?? ledgerResult.error;
  if (error) throw new Error(`Unable to load Remnant administration: ${error.message}`);

  const balance = Number(walletResult.data?.balance ?? 0);
  const entries = ledgerResult.data ?? [];

  return (
    <section className="mt-6 border border-[#60482e]/45 bg-[#15100d] p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[9px] uppercase tracking-[0.24em] text-[#8c704b]">Economy</p>
          <h3 className="mt-2 font-serif text-2xl text-[#dfc99f]">Remnants</h3>
          <p className="mt-1 text-[11px] text-[#8f8271]">Immutable ledger-backed character wallet.</p>
        </div>
        <div className="text-right">
          <p className="text-[8px] uppercase tracking-[0.14em] text-[#756958]">Current balance</p>
          <p className="mt-1 font-serif text-3xl text-[#e3c17e]">{formatRemnants(balance)}</p>
        </div>
      </div>

      <AdminActionForm
        action={adjustCharacterRemnants}
        className="mt-5 grid gap-3 sm:grid-cols-[140px_minmax(0,1fr)_auto] sm:items-end"
      >
        <input type="hidden" name="characterId" value={characterId} />
        <label>
          <span className="mb-1.5 block text-[8px] uppercase tracking-[0.14em] text-[#806b50]">Adjustment</span>
          <input type="number" name="amount" required step={1} placeholder="+/-"
            className="w-full border border-[#60482e]/55 bg-[#100c09] px-3 py-2.5 text-sm text-[#d7c4a5] outline-none focus:border-[#a17a49]" />
        </label>
        <label>
          <span className="mb-1.5 block text-[8px] uppercase tracking-[0.14em] text-[#806b50]">Reason</span>
          <input type="text" name="reason" required minLength={3} maxLength={240}
            placeholder="Why is this balance being changed?"
            className="w-full border border-[#60482e]/55 bg-[#100c09] px-3 py-2.5 text-sm text-[#d7c4a5] outline-none placeholder:text-[#625747] focus:border-[#a17a49]" />
        </label>
        <button type="submit"
          className="border border-[#85653c] bg-[#342617] px-4 py-2.5 text-[9px] uppercase tracking-[0.16em] text-[#efd4a0] transition hover:bg-[#4a351f]">
          Apply adjustment
        </button>
      </AdminActionForm>

      <div className="mt-5 border-t border-[#59432c]/30 pt-4">
        <p className="mb-2 text-[8px] uppercase tracking-[0.14em] text-[#806b50]">Recent ledger</p>
        {entries.length ? (
          <div className="border border-[#59432c]/25">
            <LedgerEntries entries={entries} compact />
          </div>
        ) : (
          <p className="py-5 text-center text-[10px] text-[#756958]">No Ledger transactions yet.</p>
        )}
      </div>
    </section>
  );
}
