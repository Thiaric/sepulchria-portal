"use server";

import {
  createClient as createAdminClient,
} from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  hasCharacterFeature,
} from "@/lib/features/character-feature-entitlements";
import {
  getStaffSession,
} from "@/lib/auth/require-staff";
import {
  createClient,
} from "@/lib/supabase/server";
import {
  getSanctionEnforcement,
} from "@/lib/sanctions/enforcement";
import {
  consumeSecurityRateLimit,
} from "@/lib/security/rate-limit";
import {
  createTargetedCharacterNotification,
} from "@/lib/notifications/create-targeted-character-notification";

function adminClient() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret =
    process.env.SUPABASE_SECRET_KEY;

  if (!url || !secret) {
    throw new Error(
      "Missing Supabase server configuration.",
    );
  }

  return createAdminClient(url, secret, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function readUuid(
  value: FormDataEntryValue | null,
) {
  const result =
    String(value ?? "").trim();

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      result,
    )
  ) {
    throw new Error("Invalid identifier.");
  }

  return result;
}

function readText(
  value: FormDataEntryValue | null,
  maxLength: number,
) {
  return String(value ?? "")
    .trim()
    .slice(0, maxLength);
}


async function getCharacter() {
  const supabase =
    await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const {
    data: character,
    error,
  } = await supabase
    .from("characters")
    .select(
      "id, user_id, display_name, first_name, surname, current_room_id, status",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!character) {
    redirect("/character/create");
  }

  if (character.status !== "approved") {
    throw new Error(
      "Your character must be approved.",
    );
  }

  return {
    supabase,
    character,
  };
}

function displayName(character: {
  display_name: string | null;
  first_name: string;
  surname: string;
}) {
  return (
    character.display_name?.trim() ||
    `${character.first_name} ${character.surname}`.trim()
  );
}


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
        metadata: {},
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
          viewed_at: readAt,
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

async function touchPresence(
  admin: ReturnType<typeof adminClient>,
  characterId: string,
  roomId: string | null,
) {
  const now =
    new Date().toISOString();

  const {
    data: existing,
  } = await admin
    .from("character_presence")
    .select("character_id")
    .eq("character_id", characterId)
    .maybeSingle();

  if (existing) {
    const { error } = await admin
      .from("character_presence")
      .update({
        room_id: roomId,
        last_seen_at: now,
      })
      .eq("character_id", characterId);

    if (error) {
      throw new Error(error.message);
    }

    return;
  }

  const { error } = await admin
    .from("character_presence")
    .insert({
      character_id: characterId,
      room_id: roomId,
      status: "online",
      manual_status: "online",
      last_seen_at: now,
    });

  if (error && error.code !== "23505") {
    throw new Error(error.message);
  }
}

export async function ensureOwnedPrivateLocation() {
  const { character } =
    await getCharacter();

  const enabled =
    await hasCharacterFeature(
      character.id,
      "private_chat",
    );

  if (!enabled) {
    return null;
  }

  const admin =
    adminClient();

  const {
    data: existing,
    error: existingError,
  } = await admin
    .from("private_location_rooms")
    .select("room_id")
    .eq(
      "owner_character_id",
      character.id,
    )
    .maybeSingle();

  if (existingError) {
    throw new Error(
      existingError.message,
    );
  }

  if (existing) {
    const {
      error: ownerMembershipError,
    } = await admin
      .from("private_location_members")
      .upsert(
        {
          room_id: existing.room_id,
          character_id: character.id,
          role: "owner",
          status: "active",
          updated_at:
            new Date().toISOString(),
        },
        {
          onConflict:
            "room_id,character_id",
        },
      );

    if (ownerMembershipError) {
      throw new Error(
        `Unable to repair Private Location ownership: ${ownerMembershipError.message}`,
      );
    }

    return existing.room_id as string;
  }

  const {
    data: area,
    error: areaError,
  } = await admin
    .from("areas")
    .select("id")
    .eq(
      "slug",
      "private-locations",
    )
    .maybeSingle();

  if (areaError || !area) {
    throw new Error(
      areaError?.message ??
        "Private Locations system area is missing. Run the supplied SQL first.",
    );
  }

  const ownerName =
    displayName(character);

  const roomName =
    `${ownerName}'s Private Room`;

  const slug =
    `private-${character.id}`;

  const {
    data: room,
    error: roomError,
  } = await admin
    .from("rooms")
    .insert({
      area_id: area.id,
      name: roomName,
      slug,
      description:
        `A private indoor location belonging to ${ownerName}.`,
      image_url: null,
      sort_order: 9999,
      is_active: true,
      is_outdoors: false,
      chat_enabled: true,
      updated_at:
        new Date().toISOString(),
    })
    .select("id")
    .single();

  if (roomError) {
    throw new Error(roomError.message);
  }

  const {
    error: metadataError,
  } = await admin
    .from("private_location_rooms")
    .insert({
      room_id: room.id,
      owner_character_id:
        character.id,
    });

  if (metadataError) {
    await admin
      .from("rooms")
      .delete()
      .eq("id", room.id);

    throw new Error(
      metadataError.message,
    );
  }

  const {
    error: memberError,
  } = await admin
    .from("private_location_members")
    .insert({
      room_id: room.id,
      character_id:
        character.id,
      role: "owner",
      status: "active",
    });

  if (memberError) {
    throw new Error(memberError.message);
  }

  return room.id as string;
}

