"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

type CharacterMode =
  | "create"
  | "update";

const text = (
  formData: FormData,
  name: string,
  max: number,
) =>
  String(formData.get(name) ?? "")
    .trim()
    .slice(0, max);

const ATTRIBUTE_NAMES = [
  "muscles",
  "reflexes",
  "vigor",
  "brains",
  "shrewd",
  "presence_score",
] as const;

type AttributeName =
  (typeof ATTRIBUTE_NAMES)[number];

function characterFormPath(
  mode: CharacterMode,
) {
  return `/character/${
    mode === "create"
      ? "create"
      : "edit"
  }`;
}

function redirectWithError(
  mode: CharacterMode,
  message: string,
): never {
  redirect(
    `${characterFormPath(
      mode,
    )}?error=${encodeURIComponent(
      message,
    )}`,
  );
}

function createPublicSlug(
  firstName: string,
  surname: string,
) {
  const baseSlug =
    `${firstName}-${surname}`
      .normalize("NFD")
      .replace(
        /[\u0300-\u036f]/g,
        "",
      )
      .toLowerCase()
      .replace(
        /[^a-z0-9]+/g,
        "-",
      )
      .replace(/^-+|-+$/g, "");

  const safeBase =
    baseSlug || "character";

  return `${safeBase}-${randomUUID().slice(
    0,
    8,
  )}`;
}

function validatePortraitUrl(
  portraitUrl: string,
  mode: CharacterMode,
) {
  if (!portraitUrl) {
    return;
  }

  if (
    portraitUrl.startsWith("/")
  ) {
    return;
  }

  try {
    const parsedUrl = new URL(
      portraitUrl,
    );

    if (
      parsedUrl.protocol !==
        "http:" &&
      parsedUrl.protocol !==
        "https:"
    ) {
      redirectWithError(
        mode,
        "Portrait URL must use http or https.",
      );
    }
  } catch {
    redirectWithError(
      mode,
      "Portrait URL is invalid.",
    );
  }
}

function readCreationAttributes(
  formData: FormData,
): Record<AttributeName, number> {
  const entries =
    ATTRIBUTE_NAMES.map((name) => {
      const raw = String(
        formData.get(name) ?? "",
      ).trim();

      const value = Number(raw);

      if (
        !Number.isInteger(value) ||
        value < 1 ||
        value > 8
      ) {
        throw new Error(
          `${name} must be a whole number between 1 and 8.`,
        );
      }

      return [
        name,
        value,
      ] as const;
    });

  const attributes =
    Object.fromEntries(
      entries,
    ) as Record<
      AttributeName,
      number
    >;

  const total =
    ATTRIBUTE_NAMES.reduce(
      (sum, name) =>
        sum + attributes[name],
      0,
    );

  if (total !== 20) {
    throw new Error(
      "Character attributes must total exactly 20 points.",
    );
  }

  return attributes;
}

function readAge(
  formData: FormData,
  mode: CharacterMode,
) {
  const raw = text(
    formData,
    "age",
    10,
  );

  const age = Number(raw);

  if (
    !raw ||
    !Number.isInteger(age) ||
    age < 0
  ) {
    redirectWithError(
      mode,
      "Choose a valid whole-number age.",
    );
  }

  return age;
}

function validateAgeRange(
  age: number,
  race: {
    name: string;
    min_age: number | null;
    max_age: number | null;
  },
  mode: CharacterMode,
) {
  if (race.min_age === null) {
    redirectWithError(
      mode,
      `The playable age range for ${race.name} has not been configured.`,
    );
  }

  if (age < race.min_age) {
    redirectWithError(
      mode,
      `${race.name} characters must be at least ${race.min_age} years old.`,
    );
  }

  if (
    race.max_age !== null &&
    age > race.max_age
  ) {
    redirectWithError(
      mode,
      `${race.name} characters may be no older than ${race.max_age} years.`,
    );
  }
}

