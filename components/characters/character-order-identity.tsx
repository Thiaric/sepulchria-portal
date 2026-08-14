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
  slug: string;
  icon_url: string | null;
  colour: string | null;
};

type Variant =
  | "chat"
  | "message"
  | "mini"
  | "inline"
  | "forum";

function one<T>(
  value: Relation<T>,
): T | null {
  return Array.isArray(value)
    ? value[0] ?? null
    : value;
}

export function CharacterOrderIdentity({
  characterId,
  variant,
}: {
  characterId: string | null | undefined;
  variant: Variant;
}) {
  const [order, setOrder] =
    useState<OrderIdentity | null>(
      null,
    );

  const [loaded, setLoaded] =
    useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadOrder() {
      if (!characterId) {
        if (!cancelled) {
          setOrder(null);
          setLoaded(true);
        }

        return;
      }

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
          "Unable to load character Order identity:",
          error.message,
        );

        setOrder(null);
        setLoaded(true);
        return;
      }

      const relation =
        data
          ? one(
              data.order as Relation<OrderIdentity>,
            )
          : null;

      setOrder(relation);
      setLoaded(true);
    }

    setLoaded(false);
    void loadOrder();

    return () => {
      cancelled = true;
    };
  }, [characterId]);

  if (variant === "inline") {
    if (!loaded) {
      return (
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="h-5 w-5 shrink-0 animate-pulse border border-[#60482e]/40 bg-[#15100d]" />

          <span className="text-[8px] text-[#675e52]">
            Loading Order…
          </span>
        </span>
      );
    }

    if (!order) {
      return (
        <span className="text-[8px] text-[#675e52]">
          No Order
        </span>
      );
    }

    const colour =
      order.colour ??
      "#8d6d3e";

    return (
      <span
        className="flex min-w-0 items-center gap-1.5"
        title={`Order: ${order.name}`}
      >
        <span
          className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden border bg-[#0d0907] font-serif text-[8px]"
          style={{
            borderColor: `${colour}88`,
            color: colour,
          }}
        >
          {order.icon_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={order.icon_url}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            order.name
              .charAt(0)
              .toUpperCase()
          )}
        </span>

        <span className="min-w-0 truncate text-[8px] text-[#9a866b]">
          {order.name}
        </span>
      </span>
    );
  }

  if (
    !loaded ||
    !order
  ) {
    if (
      variant ===
      "message"
    ) {
      return (
        <span
          title="No Order"
          className="flex h-6 w-6 items-center justify-center overflow-hidden border border-[#765937]/60 bg-[#0d0907] font-serif text-[8px] text-[#765937]"
        >
          O
        </span>
      );
    }

    return null;
  }

  const colour =
    order.colour ??
    "#8d6d3e";

  if (variant === "chat") {
    return order.icon_url ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={order.icon_url}
        alt={order.name}
        title={`Order: ${order.name}`}
        className="h-4 w-4 object-contain"
      />
    ) : (
      <span
        title={`Order: ${order.name}`}
        className="flex h-4 w-4 items-center justify-center font-serif text-[7px]"
        style={{
          color: colour,
        }}
      >
        {order.name
          .charAt(0)
          .toUpperCase()}
      </span>
    );
  }

  const sizeClass =
  variant === "forum"
    ? "h-8 w-8 p-1"
    : variant === "message"
      ? "h-6 w-6"
      : variant === "mini"
        ? "h-5 w-5"
        : "h-4 w-4";

  return (
    <span
      title={`Order: ${order.name}`}
      className={`flex shrink-0 items-center justify-center overflow-hidden border bg-[#0d0907] font-serif text-[7px] ${sizeClass}`}
      style={{
        borderColor: `${colour}88`,
        color: colour,
      }}
    >
      {order.icon_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={order.icon_url}
          alt=""
          className="h-full w-full object-contain"
        />
      ) : (
        order.name
          .charAt(0)
          .toUpperCase()
      )}
    </span>
  );
}