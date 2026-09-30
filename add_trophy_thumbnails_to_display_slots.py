from pathlib import Path
import sys

server_path = Path("components/characters/display-trophy-selector.tsx")
client_path = Path("components/characters/trophy-slot-select.tsx")

if not server_path.exists():
    print("ERROR: Missing components/characters/display-trophy-selector.tsx")
    print("Run this from the sepulchria-portal repository root.")
    sys.exit(1)

src = server_path.read_text(encoding="utf-8")
original = src

changes = [
    (
        'import { PendingSubmitButton } from "@/components/forms/pending-submit-button";\n',
        'import { PendingSubmitButton } from "@/components/forms/pending-submit-button";\n'
        'import { TrophySlotSelect } from "@/components/characters/trophy-slot-select";\n',
        "import"
    ),
    (
        '''type TrophyDefinition = {
  id: string;
  name: string;
  category: string;
  sort_order: number;
};
''',
        '''type TrophyDefinition = {
  id: string;
  name: string;
  category: string;
  sort_order: number;
  icon_url: string | null;
};
''',
        "type"
    ),
    (
        '.select("id, name, category, sort_order")',
        '.select("id, name, category, sort_order, icon_url")',
        "select"
    ),
]

for old, new, label in changes:
    count = src.count(old)
    if count != 1:
        print(f"ERROR: {label} anchor expected once, found {count}.")
        print("No files were changed.")
        sys.exit(1)
    src = src.replace(old, new, 1)

old_control = '''                  <select
                    name={`display_trophy_${slot}`}
                    defaultValue={
                      selectedBySlot.get(slot) ?? ""
                    }
                    className="mt-2 w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0d0907))] px-3 py-2.5 text-[11px] text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))] components_characters_display_trophy_selector_select_select"
                  >
                    <option className="components_characters_display_trophy_selector_option_option" value="">None</option>

                    {[...trophies]
                      .sort((a, b) =>
                        a.name.localeCompare(
                          b.name,
                          undefined,
                          { sensitivity: "base", numeric: true },
                        ),
                      )
                      .map((trophy) => (
                      <option className="components_characters_display_trophy_selector_option_option_2"
                        key={trophy.id}
                        value={trophy.id}
                      >
                        {trophy.category} — {trophy.name}
                      </option>
                    ))}
                  </select>
'''

new_control = '''                  <TrophySlotSelect
                    name={`display_trophy_${slot}`}
                    defaultValue={
                      selectedBySlot.get(slot) ?? ""
                    }
                    trophies={[...trophies].sort((a, b) =>
                      a.name.localeCompare(
                        b.name,
                        undefined,
                        {
                          sensitivity: "base",
                          numeric: true,
                        },
                      ),
                    )}
                  />
'''

if src.count(old_control) != 1:
    print(f"ERROR: native trophy select block expected once, found {src.count(old_control)}.")
    print("No files were changed.")
    sys.exit(1)

src = src.replace(old_control, new_control, 1)

client_content = '''"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

type TrophyOption = {
  id: string;
  name: string;
  category: string;
  icon_url: string | null;
};

export function TrophySlotSelect({
  name,
  defaultValue,
  trophies,
}: {
  name: string;
  defaultValue: string;
  trophies: TrophyOption[];
}) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const selected =
    trophies.find((trophy) => trophy.id === value) ?? null;

  useEffect(() => {
    if (!open) return;

    function closeFromOutside(event: PointerEvent) {
      if (
        rootRef.current &&
        !rootRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    function closeFromEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", closeFromOutside);
    window.addEventListener("keydown", closeFromEscape);

    return () => {
      document.removeEventListener("pointerdown", closeFromOutside);
      window.removeEventListener("keydown", closeFromEscape);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative mt-2">
      <input type="hidden" name={name} value={value} />

      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-[42px] w-full items-center gap-2 border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0d0907))] px-2.5 py-2 text-left text-[11px] text-[rgb(var(--sep-colour-d7c4a5))] outline-none transition hover:border-[rgb(var(--sep-colour-80613c))] focus:border-[rgb(var(--sep-colour-a17a49))]"
      >
        <TrophyThumbnail trophy={selected} />

        <span className="min-w-0 flex-1 truncate">
          {selected
            ? `${selected.category} — ${selected.name}`
            : "None"}
        </span>

        <span
          aria-hidden="true"
          className="shrink-0 text-[9px] text-[rgb(var(--sep-colour-806b50))]"
        >
          {open ? "▲" : "▼"}
        </span>
      </button>

      {open ? (
        <div
          role="listbox"
          className="absolute left-0 top-full z-[120] mt-1 max-h-72 min-w-full overflow-y-auto border border-[rgb(var(--sep-colour-765937))]/70 bg-[rgb(var(--sep-colour-0d0907))] shadow-[0_16px_40px_rgba(0,0,0,.65)]"
        >
          <button
            type="button"
            role="option"
            aria-selected={value === ""}
            onClick={() => {
              setValue("");
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 border-b border-[rgb(var(--sep-colour-59432c))]/35 px-2.5 py-2 text-left text-[11px] text-[rgb(var(--sep-colour-a99b89))] transition hover:bg-[rgb(var(--sep-colour-21170f))]"
          >
            <span className="h-7 w-7 shrink-0 border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-15100d))]" />
            <span>None</span>
          </button>

          {trophies.map((trophy) => (
            <button
              key={trophy.id}
              type="button"
              role="option"
              aria-selected={trophy.id === value}
              onClick={() => {
                setValue(trophy.id);
                setOpen(false);
              }}
              className={[
                "flex w-full items-center gap-2 px-2.5 py-2 text-left text-[11px] transition",
                trophy.id === value
                  ? "bg-[rgb(var(--sep-colour-2b1d12))] text-[rgb(var(--sep-colour-efd6a8))]"
                  : "text-[rgb(var(--sep-colour-d7c4a5))] hover:bg-[rgb(var(--sep-colour-21170f))]",
              ].join(" ")}
            >
              <TrophyThumbnail trophy={trophy} />

              <span className="min-w-0 flex-1">
                <span className="block truncate font-serif text-[12px]">
                  {trophy.name}
                </span>
                <span className="block truncate text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-806b50))]">
                  {trophy.category}
                </span>
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function TrophyThumbnail({
  trophy,
}: {
  trophy: TrophyOption | null;
}) {
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-15100d))]">
      {trophy?.icon_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={trophy.icon_url}
          alt=""
          className="h-full w-full object-contain p-0.5"
        />
      ) : (
        <span className="text-[9px] text-[rgb(var(--sep-colour-725a3d))]">
          ✦
        </span>
      )}
    </span>
  );
}
'''

if client_path.exists():
    print(f"ERROR: {client_path} already exists. No files were changed.")
    sys.exit(1)

backup = server_path.with_suffix(
    server_path.suffix + ".before-trophy-thumbnail-selects"
)
if not backup.exists():
    backup.write_text(original, encoding="utf-8")

server_path.write_text(src, encoding="utf-8")
client_path.write_text(client_content, encoding="utf-8")

print("Display Trophy dropdowns upgraded with thumbnails.")
print("Changed: components/characters/display-trophy-selector.tsx")
print("Created: components/characters/trophy-slot-select.tsx")
print("Existing save field names and action are unchanged.")
print("Run: npm run build")
