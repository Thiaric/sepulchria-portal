from pathlib import Path
import subprocess
import shutil

ROOT = Path.cwd()

def git(*args):
    return subprocess.check_output(
        ["git", *args],
        cwd=ROOT,
        text=True,
    ).strip()

head = git("rev-parse", "HEAD")

path = ROOT / "app" / "(portal)" / "messages" / "[id]" / "components" / "ConversationMessageList.tsx"

if not path.exists():
    raise SystemExit(
        "Could not find app/(portal)/messages/[id]/components/ConversationMessageList.tsx"
    )

text = path.read_text(encoding="utf-8")

replacements = [
(
'''      <section className="border-b border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-120e0b))] p-3 sm:px-4">''',
'''      <section className="border-b border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-120e0b))] p-2 sm:p-3 sm:px-4">''',
"filter section padding",
),
(
'''        <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_135px_135px_135px_auto]">''',
'''        <div className="grid grid-cols-3 gap-1.5 sm:gap-2 lg:grid-cols-[minmax(0,1fr)_135px_135px_135px_auto]">''',
"mobile filter grid",
),
(
'''          <label className="grid gap-1">
          <span className="text-[7px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-716350))]">''',
'''          <label className="col-span-3 grid gap-0.5 sm:gap-1 lg:col-span-1">
          <span className="text-[6px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-716350))] sm:text-[7px] sm:tracking-[0.15em]">''',
"search label",
),
(
'''            className="min-w-0 border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0d0907))] px-3 py-2 text-xs text-[rgb(var(--sep-colour-d7c4a5))] outline-none placeholder:text-[rgb(var(--sep-colour-625747))] focus:border-[rgb(var(--sep-colour-a17a49))] [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"''',
'''            className="min-w-0 border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0d0907))] px-2.5 py-1.5 text-[11px] text-[rgb(var(--sep-colour-d7c4a5))] outline-none placeholder:text-[rgb(var(--sep-colour-625747))] focus:border-[rgb(var(--sep-colour-a17a49))] sm:px-3 sm:py-2 sm:text-xs [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"''',
"search input",
),
(
'''          <label className="grid gap-1">
<span className="text-[7px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-716350))]">''',
'''          <label className="grid gap-0.5 sm:gap-1">
<span className="text-[6px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-716350))] sm:text-[7px] sm:tracking-[0.15em]">''',
"type label",
),
(
'''            className="border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0d0907))] px-3 py-2 text-xs text-[rgb(var(--sep-colour-cdbb9f))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))]"''',
'''            className="min-w-0 border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0d0907))] px-2 py-1.5 text-[10px] text-[rgb(var(--sep-colour-cdbb9f))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))] sm:px-3 sm:py-2 sm:text-xs"''',
"type select",
),
(
'''          <label className="grid gap-1">
            <span className="text-[7px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-716350))]">
              From''',
'''          <label className="grid gap-0.5 sm:gap-1">
            <span className="text-[6px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-716350))] sm:text-[7px] sm:tracking-[0.15em]">
              From''',
"from label",
),
(
'''              className="border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0d0907))] px-2 py-2 text-[10px] text-[rgb(var(--sep-colour-cdbb9f))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))]"''',
'''              className="min-w-0 border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0d0907))] px-1.5 py-1.5 text-[9px] text-[rgb(var(--sep-colour-cdbb9f))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))] sm:px-2 sm:py-2 sm:text-[10px]"''',
"from input",
),
(
'''          <label className="grid gap-1">
            <span className="text-[7px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-716350))]">
              To''',
'''          <label className="grid gap-0.5 sm:gap-1">
            <span className="text-[6px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-716350))] sm:text-[7px] sm:tracking-[0.15em]">
              To''',
"to label",
),
(
'''          <div className="flex items-end gap-2">''',
'''          <div className="col-span-3 flex items-end gap-1.5 lg:col-span-1 lg:gap-2">''',
"clear filters row",
),
(
'''                className="h-9 border border-[rgb(var(--sep-colour-59432c))] px-3 text-[8px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-9e8767))] transition hover:border-[rgb(var(--sep-colour-80613c))] hover:text-[rgb(var(--sep-colour-d5ba8c))]"''',
'''                className="h-7 border border-[rgb(var(--sep-colour-59432c))] px-2 text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-9e8767))] transition hover:border-[rgb(var(--sep-colour-80613c))] hover:text-[rgb(var(--sep-colour-d5ba8c))] sm:h-9 sm:px-3 sm:text-[8px] sm:tracking-[0.15em]"''',
"clear filters button",
),
(
'''        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-[rgb(var(--sep-colour-59432c))]/25 pt-2">''',
'''        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-1.5 border-t border-[rgb(var(--sep-colour-59432c))]/25 pt-1.5 sm:mt-2 sm:gap-2 sm:pt-2">''',
"bulk row spacing",
),
(
'''            <p className="text-[8px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-6f6253))]">''',
'''            <p className="text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-6f6253))] sm:text-[8px] sm:tracking-[0.15em]">''',
"visible count",
),
]

for old, new, label in replacements:
    count = text.count(old)
    if count != 1:
        raise SystemExit(
            f"STOP: {label}: expected 1 match, found {count}. No files were changed."
        )
    text = text.replace(old, new, 1)

backup = path.with_suffix(".tsx.before_mobile_open_conversation_compact.bak")
if not backup.exists():
    shutil.copy2(path, backup)

path.write_text(text, encoding="utf-8")

print("DONE")
print()
print("Compact mobile open-conversation filters:")
print("  - Search stays full-width")
print("  - Type / From / To share one row")
print("  - Clear Filters stays compact")
print("  - shorter labels and controls")
print("  - bulk row tightened")
print("  - desktop layout preserved")
print()
print(f"Current HEAD: {head[:12]}")
print("Now run: npm run build")
