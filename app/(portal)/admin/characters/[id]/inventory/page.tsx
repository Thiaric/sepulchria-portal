

import { notFound } from "next/navigation";
import { AdminActionForm } from "@/components/admin/admin-action-form";
import Link from "next/link";
import {
  requireStaffCapability,
} from "@/lib/auth/require-staff";
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
  "w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none placeholder:text-[rgb(var(--sep-colour-625747))] focus:border-[rgb(var(--sep-colour-a17a49))]";

const buttonClass =
  "border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-4 py-2.5 text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-efd6a8))]";

export default async function AdminCharacterInventoryPage({
  params,
  searchParams,
}: Props) {
  await requireStaffCapability("character_economy");

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

  const ordinaryContainers = containers.filter(
    (row) =>
      !row.custom_name &&
      !row.custom_description &&
      !row.custom_image_url &&
      !row.quality_override &&
      !row.transfer_policy_override &&
      row.is_quest_item_override === null &&
      !row.notes,
  );

  const bespokeUniqueRows = uniqueRows.filter(
    (row) => !ordinaryContainers.some((container) => container.id === row.id),
  );

  const returnTo = `/admin/characters/${character.id}/inventory`;

  return (
    <main className="p-5 sm:p-7 lg:p-9 admin_characters_id_inventory_page_main_main">
      <div className="mx-auto max-w-7xl admin_characters_id_inventory_page_div_container">
        <div className="flex flex-wrap items-center justify-between gap-3 admin_characters_id_inventory_page_div_container_2">
          <div className="admin_characters_id_inventory_page_div_container_3">
            <Link
              href={`/admin/characters/${character.id}`}
              className="border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-15100d))] px-4 py-3 text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-ac9879))]"
            >
              ← Character administration
            </Link>

            <p className="mt-5 text-[9px] uppercase tracking-[0.28em] text-[rgb(var(--sep-colour-8c704b))] admin_characters_id_inventory_page_p_text">
              Inventory administration
            </p>

            <h1 className="mt-2 font-serif text-4xl text-[rgb(var(--sep-colour-ead5ac))] admin_characters_id_inventory_page_h1_title">
              {characterName(character)}
            </h1>
          </div>

          <div className="flex flex-wrap gap-2 admin_characters_id_inventory_page_div_container_4">
            <Link
              href={`/characters/${character.public_slug}`}
              className="border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-15100d))] px-4 py-3 text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-ac9879))]"
            >
              Public profile
            </Link>

            <Link
              href="/admin/items/vault"
              className="border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-4 py-3 text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-efd6a8))]"
            >
              Admin Vault
            </Link>
          </div>
        </div>

        {query.error ? (
          <div className="mt-6 border border-red-900/60 bg-red-950/20 px-4 py-3 text-sm text-red-400 admin_characters_id_inventory_page_div_container_5">
            {query.error}
          </div>
        ) : null}

        <div className="mt-7 grid gap-5 xl:grid-cols-2 admin_characters_id_inventory_page_div_container_6">
          <section className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-5 admin_characters_id_inventory_page_section_grant_standard_item">
            <p className="text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-806b50))] admin_characters_id_inventory_page_p_grant_standard_item">
              Standard stock
            </p>
            <h2 className="mt-1 font-serif text-2xl text-[rgb(var(--sep-colour-dfc99f))] admin_characters_id_inventory_page_h2_grant_standard_item">
              Grant standard Item
            </h2>

            <form action={grantStandardItem} className="mt-5 space-y-3 admin_characters_id_inventory_page_form_grant_standard_item">
              <input className="admin_characters_id_inventory_page_input_character_id" type="hidden" name="characterId" value={character.id} />
              <input className="admin_characters_id_inventory_page_input_return" type="hidden" name="returnTo" value={returnTo} />

              <select name="itemId" required defaultValue="" className={[((inputClass)), "admin_characters_id_inventory_page_select_item_id"].filter(Boolean).join(" ")}>
                <option className="admin_characters_id_inventory_page_option_item_id" value="" disabled>
                  Select Item
                </option>
                {items.map((item) => (
                  <option className="admin_characters_id_inventory_page_option_option" key={item.id} value={item.id}>
                    {item.name}
                    {!item.is_active ? " (inactive)" : ""}
                  </option>
                ))}
              </select>

              <div className="grid gap-3 sm:grid-cols-2 admin_characters_id_inventory_page_div_grant_standard_item">
                <input
                  type="number"
                  min={1}
                  max={9999}
                  name="quantity"
                  defaultValue={1}
                  className={[((inputClass)), "admin_characters_id_inventory_page_input_quantity"].filter(Boolean).join(" ")}
                />

                <ContainerSelect
                  containers={containers}
                  name="containerInstanceId"
                />
              </div>

              <button type="submit" className={[((buttonClass)), "admin_characters_id_inventory_page_button_grant_item"].filter(Boolean).join(" ")}>
                Grant Item
              </button>
            </form>
          </section>

          <section className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-5 admin_characters_id_inventory_page_section_create_bespoke_unique_item">
            <p className="text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-806b50))] admin_characters_id_inventory_page_p_create_bespoke_unique_item">
              Individual instance
            </p>
            <h2 className="mt-1 font-serif text-2xl text-[rgb(var(--sep-colour-dfc99f))] admin_characters_id_inventory_page_h2_create_bespoke_unique_item">
              Create Bespoke Unique Item
            </h2>

            <form action={createUniqueItemForCharacter} className="mt-5 space-y-3 admin_characters_id_inventory_page_form_create_unique_item_character">
              <input className="admin_characters_id_inventory_page_input_character_id_2" type="hidden" name="characterId" value={character.id} />
              <input className="admin_characters_id_inventory_page_input_return_2" type="hidden" name="returnTo" value={returnTo} />

              <select name="itemId" required defaultValue="" className={[((inputClass)), "admin_characters_id_inventory_page_select_item_id_2"].filter(Boolean).join(" ")}>
                <option className="admin_characters_id_inventory_page_option_item_id_2" value="" disabled>
                  Select master Item
                </option>
                {items.map((item) => (
                  <option className="admin_characters_id_inventory_page_option_option_2" key={item.id} value={item.id}>
                    {item.name}
                    {!item.is_active ? " (inactive)" : ""}
                  </option>
                ))}
              </select>

              <input
                name="customName"
                placeholder="Custom name (optional)"
                className={[((inputClass)), "admin_characters_id_inventory_page_input_custom_name"].filter(Boolean).join(" ")}
              />

              <textarea
                name="customDescription"
                rows={3}
                placeholder="Custom description (optional)"
                className={[((inputClass)), "admin_characters_id_inventory_page_textarea_custom_description"].filter(Boolean).join(" ")}
              />

              <input
                type="url"
                name="customImageUrl"
                placeholder="Custom image URL (optional)"
                className={[((inputClass)), "admin_characters_id_inventory_page_input_custom_image_url"].filter(Boolean).join(" ")}
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
                className={[((inputClass)), "admin_characters_id_inventory_page_textarea_notes"].filter(Boolean).join(" ")}
              />

              <button type="submit" className={[((buttonClass)), "admin_characters_id_inventory_page_button_create_grant_bespoke_item"].filter(Boolean).join(" ")}>
                Create & Grant Bespoke Item
              </button>
            </form>
          </section>
        </div>

        <section className="mt-6 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-5 admin_characters_id_inventory_page_section_standard_items">
          <p className="text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-806b50))] admin_characters_id_inventory_page_p_standard_items">
            Current Inventory
          </p>
          <h2 className="mt-1 font-serif text-2xl text-[rgb(var(--sep-colour-dfc99f))] admin_characters_id_inventory_page_h2_standard_items">
            Standard Items
          </h2>

          {standardRows.length || ordinaryContainers.length ? (
            <div className="mt-4 grid gap-3 lg:grid-cols-2 admin_characters_id_inventory_page_div_standard_items">
              {standardRows.map((row) => {
                const item = one(row.item);
                const category = one(item?.category ?? null);
                const parent = containers.find(
                  (container) => container.id === row.container_instance_id,
                );

                return (
                  <article
                    key={row.id}
                    className="border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-100c09))] p-4 admin_characters_id_inventory_page_article_article"
                  >
                    <p className="font-serif text-lg text-[rgb(var(--sep-colour-d8bf91))] admin_characters_id_inventory_page_p_text_2">
                      {item?.name ?? "Unknown Item"}
                      {row.quantity > 1 ? (
                        <span className="ml-2 font-sans text-[10px] text-[rgb(var(--sep-colour-8f8271))] admin_characters_id_inventory_page_span_text">
                          ×{row.quantity}
                        </span>
                      ) : null}
                    </p>

                    <p className="mt-1 text-[8px] uppercase tracking-[0.13em] text-[rgb(var(--sep-colour-756958))] admin_characters_id_inventory_page_p_text_3">
                      {category?.name ?? "Item"}
                      {parent ? ` · In ${uniqueName(parent)}` : " · Loose"}
                    </p>

                    <form action={moveStandardItem} className="mt-4 flex gap-2 admin_characters_id_inventory_page_form_move_standard_item">
                      <input className="admin_characters_id_inventory_page_input_row_id" type="hidden" name="rowId" value={row.id} />
                      <input className="admin_characters_id_inventory_page_input_return_3" type="hidden" name="returnTo" value={returnTo} />

                      <ContainerSelect
                        containers={containers}
                        name="containerInstanceId"
                        defaultValue={row.container_instance_id}
                      />

                      <button type="submit" className={[((buttonClass)), "admin_characters_id_inventory_page_button_move"].filter(Boolean).join(" ")}>
                        Move
                      </button>
                    </form>

                    <form action={removeStandardItem} className="mt-3 flex gap-2 admin_characters_id_inventory_page_form_remove_standard_item">
                      <input className="admin_characters_id_inventory_page_input_row_id_2" type="hidden" name="rowId" value={row.id} />
                      <input className="admin_characters_id_inventory_page_input_return_4" type="hidden" name="returnTo" value={returnTo} />

                      <input
                        type="number"
                        min={1}
                        max={row.quantity}
                        name="quantity"
                        defaultValue={1}
                        className={[((inputClass)), "admin_characters_id_inventory_page_input_quantity_2"].filter(Boolean).join(" ")}
                      />

                      <button
                        type="submit"
                        className="border border-red-900/55 bg-red-950/20 px-3 py-2 text-[8px] uppercase tracking-[0.14em] text-red-300 admin_characters_id_inventory_page_button_remove"
                      >
                        Remove
                      </button>
                    </form>
                  </article>
                );
              })}

              {ordinaryContainers.map((row) => {
                const item = one(row.item);
                const category = one(item?.category ?? null);

                return (
                  <article
                    key={row.id}
                    className="border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-100c09))] p-4 admin_characters_id_inventory_page_article_article_2"
                  >
                    <p className="font-serif text-lg text-[rgb(var(--sep-colour-d8bf91))] admin_characters_id_inventory_page_p_text_4">
                      {item?.name ?? "Unknown Container"}
                    </p>
                    <p className="mt-1 text-[8px] uppercase tracking-[0.13em] text-[rgb(var(--sep-colour-756958))] admin_characters_id_inventory_page_p_text_5">
                      {category?.name ?? "Container"} · Loose
                    </p>
                    <p className="mt-3 text-[9px] leading-5 text-[rgb(var(--sep-colour-8f8271))] admin_characters_id_inventory_page_p_text_6">
                      Standard Container possession.
                    </p>
                    <AdminActionForm
                      action={sendUniqueItemToVault}
                      confirmMessage={`Remove ${uniqueName(row)} from this character and place it in the Admin Vault?`}
                      className="mt-3"
                    >
                      <input className="admin_characters_id_inventory_page_input_instance_id" type="hidden" name="instanceId" value={row.id} />
                      <input className="admin_characters_id_inventory_page_input_return_5" type="hidden" name="returnTo" value={returnTo} />
                      <input className="admin_characters_id_inventory_page_input_live_action" type="hidden" name="liveAction" value="1" />
                      <button
                        type="submit"
                        className="border border-red-900/55 bg-red-950/20 px-3 py-2 text-[8px] uppercase tracking-[0.14em] text-red-300 admin_characters_id_inventory_page_button_remove_2"
                      >
                        Remove
                      </button>
                    </AdminActionForm>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="mt-4 text-sm italic text-[rgb(var(--sep-colour-817565))] admin_characters_id_inventory_page_p_standard_items_2">
              No standard Items assigned.
            </p>
          )}
        </section>

        <section className="mt-6 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-5 admin_characters_id_inventory_page_section_unique_items">
          <p className="text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-806b50))] admin_characters_id_inventory_page_p_unique_items">
            Individual possessions
          </p>
          <h2 className="mt-1 font-serif text-2xl text-[rgb(var(--sep-colour-dfc99f))] admin_characters_id_inventory_page_h2_unique_items">
            Unique Items
          </h2>

          {bespokeUniqueRows.length ? (
            <div className="mt-4 space-y-4 admin_characters_id_inventory_page_div_unique_items">
              {bespokeUniqueRows.map((row) => {
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
                    className="border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-100c09))] admin_characters_id_inventory_page_details_details"
                  >
                    <summary className="cursor-pointer list-none p-4 admin_characters_id_inventory_page_summary_summary">
                      <div className="flex items-center justify-between gap-3 admin_characters_id_inventory_page_div_container_7">
                        <div className="admin_characters_id_inventory_page_div_container_8">
                          <p className="font-serif text-lg text-[rgb(var(--sep-colour-d8bf91))] admin_characters_id_inventory_page_p_text_7">
                            {uniqueName(row)}
                          </p>
                          <p className="mt-1 text-[8px] uppercase tracking-[0.13em] text-[rgb(var(--sep-colour-756958))] admin_characters_id_inventory_page_p_text_8">
                            Unique · {item?.name ?? "Unknown master"}
                            {isContainer ? " · Container" : ""}
                          </p>
                        </div>
                        <span className="text-xs text-[rgb(var(--sep-colour-806b50))] admin_characters_id_inventory_page_span_text_2">↓</span>
                      </div>
                    </summary>

                    <div className="border-t border-[rgb(var(--sep-colour-59432c))]/35 p-4 admin_characters_id_inventory_page_div_container_9">
                      <AdminActionForm action={updateUniqueItem}>
                        <input className="admin_characters_id_inventory_page_input_instance_id_2" type="hidden" name="instanceId" value={row.id} />
                        <input className="admin_characters_id_inventory_page_input_return_6" type="hidden" name="returnTo" value={returnTo} />
                        <input className="admin_characters_id_inventory_page_input_live_action_2" type="hidden" name="liveAction" value="1" />

                        <div className="grid gap-3 md:grid-cols-2 admin_characters_id_inventory_page_div_container_10">
                          <input
                            name="customName"
                            defaultValue={row.custom_name ?? ""}
                            placeholder="Custom name"
                            className={[((inputClass)), "admin_characters_id_inventory_page_input_custom_name_2"].filter(Boolean).join(" ")}
                          />

                          <input
                            type="url"
                            name="customImageUrl"
                            defaultValue={row.custom_image_url ?? ""}
                            placeholder="Custom image URL"
                            className={[((inputClass)), "admin_characters_id_inventory_page_input_custom_image_url_2"].filter(Boolean).join(" ")}
                          />

                          <textarea
                            name="customDescription"
                            rows={3}
                            defaultValue={row.custom_description ?? ""}
                            placeholder="Custom description"
                            className={[((`${inputClass} md:col-span-2`)), "admin_characters_id_inventory_page_textarea_custom_description_2"].filter(Boolean).join(" ")}
                          />

                          <OverrideFields
                            quality={row.quality_override}
                            transfer={row.transfer_policy_override}
                            quest={row.is_quest_item_override}
                          />

                          {isContainer ? (
                            <input className="admin_characters_id_inventory_page_input_container_instance_id"
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
                            className={[((inputClass)), "admin_characters_id_inventory_page_textarea_notes_2"].filter(Boolean).join(" ")}
                          />
                        </div>

                        <div className="mt-4 flex justify-end admin_characters_id_inventory_page_div_container_11">
                          <button type="submit" className={[((buttonClass)), "admin_characters_id_inventory_page_button_save_unique_item"].filter(Boolean).join(" ")}>
                            Save Unique Item
                          </button>
                        </div>
                      </AdminActionForm>

                      <div className="mt-5 border-t border-[rgb(var(--sep-colour-59432c))]/35 pt-4 admin_characters_id_inventory_page_div_container_12">
                        <p className="text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-806b50))] admin_characters_id_inventory_page_p_text_9">
                          Provenance
                        </p>

                        {history.length ? (
                          <div className="mt-2 space-y-2 admin_characters_id_inventory_page_div_container_13">
                            {history.slice(0, 8).map((entry) => (
                              <div
                                key={entry.id}
                                className="border-l border-[rgb(var(--sep-colour-765937))]/55 pl-3 admin_characters_id_inventory_page_div_container_14"
                              >
                                <p className="text-[9px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-a68a61))] admin_characters_id_inventory_page_p_text_10">
                                  {entry.event_type.replace(/_/g, " ")}
                                </p>
                                <p className="mt-1 text-[10px] leading-5 text-[rgb(var(--sep-colour-817565))] admin_characters_id_inventory_page_p_text_11">
                                  {entry.details}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-2 text-xs italic text-[rgb(var(--sep-colour-756958))] admin_characters_id_inventory_page_p_text_12">
                            No provenance entries.
                          </p>
                        )}
                      </div>

                      <AdminActionForm
                        action={sendUniqueItemToVault}
                        confirmMessage={`Move ${uniqueName(row)} to the Admin Vault?`}
                        className="mt-5 flex justify-end border-t border-[rgb(var(--sep-colour-59432c))]/35 pt-4"
                      >
                        <input className="admin_characters_id_inventory_page_input_instance_id_3" type="hidden" name="instanceId" value={row.id} />
                        <input className="admin_characters_id_inventory_page_input_return_7" type="hidden" name="returnTo" value={returnTo} />
                        <input className="admin_characters_id_inventory_page_input_live_action_3" type="hidden" name="liveAction" value="1" />

                        <button
                          type="submit"
                          className="border border-[rgb(var(--sep-colour-765937))]/55 bg-[rgb(var(--sep-colour-20160f))] px-4 py-2 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-c8a879))] admin_characters_id_inventory_page_button_move_admin_vault"
                        >
                          Move to Admin Vault
                        </button>
                      </AdminActionForm>
                    </div>
                  </details>
                );
              })}
            </div>
          ) : (
            <p className="mt-4 text-sm italic text-[rgb(var(--sep-colour-817565))] admin_characters_id_inventory_page_p_unique_items_2">
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
      className={[((`${inputClass} min-w-0 flex-1`)), "admin_characters_id_inventory_page_select_select"].filter(Boolean).join(" ")}
    >
      <option className="admin_characters_id_inventory_page_option_option_3" value="">Loose Inventory</option>
      {containers.map((container) => (
        <option className="admin_characters_id_inventory_page_option_option_4" key={container.id} value={container.id}>
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
        className={[((inputClass)), "admin_characters_id_inventory_page_select_quality_override"].filter(Boolean).join(" ")}
      >
        <option className="admin_characters_id_inventory_page_option_quality_override" value="">Inherit quality</option>
        <option className="admin_characters_id_inventory_page_option_poor" value="poor">Poor</option>
        <option className="admin_characters_id_inventory_page_option_average" value="average">Average</option>
        <option className="admin_characters_id_inventory_page_option_fine" value="fine">Fine</option>
        <option className="admin_characters_id_inventory_page_option_superior" value="superior">Superior</option>
        <option className="admin_characters_id_inventory_page_option_flawless" value="flawless">Flawless</option>
        <option className="admin_characters_id_inventory_page_option_peerless" value="peerless">Peerless</option>
      </select>

      <select
        name="transferPolicyOverride"
        defaultValue={transfer ?? ""}
        className={[((inputClass)), "admin_characters_id_inventory_page_select_transfer_policy_override"].filter(Boolean).join(" ")}
      >
        <option className="admin_characters_id_inventory_page_option_transfer_policy_override" value="">Inherit transfer policy</option>
        <option className="admin_characters_id_inventory_page_option_free" value="free">Free</option>
        <option className="admin_characters_id_inventory_page_option_restricted" value="restricted">Restricted</option>
        <option className="admin_characters_id_inventory_page_option_bound" value="bound">Bound</option>
      </select>

      <select
        name="questOverride"
        defaultValue={
          quest === null ? "inherit" : quest ? "yes" : "no"
        }
        className={[((inputClass)), "admin_characters_id_inventory_page_select_quest_override"].filter(Boolean).join(" ")}
      >
        <option className="admin_characters_id_inventory_page_option_inherit" value="inherit">Inherit Quest status</option>
        <option className="admin_characters_id_inventory_page_option_quest_override" value="yes">Quest Item: Yes</option>
        <option className="admin_characters_id_inventory_page_option_quest_override_2" value="no">Quest Item: No</option>
      </select>
    </>
  );
}
