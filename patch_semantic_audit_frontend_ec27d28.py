from pathlib import Path
import base64

root = Path.cwd()

required = [
    root / "lib/audit/character-audit-display.ts",
    root / "components/characters/character-audit-entry.tsx",
    root / "app/api/character-audit/route.ts",
    root / "app/(portal)/admin/character-audit/page.tsx",
]

for path in required:
    if not path.exists():
        raise SystemExit(
            f"Missing {path.relative_to(root)}. Run from the sepulchria-portal repository root."
        )

(root / "lib/audit/collapse-semantic-audit-rows.ts").write_bytes(
    base64.b64decode('aW1wb3J0IHsKICB0eXBlIENoYXJhY3RlckF1ZGl0RGlzcGxheUJhc2UsCn0gZnJvbSAiQC9saWIvYXVkaXQvY2hhcmFjdGVyLWF1ZGl0LWRpc3BsYXkiOwoKZnVuY3Rpb24gYWN0aW9uSWQocm93OiBDaGFyYWN0ZXJBdWRpdERpc3BsYXlCYXNlKSB7CiAgY29uc3QgdmFsdWUgPSByb3cubWV0YWRhdGE/LmFjdGlvbl9pZDsKICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSAic3RyaW5nIiA/IHZhbHVlIDogbnVsbDsKfQoKZnVuY3Rpb24gc2VtYW50aWMocm93OiBDaGFyYWN0ZXJBdWRpdERpc3BsYXlCYXNlKSB7CiAgcmV0dXJuIHJvdy5vcGVyYXRpb24gPT09ICJldmVudCIgJiYgcm93Lm1ldGFkYXRhPy5zZW1hbnRpY19ldmVudCA9PT0gdHJ1ZTsKfQoKZnVuY3Rpb24gcmF3TXV0YXRpb24ocm93OiBDaGFyYWN0ZXJBdWRpdERpc3BsYXlCYXNlKSB7CiAgcmV0dXJuIHJvdy5tZXRhZGF0YT8ucmF3X211dGF0aW9uID09PSB0cnVlICYmIGFjdGlvbklkKHJvdykgIT09IG51bGw7Cn0KCmV4cG9ydCBmdW5jdGlvbiBjb2xsYXBzZVNlbWFudGljQXVkaXRSb3dzPFQgZXh0ZW5kcyBDaGFyYWN0ZXJBdWRpdERpc3BsYXlCYXNlPigKICByb3dzOiBUW10sCik6IEFycmF5PFQgJiB7IHJlbGF0ZWRfbXV0YXRpb25zPzogQ2hhcmFjdGVyQXVkaXREaXNwbGF5QmFzZVtdIH0+IHsKICBjb25zdCBzZW1hbnRpY0lkcyA9IG5ldyBTZXQoCiAgICByb3dzCiAgICAgIC5maWx0ZXIoc2VtYW50aWMpCiAgICAgIC5tYXAoYWN0aW9uSWQpCiAgICAgIC5maWx0ZXIoKHZhbHVlKTogdmFsdWUgaXMgc3RyaW5nID0+IEJvb2xlYW4odmFsdWUpKSwKICApOwoKICBjb25zdCByYXdCeUFjdGlvbiA9IG5ldyBNYXA8c3RyaW5nLCBDaGFyYWN0ZXJBdWRpdERpc3BsYXlCYXNlW10+KCk7CgogIGZvciAoY29uc3Qgcm93IG9mIHJvd3MpIHsKICAgIGNvbnN0IGlkID0gYWN0aW9uSWQocm93KTsKICAgIGlmICghaWQgfHwgIXNlbWFudGljSWRzLmhhcyhpZCkgfHwgIXJhd011dGF0aW9uKHJvdykpIGNvbnRpbnVlOwoKICAgIGNvbnN0IGxpc3QgPSByYXdCeUFjdGlvbi5nZXQoaWQpID8/IFtdOwogICAgbGlzdC5wdXNoKHJvdyk7CiAgICByYXdCeUFjdGlvbi5zZXQoaWQsIGxpc3QpOwogIH0KCiAgcmV0dXJuIHJvd3MKICAgIC5maWx0ZXIoKHJvdykgPT4gewogICAgICBjb25zdCBpZCA9IGFjdGlvbklkKHJvdyk7CiAgICAgIHJldHVybiAhcmF3TXV0YXRpb24ocm93KSB8fCAhaWQgfHwgIXNlbWFudGljSWRzLmhhcyhpZCk7CiAgICB9KQogICAgLm1hcCgocm93KSA9PiB7CiAgICAgIGNvbnN0IGlkID0gYWN0aW9uSWQocm93KTsKCiAgICAgIGlmICghc2VtYW50aWMocm93KSB8fCAhaWQpIHJldHVybiByb3c7CgogICAgICByZXR1cm4gewogICAgICAgIC4uLnJvdywKICAgICAgICByZWxhdGVkX211dGF0aW9uczogcmF3QnlBY3Rpb24uZ2V0KGlkKSA/PyBbXSwKICAgICAgfTsKICAgIH0pOwp9Cg==')
)

