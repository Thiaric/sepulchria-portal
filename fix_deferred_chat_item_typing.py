from pathlib import Path

ROOT = Path.cwd()
rel = "app/(portal)/game/deferred-actions.ts"
path = ROOT / rel

if not path.exists():
    raise SystemExit(f"Missing expected file: {rel}")

text = path.read_text(encoding="utf-8")

old = '''  return candidates
    .map((row) => {
'''

new = '''  const preparedItems: Array<DeferredChatItem | null> =
    candidates.map((row) => {
'''

if old not in text:
    raise SystemExit("Could not locate items map block.")

text = text.replace(old, new, 1)

old = '''    })
    .filter((item): item is DeferredChatItem => item !== null);
}

async function giftsFor(
'''

new = '''    });

  return preparedItems.filter(
    (item): item is DeferredChatItem =>
      item !== null,
  );
}

async function giftsFor(
'''

if old not in text:
    raise SystemExit("Could not locate items filter block.")

text = text.replace(old, new, 1)

path.write_text(text, encoding="utf-8")

print("Fixed DeferredChatItem null-filter typing.")
print("Next: npm run build")
