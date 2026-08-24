"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";
import type {
  PortalCharacter,
} from "@/types/portal";

type Relation<T> =
  | T
  | T[]
  | null;

type CharacterRecord = {
  id: string;
  first_name: string;
  surname: string;
  display_name: string | null;
  pronouns: string | null;
  age: number | null;
  birthplace: string | null;
  title: string | null;
  expertise: number | null;
  current_health: number | null;
  race: Relation<{
    name: string;
  }>;
};

type OrderRecord = {
  order: Relation<{
    name: string;
    slug: string;
  }>;
  level: Relation<{
    level: number;
  }>;
  role: Relation<{
    name: string;
  }>;
};

type LoadedData = {
  character: CharacterRecord | null;
  orderName: string | null;
  orderSlug: string | null;
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

export function CharacterDetailContextPanel({
  characterId,
  publicSlug,
  ownCharacter,
}: {
  characterId?: string | null;
  publicSlug?: string;
  ownCharacter?: PortalCharacter | null;
}) {
  const [data, setData] =
    useState<LoadedData>({
      character: null,
      orderName: null,
      orderSlug: null,
      level: null,
      role: null,
    });

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const load = useCallback(
    async () => {
      const supabase =
        createClient();

      let query =
        supabase
          .from("characters")
          .select(`
            id,
            first_name,
            surname,
            display_name,
            pronouns,
            age,
            birthplace,
            title,
            expertise,
            current_health,
            race:races!characters_race_id_fkey(
              name
            )
          `);

      if (characterId) {
        query =
          query.eq(
            "id",
            characterId,
          );
      } else if (publicSlug) {
        query =
          query
            .eq(
              "public_slug",
              publicSlug,
            )
            .eq(
              "status",
              "approved",
            );
      } else {
        setData({
          character: null,
          orderName: null,
          orderSlug: null,
          level: null,
          role: null,
        });
        setLoading(false);
        return;
      }

      const {
        data: characterData,
        error: characterError,
      } =
        await query.maybeSingle();

      if (
        characterError ||
        !characterData
      ) {
        setError(
          characterError?.message ??
          "Character not found.",
        );
        setLoading(false);
        return;
      }

      const character =
        characterData as unknown as
          CharacterRecord;

      const {
        data: membershipData,
        error: membershipError,
      } = await supabase
        .from("order_memberships")
        .select(`
          order:orders!order_memberships_order_id_fkey(
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
          character.id,
        )
        .limit(1)
        .maybeSingle();

      if (membershipError) {
        setError(
          membershipError.message,
        );
        setLoading(false);
        return;
      }

      const membership =
        membershipData as unknown as
          OrderRecord | null;

      const order =
        membership
          ? one(
              membership.order,
            )
          : null;

      const level =
        membership
          ? one(
              membership.level,
            )
          : null;

      const role =
        membership
          ? one(
              membership.role,
            )
          : null;

      setData({
        character,
        orderName:
          order?.name ?? null,
        orderSlug:
          order?.slug ?? null,
        level:
          level?.level ?? null,
        role:
          role?.name ?? null,
      });

      setError(null);
      setLoading(false);
    },
    [
      characterId,
      publicSlug,
    ],
  );

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  useEffect(() => {
    if (!data.character?.id) {
      return;
    }

    const supabase =
      createClient();

    const membershipChannel =
      supabase
        .channel(
          `context-order:${data.character.id}`,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table:
              "order_memberships",
            filter:
              `character_id=eq.${data.character.id}`,
          },
          () => {
            void load();
          },
        )
        .subscribe();

    return () => {
      void supabase.removeChannel(
        membershipChannel,
      );
    };
  }, [
    data.character?.id,
    load,
  ]);

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({
          length: 8,
        }).map(
          (_, index) => (
            <div
              key={index}
              className="h-9 animate-pulse border border-[rgb(var(--sep-colour-59432c))]/30 bg-[rgb(var(--sep-colour-19120d))]"
            />
          ),
        )}
      </div>
    );
  }

  if (error) {
    return (
      <p className="border border-[rgb(var(--sep-colour-743d35))] bg-[rgb(var(--sep-colour-2a1512))] p-3 text-[11px] leading-5 text-[rgb(var(--sep-colour-d8a49a))]">
        The character context could not
        be loaded: {error}
      </p>
    );
  }

  const character =
    data.character;

  if (!character) {
    return (
      <p className="text-xs leading-6 text-[rgb(var(--sep-colour-938673))]">
        Character information is not
        available.
      </p>
    );
  }

  const race =
    one(character.race);

  const displayName =
    character.display_name?.trim() ||
    `${character.first_name} ${character.surname}`.trim();

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="mb-5">
        <p className="text-[9px] uppercase tracking-[0.3em] text-[rgb(var(--sep-colour-876a46))]">
          Character
        </p>

        <h2 className="mt-2 font-serif text-2xl text-[rgb(var(--sep-colour-d6bd91))]">
          {displayName}
        </h2>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
        <div className="border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-100c09))]">
          <Row
            label="Title"
            value={
              character.title ??
              "None"
            }
          />

          <Row
            label="Pronouns"
            value={
              character.pronouns ??
              "Not recorded"
            }
          />

          <Row
            label="Age"
            value={
              character.age !== null
                ? `${character.age} years`
                : "Not recorded"
            }
          />

          <Row
            label="Birthplace"
            value={
              character.birthplace ??
              "Sepulchria"
            }
          />

          <Row
            label="Ancestry"
            value={
              race?.name ??
              "Not assigned"
            }
          />
        </div>

        <div className="mt-4 border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-100c09))]">
          <div className="flex justify-between gap-4 border-b border-[rgb(var(--sep-colour-59432c))]/35 px-3 py-2.5 text-xs">
            <span className="text-[7px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-75644f))]">
              Order
            </span>

            {data.orderName &&
            data.orderSlug ? (
              <Link
                href={`/orders/${data.orderSlug}`}
                className="max-w-[150px] break-words text-right text-[11px] text-[rgb(var(--sep-colour-c9ae84))] transition hover:text-[rgb(var(--sep-colour-ead0a0))]"
              >
                {data.orderName}
              </Link>
            ) : (
              <span className="max-w-[150px] break-words text-right text-[11px] text-[rgb(var(--sep-colour-c5b294))]">
                Not assigned
              </span>
            )}
          </div>

          <Row
            label="Level"
            value={
              data.level !== null
                ? `Level ${data.level}`
                : "Not assigned"
            }
          />

          <Row
            label="Role"
            value={
              data.role ??
              "Not assigned"
            }
            last
          />
        </div>

        <div className="mt-4 border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-100c09))]">
          <Row
            label="Health"
            value={String(
              character.current_health ??
                0,
            )}
          />

          <Row
            label="Expertise"
            value={Number(
              character.expertise ?? 0,
            ).toFixed(1)}
            last
          />
        </div>

        
      </div>
    </div>
  );
}

function Row({
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
      className={`grid grid-cols-[92px_minmax(0,1fr)] gap-3 px-3 py-2.5 ${
        last
          ? ""
          : "border-b border-[rgb(var(--sep-colour-59432c))]/25"
      }`}
    >
      <span className="text-[7px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-75644f))]">
        {label}
      </span>

      <span className="min-w-0 break-words text-right text-[11px] text-[rgb(var(--sep-colour-c5b294))]">
        {value}
      </span>
    </div>
  );
}
