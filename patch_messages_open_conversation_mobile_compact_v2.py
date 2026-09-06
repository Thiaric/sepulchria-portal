from pathlib import Path
import shutil

ROOT = Path.cwd()
path = ROOT / "app" / "(portal)" / "messages" / "[id]" / "components" / "ConversationMessageList.tsx"

if not path.exists():
    raise SystemExit("Run this from the sepulchria-portal repo root.")

text = path.read_text(encoding="utf-8")

def replace_exact(old, new, expected, label):
    global text
    count = text.count(old)
    if count != expected:
        raise SystemExit(
            f"STOP: {label}: expected {expected} match(es), found {count}. No files changed."
        )
    text = text.replace(old, new, expected)

replace_exact(
    '      <section className="border-b border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-120e0b))] p-3 sm:px-4">',
    '      <section className="border-b border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-120e0b))] p-2 sm:p-3 sm:px-4">',
    1,
    "filter section",
)

replace_exact(
    '        <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_135px_135px_135px_auto]">',
    '        <div className="grid grid-cols-3 gap-1.5 sm:gap-2 lg:grid-cols-[minmax(0,1fr)_135px_135px_135px_auto]">',
    1,
    "filter grid",
)

replace_exact(
    '          <label className="grid gap-1">\n          <span className="text-[7px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-716350))]">\n              Search',
    '          <label className="col-span-3 grid gap-0.5 sm:gap-1 lg:col-span-1">\n          <span className="text-[6px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-716350))] sm:text-[7px] sm:tracking-[0.15em]">\n              Search',
    1,
    "search label",
)

replace_exact(
    '            className="min-w-0 border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0d0907))] px-3 py-2 text-xs text-[rgb(var(--sep-colour-d7c4a5))] outline-none placeholder:text-[rgb(var(--sep-colour-625747))] focus:border-[rgb(var(--sep-colour-a17a49))] [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"',
    '            className="min-w-0 border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0d0907))] px-2.5 py-1.5 text-[11px] text-[rgb(var(--sep-colour-d7c4a5))] outline-none placeholder:text-[rgb(var(--sep-colour-625747))] focus:border-[rgb(var(--sep-colour-a17a49))] sm:px-3 sm:py-2 sm:text-xs [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"',
    1,
    "search input",
)

replace_exact(
    '          <label className="grid gap-1">\n<span className="text-[7px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-716350))]">\n              Search',
    '          <label className="grid gap-0.5 sm:gap-1">\n<span className="text-[6px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-716350))] sm:text-[7px] sm:tracking-[0.15em]">\n              Type',
    1,
    "type label",
)

replace_exact(
    '            className="border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0d0907))] px-3 py-2 text-xs text-[rgb(var(--sep-colour-cdbb9f))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))]"',
    '            className="min-w-0 border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0d0907))] px-2 py-1.5 text-[10px] text-[rgb(var(--sep-colour-cdbb9f))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))] sm:px-3 sm:py-2 sm:text-xs"',
    1,
    "type select",
)

replace_exact(
    '          <label className="grid gap-1">\n            <span className="text-[7px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-716350))]">\n              From',
    '          <label className="grid gap-0.5 sm:gap-1">\n            <span className="text-[6px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-716350))] sm:text-[7px] sm:tracking-[0.15em]">\n              From',
    1,
    "From label",
)

replace_exact(
    '          <label className="grid gap-1">\n            <span className="text-[7px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-716350))]">\n              To',
    '          <label className="grid gap-0.5 sm:gap-1">\n            <span className="text-[6px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-716350))] sm:text-[7px] sm:tracking-[0.15em]">\n              To',
    1,
    "To label",
)

replace_exact(
    '              className="border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0d0907))] px-2 py-2 text-[10px] text-[rgb(var(--sep-colour-cdbb9f))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))]"',
    '              className="min-w-0 border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0d0907))] px-1.5 py-1.5 text-[9px] text-[rgb(var(--sep-colour-cdbb9f))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))] sm:px-2 sm:py-2 sm:text-[10px]"',
    2,
    "date inputs",
)

replace_exact(
    '          <div className="flex items-end gap-2">\n            {hasFilters ? (',
    '          <div className="col-span-3 flex items-end gap-1.5 lg:col-span-1 lg:gap-2">\n            {hasFilters ? (',
    1,
    "clear filters row",
)

replace_exact(
    '        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-[rgb(var(--sep-colour-59432c))]/25 pt-2">',
    '        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-1.5 border-t border-[rgb(var(--sep-colour-59432c))]/25 pt-1.5 sm:mt-2 sm:gap-2 sm:pt-2">',
    1,
    "bulk row",
)

backup = path.with_suffix(".tsx.before_mobile_open_conversation_compact.bak")
if not backup.exists():
    shutil.copy2(path, backup)

path.write_text(text, encoding="utf-8")

print("DONE")
print("Open conversation mobile filters compacted.")
print("Search full-width; Type / From / To share one row.")
print("Now run: npm run build")
