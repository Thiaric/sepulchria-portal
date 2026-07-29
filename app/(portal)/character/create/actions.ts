"use server";
import { saveCharacter } from "../actions";
export async function createCharacter(formData: FormData) { return saveCharacter(formData, "create"); }
