#!/usr/bin/env python3
# Sepulchria patch for commit 3c89bfb.
#
# Fixes:
# - invitation notifications no longer re-chime/reappear as "new" after being read
# - invitation notification delivery reacts immediately to Realtime invitation inserts
# - "Mark all read" sits immediately to the right of Mute
# - sent PMs use the same ON-GAME/OFF-GAME visual language as received PMs
# - Whisper Frame cosmetic no longer injects a purple border/background/glow
# - Private Location invitation / accept / refuse events are written to Character Logs
# - accepting/refusing a Private Location invitation marks its notification read
#
# Run from the sepulchria-portal repository root:
#     python patch_invitation_notifications_pm_whispers_logs_3c89bfb.py

from __future__ import annotations

from pathlib import Path
import subprocess


def die(message: str) -> None:
    raise SystemExit(f"\nPATCH STOPPED: {message}\n")


def repo_root() -> Path:
    root = Path.cwd()
    if not (root / "package.json").exists() or not (root / "components").exists():
        die("Run this script from the sepulchria-portal repository root.")
    return root


def replace_once(path: Path, old: str, new: str, label: str) -> None:
    text = path.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        die(
            f"{label}: expected exactly 1 match in {path.as_posix()}, "
            f"found {count}. This patch targets 3c89bfb."
        )
    path.write_text(text.replace(old, new, 1), encoding="utf-8", newline="\n")
    print(f"✓ {label}")


def insert_after_once(path: Path, anchor: str, addition: str, label: str) -> None:
    replace_once(path, anchor, anchor + addition, label)


root = repo_root()

# ---------------------------------------------------------------------------
# 1) NOTIFICATION BELL
# ---------------------------------------------------------------------------

bell = root / "components/notifications/notification-bell.tsx"

insert_after_once(
    bell,
    '''  const suppressNextSoundRef =
    useRef(false);
''',
    '''  const knownNotificationIdsRef =
    useRef<Set<string>>(
      new Set(),
    );
''',
    "Notification bell: remember notification IDs",
)

replace_once(
    bell,
    '''      const nextUnread =
        bundle.muted === true
          ? 0
          : hydratedRows.filter(
              (row) =>
                row.is_unread,
            ).length;

      if (
        loadedOnceRef.current &&
        !bundle.muted &&
        nextUnread >
          previousUnreadRef.current &&
        !suppressNextSoundRef.current
      ) {
        playPortalSound(
          "notification-chime",
        );
      }

      suppressNextSoundRef.current =
        false;
      loadedOnceRef.current =
        true;
      previousUnreadRef.current =
        nextUnread;
''',
    '''      const unreadRows =
        bundle.muted === true
          ? []
          : hydratedRows.filter(
              (row) =>
                row.is_unread,
            );

      const nextUnread =
        unreadRows.length;

      /*
       * Sound only for a notification ID this mounted bell has never seen.
       * Previously the chime was driven by "unread count increased", so an
       * old invitation could replay its sound after a refresh.
       */
      const hasGenuinelyNewUnread =
        loadedOnceRef.current &&
        unreadRows.some(
          (row) =>
            !knownNotificationIdsRef.current.has(
              row.id,
            ),
        );

      if (
        !bundle.muted &&
        hasGenuinelyNewUnread &&
        !suppressNextSoundRef.current
      ) {
        playPortalSound(
          "notification-chime",
        );
      }

      for (
        const row of hydratedRows
      ) {
        knownNotificationIdsRef.current.add(
          row.id,
        );
      }

      suppressNextSoundRef.current =
        false;
      loadedOnceRef.current =
        true;
      previousUnreadRef.current =
        nextUnread;
''',
    "Notification bell: chime only for genuinely new IDs",
)

replace_once(
    bell,
    '''            event: "UPDATE",
            schema: "public",
            table:
              "notifications",
''',
    '''            event: "*",
            schema: "public",
            table:
              "notifications",
''',
    "Notification bell: react to notification INSERT and UPDATE",
)

