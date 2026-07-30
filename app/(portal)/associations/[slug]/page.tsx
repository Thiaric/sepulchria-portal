import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AssociationHero } from "@/components/associations/association-hero";
import { getAssociationBySlug } from "@/lib/associations";

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
      `Read the Sepulchria Codex entry for ${association.name}.`,
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

  return (
    <div className="mx-auto w-full max-w-7xl p-5 sm:p-7 lg:p-9">
      <AssociationHero association={association} />
    </div>
  );
}