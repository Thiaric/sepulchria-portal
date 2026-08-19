import { redirect } from "next/navigation";
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
  data: { user },
} = await supabase.auth.getUser();

if (!user) {
  redirect("/homepage");
}

  const {
    data: areas,
    error: areasError,
  } = await supabase
    .from("areas")
    .select(
      "id, name, slug, description",
    )
    .eq("is_active", true)
    .neq("slug", "private-locations")
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
  <div className="h-full min-h-0 p-1 sm:p-1 lg:p-1">
    <InteractiveWorldMap
      areas={(areas ?? []) as Area[]}
    />
  </div>
);
}