replace_once(
    bell,
    '''        )
        .subscribe();

    return () => {
      if (
        retryTimer !== null
      ) {
        window.clearTimeout(
          retryTimer,
        );
      }

      void supabase.removeChannel(
        channel,
      );
    };
''',
    '''        )
        .subscribe();

    /*
     * Invitation rows exist before their targeted notification is created.
     * Listening to the invitation INSERT itself wakes the recipient's bell
     * immediately even if the generic notifications Realtime signal is late.
     * The existing retry then catches notification_targets after creation.
     */
    const invitationTables = [
      "private_location_invitations",
      "breeze_lodging_invitations",
      "order_headquarters_invitations",
    ] as const;

    const invitationChannels =
      invitationTables.map(
        (table) =>
          supabase
            .channel(
              `bell-invitation-${table}-${crypto.randomUUID()}`,
            )
            .on(
              "postgres_changes",
              {
                event: "INSERT",
                schema: "public",
                table,
              },
              () => {
                reloadFromReadySignal();
              },
            )
            .subscribe(),
      );

    return () => {
      if (
        retryTimer !== null
      ) {
        window.clearTimeout(
          retryTimer,
        );
      }

      void supabase.removeChannel(
        channel,
      );

      for (
        const invitationChannel of
          invitationChannels
      ) {
        void supabase.removeChannel(
          invitationChannel,
        );
      }
    };
''',
    "Notification bell: instant invitation wake-up channels",
)

replace_once(
    bell,
    '''                  <button
                    type="button"
                    onClick={() =>
                      void toggleMute()
                    }
''',
    '''                  <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      void toggleMute()
                    }
''',
    "Notification bell: begin Mute/Mark-all action row",
)

replace_once(
    bell,
    '''                  </button>
                </div>

                {!muted ? (
                  <div className="mt-3">
                    <div className="mb-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() =>
                          void markAllRead()
                        }
                        disabled={
                          markingAllRead ||
                          unreadCount === 0
                        }
                        className="border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-18110d))] px-2.5 py-1.5 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-bca27b))] transition disabled:cursor-default disabled:opacity-40"
                      >
                        {markingAllRead
                          ? "Marking..."
                          : "Mark all read"}
                      </button>
                    </div>

                    <input
''',
    '''                  </button>

                    {!muted ? (
                      <button
                        type="button"
                        onClick={() =>
                          void markAllRead()
                        }
                        disabled={
                          markingAllRead ||
                          unreadCount === 0
                        }
                        className="border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-18110d))] px-2.5 py-1.5 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-bca27b))] transition disabled:cursor-default disabled:opacity-40"
                      >
                        {markingAllRead
                          ? "Marking..."
                          : "Mark all read"}
                      </button>
                    ) : null}
                  </div>
                </div>

                {!muted ? (
                  <div className="mt-3">
                    <input
''',
    "Notification bell: move Mark all read to the right of Mute",
)

# ---------------------------------------------------------------------------
# 2) PRIVATE MESSAGES — same ON/OFF visual distinction on sent messages
# ---------------------------------------------------------------------------

pm = root / "app/(portal)/messages/[id]/components/ConversationMessageList.tsx"

replace_once(
    pm,
    '''                  own
                    ? ongame
                      ? "ml-auto border-[rgb(var(--sep-colour-80613c))] bg-[rgb(var(--sep-colour-2c2117))]"
                      : "ml-auto border-[rgb(var(--sep-colour-687083))] bg-[rgb(var(--sep-colour-252830))]"
                    : ongame
                      ? "border-[rgb(var(--sep-colour-514233))] bg-[rgb(var(--sep-colour-100c09))]"
                      : "border-[rgb(var(--sep-colour-5c6372))] bg-[rgb(var(--sep-colour-191b21))]"
''',
    '''                  own
                    ? ongame
                      ? "ml-auto border-[rgb(var(--sep-colour-514233))] bg-[rgb(var(--sep-colour-100c09))]"
                      : "ml-auto border-[rgb(var(--sep-colour-5c6372))] bg-[rgb(var(--sep-colour-191b21))]"
                    : ongame
                      ? "border-[rgb(var(--sep-colour-514233))] bg-[rgb(var(--sep-colour-100c09))]"
                      : "border-[rgb(var(--sep-colour-5c6372))] bg-[rgb(var(--sep-colour-191b21))]"
''',
    "Private messages: sent messages inherit received ON/OFF surfaces",
)

