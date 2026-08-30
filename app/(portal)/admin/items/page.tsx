

import { AdminActionForm } from "@/components/admin/admin-action-form";
import { ItemUseFormLogic } from "@/components/admin/item-use-form-logic";
import { ItemEffectFormLogic } from "@/components/admin/item-effect-form-logic";
import type { ReactNode } from "react";
import { ItemEquipmentForm } from "@/components/admin/item-equipment-form";
import { ItemCreateRecipeFields } from "@/components/admin/item-create-recipe-fields";
import {
  ItemImageFrame,
} from "@/components/items/item-image-frame";
import {
  requireAdminSection,
} from "@/lib/auth/require-staff";
import { createClient } from "@/lib/supabase/server";

import {
  createItem,
  createItemEffect,
  createSubcategory,
  deleteItem,
  deleteItemEffect,
  deleteSubcategory,
  updateItem,
  updateItemEffect,
  updateSubcategory,
} from "./actions";

type Category = {
  id: string;
  slug: string;
  name: string;
  sort_order: number;
};

type Subcategory = {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  description: string;
  sort_order: number;
  is_active: boolean;
};

type CraftingRecipeOption = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
};

type Effect = {
  id: string;
  trigger_type: "owned" | "equipped" | "use";
  effect_mode: "instant" | "temporary" | "passive";
  duration_minutes: number | null;
  muscles_modifier: number;
  reflexes_modifier: number;
  vigour_modifier: number;
  shrewd_modifier: number;
  brains_modifier: number;
  presence_modifier: number;
  health_delta: number;
  max_health_modifier: number;
  warping_affinity_modifier: number;
  warps_per_day_modifier: number;
  allow_duplicate_stacking: boolean;
  sort_order: number;
};

type Item = {
  id: string;
  name: string;
  slug: string;
  description: string;
  image_url: string | null;
  category_id: string;
  subcategory_id: string | null;
  quality: "poor" | "average" | "fine" | "superior" | "flawless" | "peerless";
  transfer_policy: "free" | "restricted" | "bound";
  is_quest_item: boolean;
  is_active: boolean;
  stackable: boolean;
  max_stack: number | null;
  reference_value: number | null;
  is_usable: boolean;
  use_behaviour: "reusable" | "consumable" | "limited_charges" | null;
  max_charges: number | null;
  target_mode: "self" | "other" | "either" | null;
  cooldown_minutes: number | null;
  success_die: number | null;
  success_threshold: number | null;
  resolution_mode: "automatic" | "fixed" | "opposed";
  counter_options: string[];
  success_attribute:
    | "muscles"
    | "reflexes"
    | "vigor"
    | "brains"
    | "shrewd"
    | "presence_score"
    | null;
  damage_dice: string | null;
  damage_type: string | null;
  container_capacity: number | null;
  teaches_recipe_id: string | null;
  sort_order: number;
  effects: Effect[] | null;
};

type Props = {
  searchParams?: Promise<{ error?: string }>;
};

const inputClass =
  "w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none placeholder:text-[rgb(var(--sep-colour-625747))] focus:border-[rgb(var(--sep-colour-a17a49))]";

const buttonClass =
  "border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-4 py-2.5 text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-efd6a8))] transition hover:bg-[rgb(var(--sep-colour-4a321e))]";

