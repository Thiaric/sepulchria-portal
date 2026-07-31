import { InteractiveWorldMap } from "@/components/portal/interactive-world-map";
import { createClient } from "@/lib/supabase/server";

type Area = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
};

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: areas,
    error: areasError,
  } = await supabase
    .from("areas")
    .select(
      "id, name, slug, description",
    )
    .eq("is_active", true)
    .order("sort_order", {
      ascending: true,
    })
    .order("name", {
      ascending: true,
    });

  if (areasError) {
    console.error(
      "Unable to load world map areas:",
      areasError,
    );
  }

  return (
    <div className="p-5 sm:p-6 lg:p-7">
      <header className="mb-5 border-b border-[#6e5535]/30 pb-5">
        <p className="text-xs uppercase tracking-[0.35em] text-[#987c55]">
          Welcome to the chronicle
        </p>

        <h1 className="mt-3 font-serif text-4xl leading-tight text-[#ead8b4] sm:text-5xl">
          Enter Sepulchria
        </h1>

        <p className="mt-3 w-full text-sm leading-6 text-[#aa9b87] sm:text-base">
          Explore the Land of the Fallen,
          enter Sepulchria and choose where
          your story will continue.
        </p>
      </header>

      <InteractiveWorldMap
        areas={(areas ?? []) as Area[]}
      />
    </div>
  );
}