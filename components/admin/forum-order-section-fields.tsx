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
      <div className="components_admin_forum_order_section_fields_div_order">
        <label
          htmlFor="forum-section-order-owner"
          className="block text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-9f8765))] components_admin_forum_order_section_fields_label_forum_section_order_owner"
        >
          Order
        </label>

        <p className="mt-1 text-xs leading-5 text-[rgb(var(--sep-colour-746857))] components_admin_forum_order_section_fields_p_order">
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
          className={[((`${inputClassName} mt-2`)), "components_admin_forum_order_section_fields_select_order_id"].filter(Boolean).join(" ")}
        >
          <option className="components_admin_forum_order_section_fields_option_forum_section_order_owner" value="">
            No specific Order
          </option>

          {orders.map((order) => (
            <option className="components_admin_forum_order_section_fields_option_option"
              key={order.id}
              value={order.id}
            >
              {order.name}
            </option>
          ))}
        </select>
      </div>

      <div className="components_admin_forum_order_section_fields_div_container">
        <span className="block text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-9f8765))] components_admin_forum_order_section_fields_span_text">
          Association
        </span>

        <p className="mt-1 text-xs leading-5 text-[rgb(var(--sep-colour-746857))] components_admin_forum_order_section_fields_p_text">
          Automatically determined by the selected Order.
          It cannot be selected independently.
        </p>

        <div
          className={[((`${inputClassName} mt-2 flex min-h-[46px] items-center`)), "components_admin_forum_order_section_fields_div_container_2"].filter(Boolean).join(" ")}
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
