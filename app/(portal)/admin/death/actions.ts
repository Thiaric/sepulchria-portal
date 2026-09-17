"use server";

import { revalidatePath } from "next/cache";

import {
  requireAdminSection,
} from "@/lib/auth/require-staff";
import {
  createAdminClient,
} from "@/lib/supabase/admin";
import {
  reviveDeadCharacter,
} from "@/lib/death/death-system";

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function integer(
  formData: FormData,
  name: string,
  fallback: number,
) {
  const value = Number.parseInt(text(formData, name), 10);
  return Number.isFinite(value) ? value : fallback;
}

function checked(formData: FormData, name: string) {
  return formData.get(name) === "on";
}

async function staff() {
  const session = await requireAdminSection("death");

  if (
    !["owner", "admin", "master"].includes(
      session.role,
    )
  ) {
    throw new Error(
      "Only Owners, Admins and Masters may manage Death.",
    );
  }

  return session;
}

export async function updateDeathRules(
  formData: FormData,
) {
  await staff();
  const admin = createAdminClient();

  const deathDurationHours = Math.max(
    1,
    integer(formData, "death_duration_hours", 24),
  );
  const essenceWindowMinutes = Math.max(
    1,
    integer(formData, "essence_window_minutes", 60),
  );
  const autoReviveHealth = Math.max(
    1,
    integer(formData, "auto_revive_health", 1),
  );

  const template =
    text(formData, "death_announcement_template");

  const { error } = await admin
    .from("character_death_rules")
    .upsert(
      {
        singleton: true,
        death_duration_hours: deathDurationHours,
        essence_window_minutes: essenceWindowMinutes,
        auto_revive_health: autoReviveHealth,
        ghost_chat_enabled:
          checked(formData, "ghost_chat_enabled"),
        ghost_movement_enabled:
          checked(formData, "ghost_movement_enabled"),
        death_announcement_template:
          template ||
          "{character} is Dead. Their essence will cling to their body for the next {minutes} minutes. Items, Shapes and Feats that possess healing powers and can be used on others can still be used on them during this time to bring them back. After that only a Level IX Resurrection Shape can bring them back, or the Current must be allowed to work its way in time...",
      },
      { onConflict: "singleton" },
    );

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/death");
}

export async function toggleGhostRoom(
  formData: FormData,
) {
  await staff();

  const roomId = text(formData, "room_id");
  if (!roomId) throw new Error("Missing Location.");

  const admin = createAdminClient();

  const { error } = await admin
    .from("rooms")
    .update({
      allow_dead_ghosts:
        checked(formData, "allow_dead_ghosts"),
    })
    .eq("id", roomId);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/death");
  revalidatePath("/game");
}

export async function resurrectCharacter(
  formData: FormData,
) {
  const session = await staff();

  const characterId =
    text(formData, "character_id");

  if (!characterId) {
    throw new Error("Missing Character.");
  }

  const health = Math.max(
    1,
    integer(formData, "health", 1),
  );

  await reviveDeadCharacter({
    characterId,
    source: "admin",
    forceBeyondEssence: true,
    healthAfterRevival: health,
    actorUserId: session.userId,
  });

  revalidatePath("/admin/death");
  revalidatePath("/game");
  revalidatePath("/character");
  revalidatePath("/characters");
}

export async function setDeadUntil(
  formData: FormData,
) {
  await staff();

  const characterId =
    text(formData, "character_id");
  const deadUntilRaw =
    text(formData, "dead_until");

  if (!characterId || !deadUntilRaw) {
    throw new Error(
      "Character and return date/time are required.",
    );
  }

  const date = new Date(deadUntilRaw);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid return date/time.");
  }

  const admin = createAdminClient();
  const iso = date.toISOString();

  const { error } = await admin
    .from("characters")
    .update({
      dead_until: iso,
      updated_at: new Date().toISOString(),
    })
    .eq("id", characterId)
    .eq("life_state", "dead");

  if (error) throw new Error(error.message);

  await admin
    .from("character_death_events")
    .update({ dead_until: iso })
    .eq("character_id", characterId)
    .eq("status", "dead");

  revalidatePath("/admin/death");
}

export async function createResurrectionMalus(
  formData: FormData,
) {
  await staff();

  const name = text(formData, "name");
  const description =
    text(formData, "description");

  if (!name || !description) {
    throw new Error(
      "Malus name and description are required.",
    );
  }

  const admin = createAdminClient();

  const { data: last } = await admin
    .from("death_resurrection_maluses")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await admin
    .from("death_resurrection_maluses")
    .insert({
      name,
      description,
      is_active: true,
      sort_order:
        Number(last?.sort_order ?? 0) + 10,
    });

  if (error) throw new Error(error.message);

  revalidatePath("/admin/death");
}

export async function updateResurrectionMalus(
  formData: FormData,
) {
  await staff();

  const id = text(formData, "malus_id");
  const name = text(formData, "name");
  const description =
    text(formData, "description");

  if (!id || !name || !description) {
    throw new Error(
      "Malus id, name and description are required.",
    );
  }

  const admin = createAdminClient();

  const { error } = await admin
    .from("death_resurrection_maluses")
    .update({
      name,
      description,
      is_active: checked(formData, "is_active"),
      sort_order: integer(
        formData,
        "sort_order",
        0,
      ),
    })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/death");
}

export async function setCharacterResurrectionMalus(
  formData: FormData,
) {
  const session = await staff();

  const characterId =
    text(formData, "character_id");
  const malusId =
    text(formData, "malus_id");

  if (!characterId) {
    throw new Error("Missing Character.");
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();

  await admin
    .from("character_resurrection_maluses")
    .update({
      cleared_at: now,
      changed_by_user_id: session.userId,
    })
    .eq("character_id", characterId)
    .is("cleared_at", null);

  if (!malusId) {
    revalidatePath("/admin/death");
    return;
  }

  const { data: malus, error: malusError } =
    await admin
      .from("death_resurrection_maluses")
      .select("id,description")
      .eq("id", malusId)
      .maybeSingle();

  if (malusError || !malus) {
    throw new Error(
      malusError?.message ??
        "Resurrection Malus not found.",
    );
  }

  const { data: deathEvent } = await admin
    .from("character_death_events")
    .select("id")
    .eq("character_id", characterId)
    .eq("status", "revived")
    .order("resolved_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await admin
    .from("character_resurrection_maluses")
    .insert({
      character_id: characterId,
      death_event_id: deathEvent?.id ?? null,
      malus_id: malus.id,
      narrative_text: malus.description,
      changed_by_user_id: session.userId,
    });

  if (error) throw new Error(error.message);

  revalidatePath("/admin/death");
}
