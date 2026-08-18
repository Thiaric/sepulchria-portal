SEPULCHRIA — ECONOMY 1

Implements:
- 100 Remnants starting balance for every character.
- Immutable ledger.
- No ordinary negative balances.
- Staff +/- adjustments with mandatory reason on Admin > Character.
- Own Character > In Short wallet + recent activity.
- Odd Jobs Bureau special room.
- One Odd Job total per character per UK day.
- Each job pays one stored random daily rate from 10–50 Remnants.
- Same rates for all characters until UK midnight.
- Atomic claim + wallet credit + ledger.
- Database protection against double claims.

ORDER:
1. Run 01_SUPABASE_ECONOMY_1.sql in Supabase SQL Editor.
2. Create the Location named exactly: Odd Jobs Bureau
3. Confirm its slug is: odd-jobs-bureau
4. Extract this folder into repository root.
5. Run:
   py .\economy-1-remnants-odd-jobs\install.py
   npm run build

Seeded jobs:
Farming, Woodcutting, Dock Work, Stable Hand, Courier Work,
Warehouse Sorting, Street Cleaning, Kitchen Help.
