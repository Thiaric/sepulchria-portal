import Link from "next/link";

import type { PublicOrderMembership } from "@/types/public-character";

export function PublicCharacterOrder({
  membership,
}: {
  membership: PublicOrderMembership | null;
}) {
  const colour =
    membership?.order.colour ??
    membership?.association?.colour ??
    "#8d6d3e";

  const display = membership
  ? membership.job?.name ?? "No specific role"
  : "No Order";

  return (
    <Link
      href={membership ? `/orders/${membership.order.slug}` : "/orders"}
      title={display}
      className="group flex min-w-0 items-center gap-2.5 border border-[rgb(var(--sep-colour-59432c))]/45 bg-black/15 px-2.5 py-2 transition hover:bg-[rgb(var(--sep-colour-1b140f))]"
      style={{
        borderColor: `${colour}66`,
        backgroundImage: `linear-gradient(90deg, ${colour}18, transparent 55%)`,
      }}
    >
      <div
        className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden border bg-[rgb(var(--sep-colour-0d0907))] font-serif text-[9px]"
        style={{
          borderColor: `${colour}88`,
          color: colour,
        }}
      >
        {membership?.order.icon_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={membership.order.icon_url}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          membership?.order.name.charAt(0).toUpperCase() ?? "?"
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[7px] uppercase tracking-[0.17em] text-[rgb(var(--sep-colour-735f47))]">
          Order
        </p>
        <p
          className="mt-0.5 break-words text-[11px] leading-4"
          style={{ color: membership ? colour : "#675e52" }}
        >
          {display}
        </p>
      </div>
    </Link>
  );
}
