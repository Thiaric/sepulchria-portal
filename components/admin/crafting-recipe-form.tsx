"use client";

import {
  useState,
} from "react";

import {
  AdminActionForm,
} from "@/components/admin/admin-action-form";

export type CraftingRecipeItemOption = {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  is_active: boolean;
};

export type CraftingRecipeIngredientValue = {
  itemId: string;
  quantity: number;
};

type Props = {
  action: (
    formData: FormData,
  ) => Promise<void>;
  recipeId?: string;
  defaultName?: string;
  defaultSlug?: string;
  defaultDescription?: string;
  defaultResultItemId?: string;
  defaultResultQuantity?: number;
  defaultSortOrder?: number;
  defaultActive?: boolean;
  defaultIngredients?: CraftingRecipeIngredientValue[];
  resultItems: CraftingRecipeItemOption[];
  ingredientItems: CraftingRecipeItemOption[];
  submitLabel: string;
};

const inputClass =
  "w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none placeholder:text-[rgb(var(--sep-colour-625747))] focus:border-[rgb(var(--sep-colour-a17a49))]";

const buttonClass =
  "border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-4 py-2.5 text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-efd6a8))] transition hover:bg-[rgb(var(--sep-colour-4a321e))]";

export function CraftingRecipeForm({
  action,
  recipeId,
  defaultName = "",
  defaultSlug = "",
  defaultDescription = "",
  defaultResultItemId = "",
  defaultResultQuantity = 1,
  defaultSortOrder = 0,
  defaultActive = true,
  defaultIngredients = [],
  resultItems,
  ingredientItems,
  submitLabel,
}: Props) {
  const [
    selectedResultItemId,
    setSelectedResultItemId,
  ] = useState(
    defaultResultItemId,
  );

  const [
    ingredients,
    setIngredients,
  ] = useState<
    CraftingRecipeIngredientValue[]
  >(
    defaultIngredients.length
      ? defaultIngredients
      : [
          {
            itemId: "",
            quantity: 1,
          },
        ],
  );

  function addIngredient() {
    setIngredients(
      (current) => [
        ...current,
        {
          itemId: "",
          quantity: 1,
        },
      ],
    );
  }

  function removeIngredient(
    index: number,
  ) {
    setIngredients(
      (current) => {
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
      },
    );
  }

  function updateIngredient(
    index: number,
    patch: Partial<CraftingRecipeIngredientValue>,
  ) {
    setIngredients(
      (current) =>
        current.map(
          (
            ingredient,
            currentIndex,
          ) =>
            currentIndex ===
            index
              ? {
                  ...ingredient,
                  ...patch,
                }
              : ingredient,
        ),
    );
  }

  const selectedResultItem =
    resultItems.find(
      (item) =>
        item.id ===
        selectedResultItemId,
    ) ?? null;

  return (
    <AdminActionForm
      action={action}
      className="mt-5"
    >
      {recipeId ? (
        <input
          type="hidden"
          name="recipeId"
          value={recipeId}
        />
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Field label="Crafted result Item">
          <select
            name="resultItemId"
            required
            value={
              selectedResultItemId
            }
            onChange={(
              event,
            ) =>
              setSelectedResultItemId(
                event.target.value,
              )
            }
            className={
              inputClass
            }
          >
            <option
              value=""
              disabled
            >
              Select Item
            </option>

            {resultItems.map(
              (item) => (
                <option
                  key={
                    item.id
                  }
                  value={
                    item.id
                  }
                >
                  {item.name}
                  {!item.is_active
                    ? " (inactive)"
                    : ""}
                </option>
              ),
            )}
          </select>
        </Field>

        <Field label="Name">
          <input
            value={
              selectedResultItem?.name ??
              ""
            }
            readOnly
            placeholder="Select an Item first"
            className={`${inputClass} cursor-default opacity-80`}
          />

          <input
            type="hidden"
            name="name"
            value={
              selectedResultItem?.name ??
              ""
            }
          />
        </Field>

        <Field label="Slug">
          <input
            name="slug"
            defaultValue={
              defaultSlug
            }
            placeholder="Auto from Item name"
            className={
              inputClass
            }
          />
        </Field>

        <Field label="Result quantity">
          <input
            type="number"
            name="resultQuantity"
            min={1}
            required
            defaultValue={
              defaultResultQuantity
            }
            className={
              inputClass
            }
          />
        </Field>

        <div className="md:col-span-2 xl:col-span-4">
          <Field label="Description">
            <textarea
              name="description"
              rows={3}
              defaultValue={
                defaultDescription
              }
              className={
                inputClass
              }
            />
          </Field>
        </div>

        <Field label="Sort order">
          <input
            type="number"
            name="sortOrder"
            defaultValue={
              defaultSortOrder
            }
            className={
              inputClass
            }
          />
        </Field>

        <div className="flex items-end pb-2">
          <label className="flex items-center gap-2 text-[9px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-aa9473))]">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={
                defaultActive
              }
            />
            Active
          </label>
        </div>
      </div>

      <div className="mt-6 border-t border-[rgb(var(--sep-colour-59432c))]/35 pt-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[8px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-8c704b))]">
              Formula
            </p>

            <h3 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-d8bf91))]">
              Required Ingredients
            </h3>
          </div>

          <button
            type="button"
            onClick={
              addIngredient
            }
            className={
              buttonClass
            }
          >
            + Ingredient
          </button>
        </div>

        <div className="mt-4 space-y-2">
          {ingredients.map(
            (
              ingredient,
              index,
            ) => (
              <div
                key={index}
                className="grid gap-2 border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-100c09))] p-3 sm:grid-cols-[minmax(0,1fr)_110px_auto]"
              >
                <select
                  name="ingredientItemId"
                  required
                  value={
                    ingredient.itemId
                  }
                  onChange={(
                    event,
                  ) =>
                    updateIngredient(
                      index,
                      {
                        itemId:
                          event
                            .target
                            .value,
                      },
                    )
                  }
                  className={
                    inputClass
                  }
                >
                  <option
                    value=""
                    disabled
                  >
                    Select Ingredient
                  </option>

                  {ingredientItems.map(
                    (item) => (
                      <option
                        key={
                          item.id
                        }
                        value={
                          item.id
                        }
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
                  name="ingredientQuantity"
                  min={1}
                  required
                  value={
                    ingredient.quantity
                  }
                  onChange={(
                    event,
                  ) =>
                    updateIngredient(
                      index,
                      {
                        quantity:
                          Number.parseInt(
                            event
                              .target
                              .value,
                            10,
                          ) ||
                          1,
                      },
                    )
                  }
                  className={
                    inputClass
                  }
                  aria-label={`Ingredient ${index + 1} quantity`}
                />

                <button
                  type="button"
                  onClick={() =>
                    removeIngredient(
                      index,
                    )
                  }
                  className="border border-red-900/55 bg-red-950/20 px-3 py-2 text-[8px] uppercase tracking-[0.14em] text-red-300"
                >
                  Remove
                </button>
              </div>
            ),
          )}
        </div>
      </div>

      <div className="mt-5 flex justify-end border-t border-[rgb(var(--sep-colour-59432c))]/35 pt-5">
        <button
          type="submit"
          className={
            buttonClass
          }
        >
          {submitLabel}
        </button>
      </div>
    </AdminActionForm>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-806b50))]">
        {label}
      </span>

      {children}
    </label>
  );
}
