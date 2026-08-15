"use client";

import {
  useEffect,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";

type Relation<T> =
  | T
  | T[]
  | null;

type OrderIdentity = {
  id: string;
  name: string;
  icon_url: string | null;
};

function one<T>(
  value: Relation<T>,
): T | null {
  return Array.isArray(value)
    ? value[0] ?? null
    : value;
}

export function HeaderOrderIcon({
  characterId,
}: {
  characterId: string;
}) {
  const [order, setOrder] =
    useState<OrderIdentity | null>(
      null,
    );

  useEffect(() => {
    let cancelled = false;

    const supabase =
      createClient();

    async function loadOrder() {
      const {
        data,
        error,
      } = await supabase
        .from("order_memberships")
        .select(`
          order:orders!order_memberships_order_id_fkey(
            id,
            name,
            icon_url
          )
        `)
        .eq(
          "character_id",
          characterId,
        )
        .limit(1)
        .maybeSingle();

      if (cancelled) {
        return;
      }

      if (error) {
        console.error(
          "Unable to load header Order icon:",
          error.message,
        );

        setOrder(null);
        return;
      }

      setOrder(
        data
          ? one(
              data.order as Relation<OrderIdentity>,
            )
          : null,
      );
    }

    void loadOrder();

    const channel =
      supabase
        .channel(
          `header-order-membership-${characterId}`,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table:
              "order_memberships",
            filter:
              `character_id=eq.${characterId}`,
          },
          () => {
            void loadOrder();
          },
        )
        .subscribe();

    const interval =
      window.setInterval(
        () => {
          void loadOrder();
        },
        5000,
      );

    return () => {
      cancelled = true;

      window.clearInterval(
        interval,
      );

      void supabase.removeChannel(
        channel,
      );
    };
  }, [characterId]);

  if (!order?.icon_url) {
    return (
      <span
        className="h-4 w-4"
        aria-hidden="true"
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={order.icon_url}
      alt={order.name}
      title={`Order: ${order.name}`}
      className="h-4 w-4 object-contain"
    />
  );
}
