from pathlib import Path
import subprocess, sys

BASE="48e5b75fe3fae0eb582938a18a35751b7de42a08"
P_GAME=Path("app/(portal)/game/page.tsx")
P_G=Path("app/(portal)/game/components/GatheringPanel.tsx")
P_H=Path("app/(portal)/game/components/HouseOfChancesPanel.tsx")
P_M=Path("app/(portal)/game/components/MechanicsInfoModal.tsx")

def die(m):
    print("PATCH FAILED:",m); sys.exit(1)
def one(s,a,b,label):
    c=s.count(a)
    if c!=1: die(f"{label}: expected 1 match, found {c}")
    return s.replace(a,b,1)

head=subprocess.check_output(["git","rev-parse","HEAD"],text=True).strip()
if head!=BASE: die(f"Patch is for {BASE}, current HEAD is {head}")
for p in (P_GAME,P_G,P_H):
    if not p.exists(): die(f"Missing {p}")
if P_M.exists(): die(f"{P_M} already exists")

P_M.write_text(r'''\"use client\";

import { useEffect, type ReactNode } from "react";

export function MechanicsInfoModal({
  open,title,subtitle,onClose,children,
}:{
  open:boolean;
  title:string;
  subtitle?:string;
  onClose:()=>void;
  children:ReactNode;
}) {
  useEffect(()=>{
    if(!open)return;
    const onKey=(e:KeyboardEvent)=>{if(e.key==="Escape")onClose()};
    window.addEventListener("keydown",onKey);
    return()=>window.removeEventListener("keydown",onKey);
  },[open,onClose]);

  if(!open)return null;

  return (
    <div
      className="fixed inset-0 z-[140] flex items-center justify-center bg-black/75 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}
    >
      <div className="max-h-[82dvh] w-full max-w-2xl overflow-hidden border border-[rgb(var(--sep-colour-765937))]/75 bg-[rgb(var(--sep-colour-100c09))] shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-[rgb(var(--sep-colour-60482e))]/40 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <p className="text-[7px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-806b50))]">Information</p>
            <h3 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-e6cfaa))]">{title}</h3>
            {subtitle?<p className="mt-1 text-[9px] leading-4 text-[rgb(var(--sep-colour-8f8271))]">{subtitle}</p>:null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close information"
            className="shrink-0 border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-17110d))] px-2.5 py-1.5 text-sm leading-none text-[rgb(var(--sep-colour-bda77f))] transition hover:border-[rgb(var(--sep-colour-987344))] hover:text-[rgb(var(--sep-colour-efd6a8))]"
          >x</button>
        </div>
        <div className="max-h-[calc(82dvh-92px)] overflow-y-auto p-4 sm:p-5">{children}</div>
      </div>
    </div>
  );
}
''',encoding="utf-8")

s=P_G.read_text(encoding="utf-8")
s=one(s,'import { usePortalAudio } from "@/components/audio/portal-audio-provider";',
'''import { usePortalAudio } from "@/components/audio/portal-audio-provider";
import { MechanicsInfoModal } from "./MechanicsInfoModal";''',"gather import")
s=one(s,'''export type GatheringStateRow = {
  gathering_location_id: string;
  room_id: string;
  location_name: string;
  location_description: string | null;
  nothing_chance: number;
  daily_limit: number;
  attempts_used: number;
  attempts_remaining: number;
};''','''export type GatheringStateRow = {
  gathering_location_id: string;
  room_id: string;
  location_name: string;
  location_description: string | null;
  nothing_chance: number;
  daily_limit: number;
  attempts_used: number;
  attempts_remaining: number;
};

export type GatheringInfoRow = {
  id: string;
  label: string;
  detail: string | null;
  chance_percent: number;
  is_nothing?: boolean;
};''',"gather type")
s=one(s,'''export function GatheringPanel({
  state,
}: {
  state: GatheringStateRow;
}) {''','''export function GatheringPanel({
  state,
  info,
}: {
  state: GatheringStateRow;
  info: GatheringInfoRow[];
}) {''',"gather props")
s=one(s,'  const [pending, startTransition] = useTransition();',
'''  const [pending, startTransition] = useTransition();
  const [infoOpen, setInfoOpen] = useState(false);''',"gather state")
s=one(s,'''            <h3 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-e6cfaa))] game_components_gatheringpanel_h3_uncover">
              What will you uncover?
            </h3>''','''            <div className="mt-1 flex items-center gap-2">
              <h3 className="font-serif text-xl text-[rgb(var(--sep-colour-e6cfaa))] game_components_gatheringpanel_h3_uncover">
                What will you uncover?
              </h3>
              <button
                type="button"
                onClick={() => setInfoOpen(true)}
                aria-label={`Show Gathering chances for ${state.location_name}`}
                title="Possible Gathering results"
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[rgb(var(--sep-colour-765937))]/70 bg-[rgb(var(--sep-colour-17110d))] font-serif text-[11px] text-[rgb(var(--sep-colour-c9aa78))] transition hover:border-[rgb(var(--sep-colour-a17a49))] hover:text-[rgb(var(--sep-colour-efd6a8))]"
              >i</button>
            </div>''',"gather button")
