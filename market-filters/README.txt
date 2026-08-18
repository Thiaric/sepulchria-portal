SEPULCHRIA — COMPACT MARKET FILTERS

Adds compact filters inside every shop:
- Search name/description
- Category
- Subcategory
- Quality
- Usable / Equippable / Both
- From R / To R
- Mus / Dex / Vig / Shr / Bra / Pre / HP / Max HP
- In stock only
- Affordable only (uses current Remnants balance)
- Reset
- Live result count

Multiple effect checkboxes use AND logic:
Mus + Dex = Item must affect both.

No SQL required.

Install:
  py .\market-filters\install.py
  npm run build
