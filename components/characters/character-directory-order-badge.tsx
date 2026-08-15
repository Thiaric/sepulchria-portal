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

type OrderReference = {
  id: string;
  name: string;
  slug: string;
  icon_url: string | null;
  colour: string | null;
};

function one<T>(
  value: Relation<T>,
): T | null {
  return Array.isArray(value)
    ? value[0] ?? null
    : value;
}

export function CharacterDirectoryOrderBadge({
  characterId,
}: {
  characterId: string;
}) {
  const [order, setOrder] =
    useState<OrderReference | null>(
      null,
    );

  const [loaded, setLoaded] =
    useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadOrder() {
      const supabase =
        createClient();

      const {
        data,
        error,
      } = await supabase
        .from("order_memberships")
        .select(`
          order:orders!order_memberships_order_id_fkey(
            id,
            name,
            slug,
            icon_url,
            colour
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
          "Unable to load directory Order:",
          error.message,
        );

        setOrder(null);
        setLoaded(true);
        return;
      }

      setOrder(
        data
          ? one(
              data.order as Relation<OrderReference>,
            )
          : null,
      );

      setLoaded(true);
    }

    void loadOrder();

    return () => {
      cancelled = true;
    };
  }, [characterId]);

  if (!loaded) {
    return (
      <div className="flex min-w-0 items-center gap-2.5 border border-[#59432c]/45 bg-black/15 px-2.5 py-2">
        <div className="h-8 w-8 shrink-0 animate-pulse border border-[#60482e]/40 bg-[#0d0907]" />

        <div className="min-w-0">
          <p className="text-[8px] uppercase tracking-[0.18em] text-[#705f49]">
            Order
          </p>

          <p className="mt-0.5 text-xs text-[#675e52]">
            Loading…
          </p>
        </div>
      </div>
    );
  }

  const colour =
    order?.colour ??
    "#8d6d3e";

  return (
    <div
      className="flex min-w-0 items-center gap-2.5 border border-[#59432c]/45 bg-black/15 px-2.5 py-2"
      style={{
        backgroundImage: `linear-gradient(90deg, ${colour}18, transparent 55%)`,
      }}
    >
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden border bg-[#0d0907] font-serif text-[11px]"
        style={{
          borderColor: `${colour}88`,
          color: colour,
        }}
      >
        {order?.icon_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={order.icon_url}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          order?.name
            .charAt(0)
            .toUpperCase() ?? "?"
        )}
      </div>

      <div className="min-w-0">
        <p className="text-[8px] uppercase tracking-[0.18em] text-[#705f49]">
          Order
        </p>

        <p
          className="truncate text-xs"
          style={{
            color: order
              ? colour
              : "#675e52",
          }}
        >
          {order?.name ??
            "No Order"}
        </p>
      </div>
    </div>
  );
}
