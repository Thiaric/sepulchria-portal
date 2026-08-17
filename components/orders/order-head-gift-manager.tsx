"use client";

import {
  headAssignOrderGift,
  headRemoveOrderGift,
} from "@/app/(portal)/orders/manage/actions";

export type OrderGiftOption = {
  id: string;
  name: string;
  description: string;
  roleIds: string[];
};

export type OrderGiftOwnership = {
  assignmentId: string;
  giftId: string;
  source: "ancestry" | "order" | "staff";
  sourceOrderJobId: string | null;
};

export function OrderHeadGiftManager({
  orderId,
  membershipId,
  currentRoleId,
  gifts,
  ownership,
}: {
  orderId: string;
  membershipId: string;
  currentRoleId: string;
  gifts: OrderGiftOption[];
  ownership: OrderGiftOwnership[];
}) {
  const eligible = gifts.filter(
    (gift) =>
      gift.roleIds.includes(
        currentRoleId,
      ),
  );

  const ownedByGiftId =
    new Map(
      ownership.map((item) => [
        item.giftId,
        item,
      ]),
    );

  const orderOwned =
    ownership.filter(
      (item) =>
        item.source === "order",
    );

  return (
    <div className="mt-3 border-t border-[#59432c]/30 pt-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[7px] uppercase tracking-[0.14em] text-[#756958]">
            Order Gifts
          </p>

          <p className="mt-1 text-[9px] leading-4 text-[#6f665a]">
            Gifts available through this member&apos;s current Role.
          </p>
        </div>

        <span className="text-[7px] uppercase tracking-[0.12em] text-[#695d4d]">
          {orderOwned.length} assigned by Order
        </span>
      </div>

      {eligible.length ? (
        <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {eligible.map((gift) => {
            const owned =
              ownedByGiftId.get(
                gift.id,
              );

            const isOrderOwned =
              owned?.source ===
              "order";

            return (
              <div
                key={gift.id}
                className="border border-[#59432c]/35 bg-[#0d0907] p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-serif text-sm text-[#d8bf91]">
                    {gift.name}
                  </p>

                  {owned ? (
                    <span className="shrink-0 text-[7px] uppercase tracking-[0.11em] text-[#8b7657]">
                      {isOrderOwned
                        ? "Assigned"
                        : `Owned · ${owned.source}`}
                    </span>
                  ) : null}
                </div>

                {gift.description ? (
                  <p className="mt-2 text-[9px] leading-4 text-[#817565]">
                    {gift.description}
                  </p>
                ) : null}

                {!owned ? (
                  <form
                    action={
                      headAssignOrderGift
                    }
                    className="mt-3"
                  >
                    <input
                      type="hidden"
                      name="orderId"
                      value={orderId}
                    />

                    <input
                      type="hidden"
                      name="membershipId"
                      value={membershipId}
                    />

                    <input
                      type="hidden"
                      name="giftId"
                      value={gift.id}
                    />

                    <button
                      type="submit"
                      className="border border-[#765937]/55 bg-[#261b12] px-3 py-2 text-[7px] uppercase tracking-[0.12em] text-[#ccb083]"
                    >
                      Assign Gift
                    </button>
                  </form>
                ) : isOrderOwned ? (
                  <form
                    action={
                      headRemoveOrderGift
                    }
                    className="mt-3"
                  >
                    <input
                      type="hidden"
                      name="orderId"
                      value={orderId}
                    />

                    <input
                      type="hidden"
                      name="membershipId"
                      value={membershipId}
                    />

                    <input
                      type="hidden"
                      name="assignmentId"
                      value={
                        owned.assignmentId
                      }
                    />

                    <button
                      type="submit"
                      className="border border-red-900/45 bg-red-950/15 px-3 py-2 text-[7px] uppercase tracking-[0.12em] text-red-300"
                    >
                      Remove Gift
                    </button>
                  </form>
                ) : (
                  <p className="mt-3 text-[8px] italic leading-4 text-[#6d6254]">
                    This character already owns this Gift through {owned.source}; the Order does not create a duplicate.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-3 text-[9px] italic text-[#6d6254]">
          No active Gifts are linked to this Role.
        </p>
      )}
    </div>
  );
}
