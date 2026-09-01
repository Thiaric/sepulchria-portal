import {
  setCharacterCosmeticEntitlement,
} from "@/app/(portal)/admin/characters/cosmetic-actions";

export type CharacterCosmeticRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category:
    | "sheet_frame"
    | "chat_frame";
  preview_image_url:
    | string
    | null;
  asset_url:
    | string
    | null;
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
  granted_by:
    | string
    | null;
  updated_at: string;
};

function categoryLabel(
  category:
    CharacterCosmeticRow["category"],
) {
  return category ===
    "sheet_frame"
    ? "Sheet Frame"
    : "Location Chat Frame";
}

export function AdminCharacterCosmeticsAccess({
  characterId,
  cosmetics,
  entitlements,
}: {
  characterId: string;
  cosmetics:
    CharacterCosmeticRow[];
  entitlements:
    CharacterCosmeticEntitlementRow[];
}) {
  const byCosmetic =
    new Map(
      entitlements.map(
        (entry) => [
          entry.cosmetic_item_id,
          entry,
        ],
      ),
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

        <p className="mt-2 max-w-3xl text-[11px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">
          Grant or revoke
          collectible visual
          cosmetics. Revoking an
          equipped cosmetic
          automatically unequips it.
        </p>
      </div>

      <div className="grid gap-px bg-[rgb(var(--sep-colour-4f3b28))]/35 lg:grid-cols-2">
        {cosmetics.map(
          (cosmetic) => {
            const entitlement =
              byCosmetic.get(
                cosmetic.id,
              );

            const enabled =
              entitlement?.enabled ===
              true;

            return (
              <form
                key={cosmetic.id}
                id={`premium-feature-cosmetic-${cosmetic.id}`}
                data-admin-premium-feature="true"
                data-admin-feature-name={cosmetic.name}
                data-admin-feature-type={`Cosmetic · ${categoryLabel(cosmetic.category)}`}
                action={setCharacterCosmeticEntitlement}
                className="scroll-mt-6 bg-[rgb(var(--sep-colour-17110d))] p-5"
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
                    {cosmetic.preview_image_url ??
                    cosmetic.asset_url ? (
                      <img
                        src={
                          cosmetic.preview_image_url ??
                          cosmetic.asset_url ??
                          ""
                        }
                        alt=""
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <span className="text-center text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-625747))]">
                        No preview
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="mb-1 text-[7px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
                          {categoryLabel(
                            cosmetic.category,
                          )}
                        </p>

                        <h3 className="font-serif text-lg text-[rgb(var(--sep-colour-dfc79c))]">
                          {cosmetic.name}
                        </h3>
                      </div>

                      <span
                        className={
                          enabled
                            ? "shrink-0 border border-[rgb(var(--sep-colour-668657))] bg-[rgb(var(--sep-colour-172313))] px-2 py-1 text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-a8cf92))]"
                            : "shrink-0 border border-[rgb(var(--sep-colour-65483e))] bg-[rgb(var(--sep-colour-221512))] px-2 py-1 text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-b78378))]"
                        }
                      >
                        {enabled
                          ? "Enabled"
                          : "Disabled"}
                      </span>
                    </div>

                    <p className="mt-2 text-[11px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">
                      {cosmetic.description ||
                        "Collectible Sepulchria cosmetic."}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-4">
                  <label>
                    <span className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
                      Access
                    </span>

                    <select
                      name="enabled"
                      defaultValue={
                        enabled
                          ? "true"
                          : "false"
                      }
                      className="mt-2 w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0d0907))] px-3 py-2.5 text-sm text-[rgb(var(--sep-colour-d7c4a5))]"
                    >
                      <option value="false">
                        Disabled
                      </option>

                      <option value="true">
                        Enabled
                      </option>
                    </select>
                  </label>

                  <label>
                    <span className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
                      Unlock source
                    </span>

                    <select
                      name="source"
                      defaultValue={
                        entitlement?.source ??
                        "staff"
                      }
                      className="mt-2 w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0d0907))] px-3 py-2.5 text-sm text-[rgb(var(--sep-colour-d7c4a5))]"
                    >
                      <option value="paid">
                        Real-money purchase
                      </option>
                      <option value="staff">
                        Staff grant
                      </option>
                      <option value="reward">
                        Reward
                      </option>
                      <option value="promotion">
                        Promotion
                      </option>
                      <option value="gift">
                        Gift
                      </option>
                      <option value="event">
                        Event
                      </option>
                    </select>
                  </label>

                  <label>
                    <span className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
                      Staff note
                    </span>

                    <textarea
                      name="note"
                      rows={3}
                      maxLength={1000}
                      defaultValue={
                        entitlement?.note ??
                        ""
                      }
                      placeholder="Optional: purchase reference, reward reason, event prize..."
                      className="mt-2 w-full resize-y border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0d0907))] px-3 py-2.5 text-sm leading-6 text-[rgb(var(--sep-colour-d7c4a5))]"
                    />
                  </label>
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
          },
        )}

        {cosmetics.length === 0 ? (
          <div className="bg-[rgb(var(--sep-colour-17110d))] p-6 text-[11px] leading-5 text-[rgb(var(--sep-colour-8f8271))] lg:col-span-2">
            No active Sheet Frame or
            Chat Frame cosmetics exist
            yet. Create one in
            /admin/cosmetics first.
          </div>
        ) : null}
      </div>
    </section>
  );
}
