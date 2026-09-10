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
    <section className="mt-6 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-5 sm:p-6 components_admin_admin_character_remnants_section_section">
      <div className="flex flex-wrap items-end justify-between gap-4 components_admin_admin_character_remnants_div_container">
        <div className="components_admin_admin_character_remnants_div_remnants">
          <p className="text-[9px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-8c704b))] components_admin_admin_character_remnants_p_remnants">Economy</p>
          <h3 className="mt-2 font-serif text-2xl text-[rgb(var(--sep-colour-dfc99f))] components_admin_admin_character_remnants_h3_remnants">Remnants</h3>
          <p className="mt-1 text-[11px] text-[rgb(var(--sep-colour-8f8271))] components_admin_admin_character_remnants_p_remnants_2">Immutable ledger-backed character wallet.</p>
        </div>
        <div className="text-right components_admin_admin_character_remnants_div_container_2">
          <p className="text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-756958))] components_admin_admin_character_remnants_p_text">Current balance</p>
          <p className="mt-1 font-serif text-3xl text-[rgb(var(--sep-colour-e3c17e))] components_admin_admin_character_remnants_p_text_2">{formatRemnants(balance)}</p>
        </div>
      </div>

      <AdminActionForm
        action={adjustCharacterRemnants}
        className="mt-5 grid gap-3 sm:grid-cols-[140px_minmax(0,1fr)_auto] sm:items-end"
      >
        <input className="components_admin_admin_character_remnants_input_character_id" type="hidden" name="characterId" value={characterId} />
        <label className="components_admin_admin_character_remnants_label_label">
          <span className="mb-1.5 block text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-806b50))] components_admin_admin_character_remnants_span_text">Adjustment</span>
          <input type="number" name="amount" required step={1} placeholder="+/-"
            className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))] components_admin_admin_character_remnants_input_amount" />
        </label>
        <label className="components_admin_admin_character_remnants_label_label_2">
          <span className="mb-1.5 block text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-806b50))] components_admin_admin_character_remnants_span_text_2">Reason</span>
          <input type="text" name="reason" required minLength={3} maxLength={240}
            placeholder="Why is this balance being changed?"
            className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none placeholder:text-[rgb(var(--sep-colour-625747))] focus:border-[rgb(var(--sep-colour-a17a49))] components_admin_admin_character_remnants_input_reason" />
        </label>
        <button type="submit"
          className="border border-[rgb(var(--sep-colour-85653c))] bg-[rgb(var(--sep-colour-342617))] px-4 py-2.5 text-[9px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-efd4a0))] transition hover:bg-[rgb(var(--sep-colour-4a351f))] components_admin_admin_character_remnants_button_apply_adjustment">
          Apply adjustment
        </button>
      </AdminActionForm>

      <div className="mt-5 border-t border-[rgb(var(--sep-colour-59432c))]/30 pt-4 components_admin_admin_character_remnants_div_container_3">
        <p className="mb-2 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-806b50))] components_admin_admin_character_remnants_p_text_3">Recent ledger</p>
        {entries.length ? (
          <div className="border border-[rgb(var(--sep-colour-59432c))]/25 components_admin_admin_character_remnants_div_container_4">
            <LedgerEntries entries={entries} compact />
          </div>
        ) : (
          <p className="py-5 text-center text-[10px] text-[rgb(var(--sep-colour-756958))] components_admin_admin_character_remnants_p_text_4">No Ledger transactions yet.</p>
        )}
      </div>
    </section>
  );
}