s=one(s,'''      </div>
    </details>
  );
}''','''      </div>

      <MechanicsInfoModal
        open={infoOpen}
        onClose={() => setInfoOpen(false)}
        title={`${state.location_name} · Gathering`}
        subtitle="Possible results for one Gathering attempt at this Location."
      >
        {info.length ? (
          <div className="space-y-2">
            {info.map(entry => (
              <div key={entry.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-15100d))] px-3 py-2.5">
                <div className="min-w-0">
                  <p className={`font-serif text-sm ${entry.is_nothing ? "italic text-[rgb(var(--sep-colour-8f8271))]" : "text-[rgb(var(--sep-colour-d8c29b))]"}`}>{entry.label}</p>
                  {entry.detail?<p className="mt-0.5 text-[8px] leading-4 text-[rgb(var(--sep-colour-756958))]">{entry.detail}</p>:null}
                </div>
                <span className="self-center whitespace-nowrap font-serif text-sm tabular-nums text-[rgb(var(--sep-colour-e6cfaa))]">
                  {entry.chance_percent.toFixed(2).replace(/\\.?0+$/, "")}%
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[10px] italic text-[rgb(var(--sep-colour-756958))]">No Gathering results are currently available for this Location.</p>
        )}
      </MechanicsInfoModal>
    </details>
  );
}''',"gather modal")
P_G.write_text(s,encoding="utf-8")

s=P_H.read_text(encoding="utf-8")
s=one(s,'import { usePortalSkin } from "@/components/portal/portal-skin-provider";',
'''import { usePortalSkin } from "@/components/portal/portal-skin-provider";
import { MechanicsInfoModal } from "./MechanicsInfoModal";''',"house import")
s=one(s,'''export type HouseOfChancesStateRow = {
  is_open: boolean;
  play_cost: number;
  daily_play_limit: number;
  plays_used: number;
  plays_remaining: number;
  wallet_balance: number;
  room_slug: string;
};''','''export type HouseOfChancesStateRow = {
  is_open: boolean;
  play_cost: number;
  daily_play_limit: number;
  plays_used: number;
  plays_remaining: number;
  wallet_balance: number;
  room_slug: string;
};

export type HouseOfChancesInfoRow = {
  id: string;
  name: string;
  condition: string;
  rewards: string[];
};''',"house type")
s=one(s,'''export function HouseOfChancesPanel({
  state,
}: {
  state: HouseOfChancesStateRow;
}) {''','''export function HouseOfChancesPanel({
  state,
  info,
}: {
  state: HouseOfChancesStateRow;
  info: HouseOfChancesInfoRow[];
}) {''',"house props")
s=one(s,'  const [pending, startTransition] = useTransition();',
'''  const [pending, startTransition] = useTransition();
  const [infoOpen, setInfoOpen] = useState(false);''',"house state")
s=one(s,'''                <h3 className="mt-1 font-serif text-lg text-[rgb(var(--sep-colour-e6cfaa))] sm:text-xl game_components_houseofchancespanel_h3_let_house_read_fortune">
                  Let the House read your fortune
                </h3>''','''                <div className="mt-1 flex items-center justify-center gap-2">
                  <h3 className="font-serif text-lg text-[rgb(var(--sep-colour-e6cfaa))] sm:text-xl game_components_houseofchancespanel_h3_let_house_read_fortune">
                    Let the House read your fortune
                  </h3>
                  <button
                    type="button"
                    onClick={() => setInfoOpen(true)}
                    aria-label="Show House of Chances winning combinations"
                    title="Winning combinations"
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[rgb(var(--sep-colour-765937))]/70 bg-[rgb(var(--sep-colour-17110d))] font-serif text-[11px] text-[rgb(var(--sep-colour-c9aa78))] transition hover:border-[rgb(var(--sep-colour-a17a49))] hover:text-[rgb(var(--sep-colour-efd6a8))]"
                  >i</button>
                </div>''',"house button")
