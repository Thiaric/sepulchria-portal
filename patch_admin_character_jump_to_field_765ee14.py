from pathlib import Path

path = Path.cwd() / "components/portal/portal-context-panel.tsx"

if not path.exists():
    raise SystemExit(
        f"ERROR: Missing expected file: {path}"
    )

text = path.read_text(encoding="utf-8")

old_route = '  if (adminCharacterMatch) {\n    return (\n      <AdminCharacterHistoryContext\n        characterId={\n          adminCharacterMatch[1]\n        }\n      />\n    );\n  }\n'
new_route = '  if (adminCharacterMatch) {\n    return (\n      <AdminCharacterFieldNavigator />\n    );\n  }\n'
insert_anchor = 'type FriendListContextEntry = {\n  id: string;\n  name: string;\n};\n'
component = 'type AdminCharacterJumpField = {\n  label: string;\n  aliases?: string[];\n};\n\nconst ADMIN_CHARACTER_JUMP_FIELDS: AdminCharacterJumpField[] = [\n  { label: "Character administration", aliases: ["summary", "overview", "identity"] },\n  { label: "Legal name", aliases: ["name"] },\n  { label: "Display name" },\n  { label: "Pronouns" },\n  { label: "Gender" },\n  { label: "Sexual orientation" },\n  { label: "Date of birth", aliases: ["dob", "birthday", "age"] },\n  { label: "Birthplace" },\n  { label: "Origin" },\n  { label: "Public slug", aliases: ["slug"] },\n  { label: "Owner user ID", aliases: ["user", "owner"] },\n  { label: "Biography", aliases: ["bio"] },\n  { label: "Physical description", aliases: ["appearance", "physical"] },\n  { label: "Personality" },\n  { label: "Public notes", aliases: ["notes"] },\n  { label: "Relationships" },\n  { label: "Offgame", aliases: ["off game", "ooc"] },\n  { label: "First name" },\n  { label: "Surname", aliases: ["last name"] },\n  { label: "Portrait URL", aliases: ["portrait", "image"] },\n  { label: "Character music URL", aliases: ["music", "theme"] },\n  { label: "Character Health", aliases: ["health", "hp"] },\n  { label: "Character attributes", aliases: ["attributes", "stats"] },\n  { label: "Ancestry", aliases: ["race"] },\n  { label: "Public title", aliases: ["title"] },\n  { label: "Private staff notes", aliases: ["staff notes", "private notes"] },\n  { label: "Review and classification", aliases: ["review", "status", "classification"] },\n  { label: "Approval record", aliases: ["approval"] },\n  { label: "Danger zone", aliases: ["delete", "deletion"] },\n];\n\nfunction AdminCharacterFieldNavigator() {\n  const [search, setSearch] = useState("");\n\n  const query =\n    search.trim().toLocaleLowerCase();\n\n  const fields =\n    ADMIN_CHARACTER_JUMP_FIELDS.filter(\n      (field) => {\n        if (!query) {\n          return true;\n        }\n\n        const haystack = [\n          field.label,\n          ...(field.aliases ?? []),\n        ]\n          .join(" ")\n          .toLocaleLowerCase();\n\n        return haystack.includes(query);\n      },\n    );\n\n  function jumpToField(label: string) {\n    const candidates =\n      Array.from(\n        document.querySelectorAll<HTMLElement>(\n          "main h1, main h2, main h3, main h4, main p, main span, main div",\n        ),\n      );\n\n    const targetLabel =\n      label.trim().toLocaleLowerCase();\n\n    const exact =\n      candidates.find(\n        (element) =>\n          element.children.length === 0 &&\n          element.textContent\n            ?.trim()\n            .toLocaleLowerCase() ===\n            targetLabel,\n      ) ??\n      candidates.find(\n        (element) =>\n          element.textContent\n            ?.trim()\n            .toLocaleLowerCase() ===\n            targetLabel,\n      );\n\n    if (!exact) {\n      return;\n    }\n\n    const target =\n      exact.closest<HTMLElement>(\n        "section, label",\n      ) ??\n      exact.parentElement ??\n      exact;\n\n    target.scrollIntoView({\n      behavior: "smooth",\n      block: "start",\n    });\n\n    const previousOutline =\n      target.style.outline;\n    const previousOffset =\n      target.style.outlineOffset;\n\n    target.style.outline =\n      "1px solid rgb(var(--sep-colour-8d6d3e))";\n    target.style.outlineOffset =\n      "3px";\n\n    window.setTimeout(() => {\n      target.style.outline =\n        previousOutline;\n      target.style.outlineOffset =\n        previousOffset;\n    }, 1200);\n  }\n\n  return (\n    <div className="flex h-full min-h-0 flex-col">\n      <ContextHeading\n        eyebrow="Character administration"\n        title="Jump to Field"\n      />\n\n      <p className="text-xs leading-6 text-[rgb(var(--sep-colour-938673))]">\n        Search this character record and jump directly to the section or field you need.\n      </p>\n\n      <input\n        type="search"\n        value={search}\n        onChange={(event) =>\n          setSearch(event.target.value)\n        }\n        placeholder="Search fields..."\n        className="mt-4 w-full border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-xs text-[rgb(var(--sep-colour-d4bea0))] outline-none placeholder:text-[rgb(var(--sep-colour-655c50))] focus:border-[rgb(var(--sep-colour-8a673f))]"\n      />\n\n      <div className="my-4 h-px bg-[rgb(var(--sep-colour-59432c))]/35" />\n\n      <p className="mb-2 text-[8px] uppercase tracking-[.18em] text-[rgb(var(--sep-colour-806b50))]">\n        Fields · {fields.length}\n      </p>\n\n      <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">\n        {fields.length ? (\n          fields.map((field) => (\n            <button\n              key={field.label}\n              type="button"\n              onClick={() =>\n                jumpToField(field.label)\n              }\n              className="flex w-full items-center justify-between gap-3 border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-left transition hover:border-[rgb(var(--sep-colour-8a673f))] hover:bg-[rgb(var(--sep-colour-17110d))]"\n            >\n              <span className="truncate font-serif text-[13px] text-[rgb(var(--sep-colour-cbb28a))]">\n                {field.label}\n              </span>\n\n              <span className="shrink-0 text-[rgb(var(--sep-colour-725a3d))]">\n                →\n              </span>\n            </button>\n          ))\n        ) : (\n          <p className="text-xs text-[rgb(var(--sep-colour-8f826f))]">\n            No matching fields.\n          </p>\n        )}\n      </div>\n    </div>\n  );\n}\n\n'

# Accept the route as already patched if rerun.
if old_route in text:
    text = text.replace(
        old_route,
        new_route,
        1,
    )
elif new_route not in text:
    raise SystemExit(
        "ERROR: Could not find the /admin/characters/[id] context route. "
        "No file was written. This patch is based on commit 765ee14."
    )

if "function AdminCharacterFieldNavigator()" not in text:
    count = text.count(insert_anchor)
    if count != 1:
        raise SystemExit(
            f"ERROR: Expected exactly 1 insertion anchor, found {count}. "
            "No file was written."
        )

    text = text.replace(
        insert_anchor,
        component + insert_anchor,
        1,
    )

path.write_text(text, encoding="utf-8")

print("SUCCESS")
print("Admin character detail context sidebar upgraded.")
print("- Live field search")
print("- Click-to-jump navigation")
print("- Smooth scrolling")
print("- Brief highlight on destination")
print("- Existing character page markup left unchanged")
print("Next: npm run build")
