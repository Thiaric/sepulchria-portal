"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function createCharacter(formData: FormData) {
  const supabase = await createClient();

  const {
  data: { user },
} = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const firstName = String(formData.get("first_name") ?? "").trim();
  const surname = String(formData.get("surname") ?? "").trim();
  const pronouns = String(formData.get("pronouns") ?? "").trim();
  const dateOfBirth = String(formData.get("date_of_birth") ?? "").trim();
  const birthplace = String(formData.get("birthplace") ?? "").trim();
  const origin = String(formData.get("origin") ?? "").trim();
  const occupation = String(formData.get("occupation") ?? "").trim();
  const biography = String(formData.get("biography") ?? "").trim();

  if (!firstName || !surname) {
    redirect("/character/create?error=Name and surname are required");
  }

  const { error } = await supabase.from("characters").insert({
    user_id: user.id,
    first_name: firstName,
    surname,
    pronouns: pronouns || null,
    date_of_birth: dateOfBirth || null,
    birthplace: birthplace || null,
    origin: origin || null,
    occupation: occupation || null,
    biography: biography || null,
    status: "draft",
  });

  if (error) {
    if (error.code === "23505") {
      redirect("/character/create?error=You already have a character");
    }

    redirect(
      `/character/create?error=${encodeURIComponent(error.message)}`,
    );
  }

  redirect("/?character=created");
}