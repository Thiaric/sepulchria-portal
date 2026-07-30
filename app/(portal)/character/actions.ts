"use server";

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

  const payload = {
    first_name: firstName,
    surname,

    pronouns:
      text(formData, "pronouns", 80) ||
      null,

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
      text(formData, "origin", 160) ||
      null,

    occupation:
      text(
        formData,
        "occupation",
        160,
      ) || null,

    title:
      text(formData, "title", 160) ||
      null,

    portrait_url:
      text(
        formData,
        "portrait_url",
        1000,
      ) || null,

    physical_description:
      text(
        formData,
        "physical_description",
        10000,
      ) || null,

    personality:
      text(
        formData,
        "personality",
        10000,
      ) || null,

    biography:
      text(
        formData,
        "biography",
        20000,
      ) || null,

    public_notes:
      text(
        formData,
        "public_notes",
        10000,
      ) || null,

    updated_at: new Date().toISOString(),
  };

  if (mode === "create") {
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
        "A race must be selected.",
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
        .select("id")
        .eq("id", raceId)
        .maybeSingle(),

      supabase
        .from("associations")
        .select("id")
        .eq("id", associationId)
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
        "The selected race is not valid.",
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
        "The selected Association is not valid.",
      );
    }

    if (existingCharacterResult.error) {
      redirectWithError(
        mode,
        existingCharacterResult.error.message,
      );
    }

    if (existingCharacterResult.data) {
      redirect("/character");
    }

    const {
      data: startingRoom,
      error: startingRoomError,
    } = await supabase
      .from("rooms")
      .select("id")
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
        "No starting room exists. Create at least one room before creating characters.",
      );
    }

    const { error } = await supabase
      .from("characters")
      .insert({
        ...payload,
        user_id: user.id,
        status: "draft",
        current_room_id:
          startingRoom.id,
        race_id: raceId,
        association_id:
          associationId,
      });

    if (error) {
      redirectWithError(
        mode,
        error.message,
      );
    }

    redirect("/character?created=true");
  }

  const {
    data: existingCharacter,
    error: existingCharacterError,
  } = await supabase
    .from("characters")
    .select("id")
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

  const { error } = await supabase
    .from("characters")
    .update(payload)
    .eq("id", existingCharacter.id)
    .eq("user_id", user.id);

  if (error) {
    redirectWithError(
      mode,
      error.message,
    );
  }

  redirect("/character?updated=true");
}