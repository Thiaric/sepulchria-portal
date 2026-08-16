from pathlib import Path

ROOT = Path.cwd()
ACTIONS = ROOT / "app/(portal)/admin/orders/structure-actions.ts"
STRUCTURE = ROOT / "components/admin/order-level-structure.tsx"
CLIENT = ROOT / "components/admin/order-role-progression-editor.tsx"

CLIENT_CONTENT = '"use client";\n\nimport { useMemo, useState, useTransition } from "react";\n\nimport {\n  createOrderJobLinkLive,\n  deleteOrderJobLinkLive,\n} from "@/app/(portal)/admin/orders/structure-actions";\n\nexport type ProgressionRole = {\n  id: string;\n  name: string;\n  level: number;\n};\n\nexport type ProgressionLink = {\n  id: string;\n  from_job_id: string;\n  to_job_id: string;\n};\n\ntype Props = {\n  orderId: string;\n  roles: ProgressionRole[];\n  initialLinks: ProgressionLink[];\n};\n\nexport function OrderRoleProgressionEditor({\n  orderId,\n  roles,\n  initialLinks,\n}: Props) {\n  const [links, setLinks] = useState(initialLinks);\n  const [error, setError] = useState<string | null>(null);\n  const [pendingKey, setPendingKey] = useState<string | null>(null);\n  const [isPending, startTransition] = useTransition();\n\n  const rolesByLevel = useMemo(() => {\n    const map = new Map<number, ProgressionRole[]>();\n\n    for (const role of roles) {\n      const current = map.get(role.level) ?? [];\n      current.push(role);\n      map.set(role.level, current);\n    }\n\n    for (const values of map.values()) {\n      values.sort((a, b) => a.name.localeCompare(b.name));\n    }\n\n    return map;\n  }, [roles]);\n\n  const roleById = useMemo(\n    () => new Map(roles.map((role) => [role.id, role])),\n    [roles],\n  );\n\n  const levels = useMemo(\n    () => [...rolesByLevel.keys()].sort((a, b) => a - b),\n    [rolesByLevel],\n  );\n\n  function addLink(fromJobId: string, toJobId: string) {\n    if (!toJobId) return;\n\n    const key = `add:${fromJobId}:${toJobId}`;\n    setError(null);\n    setPendingKey(key);\n\n    startTransition(async () => {\n      try {\n        const result = await createOrderJobLinkLive({\n          orderId,\n          fromJobId,\n          toJobId,\n        });\n\n        if (!result.ok) {\n          setError(result.error);\n          return;\n        }\n\n        setLinks((current) =>\n          current.some((link) => link.id === result.link.id)\n            ? current\n            : [...current, result.link],\n        );\n      } catch (caught) {\n        setError(\n          caught instanceof Error\n            ? caught.message\n            : "Unable to add Role progression link.",\n        );\n      } finally {\n        setPendingKey(null);\n      }\n    });\n  }\n\n  function removeLink(linkId: string) {\n    const key = `remove:${linkId}`;\n    setError(null);\n    setPendingKey(key);\n\n    startTransition(async () => {\n      try {\n        const result = await deleteOrderJobLinkLive({\n          orderId,\n          linkId,\n        });\n\n        if (!result.ok) {\n          setError(result.error);\n          return;\n        }\n\n        setLinks((current) =>\n          current.filter((link) => link.id !== linkId),\n        );\n      } catch (caught) {\n        setError(\n          caught instanceof Error\n            ? caught.message\n            : "Unable to remove Role progression link.",\n        );\n      } finally {\n        setPendingKey(null);\n      }\n    });\n  }\n\n  return (\n    <div className="mt-6 border border-[#765937]/35 bg-[#0d0a08] p-4">\n      <p className="text-[8px] uppercase tracking-[0.2em] text-[#806b50]">\n        Role progression map\n      </p>\n\n      <p className="mt-2 max-w-3xl text-[10px] leading-5 text-[#817565]">\n        Add as many links as you need. Each connection points from a Role to\n        a Role on the Level immediately above it. Incoming links are derived\n        automatically, so every Role can have multiple paths below and above.\n      </p>\n\n      {error ? (\n        <div className="mt-3 border border-red-900/55 bg-red-950/20 px-3 py-2 text-[10px] text-red-300">\n          {error}\n        </div>\n      ) : null}\n\n      <div className="mt-4 space-y-5">\n        {levels.map((level) => {\n          const levelRoles = rolesByLevel.get(level) ?? [];\n\n          return (\n            <div\n              key={level}\n              className="grid gap-3 md:grid-cols-[90px_minmax(0,1fr)]"\n            >\n              <div>\n                <p className="text-[7px] uppercase tracking-[0.16em] text-[#756958]">\n                  Level\n                </p>\n                <p className="mt-1 font-serif text-xl text-[#d8bf91]">\n                  {level}\n                </p>\n              </div>\n\n              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">\n                {levelRoles.map((role) => {\n                  const incoming = links\n                    .filter((link) => link.to_job_id === role.id)\n                    .map((link) => ({\n                      link,\n                      role: roleById.get(link.from_job_id) ?? null,\n                    }))\n                    .filter(\n                      (\n                        item,\n                      ): item is {\n                        link: ProgressionLink;\n                        role: ProgressionRole;\n                      } => Boolean(item.role),\n                    );\n\n                  const outgoing = links\n                    .filter((link) => link.from_job_id === role.id)\n                    .map((link) => ({\n                      link,\n                      role: roleById.get(link.to_job_id) ?? null,\n                    }))\n                    .filter(\n                      (\n                        item,\n                      ): item is {\n                        link: ProgressionLink;\n                        role: ProgressionRole;\n                      } => Boolean(item.role),\n                    );\n\n                  const linkedAbove = new Set(\n                    outgoing.map(({ role: target }) => target.id),\n                  );\n\n                  const candidates = (\n                    rolesByLevel.get(level + 1) ?? []\n                  ).filter(\n                    (candidate) => !linkedAbove.has(candidate.id),\n                  );\n\n                  return (\n                    <div\n                      key={role.id}\n                      className="border border-[#59432c]/40 bg-[#15100d] p-3"\n                    >\n                      <p className="font-serif text-sm text-[#d3ba8c]">\n                        {role.name}\n                      </p>\n\n                      <div className="mt-3">\n                        <p className="text-[7px] uppercase tracking-[0.12em] text-[#665c50]">\n                          From lower Level\n                        </p>\n\n                        <div className="mt-1 flex flex-wrap gap-1.5">\n                          {incoming.length ? (\n                            incoming.map(({ link, role: source }) => (\n                              <span\n                                key={link.id}\n                                className="border border-[#59432c]/35 bg-[#100c09] px-2 py-1 text-[7px] text-[#a58d6a]"\n                              >\n                                L{source.level} · {source.name}\n                              </span>\n                            ))\n                          ) : (\n                            <span className="text-[8px] italic text-[#5e554a]">\n                              No incoming links\n                            </span>\n                          )}\n                        </div>\n                      </div>\n\n                      <div className="mt-3">\n                        <p className="text-[7px] uppercase tracking-[0.12em] text-[#665c50]">\n                          To higher Level\n                        </p>\n\n                        <div className="mt-1 space-y-1.5">\n                          {outgoing.map(({ link, role: target }) => (\n                            <div\n                              key={link.id}\n                              className="flex items-center justify-between gap-2 border border-[#765937]/35 bg-[#1b130d] px-2 py-1.5"\n                            >\n                              <span className="min-w-0 truncate text-[7px] text-[#c0a174]">\n                                → L{target.level} · {target.name}\n                              </span>\n\n                              <button\n                                type="button"\n                                disabled={\n                                  isPending &&\n                                  pendingKey === `remove:${link.id}`\n                                }\n                                onClick={() => removeLink(link.id)}\n                                className="shrink-0 text-[7px] uppercase text-red-300 disabled:opacity-40"\n                              >\n                                {isPending &&\n                                pendingKey === `remove:${link.id}`\n                                  ? "Removing..."\n                                  : "Remove"}\n                              </button>\n                            </div>\n                          ))}\n\n                          {candidates.length ? (\n                            <select\n                              key={`${role.id}-${links.length}`}\n                              defaultValue=""\n                              disabled={isPending}\n                              onChange={(event) => {\n                                const value = event.target.value;\n                                if (!value) return;\n                                addLink(role.id, value);\n                                event.currentTarget.value = "";\n                              }}\n                              className="w-full border border-[#60482e]/50 bg-[#100c09] px-2 py-2 text-[9px] text-[#d7c4a5] outline-none disabled:opacity-50"\n                            >\n                              <option value="" disabled>\n                                Link to Level {level + 1} Role\n                              </option>\n\n                              {candidates.map((candidate) => (\n                                <option\n                                  key={candidate.id}\n                                  value={candidate.id}\n                                >\n                                  {candidate.name}\n                                </option>\n                              ))}\n                            </select>\n                          ) : rolesByLevel.has(level + 1) ? (\n                            <p className="text-[8px] italic text-[#5e554a]">\n                              All available Roles above are linked.\n                            </p>\n                          ) : (\n                            <p className="text-[8px] italic text-[#5e554a]">\n                              Highest Level\n                            </p>\n                          )}\n                        </div>\n                      </div>\n                    </div>\n                  );\n                })}\n              </div>\n            </div>\n          );\n        })}\n      </div>\n    </div>\n  );\n}\n'