display_path = root / "lib/audit/character-audit-display.ts"
display = display_path.read_text(encoding="utf-8")

type_old = '  audit_context?: string | null;\n};'
type_new = '  audit_context?: string | null;\n  related_mutations?: CharacterAuditDisplayBase[];\n};'
if "related_mutations?: CharacterAuditDisplayBase[]" not in display:
    if type_old not in display:
        raise SystemExit("Could not find CharacterAuditDisplayBase anchor.")
    display = display.replace(type_old, type_new, 1)

helper = 'function semanticItemList(value: unknown) {\n  if (!Array.isArray(value)) return "";\n\n  return value\n    .map((entry) => {\n      if (!entry || typeof entry !== "object") return "";\n\n      const row = entry as Record<string, unknown>;\n      const name =\n        typeof row.item_name === "string"\n          ? row.item_name\n          : "Item";\n      const quantity = Number(row.quantity ?? 1);\n\n      return `${quantity} × ${name}`;\n    })\n    .filter(Boolean)\n    .join(", ");\n}\n\n'
if "function semanticItemList" not in display:
    anchor = "export function auditSummary(row: CharacterAuditDisplayBase) {"
    if anchor not in display:
        raise SystemExit("Could not find auditSummary.")
    display = display.replace(anchor, helper + anchor, 1)

summary_old = 'export function auditSummary(row: CharacterAuditDisplayBase) {\n  const before = row.old_values ?? {};\n  const after = row.new_values ?? {};\n'
summary_new = 'export function auditSummary(row: CharacterAuditDisplayBase) {\n  const before = row.old_values ?? {};\n  const after = row.new_values ?? {};\n\n  if (row.operation === "event") {\n    if (row.event_type === "item_given") {\n      return `Gave ${Number(after.quantity ?? 1)} × ${String(after.item_name ?? "Item")} to ${String(after.other_character_name ?? "another character")}`;\n    }\n\n    if (row.event_type === "item_received") {\n      return `Received ${Number(after.quantity ?? 1)} × ${String(after.item_name ?? "Item")} from ${String(after.other_character_name ?? "another character")}`;\n    }\n\n    if (row.event_type === "item_exchange") {\n      const gave = semanticItemList(after.gave_items);\n      const received = semanticItemList(after.received_items);\n      const other = String(after.other_character_name ?? "another character");\n      const gaveRemnants = Number(after.gave_remnants ?? 0);\n      const receivedRemnants = Number(after.received_remnants ?? 0);\n      const parts = [`Exchange with ${other}`];\n\n      if (gave) parts.push(`Gave: ${gave}`);\n      if (gaveRemnants > 0) parts.push(`Gave: ${gaveRemnants} Remnants`);\n      if (received) parts.push(`Received: ${received}`);\n      if (receivedRemnants > 0) parts.push(`Received: ${receivedRemnants} Remnants`);\n\n      return parts.join(" · ");\n    }\n\n    if (row.event_type === "crafting") {\n      const crafted = semanticItemList(after.crafted_items);\n      const ingredients = semanticItemList(after.ingredients_used);\n\n      return [\n        crafted ? `Crafted: ${crafted}` : "Crafting completed",\n        ingredients ? `Used: ${ingredients}` : null,\n      ].filter(Boolean).join(" · ");\n    }\n  }\n'
if 'row.event_type === "item_given"' not in display:
    if summary_old not in display:
        raise SystemExit("Could not find auditSummary start.")
    display = display.replace(summary_old, summary_new, 1)

display_path.write_text(display, encoding="utf-8")

api_path = root / "app/api/character-audit/route.ts"
api = api_path.read_text(encoding="utf-8")

api_import_old = 'import {\n  enrichCharacterAuditRows,\n} from "@/lib/audit/enrich-character-audit-context";'
api_import_new = 'import {\n  enrichCharacterAuditRows,\n} from "@/lib/audit/enrich-character-audit-context";\nimport { collapseSemanticAuditRows } from "@/lib/audit/collapse-semantic-audit-rows";'
if "collapseSemanticAuditRows" not in api:
    if api_import_old not in api:
        raise SystemExit("Could not find API enrichment import.")
    api = api.replace(api_import_old, api_import_new, 1)

