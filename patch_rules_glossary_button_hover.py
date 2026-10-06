from pathlib import Path

PATH = Path("components/rules/public-rules.tsx")

def die(msg: str) -> None:
    raise SystemExit(f"ERROR: {msg}\nNo changes were made.")

if not PATH.exists():
    die(f"{PATH} not found. Run this from the repository root.")

text = PATH.read_text(encoding="utf-8")

replacements = [
    (
        '"border-[rgb(var(--sep-colour-9a7445))] bg-[rgb(var(--sep-colour-302115))] text-[rgb(var(--sep-colour-e7c996))]"',
        '"border-[rgb(var(--sep-colour-9a7445))] bg-[rgb(var(--sep-colour-302115))] text-[rgb(var(--sep-colour-e7c996))] hover:bg-[rgb(var(--sep-skin-c1)/0.16)]"',
        "active glossary toggle",
    ),
    (
        '"border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] text-[rgb(var(--sep-colour-9f8d71))] hover:border-[rgb(var(--sep-colour-8c693e))] hover:text-[rgb(var(--sep-colour-d6b782))]"',
        '"border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] text-[rgb(var(--sep-colour-9f8d71))] hover:border-[rgb(var(--sep-skin-c1))] hover:bg-[rgb(var(--sep-skin-c1)/0.12)] hover:text-[rgb(var(--sep-skin-c1))]"',
        "inactive glossary toggle",
    ),
    (
        '"border-[rgb(var(--sep-colour-8c693e))] bg-[rgb(var(--sep-colour-2a1d12))] text-[rgb(var(--sep-colour-dfc28f))]"',
        '"border-[rgb(var(--sep-colour-8c693e))] bg-[rgb(var(--sep-colour-2a1d12))] text-[rgb(var(--sep-colour-dfc28f))] hover:bg-[rgb(var(--sep-skin-c1)/0.16)]"',
        "active handbook category",
    ),
    (
        '"border-[rgb(var(--sep-colour-4f3b28))]/45 bg-[rgb(var(--sep-colour-15100d))] text-[rgb(var(--sep-colour-776a58))] hover:border-[rgb(var(--sep-colour-765937))] hover:text-[rgb(var(--sep-colour-bca47e))]"',
        '"border-[rgb(var(--sep-colour-4f3b28))]/45 bg-[rgb(var(--sep-colour-15100d))] text-[rgb(var(--sep-colour-776a58))] hover:border-[rgb(var(--sep-skin-c1))] hover:bg-[rgb(var(--sep-skin-c1)/0.12)] hover:text-[rgb(var(--sep-skin-c1))]"',
        "inactive handbook category",
    ),
    (
        '"border-[rgb(var(--sep-colour-8d693e))] bg-[rgb(var(--sep-colour-2a1d12))]"',
        '"border-[rgb(var(--sep-colour-8d693e))] bg-[rgb(var(--sep-colour-2a1d12))] hover:bg-[rgb(var(--sep-skin-c1)/0.16)]"',
        "selected handbook entry",
    ),
    (
        '"border-transparent bg-[rgb(var(--sep-colour-100c09))]/55 hover:border-[rgb(var(--sep-colour-59432c))]/55 hover:bg-[rgb(var(--sep-colour-19120d))]"',
        '"border-transparent bg-[rgb(var(--sep-colour-100c09))]/55 hover:border-[rgb(var(--sep-skin-c1))]/70 hover:bg-[rgb(var(--sep-skin-c1)/0.12)]"',
        "unselected handbook entry",
    ),
    (
        'className="border border-[rgb(var(--sep-colour-59432c))]/50 bg-[rgb(var(--sep-colour-17110d))] px-3 py-2 text-xs text-[rgb(var(--sep-colour-b59e78))] transition hover:border-[rgb(var(--sep-colour-8c693e))] hover:text-[rgb(var(--sep-colour-e2c58f))] components_rules_public_rules_button_action_2"',
        'className="border border-[rgb(var(--sep-colour-59432c))]/50 bg-[rgb(var(--sep-colour-17110d))] px-3 py-2 text-xs text-[rgb(var(--sep-colour-b59e78))] transition hover:border-[rgb(var(--sep-skin-c1))] hover:bg-[rgb(var(--sep-skin-c1)/0.12)] hover:text-[rgb(var(--sep-skin-c1))] components_rules_public_rules_button_action_2"',
        "related handbook entry button",
    ),
    (
        'className="mt-3 text-[8px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-9a7547))] hover:text-[rgb(var(--sep-colour-dfbd84))] components_rules_public_rules_button_related_rule"',
        'className="mt-3 border border-transparent px-2 py-1 text-[8px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-9a7547))] transition hover:border-[rgb(var(--sep-skin-c1))]/70 hover:bg-[rgb(var(--sep-skin-c1)/0.12)] hover:text-[rgb(var(--sep-skin-c1))] components_rules_public_rules_button_related_rule"',
        "glossary related-rule button",
    ),
]

for old, _, label in replacements:
    count = text.count(old)
    if count != 1:
        die(f"Could not uniquely find {label} (matches: {count}).")

new_text = text
for old, new, _ in replacements:
    new_text = new_text.replace(old, new, 1)

PATH.write_text(new_text, encoding="utf-8")

print("SUCCESS")
print(f"Updated: {PATH}")
print("Added visible skin-aware hover backgrounds/borders to handbook and glossary buttons.")
print("Next: npm run build")
