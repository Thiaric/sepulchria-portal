import Link from "next/link";

import type { PublicOrderMembership } from "@/types/public-character";

export function PublicCharacterOrder({
  membership,
}: {
  membership:
    | PublicOrderMembership
    | null;
}) {
  if (!membership) {
    return (
      <section className="border border-[#60482e]/45 bg-[#120e0b] p-4">
        <p className="text-[8px] uppercase tracking-[0.22em] text-[#806b50]">
          Order
        </p>

        <p className="mt-2 text-sm text-[#8f8271]">
          This character does not currently belong to an Order.
        </p>
      </section>
    );
  }

  const colour =
    membership.order.colour ??
    membership.association?.colour ??
    "#8d6d3e";

  return (
    <section
      className="border bg-[#120e0b] p-4"
      style={{
        borderColor: `${colour}66`,
      }}
    >
      <p className="text-[8px] uppercase tracking-[0.22em] text-[#806b50]">
        Order membership
      </p>

      <div className="mt-3 grid gap-px bg-[#4f3b28]/35 sm:grid-cols-2 lg:grid-cols-4">
        <OrderDetail
          label="Association"
          value={
            membership.association
              ?.name ??
            "Not assigned"
          }
          href={
            membership.association
              ? `/associations/${membership.association.slug}`
              : undefined
          }
        />

        <OrderDetail
          label="Order"
          value={membership.order.name}
          href={`/orders/${membership.order.slug}`}
        />

        <OrderDetail
          label="Level"
          value={
            membership.level
              ? `Level ${membership.level.level}`
              : "Not assigned"
          }
        />

        <OrderDetail
          label="Role"
          value={
            membership.job?.name ??
            "No specific role"
          }
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
