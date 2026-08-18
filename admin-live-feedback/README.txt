SEPULCHRIA — ADMIN LIVE FEEDBACK + LIVE CONTEXT SIDEBAR

Covered admin areas:
- Ancestries
- Areas
- Associations
- Events
- Feats
- Items
- Locations
- Orders
- Rules
- Tidings

What this changes:
1. The clicked submit button becomes disabled immediately.
2. Button text changes automatically:
   Save -> Saving...
   Create / Publish / Add -> Creating...
   Delete / Remove -> Deleting...
   Assign -> Assigning...
   Hide / Show -> Updating...
3. Existing success/error responses are displayed beside the same action button.
4. Scroll position and open editor panels remain preserved.
5. Successful mutations emit an admin-data-changed event.
6. The right admin context panel refreshes immediately from Supabase.
7. Orders keep their dedicated context.
8. Rules use their dedicated context.
9. Events and Tidings gain dedicated live Jump To context lists.
10. No SQL is required.

INSTALL
From the sepulchria-portal repository root:

py .\admin-live-feedback\install.py
npm run build

FIRST TEST
Open /admin/gifts, edit a Feat and click Save Feat.
Expected:
- Save Feat immediately becomes disabled and says Saving...
- after completion, success/error appears beside that same button
- you remain at the same Feat/open panel
- a renamed/created/deleted Feat appears immediately in Jump to Feats

Then test one create/edit/delete action in each of the other covered admin areas.
