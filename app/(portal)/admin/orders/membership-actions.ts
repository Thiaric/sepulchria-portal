"use server";

import { revalidatePath } from "next/cache";

import { requireStaff } from "@/lib/auth/require-staff";
import { adjustHealthForVigourModifier } from "@/lib/characters/adjust-health-for-vigour-modifier";
import { createClient } from "@/lib/supabase/server";

function text(
  formData: FormData,
  field: string,
  label: string,
) {
  const value = formData.get(field);

  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    throw new Error(`${label} is required.`);
  }

  return value.trim();
}

function optionalText(
  formData: FormData,
  field: string,
) {
  const value = formData.get(field);

  return typeof value === "string" &&
    value.trim()
    ? value.trim()
    : null;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function refresh(characterId?: string) {
  revalidatePath("/admin/orders");
  revalidatePath("/orders");
  revalidatePath("/admin/characters");
  revalidatePath("/characters");
  revalidatePath("/character");

  if (characterId) {
    revalidatePath(
      `/admin/characters/${characterId}`,
    );
  }
}

async function verifyStructure({
  supabase,
  orderId,
  levelId,
  jobId,
}: {
  supabase: Awaited<
    ReturnType<typeof createClient>
  >;
  orderId: string;
  levelId: string;
  jobId: string;
}) {
  const {
    data: level,
    error: levelError,
  } = await supabase
    .from("order_levels")
    .select(
  "id, level",
)
    .eq("id", levelId)
    .eq("order_id", orderId)
    .maybeSingle();

  if (levelError) {
    throw new Error(levelError.message);
  }

  if (!level) {
    throw new Error(
      "The selected level does not belong to this Order.",
    );
  }

  const {
    data: job,
    error: jobError,
  } = await supabase
    .from("order_jobs")
    .select("id, vigour_modifier")
    .eq("id", jobId)
    .eq("order_level_id", levelId)
    .maybeSingle();

  if (jobError) {
    throw new Error(jobError.message);
  }

  if (!job) {
    throw new Error(
      "The selected Role does not belong to the selected Level.",
    );
  }

  return { level, job };
}

async function getOrderAssociation(
  supabase: Awaited<
    ReturnType<typeof createClient>
  >,
  orderId: string,
) {
  const {
    data: order,
    error,
  } = await supabase
    .from("orders")
    .select("association_id")
    .eq("id", orderId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!order?.association_id) {
    throw new Error(
      "This Order has no Association assigned.",
    );
  }

  return order.association_id as string;
}

async function syncCharacterAssociation(
  supabase: Awaited<
    ReturnType<typeof createClient>
  >,
  characterId: string,
) {
  const {
    data: memberships,
    error,
  } = await supabase
    .from("order_memberships")
    .select(`
      order:orders!order_memberships_order_id_fkey(
        association_id
      )
    `)
    .eq("character_id", characterId)
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  const relation =
    memberships?.[0]?.order ?? null;

  const order =
    Array.isArray(relation)
      ? relation[0] ?? null
      : relation;

  const associationId =
    order?.association_id ?? null;

  const {
    error: updateError,
  } = await supabase
    .from("characters")
    .update({
      association_id: associationId,
    })
    .eq("id", characterId);

  if (updateError) {
    throw new Error(
      updateError.message,
    );
  }
}

async function adjustCharacterHealthForOrderModifier({
  supabase,
  characterId,
  oldModifier,
  newModifier,
}: {
  supabase: Awaited<
    ReturnType<typeof createClient>
  >;
  characterId: string;
  oldModifier: number;
  newModifier: number;
}) {
  if (oldModifier === newModifier) {
    return;
  }

  const {
    data: character,
    error: characterError,
  } = await supabase
    .from("characters")
    .select("current_health")
    .eq("id", characterId)
    .single();

  if (characterError) {
    throw new Error(
      characterError.message,
    );
  }

  const newCurrentHealth =
    adjustHealthForVigourModifier({
      currentHealth:
        character.current_health,
      oldModifier,
      newModifier,
    });

  const {
    error: healthError,
  } = await supabase
    .from("characters")
    .update({
      current_health:
        newCurrentHealth,
    })
    .eq("id", characterId);

  if (healthError) {
    throw new Error(
      healthError.message,
    );
  }
}

export async function addOrderMember(
  formData: FormData,
) {
  const staff = await requireStaff();

  const orderId = text(
    formData,
    "orderId",
    "Order",
  );

  try {
    const characterId = text(
      formData,
      "characterId",
      "Character",
    );

    const levelId = text(
      formData,
      "levelId",
      "Level",
    );

    const jobId = text(
      formData,
      "jobId",
      "Role",
    );

    if (
      !isUuid(orderId) ||
      !isUuid(characterId) ||
      !isUuid(levelId) ||
      !isUuid(jobId)
    ) {
      throw new Error(
        "The selected membership data is invalid.",
      );
    }

    const supabase =
      await createClient();

    const selected =
  await verifyStructure({
    supabase,
    orderId,
    levelId,
    jobId,
  });

    const associationId =
      await getOrderAssociation(
        supabase,
        orderId,
      );

    const {
      data: character,
      error: characterError,
    } = await supabase
      .from("characters")
      .select("id, display_name")
      .eq("id", characterId)
      .maybeSingle();

    if (characterError) {
      throw new Error(
        characterError.message,
      );
    }

    if (!character) {
      throw new Error(
        "The selected character no longer exists.",
      );
    }

    const {
      error: membershipError,
    } = await supabase
      .from("order_memberships")
      .insert({
        order_id: orderId,
        character_id: characterId,
        order_level_id: levelId,
        order_job_id: jobId,
        added_by: staff.userId,
      });

    if (membershipError) {
      if (
        membershipError.code ===
        "23505"
      ) {
        throw new Error(
          `${character.display_name} is already a member of an Order.`,
        );
      }

      throw new Error(
        membershipError.message,
      );
    }

    const {
      error: associationError,
    } = await supabase
      .from("characters")
      .update({
        association_id:
          associationId,
      })
      .eq("id", characterId);

    if (associationError) {
      await supabase
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
  supabase,
  characterId,
  oldModifier: 0,
  newModifier:
    selected.job
      .vigour_modifier ?? 0,
});

refresh(characterId);
    return;
  } catch (error) {
    if (
      error instanceof Error &&
      error.message ===
        "NEXT_REDIRECT"
    ) {
      throw error;
    }

    throw new Error(error instanceof Error ? error.message : "Unable to add the Order member.");
  }

}

