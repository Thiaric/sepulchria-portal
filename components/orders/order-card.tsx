import { CodexEntryCard } from "@/components/codex/codex-entry-card";
import type { PublicOrderDirectoryEntry } from "@/app/(portal)/orders/page";

type OrderCardProps = {
  order: PublicOrderDirectoryEntry;
};

function one<T>(
  value: T | T[] | null,
): T | null {
  return Array.isArray(value)
    ? value[0] ?? null
    : value;
}

export function OrderCard({
  order,
}: OrderCardProps) {
  const association =
    one(order.association);

  return (
    <div className="relative">
      <CodexEntryCard
        name={order.name}
        slug={order.slug}
        summary={order.summary}
        hrefBase="/orders"
        imageUrl={
          order.image_url ??
          order.banner_url
        }
        iconUrl={order.icon_url}
        colour={order.colour}
        categoryLabel={
          association?.name ??
          "Order of Sepulchria"
        }
        anchorId={`order-${order.slug}`}
        enableImagePreview
      />
    </div>
  );
}
