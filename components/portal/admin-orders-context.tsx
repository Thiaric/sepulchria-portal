"use client";

import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";

type OrderJumpEntry = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
};

export function AdminOrdersContext() {
  const [orders, setOrders] =
    useState<OrderJumpEntry[]>([]);
  const [loading, setLoading] =
    useState(true);
  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadOrders() {
      const supabase =
        createClient();

      const {
        data,
        error,
      } = await supabase
        .from("orders")
        .select(
          "id, name, slug, is_active, sort_order",
        )
        .order("sort_order", {
          ascending: true,
        })
        .order("name", {
          ascending: true,
        });

      if (cancelled) {
        return;
      }

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      setOrders(
        (data ?? []).map(
          (order) => ({
            id: String(order.id),
            name: String(order.name),
            slug: String(order.slug),
            is_active:
              order.is_active === true,
          }),
        ),
      );

      setError(null);
      setLoading(false);
    }

    void loadOrders();

    return () => {
      cancelled = true;
    };
  }, []);

  function jumpToOrder(
    slug: string,
  ) {
    const section =
      document.getElementById(
        `order-${slug}`,
      );

    if (!section) {
      return;
    }

    const toggle =
      section.querySelector<HTMLButtonElement>(
        "[data-order-collapse-toggle]",
      );

    const content =
      section.querySelector<HTMLElement>(
        "[data-order-collapse-content]",
      );

    if (
      toggle &&
      content?.hidden
    ) {
      toggle.click();
    }

    section.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });

    window.history.replaceState(
      null,
      "",
      `#order-${slug}`,
    );
  }

  function jumpToCreate() {
    const target =
      document.getElementById(
        "order-new",
      );

    target?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-806b50))]">
        Administration
      </p>

      <h2 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-d8bf91))]">
        Jump to Orders
      </h2>

      <p className="mt-2 text-[11px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">
        Jump directly to the Order you
        want to work on.
      </p>

      <button
        type="button"
        onClick={jumpToCreate}
        className="mt-3 flex w-full items-center justify-between border border-[rgb(var(--sep-colour-765937))]/55 bg-[rgb(var(--sep-colour-271c12))] px-3 py-2.5 text-left text-[9px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-d6b37d))] transition hover:border-[rgb(var(--sep-colour-9a7445))] hover:bg-[rgb(var(--sep-colour-342318))]"
      >
        <span>Create new</span>
        <span>+</span>
      </button>

      {error ? (
        <p className="mt-3 border border-[rgb(var(--sep-colour-743d35))] bg-[rgb(var(--sep-colour-2a1512))] p-2.5 text-[10px] leading-5 text-[rgb(var(--sep-colour-d8a49a))]">
          {error}
        </p>
      ) : null}

      <div className="mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
        {loading ? (
          <div className="space-y-2">
            {Array.from({
              length: 6,
            }).map(
              (_, index) => (
                <div
                  key={index}
                  className="h-10 animate-pulse border border-[rgb(var(--sep-colour-59432c))]/30 bg-[rgb(var(--sep-colour-19120d))]"
                />
              ),
            )}
          </div>
        ) : (
          <div className="space-y-1.5">
            {orders.map(
              (order) => (
                <button
                  key={order.id}
                  type="button"
                  onClick={() =>
                    jumpToOrder(
                      order.slug,
                    )
                  }
                  className="group flex w-full items-center justify-between gap-2 border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-left transition hover:border-[rgb(var(--sep-colour-8d693e))] hover:bg-[rgb(var(--sep-colour-1d150f))]"
                >
                  <span className="min-w-0 truncate font-serif text-[13px] text-[rgb(var(--sep-colour-cbb28a))] group-hover:text-[rgb(var(--sep-colour-ead0a0))]">
                    {order.name}
                  </span>

                  <span
                    title={
                      order.is_active
                        ? "Active"
                        : "Inactive"
                    }
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                      order.is_active
                        ? "bg-emerald-600"
                        : "bg-[rgb(var(--sep-colour-66594b))]"
                    }`}
                  />
                </button>
              ),
            )}
          </div>
        )}

        {!loading &&
        !error &&
        orders.length === 0 ? (
          <p className="border border-[rgb(var(--sep-colour-59432c))]/30 bg-[rgb(var(--sep-colour-100c09))]/60 p-3 text-[11px] text-[rgb(var(--sep-colour-8f8271))]">
            No Orders found.
          </p>
        ) : null}
      </div>
    </div>
  );
}
