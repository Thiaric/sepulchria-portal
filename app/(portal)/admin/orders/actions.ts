"use server";

import {
  revalidatePath,
} from "next/cache";

import { requireStaff } from "@/lib/auth/require-staff";
import { sanitizeRichHtml } from "@/lib/rich-text";
import { createClient } from "@/lib/supabase/server";

function requiredText(
  formData: FormData,
  name: string,
  label: string,
) {
  const value =
    formData.get(name);

  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    throw new Error(
      `${label} is required.`,
    );
  }

  return value.trim();
}

function optionalText(
  formData: FormData,
  name: string,
) {
  const value =
    formData.get(name);

  if (
    typeof value !== "string"
  ) {
    return null;
  }

  return value.trim() || null;
}

function textOrEmpty(
  formData: FormData,
  name: string,
) {
  const value =
    formData.get(name);

  return typeof value === "string"
    ? value.trim()
    : "";
}

function checkbox(
  formData: FormData,
  name: string,
) {
  return (
    formData.get(name) === "on"
  );
}

function integer(
  formData: FormData,
  name: string,
) {
  const value =
    formData.get(name);

  if (
    typeof value !== "string"
  ) {
    return 0;
  }

  const parsed =
    Number.parseInt(
      value,
      10,
    );

  return Number.isFinite(parsed)
    ? parsed
    : 0;
}

