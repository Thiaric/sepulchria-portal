from pathlib import Path

BASE = "98f0ce7"

def read(path):
    p = Path(path)
    if not p.exists():
        raise SystemExit(f"Missing {path}. Run from repo root.")
    return p.read_text(encoding="utf-8")

def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 match, found {count}. Expected {BASE}.")
    return text.replace(old, new, 1)

files = {
    "components/support/ticket-context-panel.tsx": '"use client";\n\nimport Link from "next/link";\nimport {\n  useEffect,\n  useMemo,\n  useState,\n} from "react";\n\ntype TicketRow = {\n  id: string;\n  public_reference: string;\n  status: string;\n  priority: string;\n  subject: string;\n  assigned_staff_user_id:\n    | string\n    | null;\n  search_body?: string;\n};\n\ntype TicketEvent = {\n  id: string;\n  text: string;\n  created_at: string;\n};\n\nfunction fmt(value: string) {\n  return new Intl.DateTimeFormat(\n    "en-GB",\n    {\n      day: "2-digit",\n      month: "2-digit",\n      year: "numeric",\n      hour: "2-digit",\n      minute: "2-digit",\n    },\n  ).format(new Date(value));\n}\n\nexport function TicketContextPanel({\n  admin = false,\n  reference,\n}: {\n  admin?: boolean;\n  reference?: string;\n}) {\n  const [tickets, setTickets] =\n    useState<TicketRow[]>([]);\n  const [events, setEvents] =\n    useState<TicketEvent[]>([]);\n  const [search, setSearch] =\n    useState("");\n\n  useEffect(() => {\n    let dead = false;\n\n    async function load() {\n      const qs =\n        new URLSearchParams();\n\n      if (admin) {\n        qs.set("admin", "1");\n      }\n\n      if (reference) {\n        qs.set(\n          "reference",\n          reference,\n        );\n      }\n\n      const response =\n        await fetch(\n          `/api/support/context?${qs}`,\n          {\n            cache: "no-store",\n          },\n        );\n\n      if (\n        !response.ok ||\n        dead\n      ) {\n        return;\n      }\n\n      const json =\n        await response.json();\n\n      if (reference) {\n        setEvents(\n          json.events ?? [],\n        );\n      } else {\n        setTickets(\n          json.tickets ?? [],\n        );\n      }\n    }\n\n    void load();\n\n    const id =\n      window.setInterval(\n        () => void load(),\n        2000,\n      );\n\n    return () => {\n      dead = true;\n      window.clearInterval(id);\n    };\n  }, [admin, reference]);\n\n  const query =\n    search\n      .trim()\n      .toLowerCase();\n\n  const visible =\n    useMemo(\n      () =>\n        tickets.filter(\n          (ticket) =>\n            !query ||\n            [\n              ticket.public_reference,\n              ticket.status,\n              ticket.priority,\n              ticket.subject,\n              ticket.assigned_staff_user_id ??\n                "",\n              ticket.search_body ??\n                "",\n            ].some((value) =>\n              String(value)\n                .toLowerCase()\n                .includes(query),\n            ),\n        ),\n      [query, tickets],\n    );\n\n  if (reference) {\n    return (\n      <div className="flex h-full min-h-0 flex-col">\n        <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-806b50))]">\n          Ticket activity\n        </p>\n\n        <h2 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-d8bf91))]">\n          {reference}\n        </h2>\n\n        <div\n          data-sep-interaction-fixed="true"\n          className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1"\n        >\n          {events.length ? (\n            events.map((event) => (\n              <div\n                key={event.id}\n                data-sep-interactive-surface="row"\n                className="border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 transition hover:border-[rgb(var(--sep-colour-8a673f))] hover:bg-[rgb(var(--sep-colour-17110d))]"\n              >\n                <p className="text-[10px] leading-4 text-[rgb(var(--sep-colour-cbb28a))]">\n                  {event.text}\n                </p>\n\n                <p className="mt-2 text-[7px] uppercase tracking-[0.1em] text-[rgb(var(--sep-colour-6f6353))]">\n                  {fmt(\n                    event.created_at,\n                  )}\n                </p>\n              </div>\n            ))\n          ) : (\n            <p className="text-xs text-[rgb(var(--sep-colour-8f8271))]">\n              No Ticket activity.\n            </p>\n          )}\n        </div>\n      </div>\n    );\n  }\n\n  return (\n    <div className="flex h-full min-h-0 flex-col">\n      <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-806b50))]">\n        {admin\n          ? "Administration"\n          : "Support"}\n      </p>\n\n      <h2 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-d8bf91))]">\n        Jump to Ticket\n      </h2>\n\n      <input\n        type="search"\n        value={search}\n        onChange={(event) =>\n          setSearch(\n            event.target.value,\n          )\n        }\n        placeholder="Number, status, title, body, priority, assignee..."\n        className="mt-3 w-full border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-xs outline-none"\n      />\n\n      <div className="mt-3 min-h-0 flex-1 space-y-1.5 overflow-y-auto">\n        {visible.map(\n          (ticket) => (\n            <Link\n              key={ticket.id}\n              href={`${admin ? "/admin/tickets" : "/support"}/${ticket.public_reference}`}\n              className="block border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 transition hover:border-[rgb(var(--sep-colour-8a673f))] hover:bg-[rgb(var(--sep-colour-17110d))]"\n            >\n              <span className="block font-serif text-[13px] text-[rgb(var(--sep-colour-cbb28a))]">\n                {ticket.subject}\n              </span>\n\n              <span className="mt-1 block text-[7px] uppercase text-[rgb(var(--sep-colour-6f6353))]">\n                {\n                  ticket.public_reference\n                }{" "}\n                ·{" "}\n                {ticket.status.replaceAll(\n                  "_",\n                  " ",\n                )}{" "}\n                · {ticket.priority}\n              </span>\n            </Link>\n          ),\n        )}\n      </div>\n    </div>\n  );\n}\n',
}