LIVE_ACTIONS = '\nexport async function createOrderJobLinkLive({\n  orderId,\n  fromJobId,\n  toJobId,\n}: {\n  orderId: string;\n  fromJobId: string;\n  toJobId: string;\n}) {\n  try {\n    await requireStaff();\n\n    if (!isUuid(orderId) || !isUuid(fromJobId) || !isUuid(toJobId)) {\n      return { ok: false as const, error: "Invalid Role progression link." };\n    }\n\n    const supabase = await createClient();\n\n    const { data, error } = await supabase\n      .from("order_job_links")\n      .insert({\n        from_job_id: fromJobId,\n        to_job_id: toJobId,\n      })\n      .select("id, from_job_id, to_job_id")\n      .single();\n\n    if (error) {\n      return { ok: false as const, error: error.message };\n    }\n\n    revalidatePath("/admin/orders");\n    revalidatePath("/orders");\n    revalidatePath("/orders/manage");\n\n    return { ok: true as const, link: data };\n  } catch (error) {\n    return {\n      ok: false as const,\n      error:\n        error instanceof Error\n          ? error.message\n          : "Unable to add Role progression link.",\n    };\n  }\n}\n\nexport async function deleteOrderJobLinkLive({\n  orderId,\n  linkId,\n}: {\n  orderId: string;\n  linkId: string;\n}) {\n  try {\n    await requireStaff();\n\n    if (!isUuid(orderId) || !isUuid(linkId)) {\n      return { ok: false as const, error: "Invalid Role progression link." };\n    }\n\n    const supabase = await createClient();\n\n    const { error } = await supabase\n      .from("order_job_links")\n      .delete()\n      .eq("id", linkId);\n\n    if (error) {\n      return { ok: false as const, error: error.message };\n    }\n\n    revalidatePath("/admin/orders");\n    revalidatePath("/orders");\n    revalidatePath("/orders/manage");\n\n    return { ok: true as const };\n  } catch (error) {\n    return {\n      ok: false as const,\n      error:\n        error instanceof Error\n          ? error.message\n          : "Unable to remove Role progression link.",\n    };\n  }\n}\n'

