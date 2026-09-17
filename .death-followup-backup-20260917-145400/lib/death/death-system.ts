import "server-only";

import { randomInt } from "node:crypto";

import { createAdminClient } from "@/lib/supabase/admin";

export type DeathRules = {
  deathDurationHours: number;
  essenceWindowMinutes: number;
  autoReviveHealth: number;
  ghostChatEnabled: boolean;
  ghostMovementEnabled: boolean;
  deathAnnouncementTemplate: string;
};

const DEFAULT_ANNOUNCEMENT =
  "{character} is Dead. Their essence will cling to their body for the next {minutes} minutes. Items, Shapes and Feats that possess healing powers and can be used on others can still be used on them during this time to bring them back. After that only a Level IX Resurrection Shape can bring them back, or the Current must be allowed to work its way in time...";

export async function getDeathRules(): Promise<DeathRules> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("character_death_rules")
    .select(
      "death_duration_hours,essence_window_minutes,auto_revive_health,ghost_chat_enabled,ghost_movement_enabled,death_announcement_template",
    )
    .eq("singleton", true)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load Death rules: ${error.message}`);
  }

  return {
    deathDurationHours: Math.max(
      1,
      Math.floor(Number(data?.death_duration_hours ?? 24)),
    ),
    essenceWindowMinutes: Math.max(
      1,
      Math.floor(Number(data?.essence_window_minutes ?? 60)),
    ),
    autoReviveHealth: Math.max(
      1,
      Math.floor(Number(data?.auto_revive_health ?? 1)),
    ),
    ghostChatEnabled:
      data?.ghost_chat_enabled !== false,
    ghostMovementEnabled:
      data?.ghost_movement_enabled !== false,
    deathAnnouncementTemplate:
      String(data?.death_announcement_template ?? DEFAULT_ANNOUNCEMENT),
  };
}

async function characterState(characterId: string) {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("characters")
    .select(
      "id,display_name,current_room_id,current_health,life_state,zero_hp_at,died_at,dead_until",
    )
    .eq("id", characterId)
    .maybeSingle();

  if (error || !data) {
    throw new Error(
      error?.message ?? "Character not found.",
    );
  }

  return data;
}

function deathStartedAt(character: {
  died_at: string | null;
  zero_hp_at: string | null;
}) {
  return character.died_at ?? character.zero_hp_at;
}

export async function assertDeadTargetAllowed({
  targetCharacterId,
  healingCapable,
  resurrection,
  effectLabel,
}: {
  targetCharacterId: string;
  healingCapable: boolean;
  resurrection: boolean;
  effectLabel: string;
}) {
  const character =
    await characterState(targetCharacterId);

  if (character.life_state !== "dead") {
    return;
  }

  if (resurrection && healingCapable) {
    return;
  }

  if (!healingCapable) {
    throw new Error(
      `${effectLabel} cannot target a dead Character because it does not provide healing that can affect another Character.`,
    );
  }

  const rules = await getDeathRules();
  const diedAt = deathStartedAt(character);

  if (!diedAt) {
    throw new Error(
      "This dead Character has no valid death timestamp and cannot receive ordinary healing.",
    );
  }

  const essenceEnds =
    Date.parse(diedAt) +
    rules.essenceWindowMinutes * 60_000;

  if (
    Number.isNaN(essenceEnds) ||
    Date.now() > essenceEnds
  ) {
    throw new Error(
      `This Character's essence has faded. Ordinary healing can only return a dead Character during the first ${rules.essenceWindowMinutes} minutes after death. A Level IX Resurrection Shape is now required.`,
    );
  }
}

async function chooseRandomMalus() {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("death_resurrection_maluses")
    .select("id,name,description")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw new Error(
      `Unable to load Resurrection Maluses: ${error.message}`,
    );
  }

  if (!data?.length) {
    return null;
  }

  return data[randomInt(0, data.length)];
}

