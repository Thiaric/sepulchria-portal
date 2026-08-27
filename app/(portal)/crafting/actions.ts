"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type CraftRecipeResult = {
  success: boolean;
  message: string;
};

export async function craftRecipeAction(
  recipeId: string,
): Promise<CraftRecipeResult> {
  if (!recipeId) {
    return {
      success: false,
      message: "Choose a recipe first.",
    };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      message: "You must be signed in to craft.",
    };
  }

  const { data: character, error: characterError } = await supabase
    .from("characters")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (characterError || !character) {
    return {
      success: false,
      message:
        characterError?.message ??
        "No character is available for crafting.",
    };
  }

  const { data, error } = await supabase.rpc("craft_recipe", {
    p_character_id: character.id,
    p_recipe_id: recipeId,
  });

  if (error) {
    return {
      success: false,
      message: error.message,
    };
  }

  const result = data as
    | {
        success?: boolean;
        message?: string;
      }
    | null;

  if (!result?.success) {
    return {
      success: false,
      message: result?.message ?? "Crafting failed.",
    };
  }

  revalidatePath("/crafting");
  revalidatePath("/character");

  return {
    success: true,
    message: result.message ?? "Item crafted.",
  };
}
