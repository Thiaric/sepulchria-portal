import { AdminActionForm } from "@/components/admin/admin-action-form";
import { createClient } from "@/lib/supabase/server";
import {
  deleteItemShapeGrant,
  saveItemShapeGrant,
} from "@/app/(portal)/admin/items/actions";

const inputClass =
  "w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))]";

async function loadShapes() {
  const db = await createClient();
  const { data, error } = await db
    .from("shapes")
    .select("id,name,level,school,word_of_power,is_active")
    .eq("is_feat_backing", false)
    .order("level", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Unable to load Shapes: ${error.message}`);
  }

  return data ?? [];
}

export async function ItemTeachShapeField({
  value,
}: {
  value: string | null;
}) {
  const shapes = await loadShapes();

  return (
    <label className="block">
      <span className="mb-1.5 block text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-8c704b))]">
        Teaches Shape — Scroll
      </span>
      <select
        name="teachesShapeId"
        defaultValue={value ?? ""}
        className={inputClass}
      >
        <option value="">None</option>
        {shapes.map((shape) => (
          <option key={shape.id} value={shape.id}>
            L{shape.level} · {shape.name}
            {!shape.is_active ? " (inactive)" : ""}
          </option>
        ))}
      </select>
      <p className="mt-1.5 text-[8px] leading-4 text-[rgb(var(--sep-colour-806b50))]">
        When selected, this Item becomes a self-targeted consumable Scroll. Using it from Inventory attempts to permanently learn the linked Shape.
      </p>
    </label>
  );
}

export async function ItemShapeGrants({
  itemId,
}: {
  itemId: string;
}) {
  const db = await createClient();

  const [shapes, grantsResult] = await Promise.all([
    loadShapes(),
    db
      .from("item_shapes")
      .select(
        "id,item_id,shape_id,charges_per_day,sort_order,shape:shapes(id,name,level,school,word_of_power,is_active)",
      )
      .eq("item_id", itemId)
      .order("sort_order", { ascending: true }),
  ]);

  if (grantsResult.error) {
    throw new Error(
      `Unable to load Item Shapes: ${grantsResult.error.message}`,
    );
  }

  const grants = grantsResult.data ?? [];

  return (
    <details className="mt-6 border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-15100d))]">
      <summary className="cursor-pointer list-none px-4 py-3">
        <p className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
          Warping
        </p>
        <p className="mt-1 font-serif text-lg text-[rgb(var(--sep-colour-d8bf91))]">
          Granted Shapes & Daily Charges
        </p>
      </summary>

      <div className="border-t border-[rgb(var(--sep-colour-59432c))]/30 p-4">
        <p className="text-[9px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">
          While this Item is equipped, these Shapes can be Warped without spending the Character&apos;s normal Shapes/day. Each Shape spends its own Item charge instead. Charges reset at midnight UTC.
        </p>

        {grants.length ? (
          <div className="mt-4 space-y-2">
            {grants.map((grant: any) => {
              const raw = grant.shape;
              const shape = Array.isArray(raw)
                ? raw[0] ?? null
                : raw;

              return (
                <div
                  key={grant.id}
                  className="grid gap-2 border border-[rgb(var(--sep-colour-60482e))]/40 bg-[rgb(var(--sep-colour-100c09))] p-3 lg:grid-cols-[1fr_auto_auto]"
                >
                  <div>
                    <p className="font-serif text-sm text-[rgb(var(--sep-colour-cdb48d))]">
                      L{shape?.level ?? "?"} · {shape?.name ?? "Unknown Shape"}
                    </p>
                    <p className="mt-1 text-[8px] text-[rgb(var(--sep-colour-806b50))]">
                      {shape?.school ?? "—"} · {shape?.word_of_power ?? "—"}
                    </p>
                  </div>

                  <AdminActionForm
                    action={saveItemShapeGrant}
                    className="flex items-end gap-2"
                  >
                    <input type="hidden" name="itemId" value={itemId} />
                    <input type="hidden" name="shapeId" value={grant.shape_id} />
                    <label>
                      <span className="mb-1 block text-[7px] uppercase text-[rgb(var(--sep-colour-806b50))]">
                        Charges/day
                      </span>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        name="chargesPerDay"
                        defaultValue={grant.charges_per_day}
                        className="w-24 border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-2 py-2 text-xs text-[rgb(var(--sep-colour-d7c4a5))]"
                      />
                    </label>
                    <label>
                      <span className="mb-1 block text-[7px] uppercase text-[rgb(var(--sep-colour-806b50))]">
                        Sort
                      </span>
                      <input
                        type="number"
                        name="sortOrder"
                        defaultValue={grant.sort_order}
                        className="w-20 border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-2 py-2 text-xs text-[rgb(var(--sep-colour-d7c4a5))]"
                      />
                    </label>
                    <button
                      type="submit"
                      className="border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-3 py-2 text-[8px] uppercase text-[rgb(var(--sep-colour-efd6a8))]"
                    >
                      Save
                    </button>
                  </AdminActionForm>

                  <AdminActionForm
                    action={deleteItemShapeGrant}
                    confirmMessage={`Remove ${shape?.name ?? "this Shape"} from this Item?`}
                    className="flex items-end"
                  >
                    <input type="hidden" name="grantId" value={grant.id} />
                    <button
                      type="submit"
                      className="border border-red-900/55 bg-red-950/20 px-3 py-2 text-[8px] uppercase text-red-300"
                    >
                      Remove
                    </button>
                  </AdminActionForm>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mt-4 text-[9px] italic text-[rgb(var(--sep-colour-756958))]">
            No Shapes are granted by this Item.
          </p>
        )}

        <AdminActionForm
          action={saveItemShapeGrant}
          className="mt-4 grid gap-3 border-t border-[rgb(var(--sep-colour-59432c))]/30 pt-4 md:grid-cols-[1fr_140px_100px_auto] md:items-end"
        >
          <input type="hidden" name="itemId" value={itemId} />

          <label>
            <span className="mb-1 block text-[7px] uppercase text-[rgb(var(--sep-colour-806b50))]">
              Add Shape
            </span>
            <select
              name="shapeId"
              required
              defaultValue=""
              className={inputClass}
            >
              <option value="" disabled>Select Shape</option>
              {shapes.map((shape) => (
                <option key={shape.id} value={shape.id}>
                  L{shape.level} · {shape.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="mb-1 block text-[7px] uppercase text-[rgb(var(--sep-colour-806b50))]">
              Charges/day
            </span>
            <input
              type="number"
              min={1}
              max={100}
              name="chargesPerDay"
              defaultValue={1}
              className={inputClass}
            />
          </label>

          <label>
            <span className="mb-1 block text-[7px] uppercase text-[rgb(var(--sep-colour-806b50))]">
              Sort
            </span>
            <input
              type="number"
              name="sortOrder"
              defaultValue={0}
              className={inputClass}
            />
          </label>

          <button
            type="submit"
            className="border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-4 py-2.5 text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-efd6a8))]"
          >
            Add / Update
          </button>
        </AdminActionForm>
      </div>
    </details>
  );
}
