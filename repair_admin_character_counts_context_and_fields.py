from pathlib import Path
import re

ROOT = Path.cwd()
admin_page = ROOT / "app/(portal)/admin/page.tsx"
context_path = ROOT / "components/portal/admin-context-panel.tsx"

for path in (admin_page, context_path):
    if not path.exists():
        raise SystemExit(f"ERROR: Missing expected file: {path}")

admin = admin_page.read_text(encoding="utf-8")
context = context_path.read_text(encoding="utf-8")

pairs = [
    (
        '    supabase\n      .from("characters")\n      .select("*", {\n        count: "exact",\n        head: true,\n      }),\n',
        '    supabase\n      .from("characters")\n      .select("*", {\n        count: "exact",\n        head: true,\n      })\n      .eq("is_system", false),\n',
    ),
    (
        '    supabase\n      .from("characters")\n      .select("*", {\n        count: "exact",\n        head: true,\n      })\n      .eq("status", "submitted"),\n',
        '    supabase\n      .from("characters")\n      .select("*", {\n        count: "exact",\n        head: true,\n      })\n      .eq("status", "submitted")\n      .eq("is_system", false),\n',
    ),
]

for old, new in pairs:
    if old in admin:
        admin = admin.replace(old, new, 1)
    elif new not in admin:
        raise SystemExit("ERROR: Could not identify expected /admin count query. No files were written.")

if '.eq("status", "approved")\n      .eq("is_system", false),' not in admin:
    raise SystemExit("ERROR: Approved count is not system-filtered as expected. No files were written.")

old_union = '  | "characters"\n  | "tickets"'
new_union = '  | "characters"\n  | "character_detail"\n  | "tickets"'
if old_union in context:
    context = context.replace(old_union, new_union, 1)
elif new_union not in context:
    raise SystemExit("ERROR: Could not extend admin context mode union. No files were written.")

route_anchor = '  if (\n    pathname ===\n    "/admin/characters"\n  ) {\n    return "characters";\n  }\n'
route_replacement = '  if (\n    pathname ===\n    "/admin/characters"\n  ) {\n    return "characters";\n  }\n\n  if (\n    /^\\/admin\\/characters\\/[0-9a-f-]+$/i.test(\n      pathname,\n    )\n  ) {\n    return "character_detail";\n  }\n'
if route_replacement not in context:
    if route_anchor not in context:
        raise SystemExit("ERROR: Could not add admin character-detail route. No files were written.")
    context = context.replace(route_anchor, route_replacement, 1)

render_anchor = '  if (mode === "forum") {\n    return (\n      <ForumModerationContext />\n    );\n  }\n'
render_replacement = '  if (mode === "character_detail") {\n    return (\n      <AdminCharacterFieldNavigator />\n    );\n  }\n\n  if (mode === "forum") {\n    return (\n      <ForumModerationContext />\n    );\n  }\n'
if '<AdminCharacterFieldNavigator />' not in context:
    if render_anchor not in context:
        raise SystemExit("ERROR: Could not add character-detail renderer. No files were written.")
    context = context.replace(render_anchor, render_replacement, 1)

m = re.search(
    r'if\s*\(\s*mode\s*===\s*"characters"\s*\)\s*\{(?P<body>.*?)(?=\n\s*if\s*\(\s*mode\s*===|\n\s*if\s*\(!cancelled\))',
    context,
    re.S,
)
if not m:
    raise SystemExit("ERROR: Could not locate characters-mode context query. No files were written.")

body = m.group("body")
if '.from("characters")' not in body:
    raise SystemExit("ERROR: Characters-mode block has no characters query. No files were written.")

if '.eq("is_system", false)' not in body:
    om = re.search(r'\n(?P<indent>\s*)\.order\(', body)
    if not om:
        raise SystemExit("ERROR: Could not locate order() in character context query. No files were written.")
    indent = om.group("indent")
    body = body[:om.start()] + f'\n{indent}.eq("is_system", false)' + body[om.start():]
    context = context[:m.start("body")] + body + context[m.end("body"):]

