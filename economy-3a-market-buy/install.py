from pathlib import Path

ROOT = Path.cwd()
HERE = Path(__file__).resolve().parent

if not (ROOT / "package.json").exists():
    raise SystemExit(
        "ERROR: Run from the sepulchria-portal repository root."
    )

def write_payload(source_name, destination):
    path = ROOT / destination
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        (HERE / source_name).read_text(encoding="utf-8"),
        encoding="utf-8",
    )

write_payload(
    "currency.ts.txt",
    "lib/economy/currency.ts",
)
write_payload(
    "actions.ts.txt",
    "app/(portal)/market/actions.ts",
)
write_payload(
    "market-catalogue.tsx.txt",
    "components/market/market-catalogue.tsx",
)

def patch(path, old, new, label):
    target = ROOT / path
    text = target.read_text(encoding="utf-8")

    if new in text:
        return

    if old not in text:
        raise SystemExit(
            f"ERROR: Could not find current block: {label}"
        )

    target.write_text(
        text.replace(old, new, 1),
        encoding="utf-8",
    )

# ---------------------------------------------------------
# Character wallet — central currency formatting.
# ---------------------------------------------------------
patch(
    "components/characters/character-remnants-wallet.tsx",
    'import { createClient } from "@/lib/supabase/server";\n',
    'import { createClient } from "@/lib/supabase/server";\n'
    'import { formatRemnants, formatSignedRemnants } from "@/lib/economy/currency";\n',
    "character wallet currency import",
)

patch(
    "components/characters/character-remnants-wallet.tsx",
    '{balance.toLocaleString("en-GB")}',
    '{formatRemnants(balance)}',
    "character wallet balance",
)

patch(
    "components/characters/character-remnants-wallet.tsx",
    '{Number(entry.amount) > 0 ? "+" : ""}{Number(entry.amount).toLocaleString("en-GB")}',
    '{formatSignedRemnants(Number(entry.amount))}',
    "character wallet ledger amount",
)

# ---------------------------------------------------------
# Admin wallet.
# ---------------------------------------------------------
patch(
    "components/admin/admin-character-remnants.tsx",
    'import { createClient } from "@/lib/supabase/server";\n',
    'import { createClient } from "@/lib/supabase/server";\n'
    'import { formatRemnants, formatSignedRemnants } from "@/lib/economy/currency";\n',
    "admin wallet currency import",
)

patch(
    "components/admin/admin-character-remnants.tsx",
    '{balance.toLocaleString("en-GB")}',
    '{formatRemnants(balance)}',
    "admin wallet balance",
)

patch(
    "components/admin/admin-character-remnants.tsx",
    '{Number(entry.amount) > 0 ? "+" : ""}{Number(entry.amount)}',
    '{formatSignedRemnants(Number(entry.amount))}',
    "admin ledger amount",
)

patch(
    "components/admin/admin-character-remnants.tsx",
    'Balance {Number(entry.balance_after)}',
    'Balance {formatRemnants(Number(entry.balance_after))}',
    "admin balance after",
)

# ---------------------------------------------------------
# Odd Jobs.
# ---------------------------------------------------------
patch(
    "app/(portal)/game/components/OddJobsPanel.tsx",
    'import { workOddJob } from "../odd-jobs-actions";\n',
    'import { workOddJob } from "../odd-jobs-actions";\n'
    'import { formatRemnants } from "@/lib/economy/currency";\n',
    "Odd Jobs currency import",
)

patch(
    "app/(portal)/game/components/OddJobsPanel.tsx",
    '{Number(first.wallet_balance).toLocaleString("en-GB")} Remnants',
    '{formatRemnants(Number(first.wallet_balance))}',
    "Odd Jobs wallet",
)

patch(
    "app/(portal)/game/components/OddJobsPanel.tsx",
    '{first.claimed_pay !== null ? ` (+${first.claimed_pay} Remnants)` : ""}',
    '{first.claimed_pay !== null ? ` (+${formatRemnants(first.claimed_pay)})` : ""}',
    "Odd Jobs claimed pay",
)

patch(
    "app/(portal)/game/components/OddJobsPanel.tsx",
    '{job.pay} R',
    '{formatRemnants(job.pay)}',
    "Odd Jobs current pay",
)

patch(
    "app/(portal)/game/components/OddJobsPanel.tsx",
    'Started {job.starting_pay} R',
    'Started {formatRemnants(job.starting_pay)}',
    "Odd Jobs starting pay",
)

print("SUCCESS")
print("Currency symbol centralised as 🝈 and Market purchasing installed.")
print("IMPORTANT: run 01_MARKET_PURCHASES.sql in Supabase before testing Buy.")
print("Then run: npm run build")
