

import { awardExpertise } from "./actions";
import {
  requireAdminSection,
} from "@/lib/auth/require-staff";
import { createClient } from "@/lib/supabase/server";

type Row = {
  character_id: string;
  display_name: string;
  expertise: number | string;
  online_seconds_progress: number | string;
  action_characters_progress: number | string;
};

export default async function ExpertiseAdminPage() {
  await requireAdminSection("expertise");
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("staff_expertise_overview");
  if (error) throw new Error(`Unable to load Expertise: ${error.message}`);

  const rows = (data ?? []) as Row[];

  return (
    <main className="p-5 sm:p-7 lg:p-9 admin_expertise_page_main_main">
      <div className="mx-auto max-w-6xl admin_expertise_page_div_expertise">
        <p className="text-[9px] uppercase tracking-[0.28em] text-[rgb(var(--sep-colour-8b704e))] admin_expertise_page_p_expertise">
          Character progression
        </p>
        <h2 className="mt-2 font-serif text-3xl text-[rgb(var(--sep-colour-e2cda4))] admin_expertise_page_h2_expertise">Expertise</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[rgb(var(--sep-colour-9f927f))] admin_expertise_page_p_expertise_2">
          0.3 Expertise per continuous portal hour and 0.5 Expertise per
          2,000 eligible roleplay characters. Staff may also award or correct
          Expertise manually.
        </p>

        <section className="mt-7 overflow-hidden border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-120e0b))] admin_expertise_page_section_expertise">
          <div className="overflow-x-auto admin_expertise_page_div_expertise_2">
            <table className="w-full min-w-[760px] text-left admin_expertise_page_table_expertise">
              <thead className="border-b border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-18110d))]">
                <tr className="text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-8f795c))] admin_expertise_page_tr_row">
                  <th className="px-4 py-3">Character</th>
                  <th className="px-4 py-3">Expertise</th>
                  <th className="px-4 py-3">Next time award</th>
                  <th className="px-4 py-3">Next writing award</th>
                  <th className="px-4 py-3">Staff award</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const seconds = Number(row.online_seconds_progress);
                  const chars = Number(row.action_characters_progress);
                  return (
                    <tr id={`expertise-character-${row.character_id}`} key={row.character_id} className="scroll-mt-6 border-b border-[rgb(var(--sep-colour-60482e))]/25 align-top admin_expertise_page_tr_row_2">
                      <td className="px-4 py-4 font-serif text-[rgb(var(--sep-colour-dcc49b))] admin_expertise_page_td_cell">{row.display_name}</td>
                      <td className="px-4 py-4 text-[rgb(var(--sep-colour-ead3a6))] admin_expertise_page_td_cell_2">{Number(row.expertise).toFixed(1)}</td>
                      <td className="px-4 py-4 text-xs text-[rgb(var(--sep-colour-a99b89))] admin_expertise_page_td_cell_3">
                        {Math.floor(seconds / 60)} / 60 min
                      </td>
                      <td className="px-4 py-4 text-xs text-[rgb(var(--sep-colour-a99b89))] admin_expertise_page_td_cell_4">
                        {chars.toLocaleString("en-GB")} / 2,000 chars
                      </td>
                      <td className="px-4 py-4 admin_expertise_page_td_cell_5">
                        <form action={awardExpertise} className="flex min-w-[300px] gap-2 admin_expertise_page_form_award_expertise">
                          <input className="admin_expertise_page_input_character_id" type="hidden" name="character_id" value={row.character_id} />
                          <input
                            name="amount"
                            type="number"
                            step="0.1"
                            required
                            placeholder="+/- XP"
                            className="w-20 border border-[rgb(var(--sep-colour-60482e))] bg-[rgb(var(--sep-colour-0b0807))] px-2 py-2 text-xs text-[rgb(var(--sep-colour-e8dcc4))] admin_expertise_page_input_amount"
                          />
                          <input
                            name="note"
                            maxLength={240}
                            placeholder="Reason"
                            className="min-w-0 flex-1 border border-[rgb(var(--sep-colour-60482e))] bg-[rgb(var(--sep-colour-0b0807))] px-2 py-2 text-xs text-[rgb(var(--sep-colour-e8dcc4))] admin_expertise_page_input_note"
                          />
                          <button className="border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-3 py-2 text-[9px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-efd6a8))] admin_expertise_page_button_apply">
                            Apply
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
