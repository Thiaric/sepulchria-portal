"use server";

import {
  requireAdminSection,
  requireStaffCapability,
} from "@/lib/auth/require-staff";
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
  await requireAdminSection(
    "characters",
  );

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
): Promise<
  | {
      ok: true;
    }
  | {
      ok: false;
      error: string;
    }
> {
  try {
    await requireStaffCapability(
      "character_age_admin",
    );

    const characterId =
      readUuid(
        formData.get(
          "characterId",
        ),
        "Character identifier",
      );

    const raceId =
      readUuid(
        formData.get(
          "raceId",
        ),
        "Ancestry",
      );

    const ageRaw =
      String(
        formData.get("age") ??
          "",
      ).trim();

    const age =
      Number(ageRaw);

    const selectedGiftIds =
      Array.from(
        new Set(
          formData
            .getAll(
              "ancestryGiftIds",
            )
            .filter(
              (
                value,
              ): value is string =>
                typeof value ===
                  "string" &&
                /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
                  value,
                ),
            ),
        ),
      );

    if (
      selectedGiftIds.length >
      2
    ) {
      return {
        ok: false,
        error:
          "Choose no more than 2 Ancestry Feats.",
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
      .eq(
        "id",
        raceId,
      )
      .maybeSingle();

    if (
      raceError ||
      !race
    ) {
      return {
        ok: false,
        error:
          raceError?.message ??
          "The selected ancestry could not be loaded.",
      };
    }

    if (
      race.min_age === null
    ) {
      return {
        ok: false,
        error:
          `The playable age range for ${race.name} is not configured.`,
      };
    }

    if (
      age <
      race.min_age
    ) {
      return {
        ok: false,
        error:
          `${race.name} characters must be at least ${race.min_age} years old.`,
      };
    }

    if (
      race.max_age !== null &&
      age >
        race.max_age
    ) {
      return {
        ok: false,
        error:
          `${race.name} characters may be no older than ${race.max_age} years.`,
      };
    }

    /*
     * Validate the submitted Ancestry Feats.
     */
    if (
      selectedGiftIds.length >
      0
    ) {
      const [
        eligibilityResult,
        activeResult,
      ] =
        await Promise.all([
          supabase
            .from(
              "gift_races",
            )
            .select(
              "gift_id",
            )
            .eq(
              "race_id",
              raceId,
            )
            .in(
              "gift_id",
              selectedGiftIds,
            ),

          supabase
            .from("gifts")
            .select(
              "id, ancestry_choice_group",
            )
            .eq(
              "is_active",
              true,
            )
            .in(
              "id",
              selectedGiftIds,
            ),
        ]);

      if (
        eligibilityResult.error ||
        activeResult.error
      ) {
        return {
          ok: false,
          error:
            eligibilityResult
              .error?.message ??
            activeResult
              .error?.message ??
            "Unable to validate Ancestry Feats.",
        };
      }

      const eligibleIds =
        new Set(
          (
            eligibilityResult.data ??
            []
          ).map(
            (row) =>
              row.gift_id,
          ),
        );

      const activeIds =
        new Set(
          (
            activeResult.data ??
            []
          ).map(
            (row) =>
              row.id,
          ),
        );

      if (
        selectedGiftIds.some(
          (giftId) =>
            !eligibleIds.has(
              giftId,
            ) ||
            !activeIds.has(
              giftId,
            ),
        )
      ) {
        return {
          ok: false,
          error:
            "One or more selected Feats are not available to this Ancestry.",
        };
      }

      const selectedGrouped =
        (
          activeResult.data ??
          []
        ).filter(
          (row) =>
            row
              .ancestry_choice_group,
        );

      if (
        selectedGrouped.length >
        0
      ) {
        const groups =
          new Set(
            selectedGrouped.map(
              (row) =>
                row
                  .ancestry_choice_group,
            ),
          );

        if (
          groups.size !== 1 ||
          selectedGrouped.length !==
            selectedGiftIds.length
        ) {
          return {
            ok: false,
            error:
              "Choose one complete grouped Ancestry Feat pair.",
          };
        }

        const selectedGroup =
          selectedGrouped[0]
            .ancestry_choice_group;

        const {
          data:
            completeGroup,
          error:
            completeGroupError,
        } = await supabase
          .from("gifts")
          .select(`
            id,
            eligibility:gift_races!inner(
              race_id
            )
          `)
          .eq(
            "is_active",
            true,
          )
          .eq(
            "ancestry_choice_group",
            selectedGroup,
          )
          .eq(
            "eligibility.race_id",
            raceId,
          );

        if (
          completeGroupError
        ) {
          return {
            ok: false,
            error:
              completeGroupError.message,
          };
        }

        const completeGroupIds =
          new Set(
            (
              completeGroup ??
              []
            ).map(
              (row) =>
                row.id,
            ),
          );

        if (
          completeGroupIds.size ===
            0 ||
          completeGroupIds.size !==
            selectedGiftIds.length ||
          selectedGiftIds.some(
            (id) =>
              !completeGroupIds.has(
                id,
              ),
          )
        ) {
          return {
            ok: false,
            error:
              "Choose one complete Ancestry Feat group.",
          };
        }
      }
    }

    /*
     * Save Age and Ancestry first.
     */
    const {
      error:
        characterUpdateError,
    } = await supabase
      .from("characters")
      .update({
        age,
        race_id:
          raceId,

        /*
         * Retire legacy DOB once the
         * character uses the Age system.
         */
        date_of_birth:
          null,

        updated_at:
          new Date()
            .toISOString(),
      })
      .eq(
        "id",
        characterId,
      );

    if (
      characterUpdateError
    ) {
      return {
        ok: false,
        error:
          characterUpdateError.message,
      };
    }

    /*
     * ============================================
     * ANCESTRY FEAT RECONCILIATION
     * ============================================
     *
     * Desired behaviour:
     *
     * - already owned + still selected:
     *     KEEP
     *
     * - already owned + deselected:
     *     REMOVE
     *
     * - not owned + selected:
     *     INSERT
     *
     * - not owned + not selected:
     *     DO NOTHING
     *
     * character_gifts has a UNIQUE constraint on:
     *
     * character_id + gift_id
     *
     * so existing selected rows must never be inserted again.
     */

    /*
     * First load every Gift which belongs to
     * this Ancestry's selectable pool.
     */
    const {
      data:
        eligibleAncestryRows,
      error:
        eligibleAncestryError,
    } = await supabase
      .from("gift_races")
      .select(
        "gift_id",
      )
      .eq(
        "race_id",
        raceId,
      );

    if (
      eligibleAncestryError
    ) {
      return {
        ok: false,
        error:
          eligibleAncestryError.message,
      };
    }

    const eligibleAncestryGiftIds =
      Array.from(
        new Set(
          (
            eligibleAncestryRows ??
            []
          ).map(
            (row) =>
              row.gift_id,
          ),
        ),
      );

    /*
     * Load the character's existing ownership
     * of those feats, regardless of source.
     */
    const existingGiftResult =
      eligibleAncestryGiftIds.length >
      0
        ? await supabase
            .from(
              "character_gifts",
            )
            .select(`
              id,
              gift_id,
              acquisition_source
            `)
            .eq(
              "character_id",
              characterId,
            )
            .in(
              "gift_id",
              eligibleAncestryGiftIds,
            )
        : {
            data: [],
            error: null,
          };

    if (
      existingGiftResult.error
    ) {
      return {
        ok: false,
        error:
          existingGiftResult
            .error.message,
      };
    }

    const existingAssignments =
      existingGiftResult.data ??
      [];

    const selectedGiftIdSet =
      new Set(
        selectedGiftIds,
      );

    /*
     * Anything the character currently owns
     * from this Ancestry's selectable pool,
     * but which is no longer selected,
     * must be removed.
     */
    const assignmentsToRemove =
      existingAssignments.filter(
        (assignment) =>
          !selectedGiftIdSet.has(
            assignment.gift_id,
          ),
      );

    /*
     * Remove Health effects BEFORE deleting
     * ownership rows.
     */
    try {
      for (
        const assignment of
        assignmentsToRemove
      ) {
        await removeGiftOwnershipHealthEffects(
          assignment.id,
        );
      }
    } catch (
      giftHealthError
    ) {
      return {
        ok: false,
        error:
          giftHealthError instanceof
          Error
            ? giftHealthError.message
            : "Unable to remove previous Gift Health effects.",
      };
    }

    /*
     * Delete only the rows which were actually
     * deselected.
     */
    if (
      assignmentsToRemove.length >
      0
    ) {
      const {
        error:
          removeGiftError,
      } = await supabase
        .from(
          "character_gifts",
        )
        .delete()
        .in(
          "id",
          assignmentsToRemove.map(
            (assignment) =>
              assignment.id,
          ),
        );

      if (
        removeGiftError
      ) {
        return {
          ok: false,
          error:
            removeGiftError.message,
        };
      }
    }

    /*
     * Work out which selected feats already existed.
     *
     * Those rows stay untouched.
     */
    const remainingExistingGiftIds =
      new Set(
        existingAssignments
          .filter(
            (assignment) =>
              !assignmentsToRemove.some(
                (removed) =>
                  removed.id ===
                  assignment.id,
              ),
          )
          .map(
            (assignment) =>
              assignment.gift_id,
          ),
      );

    /*
     * Only insert genuinely new selections.
     */
    const giftIdsToInsert =
      selectedGiftIds.filter(
        (giftId) =>
          !remainingExistingGiftIds.has(
            giftId,
          ),
      );

    let insertedAssignmentIds:
      string[] = [];

    if (
      giftIdsToInsert.length >
      0
    ) {
      const {
        data: {
          user,
        },
      } =
        await supabase.auth
          .getUser();

      const {
        data:
          insertedAssignments,
        error:
          insertGiftError,
      } = await supabase
        .from(
          "character_gifts",
        )
        .insert(
          giftIdsToInsert.map(
            (giftId) => ({
              character_id:
                characterId,

              gift_id:
                giftId,

              acquisition_source:
                "ancestry",

              source_race_id:
                raceId,

              assigned_by:
                user?.id ??
                null,
            }),
          ),
        )
        .select(
          "id",
        );

      if (
        insertGiftError
      ) {
        return {
          ok: false,
          error:
            insertGiftError.message,
        };
      }

      insertedAssignmentIds =
        (
          insertedAssignments ??
          []
        ).map(
          (assignment) =>
            assignment.id,
        );
    }

    /*
     * Apply Health effects ONLY for genuinely
     * newly-added ownership rows.
     *
     * Existing selected feats must not have
     * their Health effects applied twice.
     */
    if (
      insertedAssignmentIds.length >
      0
    ) {
      try {
        for (
          const assignmentId of
          insertedAssignmentIds
        ) {
          await applyGiftOwnershipHealthEffects(
            assignmentId,
          );
        }
      } catch (
        giftHealthError
      ) {
        return {
          ok: false,
          error:
            giftHealthError instanceof
            Error
              ? giftHealthError.message
              : "Unable to apply new Gift Health effects.",
        };
      }
    }

    return {
      ok: true,
    };
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