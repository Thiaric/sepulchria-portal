#!/usr/bin/env python3
from pathlib import Path
import sys

ROOT = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path.cwd()

GIFTS = ROOT / "app/(portal)/admin/gifts/page.tsx"
ITEMS = ROOT / "app/(portal)/admin/items/page.tsx"
CATALOGUE = ROOT / "components/gifts/gifts-catalogue.tsx"
ADMIN_CONTEXT = ROOT / "components/portal/admin-context-panel.tsx"
PORTAL_CONTEXT = ROOT / "components/portal/portal-context-panel.tsx"

for path in (GIFTS, ITEMS, CATALOGUE, ADMIN_CONTEXT, PORTAL_CONTEXT):
    if not path.exists():
        raise SystemExit(f"Missing file: {path}")

def replace_once(text: str, old: str, new: str, label: str) -> str:
    if new in text and old not in text:
        print(f"SKIP  {label} (already patched)")
        return text
    if old not in text:
        raise SystemExit(f"Could not patch {label}: expected block not found.")
    print(f"PATCH {label}")
    return text.replace(old, new, 1)

# ---------------- /admin/gifts ----------------

gifts = GIFTS.read_text(encoding="utf-8")

gifts = replace_once(
    gifts,
    '''type Props = {
  searchParams?: Promise<{ success?: string; error?: string }>;
};
''',
    '''type Props = {
  searchParams?: Promise<{ success?: string; error?: string; gift?: string }>;
};
''',
    "admin/gifts selected Feat query param",
)

gifts = replace_once(
    gifts,
    '''  const params = (await searchParams) ?? {};
  const supabase = await createClient();
''',
    '''  const params = (await searchParams) ?? {};
  const selectedGiftId =
    typeof params.gift === "string"
      ? params.gift.trim()
      : "";
  const supabase = await createClient();
''',
    "admin/gifts selected Feat id",
)

gifts = replace_once(
    gifts,
    '''  const gifts = (giftsResult.data ?? []) as unknown as Gift[];
  const races = (racesResult.data ?? []) as Race[];
''',
    '''  const gifts = (giftsResult.data ?? []) as unknown as Gift[];
  const selectedGift =
    gifts.find((gift) => gift.id === selectedGiftId) ?? null;
  const races = (racesResult.data ?? []) as Race[];
''',
    "admin/gifts selected Feat lookup",
)

old_gifts_list_start = '''        <div className="mt-6 space-y-4 admin_gifts_page_div_container_4">
'''
old_gifts_list_end = '''        </div>
      </div>
    </main>
  );
}

function AdminRecapBox({
'''

start = gifts.find(old_gifts_list_start)
end = gifts.find(old_gifts_list_end, start)

if start < 0 or end < 0:
    raise SystemExit("Could not locate the original admin/gifts catalogue block.")

