SEPULCHRIA — PRIVATE LOCATION THEME TYPE HOTFIX

Fixes the TypeScript error:

Property 'text_colour' is missing...

The query was correctly changed to the new palette fields, but the local
theme variable was still typed using the old:
- background_colour
- text_colour

This hotfix updates the type to:
- background_colour
- speech_colour
- action_colour
- system_colour
- whisper_background_colour
- whisper_text_colour
- offgame_background_colour
- offgame_text_colour

INSTALL

1. Extract into the root of sepulchria-portal.

2. Run:

   py .\phase3-private-location-theme-type-hotfix\install.py

3. Run:

   npm run build

No Supabase SQL is required.
