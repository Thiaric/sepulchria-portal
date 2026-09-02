import {
  setCharacterCosmeticEntitlement,
} from "@/app/(portal)/admin/characters/cosmetic-actions";
import {
  COSMETIC_LABELS,
  type CosmeticCategory,
} from "@/lib/cosmetics/catalogue";

export type CharacterCosmeticRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: CosmeticCategory;
  preview_image_url: string | null;
  asset_url: string | null;
  is_active: boolean;
};

export type CharacterCosmeticEntitlementRow = {
  cosmetic_item_id: string;
  enabled: boolean;
  source:
    | "paid"
    | "staff"
    | "reward"
    | "promotion"
    | "gift"
    | "event";
  note: string | null;
  granted_at: string;
  granted_by: string | null;
  updated_at: string;
};

export function AdminCharacterCosmeticsAccess({
  characterId,
  cosmetics,
  entitlements,
}: {
  characterId: string;
  cosmetics: CharacterCosmeticRow[];
  entitlements: CharacterCosmeticEntitlementRow[];
}) {
  const byCosmetic = new Map(
    entitlements.map((entry) => [entry.cosmetic_item_id, entry]),
  );

  return (
    <section className="mt-6 overflow-hidden border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))]">
      <div className="border-b border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-100c09))] px-5 py-4">
        <p className="text-[9px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-8c704b))]">
          Cosmetic access
        </p>
        <h2 className="mt-2 font-serif text-2xl text-[rgb(var(--sep-colour-e1c89f))]">
          Premium Cosmetics
        </h2>
      </div>

      <div className="grid gap-px bg-[rgb(var(--sep-colour-4f3b28))]/35 lg:grid-cols-2">
        {cosmetics.map((cosmetic) => {
          const entitlement = byCosmetic.get(cosmetic.id);
          const enabled = entitlement?.enabled === true;

          return (
            <form
              key={cosmetic.id}
              data-admin-premium-feature="true"
              data-admin-feature-name={cosmetic.name}
              data-admin-feature-type={`Cosmetic · ${COSMETIC_LABELS[cosmetic.category]}`}
              action={setCharacterCosmeticEntitlement}
              className="bg-[rgb(var(--sep-colour-17110d))] p-5"
            >
              <input
                type="hidden"
                name="characterId"
                value={characterId}
              />
              <input
                type="hidden"
                name="cosmeticItemId"
                value={cosmetic.id}
              />

              <div className="flex items-start gap-4">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-0d0907))] p-2">
                  {cosmetic.preview_image_url ?? cosmetic.asset_url ? (
                    <img
                      src={
                        cosmetic.preview_image_url ??
                        cosmetic.asset_url ??
                        ""
                      }
                      alt=""
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : null}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-[7px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
                    {COSMETIC_LABELS[cosmetic.category]}
                  </p>
                  <h3 className="mt-1 font-serif text-lg text-[rgb(var(--sep-colour-dfc79c))]">
                    {cosmetic.name}
                  </h3>
                  <p className="mt-2 text-[11px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">
                    {cosmetic.description}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-4">
                <select
                  name="enabled"
                  defaultValue={enabled ? "true" : "false"}
                  className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0d0907))] px-3 py-2.5 text-sm text-[rgb(var(--sep-colour-d7c4a5))]"
                >
                  <option value="false">Disabled</option>
                  <option value="true">Enabled</option>
                </select>

                <select
                  name="source"
                  defaultValue={entitlement?.source ?? "staff"}
                  className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0d0907))] px-3 py-2.5 text-sm text-[rgb(var(--sep-colour-d7c4a5))]"
                >
                  <option value="paid">Real-money purchase</option>
                  <option value="staff">Staff grant</option>
                  <option value="reward">Reward</option>
                  <option value="promotion">Promotion</option>
                  <option value="gift">Gift</option>
                  <option value="event">Event</option>
                </select>

                <textarea
                  name="note"
                  rows={3}
                  maxLength={1000}
                  defaultValue={entitlement?.note ?? ""}
                  placeholder="Optional staff note"
                  className="w-full resize-y border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0d0907))] px-3 py-2.5 text-sm text-[rgb(var(--sep-colour-d7c4a5))]"
                />
              </div>

              <div className="mt-5 flex justify-end border-t border-[rgb(var(--sep-colour-5d452d))]/35 pt-4">
                <button
                  type="submit"
                  className="border border-[rgb(var(--sep-colour-8d6d3e))] bg-[rgb(var(--sep-colour-332719))] px-4 py-2 text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-efd9aa))]"
                >
                  Save ownership
                </button>
              </div>
            </form>
          );
        })}
      </div>
    </section>
  );
}
