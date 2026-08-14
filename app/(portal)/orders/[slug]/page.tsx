import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { RichTextContent } from "@/components/editor/rich-text-content";
import { createClient } from "@/lib/supabase/server";

type Relation<T> = T | T[] | null;

type AssociationRow = {
  id: string;
  name: string;
  slug: string;
  colour: string | null;
};

type OrderRow = {
  id: string;
  association_id: string;
  name: string;
  slug: string;
  summary: string;
  description: string;
  image_url: string | null;
  banner_url: string | null;
  icon_url: string | null;
  colour: string | null;
  association: Relation<AssociationRow>;
};

type RoleRow = {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
};

type LevelRow = {
  id: string;
  level: number;
  muscles_modifier: number;
  reflexes_modifier: number;
  vigour_modifier: number;
  shrewd_modifier: number;
  brains_modifier: number;
  presence_modifier: number;
  roles: RoleRow[] | null;
};

type MemberRow = {
  id: string;
  joined_at: string;
  character: Relation<{
    id: string;
    display_name: string;
    public_slug: string;
    portrait_url: string | null;
    status: string;
  }>;
  level: Relation<{
    id: string;
    level: number;
  }>;
  role: Relation<{
    id: string;
    name: string;
  }>;
};

type OrderPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

function one<T>(
  value: Relation<T>,
): T | null {
  return Array.isArray(value)
    ? value[0] ?? null
    : value;
}