# ---------------------------------------------------------------------------
# 3) WHISPER FRAME — remove hard-coded purple recolouring
# ---------------------------------------------------------------------------

cosmetics = root / "components/cosmetics/cosmetic-runtime.tsx"

replace_once(
    cosmetics,
    '''      [data-cosmetic-surface="whisper"] {
        position: relative;
        isolation: isolate;
        overflow: visible;
        border: 1px solid #7d628f !important;
      }

      [data-cosmetic-surface="whisper"][data-has-whisper-style="true"] {
        border-color: #7d628f !important;

        background:
          linear-gradient(
            100deg,
            rgba(37,19,52,.80),
            rgba(25,18,40,.66) 55%,
            rgba(40,19,54,.74)
          ) !important;

        box-shadow:
          inset 0 0 20px rgba(150,88,200,.10);
      }
''',
    '''      [data-cosmetic-surface="whisper"] {
        position: relative;
        isolation: isolate;
        overflow: visible;
      }

      /*
       * Whisper cosmetics are FRAME-ONLY. Do not replace the authored
       * room-message border/background/hue supplied by the shared skin.
       */
      [data-cosmetic-surface="whisper"][data-has-whisper-style="true"] {
        background-color: inherit;
      }
''',
    "Whisper cosmetic: remove hard-coded purple surface",
)

replace_once(
    cosmetics,
    '''        filter:
          drop-shadow(0 0 5px rgba(155,91,207,.20));
''',
    '''        filter:
          drop-shadow(0 3px 7px rgba(0,0,0,.32));
''',
    "Whisper cosmetic: replace purple glow with neutral shadow",
)

# ---------------------------------------------------------------------------
# 4) PRIVATE LOCATION INVITATION CHARACTER LOG + persistent notification read
# ---------------------------------------------------------------------------

actions = root / "app/(portal)/private-location/actions.ts"

replace_once(
    actions,
    '''      "id, display_name, first_name, surname, current_room_id, status",
''',
    '''      "id, user_id, display_name, first_name, surname, current_room_id, status",
''',
    "Private Location: expose character user_id for audit actor",
)

insert_after_once(
    actions,
    '''function displayName(character: {
  display_name: string | null;
  first_name: string;
  surname: string;
}) {
  return (
    character.display_name?.trim() ||
    `${character.first_name} ${character.surname}`.trim()
  );
}
''',
    '''

async function logPrivateLocationInvitationEvents(
  admin: ReturnType<
    typeof adminClient
  >,
  rows: Array<{
    characterId: string;
    eventType:
      | "private_location_invited"
      | "private_location_invitation_refused"
      | "private_location_invitation_accepted";
    invitationId: string;
    actorUserId: string | null;
    actorLabel: string;
    summary: string;
    roomId: string;
    roomName: string;
    otherCharacterId: string;
    otherCharacterName: string;
  }>,
) {
  if (!rows.length) {
    return;
  }

  const { error } = await admin
    .from("character_audit_log")
    .insert(
      rows.map((row) => ({
        character_id:
          row.characterId,
        event_type:
          row.eventType,
        entity_type:
          "private_location_invitation",
        entity_id:
          row.invitationId,
        operation: "event",
        actor_user_id:
          row.actorUserId,
        actor_type: "player",
        actor_staff_role: null,
        actor_label:
          row.actorLabel,
        source:
          "private_location_invitation",
        changed_fields: [],
        old_values: null,
        new_values: {
          summary:
            row.summary,
          room_id:
            row.roomId,
          room_name:
            row.roomName,
          other_character_id:
            row.otherCharacterId,
          other_character_name:
            row.otherCharacterName,
        },
        metadata: null,
      })),
    );

  if (error) {
    throw new Error(
      `Unable to write Private Location Character Log: ${error.message}`,
    );
  }
}

async function markPrivateLocationInvitationNotificationRead(
  admin: ReturnType<
    typeof adminClient
  >,
  invitationId: string,
  recipientCharacterId: string,
) {
  const [
    recipientResult,
    notificationResult,
  ] = await Promise.all([
    admin
      .from("characters")
      .select("user_id")
      .eq(
        "id",
        recipientCharacterId,
      )
      .maybeSingle(),
    admin
      .from("notifications")
      .select("id")
      .eq(
        "source_type",
        "private_location_invite",
      )
      .eq(
        "source_id",
        invitationId,
      ),
  ]);

  const userId =
    recipientResult.data?.user_id;

  const notificationIds =
    (
      notificationResult.data ??
      []
    ).map(
      (row) => row.id,
    );

  if (
    !userId ||
    notificationIds.length === 0
  ) {
    return;
  }

  const readAt =
    new Date().toISOString();

  const { error } = await admin
    .from("notification_reads")
    .upsert(
      notificationIds.map(
        (notificationId) => ({
          user_id: userId,
          notification_id:
            notificationId,
          read_at: readAt,
        }),
      ),
      {
        onConflict:
          "user_id,notification_id",
      },
    );

  if (error) {
    throw new Error(
      `Unable to close the invitation notification: ${error.message}`,
    );
  }
}
''',
    "Private Location: add audit/read helpers",
)

