import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AssociationHero } from "@/components/associations/association-hero";
import { getAssociationBySlug } from "@/lib/associations";
import { createClient } from "@/lib/supabase/server";
import type { PublicOrderDirectoryEntry } from "@/app/(portal)/orders/page";

type AssociationPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({
  params,
}: AssociationPageProps): Promise<Metadata> {
  const { slug } = await params;
  const association =
    await getAssociationBySlug(slug);

  if (!association) {
    return {
      title: "Association Not Found | Sepulchria",
    };
  }

  return {
    title: `${association.name} | Associations | Sepulchria`,
    description:
      association.summary ||
      `Read the Sepulchria Associations entry for ${association.name}.`,
  };
}

export default async function AssociationPage({
  params,
}: AssociationPageProps) {
  const { slug } = await params;
  const association =
    await getAssociationBySlug(slug);

  if (!association) {
    notFound();
  }

  const supabase = await createClient();
  const { data: orderData, error: orderError } = await supabase
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
    .eq("association_id", association.id)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (orderError) {
    throw new Error(
      `Unable to load Orders for ${association.name}: ${orderError.message}`,
    );
  }

  const orders =
    (orderData ?? []) as unknown as PublicOrderDirectoryEntry[];

  return (
    <div className="mx-auto w-full max-w-7xl p-5 sm:p-7 lg:p-9">
      <AssociationHero
        association={association}
        orders={orders}
      />
    </div>
  );
}