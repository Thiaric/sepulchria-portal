SEPULCHRIA — ADMIN ORDINARY CONTAINERS

Fixes /admin/characters/[id]/inventory.

- Containers now appear in normal Grant Item dropdown.
- Quantity works.
- Internally each still gets one instance row so it can contain Items.
- Ordinary Containers display under Standard Items.
- They are removed from the bespoke Unique list.
- Unique panel is clarified as Bespoke Unique Item.

No SQL required.

Run:
  py .\admin-containers-as-standard\install.py
  npm run build