replace_once(
    actions,
    '''  } catch (error) {
    await admin.from("private_location_invitations").delete().eq("id", invitation.id);
    throw new Error(`The invitation could not be notified: ${error instanceof Error ? error.message : "Unknown error"}`);
  }

  revalidatePath("/private-locations");
}
''',
    '''  } catch (error) {
    await admin.from("private_location_invitations").delete().eq("id", invitation.id);
    throw new Error(`The invitation could not be notified: ${error instanceof Error ? error.message : "Unknown error"}`);
  }

  const ownerName =
    displayName(owner);
  const recipientName =
    displayName(recipient);

  await logPrivateLocationInvitationEvents(
    admin,
    [
      {
        characterId:
          owner.id,
        eventType:
          "private_location_invited",
        invitationId:
          invitation.id,
        actorUserId:
          owner.user_id,
        actorLabel:
          ownerName,
        summary:
          `Invited ${recipientName} to ${room.name}.`,
        roomId,
        roomName:
          room.name,
        otherCharacterId:
          recipient.id,
        otherCharacterName:
          recipientName,
      },
      {
        characterId:
          recipient.id,
        eventType:
          "private_location_invited",
        invitationId:
          invitation.id,
        actorUserId:
          owner.user_id,
        actorLabel:
          ownerName,
        summary:
          `${ownerName} invited you to ${room.name}.`,
        roomId,
        roomName:
          room.name,
        otherCharacterId:
          owner.id,
        otherCharacterName:
          ownerName,
      },
    ],
  );

  revalidatePath("/private-locations");
}
''',
    "Private Location: log invitation in both Character Logs",
)

replace_once(
    actions,
    '''    .select(
      "id, room_id, recipient_character_id, status",
    )
''',
    '''    .select(
      "id, room_id, inviter_character_id, recipient_character_id, status",
    )
''',
    "Private Location: load inviter ID when responding",
)

replace_once(
    actions,
    '''  if (
    invitationError ||
    !invitation ||
    invitation.recipient_character_id !==
      character.id ||
    invitation.status !== "pending"
  ) {
    throw new Error(
      invitationError?.message ??
        "This invitation is no longer available.",
    );
  }

  if (response === "accept") {
''',
    '''  if (
    invitationError ||
    !invitation ||
    invitation.recipient_character_id !==
      character.id ||
    invitation.status !== "pending"
  ) {
    throw new Error(
      invitationError?.message ??
        "This invitation is no longer available.",
    );
  }

  const [
    roomResult,
    inviterResult,
  ] = await Promise.all([
    admin
      .from("rooms")
      .select("name")
      .eq(
        "id",
        invitation.room_id,
      )
      .maybeSingle(),
    admin
      .from("characters")
      .select(
        "id, display_name, first_name, surname",
      )
      .eq(
        "id",
        invitation.inviter_character_id,
      )
      .maybeSingle(),
  ]);

  if (
    roomResult.error ||
    !roomResult.data ||
    inviterResult.error ||
    !inviterResult.data
  ) {
    throw new Error(
      roomResult.error?.message ??
        inviterResult.error?.message ??
        "Invitation context is no longer available.",
    );
  }

  const roomName =
    roomResult.data.name;
  const inviterName =
    displayName(
      inviterResult.data,
    );
  const responderName =
    displayName(character);

  if (response === "accept") {
''',
    "Private Location: resolve response names",
)

