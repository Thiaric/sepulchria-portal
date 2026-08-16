import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { RichTextContent } from "@/components/editor/rich-text-content";
import {
  PublicOrderRoleGraph,
  type PublicOrderGraphLink,
  type PublicOrderGraphRole,
} from "@/components/orders/public-order-role-graph";
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
  muscles_modifier: number;
  reflexes_modifier: number;
  vigour_modifier: number;
  shrewd_modifier: number;
  brains_modifier: number;
  presence_modifier: number;
};

type LevelRow = {
  id: string;
  level: number;
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
    linksResult,
  ] = await Promise.all([
    supabase
      .from("order_levels")
      .select(`
        id,
        level,
        roles:order_jobs(
          id,
          name,
          description,
          sort_order,
          muscles_modifier,
          reflexes_modifier,
          vigour_modifier,
          shrewd_modifier,
          brains_modifier,
          presence_modifier
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

    supabase
      .from("order_job_links")
      .select(
        "id, from_job_id, to_job_id",
      ),
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

  if (linksResult.error) {
    throw new Error(
      `Unable to load Order Role links: ${linksResult.error.message}`,
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

  const graphRoles =
    levels.flatMap(
      (level) =>
        (level.roles ?? []).map(
          (role) => ({
            ...role,
            level: level.level,
          }),
        ),
    ) as PublicOrderGraphRole[];

  const graphRoleIds =
    new Set(
      graphRoles.map(
        (role) => role.id,
      ),
    );

  const graphLinks =
    (
      (linksResult.data ??
        []) as PublicOrderGraphLink[]
    ).filter(
      (link) =>
        graphRoleIds.has(
          link.from_job_id,
        ) &&
        graphRoleIds.has(
          link.to_job_id,
        ),
    );

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

        <article className="mt-5 space-y-5">
          <section
            className="relative overflow-hidden border border-[#60482e]/55 bg-[#110d0a]"
            style={{
              boxShadow: `inset 0 4px 0 ${colour}`,
            }}
          >
            <div className="relative min-h-[360px] overflow-hidden">
              {order.banner_url ?? order.image_url ? (
                <>
                  <Image
                    src={
                      order.banner_url ??
                      order.image_url ??
                      ""
                    }
                    alt=""
                    fill
                    sizes="100vw"
                    className="object-cover opacity-45"
                    unoptimized
                    priority
                  />

                  <div className="absolute inset-0 bg-gradient-to-r from-[#100c09] via-[#100c09]/90 to-[#100c09]/35" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#100c09] via-transparent to-black/30" />
                </>
              ) : (
                <div
                  className="absolute inset-0"
                  style={{
                    background: `radial-gradient(circle at top right, ${colour}55 0%, #17100c 42%, #0d0907 100%)`,
                  }}
                />
              )}

              <div className="relative flex min-h-[360px] items-end p-6 sm:p-8 lg:p-10">
                <div className="w-full">
                  <div className="flex flex-wrap items-center gap-4">
                    <div
                      className="relative flex h-20 w-20 items-center justify-center overflow-hidden border bg-[#100c09]/90"
                      style={{
                        borderColor: `${colour}bb`,
                      }}
                    >
                      {order.icon_url ? (
                        <Image
                          src={order.icon_url}
                          alt=""
                          fill
                          sizes="80px"
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <span
                          className="font-serif text-4xl"
                          style={{ color: colour }}
                        >
                          {order.name
                            .slice(0, 1)
                            .toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div>
                      <p
                        className="text-[10px] uppercase tracking-[0.3em]"
                        style={{ color: colour }}
                      >
                        Order
                      </p>

                      <h1 className="mt-2 font-serif text-4xl leading-tight text-[#ead6ad] sm:text-5xl lg:text-6xl">
                        {order.name}
                      </h1>

                      {association ? (
                        <Link
                          href={`/associations/${association.slug}`}
                          className="mt-2 inline-block font-serif text-base text-[#b89a6c] transition hover:text-[#e2c18e] sm:text-lg"
                        >
                          {association.name}
                        </Link>
                      ) : null}
                    </div>
                  </div>

                  {order.summary ? (
                    <RichTextContent
                      body={order.summary}
                      className="mt-6 w-full font-serif text-sm leading-7 text-[#c7b494] sm:text-base"
                    />
                  ) : null}
                </div>
              </div>
            </div>
          </section>

          <div className="border border-[#60482e]/45 bg-[#15100d]/95 p-5 sm:p-7 lg:p-8">
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

              <PublicOrderRoleGraph
                roles={graphRoles}
                links={graphLinks}
              />
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