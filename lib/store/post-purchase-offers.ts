import "server-only";

import { createPremiumFeatureGrantNotification } from "@/lib/premium-features/notifications";
import { createAdminClient } from "@/lib/supabase/admin";

export async function issueStorePostPurchaseOffersAndNotify(input: {
  orderId: string;
  characterId: string;
  userId: string;
}) {
  const admin = createAdminClient();

  const { data: beforeRows, error: beforeError } = await admin
    .from("store_user_discount_codes")
    .select("id")
    .eq("source_order_id", input.orderId);

  if (beforeError) {
    throw new Error(
      `Unable to inspect existing Store rewards: ${beforeError.message}`,
    );
  }

  const beforeIds = new Set(
    (beforeRows ?? []).map((row) => String(row.id)),
  );

  const { error: issueError } = await admin.rpc(
    "issue_store_post_purchase_offers",
    { p_order_id: input.orderId },
  );

  if (issueError) {
    throw new Error(
      `Unable to issue Store post-purchase rewards: ${issueError.message}`,
    );
  }

  const { data: issuedRows, error: issuedError } = await admin
    .from("store_user_discount_codes")
    .select(
      "id, discount_code_id, post_purchase_offer_id, code, expires_at",
    )
    .eq("source_order_id", input.orderId)
    .order("created_at", { ascending: true });

  if (issuedError) {
    throw new Error(
      `Unable to load issued Store rewards: ${issuedError.message}`,
    );
  }

  const newlyIssued = (issuedRows ?? []).filter(
    (row) => !beforeIds.has(String(row.id)),
  );

  if (!newlyIssued.length) {
    return { issued: 0 };
  }

  const offerIds = [
    ...new Set(
      newlyIssued
        .map((row) => row.post_purchase_offer_id)
        .filter(Boolean),
    ),
  ] as string[];

  const discountIds = [
    ...new Set(
      newlyIssued
        .map((row) => row.discount_code_id)
        .filter(Boolean),
    ),
  ] as string[];

  const [offersResult, discountsResult] = await Promise.all([
    offerIds.length
      ? admin
          .from("store_post_purchase_offers")
          .select("id, name")
          .in("id", offerIds)
      : Promise.resolve({ data: [], error: null }),
    discountIds.length
      ? admin
          .from("store_discount_codes")
          .select("id, name")
          .in("id", discountIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const childError = offersResult.error ?? discountsResult.error;
  if (childError) {
    throw new Error(
      `Store reward was issued, but its details could not be loaded: ${childError.message}`,
    );
  }

  const offerNames = new Map(
    (offersResult.data ?? []).map((row) => [String(row.id), row.name]),
  );
  const discountNames = new Map(
    (discountsResult.data ?? []).map((row) => [String(row.id), row.name]),
  );

  for (const row of newlyIssued) {
    const rewardName =
      (row.post_purchase_offer_id
        ? offerNames.get(String(row.post_purchase_offer_id))
        : null) ??
      discountNames.get(String(row.discount_code_id)) ??
      "Store reward";

    const expiry = row.expires_at
      ? new Date(row.expires_at).toLocaleString("en-GB")
      : "the stated expiry";

    try {
      await createPremiumFeatureGrantNotification({
        characterId: input.characterId,
        createdBy: input.userId,
        title: "Store reward unlocked",
        body: `${rewardName}: your private discount code is ${row.code}. It expires ${expiry}.`,
        href: "/store",
      });
    } catch (notificationError) {
      console.error(
        "Store reward was issued, but its notification could not be created:",
        notificationError,
      );
    }
  }

  return { issued: newlyIssued.length };
}
