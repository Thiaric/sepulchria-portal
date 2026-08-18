import { CodexEntryHero } from "@/components/codex/codex-entry-hero";
import type { Association } from "@/types/codex";
import { OrderGrid } from "@/components/orders/order-grid";
import type { PublicOrderDirectoryEntry } from "@/app/(portal)/orders/page";

type AssociationHeroProps = {
  association: Association;
  orders: PublicOrderDirectoryEntry[];
};

export function AssociationHero({
  association,
  orders,
}: AssociationHeroProps) {
  return (
    <CodexEntryHero
      name={association.name}
      summary={association.summary}
      description={association.description}
      bannerUrl={association.banner_url}
      imageUrl={association.image_url}
      iconUrl={association.icon_url}
      colour={association.colour}
      categoryLabel="Association"
      returnHref="/associations"
      returnLabel="Back to associations"
      recordReplacement={
        <section className="border border-[#60482e]/45 bg-[#15100d]/95 p-6 sm:p-8">
          <div className="flex items-center gap-4">
            <span
              className="h-px flex-1"
              style={{
                background: `linear-gradient(to right, ${association.colour ?? "#8a6840"}, transparent)`,
              }}
            />
            <p className="text-[9px] uppercase tracking-[0.3em] text-[#8d7759]">
              Orders
            </p>
            <span
              className="h-px flex-1"
              style={{
                background: `linear-gradient(to left, ${association.colour ?? "#8a6840"}, transparent)`,
              }}
            />
          </div>

          {orders.length ? (
            <div className="mt-7">
              <OrderGrid orders={orders} />
            </div>
          ) : (
            <p className="mt-7 text-center text-sm italic text-[#8f8373]">
              No active Orders currently belong to this Association.
            </p>
          )}
        </section>
      }
    />
  );
}