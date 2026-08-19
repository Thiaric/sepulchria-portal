SEPULCHRIA PM MEMBERSHIP + READ FIX

Built specifically against pushed commit:
c81cefd151e3d1758cf736c587422fd416e3640c
"Conversations not working"

THIS PATCH FIXES THE ROOT CAUSES

A. LEFT GROUPS
The previous implementation relied on a normal client/server update to mark
deleted_at. The app's unread calculators in BOTH portal context and the live
UnreadMessageBadge did not filter deleted_at anyway.

This patch:
- creates security-definer leave_group_conversation(...)
- Leave Conversation calls that authoritative RPC
- header/sidebar server unread calculation filters deleted_at IS NULL
- live header/sidebar UnreadMessageBadge filters deleted_at IS NULL
- both PM send actions require the sender's membership to be active
- archive can NEVER clear deleted_at
- group participant displays omit people who left

B. OPEN CONVERSATION COUNTERS
The global header/sidebar badge was independently recounting the database while
ConversationRealtime was marking the thread read. That creates a race: the new
message can be counted before last_read_at catches up.

This patch:
- when pathname is /messages/<conversation>, that conversation is excluded from
  the GLOBAL unread badge calculation entirely
- ConversationRealtime still marks it read in the DB
- it re-marks read after incoming realtime refresh and on focus/visibility

Therefore a message visible in the conversation you are currently reading
cannot show as an unread badge in header/sidebar.

INSTALL

1. Supabase -> SQL Editor:
   run 01_PM_MEMBERSHIP_READ_FIX.sql

2. Project root:
   py .\pm-membership-read-fix\install.py

3. Build:
   npm run build

IMPORTANT TEST
Use a NEW group, or re-enter the old test group and Leave it again after this
SQL/code fix. A participant row left by the previously broken implementation
may never actually have been marked deleted.

TEST 1 — OPEN THREAD
- A, B, C are in group.
- B keeps the group page OPEN.
- A sends message.
Expected B:
  message appears live;
  conversation beep is fine;
  header PM badge = 0 for this message;
  sidebar Messages badge = 0 for this message.
- B navigates away.
- A sends another.
Expected B:
  global unread badge increments.

TEST 2 — LEAVE
- B clicks Leave Conversation and confirms.
- A sends another message.
Expected B:
  group never returns;
  no inbox entry;
  no header badge;
  no sidebar badge;
  old group URL inaccessible;
  no notification from that group.
Expected A/C:
  group and history remain normally.