replace_once(
    actions,
    '''  if (updateError) {
    throw new Error(
      updateError.message,
    );
  }

  if (response === "accept") {
    const enterData =
      new FormData();
''',
    '''  if (updateError) {
    throw new Error(
      updateError.message,
    );
  }

  await markPrivateLocationInvitationNotificationRead(
    admin,
    invitationId,
    character.id,
  );

  if (response === "accept") {
    await logPrivateLocationInvitationEvents(
      admin,
      [
        {
          characterId:
            character.id,
          eventType:
            "private_location_invitation_accepted",
          invitationId,
          actorUserId:
            character.user_id,
          actorLabel:
            responderName,
          summary:
            `Accepted ${inviterName}'s invitation to ${roomName}.`,
          roomId:
            invitation.room_id,
          roomName,
          otherCharacterId:
            invitation.inviter_character_id,
          otherCharacterName:
            inviterName,
        },
        {
          characterId:
            invitation.inviter_character_id,
          eventType:
            "private_location_invitation_accepted",
          invitationId,
          actorUserId:
            character.user_id,
          actorLabel:
            responderName,
          summary:
            `${responderName} accepted your invitation to ${roomName}.`,
          roomId:
            invitation.room_id,
          roomName,
          otherCharacterId:
            character.id,
          otherCharacterName:
            responderName,
        },
      ],
    );

    const enterData =
      new FormData();
''',
    "Private Location: mark accepted invite read and log both Characters",
)

replace_once(
    actions,
    '''    return;
  }

  revalidatePath("/private-locations");
  revalidatePath("/messages");
}
''',
    '''    return;
  }

  await logPrivateLocationInvitationEvents(
    admin,
    [
      {
        characterId:
          character.id,
        eventType:
          "private_location_invitation_refused",
        invitationId,
        actorUserId:
          character.user_id,
        actorLabel:
          responderName,
        summary:
          `Refused ${inviterName}'s invitation to ${roomName}.`,
        roomId:
          invitation.room_id,
        roomName,
        otherCharacterId:
          invitation.inviter_character_id,
        otherCharacterName:
          inviterName,
      },
    ],
  );

  revalidatePath("/private-locations");
  revalidatePath("/messages");
}
''',
    "Private Location: log refusal only in recipient Character Log",
)

# ---------------------------------------------------------------------------
# 5) CHARACTER LOG RENDERER
# ---------------------------------------------------------------------------

audit_display = root / "lib/audit/character-audit-display.ts"

insert_after_once(
    audit_display,
    '''  if (row.operation === "event") {
''',
    '''    if (
      row.event_type ===
        "private_location_invited" ||
      row.event_type ===
        "private_location_invitation_refused" ||
      row.event_type ===
        "private_location_invitation_accepted"
    ) {
      const summary =
        after.summary;

      if (
        typeof summary ===
          "string" &&
        summary.trim()
      ) {
        return summary;
      }
    }

''',
    "Character Log: render invitation events as sentences",
)

print("\nRunning npm run lint if npm is available...")
try:
    result = subprocess.run(
        ["npm", "run", "lint"],
        cwd=root,
        text=True,
        capture_output=True,
        timeout=180,
    )
except (FileNotFoundError, subprocess.TimeoutExpired) as exc:
    print(f"⚠ lint not run: {exc}")
else:
    if result.returncode == 0:
        print("✓ npm run lint passed")
    else:
        print("⚠ npm run lint reported errors. Output follows:")
        print(result.stdout)
        print(result.stderr)

print(
    "\nPATCH COMPLETE.\n"
    "Changed files:\n"
    "  - components/notifications/notification-bell.tsx\n"
    "  - app/(portal)/messages/[id]/components/ConversationMessageList.tsx\n"
    "  - components/cosmetics/cosmetic-runtime.tsx\n"
    "  - app/(portal)/private-location/actions.ts\n"
    "  - lib/audit/character-audit-display.ts\n\n"
    "Then run:\n"
    "  npm run build\n"
    "  git diff\n"
    "  git add .\n"
    '  git commit -m "Fix invitation notifications, PM modes, whispers and logs"\n'
    "  git push origin master\n"
)
