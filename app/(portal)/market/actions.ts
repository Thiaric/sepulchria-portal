"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type MarketPurchaseResult = {
  ok: boolean;
  message: string;
  balance?: number;
  stockRemaining?: number | null;
};

export async function buyMarketListing(
  listingId: string,
  quantity: number,
): Promise<MarketPurchaseResult> {
  if (!listingId) {
    return {
      ok: false,
      message: "Invalid Market listing.",
    };
  }

  if (
    !Number.isSafeInteger(quantity) ||
    quantity < 1 ||
    quantity > 99
  ) {
    return {
      ok: false,
      message: "Purchase quantity must be between 1 and 99.",
    };
  }

  const supabase = await createClient();

  const { data, error } =
    await supabase.rpc(
      "market_buy_listing",
      {
        p_listing_id: listingId,
        p_quantity: quantity,
      },
    );

  if (error) {
    return {
      ok: false,
      message: error.message,
    };
  }

  const result =
    Array.isArray(data)
      ? data[0]
      : data;

  if (!result) {
    return {
      ok: false,
      message: "The purchase could not be confirmed.",
    };
  }

  revalidatePath("/market");
  revalidatePath("/character");
  revalidatePath("/characters");
  revalidatePath("/game");

  return {
    ok: true,
    message:
      quantity === 1
        ? `${result.item_name} purchased.`
        : `${quantity} × ${result.item_name} purchased.`,
    balance: Number(
      result.new_balance,
    ),
    stockRemaining:
      result.stock_remaining === null
        ? null
        : Number(
            result.stock_remaining,
          ),
  };
}


export type MarketSaleResult = {
  ok: boolean;
  message: string;
  balance?: number;
  stockRemaining?: number | null;
};

export async function sellMarketListing(
  listingId: string,
  quantity: number,
): Promise<MarketSaleResult> {
  if (!listingId) {
    return {
      ok: false,
      message: "Invalid Market listing.",
    };
  }

  if (
    !Number.isSafeInteger(quantity) ||
    quantity < 1 ||
    quantity > 99
  ) {
    return {
      ok: false,
      message: "Sale quantity must be between 1 and 99.",
    };
  }

  const supabase = await createClient();

  const { data, error } =
    await supabase.rpc(
      "market_sell_listing",
      {
        p_listing_id: listingId,
        p_quantity: quantity,
      },
    );

  if (error) {
    return {
      ok: false,
      message: error.message,
    };
  }

  const result =
    Array.isArray(data)
      ? data[0]
      : data;

  if (!result) {
    return {
      ok: false,
      message: "The sale could not be confirmed.",
    };
  }

  revalidatePath("/market");
  revalidatePath("/character");
  revalidatePath("/characters");
  revalidatePath("/game");

  return {
    ok: true,
    message:
      quantity === 1
        ? `${result.item_name} sold.`
        : `${quantity} × ${result.item_name} sold.`,
    balance: Number(
      result.new_balance,
    ),
    stockRemaining:
      result.stock_remaining === null
        ? null
        : Number(
            result.stock_remaining,
          ),
  };
}
