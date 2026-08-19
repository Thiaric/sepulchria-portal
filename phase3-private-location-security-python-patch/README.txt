SEPULCHRIA — PRIVATE LOCATION ACCESS / PRIVACY FIX

This patch was built after analysing the pushed repository.

WHAT IT FIXES

1. SERVER-SIDE JUMP PROTECTION
All direct jumps through enterRoomFromMap now check Private Location access.
This protects:
- world/area Enter actions
- People in Sepulchria "Go" actions
- dashboard location join actions
- any other UI that calls enterRoomFromMap
- manually forged calls to the same server action

Access is granted only when:
- authenticated account is staff, OR
- character owns the room AND owner's private_chat entitlement is enabled, OR
- character has active invited membership AND owner's private_chat entitlement is enabled

A kicked member has status=kicked and therefore cannot re-enter until a
new invitation restores active membership.

2. CONNECTED MOVEMENT PROTECTION
moveCharacter also checks its destination in case a Private Location is ever
connected to another room.

3. ALL ROOM ACTIONS BLOCKED FOR AN UNAUTHORISED OCCUPANT
getOwnedCharacter now sanitises current_room_id to null if the character is
sitting in a Private Location they cannot access.

Because the game actions share getOwnedCharacter, this prevents unauthorised:
- room writing
- whispers
- Feat/Gift use
- rolls and other room actions that depend on current_room_id
- movement through normal room connections

They can still use a legitimate public-map Enter action to escape the invalid
room state.

4. /GAME REALLY IS BLANK
The old /game check used the normal RLS client to ask whether the room was
private. For an unauthorised character RLS could hide the metadata, making the
code believe it was a normal room.

The new checker uses the privileged server client and therefore always knows
whether the room is private.

5. RIGHT SIDEBAR IS ALSO BLANK
When an unauthorised character is physically assigned to a Private Location
and opens /game, the entire right context sidebar is suppressed:
- no Current Location card
- no location name/image
- no Info button
- no Game Context / present characters
- no exits
- no Instant Chat dock

The centre /game content is already blanked by the same authoritative access
decision.

6. PEOPLE IN SEPULCHRIA — RIGHT DASHBOARD CONTEXT
Private Locations are completely omitted as populated-room cards.
Their room name and join button no longer appear there.

7. PEOPLE IN SEPULCHRIA — LARGE PRESENCE POPUP
Characters who happen to be inside a Private Location can remain part of the
city-presence count/list, but:
- the private room name is not shown
- it cannot be searched by private room name
- there is no Go -> button for it
- it displays the existing neutral "Around Sepulchria" location text instead

INSTALL

1. Extract ZIP into the ROOT of sepulchria-portal.

2. Run:
   py .\phase3-private-location-security-python-patch\install.py

3. Run:
   npm run build

NO SUPABASE SQL IS REQUIRED.

TEST MATRIX

A. Uninvited ordinary character
- See another player inside a Private Location in city presence.
- No Private Location name / Go button should be exposed there.
- If you somehow submit that private room ID to enterRoomFromMap:
  -> action must reject "This location is not available."
- If current_room_id is manually forced to that private room and /game opened:
  -> centre blank
  -> right sidebar blank
  -> no reading, writing, room buttons, Info, exits or Instant Chat

B. Kicked character
- Accept invite and enter.
- Owner kicks character.
- Attempts to jump back in must be rejected.
- A new accepted invitation restores active membership and access.

C. Owner
- With private_chat enabled: access works normally.
- With private_chat disabled: room is inaccessible.

D. Invited member
- Does not need private_chat entitlement.
- Active membership permits enterRoomFromMap and normal /game.

E. Staff
- Staff may enter any Private Location through enterRoomFromMap regardless
  of membership.
- Staff sees the normal room once inside.

No database records or existing rooms are recreated by this patch.
