"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

type CharacterMode = "create" | "update";

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

function readCreationAttributes(
  formData: FormData,
): Record<AttributeName, number> {
  const STANDARD_BASE_VALUE = 3;

  const entries = ATTRIBUTE_NAMES.map(
    (name) => {
      const raw = String(
        formData.get(name) ?? "",
      ).trim();

      const value = Number(raw);

      if (
        !Number.isInteger(value) ||
        value !== STANDARD_BASE_VALUE
      ) {
        throw new Error(
          `${name} must start at ${STANDARD_BASE_VALUE}.`,
        );
      }

      return [
        name,
        STANDARD_BASE_VALUE,
      ] as const;
    },
  );

  return Object.fromEntries(
    entries,
  ) as Record<
    AttributeName,
    number
  >;
}

function characterFormPath(
  mode: CharacterMode,
) {
  return `/character/${
    mode === "create" ? "create" : "edit"
  }`;
}

function redirectWithError(
  mode: CharacterMode,
  message: string,
): never {
  redirect(
    `${characterFormPath(
      mode,
    )}?error=${encodeURIComponent(message)}`,
  );
}

function redirectCharacterError(
  message: string,
): never {
  redirect(
    `/character?error=${encodeURIComponent(
      message,
    )}`,
  );
}

function createPublicSlug(
  firstName: string,
  surname: string,
) {
  const baseSlug = `${firstName}-${surname}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
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

  /*
   * Local images from /public are valid:
   * /portraits/example.png
   */
  if (portraitUrl.startsWith("/")) {
    return;
  }

  try {
    const parsedUrl = new URL(
      portraitUrl,
    );

    if (
      parsedUrl.protocol !== "http:" &&
      parsedUrl.protocol !== "https:"
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

function validateMusicUrl(
  musicUrl: string,
  mode: CharacterMode,
) {
  if (!musicUrl) {
    return;
  }

  try {
    const parsedUrl =
      new URL(musicUrl);

    if (
      parsedUrl.protocol !== "http:" &&
      parsedUrl.protocol !== "https:"
    ) {
      redirectWithError(
        mode,
        "Character music URL must use http or https.",
      );
    }
  } catch {
    redirectWithError(
      mode,
      "Character music URL is invalid.",
    );
  }
}

async function ensureFirstNameAvailable(
  supabase: Awaited<ReturnType<typeof createClient>>,
  firstName: string,
  mode: CharacterMode,
  excludeCharacterId?: string,
) {
  let query = supabase
    .from("characters")
    .select("id")
    .ilike("first_name", firstName);

  if (excludeCharacterId) {
    query = query.neq(
      "id",
      excludeCharacterId,
    );
  }

  const {
    data: existingName,
    error,
  } = await query.limit(1).maybeSingle();

  if (error) {
    redirectWithError(
      mode,
      error.message,
    );
  }

  if (existingName) {
    redirectWithError(
      mode,
      "That first name is already in use. Please choose another.",
    );
  }
}

export async function saveCharacter(
  formData: FormData,
  mode: CharacterMode,
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

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

  const portraitUrl = text(
    formData,
    "portrait_url",
    1000,
  );

  validatePortraitUrl(
    portraitUrl,
    mode,
  );

  const musicUrl = text(
    formData,
    "music_url",
    2000,
  );

  validateMusicUrl(
    musicUrl,
    mode,
  );

  const physicalDescription = text(
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

  const gender = text(
  formData,
  "gender",
  20,
);

if (
  ![
    "male",
    "female",
    "non_binary",
  ].includes(gender)
) {
  redirectWithError(
    mode,
    "A valid gender must be selected.",
  );
}

  const payload = {
    first_name: firstName,
    surname,

    pronouns:
      text(
        formData,
        "pronouns",
        80,
      ) || null,

    date_of_birth:
      text(
        formData,
        "date_of_birth",
        20,
      ) || null,

    birthplace:
      text(
        formData,
        "birthplace",
        160,
      ) || null,

    origin:
      text(
        formData,
        "origin",
        160,
      ) || null,

    occupation:
      text(
        formData,
        "occupation",
        160,
      ) || null,

    title:
      text(
        formData,
        "title",
        160,
      ) || null,

    portrait_url:
      portraitUrl || null,

    music_url:
      musicUrl || null,

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

    ...(mode === "update"
      ? {
          offgame:
            text(
              formData,
              "offgame",
              10000,
            ) || null,
        }
      : {}),

      gender,

sexual_orientation:
  text(
    formData,
    "sexual_orientation",
    120,
  ) || null,

    updated_at:
      new Date().toISOString(),
  };

  if (mode === "create") {
    let attributes:
      | Record<AttributeName, number>;

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

    await ensureFirstNameAvailable(
      supabase,
      firstName,
      mode,
    );

    const [
      raceResult,
      associationResult,
      existingCharacterResult,
    ] = await Promise.all([
      supabase
  .from("races")
  .select(
    "id, vigour_modifier",
  )
        .eq("id", raceId)
        .eq("is_active", true)
        .eq("is_selectable", true)
        .maybeSingle(),

      supabase
        .from("associations")
        .select("id")
        .eq(
          "id",
          associationId,
        )
        .eq("is_active", true)
        .eq("is_selectable", true)
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

    if (associationResult.error) {
      redirectWithError(
        mode,
        associationResult.error.message,
      );
    }

    if (!associationResult.data) {
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
        existingCharacterResult.error.message,
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

    const { error } = await supabase
      .from("characters")
      .insert({
        ...payload,
        user_id: user.id,
        public_slug: publicSlug,
        status: "draft",
        current_room_id:
          startingRoom.id,
        race_id: raceId,
        association_id:
          associationId,
        ...attributes,
        current_health:
  (
    attributes.vigor +
    (
      raceResult.data
        ?.vigour_modifier ?? 0
    )
  ) * 10,
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
    .select("id, status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingCharacterError) {
    redirectWithError(
      mode,
      existingCharacterError.message,
    );
  }

  if (!existingCharacter) {
    redirect("/character/create");
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

  await ensureFirstNameAvailable(
    supabase,
    firstName,
    mode,
    existingCharacter.id,
  );

  const { error } = await supabase
    .from("characters")
    .update(payload)
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

export async function updateApprovedCharacterProfile(
  formData: FormData,
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const portraitUrl = text(formData, "portrait_url", 1000);
  validatePortraitUrl(portraitUrl, "update");

  const musicUrl = text(
    formData,
    "music_url",
    2000,
  );
  validateMusicUrl(
    musicUrl,
    "update",
  );

  const physicalDescription = text(
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
  const publicNotes = text(
    formData,
    "public_notes",
    10000,
  );

  const offgame = text(
    formData,
    "offgame",
    10000,
  );

  const sexualOrientation =
  text(
    formData,
    "sexual_orientation",
    120,
  );

  const showLastActivity =
    formData.get("show_last_activity") === "true";

  if (!physicalDescription) {
    redirectCharacterError(
      "Physical description is required.",
    );
  }

  if (!personality) {
    redirectCharacterError(
      "Personality is required.",
    );
  }

  if (!biography) {
    redirectCharacterError(
      "Biography is required.",
    );
  }

  const {
    data: character,
    error: characterError,
  } = await supabase
    .from("characters")
    .select("id, status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (characterError || !character) {
    redirectCharacterError(
      characterError?.message ??
        "Character not found.",
    );
  }

  if (character.status !== "approved") {
    redirectCharacterError(
      "This profile editor is only available after character approval.",
    );
  }

  const { error } = await supabase
  .from("characters")
  .update({
    portrait_url: portraitUrl || null,
    music_url: musicUrl || null,

    sexual_orientation:
      sexualOrientation || null,

    physical_description:
      physicalDescription,

    personality,
    biography,

    public_notes:
      publicNotes || null,

    offgame:
      offgame || null,

    show_last_activity:
      showLastActivity,

    updated_at:
      new Date().toISOString(),
  })
    .eq("id", character.id)
    .eq("user_id", user.id)
    .eq("status", "approved")
      .eq("is_system", false);

  if (error) {
    redirectCharacterError(error.message);
  }

  redirect("/character?updated=true");
}

export async function submitCharacterForReview() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const {
    data: character,
    error: characterError,
  } = await supabase
    .from("characters")
    .select(`
  id,
  status,
  first_name,
  surname,
  gender,
  race_id,
  physical_description,
      personality,
      biography,
      muscles,
      reflexes,
      vigor,
      brains,
      shrewd,
      presence_score,
      submitted_at,
      rejection_reason
    `)
    .eq("user_id", user.id)
    .maybeSingle();

  if (characterError) {
    redirectCharacterError(
      characterError.message,
    );
  }

  if (!character) {
    redirect("/character/create");
  }

  if (
    character.status === "submitted"
  ) {
    redirectCharacterError(
      "Your character has already been submitted for review.",
    );
  }

  if (
    character.status === "approved"
  ) {
    redirectCharacterError(
      "Your character has already been approved.",
    );
  }

  if (
    character.status !== "draft" &&
    character.status !== "rejected"
  ) {
    redirectCharacterError(
      "This character cannot currently be submitted for review.",
    );
  }

  const missingFields: string[] = [];

  if (
    !character.first_name?.trim()
  ) {
    missingFields.push(
      "first name",
    );
  }

  if (!character.surname?.trim()) {
    missingFields.push("surname");
  }

  if (
  !character.gender ||
  ![
    "male",
    "female",
    "non_binary",
  ].includes(character.gender)
) {
  missingFields.push("gender");
}

  if (!character.race_id) {
    missingFields.push("race");
  }

  

  if (
    !character.physical_description?.trim()
  ) {
    missingFields.push(
      "physical description",
    );
  }

  if (
    !character.personality?.trim()
  ) {
    missingFields.push(
      "personality",
    );
  }

  if (
    !character.biography?.trim()
  ) {
    missingFields.push(
      "biography",
    );
  }

  const attributeValues = [
  character.muscles,
  character.reflexes,
  character.vigor,
  character.brains,
  character.shrewd,
  character.presence_score,
];

const attributesValid =
  attributeValues.every(
    (value) =>
      Number.isInteger(value) &&
      value !== null &&
      value >= 1 &&
      value <= 8,
  );

if (!attributesValid) {
  missingFields.push(
    "a complete base attribute record",
  );
}

  if (missingFields.length > 0) {
    redirectCharacterError(
      `Complete the following fields before submitting: ${missingFields.join(
        ", ",
      )}.`,
    );
  }

  const submittedAt =
    new Date().toISOString();

  const {
    data: submittedCharacter,
    error: submitError,
  } = await supabase
    .from("characters")
    .update({
      status: "submitted",
      submitted_at: submittedAt,
      rejection_reason: null,
      updated_at: submittedAt,
    })
    .eq("id", character.id)
    .eq("user_id", user.id)
    .in("status", [
      "draft",
      "rejected",
    ])
    .select("id")
    .maybeSingle();

  if (submitError) {
    redirectCharacterError(
      submitError.message,
    );
  }

  if (!submittedCharacter) {
    redirectCharacterError(
      "The character could not be submitted because its status has already changed. Refresh the page and try again.",
    );
  }

  const { error: historyError } =
    await supabase
      .from("character_status_history")
      .insert({
        character_id: character.id,
        old_status: character.status,
        new_status: "submitted",
        changed_by: user.id,
        reason: null,
      });

  if (historyError) {
    await supabase
      .from("characters")
      .update({
        status: character.status,
        submitted_at: character.submitted_at,
        rejection_reason: character.rejection_reason,
        updated_at: new Date().toISOString(),
      })
      .eq("id", character.id)
      .eq("user_id", user.id);

    redirectCharacterError(
      `The character could not be submitted because the status history could not be recorded: ${historyError.message}`,
    );
  }

  redirect(
    "/character?submitted=true",
  );
}

export async function markApprovalNoticeSeen() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  await supabase
    .from("characters")
    .update({
      approval_notice_seen_at:
        new Date().toISOString(),
    })
    .eq("user_id", user.id)
    .eq("status", "approved")
      .eq("is_system", false)
    .is("approval_notice_seen_at", null);
}