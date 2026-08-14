import { OrderCard } from "@/components/orders/order-card";
import { CodexEntryGrid } from "@/components/codex/codex-entry-grid";
import type { PublicOrderDirectoryEntry } from "@/app/(portal)/orders/page";

type OrderGridProps = {
  orders: PublicOrderDirectoryEntry[];
};

export function OrderGrid({
  orders,
}: OrderGridProps) {
  return (
    <CodexEntryGrid
      emptyTitle="No Orders available"
      emptyText="There are currently no active Orders in the Sepulchria Codex."
    >
      {orders.map((order) => (
        <OrderCard
          key={order.id}
          order={order}
        />
      ))}
    </CodexEntryGrid>
  );
}