new_gifts_list = r'''        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3 admin_gifts_page_div_container_4">
          {gifts.map((gift) => (
            <a
              key={gift.id}
              id={`gift-card-${gift.id}`}
              href={`/admin/gifts?gift=${gift.id}#gift-editor`}
              className={[
                "scroll-mt-6 border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))] px-4 py-4 transition hover:border-[rgb(var(--sep-colour-8d693e))] hover:bg-[rgb(var(--sep-colour-17110d))]",
                selectedGiftId === gift.id
                  ? "ring-1 ring-[rgb(var(--sep-colour-a17a49))]/70"
                  : "",
              ].filter(Boolean).join(" ")}
            >
              <div className="flex items-start justify-between gap-3 admin_gifts_page_div_container_5">
                <div className="min-w-0 admin_gifts_page_div_container_6">
                  <p className="truncate font-serif text-lg text-[rgb(var(--sep-colour-d8bf91))] admin_gifts_page_p_text">
                    {gift.name}
                  </p>
                  <p className="mt-1 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-766956))] admin_gifts_page_p_text_2">
                    {gift.effect_mode === "passive" ? "Passive" : "Activated"}
                    {gift.is_general ? " · General" : ""}
                    {" · "}
                    {gift.assignments?.length ?? 0} owners
                  </p>
                </div>

                <span className="shrink-0 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-9b8768))] admin_gifts_page_span_text">
                  {gift.is_active ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-1.5 border-t border-[rgb(var(--sep-colour-59432c))]/25 pt-3 admin_gifts_page_div_container_7">
                <AdminRecapBox
                  label="Use"
                  value={`${gift.effect_mode === "passive" ? "Passive" : "Activated"} · ${adminTargetLabel(gift)}`}
                />
                <AdminRecapBox label="Success" value={adminSuccessLabel(gift)} />
                <AdminRecapBox
                  label="Timing"
                  value={`${adminDurationLabel(gift)} · ${
                    gift.effect_mode === "temporary"
                      ? gift.cooldown_minutes === 0
                        ? "No cooldown"
                        : `${gift.cooldown_minutes} min cooldown`
                      : "No cooldown"
                  }`}
                />
                <AdminRecapBox
                  label="Health / Damage"
                  value={`${
                    gift.damage_dice
                      ? `${gift.damage_dice}${gift.damage_type ? ` ${gift.damage_type}` : ""}`
                      : "No damage"
                  } · HP ${
                    gift.health_delta !== 0
                      ? `${gift.health_delta > 0 ? "+" : ""}${gift.health_delta}`
                      : "—"
                  } · Max ${
                    gift.max_health_modifier !== 0
                      ? `${gift.max_health_modifier > 0 ? "+" : ""}${gift.max_health_modifier}`
                      : "—"
                  }`}
                />
                <AdminRecapBox label="Attributes" value={adminModifierLabel(gift)} />
                <AdminRecapBox
                  label="Access"
                  value={`Ancestries ${gift.races?.length ?? 0} · Roles ${
                    gift.roles?.length ?? 0
                  } · General ${gift.is_general ? "Yes" : "No"}`}
                />
              </div>
            </a>
          ))}
        </div>

        {selectedGift ? (
          <section
            id="gift-editor"
            className="mt-8 scroll-mt-6 border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))]"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[rgb(var(--sep-colour-59432c))]/35 px-4 py-4">
              <div>
                <p className="text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-766956))]">
                  Feat editor
                </p>
                <h2 className="mt-1 font-serif text-2xl text-[rgb(var(--sep-colour-d8bf91))]">
                  {selectedGift.name}
                </h2>
              </div>
              <a
                href="/admin/gifts"
                className="border border-[rgb(var(--sep-colour-765937))]/55 px-3 py-2 text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-c8aa7b))]"
              >
                Close Editor
              </a>
            </div>

            <div className="p-4 sm:p-5 admin_gifts_page_div_container_8">
              <GiftForm
                action={updateGift}
                gift={selectedGift}
                races={races}
                roles={roles}
              />

              <div className="mt-6 border-t border-[rgb(var(--sep-colour-59432c))]/35 pt-5 admin_gifts_page_div_container_9">
                <p className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))] admin_gifts_page_p_text_3">
                  Staff assignment
                </p>

                <AdminActionForm
                  action={assignGiftToCharacter}
                  className="mt-3 flex flex-wrap gap-2"
                >
                  <input className="admin_gifts_page_input_gift_id" type="hidden" name="giftId" value={selectedGift.id} />

                  <select
                    name="characterId"
                    required
                    defaultValue=""
                    className="min-w-[240px] flex-1 border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-15100d))] px-3 py-2.5 text-xs text-[rgb(var(--sep-colour-d7c4a5))] outline-none admin_gifts_page_select_character_id"
                  >
                    <option className="admin_gifts_page_option_character_id" value="" disabled>
                      Select character
                    </option>
                    {characters.map((character) => (
                      <option className="admin_gifts_page_option_option" key={character.id} value={character.id}>
                        {character.display_name}
                      </option>
                    ))}
                  </select>

                  <select
                    name="assignmentMode"
                    required
                    defaultValue="permanent"
                    className="min-w-[150px] border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-15100d))] px-3 py-2.5 text-xs text-[rgb(var(--sep-colour-d7c4a5))] outline-none admin_gifts_page_select_assignment_mode"
                  >
                    <option className="admin_gifts_page_option_permanent" value="permanent">Permanent</option>
                    <option className="admin_gifts_page_option_temporary" value="temporary">Temporary</option>
                  </select>

                  <input
                    type="number"
                    name="assignmentDays"
                    min={1}
                    step={1}
                    placeholder="Days"
                    aria-label="Temporary assignment duration in days"
                    className="w-[100px] border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-15100d))] px-3 py-2.5 text-xs text-[rgb(var(--sep-colour-d7c4a5))] outline-none admin_gifts_page_input_assignment_days"
                  />

                  <button
                    type="submit"
                    className="border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-4 py-2.5 text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-efd6a8))] admin_gifts_page_button_assign_feat"
                  >
                    Assign Feat
                  </button>
                </AdminActionForm>

                {selectedGift.assignments?.length ? (
                  <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3 admin_gifts_page_div_container_10">
                    {selectedGift.assignments.map((assignment) => (
                      <div
                        key={assignment.id}
                        className="flex items-center justify-between gap-3 border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-15100d))] px-3 py-2 admin_gifts_page_div_container_11"
                      >
                        <div className="min-w-0 admin_gifts_page_div_container_12">
                          <p className="truncate font-serif text-sm text-[rgb(var(--sep-colour-cab28a))] admin_gifts_page_p_text_4">
                            {characterById.get(assignment.character_id)?.display_name ?? "Unknown character"}
                          </p>
                          <p className="mt-1 text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-6e6252))] admin_gifts_page_p_text_5">
                            {assignment.acquisition_source}
                            {assignment.acquisition_source === "staff"
                              ? assignment.expires_at
                                ? ` · Until ${new Date(assignment.expires_at).toLocaleDateString("en-GB")}`
                                : " · Permanent"
                              : ""}
                          </p>
                        </div>

                        <AdminActionForm action={removeGiftFromCharacter}>
                          <input
                            className="admin_gifts_page_input_assignment_id"
                            type="hidden"
                            name="assignmentId"
                            value={assignment.id}
                          />
                          <button
                            type="submit"
                            className="text-[7px] uppercase tracking-[0.12em] text-red-300 admin_gifts_page_button_remove"
                          >
                            Remove
                          </button>
                        </AdminActionForm>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="mt-6 border-t border-[rgb(var(--sep-colour-59432c))]/35 pt-5 admin_gifts_page_div_container_13">
                <AdminActionForm
                  action={deleteGift}
                  confirmMessage={`Are you sure you want to permanently delete the Feat "${selectedGift.name}"?`}
                  className="flex justify-end"
                >
                  <input className="admin_gifts_page_input_gift_id_2" type="hidden" name="giftId" value={selectedGift.id} />
                  <button
                    type="submit"
                    className="border border-red-900/55 bg-red-950/20 px-4 py-2 text-[8px] uppercase tracking-[0.14em] text-red-300 admin_gifts_page_button_delete_feat"
                  >
                    Delete Feat
                  </button>
                </AdminActionForm>
              </div>
            </div>
          </section>
        ) : null}
'''

