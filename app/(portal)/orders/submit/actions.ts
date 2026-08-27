"use server";

import { revalidatePath } from "next/cache";

import { stripRichTextForPreview } from "@/lib/rich-text-shared";
import { createClient } from "@/lib/supabase/server";

export type SubmitOrderIdeaState = {
  success: boolean;
  message: string;
};

type SubmittedRole = {
  name: string;
  description: string;
};

type SubmittedLevel = {
  level: number;
  roles: SubmittedRole[];
};

function text(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function parseLevels(raw: string): SubmittedLevel[] | null {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length !== 6) return null;

    const levels: SubmittedLevel[] = [];

    for (let level = 1; level <= 6; level += 1) {
      const source = parsed.find((entry) => Number(entry?.level) === level);
      if (!source || !Array.isArray(source.roles)) return null;

      const roles = source.roles
        .map((role: { name?: unknown; description?: unknown }) => ({
          name: typeof role?.name === "string" ? role.name.trim() : "",
          description:
            typeof role?.description === "string"
              ? role.description.trim()
              : "",
        }))
        .filter((role: SubmittedRole) => role.name || role.description);

      if (
        roles.length === 0 ||
        roles.some(
          (role: SubmittedRole) =>
            !role.name ||
            !role.description ||
            role.name.length > 120 ||
            role.description.length > 5000,
        )
      ) {
        return null;
      }

      levels.push({ level, roles });
    }

    return levels;
  } catch {
    return null;
  }
}

export async function submitOrderIdeaAction(
  _previousState: SubmitOrderIdeaState,
  formData: FormData,
): Promise<SubmitOrderIdeaState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "You must be signed in to submit an Order idea." };
  }

  const { data: character, error: characterError } = await supabase
    .from("characters")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "approved")
    .eq("is_system", false)
    .maybeSingle();

  if (characterError || !character) {
    return {
      success: false,
      message: "An approved character is required to submit an Order idea.",
    };
  }

  const orderName = text(formData.get("orderName"));
  const description = text(formData.get("description"));
  const bannerDescription = text(formData.get("bannerDescription"));
  const iconDescription = text(formData.get("iconDescription"));
  const levels = parseLevels(text(formData.get("levelsJson")));
  const visibleDescription = stripRichTextForPreview(description).trim();

  if (!orderName || orderName.length > 120) {
    return {
      success: false,
      message: "Order Name is required and must be 120 characters or fewer.",
    };
  }

  if (!visibleDescription || visibleDescription.length > 50000) {
    return { success: false, message: "Description is required and is too long." };
  }

  if (
    !bannerDescription ||
    bannerDescription.length > 5000 ||
    !iconDescription ||
    iconDescription.length > 5000
  ) {
    return {
      success: false,
      message:
        "Banner Description and Icon Description are required and must each be 5,000 characters or fewer.",
    };
  }

  if (!levels) {
    return {
      success: false,
      message:
        "Each of the six levels needs at least one complete role with a name and description.",
    };
  }

  const { error } = await supabase.from("order_submissions").insert({
    submitted_by_character_id: character.id,
    order_name: orderName,
    description,
    banner_description: bannerDescription,
    icon_description: iconDescription,
    levels,
    status: "pending",
  });

  if (error) {
    console.error("Unable to submit Order idea:", error.message);
    return {
      success: false,
      message: "Your Order idea could not be submitted. Please try again.",
    };
  }

  revalidatePath("/admin/order-submissions");

  return {
    success: true,
    message: "Your Order idea has been submitted for staff review.",
  };
}