path = 'app/(portal)/admin/layout.tsx'
text = files.get(path, read(path))
text = replace_once(text, '      <div className="border-b border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-100c09))] px-5 py-4 sm:px-7 lg:px-9">', '      <div\n        data-sep-interaction-ignore="true"\n        className="border-b border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-100c09))] px-5 py-4 sm:px-7 lg:px-9"\n      >', 'Admin header full exclusion')
files[path] = text

path = 'components/sanctions/sanction-evidence.tsx'
text = files.get(path, read(path))
text = replace_once(text, '            <article\n              key={item.id}\n              data-sep-interactive-surface="row"\n              className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-black/10 transition-all duration-150 hover:border-[rgb(var(--sep-colour-8a673f))] hover:bg-[rgb(var(--sep-colour-17110d))] hover:shadow-[0_0_10px_rgba(var(--sep-rgb-177-132-75),0.06)]"\n            >', '            <article\n              key={item.id}\n              data-sep-interaction-fixed="true"\n              className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-black/10"\n            >', 'Large evidence article fixed')
files[path] = text

path = 'components/sanctions/sanction-context-panel.tsx'
text = files.get(path, read(path))
text = replace_once(text, '{(d?.events??[]).map((e:any)=><div key={e.id} className="border-l border-[rgb(var(--sep-colour-765937))]/55 bg-[rgb(var(--sep-colour-100c09))]/65 px-3 py-2">', '{(d?.events??[]).map((e:any)=><div key={e.id} data-sep-interactive-surface="row" className="border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 transition hover:border-[rgb(var(--sep-colour-8a673f))] hover:bg-[rgb(var(--sep-colour-17110d))]">', 'Sanction context individual rows')
files[path] = text

path = 'app/(portal)/game/components/RoomChatForm.tsx'
text = files.get(path, read(path))
text = replace_once(text, '  const [messageState, messageAction] =\n    useActionState(\n      sendRoomMessage,\n      initialState,\n    );', '  const [\n    messageState,\n    messageAction,\n    messagePending,\n  ] = useActionState(\n    sendRoomMessage,\n    initialState,\n  );', 'Chat pending state')
files[path] = text

path = 'app/(portal)/game/components/RoomChatForm.tsx'
text = files.get(path, read(path))
text = replace_once(text, '              name="message"\n              required\n              maxLength={CHAT_MAX_LENGTH}\n              value={value}\n              lang="en-GB"', '              name="message"\n              required\n              disabled={messagePending}\n              maxLength={CHAT_MAX_LENGTH}\n              value={value}\n              lang="en-GB"', 'Main textarea pending disable')
files[path] = text

path = 'app/(portal)/game/components/RoomChatForm.tsx'
text = files.get(path, read(path))
text = replace_once(text, '              name="message"\n              required\n              maxLength={CHAT_MAX_LENGTH}\n              value={value}\n              onKeyDown={(event) => {', '              name="message"\n              required\n              disabled={messagePending}\n              maxLength={CHAT_MAX_LENGTH}\n              value={value}\n              onKeyDown={(event) => {', 'Whisper textarea pending disable')
files[path] = text

path = 'app/(portal)/game/components/GatheringPanel.tsx'
text = files.get(path, read(path))
text = replace_once(text, 'import { usePortalSkin } from "@/components/portal/portal-skin-provider";', 'import { usePortalSkin } from "@/components/portal/portal-skin-provider";\nimport { usePortalAudio } from "@/components/audio/portal-audio-provider";', 'Gathering audio import')
files[path] = text

path = 'app/(portal)/game/components/GatheringPanel.tsx'
text = files.get(path, read(path))
text = replace_once(text, '  const router = useRouter();\n  const { skin } = usePortalSkin();', '  const router = useRouter();\n  const { skin } = usePortalSkin();\n  const {\n    playPortalSound,\n  } = usePortalAudio();', 'Gathering audio hook')
files[path] = text