gifts = gifts[:start] + new_gifts_list + gifts[end:]
GIFTS.write_text(gifts, encoding="utf-8")
print("PATCH admin/gifts 3-column cards + one editor at bottom")
print("KEEP  GiftForm/actions/fields unchanged")

# ---------------- /admin/items ----------------

items = ITEMS.read_text(encoding="utf-8")

items = replace_once(
    items,
    '''type Props = {
  searchParams?: Promise<{ error?: string }>;
};
''',
    '''type Props = {
  searchParams?: Promise<{ error?: string; item?: string }>;
};
''',
    "admin/items selected Item query param",
)

items = replace_once(
    items,
    '''  const params = (await searchParams) ?? {};
  const supabase = await createClient();
''',
    '''  const params = (await searchParams) ?? {};
  const selectedItemId =
    typeof params.item === "string"
      ? params.item.trim()
      : "";
  const supabase = await createClient();
''',
    "admin/items selected Item id",
)

items = replace_once(
    items,
    '''  const items = (itemsResult.data ?? []) as unknown as Item[];

  const categoryById = new Map(categories.map((category) => [category.id, category]));
''',
    '''  const items = (itemsResult.data ?? []) as unknown as Item[];
  const selectedItem =
    items.find((item) => item.id === selectedItemId) ?? null;
  const selectedEffects =
    [...(selectedItem?.effects ?? [])].sort(
      (a, b) => a.sort_order - b.sort_order,
    );

  const categoryById = new Map(categories.map((category) => [category.id, category]));
''',
    "admin/items selected Item lookup",
)

old_items_list_start = '''        <div className="mt-6 space-y-4 admin_items_page_div_container_6">
'''
old_items_list_end = '''        {!items.length ? (
'''

start = items.find(old_items_list_start)
end = items.find(old_items_list_end, start)

if start < 0 or end < 0:
    raise SystemExit("Could not locate the original admin/items catalogue block.")