export default async function AdminItemsPage({ searchParams }: Props) {
  await requireAdminSection("items");
  const params = (await searchParams) ?? {};
  const supabase = await createClient();

  const [
    categoriesResult,
    subcategoriesResult,
    recipesResult,
    itemsResult,
  ] = await Promise.all([
    supabase
      .from("item_categories")
      .select("id, slug, name, sort_order")
      .order("sort_order", { ascending: true }),

    supabase
      .from("item_subcategories")
      .select("id, category_id, name, slug, description, sort_order, is_active")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),

    supabase
      .from("crafting_recipes")
      .select("id, name, slug, is_active")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),

    supabase
      .from("items")
      .select(`
        id,
        name,
        slug,
        description,
        image_url,
        category_id,
        subcategory_id,
        quality,
        transfer_policy,
        is_quest_item,
        is_active,
        stackable,
        max_stack,
        reference_value,
        is_usable,
        use_behaviour,
        max_charges,
        target_mode,
        cooldown_minutes,
        success_die,
        success_threshold,
        resolution_mode,
        counter_options,
        success_attribute,
        damage_dice,
        damage_type,
        container_capacity,
        teaches_recipe_id,
        sort_order,
        effects:item_effects(
          id,
          trigger_type,
          effect_mode,
          duration_minutes,
          muscles_modifier,
          reflexes_modifier,
          vigour_modifier,
          shrewd_modifier,
          brains_modifier,
          presence_modifier,
          health_delta,
          max_health_modifier,
          warping_affinity_modifier,
          warps_per_day_modifier,
          allow_duplicate_stacking,
          sort_order
        )
      `)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
  ]);

  const firstError =
    categoriesResult.error ??
    subcategoriesResult.error ??
    recipesResult.error ??
    itemsResult.error;

  if (firstError) {
    throw new Error(`Unable to load Item management: ${firstError.message}`);
  }

  const categories = (categoriesResult.data ?? []) as Category[];
  const subcategories = (subcategoriesResult.data ?? []) as Subcategory[];
  const recipes =
    (recipesResult.data ?? []) as CraftingRecipeOption[];
  const items = (itemsResult.data ?? []) as unknown as Item[];

  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const subcategoryById = new Map(
    subcategories.map((subcategory) => [subcategory.id, subcategory]),
  );

  const ingredientCategoryId =
    categories.find(
      (category) =>
        category.slug === "ingredient",
    )?.id ?? null;

  const ingredientItems =
    items
      .filter(
        (item) =>
          ingredientCategoryId &&
          item.category_id === ingredientCategoryId,
      )
      .map((item) => ({
        id: item.id,
        name: item.name,
        is_active: item.is_active,
      }));

  return (
    <main className="p-5 sm:p-7 lg:p-9">
      <div className="mx-auto max-w-7xl">
        <div>
          <p className="text-[9px] uppercase tracking-[0.28em] text-[rgb(var(--sep-colour-8c704b))]">
            Administration
          </p>
          <h1 className="mt-2 font-serif text-4xl text-[rgb(var(--sep-colour-ead5ac))]">Item Management</h1>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-[rgb(var(--sep-colour-a99b89))]">
            Manage the master Item catalogue, staff-created subcategories, stack
            rules, transfer policies, usable-item settings, containers, and
            mechanical effects.
          </p>
        </div>

        {params.error ? (
          <div className="mt-6 border border-red-900/60 bg-red-950/20 px-4 py-3 text-sm text-red-400">
            {params.error}
          </div>
        ) : null}

        <section
          id="item-subcategories"
          className="mt-8 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-5 sm:p-6"
        >
          <p className="text-[9px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-8c704b))]">
            Classification
          </p>
          <h2 className="mt-2 font-serif text-2xl text-[rgb(var(--sep-colour-dfc99f))]">Item subcategories</h2>
          <p className="mt-2 max-w-3xl text-xs leading-6 text-[rgb(var(--sep-colour-8f8271))]">
            Core categories are fixed by the system. Create whatever subcategories
            Sepulchria needs beneath them.
          </p>

          <AdminActionForm
            action={createSubcategory}
            className="mt-5 grid gap-3 md:grid-cols-[1fr_1fr_1fr_110px_auto]"
          >
            <select name="categoryId" required defaultValue="" className={inputClass}>
              <option value="" disabled>Core category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>

            <input name="name" required placeholder="Subcategory name" className={inputClass} />
            <input name="slug" placeholder="slug (optional)" className={inputClass} />
            <input type="number" name="sortOrder" defaultValue={0} className={inputClass} />

            <div className="flex items-center gap-3">
              <Check name="isActive" label="Active" checked />
              <button type="submit" className={buttonClass}>Add</button>
            </div>

            <textarea
              name="description"
              rows={2}
              placeholder="Description (optional)"
              className={`${inputClass} md:col-span-5`}
            />
          </AdminActionForm>

          {subcategories.length ? (
            <div className="mt-5 grid gap-2 xl:grid-cols-2">
              {subcategories.map((subcategory) => (
                <AdminActionForm
                  key={subcategory.id}
                  action={updateSubcategory}
                  className="border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-100c09))] p-3"
                >
                  <input type="hidden" name="subcategoryId" value={subcategory.id} />

                  <div className="grid gap-2 sm:grid-cols-2">
                    <select
                      name="categoryId"
                      defaultValue={subcategory.category_id}
                      className={inputClass}
                    >
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>{category.name}</option>
                      ))}
                    </select>

                    <input
                      name="name"
                      required
                      defaultValue={subcategory.name}
                      className={inputClass}
                    />

                    <input
                      name="slug"
                      defaultValue={subcategory.slug}
                      className={inputClass}
                    />

                    <input
                      type="number"
                      name="sortOrder"
                      defaultValue={subcategory.sort_order}
                      className={inputClass}
                    />

                    <textarea
                      name="description"
                      rows={2}
                      defaultValue={subcategory.description}
                      className={`${inputClass} sm:col-span-2`}
                    />
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <Check
                      name="isActive"
                      label="Active"
                      checked={subcategory.is_active}
                    />

                    <div className="flex gap-2">
                      <button type="submit" className={buttonClass}>Save</button>
                      <button
                        type="submit"
                        formAction={deleteSubcategory}
                        data-confirm-message={`Are you sure you want to permanently delete the subcategory "${subcategory.name}"?`}
                        className="border border-red-900/55 bg-red-950/20 px-3 py-2 text-[8px] uppercase tracking-[0.14em] text-red-300"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </AdminActionForm>
              ))}
            </div>
          ) : null}
        </section>

        <section
          id="item-new"
          className="mt-6 scroll-mt-6 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-5 sm:p-6"
        >
          <p className="text-[9px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-8c704b))]">
            Catalogue
          </p>
          <h2 className="mt-2 font-serif text-2xl text-[rgb(var(--sep-colour-dfc99f))]">Create Item</h2>

          <ItemForm
            action={createItem}
            categories={categories}
            subcategories={subcategories}
            recipes={recipes}
            ingredientItems={ingredientItems}
          />
        </section>

        <div className="mt-6 space-y-4">
          {items.map((item) => {
            const category = categoryById.get(item.category_id);
            const subcategory = item.subcategory_id
              ? subcategoryById.get(item.subcategory_id)
              : null;
            const effects = [...(item.effects ?? [])].sort(
              (a, b) => a.sort_order - b.sort_order,
            );

            return (
              <details
                key={item.id}
                id={`item-${item.id}`}
                className="scroll-mt-6 border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))]"
              >
                <summary className="cursor-pointer list-none px-4 py-4">
                  <div className="flex items-center gap-4">
                    <ItemImageFrame
                      src={item.image_url}
                      quality={item.quality}
                      className="h-12 w-12"
                      badgeSize="sm"
                    />

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-serif text-lg text-[rgb(var(--sep-colour-d8bf91))]">
                        {item.name}
                      </p>
                      <p className="mt-1 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-766956))]">
                        {category?.name ?? "Unknown"}
                        {subcategory ? ` · ${subcategory.name}` : ""}
                        {" · "}
                        {item.quality}
                        {" · "}
                        {item.transfer_policy}
                        {" · "}
                        {effects.length} effect{effects.length === 1 ? "" : "s"}
                      </p>
                    </div>

                    <span className="shrink-0 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-9b8768))]">
                      {item.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </summary>

                <div className="border-t border-[rgb(var(--sep-colour-59432c))]/35 p-4 sm:p-5">
                  <section className="border border-[rgb(var(--sep-colour-6a5032))]/45 bg-[rgb(var(--sep-colour-130e0b))] p-4 sm:p-5">
                    <p className="text-[8px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-8c704b))]">
                      Use / Effects
                    </p>
                    <h3 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-d8bf91))]">
                      Item mechanics
                    </h3>
                    <p className="mt-2 text-[10px] leading-5 text-[rgb(var(--sep-colour-817361))]">
                      Configure the Item, its target, success roll, damage, use behaviour,
                      charges, cooldown and all additional Health or Attribute effects here.
                      Damage is a valid effect by itself and never requires a dummy Use effect.
                    </p>

                    <div className="mt-4">
                      <ItemForm
                        action={updateItem}
                        item={item}
                        categories={categories}
                        subcategories={subcategories}
                        recipes={recipes}
                      />
                    </div>

                    <div className="mt-5 border-t border-[rgb(var(--sep-colour-59432c))]/35 pt-5">
                      <p className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
                        Health / Attribute effects
                      </p>

                      {effects.length ? (
                        <div className="mt-4 space-y-3">
                          {effects.map((effect) => (
                            <EffectForm
                              key={effect.id}
                              itemId={item.id}
                              effect={effect}
                            />
                          ))}
                        </div>
                      ) : (
                        <p className="mt-3 text-xs italic text-[rgb(var(--sep-colour-766956))]">
                          No additional Health or Attribute effects configured.
                        </p>
                      )}

                      <details className="mt-4 border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-100c09))]">
                        <summary className="cursor-pointer list-none px-3 py-3 font-serif text-sm text-[rgb(var(--sep-colour-cab28a))]">
                          + Add Health / Attribute effect
                        </summary>
                        <div className="border-t border-[rgb(var(--sep-colour-59432c))]/30 p-3">
                          <EffectForm itemId={item.id} />
                        </div>
                      </details>
                    </div>
                  </section>

                  <ItemEquipmentForm
                    itemId={item.id}
                  />

                  <div className="mt-6 flex justify-end border-t border-[rgb(var(--sep-colour-59432c))]/35 pt-5">
                    <AdminActionForm
  action={deleteItem}
  confirmMessage={`Are you sure you want to permanently delete "${item.name}"?`}
>
                      <input type="hidden" name="itemId" value={item.id} />
                      <button
                        type="submit"
                        className="border border-red-900/55 bg-red-950/20 px-4 py-2 text-[8px] uppercase tracking-[0.14em] text-red-300"
                      >
                        Delete Item
                      </button>
                    </AdminActionForm>
                  </div>
                </div>
              </details>
            );
          })}
        </div>

        {!items.length ? (
          <section className="mt-6 border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-100c09))] p-6 text-sm italic text-[rgb(var(--sep-colour-817565))]">
            No Items have been created yet.
          </section>
        ) : null}
      </div>
    </main>
  );
}

