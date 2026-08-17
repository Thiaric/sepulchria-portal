import "server-only";

import {
  createClient as createAdminClient,
} from "@supabase/supabase-js";

import {
  adjustHealthForVigourModifier,
} from "@/lib/characters/adjust-health-for-vigour-modifier";

function adminClient() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const secret =
    process.env.SUPABASE_SECRET_KEY;

  if (!url || !secret) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY.",
    );
  }

  return createAdminClient(
    url,
    secret,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}

type GiftRelation = {
  effect_mode:
    | "none"
    | "passive"
    | "temporary";
  vigour_modifier: number;
};

function one<T>(
  value: T | T[] | null,
): T | null {
  return Array.isArray(value)
    ? value[0] ?? null
    : value;
}

async function moveHealth({
  characterId,
  oldModifier,
  newModifier,
}: {
  characterId: string;
  oldModifier: number;
  newModifier: number;
}) {
  if (
    oldModifier === newModifier
  ) {
    return;
  }

  const admin = adminClient();

  const {
    data: character,
    error,
  } = await admin
    .from("characters")
    .select("current_health")
    .eq("id", characterId)
    .single();

  if (error) {
    throw new Error(
      error.message,
    );
  }

  const currentHealth =
    adjustHealthForVigourModifier({
      currentHealth:
        character.current_health,
      oldModifier,
      newModifier,
    });

  const { error: updateError } =
    await admin
      .from("characters")
      .update({
        current_health:
          currentHealth,
      })
      .eq(
        "id",
        characterId,
      );

  if (updateError) {
    throw new Error(
      updateError.message,
    );
  }
}

export async function applyGiftOwnershipHealthEffects(
  assignmentId: string,
) {
  const admin = adminClient();

  const {
    data: assignment,
    error,
  } = await admin
    .from("character_gifts")
    .select(`
      character_id,
      gift:gifts(
        effect_mode,
        vigour_modifier
      )
    `)
    .eq("id", assignmentId)
    .maybeSingle();

  if (error || !assignment) {
    throw new Error(
      error?.message ??
        "Gift assignment not found.",
    );
  }

  const gift =
    one(
      assignment.gift as
        | GiftRelation
        | GiftRelation[]
        | null,
    );

  if (
    gift?.effect_mode !==
      "passive" ||
    !gift.vigour_modifier
  ) {
    return;
  }

  await moveHealth({
    characterId:
      assignment.character_id,
    oldModifier: 0,
    newModifier:
      gift.vigour_modifier,
  });
}

export async function removeGiftOwnershipHealthEffects(
  assignmentId: string,
) {
  const admin = adminClient();

  const {
    data: assignment,
    error,
  } = await admin
    .from("character_gifts")
    .select(`
      character_id,
      gift:gifts(
        effect_mode,
        vigour_modifier
      )
    `)
    .eq("id", assignmentId)
    .maybeSingle();

  if (error || !assignment) {
    throw new Error(
      error?.message ??
        "Gift assignment not found.",
    );
  }

  const gift =
    one(
      assignment.gift as
        | GiftRelation
        | GiftRelation[]
        | null,
    );

  if (
    gift?.effect_mode ===
      "passive" &&
    gift.vigour_modifier
  ) {
    await moveHealth({
      characterId:
        assignment.character_id,
      oldModifier:
        gift.vigour_modifier,
      newModifier: 0,
    });
  }

  // Future-proof temporary ownership removal:
  // if a temporary Gift is currently active and has moved Health,
  // reverse that activation before cascade-deleting it.
  const {
    data: activations,
    error: activationError,
  } = await admin
    .from("gift_activations")
    .select(
      "id, health_delta_applied, health_reverted_at",
    )
    .eq(
      "character_gift_id",
      assignmentId,
    )
    .is(
      "health_reverted_at",
      null,
    )
    .neq(
      "health_delta_applied",
      0,
    );

  if (activationError) {
    throw new Error(
      activationError.message,
    );
  }

  const temporaryDelta =
    (activations ?? []).reduce(
      (
        total,
        activation,
      ) =>
        total +
        (
          activation.health_delta_applied ??
          0
        ),
      0,
    );

  if (temporaryDelta !== 0) {
    await moveHealth({
      characterId:
        assignment.character_id,
      oldModifier:
        temporaryDelta / 10,
      newModifier: 0,
    });

    const ids =
      (activations ?? []).map(
        (activation) =>
          activation.id,
      );

    if (ids.length) {
      const {
        error: markError,
      } = await admin
        .from("gift_activations")
        .update({
          health_reverted_at:
            new Date().toISOString(),
        })
        .in("id", ids);

      if (markError) {
        throw new Error(
          markError.message,
        );
      }
    }
  }
}

export async function applyTemporaryGiftActivationHealth({
  activationId,
  characterId,
  vigourModifier,
}: {
  activationId: string;
  characterId: string;
  vigourModifier: number;
}) {
  if (!vigourModifier) {
    return;
  }

  await moveHealth({
    characterId,
    oldModifier: 0,
    newModifier:
      vigourModifier,
  });

  const admin = adminClient();

  const { error } =
    await admin
      .from("gift_activations")
      .update({
        health_delta_applied:
          vigourModifier * 10,
      })
      .eq(
        "id",
        activationId,
      );

  if (error) {
    // Roll Health back if recording the activation delta fails.
    await moveHealth({
      characterId,
      oldModifier:
        vigourModifier,
      newModifier: 0,
    });

    throw new Error(
      error.message,
    );
  }
}