export default async function OrderPage({
  params,
}: OrderPageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  const {
    data: orderData,
    error: orderError,
  } = await supabase
    .from("orders")
    .select(`
      id,
      association_id,
      name,
      slug,
      summary,
      description,
      image_url,
      banner_url,
      icon_url,
      colour,
      association:associations(
        id,
        name,
        slug,
        colour
      )
    `)
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (orderError) {
    throw new Error(
      `Unable to load Order: ${orderError.message}`,
    );
  }

  if (!orderData) {
    notFound();
  }

  const order =
    orderData as unknown as OrderRow;

  const [
    levelsResult,
    membersResult,
  ] = await Promise.all([
    supabase
      .from("order_levels")
      .select(`
        id,
        level,
        muscles_modifier,
        reflexes_modifier,
        vigour_modifier,
        shrewd_modifier,
        brains_modifier,
        presence_modifier,
        roles:order_jobs(
          id,
          name,
          description,
          sort_order
        )
      `)
      .eq("order_id", order.id)
      .order("level", {
        ascending: false,
      }),

    supabase
      .from("order_memberships")
      .select(`
        id,
        joined_at,
        character:characters(
          id,
          display_name,
          public_slug,
          portrait_url,
          status
        ),
        level:order_levels!order_memberships_order_level_id_fkey(
          id,
          level
        ),
        role:order_jobs!order_memberships_order_job_id_fkey(
          id,
          name
        )
      `)
      .eq("order_id", order.id),
  ]);

  if (levelsResult.error) {
    throw new Error(
      `Unable to load Order levels: ${levelsResult.error.message}`,
    );
  }

  if (membersResult.error) {
    throw new Error(
      `Unable to load Order members: ${membersResult.error.message}`,
    );
  }

  const levels =
    (
      (levelsResult.data ?? []) as unknown as LevelRow[]
    ).map((level) => ({
      ...level,
      roles: [
        ...(level.roles ?? []),
      ].sort(
        (a, b) =>
          a.sort_order -
            b.sort_order ||
          a.name.localeCompare(
            b.name,
          ),
      ),
    }));

  const members =
    (
      (membersResult.data ?? []) as unknown as MemberRow[]
    )
      .filter((membership) => {
        const character =
          one(membership.character);

        return (
          character?.status ===
          "approved"
        );
      })
      .sort((a, b) => {
        const levelA =
          one(a.level)?.level ?? -1;
        const levelB =
          one(b.level)?.level ?? -1;

        if (levelA !== levelB) {
          return levelB - levelA;
        }

        const nameA =
          one(a.character)
            ?.display_name ?? "";
        const nameB =
          one(b.character)
            ?.display_name ?? "";

        return nameA.localeCompare(
          nameB,
        );
      });

  const association =
    one(order.association);

  const colour =
    order.colour ??
    association?.colour ??
    "#8d6d3e";

  return (
    <main className="p-5 sm:p-7 lg:p-9">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/orders"
          className="inline-flex items-center gap-2 border border-[#60482e]/55 bg-[#15100d] px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-[#c6ab80] transition hover:border-[#987344] hover:bg-[#261b12] hover:text-[#ead2a5]"
        >
          <span aria-hidden="true">←</span>
          Back to Orders
        </Link>

        <article className="mt-5 overflow-hidden border border-[#60482e]/45 bg-[#15100d]">
          {order.banner_url ? (
            <div className="relative h-48 border-b border-[#60482e]/40 bg-[#0b0807] sm:h-64">
              <Image
                src={order.banner_url}
                alt={`${order.name} banner`}
                fill
                sizes="100vw"
                className="object-cover opacity-75"
                unoptimized
                priority
              />

              <div className="absolute inset-0 bg-gradient-to-t from-[#15100d] via-[#15100d]/15 to-black/25" />
            </div>
          ) : null}

          <div className="p-5 sm:p-7 lg:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              <OrderIcon
                src={order.icon_url}
                name={order.name}
                colour={colour}
              />

              <div className="min-w-0 flex-1">
                <p className="text-[9px] uppercase tracking-[0.28em] text-[#8c704b]">
                  Order
                </p>

                <h1 className="mt-2 break-words font-serif text-4xl text-[#ead5ac] sm:text-5xl">
                  {order.name}
                </h1>

                {association ? (
                  <Link
                    href={`/associations/${association.slug}`}
                    className="mt-3 inline-block font-serif text-lg text-[#b89a6c] transition hover:text-[#e2c18e]"
                  >
                    {association.name}
                  </Link>
                ) : null}

                {order.summary ? (
                  <RichTextContent
                    body={order.summary}
                    className="mt-5 max-w-4xl text-sm leading-7 text-[#b6a58d]"
                  />
                ) : null}
              </div>
            </div>

            {order.description ? (
              <section className="mt-8 border-t border-[#60482e]/35 pt-7">
                <p className="text-[8px] uppercase tracking-[0.24em] text-[#806b50]">
                  About this Order
                </p>

                <RichTextContent
                  body={order.description}
                  className="mt-3 text-sm leading-7 text-[#b6a58d]"
                />
              </section>
            ) : null}

            <section className="mt-8 border-t border-[#60482e]/35 pt-7">
              <div>
                <p className="text-[8px] uppercase tracking-[0.24em] text-[#806b50]">
                  Order hierarchy
                </p>

                <h2 className="mt-1 font-serif text-2xl text-[#dec69a]">
                  Levels & Roles
                </h2>
              </div>

              <div className="mt-5 space-y-3">
                {levels.map((level) => (
                  <LevelCard
                    key={level.id}
                    level={level}
                  />
                ))}
              </div>
            </section>

            <section className="mt-8 border-t border-[#60482e]/35 pt-7">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-[8px] uppercase tracking-[0.24em] text-[#806b50]">
                    Order membership
                  </p>

                  <h2 className="mt-1 font-serif text-2xl text-[#dec69a]">
                    Members
                  </h2>
                </div>

                <p className="text-[9px] uppercase tracking-[0.16em] text-[#756958]">
                  {members.length}{" "}
                  {members.length === 1
                    ? "member"
                    : "members"}
                </p>
              </div>

              {members.length > 0 ? (
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {members.map(
                    (membership) => {
                      const character =
                        one(
                          membership.character,
                        );
                      const level =
                        one(
                          membership.level,
                        );
                      const role =
                        one(
                          membership.role,
                        );

                      if (!character) {
                        return null;
                      }

                      return (
                        <Link
                          key={membership.id}
                          href={`/characters/${character.public_slug}`}
                          className="group flex items-center gap-4 border border-[#59432c]/45 bg-[#100c09] p-3 transition hover:border-[#8d6d3e] hover:bg-[#18110d]"
                        >
                          <MemberPortrait
                            src={
                              character.portrait_url
                            }
                            name={
                              character.display_name
                            }
                          />

                          <div className="min-w-0 flex-1">
                            <p className="truncate font-serif text-lg text-[#d8bf91] transition group-hover:text-[#efd5a5]">
                              {
                                character.display_name
                              }
                            </p>

                            <p className="mt-1 text-[9px] uppercase tracking-[0.14em] text-[#766956]">
                              {level
                                ? `Level ${level.level}`
                                : "Level not assigned"}
                              {role
                                ? ` · ${role.name}`
                                : ""}
                            </p>
                          </div>

                          <span
                            aria-hidden="true"
                            className="text-[#806746] transition group-hover:translate-x-0.5 group-hover:text-[#d2ad73]"
                          >
                            →
                          </span>
                        </Link>
                      );
                    },
                  )}
                </div>
              ) : (
                <p className="mt-5 border border-[#59432c]/30 bg-[#100c09] p-5 text-sm italic text-[#807463]">
                  This Order has no public members yet.
                </p>
              )}
            </section>
          </div>
        </article>
      </div>
    </main>
  );
}

function LevelCard({
  level,
}: {
  level: LevelRow;
}) {
  const modifiers = [
    ["Muscles", level.muscles_modifier],
    ["Reflexes", level.reflexes_modifier],
    ["Vigour", level.vigour_modifier],
    ["Shrewd", level.shrewd_modifier],
    ["Brains", level.brains_modifier],
    ["Presence", level.presence_modifier],
  ] as const;

  const activeModifiers =
    modifiers.filter(
      ([, value]) => value !== 0,
    );

  return (
    <div className="grid gap-3 border border-[#59432c]/45 bg-[#100c09] p-4 lg:grid-cols-[120px_minmax(0,1fr)_minmax(220px,auto)] lg:items-center">
      <div>
        <p className="text-[7px] uppercase tracking-[0.18em] text-[#756958]">
          Level
        </p>

        <p className="mt-1 font-serif text-2xl text-[#d8bf91]">
          {level.level}
        </p>
      </div>

      <div>
        <p className="text-[7px] uppercase tracking-[0.18em] text-[#756958]">
          Roles
        </p>

        <div className="mt-2 flex flex-wrap gap-2">
          {(level.roles ?? []).length >
          0 ? (
            (level.roles ?? []).map(
              (role) => (
                <span
                  key={role.id}
                  title={
                    role.description ??
                    undefined
                  }
                  className="border border-[#6c5031]/55 bg-[#18110d] px-3 py-1.5 text-[10px] text-[#cab28a]"
                >
                  {role.name}
                </span>
              ),
            )
          ) : (
            <span className="text-[10px] italic text-[#746858]">
              No roles assigned
            </span>
          )}
        </div>
      </div>

      <div className="lg:text-right">
        <p className="text-[7px] uppercase tracking-[0.18em] text-[#756958]">
          Attribute modifiers
        </p>

        <div className="mt-2 flex flex-wrap gap-1.5 lg:justify-end">
          {activeModifiers.length >
          0 ? (
            activeModifiers.map(
              ([label, value]) => (
                <span
                  key={label}
                  className="border border-[#59432c]/45 bg-[#18110d] px-2 py-1 text-[8px] uppercase tracking-[0.1em] text-[#9e896c]"
                >
                  {label}{" "}
                  {value > 0 ? "+" : ""}
                  {value}
                </span>
              ),
            )
          ) : (
            <span className="text-[10px] italic text-[#746858]">
              None
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function OrderIcon({
  src,
  name,
  colour,
}: {
  src: string | null;
  name: string;
  colour: string;
}) {
  return (
    <div
      className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden border bg-[#0d0907] sm:h-28 sm:w-28"
      style={{
        borderColor: `${colour}88`,
      }}
    >
      {src ? (
        <Image
          src={src}
          alt={`${name} icon`}
          fill
          sizes="112px"
          className="object-contain p-3"
          unoptimized
        />
      ) : (
        <span
          className="font-serif text-4xl"
          style={{ color: colour }}
        >
          {name.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );
}

function MemberPortrait({
  src,
  name,
}: {
  src: string | null;
  name: string;
}) {
  return (
    <div className="relative h-14 w-14 shrink-0 overflow-hidden border border-[#60482e]/55 bg-[#0d0907]">
      {src ? (
        <Image
          src={src}
          alt={`Portrait of ${name}`}
          fill
          sizes="56px"
          className="object-cover"
          unoptimized
        />
      ) : (
        <div className="flex h-full items-center justify-center font-serif text-lg text-[#806746]">
          {name.charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  );
}