"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth/require-staff";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const STAFF_ROLES = [
  "owner",
  "admin",
  "moderator",
  "master",
] as const;

type StaffRole =
  (typeof STAFF_ROLES)[number];

function readRequiredUuid(
  value: FormDataEntryValue | null,
): string {
  if (typeof value !== "string") {
    throw new Error(
      "The user identifier is missing.",
    );
  }

  const trimmed = value.trim();

  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!uuidPattern.test(trimmed)) {
    throw new Error(
      "The submitted user identifier is invalid.",
    );
  }

  return trimmed;
}

function readOptionalRole(
  value: FormDataEntryValue | null,
): StaffRole | null {
  if (
    typeof value !== "string" ||
    value.trim() === ""
  ) {
    return null;
  }

  const role = value.trim();

  if (
    !STAFF_ROLES.includes(
      role as StaffRole,
    )
  ) {
    throw new Error(
      "The selected staff role is invalid.",
    );
  }

  return role as StaffRole;
}

export async function updateUserStaffRole(
  formData: FormData,
) {
  await requireAdmin();

  const userId = readRequiredUuid(
    formData.get("userId"),
  );

  const role = readOptionalRole(
    formData.get("role"),
  );

  const supabase = await createClient();

  const { error } = await supabase.rpc(
    "set_staff_role",
    {
      target_user_id: userId,
      new_role: role,
    },
  );

  if (error) {
    throw new Error(
      `Unable to update staff role: ${error.message}`,
    );
  }

  revalidatePath("/admin");
  revalidatePath("/admin/users");

}

function readRequiredBoolean(
  value: FormDataEntryValue | null,
): boolean {
  if (value === "true") return true;
  if (value === "false") return false;

  throw new Error(
    "The selected access value is invalid.",
  );
}

