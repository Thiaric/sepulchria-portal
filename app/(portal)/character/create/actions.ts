"use server";

import { saveCharacterV2 } from "../save-character-v2";

export async function createCharacter(
  formData: FormData,
) {
  return saveCharacterV2(
    formData,
    "create",
  );
}