async function requireOwner(
  roomId: string,
) {
  const { character } =
    await getCharacter();

  const enabled =
    await hasCharacterFeature(
      character.id,
      "private_chat",
    );

  if (!enabled) {
    throw new Error(
      "Private Location ownership is not enabled for this character.",
    );
  }

  const admin =
    adminClient();

  const {
    data: record,
    error,
  } = await admin
    .from("private_location_rooms")
    .select("room_id, owner_character_id")
    .eq("room_id", roomId)
    .eq(
      "owner_character_id",
      character.id,
    )
    .maybeSingle();

  if (error || !record) {
    throw new Error(
      error?.message ??
        "You do not own this Private Location.",
    );
  }

  return {
    owner: character,
    admin,
  };
}

async function canAccess(
  admin: ReturnType<typeof adminClient>,
  roomId: string,
  characterId: string,
) {
  const {
    data: privateRoom,
    error: privateError,
  } = await admin
    .from("private_location_rooms")
    .select("owner_character_id")
    .eq("room_id", roomId)
    .maybeSingle();

  if (privateError || !privateRoom) {
    return false;
  }

  /*
   * Staff are allowed to enter every character-owned Private Location,
   * exactly like Order Headquarters. They do not need an invitation or
   * a private_location_members row.
   *
   * The shared game access guard already grants staff access; this keeps
   * the dedicated "Enter Private Location" action consistent with it.
   */
  const staff =
    await getStaffSession();

  if (staff) {
    return true;
  }

  const {
    data: entitlement,
  } = await admin
    .from("character_feature_entitlements")
    .select("enabled")
    .eq(
      "character_id",
      privateRoom.owner_character_id,
    )
    .eq(
      "feature_key",
      "private_chat",
    )
    .maybeSingle();

  if (entitlement?.enabled !== true) {
    return false;
  }

  const {
    data: membership,
  } = await admin
    .from("private_location_members")
    .select("status")
    .eq("room_id", roomId)
    .eq(
      "character_id",
      characterId,
    )
    .maybeSingle();

  return membership?.status === "active";
}

export async function enterPrivateLocation(
  formData: FormData,
) {
  const roomId =
    readUuid(formData.get("roomId"));

  const {
    character,
  } = await getCharacter();

  const admin =
    adminClient();

  if (
    !(await canAccess(
      admin,
      roomId,
      character.id,
    ))
  ) {
    // Deliberately do not disclose anything about the private location.
    redirect("/game");
  }

  let returnRoomId =
    character.current_room_id;

  if (
    returnRoomId === roomId
  ) {
    returnRoomId = null;
  } else if (returnRoomId) {
    const {
      data: previousWasPrivate,
    } = await admin
      .from("private_location_rooms")
      .select("room_id")
      .eq("room_id", returnRoomId)
      .maybeSingle();

    if (previousWasPrivate) {
      returnRoomId = null;
    }
  }

  await admin
    .from("private_location_members")
    .update({
      return_room_id:
        returnRoomId,
      updated_at:
        new Date().toISOString(),
    })
    .eq("room_id", roomId)
    .eq(
      "character_id",
      character.id,
    );

  const {
    error: moveError,
  } = await admin
    .from("characters")
    .update({
      current_room_id: roomId,
    })
    .eq("id", character.id);

  if (moveError) {
    throw new Error(moveError.message);
  }

  await touchPresence(
    admin,
    character.id,
    roomId,
  );

  revalidatePath("/game");
  revalidatePath("/");

  redirect("/game");
}

