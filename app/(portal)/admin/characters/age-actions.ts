"use server";

import { requireStaff } from "@/lib/auth/require-staff";
import { createClient } from "@/lib/supabase/server";

type RaceAgeOption = {
  id: string;
  name: string;
  min_age: number | null;
  max_age: number | null;
};

export type AdminAgeConfig = {
  age: number | null;
  races: RaceAgeOption[];
};

function readUuid(
  value: FormDataEntryValue | null,
  label: string,
) {
  const raw =
    typeof value === "string"
      ? value.trim()
      : "";

  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (
    !raw ||
    !uuidPattern.test(raw)
  ) {
    throw new Error(
      `${label} is invalid.`,
    );
  }

  return raw;
}

export async function getAdminCharacterAgeConfig(
  characterId: string,
): Promise<AdminAgeConfig> {
  await requireStaff();

  const supabase =
    await createClient();

  const [
    characterResult,
    racesResult,
  ] = await Promise.all([
    supabase
      .from("characters")
      .select("age")
      .eq("id", characterId)
      .maybeSingle(),

    supabase
      .from("races")
      .select(
        "id, name, min_age, max_age",
      )
      .order("name"),
  ]);

  if (characterResult.error) {
    throw new Error(
      characterResult.error.message,
    );
  }

  if (!characterResult.data) {
    throw new Error(
      "Character not found.",
    );
  }

  if (racesResult.error) {
    throw new Error(
      racesResult.error.message,
    );
  }

  return {
    age:
      typeof characterResult.data
        .age === "number"
        ? characterResult.data.age
        : null,
    races:
      (racesResult.data ??
        []) as RaceAgeOption[],
  };
}

export async function saveAdminCharacterAge(
  formData: FormData,
): Promise<{
  ok: true;
} | {
  ok: false;
  error: string;
}> {
  try {
    await requireStaff();

    const characterId = readUuid(
      formData.get("characterId"),
      "Character identifier",
    );

    const raceId = readUuid(
      formData.get("raceId"),
      "Ancestry",
    );

    const ageRaw = String(
      formData.get("age") ?? "",
    ).trim();

    const age = Number(ageRaw);

    if (
      !ageRaw ||
      !Number.isInteger(age) ||
      age < 0
    ) {
      return {
        ok: false,
        error:
          "Age must be a whole number.",
      };
    }

    const supabase =
      await createClient();

    const {
      data: race,
      error: raceError,
    } = await supabase
      .from("races")
      .select(
        "id, name, min_age, max_age",
      )
      .eq("id", raceId)
      .maybeSingle();

    if (raceError || !race) {
      return {
        ok: false,
        error:
          raceError?.message ??
          "The selected ancestry could not be loaded.",
      };
    }

    if (race.min_age === null) {
      return {
        ok: false,
        error: `The playable age range for ${race.name} is not configured.`,
      };
    }

    if (age < race.min_age) {
      return {
        ok: false,
        error: `${race.name} characters must be at least ${race.min_age} years old.`,
      };
    }

    if (
      race.max_age !== null &&
      age > race.max_age
    ) {
      return {
        ok: false,
        error: `${race.name} characters may be no older than ${race.max_age} years.`,
      };
    }

    const { error } = await supabase
      .from("characters")
      .update({
        age,
        race_id: raceId,

        // Retire the old DOB value once
        // staff has moved the character
        // onto the new Age system.
        date_of_birth: null,
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", characterId);

    if (error) {
      return {
        ok: false,
        error: error.message,
      };
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to save character age.",
    };
  }
}
