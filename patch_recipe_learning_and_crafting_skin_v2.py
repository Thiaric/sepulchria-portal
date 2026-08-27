from pathlib import Path
import re

ROOT = Path.cwd()

use_actions_path = ROOT / "lib/items/use-actions.ts"
inventory_display_path = ROOT / "components/characters/character-inventory-display.tsx"
inventory_browser_path = ROOT / "components/characters/character-inventory-browser.tsx"
crafting_page_path = ROOT / "app/(portal)/crafting/page.tsx"
crafting_workbench_path = ROOT / "app/(portal)/crafting/crafting-workbench.tsx"

paths = [
    use_actions_path,
    inventory_display_path,
    inventory_browser_path,
    crafting_page_path,
    crafting_workbench_path,
]

for path in paths:
    if not path.exists():
        raise SystemExit(f"ERROR: Missing expected file: {path}")

# ============================================================
# 1. GENERIC ITEM USE: recipe Items call the atomic DB RPC.
# ============================================================

text = use_actions_path.read_text(encoding="utf-8")

old = '''  cooldown_minutes: number | null;
  category: { slug: string } | { slug: string }[] | null;
};'''

new = '''  cooldown_minutes: number | null;
  teaches_recipe_id: string | null;
  category: { slug: string } | { slug: string }[] | null;
};'''

if old not in text:
    raise SystemExit("ERROR: Could not extend ItemMechanics in use-actions.ts.")

text = text.replace(old, new, 1)

old = '''    cooldown_minutes,
    category:item_categories(slug)
  `;'''

new = '''    cooldown_minutes,
    teaches_recipe_id,
    category:item_categories(slug)
  `;'''

if old not in text:
    raise SystemExit("ERROR: Could not add teaches_recipe_id to Item query.")

text = text.replace(old, new, 1)

usability_pattern = re.compile(
    r'''(?P<block>
        if\s*\(\s*!record\.item\.is_usable\s*\)\s*\{
        \s*throw\s+new\s+Error\(
        \s*"This Item cannot be used\."\s*,?
        \s*\);
        \s*\}
    )''',
    re.VERBOSE,
)

match = usability_pattern.search(text)

if not match:
    raise SystemExit(
        "ERROR: Could not find Item usability check in use-actions.ts."
    )

recipe_use_block = r'''
    /*
     * Recipe books/patterns are normal inventory Items.
     * Their use is resolved atomically by Postgres so the recipe is
     * learned and exactly one physical Item is consumed together.
     */
    if (record.item.teaches_recipe_id) {
      const { data, error } = await supabase.rpc(
        "learn_recipe_from_item",
        {
          p_character_id: character.id,
          p_record_kind: record.recordKind,
          p_record_id: record.recordId,
        },
      );

      if (error) {
        throw new Error(error.message);
      }

      const result = data as
        | {
            success?: boolean;
            message?: string;
          }
        | null;

      return {
        ok: result?.success === true,
        message:
          result?.message ??
          "The recipe could not be learned.",
      };
    }
'''

text = text[:match.end()] + recipe_use_block + text[match.end():]


use_actions_path.write_text(text, encoding="utf-8")


# ============================================================
# 2. INVENTORY SERVER DISPLAY:
#    recipe Items are valid Use actions even without item_effects.
# ============================================================

text = inventory_display_path.read_text(encoding="utf-8")

old = '''  cooldown_minutes: number | null;
  reference_value: number | null;'''

new = '''  cooldown_minutes: number | null;
  teaches_recipe_id: string | null;
  reference_value: number | null;'''

if old not in text:
    raise SystemExit("ERROR: Could not extend ItemRequirementRow.")

text = text.replace(old, new, 1)

old = '''            cooldown_minutes,
            reference_value,
            success_die,'''

new = '''            cooldown_minutes,
            teaches_recipe_id,
            reference_value,
            success_die,'''

if old not in text:
    raise SystemExit("ERROR: Could not add teaches_recipe_id to inventory Item query.")

text = text.replace(old, new, 1)

anchor = '''  const effects =
    (item.effects ?? []).filter(
      (effect) =>
        effect.trigger_type === "use",
    );
'''

replacement = '''  if (item.teaches_recipe_id) {
    return null;
  }

''' + anchor

if anchor not in text:
    raise SystemExit("ERROR: Could not find getUseBlockReason effects block.")

text = text.replace(anchor, replacement, 1)

