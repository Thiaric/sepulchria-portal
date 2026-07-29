"use server";
import { saveCharacter } from "../actions";
export async function updateCharacter(formData: FormData) { return saveCharacter(formData, "update"); }
