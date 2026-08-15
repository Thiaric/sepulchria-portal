"use client";

import { useMemo, useState } from "react";

type OrderOption = {
  id: string;
  name: string;
  associationName: string;
};

type ForumOrderSectionFieldsProps = {
  orders: OrderOption[];
  defaultOrderId?: string | null;
  inputClassName: string;
};

export function ForumOrderSectionFields({
  orders,
  defaultOrderId = null,
  inputClassName,
}: ForumOrderSectionFieldsProps) {
  const [orderId, setOrderId] = useState(
    defaultOrderId ?? "",
  );

  const selectedOrder = useMemo(
    () =>
      orders.find(
        (order) => order.id === orderId,
      ) ?? null,
    [orderId, orders],
  );

  return (
    <>
      <div>
        <label
          htmlFor="forum-section-order-owner"
          className="block text-[9px] uppercase tracking-[0.18em] text-[#9f8765]"
        >
          Order
        </label>

        <p className="mt-1 text-xs leading-5 text-[#746857]">
          Optional exact Order connected to this section.
          Selecting an Order automatically makes the section
          an Organisation / Members section.
        </p>

        <select
          id="forum-section-order-owner"
          name="order_id"
          value={orderId}
          onChange={(event) =>
            setOrderId(event.target.value)
          }
          className={`${inputClassName} mt-2`}
        >
          <option value="">
            No specific Order
          </option>

          {orders.map((order) => (
            <option
              key={order.id}
              value={order.id}
            >
              {order.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <span className="block text-[9px] uppercase tracking-[0.18em] text-[#9f8765]">
          Association
        </span>

        <p className="mt-1 text-xs leading-5 text-[#746857]">
          Automatically determined by the selected Order.
          It cannot be selected independently.
        </p>

        <div
          className={`${inputClassName} mt-2 flex min-h-[46px] items-center`}
          aria-live="polite"
        >
          {selectedOrder
            ? selectedOrder.associationName
            : "No Association"}
        </div>
      </div>
    </>
  );
}
