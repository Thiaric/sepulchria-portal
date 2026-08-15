"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";

type Relation<T> =
  | T
  | T[]
  | null;

type ManagedOrder = {
  id: string;
  name: string;
  colour: string | null;
};

type LeadershipRow = {
  order: Relation<ManagedOrder>;
  level: Relation<{
    level: number;
  }>;
};

function one<T>(
  value: Relation<T>,
): T | null {
  return Array.isArray(value)
    ? value[0] ?? null
    : value;
}

export function OrderLeadershipContext() {
  const [orders, setOrders] =
    useState<ManagedOrder[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(
      null,
    );

  useEffect(() => {
    let cancelled = false;

    async function loadOrders() {
      const supabase =
        createClient();

      const {
        data: { user },
        error: userError,
      } =
        await supabase.auth.getUser();

      if (cancelled) {
        return;
      }

      if (userError || !user) {
        setError(
          "Unable to identify the current character.",
        );
        setLoading(false);
        return;
      }

      const {
        data: character,
        error: characterError,
      } = await supabase
        .from("characters")
        .select("id")
        .eq(
          "user_id",
          user.id,
        )
        .maybeSingle();

      if (cancelled) {
        return;
      }

      if (
        characterError ||
        !character
      ) {
        setError(
          "Unable to load Order leadership.",
        );
        setLoading(false);
        return;
      }

      const {
        data,
        error,
      } = await supabase
        .from(
          "order_memberships",
        )
        .select(`
          order:orders!order_memberships_order_id_fkey(
            id,
            name,
            colour
          ),
          level:order_levels!order_memberships_order_level_id_fkey(
            level
          )
        `)
        .eq(
          "character_id",
          character.id,
        );

      if (cancelled) {
        return;
      }

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      const leaderships =
        (
          (data ?? []) as unknown as LeadershipRow[]
        )
          .filter(
            (membership) =>
              one(
                membership.level,
              )?.level === 5,
          )
          .map(
            (membership) =>
              one(
                membership.order,
              ),
          )
          .filter(
            (
              order,
            ): order is ManagedOrder =>
              Boolean(order),
          )
          .sort(
            (a, b) =>
              a.name.localeCompare(
                b.name,
              ),
          );

      setOrders(leaderships);
      setError(null);
      setLoading(false);
    }

    void loadOrders();

    return () => {
      cancelled = true;
    };
  }, []);

  function jumpToOrder(
    orderId: string,
  ) {
    const element =
      document.getElementById(
        `managed-order-${orderId}`,
      );

    if (!element) {
      return;
    }

    element.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });

    window.history.replaceState(
      null,
      "",
      `#managed-order-${orderId}`,
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-[#59432c]/35 pb-4">
        <p className="text-[8px] uppercase tracking-[0.24em] text-[#806b50]">
          Order leadership
        </p>

        <h2 className="mt-2 font-serif text-2xl text-[#dfc99f]">
          Manage Orders
        </h2>
      </div>

      <p className="mt-4 text-xs leading-6 text-[#938673]">
        Manage the members, Levels
        and Roles of the Orders you
        currently lead.
      </p>

      <div className="mt-5">
        <p className="mb-2 text-[8px] uppercase tracking-[0.2em] text-[#75634c]">
          Your Orders
        </p>

        {error ? (
          <p className="border border-[#743d35] bg-[#2a1512] p-3 text-[11px] leading-5 text-[#d8a49a]">
            The leadership list could
            not be loaded.
          </p>
        ) : null}

        {loading ? (
          <div className="space-y-2">
            {Array.from({
              length: 3,
            }).map(
              (_, index) => (
                <div
                  key={index}
                  className="h-11 animate-pulse border border-[#59432c]/30 bg-[#19120d]"
                />
              ),
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {orders.map(
              (order) => (
                <button
                  key={order.id}
                  type="button"
                  onClick={() =>
                    jumpToOrder(
                      order.id,
                    )
                  }
                  className="group flex w-full items-center gap-3 border border-[#59432c]/40 bg-[#100c09] px-3 py-3 text-left transition hover:border-[#8d693e] hover:bg-[#1d150f]"
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 border border-black/25"
                    style={{
                      backgroundColor:
                        order.colour ??
                        "#765937",
                    }}
                  />

                  <span className="min-w-0 flex-1 truncate font-serif text-sm text-[#cbb28a] transition group-hover:text-[#ead0a0]">
                    {order.name}
                  </span>

                  <span
                    aria-hidden="true"
                    className="shrink-0 text-[10px] text-[#725a3d] transition group-hover:translate-y-0.5 group-hover:text-[#b88a52]"
                  >
                    ↓
                  </span>
                </button>
              ),
            )}
          </div>
        )}

        {!loading &&
        !error &&
        orders.length === 0 ? (
          <p className="border border-[#59432c]/30 bg-[#100c09]/60 p-3 text-[11px] leading-5 text-[#8f8271]">
            You are not currently the
            Level 5 Head of an Order.
          </p>
        ) : null}
      </div>

      <div className="mt-auto space-y-2 border-t border-[#59432c]/35 pt-4">
        <Link
          href="/orders"
          className="flex w-full items-center justify-between border border-[#765937]/55 bg-[#271c12] px-3 py-3 text-[9px] uppercase tracking-[0.16em] text-[#d0b184] transition hover:border-[#9a7445] hover:bg-[#342318]"
        >
          <span>Public Orders</span>
          <span aria-hidden="true">
            →
          </span>
        </Link>

        <Link
          href="/associations"
          className="flex w-full items-center justify-between border border-[#59432c]/40 bg-[#100c09] px-3 py-3 text-[9px] uppercase tracking-[0.16em] text-[#9f8968] transition hover:border-[#765937] hover:text-[#d0b184]"
        >
          <span>Associations</span>
          <span aria-hidden="true">
            →
          </span>
        </Link>
      </div>
    </div>
  );
}
