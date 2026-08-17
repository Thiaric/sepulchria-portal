import Link from "next/link";
import { notFound } from "next/navigation";

import { requireStaff } from "@/lib/auth/require-staff";
import {
  createUniqueItemForCharacter,
  grantStandardItem,
  moveStandardItem,
  removeStandardItem,
  sendUniqueItemToVault,
  updateUniqueItem,
} from "@/lib/items/admin-inventory-actions";
import { createClient } from "@/lib/supabase/server";

type Relation<T> = T | T[] | null;

type CategoryRef = {
  name: string;
  slug: string;
};

type MasterItem = {
  id: string;
  name: string;
  is_active: boolean;
  category: Relation<CategoryRef>;
};

type StandardRow = {
  id: string;
  quantity: number;
  container_instance_id: string | null;
  item: Relation<{
    id: string;
    name: string;
    quality: string;
    category: Relation<CategoryRef>;
  }>;
};

type HistoryRow = {
  id: string;
  event_type: string;
  details: string;
  created_at: string;
};

type UniqueRow = {
  id: string;
  custom_name: string | null;
  custom_description: string | null;
  custom_image_url: string | null;
  quality_override: string | null;
  transfer_policy_override: string | null;
  is_quest_item_override: boolean | null;
  container_instance_id: string | null;
  notes: string | null;
  item: Relation<{
    id: string;
    name: string;
    quality: string;
    category: Relation<CategoryRef>;
  }>;
  history: HistoryRow[] | null;
};

type Character = {
  id: string;
  display_name: string | null;
  first_name: string;
  surname: string;
  public_slug: string;
};

type Props = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ error?: string }>;
};

function one<T>(value: Relation<T>): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function characterName(character: Character) {
  return (
    character.display_name?.trim() ||
    `${character.first_name} ${character.surname}`.trim() ||
    "Unnamed character"
  );
}

function uniqueName(row: UniqueRow) {
  return row.custom_name?.trim() || one(row.item)?.name || "Unknown Item";
}

const inputClass =
  "w-full border border-[#60482e]/55 bg-[#100c09] px-3 py-2.5 text-sm text-[#d7c4a5] outline-none placeholder:text-[#625747] focus:border-[#a17a49]";

const buttonClass =
  "border border-[#987344] bg-[#3b2919] px-4 py-2.5 text-[8px] uppercase tracking-[0.16em] text-[#efd6a8]";

