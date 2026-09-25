from pathlib import Path
import subprocess
import sys

EXPECTED_HEAD = 'ba52054'

def replace_once(text, old, new, label):
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

    browser_path = Path("components/characters/character-inventory-browser.tsx")
    css_path = Path("components/sepulchria/sep-ui-unified.css")

    browser = browser_path.read_text(encoding="utf-8")
    css = css_path.read_text(encoding="utf-8")

    browser = replace_once(
        browser,
        'import {\n  useEffect,\n  useMemo,\n  useState,\n  useTransition,\n} from "react";',
        'import {\n  useEffect,\n  useMemo,\n  useRef,\n  useState,\n  useTransition,\n} from "react";',
        'add useRef import',
    )

    browser = replace_once(
        browser,
        '  const [open, setOpen] = useState(false);\n  const [selectedId, setSelectedId] = useState("");\n\n  const [mobileItem, setMobileItem] =\n  useState<InventoryBrowserRow | null>(null);',
        '  const [open, setOpen] = useState(false);\n  const [selectedId, setSelectedId] = useState("");\n  const pickerRef =\n    useRef<HTMLDivElement | null>(null);\n\n  const [mobileItem, setMobileItem] =\n  useState<InventoryBrowserRow | null>(null);\n\n  useEffect(() => {\n    if (!open) return;\n\n    const closePicker = () => {\n      setOpen(false);\n      setSelectedId("");\n    };\n\n    const onPointerDown = (\n      event: PointerEvent,\n    ) => {\n      const target =\n        event.target as Node | null;\n\n      if (\n        target &&\n        !pickerRef.current?.contains(\n          target,\n        )\n      ) {\n        closePicker();\n      }\n    };\n\n    const onKeyDown = (\n      event: KeyboardEvent,\n    ) => {\n      if (event.key === "Escape") {\n        closePicker();\n      }\n    };\n\n    document.addEventListener(\n      "pointerdown",\n      onPointerDown,\n    );\n    document.addEventListener(\n      "keydown",\n      onKeyDown,\n    );\n\n    return () => {\n      document.removeEventListener(\n        "pointerdown",\n        onPointerDown,\n      );\n      document.removeEventListener(\n        "keydown",\n        onKeyDown,\n      );\n    };\n  }, [open]);',
        'slot picker click-away and Escape close',
    )

    browser = replace_once(
        browser,
        '                  <div className="pointer-events-auto shadow-[0_20px_55px_rgba(var(--sep-rgb-0-0-0),0.6)] components_characters_character_inventory_browser_div_container_31">\n                    <ItemCard',
        '                  <div\n                    className="pointer-events-auto isolate bg-[rgb(var(--sep-colour-0e0a08))] shadow-[0_20px_55px_rgba(var(--sep-rgb-0-0-0),0.6)] components_characters_character_inventory_browser_div_container_31"\n                    style={{\n                      backgroundColor:\n                        "rgb(var(--sep-colour-0e0a08))",\n                    }}\n                  >\n                    <ItemCard',
        'solid equipped-item hover detail wrapper',
    )

    browser = replace_once(
        browser,
        '        <div className="relative mt-2 components_characters_character_inventory_browser_div_container_32">',
        '        <div\n          ref={pickerRef}\n          className="relative mt-2 box-border w-full max-w-full components_characters_character_inventory_browser_div_container_32"\n        >',
        'picker wrapper ref and bounds',
    )

    browser = replace_once(
        browser,
        '            className="w-full border border-dashed border-[rgb(var(--sep-colour-6d5336))]/55 bg-[rgb(var(--sep-colour-17110d))] px-3 py-3 text-left transition hover:border-[rgb(var(--sep-colour-9b7548))] hover:bg-[rgb(var(--sep-colour-1c140e))] components_characters_character_inventory_browser_button_action_3"',
        '            className="box-border block w-full max-w-full border border-dashed border-[rgb(var(--sep-colour-6d5336))]/55 bg-[rgb(var(--sep-colour-17110d))] px-3 py-3 text-left transition hover:border-[rgb(var(--sep-colour-9b7548))] hover:bg-[rgb(var(--sep-colour-1c140e))] components_characters_character_inventory_browser_button_action_3"',
        'keep Equip another button inside border',
    )

    browser = replace_once(
        browser,
        '            <div\n              className={[((`absolute z-[900] w-[280px] border border-[rgb(var(--sep-colour-60482e))]/40 bg-[rgb(var(--sep-colour-0e0a08))] p-2 shadow-2xl ${',
        '            <div\n              data-sep-equipment-picker="true"\n              style={{\n                backgroundColor:\n                  "rgb(var(--sep-colour-0e0a08))",\n              }}\n              className={[((`absolute z-[1000] w-[280px] max-w-[calc(100vw-32px)] isolate border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0e0a08))] p-2 shadow-[0_20px_55px_rgba(var(--sep-rgb-0-0-0),0.75)] ${',
        'opaque equipment chooser panel',
    )

    css = replace_once(
        css,
        'body.portal-skin-scope\n  [data-sep-equipment-popup="true"]\n  [data-sep-interactive-surface="card"] {\n  background-color:\n    rgb(var(--sep-colour-120f0d) / 0.985) !important;\n  backdrop-filter: blur(4px);\n  -webkit-backdrop-filter: blur(4px);\n}',
        '[data-sep-equipment-popup="true"]\n  [data-sep-interactive-surface="card"],\n[data-sep-equipment-popup="true"]\n  .components_characters_character_inventory_browser_div_container_31 {\n  background:\n    rgb(var(--sep-colour-0e0a08)) !important;\n  background-color:\n    rgb(var(--sep-colour-0e0a08)) !important;\n  opacity: 1 !important;\n  backdrop-filter: none !important;\n  -webkit-backdrop-filter: none !important;\n}\n\n[data-sep-equipment-picker="true"] {\n  background:\n    rgb(var(--sep-colour-0e0a08)) !important;\n  background-color:\n    rgb(var(--sep-colour-0e0a08)) !important;\n  opacity: 1 !important;\n}',
        "solid equipment popup and picker CSS",
    )

    required_browser = [
        "useRef,",
        "pickerRef",
        'event.key === "Escape"',
        '"pointerdown"',
        'data-sep-equipment-picker="true"',
        "z-[1000]",
        "box-border block w-full max-w-full",
    ]

    for token in required_browser:
        if token not in browser:
            raise RuntimeError(
                f"Verification failed: missing {token!r}. No files were changed."
            )

    required_css = [
        '[data-sep-equipment-picker="true"]',
        '[data-sep-interactive-surface="card"]',
    ]

    for token in required_css:
        if token not in css:
            raise RuntimeError(
                f"Verification failed: missing CSS {token!r}. No files were changed."
            )

    browser_path.write_text(browser, encoding="utf-8")
    css_path.write_text(css, encoding="utf-8")

    print("Applied equipment popup/picker fixes for ba52054.")
    print(" - Equipped-item hover details are fully opaque.")
    print(" - Choose Item / No available Items closes on outside click.")
    print(" - Picker closes on Escape.")
    print(" - Equip another stays within the slot card border.")
    print(" - Picker stays above neighbouring slots.")
    print()
    print("Next: npm run build")

if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"PATCH FAILED: {exc}", file=sys.stderr)
        sys.exit(1)
