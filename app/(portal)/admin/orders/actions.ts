"use server";

import {
  revalidatePath,
} from "next/cache";
import { redirect } from "next/navigation";

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
  type:
    | "success"
    | "error",
  message: string,
): never {
  const params =
    new URLSearchParams();

  params.set(
    type,
    message,
  );

  redirect(
    `/admin/orders?${params.toString()}`,
  );
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

  redirectMessage(
    "success",
    "Order created successfully.",
  );
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
  } catch (error) {
    redirectMessage(
      "error",
      error instanceof Error
        ? error.message
        : "Unable to update Order.",
    );
  }

  refreshOrders();

  redirectMessage(
    "success",
    "Order updated successfully.",
  );
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
  } catch (error) {
    redirectMessage(
      "error",
      error instanceof Error
        ? error.message
        : "Unable to delete Order.",
    );
  }

  refreshOrders();

  redirectMessage(
    "success",
    "Order deleted successfully.",
  );
}