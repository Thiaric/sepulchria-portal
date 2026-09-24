import "server-only";

import {
  equipNpcInventoryItemAdministration,
  unequipNpcInventoryItemAdministration,
} from "@/app/(portal)/admin/characters/actions";
import { createClient } from "@/lib/supabase/server";

type InventoryRow = {
  record_kind: "standard" | "unique";
  record_id: string;
  item_id: string;
  name: string;
  quantity: number;
  is_equippable: boolean;
  is_equipped: boolean;
  equipped_slot: string | null;
  equipped_layer: string | null;
};

function titleCase(value: string | null) {
  return value
    ? value
        .replace(/_/g, " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase())
    : "—";
}

export async function NpcEquipmentAdmin({
  characterId,
}: {
  characterId: string;
}) {
  const supabase = await createClient();

  const inventory = await supabase.rpc(
    "get_public_character_inventory",
    {
      p_character_id: characterId,
    },
  );

  if (inventory.error) {
    throw new Error(
      `Unable to load NPC Equipment: ${inventory.error.message}`,
    );
  }

  const rows =
    ((inventory.data ?? []) as unknown as InventoryRow[])
      .filter((row) => row.is_equippable);

  const eligibility = await Promise.all(
    rows.map(async (row) => {
      const result = await (supabase as any).rpc(
        "character_can_equip_item",
        {
          p_character_id: characterId,
          p_item_id: row.item_id,
        },
      );

      if (result.error) {
        throw new Error(result.error.message);
      }

      return [
        `${row.record_kind}:${row.record_id}`,
        result.data === true,
      ] as const;
    }),
  );

  const canEquip = new Map(eligibility);
  const equipped = rows.filter((row) => row.is_equipped);
  const available = rows.filter((row) => !row.is_equipped);

  const buttonClass =
    "border border-[rgb(var(--sep-colour-765937))]/60 bg-[rgb(var(--sep-colour-21170f))] px-3 py-2 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-d7bd91))] transition hover:border-[rgb(var(--sep-colour-a17a49))] disabled:cursor-not-allowed disabled:opacity-35";

  return (
    <section
      data-admin-full-row="true"
      className="mt-5 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-100c09))] p-4"
    >
      <p className="text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-806b50))]">
        NPC Equipment
      </p>
      <h3 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-dfc99f))]">
        Equipped Items
      </h3>
      <p className="mt-2 text-[10px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">
        This uses the same Equipment slots, requirements, two-handed rules and passive bonuses as Character Equipment. Equipped weapons become available in this NPC&apos;s Combat panel.
      </p>

      {equipped.length ? (
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {equipped.map((row) => (
            <div
              key={`${row.record_kind}:${row.record_id}`}
              className="flex items-center justify-between gap-3 border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-15100d))] p-3"
            >
              <div className="min-w-0">
                <p className="truncate font-serif text-sm text-[rgb(var(--sep-colour-d8bf91))]">
                  {row.name}
                  {row.quantity > 1 ? ` ×${row.quantity}` : ""}
                </p>
                <p className="mt-1 text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-756958))]">
                  {titleCase(row.equipped_slot)} · {titleCase(row.equipped_layer)}
                </p>
              </div>

              <form action={unequipNpcInventoryItemAdministration}>
                <input type="hidden" name="characterId" value={characterId} />
                <input type="hidden" name="recordKind" value={row.record_kind} />
                <input type="hidden" name="recordId" value={row.record_id} />
                <button type="submit" className={buttonClass}>
                  Unequip
                </button>
              </form>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-xs italic text-[rgb(var(--sep-colour-756958))]">
          No Items equipped.
        </p>
      )}

      <div className="mt-5 border-t border-[rgb(var(--sep-colour-59432c))]/35 pt-4">
        <p className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
          Available Equipment
        </p>

        {available.length ? (
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {available.map((row) => {
              const eligible =
                canEquip.get(`${row.record_kind}:${row.record_id}`) === true;

              return (
                <div
                  key={`${row.record_kind}:${row.record_id}`}
                  className="flex items-center justify-between gap-3 border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-15100d))] p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-serif text-sm text-[rgb(var(--sep-colour-d8bf91))]">
                      {row.name}
                      {row.quantity > 1 ? ` ×${row.quantity}` : ""}
                    </p>
                    <p
                      className={`mt-1 text-[7px] uppercase tracking-[0.12em] ${
                        eligible ? "text-emerald-500" : "text-red-400"
                      }`}
                    >
                      {eligible ? "Requirements met" : "Requirements not met"}
                    </p>
                  </div>

                  <form action={equipNpcInventoryItemAdministration}>
                    <input type="hidden" name="characterId" value={characterId} />
                    <input type="hidden" name="recordKind" value={row.record_kind} />
                    <input type="hidden" name="recordId" value={row.record_id} />
                    <button
                      type="submit"
                      disabled={!eligible}
                      className={buttonClass}
                    >
                      Equip
                    </button>
                  </form>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mt-3 text-xs italic text-[rgb(var(--sep-colour-756958))]">
            No unequipped equippable Items in this NPC&apos;s Inventory.
          </p>
        )}
      </div>
    </section>
  );
}
