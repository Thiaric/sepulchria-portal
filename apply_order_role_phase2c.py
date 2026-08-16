from pathlib import Path

ROOT = Path.cwd()
REL = "components/admin/order-level-structure.tsx"
path = ROOT / REL

if not path.exists():
    raise SystemExit(
        f"ERROR: Could not find {REL}. Run this script from the sepulchria-portal root."
    )

text = path.read_text(encoding="utf-8")

needle = '''      <div className="mt-5 space-y-4">'''

insert = '''      <div className="mt-6 border border-[#765937]/35 bg-[#0d0a08] p-4">
        <p className="text-[8px] uppercase tracking-[0.2em] text-[#806b50]">
          Role progression map
        </p>

        <p className="mt-2 max-w-3xl text-[10px] leading-5 text-[#817565]">
          Each arrow is an allowed promotion path. The same connection is
          automatically used in reverse for demotion. A Role may connect to
          several Roles above it, allowing branching and diamond-shaped
          structures.
        </p>

        <div className="mt-4 space-y-5">
          {[...levels]
            .sort((a, b) => a.level - b.level)
            .map((level) => (
              <div
                key={`map-${level.id}`}
                className="grid gap-3 md:grid-cols-[90px_minmax(0,1fr)]"
              >
                <div>
                  <p className="text-[7px] uppercase tracking-[0.16em] text-[#756958]">
                    Level
                  </p>
                  <p className="mt-1 font-serif text-xl text-[#d8bf91]">
                    {level.level}
                  </p>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {(level.jobs ?? []).map((job) => {
                    const outgoing = links
                      .filter((link) => link.from_job_id === job.id)
                      .map((link) => jobById.get(link.to_job_id))
                      .filter(Boolean);

                    const incoming = links
                      .filter((link) => link.to_job_id === job.id)
                      .map((link) => jobById.get(link.from_job_id))
                      .filter(Boolean);

                    return (
                      <div
                        key={`map-role-${job.id}`}
                        className="border border-[#59432c]/40 bg-[#15100d] p-3"
                      >
                        <p className="font-serif text-sm text-[#d3ba8c]">
                          {job.name}
                        </p>

                        <div className="mt-2 space-y-1.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[7px] uppercase tracking-[0.12em] text-[#665c50]">
                              From
                            </span>

                            {incoming.length ? (
                              incoming.map((source) =>
                                source ? (
                                  <span
                                    key={`in-${job.id}-${source.id}`}
                                    className="border border-[#59432c]/35 bg-[#100c09] px-2 py-1 text-[7px] text-[#a58d6a]"
                                  >
                                    L{source.level} · {source.name}
                                  </span>
                                ) : null,
                              )
                            ) : (
                              <span className="text-[8px] italic text-[#5e554a]">
                                Entry Role
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[7px] uppercase tracking-[0.12em] text-[#665c50]">
                              To
                            </span>

                            {outgoing.length ? (
                              outgoing.map((target) =>
                                target ? (
                                  <span
                                    key={`out-${job.id}-${target.id}`}
                                    className="border border-[#765937]/40 bg-[#1b130d] px-2 py-1 text-[7px] text-[#c0a174]"
                                  >
                                    → L{target.level} · {target.name}
                                  </span>
                                ) : null,
                              )
                            ) : (
                              <span className="text-[8px] italic text-[#5e554a]">
                                No higher link
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
        </div>
      </div>

      <div className="mt-5 space-y-4">'''

if needle not in text:
    raise SystemExit(
        "ERROR: Could not find the hierarchy list insertion point. No changes made."
    )

text = text.replace(needle, insert, 1)

path.write_text(text, encoding="utf-8")

print("SUCCESS")
print(f"Updated: {REL}")
print()
print("Added a visible Role progression map to /admin/orders.")
print("Existing per-Role link controls remain unchanged.")
print()
print("Now run:")
print("  npm run build")
