"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function updateCharacter(formData: FormData) {
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
  const portraitUrl = String(formData.get("portrait_url") ?? "").trim();

  if (!firstName || !surname) {
    redirect(
      "/character/edit?error=First name and surname are required",
    );
  }

  const { error } = await supabase
    .from("characters")
    .update({
      first_name: firstName,
      surname,
      pronouns: pronouns || null,
      date_of_birth: dateOfBirth || null,
      birthplace: birthplace || null,
      origin: origin || null,
      occupation: occupation || null,
      biography: biography || null,
      portrait_url: portraitUrl || null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);

  if (error) {
    redirect(
      `/character/edit?error=${encodeURIComponent(error.message)}`,
    );
  }

  redirect("/character?updated=true");
}