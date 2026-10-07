import {
  calculateCharacterAge,
  formatCharacterBirthday,
} from "@/lib/characters/character-age";
import { createClient } from "@/lib/supabase/server";

export async function PublicCharacterAgeDetail({
  characterId,
}: {
  characterId: string;
}) {
  const supabase =
    await createClient();

  const { data, error } =
    await supabase
      .from("characters")
      .select(
        "age, date_of_birth",
      )
      .eq("id", characterId)
      .maybeSingle();

  if (error) {
    console.error(
      "Unable to load public character age:",
      error.message,
    );
  }

  const storedAge =
    typeof data?.age === "number"
      ? data.age
      : null;

  const age =
    calculateCharacterAge(
      data?.date_of_birth ?? null,
      storedAge,
    );

  const birthday =
    formatCharacterBirthday(
      data?.date_of_birth ?? null,
    );

  const detailClass =
    "min-w-0 bg-[rgb(var(--sep-colour-17110d))] px-3 py-2";

  const termClass =
    "text-[7px] uppercase tracking-[0.19em] text-[rgb(var(--sep-colour-796448))]";

  const descriptionClass =
    "mt-1 text-[11px] leading-5 text-[rgb(var(--sep-colour-cab89b))]";

  return (
    <>
      <div
        className={`${detailClass} components_characters_public_character_age_detail_age`}
      >
        <dt className={termClass}>
          Age
        </dt>

        <dd className={descriptionClass}>
          {age !== null
            ? `${age} years`
            : "Not provided"}
        </dd>
      </div>

      <div
        className={`${detailClass} components_characters_public_character_age_detail_birthday`}
      >
        <dt className={termClass}>
          Birthday
        </dt>

        <dd className={descriptionClass}>
          {birthday ??
            "Not provided"}
        </dd>
      </div>
    </>
  );
}