for path in [ACTIONS, STRUCTURE]:
    if not path.exists():
        raise SystemExit(
            f"ERROR: Missing {path.relative_to(ROOT)}. Run from project root."
        )

CLIENT.write_text(CLIENT_CONTENT, encoding="utf-8")
print("Created: components/admin/order-role-progression-editor.tsx")

actions = ACTIONS.read_text(encoding="utf-8")
if "export async function createOrderJobLinkLive" not in actions:
    actions = actions.rstrip() + "\n\n" + LIVE_ACTIONS.strip() + "\n"
    ACTIONS.write_text(actions, encoding="utf-8")
    print("Updated: app/(portal)/admin/orders/structure-actions.ts")

structure = STRUCTURE.read_text(encoding="utf-8")

import_marker = 'import { createClient } from "@/lib/supabase/server";\n\n'
new_import = (
    'import {\n'
    '  OrderRoleProgressionEditor,\n'
    '} from "@/components/admin/order-role-progression-editor";\n\n'
)

if "@/components/admin/order-role-progression-editor" not in structure:
    if import_marker not in structure:
        raise SystemExit("ERROR: Could not find import insertion point.")
    structure = structure.replace(
        import_marker,
        import_marker + new_import,
        1,
    )

start_marker = (
    '      <div className="mt-6 border '
    'border-[#765937]/35 bg-[#0d0a08] p-4">'
)
end_marker = '      <div className="mt-5 space-y-4">'

start = structure.find(start_marker)
end = structure.find(end_marker, start)

if start == -1 or end == -1:
    raise SystemExit(
        "ERROR: Could not locate existing Role progression map."
    )

live_block = (
    '      <OrderRoleProgressionEditor\n'
    '        orderId={orderId}\n'
    '        roles={allJobs.map((job) => ({\n'
    '          id: job.id,\n'
    '          name: job.name,\n'
    '          level: job.level,\n'
    '        }))}\n'
    '        initialLinks={links}\n'
    '      />\n\n'
)

structure = structure[:start] + live_block + structure[end:]
STRUCTURE.write_text(structure, encoding="utf-8")
print("Updated: components/admin/order-level-structure.tsx")

print()
print("SUCCESS")
print("Role links now add/remove without reloading /admin/orders.")
print("Now run: npm run build")
