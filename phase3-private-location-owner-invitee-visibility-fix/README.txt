SEPULCHRIA — PRIVATE LOCATION OWNER + INVITEE VISIBILITY FIX

This patch was built from the latest pushed repository.

CORRECT VISIBILITY RULE

A Private Location is visible by name and jumpable from presence UI for:
- STAFF
- its OWNER, while enabled
- an ACCEPTED / ACTIVE invited member

Everyone else:
- sees "Around Sepulchria"
- cannot search by the private room name
- has no Go -> button
- does not see the populated private-room card in the dashboard sidebar

The patch now uses context.privateLocations as the authoritative visibility list.
That list already contains:
- enabled owner room
- active invited-member rooms
- all enabled private rooms for staff

FIXED PLACES

1. People in Sepulchria modal
   Owner + active invitee now get the same room-name/search/Go visibility staff has.

2. Dashboard right sidebar -> People in Sepulchria
   Populated Private Location cards now appear to owner + active invitees too.

KICKED CHARACTERS
Once kicked, membership is no longer active, so the room disappears again.

INSTALL

1. Extract into the root of sepulchria-portal.

2. Run:

   py .\phase3-private-location-owner-invitee-visibility-fix\install.py

3. Run:

   npm run build

No Supabase SQL is required.
