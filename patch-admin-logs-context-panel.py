
from pathlib import Path
import shutil

ROOT = Path.cwd()

def read(rel):
    p = ROOT / rel
    if not p.exists():
        raise SystemExit(f"ERROR: missing file: {rel}")
    return p.read_text(encoding="utf-8")

def write(rel, text):
    p = ROOT / rel
    backup = p.with_suffix(p.suffix + ".before-logs-context.bak")
    if not backup.exists():
        shutil.copy2(p, backup)
    p.write_text(text, encoding="utf-8")
    print(f"Updated: {rel}")

def replace_once(text, old, new, rel, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(
            f"PRECHECK FAILED in {rel}: {label} expected once, found {count}."
        )
    return text.replace(old, new, 1)

# 1) Stable DOM markers in moderation panel roots.
rel = "app/(portal)/admin/communication-logs/page.tsx"
text = read(rel)

text = replace_once(
    text,
    '''      <div className="mt-3 border border-[rgb(var(--sep-colour-8d5b45))]/65 bg-[rgb(var(--sep-colour-241310))] px-3 py-2">''',
    '''      <div
        data-communication-log-marker
        data-source-type={sourceType}
        data-source-id={sourceId}
        className="mt-3 border border-[rgb(var(--sep-colour-8d5b45))]/65 bg-[rgb(var(--sep-colour-241310))] px-3 py-2"
      >''',
    rel,
    "moderated marker",
)

text = replace_once(
    text,
    '''    <details className="mt-3 border border-[rgb(var(--sep-colour-70483f))]/55 bg-[rgb(var(--sep-colour-1d1110))] px-3 py-2">''',
    '''    <details
      data-communication-log-marker
      data-source-type={sourceType}
      data-source-id={sourceId}
      className="mt-3 border border-[rgb(var(--sep-colour-70483f))]/55 bg-[rgb(var(--sep-colour-1d1110))] px-3 py-2"
    >''',
    rel,
    "unmoderated marker",
)

write(rel, text)

# 2) Dedicated context panel.
rel = "components/portal/admin-communication-logs-context.tsx"
p = ROOT / rel
if p.exists():
    raise SystemExit(f"PRECHECK FAILED: {rel} already exists.")

content = '''"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  usePathname,
  useSearchParams,
} from "next/navigation";

type LogEntry = {
  key: string;
  sourceType: string;
  sourceId: string;
  summary: string;
  searchText: string;
  element: HTMLElement;
};

function compactText(value: string): string {
  return value.replace(/\\\\s+/g, " ").trim();
}

function labelForView(view: string): string {
  if (view === "chat") return "Location Chats";
  if (view === "instant") return "Instant Chats";
  if (view === "blocks") return "Character Blocks";
  return "Private Messages";
}

function sourceLabel(sourceType: string): string {
  if (sourceType === "room_message") return "Location";
  if (sourceType === "instant_chat_message") return "Instant";
  return "Private";
}

export function AdminCommunicationLogsContext() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [search, setSearch] = useState("");

  const view = searchParams.get("view") ?? "pm";

  useEffect(() => {
    if (pathname !== "/admin/communication-logs") {
      return;
    }

    let frame = 0;

    function scan() {
      cancelAnimationFrame(frame);

      frame = requestAnimationFrame(() => {
        const markers = Array.from(
          document.querySelectorAll<HTMLElement>(
            "[data-communication-log-marker]",
          ),
        );

        const next = markers
          .map((marker) => {
            const sourceType = marker.dataset.sourceType ?? "";
            const sourceId = marker.dataset.sourceId ?? "";
            const card = marker.parentElement;

            if (!card || !sourceId) {
              return null;
            }

            const text = compactText(
              card.innerText || card.textContent || "",
            );

            const moderationText = compactText(
              marker.innerText || marker.textContent || "",
            );

            let contentText = text;

            if (
              moderationText &&
              contentText.endsWith(moderationText)
            ) {
              contentText = contentText
                .slice(0, -moderationText.length)
                .trim();
            }

            const summary =
              contentText || text || "Communication entry";

            return {
              key: `${sourceType}:${sourceId}`,
              sourceType,
              sourceId,
              summary,
              searchText:
                `${summary} ${sourceType} ${sourceId}`.toLowerCase(),
              element: card,
            } satisfies LogEntry;
          })
          .filter(
            (entry): entry is LogEntry => Boolean(entry),
          );

        setEntries(next);
      });
    }

    scan();

    const centre =
      document.querySelector("[data-portal-centre-host]") ??
      document.body;

    const observer = new MutationObserver(scan);

    observer.observe(centre, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [pathname, searchParams]);

  const visibleEntries = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return entries;
    }

    return entries.filter((entry) =>
      entry.searchText.includes(query),
    );
  }, [entries, search]);

  const activeFilters = useMemo(() => {
    const labels: string[] = [];

    for (const key of [
      "q",
      "character",
      "conversation",
      "room",
      "kind",
      "type",
      "from",
      "to",
    ]) {
      const value = searchParams.get(key);

      if (value) {
        labels.push(`${key}: ${value}`);
      }
    }

    return labels;
  }, [searchParams]);

  function jumpTo(entry: LogEntry) {
    const target = entry.element;

    target.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });

    const previousOutline = target.style.outline;
    const previousOffset = target.style.outlineOffset;

    target.style.outline =
      "1px solid rgb(var(--sep-colour-c59654))";
    target.style.outlineOffset = "3px";

    window.setTimeout(() => {
      target.style.outline = previousOutline;
      target.style.outlineOffset = previousOffset;
    }, 1800);
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-806b50))]">
        Administration · Logs
      </p>

      <h2 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-d8bf91))]">
        {labelForView(view)}
      </h2>

      <p className="mt-2 text-[11px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">
        Search the communication entries already loaded by the current filters, then jump directly to a result.
      </p>

      <input
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search loaded messages..."
        className="mt-3 w-full border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-xs text-[rgb(var(--sep-colour-d4bea0))] outline-none placeholder:text-[rgb(var(--sep-colour-665b4d))] focus:border-[rgb(var(--sep-colour-987344))]"
      />

      {activeFilters.length > 0 ? (
        <div className="mt-2 flex max-h-16 flex-wrap gap-1 overflow-y-auto">
          {activeFilters.map((filter) => (
            <span
              key={filter}
              title={filter}
              className="max-w-full truncate border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-18120e))] px-2 py-1 text-[7px] uppercase tracking-[0.08em] text-[rgb(var(--sep-colour-8e7a61))]"
            >
              {filter}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-3 flex items-center justify-between border-b border-[rgb(var(--sep-colour-59432c))]/35 pb-2">
        <span className="text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-786a58))]">
          Results
        </span>
        <span className="text-[8px] text-[rgb(var(--sep-colour-9a856a))]">
          {visibleEntries.length}
          {search ? ` / ${entries.length}` : ""}
        </span>
      </div>

      <div className="mt-2 min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
        {visibleEntries.length === 0 ? (
          <p className="px-1 py-3 text-[10px] leading-5 text-[rgb(var(--sep-colour-736858))]">
            {entries.length === 0
              ? "No communication entries are loaded for this view."
              : "No loaded messages match this search."}
          </p>
        ) : (
          visibleEntries.map((entry) => (
            <button
              key={entry.key}
              type="button"
              onClick={() => jumpTo(entry)}
              title={entry.summary}
              className="block w-full border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-120e0b))] px-2.5 py-2 text-left transition hover:border-[rgb(var(--sep-colour-80613b))]/70 hover:bg-[rgb(var(--sep-colour-21170f))]"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-987344))]">
                  {sourceLabel(entry.sourceType)}
                </span>

                <span className="max-w-[78px] truncate text-[7px] text-[rgb(var(--sep-colour-655b4f))]">
                  {entry.sourceId}
                </span>
              </div>

              <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-[rgb(var(--sep-colour-b8a488))]">
                {entry.summary}
              </p>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
'''

p.parent.mkdir(parents=True, exist_ok=True)
p.write_text(content, encoding="utf-8")
print(f"Created: {rel}")

# 3) Route Logs page to dedicated right panel.
rel = "components/portal/portal-responsive-right-sidebar.tsx"
text = read(rel)

text = replace_once(
    text,
    'import { AdminContextPanel } from "@/components/portal/admin-context-panel";',
    '''import { AdminContextPanel } from "@/components/portal/admin-context-panel";
import { AdminCommunicationLogsContext } from "@/components/portal/admin-communication-logs-context";''',
    rel,
    "logs context import",
)

text = replace_once(
    text,
    '''  const isAdminUsersPath =
    pathname === "/admin/users";''',
    '''  const isAdminUsersPath =
    pathname === "/admin/users";

  const isAdminCommunicationLogsPath =
    pathname === "/admin/communication-logs";''',
    rel,
    "logs path flag",
)

text = replace_once(
    text,
    '''              ) : isAdminUsersPath ? (
                <AdminRecordSearchContext
                  key={`users-${adminRevision}`}
                  mode="users"
                />
              ) : isMarketPath ? (''',
    '''              ) : isAdminUsersPath ? (
                <AdminRecordSearchContext
                  key={`users-${adminRevision}`}
                  mode="users"
                />
              ) : isAdminCommunicationLogsPath ? (
                <AdminCommunicationLogsContext
                  key={`communication-logs-${adminRevision}`}
                />
              ) : isMarketPath ? (''',
    rel,
    "logs context routing",
)

write(rel, text)

print("")
print("Communication Logs context panel patch applied.")
print("Run: npm run build")