export async function updateOrderMember(
  formData: FormData,
) {
  await requireStaff();

  const orderId = text(
    formData,
    "orderId",
    "Order",
  );

  try {
    const membershipId = text(
      formData,
      "membershipId",
      "Membership",
    );

    const levelId = text(
      formData,
      "levelId",
      "Level",
    );

    const jobId = text(
      formData,
      "jobId",
      "Role",
    );

    if (
      !isUuid(orderId) ||
      !isUuid(membershipId) ||
      !isUuid(levelId) ||
      !isUuid(jobId)
    ) {
      throw new Error(
        "The selected membership data is invalid.",
      );
    }

    const supabase =
      await createClient();

    const selected =
  await verifyStructure({
    supabase,
    orderId,
    levelId,
    jobId,
  });

    const {
      data: membership,
      error: readError,
    } = await supabase
      .from("order_memberships")
      .select(`
  id,
  character_id,
  role:order_jobs!order_memberships_order_job_id_fkey(
    vigour_modifier
  ),
  character:characters(
    display_name
  )
`)
      .eq("id", membershipId)
      .eq("order_id", orderId)
      .maybeSingle();

    if (readError) {
      throw new Error(
        readError.message,
      );
    }

    if (!membership) {
      throw new Error(
        "The selected membership no longer exists.",
      );
    }

    const oldRoleRelation =
  Array.isArray(
    membership.role,
  )
    ? membership.role[0] ??
      null
    : membership.role;

const oldVigourModifier =
  oldRoleRelation
    ?.vigour_modifier ?? 0;

const newVigourModifier =
  selected.job
    .vigour_modifier ?? 0;

    const { error } = await supabase
      .from("order_memberships")
      .update({
        order_level_id: levelId,
        order_job_id: jobId,
      })
      .eq("id", membershipId);

    if (error) {
  throw new Error(error.message);
}

await adjustCharacterHealthForOrderModifier({
  supabase,
  characterId:
    membership.character_id,
  oldModifier:
    oldVigourModifier,
  newModifier:
    newVigourModifier,
});

await syncCharacterAssociation(
  supabase,
  membership.character_id,
);

    const relation =
      Array.isArray(
        membership.character,
      )
        ? membership.character[0]
        : membership.character;

    const name =
      relation?.display_name ??
      "Member";

    refresh(
      membership.character_id,
    );
    return;
  } catch (error) {
    if (
      error instanceof Error &&
      error.message ===
        "NEXT_REDIRECT"
    ) {
      throw error;
    }

    throw new Error(error instanceof Error ? error.message : "Unable to update the Order member.");
  }

}

export async function removeOrderMember(
  formData: FormData,
) {
  await requireStaff();

  const orderId = text(
    formData,
    "orderId",
    "Order",
  );

  try {
    const membershipId = text(
      formData,
      "membershipId",
      "Membership",
    );

    if (
      !isUuid(orderId) ||
      !isUuid(membershipId)
    ) {
      throw new Error(
        "The selected membership is invalid.",
      );
    }

    const supabase =
      await createClient();

    const {
      data: membership,
      error: readError,
    } = await supabase
      .from("order_memberships")
      .select(`
  id,
  character_id,
  role:order_jobs!order_memberships_order_job_id_fkey(
    vigour_modifier
  ),
  character:characters(
    display_name
  )
`)
      .eq("id", membershipId)
      .eq("order_id", orderId)
      .maybeSingle();

    if (readError) {
      throw new Error(
        readError.message,
      );
    }

    if (!membership) {
      throw new Error(
        "The selected membership no longer exists.",
      );
    }

    const oldRoleRelation =
  Array.isArray(
    membership.role,
  )
    ? membership.role[0] ??
      null
    : membership.role;

const oldVigourModifier =
  oldRoleRelation
    ?.vigour_modifier ?? 0;

    const { error } = await supabase
      .from("order_memberships")
      .delete()
      .eq("id", membershipId);

    if (error) {
  throw new Error(error.message);
}

await adjustCharacterHealthForOrderModifier({
  supabase,
  characterId:
    membership.character_id,
  oldModifier:
    oldVigourModifier,
  newModifier: 0,
});

await syncCharacterAssociation(
  supabase,
  membership.character_id,
);

    const relation =
      Array.isArray(
        membership.character,
      )
        ? membership.character[0]
        : membership.character;

    const name =
      relation?.display_name ??
      "Member";

    refresh(
      membership.character_id,
    );
    return;
  } catch (error) {
    if (
      error instanceof Error &&
      error.message ===
        "NEXT_REDIRECT"
    ) {
      throw error;
    }

    throw new Error(error instanceof Error ? error.message : "Unable to remove the Order member.");
  }

}