path = 'app/(portal)/game/components/GatheringPanel.tsx'
text = files.get(path, read(path))
text = replace_once(text, '    setMessage(null);\n    setResult(null);\n    setSearching(true);\n\n    startTransition(async () => {', '    setMessage(null);\n    setResult(null);\n    setSearching(true);\n\n    // A short layered brush/rustle made from the portal\'s\n    // existing swish sound. It automatically follows the\n    // global Portal Sound mute setting.\n    playPortalSound("instant-swish");\n    window.setTimeout(\n      () =>\n        playPortalSound(\n          "instant-swish",\n        ),\n      95,\n    );\n    window.setTimeout(\n      () =>\n        playPortalSound(\n          "instant-swish",\n        ),\n      205,\n    );\n\n    startTransition(async () => {', 'Gathering rustle sound')
files[path] = text

path = 'components/notifications/notification-bell.tsx'
text = files.get(path, read(path))
text = replace_once(text, '  const [changingMute, setChangingMute] =\n    useState(false);\n\n  const [panelPosition, setPanelPosition] =', '  const [changingMute, setChangingMute] =\n    useState(false);\n  const [search, setSearch] =\n    useState("");\n\n  const [panelPosition, setPanelPosition] =', 'Notification search state')
files[path] = text

path = 'components/notifications/notification-bell.tsx'
text = files.get(path, read(path))
text = replace_once(text, '  const unreadCount =\n    muted\n      ? 0\n      : rows.filter(\n          (row) => row.is_unread,\n        ).length;\n\n  async function toggle() {', '  const unreadCount =\n    muted\n      ? 0\n      : rows.filter(\n          (row) => row.is_unread,\n        ).length;\n\n  const visibleRows =\n    useMemo(() => {\n      const query =\n        search\n          .trim()\n          .toLocaleLowerCase();\n\n      if (!query) {\n        return rows;\n      }\n\n      return rows.filter(\n        (row) => {\n          const date =\n            new Date(\n              row.starts_at,\n            );\n\n          const searchable = [\n            row.type,\n            row.title,\n            row.body,\n            row.href ?? "",\n            row.is_automatic\n              ? "automatic auto"\n              : "manual",\n            row.is_unread\n              ? "unread new"\n              : "read viewed",\n            row.starts_at,\n            date.toLocaleString(),\n            date.toLocaleDateString(),\n            date.toLocaleTimeString(),\n          ]\n            .join(" ")\n            .toLocaleLowerCase();\n\n          return searchable.includes(\n            query,\n          );\n        },\n      );\n    }, [rows, search]);\n\n  async function toggle() {', 'Notification visible rows')
files[path] = text

path = 'components/notifications/notification-bell.tsx'
text = files.get(path, read(path))
text = replace_once(text, '                </div>\n              </div>\n\n              <div className="max-h-[min(65vh,560px)] overflow-y-auto p-2">', '                </div>\n\n                {!muted ? (\n                  <div className="mt-3">\n                    <input\n                      type="search"\n                      value={search}\n                      onChange={(event) =>\n                        setSearch(\n                          event.target.value,\n                        )\n                      }\n                      placeholder="Filter notifications..."\n                      aria-label="Filter notifications"\n                      className="h-8 w-full border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-0d0907))] px-3 text-[10px] text-[rgb(var(--sep-colour-d4bea0))] outline-none placeholder:text-[rgb(var(--sep-colour-665b4d))] focus:border-[rgb(var(--sep-colour-987344))]"\n                    />\n                    {search.trim() ? (\n                      <p className="mt-1 text-right text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-6f6252))]">\n                        {visibleRows.length} / {rows.length}\n                      </p>\n                    ) : null}\n                  </div>\n                ) : null}\n              </div>\n\n              <div className="max-h-[min(65vh,560px)] overflow-y-auto p-2">', 'Notification fixed search bar')
files[path] = text

path = 'components/notifications/notification-bell.tsx'
text = files.get(path, read(path))
text = replace_once(text, '                ) : rows.length ? (\n                  <div className="space-y-1.5">\n                    {rows.map(', '                ) : visibleRows.length ? (\n                  <div className="space-y-1.5">\n                    {visibleRows.map(', 'Notification filtered mapping')
files[path] = text

path = 'components/notifications/notification-bell.tsx'
text = files.get(path, read(path))
text = replace_once(text, '                  <p className="px-4 py-8 text-center text-xs text-[rgb(var(--sep-colour-8f8271))]">\n                    Nothing to\n                    report.\n                  </p>', '                  <p className="px-4 py-8 text-center text-xs text-[rgb(var(--sep-colour-8f8271))]">\n                    {search.trim()\n                      ? "No matching notifications."\n                      : "Nothing to report."}\n                  </p>', 'Notification filtered empty state')
files[path] = text

# Validate all paths before writing.
for path in files:
    if not Path(path).exists():
        raise SystemExit(f"Missing {path}. Run from repo root.")

for path, text in files.items():
    Path(path).write_text(text, encoding="utf-8")
    print("✓", path)

print("\n98f0ce7 polish patch installed successfully.")
print("Run: npm run build")
