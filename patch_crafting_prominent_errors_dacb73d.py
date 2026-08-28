from pathlib import Path

path = Path("app/(portal)/crafting/crafting-workbench.tsx")
if not path.exists():
    raise SystemExit(f"Missing expected file: {path}")

text = path.read_text(encoding="utf-8")
original = text

old = '''                {notice ? (
                  <p
                    className="mt-1 text-[9px] leading-4"
                    style={{
                      color:
                        notice.tone === "success"
                          ? craftingAccent
                          : "rgb(var(--sep-colour-c17b6c))",
                    }}
                  >
                    {notice.text}
                  </p>
                ) : null}'''

new = '''                {notice ? (
                  <div
                    role={notice.tone === "error" ? "alert" : "status"}
                    className="mt-3 border px-3 py-2.5"
                    style={{
                      borderColor:
                        notice.tone === "success"
                          ? `color-mix(in srgb, ${craftingAccent} 55%, transparent)`
                          : "rgba(185, 66, 66, 0.72)",
                      background:
                        notice.tone === "success"
                          ? `color-mix(in srgb, ${craftingAccent} 8%, rgb(var(--sep-colour-100c09)))`
                          : "rgba(78, 18, 18, 0.48)",
                      boxShadow:
                        notice.tone === "success"
                          ? `inset 3px 0 0 ${craftingAccent}`
                          : "inset 3px 0 0 rgb(190 72 72), 0 0 18px rgba(150,35,35,0.10)",
                    }}
                  >
                    <p
                      className="text-[7px] font-semibold uppercase tracking-[0.18em]"
                      style={{
                        color:
                          notice.tone === "success"
                            ? craftingAccent
                            : "rgb(224 117 117)",
                      }}
                    >
                      {notice.tone === "success"
                        ? "Crafting complete"
                        : "Crafting failed"}
                    </p>
                    <p
                      className="mt-1.5 text-[10px] font-medium leading-5"
                      style={{
                        color:
                          notice.tone === "success"
                            ? "rgb(var(--sep-colour-d4bd94))"
                            : "rgb(239 170 160)",
                      }}
                    >
                      {notice.text}
                    </p>
                  </div>
                ) : null}'''

if old not in text:
    raise SystemExit("Could not find the current tiny crafting notice block.")

text = text.replace(old, new, 1)

if text == original:
    raise SystemExit("No changes were applied.")

path.write_text(text, encoding="utf-8")
print("SUCCESS")
print("Crafting error/success notice is now prominent.")
print("Now run: npm run build")
