import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

type Relation<T> = T | T[] | null;

function one<T>(value: Relation<T>): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

export async function CharacterOrderSummary({
  characterId,
}: {
  characterId: string;
}) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("order_memberships")
    .select(`
      id,
      order:orders!order_memberships_order_id_fkey(
        id,
        name,
        slug,
        colour,
        association:associations!orders_association_id_fkey(
          id,
          name,
          slug,
          colour
        )
      ),
      level:order_levels!order_memberships_order_level_id_fkey(
        id,
        level,
        name
      ),
      job:order_jobs!order_memberships_order_job_id_fkey(
        id,
        name
      )
    `)
    .eq("character_id", characterId)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Unable to load character Order:", error);
    return null;
  }

  if (!data) {
    return (
      <section className="mt-3 border border-[#60482e]/45 bg-[#120e0b] p-4">
        <p className="text-[8px] uppercase tracking-[0.22em] text-[#806b50]">
          Order
        </p>
        <p className="mt-2 text-sm text-[#8f8271]">
          This character does not currently belong to an Order.
        </p>
      </section>
    );
  }

  const order = one(data.order as Relation<{
    id: string;
    name: string;
    slug: string;
    colour: string | null;
    association: Relation<{
      id: string;
      name: string;
      slug: string;
      colour: string | null;
    }>;
  }>);

  const level = one(data.level as Relation<{
    id: string;
    level: number;
    name: string | null;
  }>);

  const job = one(data.job as Relation<{
    id: string;
    name: string;
  }>);

  if (!order) {
    return null;
  }

  const association = one(order.association);
  const colour = order.colour ?? association?.colour ?? "#8d6d3e";

  return (
    <section
      className="mt-3 border bg-[#120e0b] p-4"
      style={{ borderColor: `${colour}66` }}
    >
      <p className="text-[8px] uppercase tracking-[0.22em] text-[#806b50]">
        Order membership
      </p>

      <div className="mt-3 grid gap-px bg-[#4f3b28]/35 sm:grid-cols-2 lg:grid-cols-4">
        <OrderDetail
          label="Association"
          value={association?.name ?? "Not assigned"}
          href={association ? `/associations/${association.slug}` : undefined}
        />
        <OrderDetail
          label="Order"
          value={order.name}
          href={`/orders/${order.slug}`}
        />
        <OrderDetail
          label="Level"
          value={
            level
              ? level.name
                ? `${level.level} — ${level.name}`
                : `Level ${level.level}`
              : "Not assigned"
          }
        />
        <OrderDetail
          label="Job"
          value={job?.name ?? "No specific job"}
        />
      </div>
    </section>
  );
}

function OrderDetail({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href?: string;
}) {
  const content = (
    <>
      <p className="text-[7px] uppercase tracking-[0.19em] text-[#796448]">
        {label}
      </p>
      <p className="mt-1 break-words text-[11px] leading-5 text-[#cab89b]">
        {value}
      </p>
    </>
  );

  return href ? (
    <Link
      href={href}
      className="min-w-0 bg-[#17110d] px-3 py-2 transition hover:bg-[#211810]"
    >
      {content}
    </Link>
  ) : (
    <div className="min-w-0 bg-[#17110d] px-3 py-2">
      {content}
    </div>
  );
}
