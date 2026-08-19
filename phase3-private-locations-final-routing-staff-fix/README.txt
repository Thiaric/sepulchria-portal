SEPULCHRIA — PRIVATE LOCATIONS FINAL ROUTING / STAFF VISIBILITY FIX

Built after analysing the latest pushed repository.

FIXES

1. CANONICAL ROUTE
   /private-locations
is now the real Private Locations page.

The old:
   /private-location
remains only as a compatibility redirect.

The internal system area:
   /areas/private-locations
remains unavailable and is NOT the user-facing page.

2. BACK FROM A PRIVATE ROOM
The normal game Back button now detects the system area.

Private room:
   <- Back to Private Locations
   -> /private-locations

Normal room:
   <- Back to <area>
   -> /areas/<area>

Both Back-button copies in the normal room interface are patched.

3. STAFF — PEOPLE IN SEPULCHRIA
The previous privacy fix hid Private Location names/jump controls from
EVERYBODY. This patch makes it role-aware.

Ordinary player:
- character inside private room still displays "Around Sepulchria"
- private room name is not searchable
- no Go -> jump control

Staff:
- sees the real Private Location name
- can search by that room name
- sees Go ->
- server-side access checker already allows staff to enter

4. STAFF — DASHBOARD RIGHT SIDEBAR
Private Location populated-room cards are hidden from normal players but are
shown to staff again, including the normal jump button.

5. /PRIVATE-LOCATIONS RIGHT CONTEXT BAR
The Private Locations navigator is now rendered on /private-locations rather
than belonging to /areas/private-locations.

It uses server-prepared privileged data so it cannot disagree with RLS.

Normal characters see only:
- their own enabled Private Location
- enabled Private Locations they have active invited membership in

Staff see:
- ALL enabled Private Locations

Each listed room has an Enter arrow.

6. DISABLED OWNERS
A Private Location whose OWNER has private_chat disabled is removed from:
- /private-locations accessible list
- /private-locations right context navigator
- staff's Private Locations navigator too

The data/room itself is preserved; it simply does not appear as an enabled
Private Location until staff enables the owner's feature again.

7. LEFT SIDEBAR
Staff always receive the Private Locations navigation link.
Normal owner/member visibility remains entitlement/membership based.
The link now targets /private-locations.

INSTALL

1. Extract this ZIP into the ROOT of sepulchria-portal.

2. Run:

   py .\phase3-private-locations-final-routing-staff-fix\install.py

3. Run:

   npm run build

NO SUPABASE SQL IS REQUIRED.

TEST MATRIX

STAFF
- Open People in Sepulchria while somebody is in an enabled Private Location.
  EXPECT: real room name + Go ->.
- Dashboard right "People in Sepulchria".
  EXPECT: populated Private Location card + jump.
- Open /private-locations.
  EXPECT: all ENABLED Private Locations in main page and right context.
- Enter one as staff.
  EXPECT: normal location.
- Back button.
  EXPECT: /private-locations.

NORMAL UNINVITED CHARACTER
- People modal for someone inside a Private Location:
  EXPECT: Around Sepulchria, no private room name, no Go ->.
- Private room must not appear in /private-locations unless invited.

NORMAL INVITED CHARACTER
- Accepted/active membership:
  EXPECT: room appears in /private-locations and its right context.
- Kick:
  EXPECT: room disappears and direct re-entry stays blocked.

DISABLED OWNER
- Disable private_chat for owner.
  EXPECT:
  - owner's room disappears from /private-locations
  - disappears from right context
  - does not appear in staff's enabled Private Locations navigator
- Re-enable:
  EXPECT room reappears; no recreation required.
