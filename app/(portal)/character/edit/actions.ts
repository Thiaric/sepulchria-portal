"use server";

import { saveCharacterV2 } from "../save-character-v2";

export async function updateCharacter(
  formData: FormData,
) {
  return saveCharacterV2(
    formData,
    "update",
  );
}