async function announceSystemMessage({
  roomId,
  characterId,
  message,
}: {
  roomId: string | null;
  characterId: string;
  message: string;
}) {
  if (!roomId) return;

  const admin = createAdminClient();

  const { error } = await admin
    .from("room_messages")
    .insert({
      room_id: roomId,
      character_id: characterId,
      message,
      message_type: "action",
      speaker_type: "system",
      client_nonce: crypto.randomUUID(),
    });

  if (error) {
    throw new Error(
      `Unable to post Death system message: ${error.message}`,
    );
  }
}

export async function finaliseCharacterDeath({
  characterId,
  deathEventId,
}: {
  characterId: string;
  deathEventId: string;
}) {
  const admin = createAdminClient();
  const rules = await getDeathRules();
  const character = await characterState(characterId);

  const now = new Date();
  const nowIso = now.toISOString();
  const deadUntil = new Date(
    now.getTime() +
      rules.deathDurationHours * 60 * 60 * 1000,
  ).toISOString();

  const { error: characterError } = await admin
    .from("characters")
    .update({
      current_health: 0,
      life_state: "dead",
      died_at: nowIso,
      dead_until: deadUntil,
      updated_at: nowIso,
    })
    .eq("id", characterId);

  if (characterError) {
    throw new Error(
      `Unable to mark Character dead: ${characterError.message}`,
    );
  }

  const { error: eventError } = await admin
    .from("character_death_events")
    .update({
      status: "dead",
      dead_until: deadUntil,
      resolved_at: nowIso,
    })
    .eq("id", deathEventId)
    .eq("character_id", characterId);

  if (eventError) {
    throw new Error(
      `Unable to resolve Death event: ${eventError.message}`,
    );
  }

  const announcement =
    rules.deathAnnouncementTemplate
      .replaceAll("{character}", character.display_name)
      .replaceAll(
        "{minutes}",
        String(rules.essenceWindowMinutes),
      );

  await announceSystemMessage({
    roomId: character.current_room_id,
    characterId,
    message: `◆ ${announcement}`,
  });

  return {
    diedAt: nowIso,
    deadUntil,
  };
}

export async function reviveDeadCharacter({
  characterId,
  source,
  forceBeyondEssence,
  healthAfterRevival,
  actorUserId = null,
}: {
  characterId: string;
  source:
    | "healing_effect"
    | "item"
    | "feat"
    | "shape"
    | "resurrection_shape"
    | "natural"
    | "admin";
  forceBeyondEssence: boolean;
  healthAfterRevival?: number | null;
  actorUserId?: string | null;
}): Promise<{
  revived: boolean;
  currentHealth: number | null;
  delayed: boolean;
  malus:
    | {
        id: string;
        name: string;
        description: string;
      }
    | null;
}> {
  const admin = createAdminClient();
  const character = await characterState(characterId);

  if (character.life_state !== "dead") {
    return {
      revived: false,
      currentHealth: character.current_health,
      delayed: false,
      malus: null,
    };
  }

  const rules = await getDeathRules();
  const diedAt = deathStartedAt(character);

  if (!diedAt) {
    throw new Error(
      "This Character has no valid death timestamp.",
    );
  }

  const elapsedMs = Date.now() - Date.parse(diedAt);
  const essenceMs =
    rules.essenceWindowMinutes * 60_000;
  const delayed =
    !Number.isNaN(elapsedMs) &&
    elapsedMs > essenceMs;

  if (delayed && !forceBeyondEssence) {
    throw new Error(
      `This Character's essence has faded. Only a Level IX Resurrection Shape, staff intervention, or the Current's natural return may restore them now.`,
    );
  }

  const revivedHealth = Math.max(
    1,
    Math.floor(
      Number(
        healthAfterRevival ??
          (
            Number(character.current_health ?? 0) > 0
              ? character.current_health
              : rules.autoReviveHealth
          ),
      ),
    ),
  );

  const now = new Date().toISOString();

  const { error: updateError } = await admin
    .from("characters")
    .update({
      current_health: revivedHealth,
      life_state: "alive",
      zero_hp_at: null,
      died_at: null,
      dead_until: null,
      updated_at: now,
    })
    .eq("id", characterId)
    .eq("life_state", "dead");

  if (updateError) {
    throw new Error(
      `Unable to resurrect Character: ${updateError.message}`,
    );
  }

  const { data: deathEvent } = await admin
    .from("character_death_events")
    .select("id")
    .eq("character_id", characterId)
    .eq("status", "dead")
    .order("triggered_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (deathEvent) {
    const { error: deathEventError } = await admin
      .from("character_death_events")
      .update({
        status: "revived",
        resolved_at: now,
        revived_at: now,
        revival_source: source,
      })
      .eq("id", deathEvent.id);

    if (deathEventError) {
      throw new Error(
        `Unable to update Death event: ${deathEventError.message}`,
      );
    }
  }

  let malus:
    | {
        id: string;
        name: string;
        description: string;
      }
    | null = null;

  if (delayed) {
    malus = await chooseRandomMalus();

    if (malus) {
      await admin
        .from("character_resurrection_maluses")
        .update({
          cleared_at: now,
          changed_by_user_id: actorUserId,
        })
        .eq("character_id", characterId)
        .is("cleared_at", null);

      const { error: malusError } = await admin
        .from("character_resurrection_maluses")
        .insert({
          character_id: characterId,
          death_event_id: deathEvent?.id ?? null,
          malus_id: malus.id,
          narrative_text: malus.description,
          changed_by_user_id: actorUserId,
        });

      if (malusError) {
        throw new Error(
          `Unable to apply Resurrection Malus: ${malusError.message}`,
        );
      }
    }
  }

  const malusText = malus
    ? ` The journey beyond their lingering essence has left its mark: ${malus.name} — ${malus.description}`
    : "";

  await announceSystemMessage({
    roomId: character.current_room_id,
    characterId,
    message:
      `◆ ${character.display_name} draws breath once more. ` +
      `The Current has returned them to the living.${malusText}`,
  });

  return {
    revived: true,
    currentHealth: revivedHealth,
    delayed,
    malus,
  };
}

