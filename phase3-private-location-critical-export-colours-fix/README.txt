SEPULCHRIA — CRITICAL COLOURS + EXPORT PALETTE FIX

This patch fixes two things only.

1. LIVE PRIVATE LOCATION CHAT

Natural 20:
- keeps the existing CRITICAL SUCCESS green background/text treatment.

Natural 1:
- keeps the existing CRITICAL FAILURE red background/text treatment.

The owner's custom "Dice / Skills / Feats" colour applies ONLY to normal
system results.

It no longer overrides Natural 20 / Natural 1.

2. EXPORTED CHAT

The HTML Export now uses the Private Location's saved palette for:

- Chat background
- Spoken text
- Action text
- Dice / Skills / Feats
- Whisper background
- Whisper text
- Off-Game background
- Off-Game text

Whisper and Off-Game retain their existing layout/borders/header structure.

Critical conditional formatting is preserved in export:

- Natural 20 = existing green critical-success formatting
- Natural 1 = existing red critical-failure formatting

Those critical colours explicitly override the owner's normal system colour.

THE VOICE OF FATE

Still completely untouched.
The export Fate CSS is not changed by the Private Location palette.

INSTALL

1. Extract into the root of sepulchria-portal.

2. Run:

   py .\phase3-private-location-critical-export-colours-fix\install.py

3. Run:

   npm run build

NO SUPABASE SQL IS REQUIRED.

TEST

Inside a Private Location:

1. Choose a very obvious Dice / Skills / Feats colour.
2. Roll a normal result.
   EXPECT: chosen system colour.
3. Roll Natural 20.
   EXPECT: green critical-success colour, NOT chosen system colour.
4. Roll Natural 1.
   EXPECT: red critical-failure colour, NOT chosen system colour.
5. Export Role.
6. Open exported HTML.
7. Confirm normal Private Location palette is present.
8. Confirm Natural 20 / Natural 1 remain green/red.
9. Confirm Fate remains standard/unmodified.
