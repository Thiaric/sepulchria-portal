"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";

type Relation<T> =
  | T
  | T[]
  | null;

type OrderContextData = {
  order:
    | {
        id: string;
        name: string;
        slug: string;
      }
    | null;
  level: number | null;
  role: string | null;
};

function one<T>(
  value: Relation<T>,
): T | null {
  return Array.isArray(value)
    ? value[0] ?? null
    : value;
}

export function CharacterOrderContext({
  characterId,
}: {
  characterId: string;
}) {
  const [data, setData] =
    useState<OrderContextData>({
      order: null,
      level: null,
      role: null,
    });

  const [loading, setLoading] =
    useState(true);

  const load = useCallback(
    async () => {
      const supabase =
        createClient();

      const {
        data: membership,
        error,
      } = await supabase
        .from("order_memberships")
        .select(`
          id,
          order:orders!order_memberships_order_id_fkey(
            id,
            name,
            slug
          ),
          level:order_levels!order_memberships_order_level_id_fkey(
            level
          ),
          role:order_jobs!order_memberships_order_job_id_fkey(
            name
          )
        `)
        .eq(
          "character_id",
          characterId,
        )
        .limit(1)
        .maybeSingle();

      if (error || !membership) {
        setData({
          order: null,
          level: null,
          role: null,
        });
        setLoading(false);
        return;
      }

      const order =
        one(
          membership.order as Relation<{
            id: string;
            name: string;
            slug: string;
          }>,
        );

      const level =
        one(
          membership.level as Relation<{
            level: number;
          }>,
        );

      const role =
        one(
          membership.role as Relation<{
            name: string;
          }>,
        );

      setData({
        order,
        level:
          level?.level ??
          null,
        role:
          role?.name ??
          null,
      });

      setLoading(false);
    },
    [characterId],
  );

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  useEffect(() => {
    const supabase =
      createClient();

    const channel =
      supabase
        .channel(
          `character-order-context:${characterId}`,
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
            void load();
          },
        )
        .subscribe();

    return () => {
      void supabase.removeChannel(
        channel,
      );
    };
  }, [characterId, load]);

  if (loading) {
    return (
      <>
        <ContextLine
          label="Order"
          value="Loading..."
        />
        <ContextLine
          label="Level"
          value="—"
        />
        <ContextLine
          label="Role"
          value="—"
        />
      </>
    );
  }

  return (
    <>
      <div className="flex justify-between gap-4 border-b border-[rgb(var(--sep-colour-59432c))]/35 py-3 text-xs">
        <span className="text-[rgb(var(--sep-colour-786b5b))]">
          Order
        </span>

        {data.order ? (
          <Link
            href={`/orders/${data.order.slug}`}
            className="max-w-[150px] break-words text-right text-[rgb(var(--sep-colour-c9ae84))] transition hover:text-[rgb(var(--sep-colour-ead0a0))]"
          >
            {data.order.name}
          </Link>
        ) : (
          <span className="max-w-[150px] break-words text-right text-[rgb(var(--sep-colour-bba98d))]">
            Not assigned
          </span>
        )}
      </div>

      <ContextLine
        label="Level"
        value={
          data.level !== null
            ? `Level ${data.level}`
            : "Not assigned"
        }
      />

      <ContextLine
        label="Role"
        value={
          data.role ??
          "Not assigned"
        }
        last
      />
    </>
  );
}

function ContextLine({
  label,
  value,
  last = false,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <div
      className={`flex justify-between gap-4 py-3 text-xs ${
        last
          ? ""
          : "border-b border-[rgb(var(--sep-colour-59432c))]/35"
      }`}
    >
      <span className="text-[rgb(var(--sep-colour-786b5b))]">
        {label}
      </span>

      <span className="max-w-[150px] break-words text-right text-[rgb(var(--sep-colour-bba98d))]">
        {value}
      </span>
    </div>
  );
}
