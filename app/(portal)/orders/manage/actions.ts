"use server";

import {
  createClient as createAdminClient,
} from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  adjustHealthForVigourModifier,
} from "@/lib/characters/adjust-health-for-vigour-modifier";
import {
  requireOrderHead,
} from "@/lib/orders/require-order-manager";
import {
  applyGiftOwnershipHealthEffects,
  removeGiftOwnershipHealthEffects,
} from "@/lib/gifts/gift-health-effects";
import {
  createClient,
} from "@/lib/supabase/server";

function req(formData: FormData, name: string) {
  const value = formData.get(name);

  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    throw new Error(`${name} is required.`);
  }

  return value.trim();
}

function back(
  orderId: string,
  type: "success" | "error",
  message: string,
): never {
  const params = new URLSearchParams();
  params.set(type, message);

  redirect(
    `/orders/manage?${params.toString()}#order-${orderId}`,
  );
}

async function level(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orderId: string,
  levelId: string,
) {
  const { data, error } = await supabase
    .from("order_levels")
    .select("id, level")
    .eq("id", levelId)
    .eq("order_id", orderId)
    .maybeSingle();

  if (error || !data) {
    throw new Error("Invalid Level.");
  }

  return data;
}

async function role(
  supabase: Awaited<ReturnType<typeof createClient>>,
  levelId: string,
  roleId: string,
) {
  const { data, error } = await supabase
    .from("order_jobs")
    .select("id, order_level_id, vigour_modifier")
    .eq("id", roleId)
    .eq("order_level_id", levelId)
    .maybeSingle();

  if (error || !data) {
    throw new Error(
      "Role does not belong to that Level.",
    );
  }

  return data;
}

function createPrivilegedClient() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const secret =
    process.env.SUPABASE_SECRET_KEY;

  if (!url || !secret) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY.",
    );
  }

  return createAdminClient(
    url,
    secret,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}