export async function setUserPortalSkinEntitlement(
  formData: FormData,
) {
  const administrator = await requireAdmin();

  const userId = readRequiredUuid(formData.get("userId"));
  const skinId = readRequiredUuid(formData.get("skinId"));
  const enabled = readRequiredBoolean(formData.get("enabled"));

  const sourceValue = formData.get("source");
  const source =
    sourceValue === "paid" || sourceValue === "staff"
      ? sourceValue
      : null;

  if (!source) {
    throw new Error(
      "The selected portal skin unlock source is invalid.",
    );
  }

  const noteValue = formData.get("note");
  const note =
    typeof noteValue === "string" && noteValue.trim()
      ? noteValue.trim().slice(0, 1000)
      : null;

  const admin = createAdminClient();

  const { data: skin, error: skinError } =
    await admin
      .from("portal_skins")
      .select("id, slug, is_default")
      .eq("id", skinId)
      .maybeSingle();

  if (skinError || !skin) {
    throw new Error(
      `Unable to load portal skin: ${
        skinError?.message ?? "Skin not found."
      }`,
    );
  }

  if (skin.is_default) {
    throw new Error(
      "The default portal skin does not require an entitlement.",
    );
  }

  const { error: entitlementError } =
    await admin
      .from("user_portal_skin_entitlements")
      .upsert(
        {
          user_id: userId,
          skin_id: skinId,
          enabled,
          source,
          note,
          granted_by: administrator.userId,
          granted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,skin_id" },
      );

  if (entitlementError) {
    throw new Error(
      `Unable to update portal skin access: ${entitlementError.message}`,
    );
  }

  if (!enabled) {
    const {
      data: preference,
      error: preferenceError,
    } = await admin
      .from("user_portal_preferences")
      .select("selected_skin_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (preferenceError) {
      throw new Error(
        `Skin access changed, but the preference could not be checked: ${preferenceError.message}`,
      );
    }

    if (preference?.selected_skin_id === skinId) {
      const {
        data: defaultSkin,
        error: defaultSkinError,
      } = await admin
        .from("portal_skins")
        .select("id")
        .eq("is_default", true)
        .eq("is_active", true)
        .maybeSingle();

      if (defaultSkinError || !defaultSkin) {
        throw new Error(
          `Skin access was revoked, but the default skin could not be found: ${
            defaultSkinError?.message ?? "Default skin not found."
          }`,
        );
      }

      const { error: resetError } =
        await admin
          .from("user_portal_preferences")
          .upsert(
            {
              user_id: userId,
              selected_skin_id: defaultSkin.id,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id" },
          );

      if (resetError) {
        throw new Error(
          `Skin access was revoked, but the account could not be reset to the default skin: ${resetError.message}`,
        );
      }
    }
  }

  revalidatePath("/admin/users");
  revalidatePath("/appearance");
}

function readRequiredEmail(
  value: FormDataEntryValue | null,
): string {
  if (typeof value !== "string") {
    throw new Error(
      "The confirmation email is missing.",
    );
  }

  const email = value.trim().toLowerCase();

  if (
    !email ||
    !email.includes("@")
  ) {
    throw new Error(
      "Enter the complete account email to confirm deletion.",
    );
  }

  return email;
}

function redirectUserManagementError(
  message: string,
): never {
  redirect(
    `/admin/users?error=${encodeURIComponent(
      message,
    )}`,
  );
}

type StorageObjectRow = {
  bucket_id: string;
  name: string;
};

export async function deleteUserAccount(
  formData: FormData,
) {
  const administrator =
    await requireAdmin();

  const targetUserId =
    readRequiredUuid(
      formData.get("userId"),
    );

  const confirmationEmail =
    readRequiredEmail(
      formData.get(
        "confirmationEmail",
      ),
    );

  if (
    targetUserId ===
    administrator.userId
  ) {
    redirectUserManagementError(
      "You cannot delete the account currently being used to perform this action.",
    );
  }

  const admin =
    createAdminClient();

  const {
    data: targetUserResult,
    error: targetUserError,
  } = await admin.auth.admin.getUserById(
    targetUserId,
  );

  if (
    targetUserError ||
    !targetUserResult.user
  ) {
    redirectUserManagementError(
      `Unable to load the selected Auth account: ${
        targetUserError?.message ??
        "User not found."
      }`,
    );
  }

  const targetEmail =
    targetUserResult.user.email
      ?.trim()
      .toLowerCase() ?? null;

  if (!targetEmail) {
    redirectUserManagementError(
      "The selected account does not have an email address and cannot be confirmed through this form.",
    );
  }

  if (
    confirmationEmail !==
    targetEmail
  ) {
    redirectUserManagementError(
      `Confirmation does not match ${targetEmail}.`,
    );
  }

  const {
    data: targetStaff,
    error: targetStaffError,
  } = await admin
    .from("staff_members")
    .select("role")
    .eq("user_id", targetUserId)
    .maybeSingle();

  if (targetStaffError) {
    redirectUserManagementError(
      `Unable to verify the selected account role: ${targetStaffError.message}`,
    );
  }

  const protectedRole =
    targetStaff?.role === "owner" ||
    targetStaff?.role === "admin";

  if (
    administrator.role !== "owner" &&
    protectedRole
  ) {
    redirectUserManagementError(
      "Only the owner may delete an owner or administrator account.",
    );
  }

  /*
   * Supabase Auth refuses to delete users who still own
   * Storage objects. The companion SQL function returns
   * those objects; they are then removed through Storage API.
   */
  const {
    data: storageObjects,
    error: storageLookupError,
  } = await admin.rpc(
    "list_user_storage_objects",
    {
      target_user_id:
        targetUserId,
    },
  );

  if (storageLookupError) {
    redirectUserManagementError(
      `Unable to inspect files owned by the account: ${storageLookupError.message}. Make sure the account-deletion SQL migration has been applied.`,
    );
  }

  const objectsByBucket =
    new Map<string, string[]>();

  for (
    const object of
      (storageObjects ??
        []) as StorageObjectRow[]
  ) {
    const paths =
      objectsByBucket.get(
        object.bucket_id,
      ) ?? [];

    paths.push(object.name);

    objectsByBucket.set(
      object.bucket_id,
      paths,
    );
  }

  for (
    const [
      bucketId,
      paths,
    ] of objectsByBucket
  ) {
    const {
      error: storageDeleteError,
    } = await admin.storage
      .from(bucketId)
      .remove(paths);

    if (storageDeleteError) {
      redirectUserManagementError(
        `Unable to remove files from Storage bucket "${bucketId}": ${storageDeleteError.message}`,
      );
    }
  }

  const {
    data: characterRows,
    error: charactersError,
  } = await admin
    .from("characters")
    .select("id, public_slug")
    .eq("user_id", targetUserId);

  if (charactersError) {
    redirectUserManagementError(
      `Unable to load the account characters: ${charactersError.message}`,
    );
  }

  const characterIds =
    (characterRows ?? []).map(
      (character) =>
        character.id as string,
    );

  const publicSlugs =
    (characterRows ?? [])
      .map(
        (character) =>
          character.public_slug as
            | string
            | null,
      )
      .filter(
        (
          slug,
        ): slug is string =>
          Boolean(slug),
      );

  if (characterIds.length > 0) {

    const {
      data: conversationRows,
      error:
        conversationLookupError,
    } = await admin
      .from(
        "direct_conversation_participants",
      )
      .select("conversation_id")
      .in(
        "character_id",
        characterIds,
      );

    if (
      conversationLookupError
    ) {
      redirectUserManagementError(
        `Unable to inspect private conversations: ${conversationLookupError.message}`,
      );
    }

    const conversationIds = [
      ...new Set(
        (
          conversationRows ??
          []
        ).map(
          (row) =>
            row.conversation_id as string,
        ),
      ),
    ];

    const cleanupOperations = [
      admin
        .from(
          "character_presence",
        )
        .delete()
        .in(
          "character_id",
          characterIds,
        ),

      admin
        .from("room_messages")
        .delete()
        .in(
          "character_id",
          characterIds,
        ),

      admin
        .from("direct_messages")
        .delete()
        .in(
          "sender_character_id",
          characterIds,
        ),

      admin
        .from(
          "direct_conversation_participants",
        )
        .delete()
        .in(
          "character_id",
          characterIds,
        ),

      admin
        .from("character_blocks")
        .delete()
        .in(
          "blocker_character_id",
          characterIds,
        ),

      admin
        .from("character_blocks")
        .delete()
        .in(
          "blocked_character_id",
          characterIds,
        ),
    ];

    const cleanupResults =
      await Promise.all(
        cleanupOperations,
      );

    const cleanupFailure =
      cleanupResults.find(
        (result) =>
          result.error,
      )?.error;

    if (cleanupFailure) {
      redirectUserManagementError(
        `Unable to remove character-linked data: ${cleanupFailure.message}`,
      );
    }

    for (
      const conversationId of
        conversationIds
    ) {
      const {
        count,
        error:
          participantCountError,
      } = await admin
        .from(
          "direct_conversation_participants",
        )
        .select(
          "conversation_id",
          {
            count: "exact",
            head: true,
          },
        )
        .eq(
          "conversation_id",
          conversationId,
        );

      if (
        participantCountError
      ) {
        redirectUserManagementError(
          `Unable to verify a private conversation after cleanup: ${participantCountError.message}`,
        );
      }

      if ((count ?? 0) === 0) {
        const {
          error:
            conversationDeleteError,
        } = await admin
          .from(
            "direct_conversations",
          )
          .delete()
          .eq(
            "id",
            conversationId,
          );

        if (
          conversationDeleteError
        ) {
          redirectUserManagementError(
            `Unable to remove an empty private conversation: ${conversationDeleteError.message}`,
          );
        }
      }
    }

    for (
      const characterId of
        characterIds
    ) {
      const {
        data: characterDeleted,
        error:
          characterDeleteError,
      } = await admin.rpc(
        "delete_character_completely",
        {
          p_character_id:
            characterId,
        },
      );

      if (characterDeleteError) {
        redirectUserManagementError(
          `Unable to delete the account character: ${characterDeleteError.message}`,
        );
      }

      if (characterDeleted !== true) {
        redirectUserManagementError(
          "Unable to delete the account character: no character row was removed.",
        );
      }
    }
  }

  /*
   * Remove account-level records and references where the
   * deleted user acted as a staff reviewer.
   */
  const {
    error: forumReadsError,
  } = await admin
    .from("forum_topic_reads")
    .delete()
    .eq("user_id", targetUserId);

  if (forumReadsError) {
    redirectUserManagementError(
      `Unable to delete forum reading history: ${forumReadsError.message}`,
    );
  }

  const {
    error: approvedByError,
  } = await admin
    .from("characters")
    .update({
      approved_by: null,
    })
    .eq(
      "approved_by",
      targetUserId,
    );

  if (approvedByError) {
    redirectUserManagementError(
      `Unable to clear approval references: ${approvedByError.message}`,
    );
  }

  

  const {
    error: staffDeleteError,
  } = await admin
    .from("staff_members")
    .delete()
    .eq("user_id", targetUserId);

  if (staffDeleteError) {
    redirectUserManagementError(
      `Unable to remove the staff record: ${staffDeleteError.message}`,
    );
  }

  const {
    error: authDeleteError,
  } = await admin.auth.admin.deleteUser(
    targetUserId,
    false,
  );

  if (authDeleteError) {
    redirectUserManagementError(
      `The public account data was removed, but Supabase Auth could not delete the account: ${authDeleteError.message}`,
    );
  }

  revalidatePath("/");
  revalidatePath("/characters");
  revalidatePath("/admin");
  revalidatePath("/admin/users");
  revalidatePath(
    "/admin/characters",
  );

  for (
    const slug of publicSlugs
  ) {
    revalidatePath(
      `/characters/${slug}`,
    );
  }

  redirect(
    `/admin/users?deleted=${encodeURIComponent(
      targetEmail,
    )}`,
  );
}