# Add derived flag to browser rows.
anchor = '''        item_active:
          master?.is_active === true,
'''

replacement = '''        item_active:
          master?.is_active === true,
        teaches_recipe:
          Boolean(master?.teaches_recipe_id),
'''

if anchor not in text:
    raise SystemExit("ERROR: Could not find browser row enrichment block.")

text = text.replace(anchor, replacement, 1)

inventory_display_path.write_text(text, encoding="utf-8")


# ============================================================
# 3. INVENTORY CLIENT:
#    show "Learn Recipe" rather than generic "Use".
# ============================================================

text = inventory_browser_path.read_text(encoding="utf-8")

old = '''  item_active: boolean;
  parent_container_id:'''

new = '''  item_active: boolean;
  teaches_recipe: boolean;
  parent_container_id:'''

if old not in text:
    raise SystemExit("ERROR: Could not add teaches_recipe to InventoryBrowserRow.")

text = text.replace(old, new, 1)

old = '''          {pending ? "Using..." : "Use"}
        </button>'''

new = '''          {pending
            ? row.teaches_recipe
              ? "Learning..."
              : "Using..."
            : row.teaches_recipe
              ? "Learn Recipe"
              : "Use"}
        </button>'''

if old not in text:
    raise SystemExit("ERROR: Could not find inventory Use button label.")

text = text.replace(old, new, 1)

inventory_browser_path.write_text(text, encoding="utf-8")


# ============================================================
# 4. CRAFTING PAGE:
#    - same skin-aware shell styling as /associations
#    - reliably removes embedded Context column using :has()
# ============================================================

text = crafting_page_path.read_text(encoding="utf-8")
text = text.replace('import Link from "next/link";\n', "")

return_start = text.find('  return (\n    <main')
if return_start == -1:
    raise SystemExit("ERROR: Could not find CraftingPage return block.")

new_return = r'''  return (
    <>
      <style>{`
        /*
         * Crafting is a workspace, so when it is embedded in a portal modal
         * it owns the whole modal content area. The selector is deliberately
         * local to a document containing [data-crafting-page].
         */
        .sepulchria-viewport-body:has([data-crafting-page]) {
          grid-template-columns: minmax(0, 1fr) !important;
          max-width: none !important;
          width: 100% !important;
        }

        .sepulchria-viewport-body:has([data-crafting-page])
          > .portal-right-shell,
        .sepulchria-viewport-body:has([data-crafting-page])
          .portal-right-collapse-toggle {
          display: none !important;
        }

        .sepulchria-viewport-body:has([data-crafting-page])
          > [data-portal-centre-host] {
          grid-column: 1 !important;
          min-width: 0 !important;
          width: 100% !important;
        }
      `}</style>

      <main
        data-crafting-page
        className="mx-auto w-full max-w-none space-y-5 p-5 sm:p-7 lg:p-8"
      >
        <header className="relative overflow-hidden border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))]/95 px-6 py-4 sm:px-8">
          <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_top_right,rgba(var(--sep-rgb-145-105-60),0.35),transparent_42%)]" />

          <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.28em] text-[rgb(var(--sep-colour-886c48))]">
                Knowledge &amp; Craft
              </p>

              <h1 className="mt-1 font-serif text-3xl text-[rgb(var(--sep-colour-ead6ad))]">
                Crafting Workbench
              </h1>
            </div>

            <p className="max-w-2xl text-[11px] leading-6 text-[rgb(var(--sep-colour-9f9281))] sm:text-right">
              Use materials carried by{" "}
              <span className="text-[rgb(var(--sep-colour-d4bd94))]">
                {character.display_name ?? "your character"}
              </span>{" "}
              to create items from recipes they have learned.
            </p>
          </div>
        </header>

        <CraftingWorkbench
          recipes={recipes}
          inventory={inventory}
        />
      </main>
    </>
  );
}
'''

text = text[:return_start] + new_return
crafting_page_path.write_text(text, encoding="utf-8")


# ============================================================
# 5. CRAFTING WORKBENCH:
#    horizontal layout retained, but all panels/buttons now mirror
#    /associations skin-aware border and action styling.
# ============================================================

