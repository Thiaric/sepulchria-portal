from pathlib import Path

def read(path):
    p = Path(path)
    if not p.exists():
        raise SystemExit(f"Missing {path}. Run from repo root.")
    return p.read_text(encoding="utf-8")

def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 match, found {count}.")
    return text.replace(old, new, 1)

files = {}

# ------------------------------------------------------------------
# PLAYER EXPERIENCE MODAL
# Smaller buttons + softer vocabulary text.
# ------------------------------------------------------------------
path = "components/experience/experience-logout-guard.tsx"
text = read(path)

text = replace_once(
    text,
    'className="border border-[rgb(var(--sep-colour-6a5437))] px-3 py-2 text-sm text-[rgb(var(--sep-colour-cfb486))] [transform:none!important]"',
    'className="border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-15100d))] px-2.5 py-1.5 text-[10px] tracking-[0.08em] text-[rgb(var(--sep-colour-a99b89))] transition-colors hover:border-[rgb(var(--sep-colour-876a46))] hover:text-[rgb(var(--sep-colour-c9b184))] [transform:none!important]"',
    "Skip comment compact vocabulary",
)

text = replace_once(
    text,
    'className="border border-[rgb(var(--sep-colour-d2aa63))] bg-[rgb(var(--sep-colour-2a1e14))] px-3 py-2 text-sm text-[rgb(var(--sep-colour-f1ddb4))] [transform:none!important]"',
    'className="border border-[rgb(var(--sep-colour-765937))]/65 bg-[rgb(var(--sep-colour-21170f))] px-2.5 py-1.5 text-[10px] tracking-[0.08em] text-[rgb(var(--sep-colour-c9b184))] transition-colors hover:border-[rgb(var(--sep-colour-a07945))] hover:text-[rgb(var(--sep-colour-dec89f))] [transform:none!important]"',
    "Send feedback compact vocabulary",
)

text = replace_once(
    text,
    'className="border border-[rgb(var(--sep-colour-6a5437))] px-3 py-1.5 text-xs text-[rgb(var(--sep-colour-cfb486))] [transform:none!important]"',
    'className="border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-15100d))] px-2.5 py-1 text-[10px] tracking-[0.08em] text-[rgb(var(--sep-colour-8f806c))] transition-colors hover:border-[rgb(var(--sep-colour-876a46))] hover:text-[rgb(var(--sep-colour-bca27b))] [transform:none!important]"',
    "Skip compact vocabulary",
)

# Soften negative-comment panel copy.
text = text.replace(
    'text-sm text-[rgb(var(--sep-colour-efd6a3))]',
    'text-sm text-[rgb(var(--sep-colour-c9b184))]',
)
text = text.replace(
    'text-[11px] text-[rgb(var(--sep-colour-8d775b))]',
    'text-[11px] text-[rgb(var(--sep-colour-8f806c))]',
)

files[path] = text

# ------------------------------------------------------------------
# ADMIN EXPERIENCE PAGE
# Remove bright/white-looking text + borders, keep large containers static.
# ------------------------------------------------------------------
path = "app/(portal)/admin/experience/page.tsx"
text = read(path)

# General body/table text.
text = text.replace(
    'text-[rgb(var(--sep-colour-d7c4a5))]',
    'text-[rgb(var(--sep-colour-a99b89))]',
)
text = text.replace(
    'text-[rgb(var(--sep-colour-efd6a3))]',
    'text-[rgb(var(--sep-colour-dec89f))]',
)
text = text.replace(
    'text-[rgb(var(--sep-colour-c7b493))]',
    'text-[rgb(var(--sep-colour-a99b89))]',
)
text = text.replace(
    'text-[rgb(var(--sep-colour-bca788))]',
    'text-[rgb(var(--sep-colour-9d8d79))]',
)

# Soften utility/secondary text.
text = text.replace(
    'text-[rgb(var(--sep-colour-8d775b))]',
    'text-[rgb(var(--sep-colour-756957))]',
)
text = text.replace(
    'text-[rgb(var(--sep-colour-806b50))]',
    'text-[rgb(var(--sep-colour-756957))]',
)

# Tone down percentage/stat values slightly.
text = text.replace(
    'text-[rgb(var(--sep-colour-dec69a))]',
    'text-[rgb(var(--sep-colour-b79c73))]',
)

# Make table lines unmistakably portal-muted instead of near-white.
text = text.replace(
    'border-[rgb(var(--sep-colour-4c3c2b))]',
    'border-[rgb(var(--sep-colour-60482e))]/35',
)
text = text.replace(
    'border-[rgb(var(--sep-colour-241b14))]',
    'border-[rgb(var(--sep-colour-60482e))]/25',
)

# User names should still read clearly but not white.
text = text.replace(
    'font-medium text-[rgb(var(--sep-colour-efd6a3))]',
    'font-medium text-[rgb(var(--sep-colour-c9b184))]',
)

# Recent comments empty state/body.
text = text.replace(
    'text-sm text-[rgb(var(--sep-colour-8d775b))]',
    'text-sm text-[rgb(var(--sep-colour-756957))]',
)

files[path] = text

# ------------------------------------------------------------------
# LIVE FILTER COMPONENT
# Make filter text less bright and Reset more compact.
# ------------------------------------------------------------------
path = "components/admin/experience-live-filters.tsx"
text = read(path)

text = text.replace(
    'text-[rgb(var(--sep-colour-d7c4a5))]',
    'text-[rgb(var(--sep-colour-a99b89))]',
)
text = text.replace(
    'text-[rgb(var(--sep-colour-cdb58e))]',
    'text-[rgb(var(--sep-colour-a99b89))]',
)
text = text.replace(
    'text-[rgb(var(--sep-colour-efd6a3))]',
    'text-[rgb(var(--sep-colour-c9b184))]',
)

text = replace_once(
    text,
    'px-3 py-2 text-[10px] tracking-[0.08em]',
    'px-2.5 py-1.5 text-[9px] tracking-[0.08em]',
    "Reset button compact",
)

files[path] = text

# ------------------------------------------------------------------
# EXPERIENCE RIGHT SIDEBAR
# Softer text colours, static containers preserved.
# ------------------------------------------------------------------
path = "components/portal/admin-context-panel.tsx"
text = read(path)

# Limit changes to the Experience block only.
start_marker = '  if (mode === "experience") {'
end_marker = '  if (mode === "trophies") {'
start = text.find(start_marker)
end = text.find(end_marker, start)

if start == -1 or end == -1:
    raise SystemExit("Experience context block not found.")

block = text[start:end]

block = block.replace(
    'text-[rgb(var(--sep-colour-d8bf91))]',
    'text-[rgb(var(--sep-colour-c9b184))]',
)
block = block.replace(
    'text-[rgb(var(--sep-colour-8f8271))]',
    'text-[rgb(var(--sep-colour-756957))]',
)
block = block.replace(
    'text-[rgb(var(--sep-colour-b8aa96))]',
    'text-[rgb(var(--sep-colour-9d8d79))]',
)
block = block.replace(
    'text-[rgb(var(--sep-colour-a88658))]',
    'text-[rgb(var(--sep-colour-876a46))]',
)
block = block.replace(
    'border-[rgb(var(--sep-colour-59432c))]/45',
    'border-[rgb(var(--sep-colour-60482e))]/35',
)

text = text[:start] + block + text[end:]
files[path] = text

# Write only after all exact matchers succeeded.
for path, text in files.items():
    Path(path).write_text(text, encoding="utf-8")
    print("✓", path)

print("\\nExperience colour/button refinement installed.")
print("No SQL changes required.")
print("Run: npm run build")