new_items_list = r'''        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3 admin_items_page_div_container_6">
          {items.map((item) => {
            const category = categoryById.get(item.category_id);
            const subcategory = item.subcategory_id
              ? subcategoryById.get(item.subcategory_id)
              : null;
            const effects = [...(item.effects ?? [])].sort(
              (a, b) => a.sort_order - b.sort_order,
            );

            return (
              <a
                key={item.id}
                id={`item-card-${item.id}`}
                href={`/admin/items?item=${item.id}#item-editor`}
                className={[
                  "scroll-mt-6 border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))] px-4 py-4 transition hover:border-[rgb(var(--sep-colour-8d693e))] hover:bg-[rgb(var(--sep-colour-17110d))]",
                  selectedItemId === item.id
                    ? "ring-1 ring-[rgb(var(--sep-colour-a17a49))]/70"
                    : "",
                ].filter(Boolean).join(" ")}
              >
                <div className="flex items-center gap-4 admin_items_page_div_container_7">
                  <ItemImageFrame
                    src={item.image_url}
                    quality={item.quality}
                    className="h-12 w-12"
                    badgeSize="sm"
                  />

                  <div className="min-w-0 flex-1 admin_items_page_div_container_8">
                    <p className="truncate font-serif text-lg text-[rgb(var(--sep-colour-d8bf91))] admin_items_page_p_text">
                      {item.name}
                    </p>
                    <p className="mt-1 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-766956))] admin_items_page_p_text_2">
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

                  <span className="shrink-0 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-9b8768))] admin_items_page_span_text">
                    {item.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
              </a>
            );
          })}
        </div>

        {selectedItem ? (
          <section
            id="item-editor"
            className="mt-8 scroll-mt-6 border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))]"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[rgb(var(--sep-colour-59432c))]/35 px-4 py-4">
              <div>
                <p className="text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-766956))]">
                  Item editor
                </p>
                <h2 className="mt-1 font-serif text-2xl text-[rgb(var(--sep-colour-d8bf91))]">
                  {selectedItem.name}
                </h2>
              </div>
              <a
                href="/admin/items"
                className="border border-[rgb(var(--sep-colour-765937))]/55 px-3 py-2 text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-c8aa7b))]"
              >
                Close Editor
              </a>
            </div>

            <div className="p-4 sm:p-5 admin_items_page_div_container_9">
              <section className="border border-[rgb(var(--sep-colour-6a5032))]/45 bg-[rgb(var(--sep-colour-130e0b))] p-4 sm:p-5 admin_items_page_section_item_mechanics">
                <p className="text-[8px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-8c704b))] admin_items_page_p_item_mechanics">
                  Use / Effects
                </p>
                <h3 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-d8bf91))] admin_items_page_h3_item_mechanics">
                  Item mechanics
                </h3>
                <p className="mt-2 text-[10px] leading-5 text-[rgb(var(--sep-colour-817361))] admin_items_page_p_item_mechanics_2">
                  Configure the Item, its target, success roll, damage, use behaviour,
                  charges, cooldown and all additional Health or Attribute effects here.
                  Damage is a valid effect by itself and never requires a dummy Use effect.
                </p>

                <div className="mt-4 admin_items_page_div_item_mechanics">
                  <ItemForm
                    action={updateItem}
                    item={selectedItem}
                    categories={categories}
                    subcategories={subcategories}
                    recipes={recipes}
                  />
                </div>

                <div className="mt-5 border-t border-[rgb(var(--sep-colour-59432c))]/35 pt-5 admin_items_page_div_item_mechanics_2">
                  <p className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))] admin_items_page_p_item_mechanics_3">
                    Health / Attribute effects
                  </p>

                  {selectedEffects.length ? (
                    <div className="mt-4 space-y-3 admin_items_page_div_container_10">
                      {selectedEffects.map((effect) => (
                        <EffectForm
                          key={effect.id}
                          itemId={selectedItem.id}
                          effect={effect}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-xs italic text-[rgb(var(--sep-colour-766956))] admin_items_page_p_text_3">
                      No additional Health or Attribute effects configured.
                    </p>
                  )}

                  <details className="mt-4 border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-100c09))] admin_items_page_details_add_health_attribute_effect">
                    <summary className="cursor-pointer list-none px-3 py-3 font-serif text-sm text-[rgb(var(--sep-colour-cab28a))] admin_items_page_summary_add_health_attribute_effect">
                      + Add Health / Attribute effect
                    </summary>
                    <div className="border-t border-[rgb(var(--sep-colour-59432c))]/30 p-3 admin_items_page_div_add_health_attribute_effect">
                      <EffectForm itemId={selectedItem.id} />
                    </div>
                  </details>
                </div>
              </section>

              <ItemEquipmentForm
                itemId={selectedItem.id}
              />

              <div className="mt-6 flex justify-end border-t border-[rgb(var(--sep-colour-59432c))]/35 pt-5 admin_items_page_div_container_11">
                <AdminActionForm
                  action={deleteItem}
                  confirmMessage={`Are you sure you want to permanently delete "${selectedItem.name}"?`}
                >
                  <input className="admin_items_page_input_item_id" type="hidden" name="itemId" value={selectedItem.id} />
                  <button
                    type="submit"
                    className="border border-red-900/55 bg-red-950/20 px-4 py-2 text-[8px] uppercase tracking-[0.14em] text-red-300 admin_items_page_button_delete_item"
                  >
                    Delete Item
                  </button>
                </AdminActionForm>
              </div>
            </div>
          </section>
        ) : null}

'''