api_rows_old = '  const rows =\n    enrichedRows\n      .filter((row) => {'
api_rows_new = '  const collapsedRows =\n    collapseSemanticAuditRows(\n      enrichedRows,\n    );\n\n  const rows =\n    collapsedRows\n      .filter((row) => {'
if "const collapsedRows" not in api:
    if api_rows_old not in api:
        raise SystemExit("Could not find API rows mapping.")
    api = api.replace(api_rows_old, api_rows_new, 1)

api_map_old = '        metadata:\n          staffView\n            ? row.metadata\n            : null,\n        created_at:\n          row.created_at,'
api_map_new = '        metadata:\n          staffView\n            ? row.metadata\n            : null,\n        related_mutations:\n          (row.related_mutations ?? []).map(\n            (mutation) => ({\n              ...mutation,\n              old_values:\n                cleanValues(\n                  mutation.old_values,\n                  staffView,\n                ),\n              new_values:\n                cleanValues(\n                  mutation.new_values,\n                  staffView,\n                ),\n              metadata:\n                staffView\n                  ? mutation.metadata\n                  : null,\n            }),\n          ),\n        created_at:\n          row.created_at,'
if "related_mutations:" not in api:
    if api_map_old not in api:
        raise SystemExit("Could not find API row output anchor.")
    api = api.replace(api_map_old, api_map_new, 1)

api_path.write_text(api, encoding="utf-8")

admin_path = root / "app/(portal)/admin/character-audit/page.tsx"
admin = admin_path.read_text(encoding="utf-8")

admin_import_old = 'import {\n  enrichCharacterAuditRows,\n} from "@/lib/audit/enrich-character-audit-context";'
admin_import_new = 'import {\n  enrichCharacterAuditRows,\n} from "@/lib/audit/enrich-character-audit-context";\nimport { collapseSemanticAuditRows } from "@/lib/audit/collapse-semantic-audit-rows";'
if "collapseSemanticAuditRows" not in admin:
    if admin_import_old not in admin:
        raise SystemExit("Could not find admin enrichment import.")
    admin = admin.replace(admin_import_old, admin_import_new, 1)

if "const rows = enrichedRows;" in admin:
    admin = admin.replace(
        "  const rows = enrichedRows;",
        """  const rows =
    collapseSemanticAuditRows(
      enrichedRows,
    );""",
        1,
    )

admin_path.write_text(admin, encoding="utf-8")

entry_path = root / "components/characters/character-audit-entry.tsx"
entry = entry_path.read_text(encoding="utf-8")

entry_anchor = '          {row.metadata && Object.keys(row.metadata).length ? (\n            <div className="mt-3 border-t border-[rgb(var(--sep-colour-59432c))]/25 pt-3">'
entry_block = '          {row.related_mutations?.length ? (\n            <div className="mt-3 border-t border-[rgb(var(--sep-colour-59432c))]/25 pt-3">\n              <p className="text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-756958))]">\n                Raw mutations in this action\n              </p>\n\n              <div className="mt-2 space-y-2">\n                {row.related_mutations.map((mutation) => (\n                  <details\n                    key={mutation.id}\n                    className="border border-[rgb(var(--sep-colour-59432c))]/25 px-3 py-2"\n                  >\n                    <summary className="cursor-pointer text-[8px] text-[rgb(var(--sep-colour-a98d65))]">\n                      {humanAuditLabel(mutation.event_type)} · {humanAuditLabel(mutation.entity_type)}\n                    </summary>\n\n                    <div className="mt-2 grid gap-2 text-[8px] sm:grid-cols-2">\n                      <p>Audit ID: {mutation.id}</p>\n                      <p>Entity ID: {mutation.entity_id ?? "—"}</p>\n                      <p>Operation: {humanAuditLabel(mutation.operation)}</p>\n                      <p>Source: {humanAuditLabel(mutation.source)}</p>\n                    </div>\n\n                    <div className="mt-2 grid gap-3 lg:grid-cols-2">\n                      <pre className="max-h-52 overflow-auto whitespace-pre-wrap break-words text-[8px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">\n                        {prettyAuditValue(mutation.old_values)}\n                      </pre>\n                      <pre className="max-h-52 overflow-auto whitespace-pre-wrap break-words text-[8px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">\n                        {prettyAuditValue(mutation.new_values)}\n                      </pre>\n                    </div>\n                  </details>\n                ))}\n              </div>\n            </div>\n          ) : null}\n\n'

if "Raw mutations in this action" not in entry:
    if entry_anchor not in entry:
        raise SystemExit("Could not find Technical details metadata anchor.")
    entry = entry.replace(entry_anchor, entry_block + entry_anchor, 1)

entry_path.write_text(entry, encoding="utf-8")

print("Semantic Character Log frontend patch applied.")
print("Next: npm run build")