function ItemForm({
  action,
  item,
  categories,
  subcategories,
  recipes,
  ingredientItems = [],
}: {
  action: typeof createItem | typeof updateItem;
  item?: Item;
  categories: Category[];
  subcategories: Subcategory[];
  recipes: CraftingRecipeOption[];
  ingredientItems?: {
    id: string;
    name: string;
    is_active: boolean;
  }[];
}) {
  return (
    <AdminActionForm action={action} className="mt-5">
      {item ? <input type="hidden" name="itemId" value={item.id} /> : null}

      <ItemUseFormLogic />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Field label="Name">
          <input name="name" required defaultValue={item?.name ?? ""} className={inputClass} />
        </Field>

        <Field label="Slug">
          <input
            name="slug"
            defaultValue={item?.slug ?? ""}
            placeholder="Auto from name"
            className={inputClass}
          />
        </Field>

        <Field label="Core category">
          <select
            name="categoryId"
            required
            defaultValue={item?.category_id ?? categories[0]?.id ?? ""}
            className={inputClass}
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
        </Field>

        <Field label="Subcategory">
          <select
            name="subcategoryId"
            defaultValue={item?.subcategory_id ?? ""}
            className={inputClass}
          >
            <option value="">None</option>
            {categories.map((category) => {
              const matches = subcategories.filter(
                (subcategory) => subcategory.category_id === category.id,
              );
              if (!matches.length) return null;

              return (
                <optgroup key={category.id} label={category.name}>
                  {matches.map((subcategory) => (
                    <option key={subcategory.id} value={subcategory.id}>
                      {subcategory.name}
                      {!subcategory.is_active ? " (inactive)" : ""}
                    </option>
                  ))}
                </optgroup>
              );
            })}
          </select>
        </Field>

        <Field label="Teaches Recipe">
          <select
            name="teachesRecipeId"
            defaultValue={item?.teaches_recipe_id ?? ""}
            className={inputClass}
          >
            <option value="">None</option>
            {recipes.map((recipe) => (
              <option
                key={recipe.id}
                value={recipe.id}
              >
                {recipe.name}
                {!recipe.is_active
                  ? " (inactive)"
                  : ""}
              </option>
            ))}
          </select>

          <p className="mt-1.5 text-[8px] leading-4 text-[rgb(var(--sep-colour-806b50))]">
            When selected, this Item becomes a self-targeted consumable recipe document.
            Using it from Inventory teaches the linked recipe.
          </p>
        </Field>

        <div className="md:col-span-2 xl:col-span-4">
          <Field label="Description">
            <textarea
              name="description"
              rows={5}
              defaultValue={item?.description ?? ""}
              className={inputClass}
            />
          </Field>
        </div>

        <Field label="Image URL">
          <input
            type="url"
            name="imageUrl"
            defaultValue={item?.image_url ?? ""}
            placeholder="https://..."
            className={inputClass}
          />
        </Field>

        <Field label="Quality">
          <select name="quality" defaultValue={item?.quality ?? "average"} className={inputClass}>
            <option value="poor">Poor</option>
            <option value="average">Average</option>
            <option value="fine">Fine</option>
            <option value="superior">Superior</option>
            <option value="flawless">Flawless</option>
            <option value="peerless">Peerless</option>
          </select>
        </Field>

        <Field label="Transfer policy">
          <select
            name="transferPolicy"
            defaultValue={item?.transfer_policy ?? "free"}
            className={inputClass}
          >
            <option value="free">Free</option>
            <option value="restricted">Restricted</option>
            <option value="bound">Bound</option>
          </select>
        </Field>

        <Field label="Reference value (Remnants)">
          <input
            type="number"
            min={0}
            name="referenceValue"
            defaultValue={item?.reference_value ?? ""}
            className={inputClass}
          />
        </Field>

        <Field label="Sort order">
          <input
            type="number"
            name="sortOrder"
            defaultValue={item?.sort_order ?? 0}
            className={inputClass}
          />
        </Field>

        <Field label="Maximum stack">
          <input
            type="number"
            min={1}
            name="maxStack"
            defaultValue={item?.max_stack ?? ""}
            placeholder="Blank = unlimited"
            className={inputClass}
          />
        </Field>

        <Field label="Use behaviour">
          <select
            name="useBehaviour"
            defaultValue={item?.use_behaviour ?? "reusable"}
            className={inputClass}
          >
            <option value="reusable">Reusable</option>
            <option value="consumable">Consumable</option>
            <option value="limited_charges">Limited Charges</option>
          </select>
        </Field>

        <Field label="Target">
          <select
            name="targetMode"
            defaultValue={item?.target_mode ?? "self"}
            className={inputClass}
          >
            <option value="self">Self</option>
            <option value="other">Other</option>
            <option value="either">Either</option>
          </select>
        </Field>

        <Field label="Resolution Mode">
          <select
            name="resolutionMode"
            defaultValue={item?.resolution_mode ?? "automatic"}
            className={inputClass}
          >
            <option value="automatic">Automatic</option>
            <option value="fixed">Fixed DC</option>
            <option value="opposed">Opposed Roll</option>
          </select>
        </Field>

        <Field label="Success / Action Die">
          <select
            name="successDie"
            defaultValue={item?.success_die ?? ""}
            className={inputClass}
          >
            <option value="">None</option>
            <option value="4">d4</option>
            <option value="6">d6</option>
            <option value="8">d8</option>
            <option value="10">d10</option>
            <option value="12">d12</option>
            <option value="20">d20</option>
            <option value="100">d100</option>
          </select>
        </Field>

        <Field label="Fixed DC Threshold">
          <input
            type="number"
            min={1}
            step={1}
            name="successThreshold"
            defaultValue={item?.success_threshold ?? ""}
            placeholder="Required when a die is selected"
            className={inputClass}
          />
        </Field>

        <Field label="Relevant Attribute">
          <select
            name="successAttribute"
            defaultValue={item?.success_attribute ?? ""}
            className={inputClass}
          >
            <option value="">None - pure roll</option>
            <option value="muscles">Muscles</option>
            <option value="reflexes">Reflexes</option>
            <option value="vigor">Vigour</option>
            <option value="brains">Brains</option>
            <option value="shrewd">Shrewd</option>
            <option value="presence_score">Presence</option>
          </select>
        </Field>

        <div className="md:col-span-2 xl:col-span-4">
          <p className="mb-2 text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-806b50))]">
            Allowed Counters — Opposed Roll only
          </p>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {[
              ["dodge", "Dodge — Reflexes"],
              ["defend", "Defend — Vigour"],
              ["resist_vigour", "Resist — Vigour"],
              ["resist_shrewd", "Resist — Shrewd"],
              ["resist_brains", "Resist — Brains"],
              ["resist_presence", "Resist — Presence"],
            ].map(([value, label]) => (
              <label
                key={value}
                className="flex items-center gap-2 border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-15100d))] px-3 py-2 text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-aa9473))]"
              >
                <input
                  type="checkbox"
                  name="counterOptions"
                  value={value}
                  defaultChecked={
                    item?.counter_options?.includes(value) ?? false
                  }
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        <Field label="Damage Dice">
          <input
            name="damageDice"
            defaultValue={item?.damage_dice ?? ""}
            placeholder="e.g. 1d4"
            className={inputClass}
          />
        </Field>

        <Field label="Damage Type">
          <input
            name="damageType"
            defaultValue={item?.damage_type ?? ""}
            placeholder="e.g. Piercing, Lightning"
            className={inputClass}
          />
        </Field>

        <Field label="Maximum charges">
          <input
            type="number"
            min={1}
            name="maxCharges"
            defaultValue={item?.max_charges ?? ""}
            className={inputClass}
          />
        </Field>

        <Field label="Cooldown (minutes)">
          <input
            type="number"
            min={0}
            name="cooldownMinutes"
            defaultValue={item?.cooldown_minutes ?? ""}
            placeholder="Blank = none"
            className={inputClass}
          />
        </Field>

        <Field label="Container capacity (slots)">
          <input
            type="number"
            min={1}
            name="containerCapacity"
            defaultValue={item?.container_capacity ?? ""}
            placeholder="Container items only"
            className={inputClass}
          />
        </Field>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-[rgb(var(--sep-colour-59432c))]/35 pt-4">
        <div className="flex flex-wrap gap-5">
          <Check name="isActive" label="Active" checked={item?.is_active ?? true} />
          <Check name="isQuestItem" label="Quest Item" checked={item?.is_quest_item ?? false} />
          <Check name="stackable" label="Stackable" checked={item?.stackable ?? true} />
          <Check name="isUsable" label="Usable" checked={item?.is_usable ?? false} />
        </div>

        {!item ? (
          <ItemCreateRecipeFields
            ingredientItems={ingredientItems}
          />
        ) : null}

        <button
          type="submit"
          className="border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-5 py-3 text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-efd6a8))]"
        >
          {item ? "Save Item" : "Create Item"}
        </button>
      </div>

      <div className="mt-3 border border-[rgb(var(--sep-colour-59432c))]/30 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-[9px] leading-5 text-[rgb(var(--sep-colour-756958))]">
        <p>
          <span className="text-[rgb(var(--sep-colour-a88b61))]">Resolution:</span>{" "}
          Automatic applies directly; Fixed DC rolls the selected die plus its
          optional Relevant Attribute against the configured threshold; Opposed
          rolls against one Counter chosen by the targeted Character.
        </p>
        <p className="mt-1">
          <span className="text-[rgb(var(--sep-colour-a88b61))]">Opposed:</span>{" "}
          choose one or more valid Counters. The defender wins ties. Weapons use
          the same Relevant Attribute for their attack roll and damage unless a
          later rule overrides it.
        </p>
        <p className="mt-1">
          Usable controls the generic Use Item action only. An Item may be
          Equippable without being Usable, and equipped Weapons can still attack.
          Use behaviour, charges, cooldown and generic Use target apply only when
          Usable is enabled. Success/Damage fields remain Item-level mechanics
          because Weapons also use them for combat.
        </p>
      </div>
    </AdminActionForm>
  );
}

function EffectForm({ itemId, effect }: { itemId: string; effect?: Effect }) {
  return (
    <AdminActionForm
      action={effect ? updateItemEffect : createItemEffect}
      className="border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-15100d))] p-3"
    >
      <input type="hidden" name="itemId" value={itemId} />
      {effect ? <input type="hidden" name="effectId" value={effect.id} /> : null}

      <ItemEffectFormLogic />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Field label="Trigger">
          <select
            name="triggerType"
            defaultValue={effect?.trigger_type ?? "use"}
            className={inputClass}
          >
            <option value="owned">Owned</option>
            <option value="equipped">Equipped</option>
            <option value="use">Use</option>
          </select>
        </Field>

        <Field label="Effect mode">
          <select
            name="effectMode"
            defaultValue={
              effect?.effect_mode === "passive"
                ? "instant"
                : effect?.effect_mode ?? "instant"
            }
            className={inputClass}
          >
            <option value="instant">Instantaneous</option>
            <option value="temporary">Timed</option>
          </select>
        </Field>

        <Field label="Duration (minutes)">
          <input
            type="number"
            min={1}
            name="durationMinutes"
            defaultValue={effect?.duration_minutes ?? ""}
            className={inputClass}
          />
        </Field>

        <Field label="Sort order">
          <input
            type="number"
            name="sortOrder"
            defaultValue={effect?.sort_order ?? 0}
            className={inputClass}
          />
        </Field>

        {[
          ["Muscles", "musclesModifier", effect?.muscles_modifier ?? 0],
          ["Reflexes", "reflexesModifier", effect?.reflexes_modifier ?? 0],
          ["Vigour", "vigourModifier", effect?.vigour_modifier ?? 0],
          ["Shrewd", "shrewdModifier", effect?.shrewd_modifier ?? 0],
          ["Brains", "brainsModifier", effect?.brains_modifier ?? 0],
          ["Presence", "presenceModifier", effect?.presence_modifier ?? 0],
          ["Health", "healthDelta", effect?.health_delta ?? 0],
          ["Max Health", "maxHealthModifier", effect?.max_health_modifier ?? 0],
          ["Warping Affinity +", "warpingAffinityModifier", effect?.warping_affinity_modifier ?? 0],
          ["Shapes / day +", "warpsPerDayModifier", effect?.warps_per_day_modifier ?? 0],
        ].map(([label, name, value]) => (
          <Field key={String(name)} label={String(label)}>
            <input
              type="number"
              min={-100}
              max={100}
              name={String(name)}
              defaultValue={Number(value)}
              className={inputClass}
            />
          </Field>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <Check
          name="allowDuplicateStacking"
          label="Allow identical copies to stack this effect"
          checked={effect?.allow_duplicate_stacking ?? false}
        />

        <div className="flex gap-2">
          <button type="submit" className={buttonClass}>
            {effect ? "Save Effect" : "Add Effect"}
          </button>

          {effect ? (
            <button
              type="submit"
              formAction={deleteItemEffect}
              data-confirm-message="Are you sure you want to permanently delete this Item effect?"
              className="border border-red-900/55 bg-red-950/20 px-3 py-2 text-[8px] uppercase tracking-[0.14em] text-red-300"
            >
              Delete
            </button>
          ) : null}
        </div>
      </div>

      <p className="mt-2 text-[8px] leading-5 text-[rgb(var(--sep-colour-6f6252))]">
        Owned and Equipped effects are saved as Passive. Instant Use effects
        apply Health only; Attribute and Max Health modifiers are for
        Timed/Passive effects. Warping bonuses are limited to Affinity +8
        and Shapes/day +10.
      </p>
    </AdminActionForm>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-806b50))]">
        {label}
      </span>
      {children}
    </label>
  );
}

function Check({
  name,
  label,
  checked,
}: {
  name: string;
  label: string;
  checked: boolean;
}) {
  return (
    <label className="flex items-center gap-2 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-9d896a))]">
      <input type="checkbox" name={name} defaultChecked={checked} />
      {label}
    </label>
  );
}