s=one(s,'''      </div>
    </details>
  );
}''','''      </div>

      <MechanicsInfoModal
        open={infoOpen}
        onClose={() => setInfoOpen(false)}
        title="House of Chances · Winning Combinations"
        subtitle="If more than one rule matches the same three rolls, the highest-priority configured rule wins."
      >
        {info.length ? (
          <div className="space-y-2">
            {info.map(entry => (
              <div key={entry.id} className="border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-15100d))] px-3 py-2.5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-serif text-sm text-[rgb(var(--sep-colour-d8c29b))]">{entry.name}</p>
                  <p className="text-[8px] uppercase tracking-[0.1em] text-[rgb(var(--sep-colour-a98b61))]">{entry.condition}</p>
                </div>
                <div className="mt-2 border-t border-[rgb(var(--sep-colour-59432c))]/25 pt-2">
                  {entry.rewards.length
                    ? <p className="text-[9px] leading-5 text-[rgb(var(--sep-colour-c3ad89))]">{entry.rewards.join(" · ")}</p>
                    : <p className="text-[9px] italic text-[rgb(var(--sep-colour-756958))]">No prize configured.</p>}
                </div>
              </div>
            ))}
            <p className="pt-1 text-[8px] italic leading-4 text-[rgb(var(--sep-colour-756958))]">
              Any roll that matches none of the combinations above wins nothing.
            </p>
          </div>
        ) : (
          <p className="text-[10px] italic text-[rgb(var(--sep-colour-756958))]">No winning combinations are currently configured.</p>
        )}
      </MechanicsInfoModal>
    </details>
  );
}''',"house modal")
P_H.write_text(s,encoding="utf-8")

s=P_GAME.read_text(encoding="utf-8")
s=one(s,'import { createClient } from "@/lib/supabase/server";',
'''import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";''',"game admin import")
s=one(s,'''  HouseOfChancesPanel,
  type HouseOfChancesStateRow,
} from "./components/HouseOfChancesPanel";''','''  HouseOfChancesPanel,
  type HouseOfChancesStateRow,
  type HouseOfChancesInfoRow,
} from "./components/HouseOfChancesPanel";''',"house info import")
s=one(s,'''  GatheringPanel,
  type GatheringStateRow,
} from "./components/GatheringPanel";''','''  GatheringPanel,
  type GatheringStateRow,
  type GatheringInfoRow,
} from "./components/GatheringPanel";''',"gather info import")
s=one(s,'  const room = rawRoom as RoomRelation;',
'''  const room = rawRoom as RoomRelation;
  const gameAdmin = createAdminClient();''',"admin client")

s=one(s,'''  const oddJobsPromise =
    room.slug === "odd-jobs-bureau"''','''  const gatheringInfoPromise =
    gameAdmin
      .from("gathering_locations")
      .select(`
        id,
        nothing_chance,
        rewards:gathering_rewards(
          id,reward_type,item_id,quantity_min,quantity_max,
          remnants_min,remnants_max,weight,is_active,sort_order,
          item:items(name)
        )
      `)
      .eq("room_id", room.id)
      .eq("is_active", true)
      .maybeSingle();

  const houseRulesInfoPromise =
    room.slug === "house-of-chances"
      ? gameAdmin
          .from("house_of_chances_prize_rules")
          .select("id,name,priority,sort_order,match_type,roll_1_min,roll_1_max,roll_2_min,roll_2_max,roll_3_min,roll_3_max,total_min,total_max")
          .eq("is_active", true)
          .order("priority", { ascending: false })
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [], error: null });

  const houseRewardsInfoPromise =
    room.slug === "house-of-chances"
      ? gameAdmin
          .from("house_of_chances_rule_rewards")
          .select("id,rule_id,reward_type,remnants_amount,item_id,quantity,sort_order,item:items(name)")
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [], error: null });

  const oddJobsPromise =
    room.slug === "odd-jobs-bureau"''',"info promises")

s=one(s,'''    gatheringResult,
    oddJobsResult,''','''    gatheringResult,
    gatheringInfoResult,
    houseRulesInfoResult,
    houseRewardsInfoResult,
    oddJobsResult,''',"destructure info")
s=one(s,'''    gatheringPromise,
    oddJobsPromise,''','''    gatheringPromise,
    gatheringInfoPromise,
    houseRulesInfoPromise,
    houseRewardsInfoPromise,
    oddJobsPromise,''',"promise info")

