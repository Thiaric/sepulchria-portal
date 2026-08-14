import type { Metadata } from "next";

import { OrderGrid } from "@/components/orders/order-grid";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Orders | Sepulchria",
  description:
    "Explore the Orders operating beneath the Associations of Sepulchria.",
};

export type PublicOrderDirectoryEntry = {
  id: string;
  association_id: string;
  name: string;
  slug: string;
  summary: string;
  image_url: string | null;
  banner_url: string | null;
  icon_url: string | null;
  colour: string | null;
  sort_order: number;
  association:
    | {
        id: string;
        name: string;
        slug: string;
      }
    | {
        id: string;
        name: string;
        slug: string;
      }[]
    | null;
};

export default async function OrdersPage() {
  const supabase =
    await createClient();

  const {
    data,
    error,
  } = await supabase
    .from("orders")
    .select(`
      id,
      association_id,
      name,
      slug,
      summary,
      image_url,
      banner_url,
      icon_url,
      colour,
      sort_order,
      association:associations(
        id,
        name,
        slug
      )
    `)
    .eq("is_active", true)
    .order("sort_order", {
      ascending: true,
    })
    .order("name", {
      ascending: true,
    });

  if (error) {
    throw new Error(
      `Unable to load Orders: ${error.message}`,
    );
  }

  const orders =
    (data ?? []) as unknown as
      PublicOrderDirectoryEntry[];

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-5 sm:p-7 lg:p-9">
      <header className="relative overflow-hidden border border-[#60482e]/45 bg-[#15100d]/95 px-6 py-5 sm:px-8">
        <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_top_right,rgba(145,105,60,0.35),transparent_42%)]" />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.28em] text-[#886c48]">
              Orders of Sepulchria
            </p>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-[#9f9281]">
              Within the Associations stand the Orders: the specialised
              institutions, disciplines and professional bodies through which
              Sepulchrians practise their crafts, duties and callings.
            </p>
          </div>

          <div className="shrink-0 border border-[#60482e]/45 bg-black/20 px-5 py-3">
            <span className="block text-[9px] uppercase tracking-[0.22em] text-[#806b50]">
              Current Orders
            </span>

            <span className="mt-1 block font-serif text-xl text-[#d4bd94]">
              {orders.length}
            </span>
          </div>
        </div>
      </header>

      <OrderGrid orders={orders} />
    </div>
  );
}