export async function invitePrivateLocation(
  formData: FormData,
) {
  const roomId =
    readUuid(formData.get("roomId"));

  const recipientId =
    readUuid(
      formData.get("recipientId"),
    );

  const {
    owner,
    admin,
  } = await requireOwner(roomId);

  const authenticated =
    await createClient();

  const communicationEnforcement =
    await getSanctionEnforcement(
      authenticated,
      "communication",
    );

  if (communicationEnforcement.blocked) {
    throw new Error(
      communicationEnforcement.message ??
        "Private communication is currently restricted on this account.",
    );
  }

  const invitationRateLimit =
    await consumeSecurityRateLimit({
      scope:
        "private_location_invite_character",
      identifier:
        `character:${owner.id}`,
      limit: 10,
      windowSeconds: 10 * 60,
    });

  if (!invitationRateLimit.allowed) {
    throw new Error(
      "You are sending Private Location invitations too quickly. Please wait before inviting more characters.",
    );
  }

  if (recipientId === owner.id) {
    throw new Error(
      "You cannot invite yourself.",
    );
  }

  const {
    data: recipient,
    error: recipientError,
  } = await admin
    .from("characters")
    .select(
      "id, status, display_name, first_name, surname",
    )
    .eq("id", recipientId)
    .maybeSingle();

  if (
    recipientError ||
    !recipient ||
    recipient.status !== "approved"
  ) {
    throw new Error(
      recipientError?.message ??
        "That character cannot be invited.",
    );
  }

  const {
    data: membership,
  } = await admin
    .from("private_location_members")
    .select("status")
    .eq("room_id", roomId)
    .eq(
      "character_id",
      recipientId,
    )
    .maybeSingle();

  if (membership?.status === "active") {
    throw new Error(
      "That character already has access.",
    );
  }

  const {
    data: pending,
  } = await admin
    .from("private_location_invitations")
    .select("id")
    .eq("room_id", roomId)
    .eq(
      "recipient_character_id",
      recipientId,
    )
    .eq("status", "pending")
    .maybeSingle();

  if (pending) {
    throw new Error(
      "That character already has a pending invitation.",
    );
  }

  const deliveryMethod = "message";

  const { data: invitation, error: invitationError } = await admin
    .from("private_location_invitations")
    .insert({
      room_id: roomId,
      inviter_character_id: owner.id,
      recipient_character_id: recipientId,
      delivery_method: deliveryMethod,
    })
    .select("id")
    .single();

  if (invitationError) {
    throw new Error(invitationError.message);
  }

  const { data: room, error: roomError } = await admin
    .from("rooms")
    .select("name")
    .eq("id", roomId)
    .single();

  if (roomError) {
    await admin.from("private_location_invitations").delete().eq("id", invitation.id);
    throw new Error(roomError.message);
  }

  const { data: { user: invitingUser } } = await authenticated.auth.getUser();
  if (!invitingUser) {
    await admin.from("private_location_invitations").delete().eq("id", invitation.id);
    throw new Error("The invitation sender could not be identified.");
  }

  try {
    await createTargetedCharacterNotification({
      recipientCharacterId: recipientId,
      title: "Private Location invitation",
      body: `${displayName(owner)} has invited you to ${room.name}. Open the invitation to accept or refuse.`,
      href: `/game?privateInvite=${encodeURIComponent(invitation.id)}`,
      sourceType: "private_location_invite",
      sourceId: invitation.id,
      sourceTrigger: "invited",
      createdByUserId: invitingUser.id,
    });
  } catch (error) {
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

export async function cancelPrivateLocationInvitation(
  formData: FormData,
) {
  const roomId =
    readUuid(formData.get("roomId"));

  const invitationId =
    readUuid(
      formData.get("invitationId"),
    );

  const {
    admin,
  } = await requireOwner(roomId);

  const {
    data: invitation,
    error: invitationError,
  } = await admin
    .from("private_location_invitations")
    .select("id, room_id, status")
    .eq("id", invitationId)
    .eq("room_id", roomId)
    .maybeSingle();

  if (
    invitationError ||
    !invitation
  ) {
    throw new Error(
      invitationError?.message ??
        "Invitation not found.",
    );
  }

  if (invitation.status !== "pending") {
    /*
     * The owner's page can be a fraction of a second behind a response
     * from the invitee. Treat a stale Cancel click as a harmless no-op;
     * the live owner-state refresher will replace/remove the row.
     */
    revalidatePath(
      "/private-locations",
    );
    return;
  }

  const {
    error: cancelError,
  } = await admin
    .from("private_location_invitations")
    .update({
      status: "cancelled",
      responded_at:
        new Date().toISOString(),
    })
    .eq("id", invitationId)
    .eq("status", "pending");

  if (cancelError) {
    throw new Error(
      cancelError.message,
    );
  }

  revalidatePath("/private-locations");
  revalidatePath("/messages");
}

export async function respondPrivateLocationInvitation(
  formData: FormData,
) {
  const invitationId =
    readUuid(
      formData.get("invitationId"),
    );

  const response =
    String(
      formData.get("response") ?? "",
    ).trim();

  if (
    response !== "accept" &&
    response !== "refuse"
  ) {
    throw new Error(
      "Invalid invitation response.",
    );
  }

  const {
    character,
  } = await getCharacter();

  const admin =
    adminClient();

  const {
    data: invitation,
    error: invitationError,
  } = await admin
    .from("private_location_invitations")
    .select(
      "id, room_id, inviter_character_id, recipient_character_id, status",
    )
    .eq("id", invitationId)
    .maybeSingle();

  if (
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
    const {
      error: memberError,
    } = await admin
      .from("private_location_members")
      .upsert(
        {
          room_id:
            invitation.room_id,
          character_id:
            character.id,
          role: "member",
          status: "active",
          updated_at:
            new Date().toISOString(),
        },
        {
          onConflict:
            "room_id,character_id",
        },
      );

    if (memberError) {
      throw new Error(
        memberError.message,
      );
    }
  }

  const {
    error: updateError,
  } = await admin
    .from("private_location_invitations")
    .update({
      status:
        response === "accept"
          ? "accepted"
          : "refused",
      responded_at:
        new Date().toISOString(),
    })
    .eq("id", invitationId);

  if (updateError) {
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

    enterData.set(
      "roomId",
      invitation.room_id,
    );

    await enterPrivateLocation(
      enterData,
    );

    return;
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

export async function kickPrivateLocationMember(
  formData: FormData,
) {
  const roomId =
    readUuid(formData.get("roomId"));

  const targetId =
    readUuid(
      formData.get("characterId"),
    );

  const {
    owner,
    admin,
  } = await requireOwner(roomId);

  if (targetId === owner.id) {
    throw new Error(
      "The owner cannot be kicked.",
    );
  }

  const {
    data: membership,
    error: membershipError,
  } = await admin
    .from("private_location_members")
    .select("return_room_id")
    .eq("room_id", roomId)
    .eq(
      "character_id",
      targetId,
    )
    .maybeSingle();

  if (membershipError || !membership) {
    throw new Error(
      membershipError?.message ??
        "That character is not a member.",
    );
  }

  const {
    error: kickError,
  } = await admin
    .from("private_location_members")
    .update({
      status: "kicked",
      updated_at:
        new Date().toISOString(),
    })
    .eq("room_id", roomId)
    .eq(
      "character_id",
      targetId,
    );

  if (kickError) {
    throw new Error(kickError.message);
  }

  const {
    data: target,
    error: targetError,
  } = await admin
    .from("characters")
    .select("current_room_id")
    .eq("id", targetId)
    .maybeSingle();

  if (targetError) {
    throw new Error(targetError.message);
  }

  if (
    target?.current_room_id === roomId
  ) {
    const fallback =
      membership.return_room_id ??
      null;

    const {
      error: moveError,
    } = await admin
      .from("characters")
      .update({
        current_room_id:
          fallback,
      })
      .eq("id", targetId);

    if (moveError) {
      throw new Error(moveError.message);
    }

    await touchPresence(
      admin,
      targetId,
      fallback,
    );
  }

  revalidatePath("/private-locations");
  revalidatePath("/game");
  revalidatePath("/");
}

export async function updatePrivateLocation(
  formData: FormData,
) {
  const roomId =
    readUuid(formData.get("roomId"));

  const {
    admin,
  } = await requireOwner(roomId);

  const imageUrl =
    readText(
      formData.get("imageUrl"),
      2000,
    );

  const backgroundImageUrl =
    readText(
      formData.get("backgroundImageUrl"),
      2000,
    );

  const {
    error: roomError,
  } = await admin
    .from("rooms")
    .update({
      image_url:
        imageUrl || null,
      background_image_url:
        backgroundImageUrl || null,
      updated_at:
        new Date().toISOString(),
    })
    .eq("id", roomId);

  if (roomError) {
    throw new Error(
      roomError.message,
    );
  }

  revalidatePath("/private-locations");
  revalidatePath("/game");
  revalidatePath("/");
}