component = 'type AdminCharacterJumpField = {\n  label: string;\n  aliases?: string[];\n};\n\nconst ADMIN_CHARACTER_JUMP_FIELDS: AdminCharacterJumpField[] = [\n  { label: "Character administration", aliases: ["summary", "overview", "identity"] },\n  { label: "Legal name", aliases: ["name"] },\n  { label: "Display name" },\n  { label: "Pronouns" },\n  { label: "Gender" },\n  { label: "Sexual orientation" },\n  { label: "Date of birth", aliases: ["dob", "birthday", "age"] },\n  { label: "Birthplace" },\n  { label: "Origin" },\n  { label: "Public slug", aliases: ["slug"] },\n  { label: "Owner user ID", aliases: ["owner", "user"] },\n  { label: "Biography", aliases: ["bio"] },\n  { label: "Physical description", aliases: ["appearance", "physical"] },\n  { label: "Personality" },\n  { label: "Public notes", aliases: ["notes"] },\n  { label: "Relationships" },\n  { label: "Offgame", aliases: ["off game", "ooc"] },\n  { label: "First name" },\n  { label: "Surname", aliases: ["last name"] },\n  { label: "Portrait URL", aliases: ["portrait", "image"] },\n  { label: "Character music URL", aliases: ["music", "theme"] },\n  { label: "Character Health", aliases: ["health", "hp"] },\n  { label: "Character attributes", aliases: ["attributes", "stats"] },\n  { label: "Ancestry", aliases: ["race"] },\n  { label: "Public title", aliases: ["title"] },\n  { label: "Private staff notes", aliases: ["staff notes", "private notes"] },\n  { label: "Review and classification", aliases: ["review", "status", "classification"] },\n  { label: "Approval record", aliases: ["approval"] },\n  { label: "Danger zone", aliases: ["delete", "deletion"] },\n];\n\nfunction AdminCharacterFieldNavigator() {\n  const [search, setSearch] = useState("");\n\n  const query = search.trim().toLocaleLowerCase();\n\n  const visibleFields = ADMIN_CHARACTER_JUMP_FIELDS.filter((field) => {\n    if (!query) return true;\n    return [field.label, ...(field.aliases ?? [])]\n      .join(" ")\n      .toLocaleLowerCase()\n      .includes(query);\n  });\n\n  function jumpToField(label: string) {\n    const wanted = label.trim().toLocaleLowerCase();\n\n    const elements = Array.from(\n      document.querySelectorAll<HTMLElement>(\n        "main h1, main h2, main h3, main h4, main p, main div",\n      ),\n    );\n\n    const exact =\n      elements.find(\n        (element) =>\n          element.children.length === 0 &&\n          element.textContent?.trim().toLocaleLowerCase() === wanted,\n      ) ??\n      elements.find(\n        (element) =>\n          element.textContent?.trim().toLocaleLowerCase() === wanted,\n      );\n\n    if (!exact) return;\n\n    const target =\n      exact.closest<HTMLElement>("section, label") ??\n      exact.parentElement ??\n      exact;\n\n    target.scrollIntoView({\n      behavior: "smooth",\n      block: "start",\n    });\n\n    const oldOutline = target.style.outline;\n    const oldOffset = target.style.outlineOffset;\n\n    target.style.outline =\n      "1px solid rgb(var(--sep-colour-8d6d3e))";\n    target.style.outlineOffset = "3px";\n\n    window.setTimeout(() => {\n      target.style.outline = oldOutline;\n      target.style.outlineOffset = oldOffset;\n    }, 1200);\n  }\n\n  return (\n    <div className="flex h-full min-h-0 flex-col">\n      <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-806b50))]">\n        Character administration\n      </p>\n\n      <h2 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-d8bf91))]">\n        Jump to Field\n      </h2>\n\n      <p className="mt-2 text-[11px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">\n        Search this character record and jump directly to the field or section you need.\n      </p>\n\n      <input\n        type="search"\n        value={search}\n        onChange={(event) => setSearch(event.target.value)}\n        placeholder="Search fields..."\n        className="mt-4 w-full border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-xs text-[rgb(var(--sep-colour-d4bea0))] outline-none placeholder:text-[rgb(var(--sep-colour-655c50))] focus:border-[rgb(var(--sep-colour-8a673f))]"\n      />\n\n      <p className="mb-2 mt-4 text-[8px] uppercase tracking-[.18em] text-[rgb(var(--sep-colour-806b50))]">\n        Fields · {visibleFields.length}\n      </p>\n\n      <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">\n        {visibleFields.length ? (\n          visibleFields.map((field) => (\n            <button\n              key={field.label}\n              type="button"\n              onClick={() => jumpToField(field.label)}\n              className="flex w-full items-center justify-between gap-3 border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-left transition hover:border-[rgb(var(--sep-colour-8a673f))] hover:bg-[rgb(var(--sep-colour-17110d))]"\n            >\n              <span className="truncate font-serif text-[13px] text-[rgb(var(--sep-colour-cbb28a))]">\n                {field.label}\n              </span>\n              <span className="shrink-0 text-[rgb(var(--sep-colour-725a3d))]">\n                →\n              </span>\n            </button>\n          ))\n        ) : (\n          <p className="text-xs text-[rgb(var(--sep-colour-8f826f))]">\n            No matching fields.\n          </p>\n        )}\n      </div>\n    </div>\n  );\n}\n\n'
if "function AdminCharacterFieldNavigator()" not in context:
    anchor = "function AdminShapesJumpContext()"
    idx = context.find(anchor)
    if idx == -1:
        raise SystemExit("ERROR: Could not find safe insertion point. No files were written.")
    context = context[:idx] + component + context[idx:]

admin_page.write_text(admin, encoding="utf-8")
context_path.write_text(context, encoding="utf-8")

print("SUCCESS")
print("Fixed:")
print("- /admin character totals exclude system characters")
print("- /admin/characters context list excludes system characters")
print("- /admin/characters/[id] now uses the actual Admin Jump to Field context")
print("Next: npm run build")
