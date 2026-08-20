from pathlib import Path
import subprocess

EXPECTED_HEAD = 'fdff11fdadaa3795077a6e446e3609b4d7dc2111'
ROOT = Path.cwd()
REL = "app/(portal)/admin/items/page.tsx"
P = ROOT / REL

if not P.exists():
    raise SystemExit(f"Missing expected file: {REL}")

# Pass 2 is intentionally allowed after Pass 1, so do not require exact HEAD:
# Pass 1 does not commit, and git rev-parse HEAD remains the same commit.
head = subprocess.check_output(["git", "rev-parse", "HEAD"], text=True).strip()
if head != EXPECTED_HEAD:
    raise SystemExit(
        f"STOPPED: expected HEAD {EXPECTED_HEAD}, current HEAD is {head}."
    )

s = P.read_text(encoding="utf-8-sig")

old = '                  <ItemForm\n                    action={updateItem}\n                    item={item}\n                    categories={categories}\n                    subcategories={subcategories}\n                  />\n\n                  <ItemEquipmentForm\n                    itemId={item.id}\n                  />\n\n                  <section className="mt-7 border-t border-[#59432c]/35 pt-5">\n                    <p className="text-[8px] uppercase tracking-[0.18em] text-[#806b50]">\n                      Mechanical effects\n                    </p>\n                    <h3 className="mt-1 font-serif text-xl text-[#d8bf91]">\n                      Item effects\n                    </h3>\n\n                    {effects.length ? (\n                      <div className="mt-4 space-y-3">\n                        {effects.map((effect) => (\n                          <EffectForm key={effect.id} itemId={item.id} effect={effect} />\n                        ))}\n                      </div>\n                    ) : (\n                      <p className="mt-3 text-xs italic text-[#766956]">\n                        No mechanical effects configured.\n                      </p>\n                    )}\n\n                    <details className="mt-4 border border-[#59432c]/35 bg-[#15100d]">\n                      <summary className="cursor-pointer list-none px-3 py-3 font-serif text-sm text-[#cab28a]">\n                        + Add effect\n                      </summary>\n                      <div className="border-t border-[#59432c]/30 p-3">\n                        <EffectForm itemId={item.id} />\n                      </div>\n                    </details>\n                  </section>\n'

new = '                  <section className="border border-[#6a5032]/45 bg-[#130e0b] p-4 sm:p-5">\n                    <p className="text-[8px] uppercase tracking-[0.2em] text-[#8c704b]">\n                      Use / Effects\n                    </p>\n                    <h3 className="mt-1 font-serif text-xl text-[#d8bf91]">\n                      Item mechanics\n                    </h3>\n                    <p className="mt-2 text-[10px] leading-5 text-[#817361]">\n                      Configure the Item, its target, success roll, damage, use behaviour,\n                      charges, cooldown and all additional Health or Attribute effects here.\n                      Damage is a valid effect by itself and never requires a dummy Use effect.\n                    </p>\n\n                    <div className="mt-4">\n                      <ItemForm\n                        action={updateItem}\n                        item={item}\n                        categories={categories}\n                        subcategories={subcategories}\n                      />\n                    </div>\n\n                    <div className="mt-5 border-t border-[#59432c]/35 pt-5">\n                      <p className="text-[8px] uppercase tracking-[0.18em] text-[#806b50]">\n                        Health / Attribute effects\n                      </p>\n\n                      {effects.length ? (\n                        <div className="mt-4 space-y-3">\n                          {effects.map((effect) => (\n                            <EffectForm\n                              key={effect.id}\n                              itemId={item.id}\n                              effect={effect}\n                            />\n                          ))}\n                        </div>\n                      ) : (\n                        <p className="mt-3 text-xs italic text-[#766956]">\n                          No additional Health or Attribute effects configured.\n                        </p>\n                      )}\n\n                      <details className="mt-4 border border-[#59432c]/35 bg-[#100c09]">\n                        <summary className="cursor-pointer list-none px-3 py-3 font-serif text-sm text-[#cab28a]">\n                          + Add Health / Attribute effect\n                        </summary>\n                        <div className="border-t border-[#59432c]/30 p-3">\n                          <EffectForm itemId={item.id} />\n                        </div>\n                      </details>\n                    </div>\n                  </section>\n\n                  <ItemEquipmentForm\n                    itemId={item.id}\n                  />\n'

count = s.count(old)
if count != 1:
    raise SystemExit(
        f"STOPPED: expected one existing ItemForm + Mechanical effects block, found {count}."
    )

s = s.replace(old, new, 1)
P.write_text(s, encoding="utf-8", newline="\n")

print("PASS 2 COMPLETE: Admin Item Use / Effects consolidated into one panel.")
print("Now run: npm run build")
