"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

type CharacterMode = "create" | "update";

const STANDARD_BASE_ATTRIBUTES = {
  muscles: 3,
  reflexes: 3,
  vigor: 3,
  brains: 3,
  shrewd: 3,
  presence_score: 3,
} as const;

const text = (
  formData: FormData,
  name: string,
  max: number,
) =>
  String(formData.get(name) ?? "")
    .trim()
    .slice(0, max);

function path(mode: CharacterMode) {
  return `/character/${
    mode === "create"
      ? "create"
      : "edit"
  }`;
}

function fail(
  mode: CharacterMode,
  message: string,
): never {
  redirect(
    `${path(
      mode,
    )}?error=${encodeURIComponent(
      message,
    )}`,
  );
}

function slug(
  first: string,
  surname: string,
) {
  const base =
    `${first}-${surname}`
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
      .replace(
        /^-+|-+$/g,
        "",
      );

  return `${
    base || "character"
  }-${randomUUID().slice(
    0,
    8,
  )}`;
}

function validAge(
  age: number,
  race: {
    name: string;
    min_age: number | null;
    max_age: number | null;
  },
  mode: CharacterMode,
) {
  if (race.min_age === null) {
    fail(
      mode,
      `The playable age range for ${race.name} has not been configured.`,
    );
  }

  if (age < race.min_age) {
    fail(
      mode,
      `${race.name} characters must be at least ${race.min_age} years old.`,
    );
  }

  if (
    race.max_age !== null &&
    age > race.max_age
  ) {
    fail(
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
    fail(
      mode,
      "First name and surname are required.",
    );
  }

  const age = Number(
    text(
      formData,
      "age",
      10,
    ),
  );

  if (
    !Number.isInteger(age) ||
    age < 0
  ) {
    fail(
      mode,
      "Choose a valid whole-number age.",
    );
  }

  const portraitUrl = text(
    formData,
    "portrait_url",
    1000,
  );

  if (
    portraitUrl &&
    !portraitUrl.startsWith("/")
  ) {
    try {
      const parsed =
        new URL(portraitUrl);

      if (
        ![
          "http:",
          "https:",
        ].includes(
          parsed.protocol,
        )
      ) {
        fail(
          mode,
          "Portrait URL must use http or https.",
        );
      }
    } catch {
      fail(
        mode,
        "Portrait URL is invalid.",
      );
    }
  }

  const physical = text(
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

  if (!physical) {
    fail(
      mode,
      "Physical description is required.",
    );
  }

  if (!personality) {
    fail(
      mode,
      "Personality is required.",
    );
  }

  if (!biography) {
    fail(
      mode,
      "Biography is required.",
    );
  }

  const common = {
    first_name: firstName,
    surname,

    pronouns:
      text(
        formData,
        "pronouns",
        80,
      ) || null,

    gender:
      text(
        formData,
        "gender",
        40,
      ) || null,

    sexual_orientation:
      text(
        formData,
        "sexual_orientation",
        120,
      ) || null,

    age,

    birthplace: "Sepulchria",
    title: "Citizen",
    origin: null,

    portrait_url:
      portraitUrl || null,

    music_url:
      text(
        formData,
        "music_url",
        1000,
      ) || null,

    physical_description:
      physical,

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
    const raceId = text(
      formData,
      "race_id",
      100,
    );

    if (!raceId) {
      fail(
        mode,
        "An ancestry must be selected.",
      );
    }

    const [
      raceResult,
      existingResult,
    ] = await Promise.all([
      supabase
        .from("races")
        .select(
          "id, name, min_age, max_age",
        )
        .eq(
          "id",
          raceId,
        )
        .eq(
          "is_active",
          true,
        )
        .eq(
          "is_selectable",
          true,
        )
        .maybeSingle(),

      supabase
        .from("characters")
        .select("id")
        .eq(
          "user_id",
          user.id,
        )
        .maybeSingle(),
    ]);

    if (raceResult.error) {
      fail(
        mode,
        raceResult.error.message,
      );
    }

    if (!raceResult.data) {
      fail(
        mode,
        "The selected ancestry is not currently available for character creation.",
      );
    }

    validAge(
      age,
      raceResult.data,
      mode,
    );

    if (existingResult.error) {
      fail(
        mode,
        existingResult.error.message,
      );
    }

    if (existingResult.data) {
      redirect("/character");
    }

    const {
      data: startingRoom,
      error: roomError,
    } = await supabase
      .from("rooms")
      .select("id")
      .eq(
        "is_active",
        true,
      )
      .order(
        "sort_order",
        {
          ascending: true,
        },
      )
      .order(
        "created_at",
        {
          ascending: true,
        },
      )
      .limit(1)
      .maybeSingle();

    if (roomError) {
      fail(
        mode,
        roomError.message,
      );
    }

    if (!startingRoom) {
      fail(
        mode,
        "No active starting room exists.",
      );
    }

    const { error } =
      await supabase
        .from("characters")
        .insert({
          ...common,

          user_id: user.id,

          public_slug:
            slug(
              firstName,
              surname,
            ),

          status: "draft",

          current_room_id:
            startingRoom.id,

          race_id: raceId,

          /*
           * Association is derived from
           * Order membership later.
           */
          association_id: null,

          date_of_birth: null,

          /*
           * New characters ALWAYS begin
           * with the standard 18-point
           * base spread. Submitted HTML
           * values are deliberately
           * ignored here.
           */
          ...STANDARD_BASE_ATTRIBUTES,

          current_health:
            STANDARD_BASE_ATTRIBUTES.vigor *
            10,
        });

    if (error) {
      fail(
        mode,
        error.message,
      );
    }

    redirect(
      "/character?created=true",
    );
  }

  const {
    data: existing,
    error: existingError,
  } = await supabase
    .from("characters")
    .select(
      "id, status, race_id",
    )
    .eq(
      "user_id",
      user.id,
    )
    .maybeSingle();

  if (existingError) {
    fail(
      mode,
      existingError.message,
    );
  }

  if (!existing) {
    redirect(
      "/character/create",
    );
  }

  if (
    existing.status ===
    "submitted"
  ) {
    fail(
      mode,
      "Your character is currently awaiting staff review and cannot be edited.",
    );
  }

  if (
    existing.status ===
    "approved"
  ) {
    fail(
      mode,
      "Approved characters cannot be edited. Contact the staff if changes are required.",
    );
  }

  if (!existing.race_id) {
    fail(
      mode,
      "This character does not have an ancestry assigned.",
    );
  }

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
      existing.race_id,
    )
    .maybeSingle();

  if (
    raceError ||
    !race
  ) {
    fail(
      mode,
      raceError?.message ??
        "The character's ancestry could not be loaded.",
    );
  }

  validAge(
    age,
    race,
    mode,
  );

  /*
   * Player edit deliberately does NOT
   * include any base Attribute columns.
   * Existing base values therefore
   * remain untouched.
   */
  const { error } =
    await supabase
      .from("characters")
      .update(common)
      .eq(
        "id",
        existing.id,
      )
      .eq(
        "user_id",
        user.id,
      );

  if (error) {
    fail(
      mode,
      error.message,
    );
  }

  redirect(
    "/character?updated=true",
  );
}