items = items[:start] + new_items_list + items[end:]
ITEMS.write_text(items, encoding="utf-8")
print("PATCH admin/items 3-column cards + one editor at bottom")
print("KEEP  ItemForm/EffectForm/equipment/subcategories/actions unchanged")

# ---------------- admin right sidebar jump preservation ----------------

context = ADMIN_CONTEXT.read_text(encoding="utf-8")

context = replace_once(
    context,
    '''    const input =
      document.querySelector<HTMLInputElement>(
        `input[name="giftId"][value="${CSS.escape(
          entry.id,
        )}"]`,
      );

    const details =
      input?.closest<HTMLDetailsElement>(
        "details",
      ) ?? null;

    if (details) {
      details.open = true;

      window.requestAnimationFrame(
        () => {
          details.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        },
      );

      return;
    }

    const anchor =
      document.getElementById(
        `gift-${entry.id}`,
      );

    if (
      anchor instanceof
      HTMLDetailsElement
    ) {
      anchor.open = true;
    }

    anchor?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
''',
    '''    const anchor =
      document.getElementById(
        `gift-card-${entry.id}`,
      );

    anchor?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
''',
    "admin/gifts context jump to Feat card",
)

context = replace_once(
    context,
    '''    } else if (
      mode === "items"
    ) {
      const details =
        document.getElementById(
          `item-${entry.id}`,
        );

      if (
        details instanceof
        HTMLDetailsElement
      ) {
        details.open = true;
      }

      target =
        details instanceof HTMLElement
          ? details
          : null;
''',
    '''    } else if (
      mode === "items"
    ) {
      target =
        document.getElementById(
          `item-card-${entry.id}`,
        );
''',
    "admin/items context jump to Item card",
)

ADMIN_CONTEXT.write_text(context, encoding="utf-8")

# ---------------- /feats progressive rendering only ----------------

catalogue = CATALOGUE.read_text(encoding="utf-8")

catalogue = replace_once(
    catalogue,
    '''import {
  useEffect,
  useMemo,
  useState,
} from "react";
''',
    '''import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
''',
    "feats add useRef",
)

catalogue = replace_once(
    catalogue,
    '''  const [targetMode, setTargetMode] = useState("");

  const ancestries = useMemo(() => {
''',
    '''  const [targetMode, setTargetMode] = useState("");

  const FEATS_BATCH_SIZE = 24;

  const [
    visibleCount,
    setVisibleCount,
  ] = useState(
    FEATS_BATCH_SIZE,
  );

  const loadMoreRef =
    useRef<HTMLDivElement>(null);

  const ancestries = useMemo(() => {
''',
    "feats progressive state",
)

anchor = '''  useEffect(() => {
    const ids = filtered.map((gift) => gift.id);
'''