export async function saveCharacterV2(
  formData: FormData,
  mode: CharacterMode,
) {
  const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const firstName = text(
    formData,
    "first_name",
    80,
  );

  const surname = text(
    formData,
    "surname",
    80,
  );

  if (!firstName || !surname) {
    redirectWithError(
      mode,
      "First name and surname are required.",
    );
  }

  const age = readAge(
    formData,
    mode,
  );

  const portraitUrl = text(
    formData,
    "portrait_url",
    1000,
  );

  validatePortraitUrl(
    portraitUrl,
    mode,
  );

  const physicalDescription =
    text(
      formData,
      "physical_description",
      10000,
    );

  const personality = text(
    formData,
    "personality",
    10000,
  );

  const biography = text(
    formData,
    "biography",
    20000,
  );

  if (!physicalDescription) {
    redirectWithError(
      mode,
      "Physical description is required.",
    );
  }

  if (!personality) {
    redirectWithError(
      mode,
      "Personality is required.",
    );
  }

  if (!biography) {
    redirectWithError(
      mode,
      "Biography is required.",
    );
  }

  const commonPayload = {
    first_name: firstName,
    surname,
    pronouns:
      text(
        formData,
        "pronouns",
        80,
      ) || null,
    age,

    // These values are system-owned.
    birthplace: "Sepulchria",
    title: "Citizen",

    // Origin is no longer a player field.
    origin: null,

    portrait_url:
      portraitUrl || null,
    physical_description:
      physicalDescription,
    personality,
    biography,
    public_notes:
      text(
        formData,
        "public_notes",
        10000,
      ) || null,
    updated_at:
      new Date().toISOString(),
  };

  if (mode === "create") {
    let attributes:
      Record<
        AttributeName,
        number
      >;

    try {
      attributes =
        readCreationAttributes(
          formData,
        );
    } catch (error) {
      redirectWithError(
        mode,
        error instanceof Error
          ? error.message
          : "The character attributes are invalid.",
      );
    }

    const raceId = text(
      formData,
      "race_id",
      100,
    );

    const associationId = text(
      formData,
      "association_id",
      100,
    );

    if (!raceId) {
      redirectWithError(
        mode,
        "An ancestry must be selected.",
      );
    }

    if (!associationId) {
      redirectWithError(
        mode,
        "An Association must be selected.",
      );
    }

    const [
      raceResult,
      associationResult,
      existingCharacterResult,
    ] = await Promise.all([
      supabase
        .from("races")
        .select(
          "id, name, min_age, max_age",
        )
        .eq("id", raceId)
        .eq("is_active", true)
        .eq(
          "is_selectable",
          true,
        )
        .maybeSingle(),

      supabase
        .from("associations")
        .select("id")
        .eq(
          "id",
          associationId,
        )
        .eq("is_active", true)
        .eq(
          "is_selectable",
          true,
        )
        .maybeSingle(),

      supabase
        .from("characters")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    if (raceResult.error) {
      redirectWithError(
        mode,
        raceResult.error.message,
      );
    }

    if (!raceResult.data) {
      redirectWithError(
        mode,
        "The selected ancestry is not currently available for character creation.",
      );
    }

    validateAgeRange(
      age,
      raceResult.data,
      mode,
    );

    if (
      associationResult.error
    ) {
      redirectWithError(
        mode,
        associationResult.error
          .message,
      );
    }

    if (
      !associationResult.data
    ) {
      redirectWithError(
        mode,
        "The selected Association is not currently available for character creation.",
      );
    }

    if (
      existingCharacterResult.error
    ) {
      redirectWithError(
        mode,
        existingCharacterResult.error
          .message,
      );
    }

    if (
      existingCharacterResult.data
    ) {
      redirect("/character");
    }

    const {
      data: startingRoom,
      error: startingRoomError,
    } = await supabase
      .from("rooms")
      .select("id")
      .eq("is_active", true)
      .order("sort_order", {
        ascending: true,
      })
      .order("created_at", {
        ascending: true,
      })
      .limit(1)
      .maybeSingle();

    if (startingRoomError) {
      redirectWithError(
        mode,
        startingRoomError.message,
      );
    }

    if (!startingRoom) {
      redirectWithError(
        mode,
        "No active starting room exists. Create at least one active room before creating characters.",
      );
    }

    const publicSlug =
      createPublicSlug(
        firstName,
        surname,
      );

    const { error } =
      await supabase
        .from("characters")
        .insert({
          ...commonPayload,
          user_id: user.id,
          public_slug: publicSlug,
          status: "draft",
          current_room_id:
            startingRoom.id,
          race_id: raceId,
          association_id:
            associationId,

          // Occupation will be owned
          // by the future Order system.
          occupation: null,

          // The old DOB is retained
          // only as a legacy column.
          date_of_birth: null,

          ...attributes,
          current_health:
            attributes.vigor * 10,
        });

    if (error) {
      redirectWithError(
        mode,
        error.message,
      );
    }

    redirect(
      "/character?created=true",
    );
  }

  const {
    data: existingCharacter,
    error: existingCharacterError,
  } = await supabase
    .from("characters")
    .select(
      "id, status, race_id",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingCharacterError) {
    redirectWithError(
      mode,
      existingCharacterError.message,
    );
  }

  if (!existingCharacter) {
    redirect(
      "/character/create",
    );
  }

  if (
    existingCharacter.status ===
    "submitted"
  ) {
    redirectWithError(
      mode,
      "Your character is currently awaiting staff review and cannot be edited.",
    );
  }

  if (
    existingCharacter.status ===
    "approved"
  ) {
    redirectWithError(
      mode,
      "Approved characters cannot be edited. Contact the staff if changes are required.",
    );
  }

  if (!existingCharacter.race_id) {
    redirectWithError(
      mode,
      "This character does not have an ancestry assigned.",
    );
  }

  const {
    data: existingRace,
    error: existingRaceError,
  } = await supabase
    .from("races")
    .select(
      "id, name, min_age, max_age",
    )
    .eq(
      "id",
      existingCharacter.race_id,
    )
    .maybeSingle();

  if (
    existingRaceError ||
    !existingRace
  ) {
    redirectWithError(
      mode,
      existingRaceError?.message ??
        "The character's ancestry could not be loaded.",
    );
  }

  validateAgeRange(
    age,
    existingRace,
    mode,
  );

  /*
   * Deliberately DO NOT include
   * occupation in this update.
   * Once Orders assign occupations,
   * ordinary profile edits must not
   * erase them.
   */
  const { error } =
    await supabase
      .from("characters")
      .update(commonPayload)
      .eq(
        "id",
        existingCharacter.id,
      )
      .eq("user_id", user.id);

  if (error) {
    redirectWithError(
      mode,
      error.message,
    );
  }

  redirect(
    "/character?updated=true",
  );
}
