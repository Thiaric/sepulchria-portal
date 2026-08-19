SEPULCHRIA — FORUM AUTOMATIC PMS + FLAG NOTE

Built against current pushed state:
df7085f6813593f22533b1175bbe1ad9ce5ab02f
"Multiple convos finally working"

NO SQL REQUIRED.

AUTOMATIC FORUM PMS

1. NEW REPLY
When somebody replies to a topic:
- the topic creator receives one automatic PM;
- every user who favourited the topic receives one automatic PM;
- duplicates are removed (creator + favourite still gets only one);
- the person who posted the reply never receives their own notification;
- PM contains a direct link to the exact new reply.

2. SOMEONE ELSE EDITS YOUR POST
If another authorised user/staff member edits another character's post:
- original author receives an automatic Forum Notification PM;
- direct link points to that edited post.
Editing your own post does not notify yourself.

3. POST MODERATION
Staff delete post:
- author gets PM;
- moderation reason is included when supplied;
- link points to the topic.

Staff restore post:
- author gets PM;
- staff note/reason is included when supplied;
- link points to restored post.

4. TOPIC MODERATION
Topic author receives automatic PM for:
- lock / unlock;
- pin / unpin;
- move;
- delete;
- restore.

Links point to the relevant topic/section depending on whether the topic
currently exists.

SYSTEM-GENERATED APPEARANCE

Notifications use the existing PM conversation infrastructure so unread
badges, realtime updates, archive behaviour and PM logs continue to work.
The body is visually labelled "Forum Notification" and is generated
automatically by the forum event.

FLAG FOR READING

The existing Flag for Reading already creates a real PM. This patch adds:
- optional Personal message field (max 1000 chars);
- example: "Read this, I found Reply number 3 quite interesting.";
- note appears as a Personal note inside the flag PM;
- existing topic link remains.

FRIEND LIST IN FLAG SELECTOR

As previously agreed:
- if Friend List is enabled, eligible friends appear in a Friend List block;
- each friend can be selected individually;
- "Select full Friend List" selects every eligible friend at once;
- forum section access rules still apply, so inaccessible friends are never
  silently included.

INSTALL

From sepulchria-portal root:

  py .\forum-automatic-pms-and-flag-note\install.py
  npm run build

TEST ORDER

A. Topic Creator creates Topic X.
B. Character B favourites Topic X.
C. Character C replies.
Expected:
- Creator gets one Forum Notification PM linking to C's reply.
- B gets one Forum Notification PM linking to C's reply.
- C gets no self-notification.

D. Staff edits B's post.
Expected:
- B receives "Your forum content was edited".

E. Staff removes/restores B's reply with a reason.
Expected:
- B gets moderation PM including reason/note.

F. Staff locks/pins/moves a topic.
Expected:
- topic creator receives each relevant automatic PM.

G. Flag for Reading:
- choose characters;
- optionally select friends / Select full Friend List;
- write custom Personal message;
- send.
Expected PM:
  Forum Flag for Reading
  sender wants you to read...
  Personal note: <custom text>
  Open topic →
