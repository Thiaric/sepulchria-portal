import {
  setCharacterFeatureEntitlement,
} from "@/app/(portal)/admin/characters/actions";

export type CharacterFeatureEntitlementRow = {
  feature_key: "private_chat" | "friend_list";
  enabled: boolean;
  source: "paid" | "expertise" | "staff";
  note: string | null;
  granted_at: string;
  updated_at: string;
};

const FEATURES = [
  {
    key: "private_chat",
    name: "Private Chats",
    description:
      "Allows this character to use staff-created invitation-only Private Chats.",
  },
  {
    key: "friend_list",
    name: "Friend List",
    description:
      "Allows this character to use friend requests and character relationships.",
  },
] as const;

export function AdminCharacterFeatureAccess({
  characterId,
  entitlements,
}: {
  characterId: string;
  entitlements: CharacterFeatureEntitlementRow[];
}) {
  const byFeature = new Map(
    entitlements.map((entry) => [entry.feature_key, entry]),
  );

  return (
    <section className="mt-6 overflow-hidden border border-[#60482e]/45 bg-[#15100d]">
      <div className="border-b border-[#60482e]/35 bg-[#100c09] px-5 py-4">
        <p className="text-[9px] uppercase tracking-[0.24em] text-[#8c704b]">
          Feature access
        </p>
        <h2 className="mt-2 font-serif text-2xl text-[#e1c89f]">
          Premium & reward features
        </h2>
        <p className="mt-2 max-w-3xl text-[11px] leading-5 text-[#8f8271]">
          Staff controls optional character features. Paid records a
          real-money purchase already confirmed by staff.
        </p>
      </div>

      <div className="grid gap-px bg-[#4f3b28]/35 lg:grid-cols-2">
        {FEATURES.map((feature) => {
          const entitlement = byFeature.get(feature.key);
          const enabled = entitlement?.enabled === true;

          return (
            <form
              key={feature.key}
              action={setCharacterFeatureEntitlement}
              className="bg-[#17110d] p-5"
            >
              <input type="hidden" name="characterId" value={characterId} />
              <input type="hidden" name="featureKey" value={feature.key} />

              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-serif text-lg text-[#dfc79c]">
                    {feature.name}
                  </h3>
                  <p className="mt-2 text-[11px] leading-5 text-[#8f8271]">
                    {feature.description}
                  </p>
                </div>
                <span className={
                  enabled
                    ? "shrink-0 border border-[#668657] bg-[#172313] px-2 py-1 text-[8px] uppercase tracking-[0.16em] text-[#a8cf92]"
                    : "shrink-0 border border-[#65483e] bg-[#221512] px-2 py-1 text-[8px] uppercase tracking-[0.16em] text-[#b78378]"
                }>
                  {enabled ? "Enabled" : "Disabled"}
                </span>
              </div>

              <div className="mt-5 grid gap-4">
                <label>
                  <span className="text-[8px] uppercase tracking-[0.18em] text-[#806b50]">
                    Access
                  </span>
                  <select
                    name="enabled"
                    defaultValue={enabled ? "true" : "false"}
                    className="mt-2 w-full border border-[#60482e]/55 bg-[#0d0907] px-3 py-2.5 text-sm text-[#d7c4a5]"
                  >
                    <option value="false">Disabled</option>
                    <option value="true">Enabled</option>
                  </select>
                </label>

                <label>
                  <span className="text-[8px] uppercase tracking-[0.18em] text-[#806b50]">
                    Unlock source
                  </span>
                  <select
                    name="source"
                    defaultValue={entitlement?.source ?? "staff"}
                    className="mt-2 w-full border border-[#60482e]/55 bg-[#0d0907] px-3 py-2.5 text-sm text-[#d7c4a5]"
                  >
                    <option value="paid">Real-money purchase</option>
                    <option value="expertise">Expertise reward</option>
                    <option value="staff">Staff grant</option>
                  </select>
                </label>

                <label>
                  <span className="text-[8px] uppercase tracking-[0.18em] text-[#806b50]">
                    Staff note
                  </span>
                  <textarea
                    name="note"
                    rows={3}
                    maxLength={1000}
                    defaultValue={entitlement?.note ?? ""}
                    placeholder="Optional: payment reference, reward reason, event prize..."
                    className="mt-2 w-full resize-y border border-[#60482e]/55 bg-[#0d0907] px-3 py-2.5 text-sm leading-6 text-[#d7c4a5]"
                  />
                </label>
              </div>

              <div className="mt-5 flex justify-end border-t border-[#5d452d]/35 pt-4">
                <button
                  type="submit"
                  className="border border-[#8d6d3e] bg-[#332719] px-4 py-2 text-[9px] uppercase tracking-[0.18em] text-[#efd9aa]"
                >
                  Save access
                </button>
              </div>
            </form>
          );
        })}
      </div>
    </section>
  );
}
