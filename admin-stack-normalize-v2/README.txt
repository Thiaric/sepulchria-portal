SEPULCHRIA — ADMIN STACK NORMALISATION V2

Built against the latest pushed admin inventory actions.

Adds canonical stack consolidation after:
- Admin > Character > Inventory > Grant Item
- Admin > Character > Inventory > Remove Item / partial quantity

Examples with max_stack 10:

10 + 5, Grant 3
=> 10 + 8

10 + 10 + 1, Remove 3
=> 10 + 8

Containers and bespoke Unique Items are not merged.

PREREQUISITE
This uses public._normalize_character_inventory_stacks(uuid), which was created
by the previous 01_STACK_NORMALIZE_EVERYWHERE.sql.

INSTALL
1. Supabase: run 01_ADMIN_STACK_NORMALIZE.sql
2. Extract this folder into repository root
3. Run:
   py .\admin-stack-normalize-v2\install.py
   npm run build