function slugify(
  value: string,
) {
  return value
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .toLowerCase()
    .trim()
    .replace(/['’]/g, "")
    .replace(
      /[^a-z0-9]+/g,
      "-",
    )
    .replace(
      /^-+|-+$/g,
      "",
    );
}

function isUuid(
  value: string,
) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function redirectMessage(
  type: "success" | "error",
  message: string,
): never {
  void type;
  throw new Error(message);
}

async function uniqueSlug({
  requested,
  name,
  excludeId,
}: {
  requested: string | null;
  name: string;
  excludeId?: string;
}) {
  const supabase =
    await createClient();

  const base =
    slugify(
      requested || name,
    ) || "order";

  let candidate = base;
  let number = 2;

  while (true) {
    let query =
      supabase
        .from("orders")
        .select("id")
        .eq(
          "slug",
          candidate,
        )
        .limit(1);

    if (excludeId) {
      query =
        query.neq(
          "id",
          excludeId,
        );
    }

    const {
      data,
      error,
    } =
      await query.maybeSingle();

    if (error) {
      throw new Error(
        error.message,
      );
    }

    if (!data) {
      return candidate;
    }

    candidate =
      `${base}-${number}`;

    number += 1;
  }
}

function refreshOrders() {
  revalidatePath(
    "/admin/orders",
  );

  revalidatePath(
    "/admin/associations",
  );

  revalidatePath("/orders");
  revalidatePath("/character");
  revalidatePath("/characters");
  revalidatePath(
    "/admin/characters",
  );
}

async function syncCharactersForOrder(
  supabase: Awaited<
    ReturnType<typeof createClient>
  >,
  orderId: string,
  associationId: string,
) {
  const {
    data: memberships,
    error: membershipsError,
  } = await supabase
    .from("order_memberships")
    .select("character_id")
    .eq("order_id", orderId);

  if (membershipsError) {
    throw new Error(
      membershipsError.message,
    );
  }

  const characterIds =
    Array.from(
      new Set(
        (memberships ?? [])
          .map(
            (membership) =>
              membership.character_id,
          )
          .filter(Boolean),
      ),
    );

  if (
    characterIds.length === 0
  ) {
    return;
  }

  const {
    error: updateError,
  } = await supabase
    .from("characters")
    .update({
      association_id:
        associationId,
    })
    .in(
      "id",
      characterIds,
    );

  if (updateError) {
    throw new Error(
      updateError.message,
    );
  }

  characterIds.forEach(
    (characterId) => {
      revalidatePath(
        `/admin/characters/${characterId}`,
      );
    },
  );
}

async function recalculateCharacterAssociation(
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
  } = await supabase
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

  revalidatePath(
    `/admin/characters/${characterId}`,
  );
}

export async function createOrder(
  formData: FormData,
) {
  await requireStaff();

  try {
    const supabase =
      await createClient();

    const associationId =
      requiredText(
        formData,
        "associationId",
        "Association",
      );

    if (
      !isUuid(
        associationId,
      )
    ) {
      throw new Error(
        "Invalid Association.",
      );
    }

    const name =
      requiredText(
        formData,
        "name",
        "Order name",
      );

    const slug =
      await uniqueSlug({
        requested:
          optionalText(
            formData,
            "slug",
          ),
        name,
      });

    const {
      error,
    } =
      await supabase
        .from("orders")
        .insert({
          association_id:
            associationId,

          name,
          slug,

          summary:
            sanitizeRichHtml(
              textOrEmpty(
                formData,
                "summary",
              ),
            ),

          description:
            sanitizeRichHtml(
              textOrEmpty(
                formData,
                "description",
              ),
            ),

          image_url:
            optionalText(
              formData,
              "imageUrl",
            ),

          banner_url:
            optionalText(
              formData,
              "bannerUrl",
            ),

          icon_url:
            optionalText(
              formData,
              "iconUrl",
            ),

          colour:
            optionalText(
              formData,
              "colour",
            ),

          sort_order:
            integer(
              formData,
              "sortOrder",
            ),

          is_active:
            checkbox(
              formData,
              "isActive",
            ),
        });

    if (error) {
      throw new Error(
        error.message,
      );
    }
  } catch (error) {
    redirectMessage(
      "error",
      error instanceof Error
        ? error.message
        : "Unable to create Order.",
    );
  }

  refreshOrders();
}

export async function updateOrder(
  formData: FormData,
) {
  await requireStaff();

  try {
    const supabase =
      await createClient();

    const orderId =
      requiredText(
        formData,
        "orderId",
        "Order",
      );

    const associationId =
      requiredText(
        formData,
        "associationId",
        "Association",
      );

    if (
      !isUuid(orderId) ||
      !isUuid(
        associationId,
      )
    ) {
      throw new Error(
        "Invalid Order or Association.",
      );
    }

    const {
      data: existingOrder,
      error: existingOrderError,
    } = await supabase
      .from("orders")
      .select("association_id")
      .eq("id", orderId)
      .maybeSingle();

    if (
      existingOrderError ||
      !existingOrder
    ) {
      throw new Error(
        existingOrderError?.message ??
          "Order not found.",
      );
    }

    const previousAssociationId =
      existingOrder.association_id;

    const name =
      requiredText(
        formData,
        "name",
        "Order name",
      );

    const slug =
      await uniqueSlug({
        requested:
          optionalText(
            formData,
            "slug",
          ),
        name,
        excludeId:
          orderId,
      });

    const {
      error,
    } =
      await supabase
        .from("orders")
        .update({
          association_id:
            associationId,

          name,
          slug,

          summary:
            sanitizeRichHtml(
              textOrEmpty(
                formData,
                "summary",
              ),
            ),

          description:
            sanitizeRichHtml(
              textOrEmpty(
                formData,
                "description",
              ),
            ),

          image_url:
            optionalText(
              formData,
              "imageUrl",
            ),

          banner_url:
            optionalText(
              formData,
              "bannerUrl",
            ),

          icon_url:
            optionalText(
              formData,
              "iconUrl",
            ),

          colour:
            optionalText(
              formData,
              "colour",
            ),

          sort_order:
            integer(
              formData,
              "sortOrder",
            ),

          is_active:
            checkbox(
              formData,
              "isActive",
            ),
        })
        .eq(
          "id",
          orderId,
        );

    if (error) {
      throw new Error(
        error.message,
      );
    }

    if (
      previousAssociationId !==
      associationId
    ) {
      try {
        await syncCharactersForOrder(
          supabase,
          orderId,
          associationId,
        );
      } catch (syncError) {
        await supabase
          .from("orders")
          .update({
            association_id:
              previousAssociationId,
          })
          .eq(
            "id",
            orderId,
          );

        throw new Error(
          `The Order was not moved because member Associations could not be synchronised: ${
            syncError instanceof Error
              ? syncError.message
              : "Unknown error."
          }`,
        );
      }
    }
  } catch (error) {
    redirectMessage(
      "error",
      error instanceof Error
        ? error.message
        : "Unable to update Order.",
    );
  }

  refreshOrders();
}

export async function deleteOrder(
  formData: FormData,
) {
  await requireStaff();

  try {
    const supabase =
      await createClient();

    const orderId =
      requiredText(
        formData,
        "orderId",
        "Order",
      );

    if (!isUuid(orderId)) {
      throw new Error(
        "Invalid Order.",
      );
    }

    const confirmation =
      requiredText(
        formData,
        "confirmation",
        "Confirmation",
      );

    if (
      confirmation !==
      "DELETE"
    ) {
      throw new Error(
        'Type "DELETE" to confirm deletion.',
      );
    }

    const {
      data: memberships,
      error: membershipReadError,
    } = await supabase
      .from("order_memberships")
      .select("character_id")
      .eq("order_id", orderId);

    if (membershipReadError) {
      throw new Error(
        membershipReadError.message,
      );
    }

    const affectedCharacterIds =
      Array.from(
        new Set(
          (memberships ?? [])
            .map(
              (membership) =>
                membership.character_id,
            )
            .filter(Boolean),
        ),
      );

    const {
      error,
    } =
      await supabase
        .from("orders")
        .delete()
        .eq(
          "id",
          orderId,
        );

    if (error) {
      throw new Error(
        error.message,
      );
    }

    for (
      const characterId
      of affectedCharacterIds
    ) {
      await recalculateCharacterAssociation(
        supabase,
        characterId,
      );
    }
  } catch (error) {
    redirectMessage(
      "error",
      error instanceof Error
        ? error.message
        : "Unable to delete Order.",
    );
  }

  refreshOrders();
}
