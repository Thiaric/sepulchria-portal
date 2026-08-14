import type {
  ReactNode,
} from "react";

import { AdminOrdersCollapseEnhancer } from "@/components/admin/admin-orders-collapse-enhancer";

export default function AdminOrdersLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      <AdminOrdersCollapseEnhancer />
      {children}
    </>
  );
}
