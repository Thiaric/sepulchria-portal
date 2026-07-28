"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

const text = (
  formData: FormData,
  name: string,
  max: number,
) =>
  String(formData.get(name) ?? "")
    .trim()
    .slice(0, max);

export async function saveCharacter(
  formData: FormData,
  mode: "create" | "update",
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
    redirect(
      `/character/${
        mode === "create" ? "create" : "edit"
      }?error=${encodeURIComponent(
        "First name and surname are required",
      )}`,
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
    faction:
      text(formData, "faction", 160) ||
      null,
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
      redirect(
        `/character/create?error=${encodeURIComponent(
          startingRoomError.message,
        )}`,
      );
    }

    if (!startingRoom) {
      redirect(
        `/character/create?error=${encodeURIComponent(
          "No starting room exists. Create at least one room before creating characters.",
        )}`,
      );
    }

    const { error } = await supabase
      .from("characters")
      .insert({
        ...payload,
        user_id: user.id,
        status: "draft",
        current_room_id: startingRoom.id,
      });

    if (error) {
      redirect(
        `/character/create?error=${encodeURIComponent(
          error.message,
        )}`,
      );
    }

    redirect("/?character=created");
  }

  const { error } = await supabase
    .from("characters")
    .update(payload)
    .eq("user_id", user.id);

  if (error) {
    redirect(
      `/character/edit?error=${encodeURIComponent(
        error.message,
      )}`,
    );
  }

  redirect("/character?updated=true");
}