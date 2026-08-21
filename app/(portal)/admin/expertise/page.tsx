import { awardExpertise } from "./actions";
import { requireStaff } from "@/lib/auth/require-staff";
import { createClient } from "@/lib/supabase/server";

type Row = {
  character_id: string;
  display_name: string;
  expertise: number | string;
  online_seconds_progress: number | string;
  action_characters_progress: number | string;
};

export default async function ExpertiseAdminPage() {
  await requireStaff();
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("staff_expertise_overview");
  if (error) throw new Error(`Unable to load Expertise: ${error.message}`);

  const rows = (data ?? []) as Row[];

  return (
    <main className="p-5 sm:p-7 lg:p-9">
      <div className="mx-auto max-w-6xl">
        <p className="text-[9px] uppercase tracking-[0.28em] text-[rgb(var(--sep-colour-8b704e))]">
          Character progression
        </p>
        <h2 className="mt-2 font-serif text-3xl text-[rgb(var(--sep-colour-e2cda4))]">Expertise</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[rgb(var(--sep-colour-9f927f))]">
          0.3 Expertise per continuous portal hour and 0.5 Expertise per
          2,000 eligible roleplay characters. Staff may also award or correct
          Expertise manually.
        </p>

        <section className="mt-7 overflow-hidden border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-120e0b))]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead className="border-b border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-18110d))]">
                <tr className="text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-8f795c))]">
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
                    <tr key={row.character_id} className="border-b border-[rgb(var(--sep-colour-60482e))]/25 align-top">
                      <td className="px-4 py-4 font-serif text-[rgb(var(--sep-colour-dcc49b))]">{row.display_name}</td>
                      <td className="px-4 py-4 text-[rgb(var(--sep-colour-ead3a6))]">{Number(row.expertise).toFixed(1)}</td>
                      <td className="px-4 py-4 text-xs text-[rgb(var(--sep-colour-a99b89))]">
                        {Math.floor(seconds / 60)} / 60 min
                      </td>
                      <td className="px-4 py-4 text-xs text-[rgb(var(--sep-colour-a99b89))]">
                        {chars.toLocaleString("en-GB")} / 2,000 chars
                      </td>
                      <td className="px-4 py-4">
                        <form action={awardExpertise} className="flex min-w-[300px] gap-2">
                          <input type="hidden" name="character_id" value={row.character_id} />
                          <input
                            name="amount"
                            type="number"
                            step="0.1"
                            required
                            placeholder="+/- XP"
                            className="w-20 border border-[rgb(var(--sep-colour-60482e))] bg-[rgb(var(--sep-colour-0b0807))] px-2 py-2 text-xs text-[rgb(var(--sep-colour-e8dcc4))]"
                          />
                          <input
                            name="note"
                            maxLength={240}
                            placeholder="Reason"
                            className="min-w-0 flex-1 border border-[rgb(var(--sep-colour-60482e))] bg-[rgb(var(--sep-colour-0b0807))] px-2 py-2 text-xs text-[rgb(var(--sep-colour-e8dcc4))]"
                          />
                          <button className="border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-3 py-2 text-[9px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-efd6a8))]">
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
