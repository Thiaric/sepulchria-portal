from pathlib import Path
import subprocess
import sys

EXPECTED_HEAD = "b9b3676"

def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly 1 match, found {count}")
    return text.replace(old, new, 1)

def main():
    head = subprocess.check_output(
        ["git", "rev-parse", "--short=7", "HEAD"],
        text=True,
    ).strip()

    if head != EXPECTED_HEAD:
        raise RuntimeError(
            f"This patch was built for {EXPECTED_HEAD}, but current HEAD is {head}. "
            "No files were changed."
        )

    browser_path = Path(
        "components/characters/character-inventory-browser.tsx"
    )
    css_path = Path(
        "components/sepulchria/sep-ui-unified.css"
    )

    browser = browser_path.read_text(encoding="utf-8")
    css = css_path.read_text(encoding="utf-8")

    browser = replace_once(
        browser,
        '''  className={[((`group/slot relative border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-120d09))]/95 p-2.5 shadow-[0_8px_24px_rgba(var(--sep-rgb-0-0-0),0.18)] ${
    open ? "z-[400]" : "z-0"
  } hover:z-[350] focus-within:z-[350]`)), "components_characters_character_inventory_browser_div_container_26"].filter(Boolean).join(" ")}
>''',
        '''  className={[((`group/slot relative border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-120d09))]/95 p-2.5 shadow-[0_8px_24px_rgba(var(--sep-rgb-0-0-0),0.18)] ${
    open ? "z-[800]" : "z-0"
  } hover:z-[700] focus-within:z-[700]`)), "components_characters_character_inventory_browser_div_container_26"].filter(Boolean).join(" ")}
>''',
        "raise active equipment slot above sibling slots",
    )

    old_block = '''      {sorted.length ? (
        <div className="mt-2 space-y-2 components_characters_character_inventory_browser_div_container_27">
         {sorted.map((row) => (
  <div
    key={`${row.record_kind}-${row.record_id}`}
    className="group/equipped relative flex items-center gap-2 border-t border-[rgb(var(--sep-colour-59432c))]/25 pt-2 first:border-t-0 first:pt-0 components_characters_character_inventory_browser_div_container_28"
  >
    <button
  type="button"
  onClick={() =>
    setMobileItem(row)
  }
  className="flex min-w-0 flex-1 cursor-help items-center gap-2 text-left outline-none md:cursor-help components_characters_character_inventory_browser_button_action"
>
      <ItemThumbnail
        row={row}
        size="small"
      />

      <div className="min-w-0 flex-1 components_characters_character_inventory_browser_div_container_29">
        <p className="truncate font-serif text-[12px] text-[rgb(var(--sep-colour-d8c095))] components_characters_character_inventory_browser_p_text_28">
          {row.name}
        </p>

        <p className="mt-0.5 text-[6px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-756957))] components_characters_character_inventory_browser_p_text_29">
          {qualityLabel(
            row.equipped_layer ??
              "equipped",
          )}
        </p>
      </div>

      <div
        data-sep-equipment-popup="true"
        className={[(([
          "pointer-events-none absolute z-[500] hidden w-[420px] max-w-[calc(100vw-32px)]",
          "hidden md:group-hover/equipped:block md:group-focus-within/equipped:block",
          opensUp
            ? "bottom-full mb-2"
            : "top-full mt-2",
          isRightSide
            ? "right-0"
            : "left-0",
        ].join(" "))), "components_characters_character_inventory_browser_div_container_30"].filter(Boolean).join(" ")}
      >
        <div className="pointer-events-auto shadow-[0_20px_55px_rgba(var(--sep-rgb-0-0-0),0.6)] components_characters_character_inventory_browser_div_container_31">
          <ItemCard
            row={row}
            containers={[]}
            characterName=""
            own={false}
            useTargets={[]}
          />
        </div>
      </div>
    </button>

    {own ? (
      <form className="components_characters_character_inventory_browser_form_unequip_inventory_item_2" action={unequipInventoryItem}>
        <input className="components_characters_character_inventory_browser_input_record_kind_5"
          type="hidden"
          name="recordKind"
          value={row.record_kind}
        />

        <input className="components_characters_character_inventory_browser_input_record_id_5"
          type="hidden"
          name="recordId"
          value={row.record_id}
        />

        <button
          type="submit"
          title={`Unequip ${row.name}`}
          className="px-1 text-[13px] text-[rgb(var(--sep-colour-806d55))] transition hover:text-[rgb(var(--sep-colour-d7b77f))] components_characters_character_inventory_browser_button_action_2"
        >
          ×
        </button>
      </form>
    ) : null}
  </div>
))}
        </div>
      ) : own ? (
        <div className="relative mt-2 components_characters_character_inventory_browser_div_container_32">
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="w-full border border-dashed border-[rgb(var(--sep-colour-6d5336))]/55 bg-[rgb(var(--sep-colour-17110d))] px-3 py-3 text-left transition hover:border-[rgb(var(--sep-colour-9b7548))] hover:bg-[rgb(var(--sep-colour-1c140e))] components_characters_character_inventory_browser_button_action_3"
          >
            <span className="block text-[9px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-947c5b))] components_characters_character_inventory_browser_span_text_12">
              Empty
            </span>
            <span className="mt-1 block text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-665b4c))] components_characters_character_inventory_browser_span_text_13">
              Click to equip
            </span>
          </button>

          {open ? (
  <div
  className={[((`absolute z-[200] w-[280px] border border-[rgb(var(--sep-colour-60482e))]/40 bg-[rgb(var(--sep-colour-0e0a08))] p-2 shadow-2xl ${
    opensUp
      ? "bottom-full mb-2"
      : "top-full mt-2"
  } ${
    isRightSide
      ? "right-0"
      : "left-0"
  }`)), "components_characters_character_inventory_browser_div_container_33"].filter(Boolean).join(" ")}
>
              {available.length ? (
                <>
                  <select
                    value={selectedId}
                    onChange={(event) => setSelectedId(event.target.value)}
                    className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-2 py-2 text-[9px] text-[rgb(var(--sep-colour-cdb894))] outline-none focus:border-[rgb(var(--sep-colour-987344))] components_characters_character_inventory_browser_select_select_3"
                  >
                    <option className="components_characters_character_inventory_browser_option_option_4" value="">Choose Item...</option>
                    {available.map((row) => (
                      <option className="components_characters_character_inventory_browser_option_option_5"
                        key={`${row.record_kind}:${row.record_id}`}
                        value={`${row.record_kind}:${row.record_id}`}
                      >
                        {row.name}
                        {!row.item_active ? " (Inactive)" : ""}
                        {row.quantity > 1 ? ` ×${row.quantity}` : ""}
                      </option>
                    ))}
                  </select>

                  {selected ? <EquipmentCandidate row={selected} /> : null}
                </>
              ) : (
                <p className="text-[8px] italic leading-4 text-[rgb(var(--sep-colour-665b4c))] components_characters_character_inventory_browser_p_text_30">
                  No available Items for this slot.
                </p>
              )}
            </div>
          ) : null}
        </div>
            ) : (
        <p className="mt-2 text-[9px] italic text-[rgb(var(--sep-colour-665b4c))] components_characters_character_inventory_browser_p_text_31">
          Empty
        </p>
      )}'''

    new_block = '''      {sorted.length ? (
        <div className="mt-2 space-y-2 components_characters_character_inventory_browser_div_container_27">
          {sorted.map((row) => (
            <div
              key={`${row.record_kind}-${row.record_id}`}
              className="group/equipped relative flex items-center gap-2 border-t border-[rgb(var(--sep-colour-59432c))]/25 pt-2 first:border-t-0 first:pt-0 components_characters_character_inventory_browser_div_container_28"
            >
              <button
                type="button"
                onClick={() =>
                  setMobileItem(row)
                }
                className="flex min-w-0 flex-1 cursor-help items-center gap-2 text-left outline-none md:cursor-help components_characters_character_inventory_browser_button_action"
              >
                <ItemThumbnail
                  row={row}
                  size="small"
                />

                <div className="min-w-0 flex-1 components_characters_character_inventory_browser_div_container_29">
                  <p className="truncate font-serif text-[12px] text-[rgb(var(--sep-colour-d8c095))] components_characters_character_inventory_browser_p_text_28">
                    {row.name}
                  </p>

                  <p className="mt-0.5 text-[6px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-756957))] components_characters_character_inventory_browser_p_text_29">
                    {qualityLabel(
                      row.equipped_layer ??
                        "equipped",
                    )}
                  </p>
                </div>

                <div
                  data-sep-equipment-popup="true"
                  className={[(([
                    "pointer-events-none absolute z-[900] hidden w-[420px] max-w-[calc(100vw-32px)]",
                    "hidden md:group-hover/equipped:block md:group-focus-within/equipped:block",
                    opensUp
                      ? "bottom-full mb-2"
                      : "top-full mt-2",
                    isRightSide
                      ? "right-0"
                      : "left-0",
                  ].join(" "))), "components_characters_character_inventory_browser_div_container_30"].filter(Boolean).join(" ")}
                >
                  <div className="pointer-events-auto shadow-[0_20px_55px_rgba(var(--sep-rgb-0-0-0),0.6)] components_characters_character_inventory_browser_div_container_31">
                    <ItemCard
                      row={row}
                      containers={[]}
                      characterName=""
                      own={false}
                      useTargets={[]}
                    />
                  </div>
                </div>
              </button>

              {own ? (
                <form
                  className="components_characters_character_inventory_browser_form_unequip_inventory_item_2"
                  action={unequipInventoryItem}
                >
                  <input
                    className="components_characters_character_inventory_browser_input_record_kind_5"
                    type="hidden"
                    name="recordKind"
                    value={row.record_kind}
                  />

                  <input
                    className="components_characters_character_inventory_browser_input_record_id_5"
                    type="hidden"
                    name="recordId"
                    value={row.record_id}
                  />

                  <button
                    type="submit"
                    title={`Unequip ${row.name}`}
                    className="px-1 text-[13px] text-[rgb(var(--sep-colour-806d55))] transition hover:text-[rgb(var(--sep-colour-d7b77f))] components_characters_character_inventory_browser_button_action_2"
                  >
                    ×
                  </button>
                </form>
              ) : null}
            </div>
          ))}
        </div>
      ) : !own ? (
        <p className="mt-2 text-[9px] italic text-[rgb(var(--sep-colour-665b4c))] components_characters_character_inventory_browser_p_text_31">
          Empty
        </p>
      ) : null}

      {own &&
      (
        !sorted.length ||
        available.length > 0
      ) ? (
        <div className="relative mt-2 components_characters_character_inventory_browser_div_container_32">
          <button
            type="button"
            onClick={() =>
              setOpen(
                (value) =>
                  !value,
              )
            }
            className="w-full border border-dashed border-[rgb(var(--sep-colour-6d5336))]/55 bg-[rgb(var(--sep-colour-17110d))] px-3 py-3 text-left transition hover:border-[rgb(var(--sep-colour-9b7548))] hover:bg-[rgb(var(--sep-colour-1c140e))] components_characters_character_inventory_browser_button_action_3"
          >
            <span className="block text-[9px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-947c5b))] components_characters_character_inventory_browser_span_text_12">
              {sorted.length
                ? "Equip another"
                : "Empty"}
            </span>

            <span className="mt-1 block text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-665b4c))] components_characters_character_inventory_browser_span_text_13">
              Click to equip
            </span>
          </button>

          {open ? (
            <div
              className={[((`absolute z-[900] w-[280px] border border-[rgb(var(--sep-colour-60482e))]/40 bg-[rgb(var(--sep-colour-0e0a08))] p-2 shadow-2xl ${
                opensUp
                  ? "bottom-full mb-2"
                  : "top-full mt-2"
              } ${
                isRightSide
                  ? "right-0"
                  : "left-0"
              }`)), "components_characters_character_inventory_browser_div_container_33"].filter(Boolean).join(" ")}
            >
              {available.length ? (
                <>
                  <select
                    value={selectedId}
                    onChange={(event) =>
                      setSelectedId(
                        event.target.value,
                      )
                    }
                    className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-2 py-2 text-[9px] text-[rgb(var(--sep-colour-cdb894))] outline-none focus:border-[rgb(var(--sep-colour-987344))] components_characters_character_inventory_browser_select_select_3"
                  >
                    <option
                      className="components_characters_character_inventory_browser_option_option_4"
                      value=""
                    >
                      Choose Item...
                    </option>

                    {available.map(
                      (row) => (
                        <option
                          className="components_characters_character_inventory_browser_option_option_5"
                          key={`${row.record_kind}:${row.record_id}`}
                          value={`${row.record_kind}:${row.record_id}`}
                        >
                          {row.name}
                          {!row.item_active
                            ? " (Inactive)"
                            : ""}
                          {row.quantity > 1
                            ? ` ×${row.quantity}`
                            : ""}
                        </option>
                      ),
                    )}
                  </select>

                  {selected ? (
                    <EquipmentCandidate
                      row={selected}
                    />
                  ) : null}
                </>
              ) : (
                <p className="text-[8px] italic leading-4 text-[rgb(var(--sep-colour-665b4c))] components_characters_character_inventory_browser_p_text_30">
                  No available Items for this slot.
                </p>
              )}
            </div>
          ) : null}
        </div>
      ) : null}'''

    browser = replace_once(
        browser,
        old_block,
        new_block,
        "multi-layer slot picker",
    )

    css = replace_once(
        css,
        '''body.portal-skin-scope
  [data-sep-equipment-popup="true"]
  [data-sep-interaction-kind="card"] {
  background-color:
    rgb(var(--sep-colour-120f0d) / 0.97) !important;
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
}''',
        '''body.portal-skin-scope
  [data-sep-equipment-popup="true"]
  [data-sep-interactive-surface="card"] {
  background-color:
    rgb(var(--sep-colour-120f0d) / 0.985) !important;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}''',
        "opaque equipped-item popup selector",
    )

    if '"Equip another"' not in browser:
        raise RuntimeError("Verification failed: Equip another control.")
    if 'z-[900]' not in browser:
        raise RuntimeError("Verification failed: popup z-index.")
    if 'open ? "z-[800]"' not in browser:
        raise RuntimeError("Verification failed: active slot z-index.")
    if '[data-sep-interactive-surface="card"]' not in css:
        raise RuntimeError("Verification failed: correct popup card selector.")
    old_popup_rule = """body.portal-skin-scope
  [data-sep-equipment-popup="true"]
  [data-sep-interaction-kind="card"] {"""
    if old_popup_rule in css:
        raise RuntimeError(
            "Verification failed: old equipment-popup selector still present."
        )

    browser_path.write_text(browser, encoding="utf-8")
    css_path.write_text(css, encoding="utf-8")

    print("Applied equipment UI fixes for b9b3676.")
    print(" - Hover/details popups stack above neighbouring equipment slots.")
    print(" - Equipped-item popup backgrounds are opaque/readable.")
    print(" - Occupied slots retain an 'Equip another' control when more items are available.")
    print(" - Empty-slot behaviour remains intact.")
    print()
    print("Next: npm run build")

if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"PATCH FAILED: {exc}", file=sys.stderr)
        sys.exit(1)