s=one(s,'''  const {
    data: oddJobsData,
    error: oddJobsError,
  } = oddJobsResult;''',r'''  const gatheringInfo: GatheringInfoRow[] = (() => {
    if (gatheringInfoResult.error || !gatheringInfoResult.data) return [];

    const location = gatheringInfoResult.data as any;
    const nothingChance = Math.max(0, Math.min(100, Number(location.nothing_chance ?? 0)));
    const rewards = (Array.isArray(location.rewards) ? location.rewards : [])
      .filter((reward:any) => reward.is_active === true)
      .sort((a:any,b:any) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0));
    const totalWeight = rewards.reduce((sum:number,reward:any) => sum + Math.max(0,Number(reward.weight ?? 0)),0);
    const rewardPool = Math.max(0,100-nothingChance);

    const rows: GatheringInfoRow[] = rewards.map((reward:any) => {
      const item = Array.isArray(reward.item) ? reward.item[0] ?? null : reward.item ?? null;
      const chance = totalWeight > 0 ? rewardPool * (Math.max(0,Number(reward.weight ?? 0)) / totalWeight) : 0;

      if (reward.reward_type === "remnants") {
        const min = Number(reward.remnants_min ?? 0);
        const max = Number(reward.remnants_max ?? min);
        return {
          id:String(reward.id),
          label:min===max ? `${min.toLocaleString("en-GB")} Remnants` : `${min.toLocaleString("en-GB")}–${max.toLocaleString("en-GB")} Remnants`,
          detail:null,
          chance_percent:chance,
        };
      }

      const min = Number(reward.quantity_min ?? 1);
      const max = Number(reward.quantity_max ?? min);
      return {
        id:String(reward.id),
        label:item?.name ?? "Unknown Item",
        detail:min===max ? `Quantity ${min}` : `Quantity ${min}–${max}`,
        chance_percent:chance,
      };
    });

    if (nothingChance > 0) {
      rows.push({
        id:"nothing",
        label:"Nothing useful",
        detail:null,
        chance_percent:nothingChance,
        is_nothing:true,
      });
    }

    return rows;
  })();

  const {
    data: oddJobsData,
    error: oddJobsError,
  } = oddJobsResult;''',"gather info calculation")

s=one(s,'''  const {
    data: breezeLodgingsData,
    error: breezeLodgingsError,
  } = breezeLodgingsResult;''',r'''  const houseOfChancesInfo: HouseOfChancesInfoRow[] = (() => {
    if (houseRulesInfoResult.error || houseRewardsInfoResult.error) return [];

    const rules = (houseRulesInfoResult.data ?? []) as any[];
    const rewards = (houseRewardsInfoResult.data ?? []) as any[];

    const condition = (rule:any) => {
      if (rule.match_type === "exact") return `Exactly ${rule.roll_1_min} / ${rule.roll_2_min} / ${rule.roll_3_min}`;
      if (rule.match_type === "all_equal") {
        const ranged = rule.roll_1_min !== null || rule.roll_1_max !== null;
        return ranged ? `All three equal (${rule.roll_1_min ?? 1}–${rule.roll_1_max ?? 100})` : "All three equal";
      }
      if (rule.match_type === "all_in_range") return `All three between ${rule.roll_1_min} and ${rule.roll_1_max}`;
      if (rule.match_type === "total_range") return `Total between ${rule.total_min} and ${rule.total_max}`;
      return `R1 ${rule.roll_1_min}–${rule.roll_1_max} · R2 ${rule.roll_2_min}–${rule.roll_2_max} · R3 ${rule.roll_3_min}–${rule.roll_3_max}`;
    };

    return rules.map((rule:any) => ({
      id:String(rule.id),
      name:String(rule.name),
      condition:condition(rule),
      rewards:rewards
        .filter((reward:any) => reward.rule_id === rule.id)
        .map((reward:any) => {
          if (reward.reward_type === "remnants") {
            return `${Number(reward.remnants_amount ?? 0).toLocaleString("en-GB")} Remnants`;
          }
          const item = Array.isArray(reward.item) ? reward.item[0] ?? null : reward.item ?? null;
          return `${item?.name ?? "Unknown Item"} × ${Number(reward.quantity ?? 1)}`;
        }),
    }));
  })();

  const {
    data: breezeLodgingsData,
    error: breezeLodgingsError,
  } = breezeLodgingsResult;''',"house info calculation")

s=one(s,'        <GatheringPanel state={gatheringState} />',
'''        <GatheringPanel
          state={gatheringState}
          info={gatheringInfo}
        />''',"wire gather")
s=one(s,'        <HouseOfChancesPanel state={houseOfChancesState} />',
'''        <HouseOfChancesPanel
          state={houseOfChancesState}
          info={houseOfChancesInfo}
        />''',"wire house")
P_GAME.write_text(s,encoding="utf-8")

for p in (P_GAME,P_G,P_H,P_M):
    if not p.exists(): die(f"Verification missing {p}")
if "100-nothingChance" not in P_GAME.read_text(encoding="utf-8"): die("Gathering formula missing")
if 'title="Winning combinations"' not in P_H.read_text(encoding="utf-8"): die("House button missing")
if 'title="Possible Gathering results"' not in P_G.read_text(encoding="utf-8"): die("Gathering button missing")

print("PATCH APPLIED SUCCESSFULLY")
print("Base:",BASE)
for p in (P_GAME,P_G,P_H,P_M): print(" -",p)
print("No Gathering or House of Chances mechanics changed.")
print("Next: npm run build")
