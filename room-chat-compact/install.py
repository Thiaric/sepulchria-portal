from pathlib import Path
ROOT = Path.cwd()
matches = list(ROOT.rglob("RoomChatForm.tsx"))
if len(matches) != 1:
    raise SystemExit(f"ERROR: Expected one RoomChatForm.tsx, found {len(matches)}")
path = matches[0]
text = path.read_text(encoding="utf-8")
def rep(old, new, label):
    global text
    if old not in text:
        raise SystemExit(f"ERROR: Could not find {label}")
    text = text.replace(old, new, 1)

# Compact shell and normal composer.
rep('className="shrink-0 border-t border-[#59432c]/40 bg-[#17110d] p-3 sm:p-4"', 'className="shrink-0 border-t border-[#59432c]/40 bg-[#17110d] p-2 sm:px-3 sm:py-2"', "outer padding")
rep('className="relative h-24 overflow-hidden border border-[#60482e]/50 bg-[#0f0c09] transition focus-within:border-[#927047]"', 'className="relative h-[72px] overflow-hidden border border-[#60482e]/50 bg-[#0f0c09] transition focus-within:border-[#927047]"', "composer height")
rep('className="relative z-10 h-full w-full resize-none border-0 bg-transparent px-4 py-3 text-sm leading-6 text-[#d0bea1] outline-none placeholder:text-[#5f574d]"', 'className="relative z-10 h-full w-full resize-none border-0 bg-transparent px-3 py-2 text-[13px] leading-5 text-[#d0bea1] outline-none placeholder:text-[#5f574d]"', "composer padding")

# Instead of structurally moving the existing utility buttons (riskier), use CSS order:
# counter/status row becomes a compact overlay-style row, while the utility row uses negative top margin.
rep('className="mt-3 flex flex-wrap items-center justify-between gap-3"', 'className="mt-2 flex flex-wrap items-center justify-between gap-2"', "counter/send row")
rep('className="flex min-w-0 items-center gap-3"', 'className="flex min-w-0 items-center gap-2"', "counter inner row")
rep('className="shrink-0 text-[9px] uppercase tracking-[0.18em] text-[#685d50]"', 'className="shrink-0 text-[8px] uppercase tracking-[0.16em] text-[#685d50]"', "counter")

# Compact buttons.
text = text.replace('px-3 py-2 text-[8px] uppercase tracking-[0.13em]', 'px-2.5 py-1.5 text-[7px] uppercase tracking-[0.12em]')
rep('className="border border-[#85653c] bg-[#342617] px-6 py-3 text-xs uppercase tracking-[0.23em] text-[#efd4a0] transition hover:bg-[#4a351f] disabled:cursor-not-allowed disabled:opacity-40"', 'className="border border-[#85653c] bg-[#342617] px-4 py-2 text-[9px] uppercase tracking-[0.18em] text-[#efd4a0] transition hover:bg-[#4a351f] disabled:cursor-not-allowed disabled:opacity-40"', "Send Action")

# Pull utilities upward into the same visual band between counter and Send Action.
rep('className="mt-3 flex flex-wrap gap-2 border-t border-[#59432c]/30 pt-3"', 'className="-mt-9 mx-[105px] flex flex-wrap justify-center gap-1.5 border-0 pt-0 max-lg:mx-0 max-lg:mt-2 max-lg:border-t max-lg:border-[#59432c]/30 max-lg:pt-2"', "utility row")

# Compact footer.
rep('className="mt-1.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[8px] leading-4 text-[#756958]"', 'className="mt-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 text-[7px] leading-3 text-[#756958]"', "footer")

path.write_text(text, encoding="utf-8")
print(f"SUCCESS: updated {path}")
print("Desktop: counter left, utilities centred, Send Action right in one compact visual band.")
print("Below lg breakpoint the controls wrap normally for safety.")
print("Now run: npm run build")