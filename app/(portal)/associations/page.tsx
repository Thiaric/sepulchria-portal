import type { Metadata } from "next";

import { AssociationGrid } from "@/components/associations/association-grid";
import { getAssociations } from "@/lib/associations";

export const metadata: Metadata = {
  title: "Associations | Sepulchria",
  description:
    "Discover the eleven Associations that form the civic body of Sepulchria.",
};

export default async function AssociationsPage() {
  const associations = await getAssociations();

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-5 sm:p-7 lg:p-9">
      <header className="relative overflow-hidden border border-[#60482e]/45 bg-[#15100d]/95 px-6 py-5 sm:px-8">
  <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_top_right,rgba(145,105,60,0.35),transparent_42%)]" />

  <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-[0.28em] text-[#886c48]">
        The body of the city
      </p>

      <h1 className="mt-2 font-serif text-4xl text-[#e0c99e] sm:text-5xl">
        Associations
      </h1>

      <p className="mt-3 max-w-3xl text-sm leading-6 text-[#9f9281]">
        Sepulchria understands itself as a living body. Its eleven
        Associations govern its institutions, professions, beliefs
        and daily life. Every citizen belongs to the part that most
        closely reflects their place within the city.
      </p>
    </div>

    <div className="shrink-0 border border-[#60482e]/45 bg-black/20 px-5 py-3">
      <span className="block text-[9px] uppercase tracking-[0.22em] text-[#806b50]">
        Current Associations
      </span>

      <span className="mt-1 block font-serif text-xl text-[#d4bd94]">
        {associations.length}
      </span>
    </div>
  </div>
</header>

      <AssociationGrid associations={associations} />
    </div>
  );
}