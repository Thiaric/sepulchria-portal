"use server";

import {
  createClient as createAdminClient,
} from "@supabase/supabase-js";

import {
  getStaffSession,
} from "@/lib/auth/require-staff";
import {
  createClient,
} from "@/lib/supabase/server";
import type {
  CharacterCondition,
} from "@/types/game";

export type ConditionEditorScope =
  | "self"
  | "location"
  | "admin";

export type CharacterConditionResult = {
  ok: boolean;
  message: string;
  characterId: string | null;
  characterName: string | null;
  conditions: CharacterCondition[];
};

/*
 * Conditions introduces a brand-new table before the generated Supabase
 * Database types know about it. This service-role client is intentionally
 * untyped here so new-table queries do not collapse to `never`.
 */
type AdminClient = any;

type ConditionContext = {
  admin: AdminClient;
  actorUserId: string;
  characterId: string;
  characterName: string;
  createdByRole:
    | "player"
    | "master"
    | "admin"
    | "owner";
};

function privilegedClient():
  AdminClient {
  const url =
    process.env
      .NEXT_PUBLIC_SUPABASE_URL;

  const secret =
    process.env
      .SUPABASE_SECRET_KEY;

  if (!url || !secret) {
    throw new Error(
      "Missing Supabase privileged credentials.",
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

function normaliseLabel(
  value: string,
) {
  return value
    .replace(/\s+/g, " ")
    .trim();
}

function isConditionStaffRole(
  role: string | null | undefined,
): role is
  | "owner"
  | "admin"
  | "master" {
  return (
    role === "owner" ||
    role === "admin" ||
    role === "master"
  );
}

async function getContext(
  requestedCharacterId: string,
  scope: ConditionEditorScope,
): Promise<ConditionContext> {
  const supabase =
    await createClient();

  const {
    data: { user },
    error: userError,
  } =
    await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error(
      "Authentication required.",
    );
  }

  const {
    data: ownCharacter,
    error: ownError,
  } = await supabase
    .from("characters")
    .select(
      "id, display_name, current_room_id, status",
    )
    .eq(
      "user_id",
      user.id,
    )
    .maybeSingle();

  if (
    ownError ||
    !ownCharacter
  ) {
    throw new Error(
      ownError?.message ??
        "Character not found.",
    );
  }

  const targetId =
    requestedCharacterId.trim();

  if (!targetId) {
    throw new Error(
      "Character not found.",
    );
  }

  const admin =
    privilegedClient();

  if (scope === "self") {
    if (
      targetId !==
      ownCharacter.id
    ) {
      throw new Error(
        "You can only manage your own Conditions.",
      );
    }

    return {
      admin,
      actorUserId: user.id,
      characterId:
        ownCharacter.id,
      characterName:
        ownCharacter
          .display_name,
      createdByRole:
        "player",
    };
  }

  const staff =
    await getStaffSession();

  if (
    scope === "admin"
  ) {
    if (
      !staff ||
      !isConditionStaffRole(
        staff.role,
      )
    ) {
      throw new Error(
        "Only the Owner, Administrators and Masters may manage Conditions here.",
      );
    }

    const {
      data: target,
      error: targetError,
    } = await admin
      .from("characters")
      .select(
        "id, display_name, status, is_system",
      )
      .eq(
        "id",
        targetId,
      )
      .maybeSingle();

    if (
      targetError ||
      !target ||
      target.is_system
    ) {
      throw new Error(
        targetError?.message ??
          "Character not found.",
      );
    }

    return {
      admin,
      actorUserId:
        user.id,
      characterId:
        target.id,
      characterName:
        target.display_name,
      createdByRole:
        staff.role,
    };
  }

  if (
    targetId ===
    ownCharacter.id
  ) {
    return {
      admin,
      actorUserId:
        user.id,
      characterId:
        ownCharacter.id,
      characterName:
        ownCharacter
          .display_name,
      createdByRole:
        staff &&
        isConditionStaffRole(
          staff.role,
        )
          ? staff.role
          : "player",
    };
  }

  if (
    !staff ||
    !isConditionStaffRole(
      staff.role,
    )
  ) {
    throw new Error(
      "You can only manage your own Conditions.",
    );
  }

  if (
    !ownCharacter
      .current_room_id
  ) {
    throw new Error(
      "You are not currently in a Location.",
    );
  }

  const {
    data: target,
    error: targetError,
  } = await admin
    .from("characters")
    .select(
      "id, display_name, current_room_id, status, is_system",
    )
    .eq(
      "id",
      targetId,
    )
    .maybeSingle();

  if (
    targetError ||
    !target ||
    target.status !==
      "approved" ||
    target.is_system
  ) {
    throw new Error(
      targetError?.message ??
        "Character not found.",
    );
  }

  if (
    target.current_room_id !==
    ownCharacter
      .current_room_id
  ) {
    throw new Error(
      "That Character is not in this Location.",
    );
  }

  return {
    admin,
    actorUserId:
      user.id,
    characterId:
      target.id,
    characterName:
      target.display_name,
    createdByRole:
      staff.role,
  };
}

async function readConditions(
  context: ConditionContext,
): Promise<
  CharacterCondition[]
> {
  const {
    data,
    error,
  } = await context.admin
    .from(
      "character_conditions",
    )
    .select(
      "id, character_id, label, created_at",
    )
    .eq(
      "character_id",
      context.characterId,
    )
    .order(
      "created_at",
      {
        ascending: true,
      },
    )
    .order(
      "id",
      {
        ascending: true,
      },
    );

  if (error) {
    throw new Error(
      `Unable to load Conditions: ${error.message}`,
    );
  }

  return (
    data ?? []
  ) as CharacterCondition[];
}

export async function loadEditableCharacterConditions(
  characterId: string,
  scope: ConditionEditorScope,
): Promise<
  CharacterConditionResult
> {
  try {
    const context =
      await getContext(
        characterId,
        scope,
      );

    return {
      ok: true,
      message: "",
      characterId:
        context.characterId,
      characterName:
        context.characterName,
      conditions:
        await readConditions(
          context,
        ),
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to load Conditions.",
      characterId: null,
      characterName: null,
      conditions: [],
    };
  }
}

export async function addCharacterCondition(
  characterId: string,
  rawLabel: string,
  scope: ConditionEditorScope,
): Promise<
  CharacterConditionResult
> {
  try {
    const context =
      await getContext(
        characterId,
        scope,
      );

    const label =
      normaliseLabel(
        rawLabel,
      );

    if (!label) {
      throw new Error(
        "Write a Condition first.",
      );
    }

    if (
      label.length > 40
    ) {
      throw new Error(
        "Conditions may be at most 40 characters.",
      );
    }

    const current =
      await readConditions(
        context,
      );

    if (
      current.length >= 10
    ) {
      throw new Error(
        "A Character may have at most 10 active Conditions.",
      );
    }

    if (
      current.some(
        (condition) =>
          condition.label
            .toLocaleLowerCase(
              "en-GB",
            ) ===
          label.toLocaleLowerCase(
            "en-GB",
          ),
      )
    ) {
      throw new Error(
        "That Condition is already active.",
      );
    }

    const {
      error,
    } = await context.admin
      .from(
        "character_conditions",
      )
      .insert({
        character_id:
          context.characterId,
        label,
        created_by_user_id:
          context.actorUserId,
        created_by_role:
          context.createdByRole,
      });

    if (error) {
      if (
        error.code ===
        "23505"
      ) {
        throw new Error(
          "That Condition is already active.",
        );
      }

      throw new Error(
        `Unable to add Condition: ${error.message}`,
      );
    }

    return {
      ok: true,
      message:
        `${label} added.`,
      characterId:
        context.characterId,
      characterName:
        context.characterName,
      conditions:
        await readConditions(
          context,
        ),
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to add Condition.",
      characterId:
        characterId || null,
      characterName: null,
      conditions: [],
    };
  }
}

export async function removeCharacterCondition(
  characterId: string,
  conditionId: string,
  scope: ConditionEditorScope,
): Promise<
  CharacterConditionResult
> {
  try {
    const context =
      await getContext(
        characterId,
        scope,
      );

    const {
      error,
    } = await context.admin
      .from(
        "character_conditions",
      )
      .delete()
      .eq(
        "id",
        conditionId,
      )
      .eq(
        "character_id",
        context.characterId,
      );

    if (error) {
      throw new Error(
        `Unable to remove Condition: ${error.message}`,
      );
    }

    return {
      ok: true,
      message:
        "Condition removed.",
      characterId:
        context.characterId,
      characterName:
        context.characterName,
      conditions:
        await readConditions(
          context,
        ),
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to remove Condition.",
      characterId:
        characterId || null,
      characterName: null,
      conditions: [],
    };
  }
}
