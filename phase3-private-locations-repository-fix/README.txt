SEPULCHRIA — PHASE 3 PRIVATE LOCATIONS: REPOSITORY-BASED FIX

I reviewed the pushed repository before making this patch.

FIXES
- Existing owner rooms now repair/reassert their owner membership automatically.
- The owner's directly verified real room is guaranteed into the accessible list.
- A disabled owner's own room is filtered out.
- Sidebar access is now:
    private_chat entitlement enabled
    OR active membership as an invited MEMBER in somebody else's room.
- Owner membership alone no longer keeps the sidebar link visible.
- Pending invitations alone no longer expose the sidebar link.
- Invitees still do not need private_chat enabled.

INSTALL
1. Extract into sepulchria-portal root.
2. Run:
   py .\phase3-private-locations-repository-fix\install.py
3. Run:
   npm run build

NO SUPABASE SQL IS REQUIRED.

TEST
A) Enable Private Chats for Silas:
   - sidebar link appears
   - Private Location page shows Silas's room in the accessible section
   - Manage panel also appears
   - Enter Location opens the normal /game room

B) Disable Private Chats for Silas:
   - after refresh/focus/navigation, sidebar link disappears
   - owner membership does not preserve access

C) Invitee:
   - accepted invitee still sees Private Location via role=member
   - invitee does not need the paid/staff-enabled private_chat entitlement
