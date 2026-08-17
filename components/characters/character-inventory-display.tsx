import "server-only";

import { createClient } from "@/lib/supabase/server";

type InventoryRow = {
  record_kind: "standard" | "unique";
  record_id: string;
  item_id: string;
  parent_container_id: string | null;
  name: string;
  description: string;
  image_url: string | null;
  category_name: string;
  subcategory_name: string | null;
  quality: string;
  quantity: number;
  is_unique: boolean;
  is_quest_item: boolean;
  transfer_policy: string;
  container_capacity: number | null;
  is_usable: boolean;
};

function titleCase(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function InventoryCard({
  row,
  compact = false,
}: {
  row: InventoryRow;
  compact?: boolean;
}) {
  return (
    <article
      className={`border border-[#59432c]/40 bg-[#120e0b] ${
        compact ? "p-3" : "p-4"
      }`}
    >
      <div className="flex gap-3">
        <div
          className={`shrink-0 overflow-hidden border border-[#60482e]/45 bg-[#0d0907] ${
            compact ? "h-10 w-10" : "h-14 w-14"
          }`}
        >
          {row.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={row.image_url}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center font-serif text-[#756247]">
              ◇
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-serif text-base text-[#dec89f]">
                {row.name}
                {row.quantity > 1 ? (
                  <span className="ml-2 font-sans text-[10px] text-[#9b8768]">
                    ×{row.quantity}
                  </span>
                ) : null}
              </p>

              <p className="mt-1 text-[7px] uppercase tracking-[0.14em] text-[#776957]">
                {row.category_name}
                {row.subcategory_name
                  ? ` · ${row.subcategory_name}`
                  : ""}
                {" · "}
                {titleCase(row.quality)}
              </p>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {row.is_unique ? (
                <span className="border border-[#8d6d3e]/55 px-2 py-1 text-[7px] uppercase tracking-[0.12em] text-[#c7a46e]">
                  Unique
                </span>
              ) : null}

              {row.is_quest_item ? (
                <span className="border border-[#65456f]/55 px-2 py-1 text-[7px] uppercase tracking-[0.12em] text-[#bda0c7]">
                  Quest
                </span>
              ) : null}

              {row.is_usable ? (
                <span className="border border-[#49634f]/55 px-2 py-1 text-[7px] uppercase tracking-[0.12em] text-[#9cbe9f]">
                  Usable
                </span>
              ) : null}
            </div>
          </div>

          {!compact && row.description?.trim() ? (
            <p className="mt-3 whitespace-pre-wrap text-xs leading-6 text-[#9f927f]">
              {row.description}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export async function CharacterInventoryDisplay({
  characterId,
}: {
  characterId: string;
}) {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc(
    "get_public_character_inventory",
    {
      p_character_id: characterId,
    },
  );

  if (error) {
    throw new Error(
      `Unable to load character Inventory: ${error.message}`,
    );
  }

  const rows = (data ?? []) as unknown as InventoryRow[];

  if (!rows.length) {
    return (
      <section className="border border-[#60482e]/35 bg-[#130f0c] p-6">
        <h2 className="font-serif text-xl text-[#dfc79c]">
          Inventory
        </h2>
        <p className="mt-3 text-sm italic text-[#817565]">
          This character is not carrying any recorded Items.
        </p>
      </section>
    );
  }

  const byContainer = new Map<string, InventoryRow[]>();

  for (const row of rows) {
    if (!row.parent_container_id) continue;

    const existing =
      byContainer.get(row.parent_container_id) ?? [];

    existing.push(row);
    byContainer.set(row.parent_container_id, existing);
  }

  const containerIds = new Set(
    rows
      .filter(
        (row) =>
          row.record_kind === "unique" &&
          row.container_capacity !== null,
      )
      .map((row) => row.record_id),
  );

  const rootRows = rows.filter(
    (row) =>
      !row.parent_container_id ||
      !containerIds.has(row.parent_container_id),
  );

  const containers = rootRows.filter(
    (row) =>
      row.record_kind === "unique" &&
      row.container_capacity !== null,
  );

  const looseItems = rootRows.filter(
    (row) =>
      !(
        row.record_kind === "unique" &&
        row.container_capacity !== null
      ),
  );

  const sortRows = (values: InventoryRow[]) =>
    [...values].sort(
      (a, b) =>
        a.category_name.localeCompare(b.category_name) ||
        a.name.localeCompare(b.name),
    );

  return (
    <section className="border border-[#60482e]/35 bg-[#130f0c] p-4 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[8px] uppercase tracking-[0.22em] text-[#806b50]">
            Possessions
          </p>
          <h2 className="mt-1 font-serif text-2xl text-[#dfc79c]">
            Inventory
          </h2>
        </div>

        <p className="text-[8px] uppercase tracking-[0.12em] text-[#756958]">
          {rows.length} record{rows.length === 1 ? "" : "s"}
        </p>
      </div>

      {looseItems.length ? (
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {sortRows(looseItems).map((row) => (
            <InventoryCard
              key={`${row.record_kind}-${row.record_id}`}
              row={row}
            />
          ))}
        </div>
      ) : null}

      {containers.length ? (
        <div className={`${looseItems.length ? "mt-5" : "mt-4"} space-y-4`}>
          {sortRows(containers).map((container) => {
            const children = sortRows(
              byContainer.get(container.record_id) ?? [],
            );

            return (
              <section
                key={container.record_id}
                className="border border-[#6b5032]/45 bg-[#100c09] p-3 sm:p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[7px] uppercase tracking-[0.18em] text-[#806b50]">
                      Container
                    </p>
                    <h3 className="mt-1 font-serif text-lg text-[#d9c094]">
                      {container.name}
                    </h3>
                  </div>

                  <span className="text-[8px] uppercase tracking-[0.12em] text-[#766957]">
                    {children.length} / {container.container_capacity} slots
                  </span>
                </div>

                {container.description?.trim() ? (
                  <p className="mt-2 text-xs leading-5 text-[#8f8271]">
                    {container.description}
                  </p>
                ) : null}

                {children.length ? (
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    {children.map((row) => (
                      <InventoryCard
                        key={`${row.record_kind}-${row.record_id}`}
                        row={row}
                        compact
                      />
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-xs italic text-[#756958]">
                    Empty.
                  </p>
                )}
              </section>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