insert = r'''  const visibleFiltered =
    useMemo(
      () =>
        characterMode
          ? filtered
          : filtered.slice(
              0,
              visibleCount,
            ),
      [
        characterMode,
        filtered,
        visibleCount,
      ],
    );

  useEffect(() => {
    if (characterMode) {
      return;
    }

    setVisibleCount(
      FEATS_BATCH_SIZE,
    );
  }, [
    characterMode,
    search,
    effectMode,
    targetMode,
    type,
    ancestryId,
    orderId,
  ]);

  useEffect(() => {
    if (characterMode) {
      return;
    }

    const target =
      loadMoreRef.current;

    if (
      !target ||
      visibleCount >=
        filtered.length
    ) {
      return;
    }

    const observer =
      new IntersectionObserver(
        (entries) => {
          if (
            entries.some(
              (entry) =>
                entry.isIntersecting,
            )
          ) {
            setVisibleCount(
              (current) =>
                Math.min(
                  current +
                    FEATS_BATCH_SIZE,
                  filtered.length,
                ),
            );
          }
        },
        {
          rootMargin:
            "900px 0px",
        },
      );

    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [
    characterMode,
    filtered.length,
    visibleCount,
  ]);

  useEffect(() => {
    if (characterMode) {
      return;
    }

    function revealAndScroll(
      giftId: string,
    ) {
      const index =
        filtered.findIndex(
          (gift) =>
            gift.id === giftId,
        );

      if (index < 0) {
        return;
      }

      setVisibleCount(
        (current) =>
          Math.max(
            current,
            index + 1,
          ),
      );

      window.requestAnimationFrame(
        () => {
          window.requestAnimationFrame(
            () => {
              document
                .getElementById(
                  `gift-${giftId}`,
                )
                ?.scrollIntoView({
                  behavior:
                    "smooth",
                  block: "start",
                });
            },
          );
        },
      );
    }

    function handleJump(
      event: Event,
    ) {
      const giftId =
        (
          event as CustomEvent<{
            id?: string;
          }>
        ).detail?.id;

      if (giftId) {
        revealAndScroll(
          giftId,
        );
      }
    }

    window.addEventListener(
      "sepulchria:gift-jump",
      handleJump,
    );

    const hash =
      window.location.hash;

    if (
      hash.startsWith(
        "#gift-",
      )
    ) {
      revealAndScroll(
        hash.slice(
          "#gift-".length,
        ),
      );
    }

    return () => {
      window.removeEventListener(
        "sepulchria:gift-jump",
        handleJump,
      );
    };
  }, [
    characterMode,
    filtered,
  ]);

''' + anchor

catalogue = replace_once(
    catalogue,
    anchor,
    insert,
    "feats progressive rendering + deep-link reveal",
)

catalogue = replace_once(
    catalogue,
    '''  {filtered.map((gift) => (
    <FeatCard key={gift.id} gift={gift} />
  ))}
</section>
''',
    '''  {visibleFiltered.map((gift) => (
    <FeatCard key={gift.id} gift={gift} />
  ))}

  {!characterMode &&
  visibleCount < filtered.length ? (
    <div
      ref={loadMoreRef}
      className="col-span-full flex min-h-16 items-center justify-center border border-[rgb(var(--sep-colour-59432c))]/25 bg-[rgb(var(--sep-colour-100c09))] px-4 py-3 text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-756957))]"
    >
      Showing{" "}
      {Math.min(
        visibleCount,
        filtered.length,
      )}{" "}
      of {filtered.length} Feats
    </div>
  ) : null}
</section>
''',
    "feats render progressively",
)

CATALOGUE.write_text(catalogue, encoding="utf-8")

portal = PORTAL_CONTEXT.read_text(encoding="utf-8")

portal = replace_once(
    portal,
    '''    if (!element) {
      return;
    }

    if (
      element instanceof
      HTMLDetailsElement
    ) {
      element.open = true;
    }

    element.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });

    window.history.replaceState(
      null,
      "",
      `#gift-${giftId}`,
    );
''',
    '''    window.history.replaceState(
      null,
      "",
      `#gift-${giftId}`,
    );

    if (!element) {
      window.dispatchEvent(
        new CustomEvent(
          "sepulchria:gift-jump",
          {
            detail: {
              id: giftId,
            },
          },
        ),
      );
      return;
    }

    if (
      element instanceof
      HTMLDetailsElement
    ) {
      element.open = true;
    }

    element.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
''',
    "feats context jump works with unrendered cards",
)

PORTAL_CONTEXT.write_text(portal, encoding="utf-8")

print()
print("DONE")
print("Touched only:")
print("  app/(portal)/admin/gifts/page.tsx")
print("  app/(portal)/admin/items/page.tsx")
print("  components/gifts/gifts-catalogue.tsx")
print("  components/portal/admin-context-panel.tsx")
print("  components/portal/portal-context-panel.tsx")
print("No database changes.")
print("Run: npm run build")