workbench = r'''"use client";

import {
  useMemo,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";

import { craftRecipeAction } from "./actions";

export type CraftingInventoryItem = {
  id: string;
  name: string;
  slug: string;
  description: string;
  image_url: string | null;
  quality: string;
  quantity: number;
};

export type CraftingIngredient = {
  item_id: string;
  name: string;
  slug: string;
  description: string;
  image_url: string | null;
  quality: string;
  quantity: number;
  sort_order: number;
};

export type KnownCraftingRecipe = {
  id: string;
  name: string;
  slug: string;
  description: string;
  result_quantity: number;
  sort_order: number;
  result: {
    id: string;
    name: string;
    slug: string;
    description: string;
    image_url: string | null;
    quality: string;
  };
  ingredients: CraftingIngredient[];
};

type CraftingWorkbenchProps = {
  recipes: KnownCraftingRecipe[];
  inventory: CraftingInventoryItem[];
};

type Notice = {
  tone: "success" | "error";
  text: string;
};

function qualityLabel(
  value: string,
) {
  if (!value) return "Average";

  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map(
      (part) =>
        part
          .charAt(0)
          .toUpperCase() +
        part.slice(1),
    )
    .join(" ");
}

function ItemImage({
  src,
  fallback = "◇",
  size = "md",
}: {
  src: string | null;
  fallback?: string;
  size?: "sm" | "md" | "lg";
}) {
  const dimensions =
    size === "lg"
      ? "h-16 w-16"
      : size === "sm"
        ? "h-10 w-10"
        : "h-12 w-12";

  return (
    <div
      className={`flex ${dimensions} shrink-0 items-center justify-center overflow-hidden border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-0d0a08))]`}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          className="h-full w-full object-contain p-1"
        />
      ) : (
        <span className="font-serif text-xl text-[rgb(var(--sep-colour-756247))]">
          {fallback}
        </span>
      )}
    </div>
  );
}

export function CraftingWorkbench({
  recipes,
  inventory,
}: CraftingWorkbenchProps) {
  const router = useRouter();

  const [
    isPending,
    startTransition,
  ] = useTransition();

  const [
    selectedRecipeId,
    setSelectedRecipeId,
  ] = useState(
    recipes[0]?.id ?? "",
  );

  const [
    filledSlots,
    setFilledSlots,
  ] = useState<
    Record<string, boolean>
  >({});

  const [
    notice,
    setNotice,
  ] = useState<Notice | null>(
    null,
  );

  const [
    draggedItemId,
    setDraggedItemId,
  ] = useState<string | null>(
    null,
  );

  const selectedRecipe =
    useMemo(
      () =>
        recipes.find(
          (recipe) =>
            recipe.id ===
            selectedRecipeId,
        ) ?? null,
      [
        recipes,
        selectedRecipeId,
      ],
    );

  const inventoryByItemId =
    useMemo(
      () =>
        new Map(
          inventory.map(
            (item) =>
              [
                item.id,
                item,
              ] as const,
          ),
        ),
      [inventory],
    );

  function chooseRecipe(
    recipeId: string,
  ) {
    setSelectedRecipeId(
      recipeId,
    );
    setFilledSlots({});
    setNotice(null);
  }

  function fillIngredient(
    itemId: string,
  ) {
    if (!selectedRecipe) {
      return;
    }

    const requirement =
      selectedRecipe.ingredients.find(
        (ingredient) =>
          ingredient.item_id ===
          itemId,
      );

    if (!requirement) {
      setNotice({
        tone: "error",
        text:
          "That ingredient is not used by this recipe.",
      });
      return;
    }

    const owned =
      inventoryByItemId.get(
        itemId,
      )?.quantity ?? 0;

    if (
      owned <
      requirement.quantity
    ) {
      setNotice({
        tone: "error",
        text: `You need ${requirement.quantity} × ${requirement.name}, but only have ${owned}.`,
      });
      return;
    }

    setFilledSlots(
      (current) => ({
        ...current,
        [itemId]: true,
      }),
    );

    setNotice(null);
  }

  function autofill() {
    if (!selectedRecipe) {
      return;
    }

    const next: Record<
      string,
      boolean
    > = {};

    for (
      const ingredient of
      selectedRecipe.ingredients
    ) {
      const owned =
        inventoryByItemId.get(
          ingredient.item_id,
        )?.quantity ?? 0;

      if (
        owned >=
        ingredient.quantity
      ) {
        next[
          ingredient.item_id
        ] = true;
      }
    }

    setFilledSlots(next);
    setNotice(null);
  }

  const allRequirementsOwned =
    selectedRecipe?.ingredients.every(
      (ingredient) => {
        const owned =
          inventoryByItemId.get(
            ingredient.item_id,
          )?.quantity ?? 0;

        return (
          owned >=
          ingredient.quantity
        );
      },
    ) ?? false;

  const allSlotsFilled =
    selectedRecipe?.ingredients.every(
      (ingredient) =>
        filledSlots[
          ingredient.item_id
        ] === true,
    ) ?? false;

  function craft() {
    if (
      !selectedRecipe ||
      !allRequirementsOwned ||
      !allSlotsFilled ||
      isPending
    ) {
      return;
    }

    setNotice(null);

    startTransition(
      async () => {
        const result =
          await craftRecipeAction(
            selectedRecipe.id,
          );

        setNotice({
          tone: result.success
            ? "success"
            : "error",
          text: result.message,
        });

        if (result.success) {
          setFilledSlots({});
          router.refresh();
        }
      },
    );
  }

  if (!recipes.length) {
    return (
      <section className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))]/95 p-10 text-center">
        <p className="text-[9px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-886c48))]">
          Recipe Book
        </p>

        <h2 className="mt-3 font-serif text-2xl text-[rgb(var(--sep-colour-ead6ad))]">
          No recipes known
        </h2>

        <p className="mx-auto mt-3 max-w-xl text-[11px] leading-6 text-[rgb(var(--sep-colour-9f9281))]">
          This character has not
          learned any crafting recipes
          yet. Recipes only appear
          after they are learned in
          play.
        </p>
      </section>
    );
  }

  return (
    <div className="flex min-h-0 w-full flex-col gap-5">
      {/* KNOWN RECIPES */}
      <section className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))]/95">
        <div className="flex items-center justify-between gap-4 border-b border-[rgb(var(--sep-colour-60482e))]/35 px-5 py-3">
          <div>
            <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-886c48))]">
              Learned Knowledge
            </p>

            <h2 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-ead6ad))]">
              Known Recipes
            </h2>
          </div>

          <span className="text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-806b50))]">
            {recipes.length} known
          </span>
        </div>

        <div className="flex gap-3 overflow-x-auto p-4">
          {recipes.map(
            (recipe) => {
              const active =
                recipe.id ===
                selectedRecipeId;

              const available =
                recipe.ingredients.every(
                  (ingredient) =>
                    (inventoryByItemId.get(
                      ingredient.item_id,
                    )?.quantity ??
                      0) >=
                    ingredient.quantity,
                );

              return (
                <button
                  key={recipe.id}
                  type="button"
                  onClick={() =>
                    chooseRecipe(
                      recipe.id,
                    )
                  }
                  className={`flex min-w-[230px] max-w-[290px] items-center gap-3 border px-3 py-3 text-left transition ${
                    active
                      ? "border-[rgb(var(--sep-colour-a17a45))] bg-[rgb(var(--sep-colour-3b2919))]"
                      : "border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-100c09))] hover:border-[rgb(var(--sep-colour-9a7344))]/80 hover:bg-[rgb(var(--sep-colour-271c12))]"
                  }`}
                >
                  <ItemImage
                    src={
                      recipe.result
                        .image_url
                    }
                    size="sm"
                    fallback="✦"
                  />

                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 font-serif text-[15px] leading-4 text-[rgb(var(--sep-colour-ead6ad))]">
                      {recipe.name}
                    </p>

                    <p
                      className={`mt-1 text-[7px] uppercase tracking-[0.14em] ${
                        available
                          ? "text-[rgb(var(--sep-colour-b88d54))]"
                          : "text-[rgb(var(--sep-colour-806b50))]"
                      }`}
                    >
                      {available
                        ? "Materials available"
                        : "Materials missing"}
                    </p>
                  </div>
                </button>
              );
            },
          )}
        </div>
      </section>

      {/* CRAFTING BENCH */}
      <section className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))]/95 p-5 sm:p-6">
        <div className="grid items-center gap-6 xl:grid-cols-[minmax(240px,0.75fr)_minmax(0,2.3fr)_minmax(290px,0.9fr)]">
          <div className="min-w-0">
            <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-886c48))]">
              Crafting Bench
            </p>

            <h2 className="mt-1 font-serif text-2xl leading-tight text-[rgb(var(--sep-colour-ead6ad))]">
              {selectedRecipe?.name}
            </h2>

            <p className="mt-3 max-w-sm text-[11px] leading-6 text-[rgb(var(--sep-colour-9f9281))]">
              {
                selectedRecipe?.description
              }
            </p>
          </div>

          <div className="flex min-w-0 flex-wrap items-stretch justify-center gap-3">
            {selectedRecipe?.ingredients.map(
              (ingredient) => {
                const owned =
                  inventoryByItemId.get(
                    ingredient.item_id,
                  )?.quantity ?? 0;

                const filled =
                  filledSlots[
                    ingredient.item_id
                  ] === true;

                const enough =
                  owned >=
                  ingredient.quantity;

                const draggingMatch =
                  draggedItemId ===
                  ingredient.item_id;

                return (
                  <div
                    key={
                      ingredient.item_id
                    }
                    onDragOver={(
                      event,
                    ) => {
                      if (
                        draggedItemId ===
                        ingredient.item_id
                      ) {
                        event.preventDefault();
                        event.dataTransfer.dropEffect =
                          "copy";
                      }
                    }}
                    onDrop={(
                      event,
                    ) => {
                      event.preventDefault();

                      const itemId =
                        event.dataTransfer.getData(
                          "text/plain",
                        );

                      fillIngredient(
                        itemId,
                      );

                      setDraggedItemId(
                        null,
                      );
                    }}
                    className={`min-w-[175px] flex-1 basis-[175px] border transition ${
                      filled
                        ? "border-[rgb(var(--sep-colour-a17a45))] bg-[rgb(var(--sep-colour-3b2919))]"
                        : draggingMatch
                          ? "border-[rgb(var(--sep-colour-9a7344))] bg-[rgb(var(--sep-colour-271c12))]"
                          : "border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-100c09))]"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (filled) {
                          setFilledSlots(
                            (
                              current,
                            ) => ({
                              ...current,
                              [ingredient.item_id]:
                                false,
                            }),
                          );
                        } else {
                          fillIngredient(
                            ingredient.item_id,
                          );
                        }
                      }}
                      className="flex h-full min-h-[88px] w-full items-center gap-3 px-3 py-2 text-left"
                    >
                      <ItemImage
                        src={
                          ingredient.image_url
                        }
                      />

                      <div className="min-w-0">
                        <p className="line-clamp-2 text-[11px] leading-4 text-[rgb(var(--sep-colour-d4bd94))]">
                          {
                            ingredient.name
                          }
                        </p>

                        <p
                          className={`mt-1 text-[9px] ${
                            enough
                              ? "text-[rgb(var(--sep-colour-b88d54))]"
                              : "text-[rgb(var(--sep-colour-806b50))]"
                          }`}
                        >
                          {owned} /{" "}
                          {
                            ingredient.quantity
                          }{" "}
                          owned
                        </p>

                        <p className="mt-1 text-[7px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-806b50))]">
                          {filled
                            ? "Placed"
                            : enough
                              ? "Drop here"
                              : "Missing"}
                        </p>
                      </div>
                    </button>
                  </div>
                );
              },
            )}
          </div>

          <div className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-black/20 p-4">
            <div className="flex items-center gap-3">
              <ItemImage
                src={
                  selectedRecipe?.result
                    .image_url ?? null
                }
                size="lg"
                fallback="✦"
              />

              <div className="min-w-0">
                <p className="text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-806b50))]">
                  Result
                </p>

                <p className="mt-1 font-serif text-lg leading-5 text-[rgb(var(--sep-colour-d4bd94))]">
                  {
                    selectedRecipe?.result_quantity
                  }{" "}
                  ×{" "}
                  {
                    selectedRecipe?.result
                      .name
                  }
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={autofill}
                disabled={
                  !allRequirementsOwned ||
                  isPending
                }
                className="border border-[rgb(var(--sep-colour-765937))] bg-[rgb(var(--sep-colour-271c12))] px-3 py-2.5 text-[8px] uppercase tracking-[0.17em] text-[rgb(var(--sep-colour-dfc79c))] transition hover:border-[rgb(var(--sep-colour-a17a45))] hover:bg-[rgb(var(--sep-colour-3b2919))] disabled:cursor-not-allowed disabled:opacity-35"
              >
                Fill Ingredients
              </button>

              <button
                type="button"
                onClick={craft}
                disabled={
                  !allRequirementsOwned ||
                  !allSlotsFilled ||
                  isPending
                }
                className="border border-[rgb(var(--sep-colour-765937))] bg-[rgb(var(--sep-colour-271c12))] px-3 py-2.5 text-[8px] uppercase tracking-[0.17em] text-[rgb(var(--sep-colour-dfc79c))] transition hover:border-[rgb(var(--sep-colour-a17a45))] hover:bg-[rgb(var(--sep-colour-3b2919))] disabled:cursor-not-allowed disabled:opacity-35"
              >
                {isPending
                  ? "Crafting..."
                  : "Craft"}
              </button>
            </div>

            {notice ? (
              <p
                className={`mt-3 text-[9px] leading-4 ${
                  notice.tone ===
                  "success"
                    ? "text-[rgb(var(--sep-colour-b88d54))]"
                    : "text-[rgb(var(--sep-colour-c17b6c))]"
                }`}
              >
                {notice.text}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      {/* MATERIALS */}
      <section className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))]/95">
        <div className="flex items-end justify-between gap-4 border-b border-[rgb(var(--sep-colour-60482e))]/35 px-5 py-3">
          <div>
            <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-886c48))]">
              Materials at Hand
            </p>

            <h2 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-ead6ad))]">
              Ingredients
            </h2>
          </div>

          <p className="text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-806b50))]">
            Drag to the bench or
            double-click
          </p>
        </div>

        {inventory.length ? (
          <div className="grid grid-flow-col auto-cols-[minmax(200px,250px)] gap-3 overflow-x-auto p-4">
            {inventory.map(
              (item) => {
                const usedByRecipe =
                  selectedRecipe?.ingredients.some(
                    (ingredient) =>
                      ingredient.item_id ===
                      item.id,
                  );

                return (
                  <button
                    key={item.id}
                    type="button"
                    draggable
                    onDragStart={(
                      event,
                    ) => {
                      event.dataTransfer.setData(
                        "text/plain",
                        item.id,
                      );

                      event.dataTransfer.effectAllowed =
                        "copy";

                      setDraggedItemId(
                        item.id,
                      );
                    }}
                    onDragEnd={() =>
                      setDraggedItemId(
                        null,
                      )
                    }
                    onDoubleClick={() =>
                      fillIngredient(
                        item.id,
                      )
                    }
                    title="Drag onto the workbench, or double-click to place"
                    className={`flex min-h-[72px] items-center gap-3 border px-3 py-2 text-left transition ${
                      draggedItemId ===
                      item.id
                        ? "border-[rgb(var(--sep-colour-a17a45))] bg-[rgb(var(--sep-colour-3b2919))]"
                        : usedByRecipe
                          ? "border-[rgb(var(--sep-colour-765937))] bg-[rgb(var(--sep-colour-271c12))] hover:border-[rgb(var(--sep-colour-a17a45))] hover:bg-[rgb(var(--sep-colour-3b2919))]"
                          : "border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-100c09))] hover:border-[rgb(var(--sep-colour-9a7344))]/80"
                    }`}
                  >
                    <ItemImage
                      src={
                        item.image_url
                      }
                    />

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] text-[rgb(var(--sep-colour-d4bd94))]">
                        {item.name}
                      </p>

                      <p className="mt-0.5 text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-806b50))]">
                        {qualityLabel(
                          item.quality,
                        )}
                      </p>
                    </div>

                    <span className="shrink-0 border border-[rgb(var(--sep-colour-60482e))]/45 bg-black/20 px-2 py-1 text-[10px] text-[rgb(var(--sep-colour-d4bd94))]">
                      ×{item.quantity}
                    </span>
                  </button>
                );
              },
            )}
          </div>
        ) : (
          <p className="px-5 py-4 text-[10px] leading-5 text-[rgb(var(--sep-colour-9f9281))]">
            No stackable crafting
            materials are currently in
            the character&apos;s root
            inventory.
          </p>
        )}
      </section>
    </div>
  );
}
'''

crafting_workbench_path.write_text(
    workbench,
    encoding="utf-8",
)

print("SUCCESS")
print("")
print("Local patch applied:")
print("  - Recipe Items use the existing inventory Use flow")
print("  - Recipe Items display 'Learn Recipe'")
print("  - Item use calls learn_recipe_from_item atomically")
print("  - Crafting Context/right column is hidden by page-scoped CSS")
print("  - Crafting borders/buttons now mirror /associations skin variables")
print("")
print("IMPORTANT: run setup_recipe_learning_items.sql in Supabase before testing recipe learning.")
print("Then run: npm run build")
