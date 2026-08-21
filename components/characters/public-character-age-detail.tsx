import { createClient } from "@/lib/supabase/server";

export async function PublicCharacterAgeDetail({
  characterId,
}: {
  characterId: string;
}) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("characters")
    .select("age")
    .eq("id", characterId)
    .maybeSingle();

  if (error) {
    console.error(
      "Unable to load public character age:",
      error.message,
    );
  }

  const age =
    typeof data?.age === "number"
      ? data.age
      : null;

  return (
    <div>
      <dt className="text-[9px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-806b50))]">
        Age
      </dt>

      <dd className="mt-1 text-sm text-[rgb(var(--sep-colour-d4c4ad))]">
        {age !== null
          ? `${age} years`
          : "Not provided"}
      </dd>
    </div>
  );
}
