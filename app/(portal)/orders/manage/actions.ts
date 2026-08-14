"use server";

import {
  createClient as createAdminClient,
} from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireOrderHead } from "@/lib/orders/require-order-manager";
import { createClient } from "@/lib/supabase/server";

function req(
  formData: FormData,
  name: string,
) {
  const value =
    formData.get(name);

  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    throw new Error(
      `${name} is required.`,
    );
  }

  return value.trim();
}

function opt(
  formData: FormData,
  name: string,
) {
  const value =
    formData.get(name);

  return typeof value === "string" &&
    value.trim()
    ? value.trim()
    : null;
}

function back(
  orderId: string,
  type: "success" | "error",
  message: string,
): never {
  const params =
    new URLSearchParams();

  params.set(type, message);

  redirect(
    `/orders/manage?${params.toString()}#order-${orderId}`,
  );
}

async function level(
  supabase: Awaited<
    ReturnType<typeof createClient>
  >,
  orderId: string,
  levelId: string,
) {
  const {
    data,
    error,
  } = await supabase
    .from("order_levels")
    .select("level")
    .eq("id", levelId)
    .eq("order_id", orderId)
    .maybeSingle();

  if (error || !data) {
    throw new Error(
      "Invalid level.",
    );
  }

  return data.level;
}

async function role(
  supabase: Awaited<
    ReturnType<typeof createClient>
  >,
  levelId: string,
  roleId: string | null,
) {
  if (!roleId) {
    return;
  }

  const {
    data,
    error,
  } = await supabase
    .from("order_jobs")
    .select("id")
    .eq("id", roleId)
    .eq(
      "order_level_id",
      levelId,
    )
    .maybeSingle();

  if (error || !data) {
    throw new Error(
      "Role does not belong to that level.",
    );
  }
}

function createPrivilegedClient() {
  const url =
    process.env
      .NEXT_PUBLIC_SUPABASE_URL;

  const secret =
    process.env
      .SUPABASE_SECRET_KEY;

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
  supabase: Awaited<
    ReturnType<typeof createClient>
  >,
  orderId: string,
) {
  const {
    data,
    error,
  } = await supabase
    .from("orders")
    .select("association_id")
    .eq("id", orderId)
    .maybeSingle();

  if (error) {
    throw new Error(
      error.message,
    );
  }

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

  const {
    data: memberships,
    error,
  } = await admin
    .from("order_memberships")
    .select(`
      order:orders!order_memberships_order_id_fkey(
        association_id
      )
    `)
    .eq(
      "character_id",
      characterId,
    )
    .limit(1);

  if (error) {
    throw new Error(
      error.message,
    );
  }

  const relation =
    memberships?.[0]?.order ??
    null;

  const order =
    Array.isArray(relation)
      ? relation[0] ?? null
      : relation;

  const associationId =
    order?.association_id ?? null;

  const {
    error: updateError,
  } = await admin
    .from("characters")
    .update({
      association_id:
        associationId,
    })
    .eq(
      "id",
      characterId,
    );

  if (updateError) {
    throw new Error(
      updateError.message,
    );
  }
}

function refresh(
  characterId?: string,
) {
  revalidatePath(
    "/orders/manage",
  );
  revalidatePath(
    "/admin/orders",
  );
  revalidatePath("/orders");
  revalidatePath("/character");
  revalidatePath("/characters");

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
      await requireOrderHead(
        orderId,
      );

    const characterId =
      req(
        formData,
        "characterId",
      );

    const levelId =
      req(formData, "levelId");

    const roleId =
      opt(formData, "jobId");

    const supabase =
      await createClient();

    if (
      (await level(
        supabase,
        orderId,
        levelId,
      )) >= 5
    ) {
      throw new Error(
        "Only staff can appoint a Level 5 Head.",
      );
    }

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

    const {
      error,
    } = await admin
      .from("order_memberships")
      .insert({
        order_id: orderId,
        character_id:
          characterId,
        order_level_id:
          levelId,
        order_job_id:
          roleId,
        added_by:
          head.userId,
      });

    if (error) {
      throw new Error(
        error.message,
      );
    }

    const {
      error: associationError,
    } = await admin
      .from("characters")
      .update({
        association_id:
          associationId,
      })
      .eq(
        "id",
        characterId,
      );

    if (associationError) {
      await admin
        .from(
          "order_memberships",
        )
        .delete()
        .eq(
          "order_id",
          orderId,
        )
        .eq(
          "character_id",
          characterId,
        );

      throw new Error(
        `Membership was rolled back because the Association could not be synchronised: ${associationError.message}`,
      );
    }

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
      await requireOrderHead(
        orderId,
      );

    const membershipId =
      req(
        formData,
        "membershipId",
      );

    const levelId =
      req(formData, "levelId");

    const roleId =
      opt(formData, "jobId");

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
        )
      `)
      .eq("id", membershipId)
      .eq("order_id", orderId)
      .maybeSingle();

    const existingLevel =
      Array.isArray(
        target?.level,
      )
        ? target?.level[0]
        : target?.level;

    if (error || !target) {
      throw new Error(
        "Membership not found.",
      );
    }

    if (
      target.character_id ===
        head.characterId ||
      existingLevel?.level === 5
    ) {
      throw new Error(
        "The Head cannot alter their own membership.",
      );
    }

    if (
      (await level(
        supabase,
        orderId,
        levelId,
      )) >= 5
    ) {
      throw new Error(
        "Only staff can appoint a Level 5 Head.",
      );
    }

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
        order_level_id:
          levelId,
        order_job_id:
          roleId,
      })
      .eq("id", membershipId)
      .eq("order_id", orderId);

    if (updateError) {
      throw new Error(
        updateError.message,
      );
    }

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
      await requireOrderHead(
        orderId,
      );

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
        )
      `)
      .eq("id", membershipId)
      .eq("order_id", orderId)
      .maybeSingle();

    const existingLevel =
      Array.isArray(
        target?.level,
      )
        ? target?.level[0]
        : target?.level;

    if (error || !target) {
      throw new Error(
        "Membership not found.",
      );
    }

    if (
      target.character_id ===
        head.characterId ||
      existingLevel?.level === 5
    ) {
      throw new Error(
        "The Head cannot remove themselves.",
      );
    }

    const admin =
      createPrivilegedClient();

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
