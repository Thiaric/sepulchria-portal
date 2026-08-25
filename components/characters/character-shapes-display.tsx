import "server-only";

import {
  createClient,
} from "@/lib/supabase/server";
import {
  ShapesCatalogue,
  type ShapeCard,
} from "@/components/warping/shapes-catalogue";

export async function CharacterShapesDisplay({
  characterId,
}: {
  characterId: string;
}) {
  const db =
    await createClient();

  const {
    data,
    error,
  } = await db
    .from("character_shapes")
    .select(
      "acquisition_source,level_override,shape:shapes(*)",
    )
    .eq("character_id", characterId);

  if (error) {
    throw new Error(
      `Unable to load character Shapes: ${error.message}`,
    );
  }

  const byId =
    new Map<string, ShapeCard>();

  for (const row of data ?? []) {
    const raw =
      Array.isArray(row.shape)
        ? row.shape[0]
        : row.shape;

    if (!raw) {
      continue;
    }

    const old =
      byId.get(raw.id);

    const source =
      row.acquisition_source === "order"
        ? "Order"
        : "Staff";

    byId.set(
      raw.id,
      {
        ...raw,
        source:
          old?.source === "Order"
            ? "Order"
            : source,
        level_override:
          Boolean(
            old?.level_override ||
              row.level_override,
          ),
      } as ShapeCard,
    );
  }

  const shapes =
    Array.from(byId.values()).sort(
      (a, b) =>
        a.level - b.level ||
        a.name.localeCompare(b.name),
    );

  if (!shapes.length) {
    return (
      <section className="rounded-xl border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))]/95 p-5">
        <p className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
          Warping
        </p>

        <p className="mt-2 text-[10px] italic text-[rgb(var(--sep-colour-756957))]">
          No Shapes are possessed.
        </p>
      </section>
    );
  }

  return (
    <section>
      <header className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] px-5 py-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-806b50))]">
        Character Warping
      </p>
            <h2 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-dec89f))]">
        Shapes
      </h2>
          </div>

          <p className="text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-756958))]">
      {shapes.length} known
    </p>
  </div>
</header>

      <ShapesCatalogue
        shapes={shapes}
      />
    </section>
  );
}