async function getOrderAssociation(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orderId: string,
) {
  const { data, error } = await supabase
    .from("orders")
    .select("association_id")
    .eq("id", orderId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  if (!data?.association_id) {
    throw new Error(
      "This Order has no Association assigned.",
    );
  }

  return data.association_id as string;
}

async function syncCharacterAssociation(
  characterId: string,
) {
  const admin =
    createPrivilegedClient();

  const { data, error } = await admin
    .from("order_memberships")
    .select(`
      order:orders!order_memberships_order_id_fkey(
        association_id
      )
    `)
    .eq("character_id", characterId)
    .limit(1);

  if (error) throw new Error(error.message);

  const relation =
    data?.[0]?.order ?? null;

  const order =
    Array.isArray(relation)
      ? relation[0] ?? null
      : relation;

  const { error: updateError } =
    await admin
      .from("characters")
      .update({
        association_id:
          order?.association_id ?? null,
      })
      .eq("id", characterId);

  if (updateError) {
    throw new Error(
      updateError.message,
    );
  }
}

async function adjustCharacterHealthForOrderModifier({
  characterId,
  oldModifier,
  newModifier,
}: {
  characterId: string;
  oldModifier: number;
  newModifier: number;
}) {
  if (oldModifier === newModifier) {
    return;
  }

  const admin =
    createPrivilegedClient();

  const { data: character, error } =
    await admin
      .from("characters")
      .select("current_health")
      .eq("id", characterId)
      .single();

  if (error) {
    throw new Error(error.message);
  }

  const currentHealth =
    adjustHealthForVigourModifier({
      currentHealth:
        character.current_health,
      oldModifier,
      newModifier,
    });

  const { error: healthError } =
    await admin
      .from("characters")
      .update({
        current_health:
          currentHealth,
      })
      .eq("id", characterId);

  if (healthError) {
    throw new Error(
      healthError.message,
    );
  }
}

async function syncOrderGiftsForRole({
  characterId,
  orderId,
  newRoleId,
}: {
  characterId: string;
  orderId: string;
  newRoleId: string;
}) {
  const admin =
    createPrivilegedClient();

  const {
    data: owned,
    error: ownedError,
  } = await admin
    .from("character_gifts")
    .select(`
      id,
      gift_id,
      source_order_job_id,
      sourceRole:order_jobs!character_gifts_source_order_job_id_fkey(
        order_level_id,
        level:order_levels(
          order_id
        )
      )
    `)
    .eq("character_id", characterId)
    .eq(
      "acquisition_source",
      "order",
    );

  if (ownedError) {
    throw new Error(
      ownedError.message,
    );
  }

  const fromThisOrder =
    (owned ?? []).filter(
      (assignment) => {
        const roleRelation =
          assignment.sourceRole ??
          null;

        const sourceRole =
          Array.isArray(
            roleRelation,
          )
            ? roleRelation[0] ??
              null
            : roleRelation;

        const levelRelation =
          sourceRole?.level ??
          null;

        const sourceLevel =
          Array.isArray(
            levelRelation,
          )
            ? levelRelation[0] ??
              null
            : levelRelation;

        return (
          sourceLevel?.order_id ===
          orderId
        );
      },
    );

  if (!fromThisOrder.length) {
    return;
  }

  const giftIds =
    fromThisOrder.map(
      (assignment) =>
        assignment.gift_id,
    );

  const {
    data: eligible,
    error: eligibilityError,
  } = await admin
    .from("gift_order_jobs")
    .select("gift_id")
    .eq(
      "order_job_id",
      newRoleId,
    )
    .in("gift_id", giftIds);

  if (eligibilityError) {
    throw new Error(
      eligibilityError.message,
    );
  }

  const eligibleIds =
    new Set(
      (eligible ?? []).map(
        (row) => row.gift_id,
      ),
    );

  const removeIds =
    fromThisOrder
      .filter(
        (assignment) =>
          !eligibleIds.has(
            assignment.gift_id,
          ),
      )
      .map(
        (assignment) =>
          assignment.id,
      );

  if (removeIds.length) {
    for (const assignmentId of removeIds) {
      await removeGiftOwnershipHealthEffects(
        assignmentId,
      );
    }

    const { error } =
      await admin
        .from("character_gifts")
        .delete()
        .in("id", removeIds);

    if (error) {
      throw new Error(
        error.message,
      );
    }
  }

  const keepIds =
    fromThisOrder
      .filter((assignment) =>
        eligibleIds.has(
          assignment.gift_id,
        ),
      )
      .map(
        (assignment) =>
          assignment.id,
      );

  if (keepIds.length) {
    const { error } =
      await admin
        .from("character_gifts")
        .update({
          source_order_job_id:
            newRoleId,
        })
        .in("id", keepIds);

    if (error) {
      throw new Error(
        error.message,
      );
    }
  }
}

async function removeOrderGiftsForMembership({
  characterId,
  orderId,
}: {
  characterId: string;
  orderId: string;
}) {
  const admin =
    createPrivilegedClient();

  const {
    data: owned,
    error,
  } = await admin
    .from("character_gifts")
    .select(`
      id,
      sourceRole:order_jobs!character_gifts_source_order_job_id_fkey(
        level:order_levels(
          order_id
        )
      )
    `)
    .eq("character_id", characterId)
    .eq(
      "acquisition_source",
      "order",
    );

  if (error) {
    throw new Error(error.message);
  }

  const ids =
    (owned ?? [])
      .filter((assignment) => {
        const roleRelation =
          assignment.sourceRole ??
          null;

        const role =
          Array.isArray(
            roleRelation,
          )
            ? roleRelation[0] ??
              null
            : roleRelation;

        const levelRelation =
          role?.level ?? null;

        const levelRow =
          Array.isArray(
            levelRelation,
          )
            ? levelRelation[0] ??
              null
            : levelRelation;

        return (
          levelRow?.order_id ===
          orderId
        );
      })
      .map(
        (assignment) =>
          assignment.id,
      );

  if (!ids.length) {
    return;
  }

  for (const assignmentId of ids) {
    await removeGiftOwnershipHealthEffects(
      assignmentId,
    );
  }

  const { error: deleteError } =
    await admin
      .from("character_gifts")
      .delete()
      .in("id", ids);

  if (deleteError) {
    throw new Error(
      deleteError.message,
    );
  }
}

function refresh(
  characterId?: string,
) {
  revalidatePath("/orders/manage");
  revalidatePath("/admin/orders");
  revalidatePath("/admin/gifts");
  revalidatePath("/orders");
  revalidatePath("/character");
  revalidatePath("/characters");
  revalidatePath("/game");

  if (characterId) {
    revalidatePath(
      `/admin/characters/${characterId}`,
    );
  }
}

export async function headAddMember(
  formData: FormData,
) {
  const orderId =
    req(formData, "orderId");

  let succeeded = false;

  try {
    const head =
      await requireOrderHead(orderId);

    const characterId =
      req(formData, "characterId");

    const levelId =
      req(formData, "levelId");

    const roleId =
      req(formData, "jobId");

    const supabase =
      await createClient();

    const selectedLevel =
      await level(
        supabase,
        orderId,
        levelId,
      );

    if (selectedLevel.level >= 6) {
      throw new Error(
        "Only staff can appoint a Level 6 Head.",
      );
    }

    const selectedRole =
      await role(
        supabase,
        levelId,
        roleId,
      );

    const associationId =
      await getOrderAssociation(
        supabase,
        orderId,
      );

    const admin =
      createPrivilegedClient();

    const { error } = await admin
      .from("order_memberships")
      .insert({
        order_id: orderId,
        character_id: characterId,
        order_level_id: levelId,
        order_job_id: roleId,
        added_by: head.userId,
      });

    if (error) {
      throw new Error(error.message);
    }

    const {
      error: associationError,
    } = await admin
      .from("characters")
      .update({
        association_id:
          associationId,
      })
      .eq("id", characterId);

    if (associationError) {
      await admin
        .from("order_memberships")
        .delete()
        .eq("order_id", orderId)
        .eq(
          "character_id",
          characterId,
        );

      throw new Error(
        `Membership was rolled back because the Association could not be synchronised: ${associationError.message}`,
      );
    }

    await adjustCharacterHealthForOrderModifier({
      characterId,
      oldModifier: 0,
      newModifier:
        selectedRole
          .vigour_modifier ?? 0,
    });

    refresh(characterId);
    succeeded = true;
  } catch (error) {
    back(
      orderId,
      "error",
      error instanceof Error
        ? error.message
        : "Unable to add member.",
    );
  }

  if (succeeded) {
    back(
      orderId,
      "success",
      "Member added.",
    );
  }
}

export async function headUpdateMember(
  formData: FormData,
) {
  const orderId =
    req(formData, "orderId");

  let succeeded = false;

  try {
    const head =
      await requireOrderHead(orderId);

    const membershipId =
      req(
        formData,
        "membershipId",
      );

    const levelId =
      req(formData, "levelId");

    const roleId =
      req(formData, "jobId");

    const supabase =
      await createClient();

    const {
      data: target,
      error,
    } = await supabase
      .from("order_memberships")
      .select(`
        character_id,
        level:order_levels!order_memberships_order_level_id_fkey(
          level
        ),
        role:order_jobs!order_memberships_order_job_id_fkey(
          id,
          vigour_modifier,
          order_level_id
        )
      `)
      .eq("id", membershipId)
      .eq("order_id", orderId)
      .maybeSingle();

    if (error || !target) {
      throw new Error(
        "Membership not found.",
      );
    }

    const existingLevel =
      Array.isArray(target.level)
        ? target.level[0] ?? null
        : target.level;

    const existingRole =
      Array.isArray(target.role)
        ? target.role[0] ?? null
        : target.role;

    if (
      target.character_id ===
        head.characterId ||
      existingLevel?.level === 6
    ) {
      throw new Error(
        "The Head cannot alter their own membership.",
      );
    }

    if (!existingLevel || !existingRole) {
      throw new Error(
        "The member's current Order position is incomplete.",
      );
    }

    const selectedLevel =
      await level(
        supabase,
        orderId,
        levelId,
      );

    if (selectedLevel.level >= 6) {
      throw new Error(
        "Only staff can appoint a Level 6 Head.",
      );
    }

    const selectedRole =
      await role(
        supabase,
        levelId,
        roleId,
      );



    const admin =
      createPrivilegedClient();

    const {
      error: updateError,
    } = await admin
      .from("order_memberships")
      .update({
        order_level_id: levelId,
        order_job_id: roleId,
      })
      .eq("id", membershipId)
      .eq("order_id", orderId);

    if (updateError) {
      throw new Error(
        updateError.message,
      );
    }

    await syncOrderGiftsForRole({
      characterId:
        target.character_id,
      orderId,
      newRoleId:
        selectedRole.id,
    });

    await adjustCharacterHealthForOrderModifier({
      characterId:
        target.character_id,
      oldModifier:
        existingRole
          .vigour_modifier ?? 0,
      newModifier:
        selectedRole
          .vigour_modifier ?? 0,
    });

    await syncCharacterAssociation(
      target.character_id,
    );

    refresh(
      target.character_id,
    );

    succeeded = true;
  } catch (error) {
    back(
      orderId,
      "error",
      error instanceof Error
        ? error.message
        : "Unable to update member.",
    );
  }

  if (succeeded) {
    back(
      orderId,
      "success",
      "Member updated.",
    );
  }
}

export async function headRemoveMember(
  formData: FormData,
) {
  const orderId =
    req(formData, "orderId");

  let succeeded = false;

  try {
    const head =
      await requireOrderHead(orderId);

    const membershipId =
      req(
        formData,
        "membershipId",
      );

    const supabase =
      await createClient();

    const {
      data: target,
      error,
    } = await supabase
      .from("order_memberships")
      .select(`
        character_id,
        level:order_levels!order_memberships_order_level_id_fkey(
          level
        ),
        role:order_jobs!order_memberships_order_job_id_fkey(
          id,
          vigour_modifier
        )
      `)
      .eq("id", membershipId)
      .eq("order_id", orderId)
      .maybeSingle();

    if (error || !target) {
      throw new Error(
        "Membership not found.",
      );
    }

    const existingLevel =
      Array.isArray(target.level)
        ? target.level[0] ?? null
        : target.level;

    const existingRole =
      Array.isArray(target.role)
        ? target.role[0] ?? null
        : target.role;

    if (
      target.character_id ===
        head.characterId ||
      existingLevel?.level === 6
    ) {
      throw new Error(
        "The Head cannot remove themselves.",
      );
    }

    if (!existingRole) {
      throw new Error(
        "The member has no valid Order Role.",
      );
    }

    const admin =
      createPrivilegedClient();

    await removeOrderGiftsForMembership({
      characterId:
        target.character_id,
      orderId,
    });

    const {
      error: deleteError,
    } = await admin
      .from("order_memberships")
      .delete()
      .eq("id", membershipId)
      .eq("order_id", orderId);

    if (deleteError) {
      throw new Error(
        deleteError.message,
      );
    }

    await adjustCharacterHealthForOrderModifier({
      characterId:
        target.character_id,
      oldModifier:
        existingRole
          .vigour_modifier ?? 0,
      newModifier: 0,
    });

    await syncCharacterAssociation(
      target.character_id,
    );

    refresh(
      target.character_id,
    );

    succeeded = true;
  } catch (error) {
    back(
      orderId,
      "error",
      error instanceof Error
        ? error.message
        : "Unable to remove member.",
    );
  }

  if (succeeded) {
    back(
      orderId,
      "success",
      "Member removed.",
    );
  }
}


export async function headAssignOrderGift(
  formData: FormData,
) {
  const orderId =
    req(formData, "orderId");

  try {
    const head =
      await requireOrderHead(
        orderId,
      );

    const membershipId =
      req(
        formData,
        "membershipId",
      );

    const giftId =
      req(formData, "giftId");

    const supabase =
      await createClient();

    const {
      data: membership,
      error: membershipError,
    } = await supabase
      .from("order_memberships")
      .select(`
        character_id,
        order_job_id,
        level:order_levels!order_memberships_order_level_id_fkey(
          level
        )
      `)
      .eq("id", membershipId)
      .eq("order_id", orderId)
      .maybeSingle();

    if (
      membershipError ||
      !membership
    ) {
      throw new Error(
        "Membership not found.",
      );
    }

    const levelRelation =
      membership.level ?? null;

    const currentLevel =
      Array.isArray(levelRelation)
        ? levelRelation[0] ?? null
        : levelRelation;

    if (
      currentLevel?.level === 6 &&
      membership.character_id !==
        head.characterId
    ) {
      throw new Error(
        "Only staff can manage another Level 6 Head.",
      );
    }

    if (!membership.order_job_id) {
      throw new Error(
        "This member has no valid Order Role.",
      );
    }

    const {
      data: gift,
      error: giftError,
    } = await supabase
      .from("gifts")
      .select("id, name")
      .eq("id", giftId)
      .eq("is_active", true)
      .maybeSingle();

    if (giftError || !gift) {
      throw new Error(
        "Feat is not active or does not exist.",
      );
    }

    const {
      data: eligibility,
      error: eligibilityError,
    } = await supabase
      .from("gift_order_jobs")
      .select("gift_id")
      .eq("gift_id", giftId)
      .eq(
        "order_job_id",
        membership.order_job_id,
      )
      .maybeSingle();

    if (
      eligibilityError ||
      !eligibility
    ) {
      throw new Error(
        "This Feat is not available through the member's current Role.",
      );
    }

    const admin =
      createPrivilegedClient();

    const {
      data: existing,
      error: existingError,
    } = await admin
      .from("character_gifts")
      .select(
        "id, acquisition_source",
      )
      .eq(
        "character_id",
        membership.character_id,
      )
      .eq("gift_id", giftId)
      .maybeSingle();

    if (existingError) {
      throw new Error(
        existingError.message,
      );
    }

    if (existing) {
      throw new Error(
        `This character already owns ${gift.name} through ${existing.acquisition_source}.`,
      );
    }

    const {
      data: assignment,
      error,
    } =
      await admin
        .from("character_gifts")
        .insert({
          character_id:
            membership.character_id,
          gift_id: giftId,
          acquisition_source:
            "order",
          source_order_job_id:
            membership.order_job_id,
          assigned_by:
            head.userId,
        })
        .select("id")
        .single();

    if (error || !assignment) {
      throw new Error(
        error?.message ??
          "Feat assignment could not be created.",
      );
    }

    await applyGiftOwnershipHealthEffects(
      assignment.id,
    );

    refresh(
      membership.character_id,
    );
  } catch (error) {
    back(
      orderId,
      "error",
      error instanceof Error
        ? error.message
        : "Unable to assign Feat.",
    );
  }

  back(
    orderId,
    "success",
    "Order Feat assigned.",
  );
}

export async function headRemoveOrderGift(
  formData: FormData,
) {
  const orderId =
    req(formData, "orderId");

  try {
    await requireOrderHead(
      orderId,
    );

    const membershipId =
      req(
        formData,
        "membershipId",
      );

    const assignmentId =
      req(
        formData,
        "assignmentId",
      );

    const supabase =
      await createClient();

    const {
      data: membership,
      error: membershipError,
    } = await supabase
      .from("order_memberships")
      .select("character_id")
      .eq("id", membershipId)
      .eq("order_id", orderId)
      .maybeSingle();

    if (
      membershipError ||
      !membership
    ) {
      throw new Error(
        "Membership not found.",
      );
    }

    const admin =
      createPrivilegedClient();

    const {
      data: assignment,
      error: assignmentError,
    } = await admin
      .from("character_gifts")
      .select(`
        id,
        character_id,
        acquisition_source,
        sourceRole:order_jobs!character_gifts_source_order_job_id_fkey(
          level:order_levels(
            order_id
          )
        )
      `)
      .eq("id", assignmentId)
      .eq(
        "character_id",
        membership.character_id,
      )
      .maybeSingle();

    if (
      assignmentError ||
      !assignment
    ) {
      throw new Error(
        "Feat assignment not found.",
      );
    }

    if (
      assignment.acquisition_source !==
      "order"
    ) {
      throw new Error(
        "Order Heads can remove only Feats assigned through an Order.",
      );
    }

    const roleRelation =
      assignment.sourceRole ??
      null;

    const sourceRole =
      Array.isArray(roleRelation)
        ? roleRelation[0] ?? null
        : roleRelation;

    const levelRelation =
      sourceRole?.level ?? null;

    const sourceLevel =
      Array.isArray(levelRelation)
        ? levelRelation[0] ?? null
        : levelRelation;

    if (
      sourceLevel?.order_id !==
      orderId
    ) {
      throw new Error(
        "This Feat was not assigned through this Order.",
      );
    }

    await removeGiftOwnershipHealthEffects(
      assignmentId,
    );

    const { error } =
      await admin
        .from("character_gifts")
        .delete()
        .eq("id", assignmentId);

    if (error) {
      throw new Error(
        error.message,
      );
    }

    refresh(
      membership.character_id,
    );
  } catch (error) {
    back(
      orderId,
      "error",
      error instanceof Error
        ? error.message
        : "Unable to remove Feat.",
    );
  }

  back(
    orderId,
    "success",
    "Order Feat removed.",
  );
}
