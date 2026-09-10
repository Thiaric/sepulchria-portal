"use client";

import {
  useState,
} from "react";

type IngredientOption = {
  id: string;
  name: string;
  is_active: boolean;
};

type IngredientRow = {
  itemId: string;
  quantity: number;
};

const inputClass =
  "w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none placeholder:text-[rgb(var(--sep-colour-625747))] focus:border-[rgb(var(--sep-colour-a17a49))]";

const buttonClass =
  "border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-3 py-2 text-[8px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-efd6a8))] transition hover:bg-[rgb(var(--sep-colour-4a321e))]";

export function ItemCreateRecipeFields({
  ingredientItems,
}: {
  ingredientItems: IngredientOption[];
}) {
  const [enabled, setEnabled] =
    useState(false);

  const [
    ingredients,
    setIngredients,
  ] = useState<IngredientRow[]>([
    {
      itemId: "",
      quantity: 1,
    },
  ]);

  function addIngredient() {
    setIngredients((current) => [
      ...current,
      {
        itemId: "",
        quantity: 1,
      },
    ]);
  }

  function removeIngredient(
    index: number,
  ) {
    setIngredients((current) => {
      const next =
        current.filter(
          (
            _ingredient,
            currentIndex,
          ) =>
            currentIndex !==
            index,
        );

      return next.length
        ? next
        : [
            {
              itemId: "",
              quantity: 1,
            },
          ];
    });
  }

  function updateIngredient(
    index: number,
    patch: Partial<IngredientRow>,
  ) {
    setIngredients((current) =>
      current.map(
        (
          ingredient,
          currentIndex,
        ) =>
          currentIndex === index
            ? {
                ...ingredient,
                ...patch,
              }
            : ingredient,
      ),
    );
  }

  return (
    <div className="mt-4 w-full border-t border-[rgb(var(--sep-colour-59432c))]/35 pt-4 components_admin_item_create_recipe_fields_div_also_create_recipe">
      <label className="flex items-center gap-2 text-[9px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-aa9473))] components_admin_item_create_recipe_fields_label_also_create_recipe">
        <input className="components_admin_item_create_recipe_fields_input_also_create_recipe"
          type="checkbox"
          name="alsoCreateRecipe"
          checked={enabled}
          onChange={(event) =>
            setEnabled(
              event.target.checked,
            )
          }
        />

        Also create Recipe
      </label>

      {!enabled ? null : (
        <div className="mt-4 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-4 components_admin_item_create_recipe_fields_div_also_create_recipe_2">
          <div className="components_admin_item_create_recipe_fields_div_create_recipe_item">
            <p className="text-[8px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-8c704b))] components_admin_item_create_recipe_fields_p_create_recipe_item">
              Crafting
            </p>

            <h3 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-d8bf91))] components_admin_item_create_recipe_fields_h3_create_recipe_item">
              Create recipe with Item
            </h3>

            <p className="mt-2 max-w-4xl text-[10px] leading-5 text-[rgb(var(--sep-colour-817361))] components_admin_item_create_recipe_fields_p_create_recipe_item_2">
              Creating this Item will also create its crafting formula and a physical
              <span className="text-[rgb(var(--sep-colour-bba17a))] components_admin_item_create_recipe_fields_span_create_recipe_item">
                {" "}Recipe: Item Name{" "}
              </span>
              Book / Document that teaches it. The document is automatically Average quality,
              Free transfer, Stackable to 99, Usable, Consumable, Self-targeted and Automatic.
            </p>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2 components_admin_item_create_recipe_fields_div_container">
            <label className="block components_admin_item_create_recipe_fields_label_label">
              <span className="mb-2 block text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-806b50))] components_admin_item_create_recipe_fields_span_text">
                Crafted result quantity
              </span>

              <input
                type="number"
                name="craftingResultQuantity"
                min={1}
                required={enabled}
                defaultValue={1}
                className={[((inputClass)), "components_admin_item_create_recipe_fields_input_crafting_result_quantity"].filter(Boolean).join(" ")}
              />
            </label>

            <label className="block components_admin_item_create_recipe_fields_label_label_2">
              <span className="mb-2 block text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-806b50))] components_admin_item_create_recipe_fields_span_text_2">
                Recipe document reference value
              </span>

              <input
                type="number"
                name="recipeDocumentReferenceValue"
                min={0}
                placeholder="Blank = no reference value"
                className={[((inputClass)), "components_admin_item_create_recipe_fields_input_recipe_document_reference_value"].filter(Boolean).join(" ")}
              />
            </label>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[rgb(var(--sep-colour-59432c))]/35 pt-4 components_admin_item_create_recipe_fields_div_container_2">
            <div className="components_admin_item_create_recipe_fields_div_container_3">
              <p className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))] components_admin_item_create_recipe_fields_p_text">
                Required Ingredients
              </p>
              <p className="mt-1 text-[9px] text-[rgb(var(--sep-colour-766956))] components_admin_item_create_recipe_fields_p_text_2">
                Only Items in the Ingredient category are available.
              </p>
            </div>

            <button
              type="button"
              onClick={addIngredient}
              className={[((buttonClass)), "components_admin_item_create_recipe_fields_button_ingredient"].filter(Boolean).join(" ")}
            >
              + Ingredient
            </button>
          </div>

          <div className="mt-3 space-y-2 components_admin_item_create_recipe_fields_div_container_4">
            {ingredients.map(
              (ingredient, index) => (
                <div
                  key={index}
                  className="grid gap-2 border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-100c09))] p-3 sm:grid-cols-[minmax(0,1fr)_110px_auto] components_admin_item_create_recipe_fields_div_container_5"
                >
                  <select
                    name="craftingIngredientItemId"
                    required={enabled}
                    value={ingredient.itemId}
                    onChange={(event) =>
                      updateIngredient(
                        index,
                        {
                          itemId:
                            event.target.value,
                        },
                      )
                    }
                    className={[((inputClass)), "components_admin_item_create_recipe_fields_select_crafting_ingredient_item_id"].filter(Boolean).join(" ")}
                  >
                    <option className="components_admin_item_create_recipe_fields_option_crafting_ingredient_item_id" value="" disabled>
                      Select Ingredient
                    </option>

                    {ingredientItems.map(
                      (item) => (
                        <option className="components_admin_item_create_recipe_fields_option_option"
                          key={item.id}
                          value={item.id}
                        >
                          {item.name}
                          {!item.is_active
                            ? " (inactive)"
                            : ""}
                        </option>
                      ),
                    )}
                  </select>

                  <input
                    type="number"
                    name="craftingIngredientQuantity"
                    min={1}
                    required={enabled}
                    value={ingredient.quantity}
                    onChange={(event) =>
                      updateIngredient(
                        index,
                        {
                          quantity:
                            Number.parseInt(
                              event.target.value,
                              10,
                            ) || 1,
                        },
                      )
                    }
                    className={[((inputClass)), "components_admin_item_create_recipe_fields_input_crafting_ingredient_quantity"].filter(Boolean).join(" ")}
                    aria-label={`Ingredient ${index + 1} quantity`}
                  />

                  <button
                    type="button"
                    onClick={() =>
                      removeIngredient(index)
                    }
                    className="border border-red-900/55 bg-red-950/20 px-3 py-2 text-[8px] uppercase tracking-[0.14em] text-red-300 components_admin_item_create_recipe_fields_button_remove"
                  >
                    Remove
                  </button>
                </div>
              ),
            )}
          </div>
        </div>
      )}
    </div>
  );
}
