"use server";

import { revalidatePath } from "next/cache";
import { createPremiumFeatureGrantNotification } from "@/lib/premium-features/notifications";
import { createClient } from "@/lib/supabase/server";

export type StorePurchaseState = { ok: boolean; error: string | null; orderId: string | null };

export async function purchaseStoreProductWithRemnants(
  _previousState: StorePurchaseState,
  formData: FormData,
): Promise<StorePurchaseState> {
  const productId = String(formData.get("productId") ?? "").trim();
  if (!productId) return { ok: false, error: "Store product is missing.", orderId: null };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in.", orderId: null };

  const [characterResult, productResult] = await Promise.all([
    supabase.from("characters").select("id").eq("user_id", user.id).maybeSingle(),
    supabase.from("store_products").select("name").eq("id", productId).maybeSingle(),
  ]);

  if (characterResult.error || !characterResult.data) {
    return { ok: false, error: characterResult.error?.message ?? "Character not found.", orderId: null };
  }

  const { data, error } = await supabase.rpc("purchase_store_product_with_remnants", { p_product_id: productId });
  if (error) return { ok: false, error: error.message, orderId: null };

  try {
    await createPremiumFeatureGrantNotification({
      characterId: characterResult.data.id,
      createdBy: user.id,
      title: "Store purchase complete",
      body: `You purchased ${productResult.data?.name ?? "a Store product"} with Remnants. Your unlock is available immediately.`,
      href: "/store",
    });
  } catch (notificationError) {
    console.error("Store purchase succeeded, but its notification could not be created:", notificationError);
  }

  for (const path of ["/store", "/appearance", "/cosmetics", "/friends", "/private-locations", "/character", "/game"]) {
    revalidatePath(path);
  }
  revalidatePath("/", "layout");

  return { ok: true, error: null, orderId: typeof data === "string" ? data : String(data ?? "") };
}
