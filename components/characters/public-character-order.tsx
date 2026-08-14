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
      <div className="border border-[#60482e]/45 bg-[#120e0b] p-3">
        <p className="text-[7px] uppercase tracking-[0.2em] text-[#806b50]">
          Order
        </p>

        <p className="mt-1 font-serif text-base text-[#8f8271]">
          Not affiliated
        </p>
      </div>
    );
  }

  const level =
    membership.level
      ? `Level ${membership.level.level}`
      : "Not assigned";

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Card
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

      <Card
        label="Order"
        value={
          membership.order.name
        }
        href={`/orders/${membership.order.slug}`}
      />

      <Card
        label="Level"
        value={level}
      />

      <Card
        label="Job"
        value={
          membership.job?.name ??
          "No specific job"
        }
      />
    </div>
  );
}

function Card({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href?: string;
}) {
  const body = (
    <>
      <p className="text-[7px] uppercase tracking-[0.2em] text-[#806b50]">
        {label}
      </p>

      <p className="mt-1 truncate font-serif text-base text-[#e1c99f]">
        {value}
      </p>
    </>
  );

  return href ? (
    <Link
      href={href}
      className="border border-[#60482e]/55 bg-[#120e0b] p-3 transition hover:bg-[#1b140f]"
    >
      {body}
    </Link>
  ) : (
    <div className="border border-[#60482e]/55 bg-[#120e0b] p-3">
      {body}
    </div>
  );
}
