"use server";

import { requireStaff } from "@/lib/auth/require-staff";
import {
  applyGiftOwnershipHealthEffects,
  removeGiftOwnershipHealthEffects,
} from "@/lib/gifts/gift-health-effects";
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

    const selectedGiftIds = Array.from(
      new Set(
        formData
          .getAll("ancestryGiftIds")
          .filter(
            (value): value is string =>
              typeof value === "string" &&
              /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value),
          ),
      ),
    );

    if (selectedGiftIds.length > 2) {
      return {
        ok: false,
        error: "Choose no more than 2 Ancestry Feats.",
      };
    }

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

    if (selectedGiftIds.length > 0) {
      const [eligibilityResult, activeResult] =
        await Promise.all([
          supabase
            .from("gift_races")
            .select("gift_id")
            .eq("race_id", raceId)
            .in("gift_id", selectedGiftIds),

          supabase
            .from("gifts")
            .select("id, ancestry_choice_group")
            .eq("is_active", true)
            .in("id", selectedGiftIds),
        ]);

      if (eligibilityResult.error || activeResult.error) {
        return {
          ok: false,
          error:
            eligibilityResult.error?.message ??
            activeResult.error?.message ??
            "Unable to validate Ancestry Feats.",
        };
      }

      const eligibleIds = new Set(
        (eligibilityResult.data ?? []).map((row) => row.gift_id),
      );
      const activeIds = new Set(
        (activeResult.data ?? []).map((row) => row.id),
      );

      if (
        selectedGiftIds.some(
          (giftId) =>
            !eligibleIds.has(giftId) ||
            !activeIds.has(giftId),
        )
      ) {
        return {
          ok: false,
          error:
            "One or more selected Feats are not available to this Ancestry.",
        };
      }

      const selectedGrouped =
        (activeResult.data ?? [])
          .filter((row) => row.ancestry_choice_group);

      if (selectedGrouped.length > 0) {
        const groups = new Set(
          selectedGrouped.map(
            (row) => row.ancestry_choice_group,
          ),
        );

        if (
          groups.size !== 1 ||
          selectedGrouped.length !== selectedGiftIds.length
        ) {
          return {
            ok: false,
            error:
              "Choose one complete grouped Ancestry Feat pair.",
          };
        }

        const selectedGroup =
          selectedGrouped[0].ancestry_choice_group;

        const {
          data: completeGroup,
          error: completeGroupError,
        } = await supabase
          .from("gifts")
          .select(`
            id,
            eligibility:gift_races!inner(race_id)
          `)
          .eq("is_active", true)
          .eq("ancestry_choice_group", selectedGroup)
          .eq("eligibility.race_id", raceId);

        if (completeGroupError) {
          return {
            ok: false,
            error: completeGroupError.message,
          };
        }

        const completeGroupIds = new Set(
          (completeGroup ?? []).map((row) => row.id),
        );

        if (
          completeGroupIds.size === 0 ||
          completeGroupIds.size !== selectedGiftIds.length ||
          selectedGiftIds.some((id) => !completeGroupIds.has(id))
        ) {
          return {
            ok: false,
            error:
              "Choose one complete Ancestry Feat group.",
          };
        }
      }
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
    // PHASE5_REMOVE_OLD_ANCESTRY_GIFT_HEALTH
    const {
      data: oldAncestryAssignments,
      error: oldGiftLoadError,
    } = await supabase
      .from("character_gifts")
      .select("id")
      .eq(
        "character_id",
        characterId,
      )
      .eq(
        "acquisition_source",
        "ancestry",
      );

    if (oldGiftLoadError) {
      return {
        ok: false,
        error:
          oldGiftLoadError.message,
      };
    }

    try {
      for (
        const assignment
        of oldAncestryAssignments ?? []
      ) {
        await removeGiftOwnershipHealthEffects(
          assignment.id,
        );
      }
    } catch (giftHealthError) {
      return {
        ok: false,
        error:
          giftHealthError instanceof Error
            ? giftHealthError.message
            : "Unable to remove previous Gift Health effects.",
      };
    }



    const { error: removeGiftError } =
      await supabase
        .from("character_gifts")
        .delete()
        .eq("character_id", characterId)
        .eq("acquisition_source", "ancestry");

    if (removeGiftError) {
      return {
        ok: false,
        error: removeGiftError.message,
      };
    }

    if (selectedGiftIds.length > 0) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error: insertGiftError } =
        await supabase
          .from("character_gifts")
          .insert(
            selectedGiftIds.map((giftId) => ({
              character_id: characterId,
              gift_id: giftId,
              acquisition_source: "ancestry",
              source_race_id: raceId,
              assigned_by: user?.id ?? null,
            })),
          );

      if (insertGiftError) {
        return {
          ok: false,
          error: insertGiftError.message,
        };
      }
    }

    // PHASE5_APPLY_NEW_ANCESTRY_GIFT_HEALTH
    if (selectedGiftIds.length > 0) {
      const {
        data: newAncestryAssignments,
        error: newGiftLoadError,
      } = await supabase
        .from("character_gifts")
        .select("id")
        .eq(
          "character_id",
          characterId,
        )
        .eq(
          "acquisition_source",
          "ancestry",
        );

      if (newGiftLoadError) {
        return {
          ok: false,
          error:
            newGiftLoadError.message,
        };
      }

      try {
        for (
          const assignment
          of newAncestryAssignments ?? []
        ) {
          await applyGiftOwnershipHealthEffects(
            assignment.id,
          );
        }
      } catch (giftHealthError) {
        return {
          ok: false,
          error:
            giftHealthError instanceof Error
              ? giftHealthError.message
              : "Unable to apply new Gift Health effects.",
        };
      }
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
