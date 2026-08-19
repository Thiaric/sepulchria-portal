SEPULCHRIA — PHASE 2D FRIEND LIST EXISTING ENTRY FIX

FIXES

If Character B is already anywhere in Character A's Friend List:
- the In-Game / Off-Game selector disappears from B's character sheet
- the relationship selector disappears
- "Add to Friend List" disappears
- instead, the character sheet shows:

  ✓ In Friend List

Clicking it opens /friends so the existing record can be managed there.

A character counts as already in the Friend List if they exist in either:
- In-Game
- Off-Game

If you want the same character recorded in BOTH sections, add/manage the
second entry directly from /friends.

INSTALL

1. Extract this ZIP into the ROOT of sepulchria-portal.

2. From PowerShell in the project root run:

   py .\phase2d-friend-list-existing-entry-python-patch\install.py

3. Then run:

   npm run build

No Supabase SQL is required.

TEST

1. Use Character A with Friend List enabled.
2. Add Character B from /friends.
3. Open Character B's public character sheet.
4. Confirm the add selectors/button are gone.
5. Confirm you see "✓ In Friend List".
6. Click it and confirm it opens /friends.
7. Remove B from Friend List.
8. Return to B's character sheet.
9. The add controls should appear again.

If install.py reports "Expected code not found", send me the exact error.