export default async function AdminCharacterInventoryPage({
  params,
  searchParams,
}: Props) {
  await requireStaff();

  const { id } = await params;
  const query = (await searchParams) ?? {};
  const supabase = await createClient();

  const [
    characterResult,
    itemsResult,
    standardResult,
    uniqueResult,
  ] = await Promise.all([
    supabase
      .from("characters")
      .select("id, display_name, first_name, surname, public_slug")
      .eq("id", id)
      .maybeSingle(),

    supabase
      .from("items")
      .select(`
        id,
        name,
        is_active,
        category:item_categories(name, slug)
      `)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),

    supabase
      .from("character_items")
      .select(`
        id,
        quantity,
        container_instance_id,
        item:items(
          id,
          name,
          quality,
          category:item_categories(name, slug)
        )
      `)
      .eq("character_id", id)
      .order("acquired_at", { ascending: true }),

    supabase
      .from("character_item_instances")
      .select(`
        id,
        custom_name,
        custom_description,
        custom_image_url,
        quality_override,
        transfer_policy_override,
        is_quest_item_override,
        container_instance_id,
        notes,
        item:items(
          id,
          name,
          quality,
          category:item_categories(name, slug)
        ),
        history:item_instance_history(
          id,
          event_type,
          details,
          created_at
        )
      `)
      .eq("owner_character_id", id)
      .eq("vault_status", "owned")
      .order("acquired_at", { ascending: true }),
  ]);

  const firstError =
    characterResult.error ??
    itemsResult.error ??
    standardResult.error ??
    uniqueResult.error;

  if (firstError) {
    throw new Error(
      `Unable to load character Inventory administration: ${firstError.message}`,
    );
  }

  if (!characterResult.data) {
    notFound();
  }

  const character = characterResult.data as Character;
  const items = (itemsResult.data ?? []) as unknown as MasterItem[];
  const standardRows = (standardResult.data ?? []) as unknown as StandardRow[];
  const uniqueRows = (uniqueResult.data ?? []) as unknown as UniqueRow[];

  const containers = uniqueRows.filter(
    (row) => one(one(row.item)?.category ?? null)?.slug === "container",
  );

  const nonContainerItems = items.filter(
    (item) => one(item.category)?.slug !== "container",
  );

  const returnTo = `/admin/characters/${character.id}/inventory`;

  return (
    <main className="p-5 sm:p-7 lg:p-9">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link
              href={`/admin/characters/${character.id}`}
              className="text-[9px] uppercase tracking-[0.18em] text-[#9c805b] transition hover:text-[#e4c796]"
            >
              ← Character administration
            </Link>

            <p className="mt-5 text-[9px] uppercase tracking-[0.28em] text-[#8c704b]">
              Inventory administration
            </p>

            <h1 className="mt-2 font-serif text-4xl text-[#ead5ac]">
              {characterName(character)}
            </h1>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={`/characters/${character.public_slug}`}
              className="border border-[#60482e]/55 bg-[#15100d] px-4 py-3 text-[9px] uppercase tracking-[0.18em] text-[#ac9879]"
            >
              Public profile
            </Link>

            <Link
              href="/admin/items/vault"
              className="border border-[#987344] bg-[#3b2919] px-4 py-3 text-[9px] uppercase tracking-[0.18em] text-[#efd6a8]"
            >
              Admin Vault
            </Link>
          </div>
        </div>

        {query.error ? (
          <div className="mt-6 border border-red-900/60 bg-red-950/20 px-4 py-3 text-sm text-red-400">
            {query.error}
          </div>
        ) : null}

        <div className="mt-7 grid gap-5 xl:grid-cols-2">
          <section className="border border-[#60482e]/45 bg-[#15100d] p-5">
            <p className="text-[8px] uppercase tracking-[0.22em] text-[#806b50]">
              Standard stock
            </p>
            <h2 className="mt-1 font-serif text-2xl text-[#dfc99f]">
              Grant standard Item
            </h2>

            <form action={grantStandardItem} className="mt-5 space-y-3">
              <input type="hidden" name="characterId" value={character.id} />
              <input type="hidden" name="returnTo" value={returnTo} />

              <select name="itemId" required defaultValue="" className={inputClass}>
                <option value="" disabled>
                  Select Item
                </option>
                {nonContainerItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                    {!item.is_active ? " (inactive)" : ""}
                  </option>
                ))}
              </select>

              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  type="number"
                  min={1}
                  max={9999}
                  name="quantity"
                  defaultValue={1}
                  className={inputClass}
                />

                <ContainerSelect
                  containers={containers}
                  name="containerInstanceId"
                />
              </div>

              <button type="submit" className={buttonClass}>
                Grant Item
              </button>
            </form>
          </section>

          <section className="border border-[#60482e]/45 bg-[#15100d] p-5">
            <p className="text-[8px] uppercase tracking-[0.22em] text-[#806b50]">
              Individual instance
            </p>
            <h2 className="mt-1 font-serif text-2xl text-[#dfc99f]">
              Create Unique Item
            </h2>

            <form action={createUniqueItemForCharacter} className="mt-5 space-y-3">
              <input type="hidden" name="characterId" value={character.id} />
              <input type="hidden" name="returnTo" value={returnTo} />

              <select name="itemId" required defaultValue="" className={inputClass}>
                <option value="" disabled>
                  Select master Item
                </option>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                    {!item.is_active ? " (inactive)" : ""}
                  </option>
                ))}
              </select>

              <input
                name="customName"
                placeholder="Custom name (optional)"
                className={inputClass}
              />

              <textarea
                name="customDescription"
                rows={3}
                placeholder="Custom description (optional)"
                className={inputClass}
              />

              <input
                type="url"
                name="customImageUrl"
                placeholder="Custom image URL (optional)"
                className={inputClass}
              />

              <OverrideFields />

              <ContainerSelect
                containers={containers}
                name="containerInstanceId"
              />

              <textarea
                name="notes"
                rows={2}
                placeholder="Private staff notes (optional)"
                className={inputClass}
              />

              <button type="submit" className={buttonClass}>
                Create & Grant Unique Item
              </button>
            </form>
          </section>
        </div>

        <section className="mt-6 border border-[#60482e]/45 bg-[#15100d] p-5">
          <p className="text-[8px] uppercase tracking-[0.22em] text-[#806b50]">
            Current Inventory
          </p>
          <h2 className="mt-1 font-serif text-2xl text-[#dfc99f]">
            Standard Items
          </h2>

          {standardRows.length ? (
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {standardRows.map((row) => {
                const item = one(row.item);
                const category = one(item?.category ?? null);
                const parent = containers.find(
                  (container) => container.id === row.container_instance_id,
                );

                return (
                  <article
                    key={row.id}
                    className="border border-[#59432c]/40 bg-[#100c09] p-4"
                  >
                    <p className="font-serif text-lg text-[#d8bf91]">
                      {item?.name ?? "Unknown Item"}
                      {row.quantity > 1 ? (
                        <span className="ml-2 font-sans text-[10px] text-[#8f8271]">
                          ×{row.quantity}
                        </span>
                      ) : null}
                    </p>

                    <p className="mt-1 text-[8px] uppercase tracking-[0.13em] text-[#756958]">
                      {category?.name ?? "Item"}
                      {parent ? ` · In ${uniqueName(parent)}` : " · Loose"}
                    </p>

                    <form action={moveStandardItem} className="mt-4 flex gap-2">
                      <input type="hidden" name="rowId" value={row.id} />
                      <input type="hidden" name="returnTo" value={returnTo} />

                      <ContainerSelect
                        containers={containers}
                        name="containerInstanceId"
                        defaultValue={row.container_instance_id}
                      />

                      <button type="submit" className={buttonClass}>
                        Move
                      </button>
                    </form>

                    <form action={removeStandardItem} className="mt-3 flex gap-2">
                      <input type="hidden" name="rowId" value={row.id} />
                      <input type="hidden" name="returnTo" value={returnTo} />

                      <input
                        type="number"
                        min={1}
                        max={row.quantity}
                        name="quantity"
                        defaultValue={1}
                        className={inputClass}
                      />

                      <button
                        type="submit"
                        className="border border-red-900/55 bg-red-950/20 px-3 py-2 text-[8px] uppercase tracking-[0.14em] text-red-300"
                      >
                        Remove
                      </button>
                    </form>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="mt-4 text-sm italic text-[#817565]">
              No standard Items assigned.
            </p>
          )}
        </section>

        <section className="mt-6 border border-[#60482e]/45 bg-[#15100d] p-5">
          <p className="text-[8px] uppercase tracking-[0.22em] text-[#806b50]">
            Individual possessions
          </p>
          <h2 className="mt-1 font-serif text-2xl text-[#dfc99f]">
            Unique Items
          </h2>

          {uniqueRows.length ? (
            <div className="mt-4 space-y-4">
              {uniqueRows.map((row) => {
                const item = one(row.item);
                const isContainer =
                  one(item?.category ?? null)?.slug === "container";

                const history = [...(row.history ?? [])].sort(
                  (a, b) =>
                    new Date(b.created_at).getTime() -
                    new Date(a.created_at).getTime(),
                );

                return (
                  <details
                    key={row.id}
                    className="border border-[#59432c]/40 bg-[#100c09]"
                  >
                    <summary className="cursor-pointer list-none p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-serif text-lg text-[#d8bf91]">
                            {uniqueName(row)}
                          </p>
                          <p className="mt-1 text-[8px] uppercase tracking-[0.13em] text-[#756958]">
                            Unique · {item?.name ?? "Unknown master"}
                            {isContainer ? " · Container" : ""}
                          </p>
                        </div>
                        <span className="text-xs text-[#806b50]">↓</span>
                      </div>
                    </summary>

                    <div className="border-t border-[#59432c]/35 p-4">
                      <form action={updateUniqueItem}>
                        <input type="hidden" name="instanceId" value={row.id} />
                        <input type="hidden" name="returnTo" value={returnTo} />

                        <div className="grid gap-3 md:grid-cols-2">
                          <input
                            name="customName"
                            defaultValue={row.custom_name ?? ""}
                            placeholder="Custom name"
                            className={inputClass}
                          />

                          <input
                            type="url"
                            name="customImageUrl"
                            defaultValue={row.custom_image_url ?? ""}
                            placeholder="Custom image URL"
                            className={inputClass}
                          />

                          <textarea
                            name="customDescription"
                            rows={3}
                            defaultValue={row.custom_description ?? ""}
                            placeholder="Custom description"
                            className={`${inputClass} md:col-span-2`}
                          />

                          <OverrideFields
                            quality={row.quality_override}
                            transfer={row.transfer_policy_override}
                            quest={row.is_quest_item_override}
                          />

                          {isContainer ? (
                            <input
                              type="hidden"
                              name="containerInstanceId"
                              value=""
                            />
                          ) : (
                            <ContainerSelect
                              containers={containers.filter(
                                (container) => container.id !== row.id,
                              )}
                              name="containerInstanceId"
                              defaultValue={row.container_instance_id}
                            />
                          )}

                          <textarea
                            name="notes"
                            rows={2}
                            defaultValue={row.notes ?? ""}
                            placeholder="Private staff notes"
                            className={inputClass}
                          />
                        </div>

                        <div className="mt-4 flex justify-end">
                          <button type="submit" className={buttonClass}>
                            Save Unique Item
                          </button>
                        </div>
                      </form>

                      <div className="mt-5 border-t border-[#59432c]/35 pt-4">
                        <p className="text-[8px] uppercase tracking-[0.16em] text-[#806b50]">
                          Provenance
                        </p>

                        {history.length ? (
                          <div className="mt-2 space-y-2">
                            {history.slice(0, 8).map((entry) => (
                              <div
                                key={entry.id}
                                className="border-l border-[#765937]/55 pl-3"
                              >
                                <p className="text-[9px] uppercase tracking-[0.12em] text-[#a68a61]">
                                  {entry.event_type.replace(/_/g, " ")}
                                </p>
                                <p className="mt-1 text-[10px] leading-5 text-[#817565]">
                                  {entry.details}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-2 text-xs italic text-[#756958]">
                            No provenance entries.
                          </p>
                        )}
                      </div>

                      <form
                        action={sendUniqueItemToVault}
                        className="mt-5 flex justify-end border-t border-[#59432c]/35 pt-4"
                      >
                        <input type="hidden" name="instanceId" value={row.id} />
                        <input type="hidden" name="returnTo" value={returnTo} />

                        <button
                          type="submit"
                          className="border border-[#765937]/55 bg-[#20160f] px-4 py-2 text-[8px] uppercase tracking-[0.14em] text-[#c8a879]"
                        >
                          Move to Admin Vault
                        </button>
                      </form>
                    </div>
                  </details>
                );
              })}
            </div>
          ) : (
            <p className="mt-4 text-sm italic text-[#817565]">
              No Unique Items assigned.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}

function ContainerSelect({
  containers,
  name,
  defaultValue = null,
}: {
  containers: UniqueRow[];
  name: string;
  defaultValue?: string | null;
}) {
  return (
    <select
      name={name}
      defaultValue={defaultValue ?? ""}
      className={`${inputClass} min-w-0 flex-1`}
    >
      <option value="">Loose Inventory</option>
      {containers.map((container) => (
        <option key={container.id} value={container.id}>
          {uniqueName(container)}
        </option>
      ))}
    </select>
  );
}

function OverrideFields({
  quality = null,
  transfer = null,
  quest = null,
}: {
  quality?: string | null;
  transfer?: string | null;
  quest?: boolean | null;
}) {
  return (
    <>
      <select
        name="qualityOverride"
        defaultValue={quality ?? ""}
        className={inputClass}
      >
        <option value="">Inherit quality</option>
        <option value="poor">Poor</option>
        <option value="average">Average</option>
        <option value="fine">Fine</option>
        <option value="superior">Superior</option>
        <option value="flawless">Flawless</option>
        <option value="peerless">Peerless</option>
      </select>

      <select
        name="transferPolicyOverride"
        defaultValue={transfer ?? ""}
        className={inputClass}
      >
        <option value="">Inherit transfer policy</option>
        <option value="free">Free</option>
        <option value="restricted">Restricted</option>
        <option value="bound">Bound</option>
      </select>

      <select
        name="questOverride"
        defaultValue={
          quest === null ? "inherit" : quest ? "yes" : "no"
        }
        className={inputClass}
      >
        <option value="inherit">Inherit Quest status</option>
        <option value="yes">Quest Item: Yes</option>
        <option value="no">Quest Item: No</option>
      </select>
    </>
  );
}
