from pathlib import Path

ROOT = Path.cwd()

def read(rel):
    p = ROOT / rel
    if not p.exists():
        raise SystemExit(f"Missing expected file: {rel}")
    return p.read_text(encoding="utf-8")

def write(rel, text):
    (ROOT / rel).write_text(text, encoding="utf-8")
    print(f"Updated {rel}")

def replace_once(text, old, new, rel):
    if old not in text:
        raise SystemExit(
            f"Patch stopped: expected block not found in {rel}. "
            "The repository may have changed."
        )
    return text.replace(old, new, 1)

# ---------------------------------------------------------------------------
# 1) /gifts catalogue publishes its CURRENT filtered Feat IDs whenever any
#    page filter changes.
# ---------------------------------------------------------------------------
rel = "components/gifts/gifts-catalogue.tsx"
t = read(rel)

t = replace_once(
    t,
    '''import { useMemo, useState } from "react";
''',
    '''import {
  useEffect,
  useMemo,
  useState,
} from "react";
''',
    rel,
)

anchor = '''  function reset() {
    setType("all");
    setAncestryId("");
    setOrderId("");
    setNameFilter("");
    setDescriptionFilter("");
  }

  return (
'''

replacement = '''  useEffect(() => {
    const visibleGiftIds =
      filtered.map((gift) => gift.id);

    /*
     * The Feats catalogue and the portal context sidebar are separate
     * client components. Publish the catalogue's actual filtered result so
     * the sidebar always mirrors every filter on the page: type, Ancestry,
     * Order, name and description.
     */
    sessionStorage.setItem(
      "sepulchria:gifts-visible-ids",
      JSON.stringify(visibleGiftIds),
    );

    window.dispatchEvent(
      new CustomEvent(
        "sepulchria:gifts-filter-change",
        {
          detail: {
            ids: visibleGiftIds,
          },
        },
      ),
    );
  }, [filtered]);

  function reset() {
    setType("all");
    setAncestryId("");
    setOrderId("");
    setNameFilter("");
    setDescriptionFilter("");
  }

  return (
'''

t = replace_once(t, anchor, replacement, rel)
write(rel, t)

# ---------------------------------------------------------------------------
# 2) Public /gifts right sidebar listens to the catalogue filter and limits
#    its jump list to the same Feats. Its own Search remains an additional
#    name filter on top of the page filters.
# ---------------------------------------------------------------------------
rel = "components/portal/portal-context-panel.tsx"
t = read(rel)

state_anchor = '''  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
'''

state_replacement = '''  const [error, setError] =
    useState<string | null>(null);

  const [
    visibleGiftIds,
    setVisibleGiftIds,
  ] = useState<Set<string> | null>(
    null,
  );

  useEffect(() => {
    function applyVisibleIds(
      ids: unknown,
    ) {
      if (!Array.isArray(ids)) {
        return;
      }

      setVisibleGiftIds(
        new Set(
          ids.map((id) =>
            String(id),
          ),
        ),
      );
    }

    const stored =
      sessionStorage.getItem(
        "sepulchria:gifts-visible-ids",
      );

    if (stored) {
      try {
        applyVisibleIds(
          JSON.parse(stored),
        );
      } catch {
        sessionStorage.removeItem(
          "sepulchria:gifts-visible-ids",
        );
      }
    }

    function handleFilterChange(
      event: Event,
    ) {
      const customEvent =
        event as CustomEvent<{
          ids?: string[];
        }>;

      applyVisibleIds(
        customEvent.detail?.ids,
      );
    }

    window.addEventListener(
      "sepulchria:gifts-filter-change",
      handleFilterChange,
    );

    return () => {
      window.removeEventListener(
        "sepulchria:gifts-filter-change",
        handleFilterChange,
      );
    };
  }, []);

  useEffect(() => {
'''

# Only replace inside PublicGiftsContext, not later AdminGiftsContext.
public_start = t.find("function PublicGiftsContext()")
admin_start = t.find("type AdminGiftContextEntry")
if public_start == -1 or admin_start == -1:
    raise SystemExit("Patch stopped: PublicGiftsContext boundaries not found.")

public_block = t[public_start:admin_start]
if state_anchor not in public_block:
    raise SystemExit("Patch stopped: PublicGiftsContext state block not found.")
public_block = public_block.replace(state_anchor, state_replacement, 1)
t = t[:public_start] + public_block + t[admin_start:]

old_filter = '''  const filteredEntries =
    entries.filter(
      (entry) =>
        !query ||
        entry.name
          .toLowerCase()
          .includes(query),
    );
'''

new_filter = '''  const pageFilteredEntries =
    visibleGiftIds === null
      ? entries
      : entries.filter((entry) =>
          visibleGiftIds.has(
            entry.id,
          ),
        );

  const filteredEntries =
    pageFilteredEntries.filter(
      (entry) =>
        !query ||
        entry.name
          .toLowerCase()
          .includes(query),
    );
'''

public_start = t.find("function PublicGiftsContext()")
admin_start = t.find("type AdminGiftContextEntry")
public_block = t[public_start:admin_start]

if old_filter not in public_block:
    raise SystemExit("Patch stopped: PublicGiftsContext filter block not found.")

public_block = public_block.replace(old_filter, new_filter, 1)
t = t[:public_start] + public_block + t[admin_start:]

old_count = '''          {filteredEntries.length}
          {query
            ? ` / ${entries.length}`
            : ""}
'''

new_count = '''          {filteredEntries.length}
          {(query ||
            pageFilteredEntries.length !==
              entries.length)
            ? ` / ${entries.length}`
            : ""}
'''

public_start = t.find("function PublicGiftsContext()")
admin_start = t.find("type AdminGiftContextEntry")
public_block = t[public_start:admin_start]

if old_count not in public_block:
    raise SystemExit("Patch stopped: PublicGiftsContext count block not found.")

public_block = public_block.replace(old_count, new_count, 1)
t = t[:public_start] + public_block + t[admin_start:]

write(rel, t)

print()
print("Public Feats sidebar filter synchronisation applied.")
print("The right sidebar now mirrors ALL active /gifts page filters live.")
print("Run: npm run build")