export async function reconcileExpiredCharacterDeath(
  characterId: string,
) {
  const character = await characterState(characterId);

  if (
    character.life_state !== "dead" ||
    !character.dead_until
  ) {
    return {
      revived: false,
      currentHealth: character.current_health,
    };
  }

  const expiry = Date.parse(character.dead_until);

  if (
    Number.isNaN(expiry) ||
    expiry > Date.now()
  ) {
    return {
      revived: false,
      currentHealth: character.current_health,
    };
  }

  return reviveDeadCharacter({
    characterId,
    source: "natural",
    forceBeyondEssence: true,
  });
}

export async function assertGhostChatAllowed(
  characterId: string,
  roomId: string,
) {
  const character = await characterState(characterId);

  if (character.life_state !== "dead") {
    return;
  }

  const rules = await getDeathRules();

  if (!rules.ghostChatEnabled) {
    throw new Error(
      "Ghost location chat is currently disabled.",
    );
  }

  const admin = createAdminClient();
  const { data: room, error } = await admin
    .from("rooms")
    .select("allow_dead_ghosts")
    .eq("id", roomId)
    .maybeSingle();

  if (error || !room?.allow_dead_ghosts) {
    throw new Error(
      "Ghosts cannot speak in this Location.",
    );
  }
}

export async function assertGhostMovementAllowed(
  characterId: string,
  destinationRoomId: string,
) {
  const character = await characterState(characterId);

  if (character.life_state !== "dead") {
    return;
  }

  const rules = await getDeathRules();

  if (!rules.ghostMovementEnabled) {
    throw new Error(
      "Ghost movement is currently disabled.",
    );
  }

  const admin = createAdminClient();
  const { data: room, error } = await admin
    .from("rooms")
    .select("allow_dead_ghosts,is_active")
    .eq("id", destinationRoomId)
    .maybeSingle();

  if (
    error ||
    !room ||
    !room.is_active ||
    !room.allow_dead_ghosts
  ) {
    throw new Error(
      "Ghosts cannot enter this Location.",
    );
  }
}
