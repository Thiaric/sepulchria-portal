from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path.cwd()
EXPECTED_HEAD = "6a79eb388f4a7955d640ea3eaf0c18907a9aa8b6"
BACKUP = ROOT / ".character-conditions-full-system-backup"

TYPES = ROOT / "types" / "game.ts"
GAME_PAGE = ROOT / "app" / "(portal)" / "game" / "page.tsx"
CHAT_FORM = ROOT / "app" / "(portal)" / "game" / "components" / "RoomChatForm.tsx"
MESSAGE_LIST = ROOT / "app" / "(portal)" / "game" / "components" / "RoomMessageList.tsx"
OWN_CHARACTER_PAGE = ROOT / "app" / "(portal)" / "character" / "page.tsx"
PUBLIC_PROFILE = ROOT / "components" / "characters" / "public-character-profile.tsx"
ADMIN_CHARACTER_PAGE = ROOT / "app" / "(portal)" / "admin" / "characters" / "[id]" / "page.tsx"

CONDITION_ACTIONS = ROOT / "app" / "(portal)" / "character" / "condition-actions.ts"
CONDITION_EDITOR = ROOT / "components" / "characters" / "character-conditions-editor.tsx"
CONDITION_DISPLAY = ROOT / "components" / "characters" / "character-conditions-display.tsx"
SQL = ROOT / "conditions_system_migration.sql"

MODIFIED = [
    TYPES,
    GAME_PAGE,
    CHAT_FORM,
    MESSAGE_LIST,
    OWN_CHARACTER_PAGE,
    PUBLIC_PROFILE,
    ADMIN_CHARACTER_PAGE,
]

NEW_FILES = [
    CONDITION_ACTIONS,
    CONDITION_EDITOR,
    CONDITION_DISPLAY,
    SQL,
]

ALL_TS = [
    TYPES,
    GAME_PAGE,
    CHAT_FORM,
    MESSAGE_LIST,
    OWN_CHARACTER_PAGE,
    PUBLIC_PROFILE,
    ADMIN_CHARACTER_PAGE,
    CONDITION_ACTIONS,
    CONDITION_EDITOR,
    CONDITION_DISPLAY,
]

def fail(message: str) -> None:
    print(f"\nSTOPPED: {message}", file=sys.stderr)
    sys.exit(1)

def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(
            f"{label}: expected exactly 1 match, found {count}."
        )
    return text.replace(old, new, 1)

if not (ROOT / "package.json").exists():
    fail("Run this from the sepulchria-portal repository root.")

head = subprocess.check_output(
    ["git", "rev-parse", "HEAD"],
    cwd=ROOT,
    text=True,
).strip()

if head != EXPECTED_HEAD:
    fail(
        f"This patch is locked to {EXPECTED_HEAD[:7]}; "
        f"your current HEAD is {head[:7]}."
    )

try:
    subprocess.run(["git", "diff", "--quiet"], cwd=ROOT, check=True)
    subprocess.run(["git", "diff", "--cached", "--quiet"], cwd=ROOT, check=True)
except subprocess.CalledProcessError:
    fail(
        "Tracked files are already modified. "
        "Commit or stash them before running this patch."
    )

for path in MODIFIED:
    if not path.exists():
        fail(f"Missing expected file: {path.relative_to(ROOT)}")

for path in NEW_FILES:
    if path.exists():
        fail(
            f"{path.relative_to(ROOT)} already exists. "
            "This patch expects the previous Conditions patch NOT to have been run."
        )

if BACKUP.exists():
    shutil.rmtree(BACKUP)

for path in MODIFIED:
    destination = BACKUP / path.relative_to(ROOT)
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(path, destination)

created: list[Path] = []

def restore() -> None:
    for path in MODIFIED:
        source = BACKUP / path.relative_to(ROOT)
        if source.exists():
            shutil.copy2(source, path)

    for path in created:
        if path.exists():
            path.unlink()

try:
    # ================================================================
    # TYPES
    # ================================================================
    text = TYPES.read_text(encoding="utf-8")

    text = replace_once(
        text,
        '''export type PresentRoomCharacter = {
  id: string;
  display_name: string;
};

export type CharacterAttributeKey =''',
        '''export type PresentRoomCharacter = {
  id: string;
  display_name: string;
};

export type CharacterCondition = {
  id: string;
  character_id: string;
  label: string;
  created_at: string;
};

export type RoomConditionSnapshot = {
  label: string;
};

export type CharacterAttributeKey =''',
        "types/game.ts: condition types",
    )

    text = replace_once(
        text,
        '''  created_at: string;
  character_id: string;
  character:''',
        '''  created_at: string;
  character_id: string;
  condition_snapshot: RoomConditionSnapshot[];
  character:''',
        "types/game.ts: room message snapshot",
    )

    TYPES.write_text(text, encoding="utf-8")

    # ================================================================
    # GAME PAGE
    # ================================================================
    text = GAME_PAGE.read_text(encoding="utf-8")

    text = replace_once(
        text,
        '''    whisper_recipient_character_id,
    created_at,
    character_id,
''',
        '''    whisper_recipient_character_id,
    condition_snapshot,
    created_at,
    character_id,
''',
        "game/page.tsx: snapshot select",
    )

    text = replace_once(
        text,
        '''        <RoomChatForm
      roomId={room.id}
      presentCharacters={
        presentCharacters
      }
          canUseFate={canUseFate}''',
        '''        <RoomChatForm
      roomId={room.id}
      viewerCharacterId={character.id}
      viewerDisplayName={character.display_name}
      presentCharacters={
        presentCharacters
      }
          canUseFate={canUseFate}''',
        "game/page.tsx: RoomChatForm identity props",
    )

    GAME_PAGE.write_text(text, encoding="utf-8")

    # ================================================================
    # ROOM CHAT FORM
    # ================================================================
    text = CHAT_FORM.read_text(encoding="utf-8")

    text = replace_once(
        text,
        '''import { WarpingPanel } from "./WarpingPanel";
import {
  loadRoomCombatData,''',
        '''import { WarpingPanel } from "./WarpingPanel";
import { CharacterConditionsEditor } from "@/components/characters/character-conditions-editor";
import {
  loadRoomCombatData,''',
        "RoomChatForm: editor import",
    )

    text = replace_once(
        text,
        '''export default function RoomChatForm({
  roomId,
  presentCharacters: initialPresentCharacters,''',
        '''export default function RoomChatForm({
  roomId,
  viewerCharacterId,
  viewerDisplayName,
  presentCharacters: initialPresentCharacters,''',
        "RoomChatForm: props destructuring",
    )

    text = replace_once(
        text,
        '''}: {
  roomId: string;
  presentCharacters: PresentRoomCharacter[];''',
        '''}: {
  roomId: string;
  viewerCharacterId: string;
  viewerDisplayName: string;
  presentCharacters: PresentRoomCharacter[];''',
        "RoomChatForm: props type",
    )

    text = replace_once(
        text,
        '''      <PendingShapeResponses />
      <div className="mb-2 flex justify-end">

      </div>
      {utilityMode === null ? (''',
        '''      <PendingShapeResponses />

      <CharacterConditionsEditor
        scope="location"
        characterId={viewerCharacterId}
        characterName={viewerDisplayName}
        selectableCharacters={
          canUseFate
            ? presentCharacters
            : []
        }
      />

      {utilityMode === null ? (''',
        "RoomChatForm: location editor",
    )

    CHAT_FORM.write_text(text, encoding="utf-8")

    # ================================================================
    # ROOM MESSAGE LIST
    # ================================================================
    text = MESSAGE_LIST.read_text(encoding="utf-8")

    text = replace_once(
        text,
        '''  whisper_recipient_character_id:
    | string
    | null;
  created_at: string;''',
        '''  whisper_recipient_character_id:
    | string
    | null;
  condition_snapshot: {
    label: string;
  }[];
  created_at: string;''',
        "RoomMessageList: realtime type",
    )

    helper_anchor = '''  function shapeTagHeaderText(
    characterId:string,
    metadataColour?:string,
  ){
    return renderShapeTagGroups(
      characterId,
      false,
      metadataColour,
    );
  }
'''

    helper_new = helper_anchor + '''
  function conditionSnapshotHeaderText(
    snapshot:
      | {
          label: string;
        }[]
      | null
      | undefined,
    metadataColour?: string,
  ) {
    const labels =
      (snapshot ?? [])
        .map((entry) =>
          String(
            entry?.label ?? "",
          ).trim(),
        )
        .filter(Boolean);

    if (!labels.length) {
      return null;
    }

    return (
      <span
        data-room-condition-snapshot="true"
        className="text-[9px] tracking-[.04em] text-[rgb(var(--sep-colour-b99765))]"
        style={
          metadataColour
            ? {
                color:
                  metadataColour,
              }
            : undefined
        }
      >
        {" | "}
        {labels.join(" - ")}
      </span>
    );
  }
'''

    text = replace_once(
        text,
        helper_anchor,
        helper_new,
        "RoomMessageList: snapshot renderer",
    )

    text = replace_once(
        text,
        '''              whisper_recipient_character_id:
                inserted
                  .whisper_recipient_character_id,
              created_at:''',
        '''              whisper_recipient_character_id:
                inserted
                  .whisper_recipient_character_id,
              condition_snapshot:
                Array.isArray(
                  inserted.condition_snapshot,
                )
                  ? inserted.condition_snapshot
                  : [],
              created_at:''',
        "RoomMessageList: realtime snapshot mapping",
    )

    text = replace_once(
        text,
        '''                          {author
                            ? shapeTagHeaderText(
                                author.id,
                                privateLocationTheme
                                  ? privateLocationTheme.offgameTextColour
                                  : "rgb(var(--sep-colour-d3c2aa))",
                              )
                            : null}

                          <br />''',
        '''                          {author
                            ? shapeTagHeaderText(
                                author.id,
                                privateLocationTheme
                                  ? privateLocationTheme.offgameTextColour
                                  : "rgb(var(--sep-colour-d3c2aa))",
                              )
                            : null}

                          {conditionSnapshotHeaderText(
                            item.condition_snapshot,
                            privateLocationTheme
                              ? privateLocationTheme.offgameTextColour
                              : "rgb(var(--sep-colour-d3c2aa))",
                          )}

                          <br />''',
        "RoomMessageList: whisper/ooc snapshots",
    )

    text = replace_once(
        text,
        '''                      {author
                        ? shapeTagHeaderText(author.id)
                        : null}

                      <br />''',
        '''                      {author
                        ? shapeTagHeaderText(author.id)
                        : null}

                      {conditionSnapshotHeaderText(
                        item.condition_snapshot,
                      )}

                      <br />''',
        "RoomMessageList: normal snapshots",
    )

    MESSAGE_LIST.write_text(text, encoding="utf-8")

    # ================================================================
    # OWN CHARACTER SHEET
    # ================================================================
    text = OWN_CHARACTER_PAGE.read_text(encoding="utf-8")

    text = replace_once(
        text,
        '''import { CharacterDisplayTrophies } from "@/components/characters/character-display-trophies";
import { AutoFitCharacterName } from "@/components/characters/auto-fit-character-name";''',
        '''import { CharacterDisplayTrophies } from "@/components/characters/character-display-trophies";
import { CharacterConditionsDisplay } from "@/components/characters/character-conditions-display";
import { CharacterConditionsEditor } from "@/components/characters/character-conditions-editor";
import { AutoFitCharacterName } from "@/components/characters/auto-fit-character-name";''',
        "character/page.tsx: condition imports",
    )

    own_trophy_anchor = '''                      {character.id ? (
                        <div className="justify-self-end">
                          <CharacterDisplayTrophies
                            characterId={character.id}
                          />
                        </div>
                      ) : null}
                    </div>'''

    own_trophy_new = own_trophy_anchor + '''

                    {character.id ? (
                      <CharacterConditionsDisplay
                        characterId={character.id}
                      />
                    ) : null}'''

    text = replace_once(
        text,
        own_trophy_anchor,
        own_trophy_new,
        "character/page.tsx: conditions display",
    )

    text = replace_once(
        text,
        '''          <div data-character-sheet-panel="edit">
            {activeTab === "edit" &&
            canEdit ? (''',
        '''          <div data-character-sheet-panel="edit">
            {activeTab === "edit" &&
            own &&
            character.id ? (
              <CharacterConditionsEditor
                scope="self"
                characterId={character.id}
                characterName={
                  character.display_name ??
                  "Your Character"
                }
              />
            ) : null}

            {activeTab === "edit" &&
            canEdit ? (''',
        "character/page.tsx: self editor",
    )

    OWN_CHARACTER_PAGE.write_text(text, encoding="utf-8")

    # ================================================================
    # PUBLIC CHARACTER SHEET
    # ================================================================
    text = PUBLIC_PROFILE.read_text(encoding="utf-8")

    text = replace_once(
        text,
        '''import { CharacterDisplayTrophies } from "@/components/characters/character-display-trophies";
import { AutoFitCharacterName } from "@/components/characters/auto-fit-character-name";''',
        '''import { CharacterDisplayTrophies } from "@/components/characters/character-display-trophies";
import { CharacterConditionsDisplay } from "@/components/characters/character-conditions-display";
import { AutoFitCharacterName } from "@/components/characters/auto-fit-character-name";''',
        "public-character-profile.tsx: display import",
    )

    public_trophy_anchor = '''                    <div className="justify-self-end">
                      <CharacterDisplayTrophies
                        characterId={character.id}
                      />
                    </div>
                  </div>'''

    public_trophy_new = public_trophy_anchor + '''

                  <CharacterConditionsDisplay
                    characterId={character.id}
                  />'''

    text = replace_once(
        text,
        public_trophy_anchor,
        public_trophy_new,
        "public-character-profile.tsx: conditions display",
    )

    PUBLIC_PROFILE.write_text(text, encoding="utf-8")

    # ================================================================
    # ADMIN CHARACTER PAGE
    # ================================================================
    text = ADMIN_CHARACTER_PAGE.read_text(encoding="utf-8")

    text = replace_once(
        text,
        '''import { CharacterReviewFields } from "@/components/admin/character-review-fields";
import Image from "next/image";''',
        '''import { CharacterReviewFields } from "@/components/admin/character-review-fields";
import { CharacterConditionsEditor } from "@/components/characters/character-conditions-editor";
import Image from "next/image";''',
        "admin character page: editor import",
    )

    text = replace_once(
        text,
        '''        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">''',
        '''        </section>

        {canEditCharacter ? (
          <section
            id="admin-character-conditions"
            className="mt-6 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-5 sm:p-6"
          >
            <p className="text-[9px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-8c704b))]">
              Character state
            </p>

            <h3 className="mt-2 font-serif text-2xl text-[rgb(var(--sep-colour-dfc99f))]">
              Conditions
            </h3>

            <p className="mt-2 max-w-3xl text-[11px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">
              Owner, Administrators and Masters may add or remove visible Conditions on this Character.
            </p>

            <div className="mt-4">
              <CharacterConditionsEditor
                scope="admin"
                characterId={character.id}
                characterName={displayName}
              />
            </div>
          </section>
        ) : null}

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">''',
        "admin character page: conditions editor",
    )

    ADMIN_CHARACTER_PAGE.write_text(text, encoding="utf-8")

    # ================================================================
    # CENTRAL SERVER ACTIONS
    # ================================================================
    CONDITION_ACTIONS.parent.mkdir(parents=True, exist_ok=True)

    CONDITION_ACTIONS.write_text(r'''"use server";

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

type AdminClient =
  ReturnType<
    typeof createAdminClient
  >;

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
''', encoding="utf-8")
    created.append(CONDITION_ACTIONS)

    # ================================================================
    # REUSABLE CONDITIONS EDITOR
    # ================================================================
    CONDITION_EDITOR.write_text(r'''"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";

import {
  addCharacterCondition,
  loadEditableCharacterConditions,
  removeCharacterCondition,
  type ConditionEditorScope,
} from "@/app/(portal)/character/condition-actions";
import {
  createClient,
} from "@/lib/supabase/client";
import type {
  CharacterCondition,
  PresentRoomCharacter,
} from "@/types/game";

type Props = {
  scope: ConditionEditorScope;
  characterId: string;
  characterName: string;
  selectableCharacters?:
    PresentRoomCharacter[];
};

export function CharacterConditionsEditor({
  scope,
  characterId,
  characterName,
  selectableCharacters = [],
}: Props) {
  const [
    targetCharacterId,
    setTargetCharacterId,
  ] = useState(
    characterId,
  );

  const [
    conditions,
    setConditions,
  ] = useState<
    CharacterCondition[]
  >([]);

  const [
    input,
    setInput,
  ] = useState("");

  const [
    status,
    setStatus,
  ] = useState("");

  const [
    statusOk,
    setStatusOk,
  ] = useState(true);

  const [
    pending,
    startTransition,
  ] = useTransition();

  const supabase =
    useMemo(
      () => createClient(),
      [],
    );

  const targets =
    useMemo(
      () => {
        if (
          scope !==
          "location"
        ) {
          return [
            {
              id:
                characterId,
              display_name:
                characterName,
            },
          ];
        }

        return [
          {
            id:
              characterId,
            display_name:
              characterName,
          },
          ...selectableCharacters.filter(
            (entry) =>
              entry.id !==
              characterId,
          ),
        ];
      },
      [
        characterId,
        characterName,
        scope,
        selectableCharacters,
      ],
    );

  useEffect(() => {
    if (
      targets.some(
        (entry) =>
          entry.id ===
          targetCharacterId,
      )
    ) {
      return;
    }

    setTargetCharacterId(
      characterId,
    );
  }, [
    characterId,
    targetCharacterId,
    targets,
  ]);

  const load =
    useCallback(
      async () => {
        const result =
          await loadEditableCharacterConditions(
            targetCharacterId,
            scope,
          );

        if (!result.ok) {
          setStatus(
            result.message,
          );
          setStatusOk(false);
          setConditions([]);
          return;
        }

        setConditions(
          result.conditions,
        );
      },
      [
        scope,
        targetCharacterId,
      ],
    );

  useEffect(() => {
    let active = true;

    void load();

    const channel =
      supabase
        .channel(
          `condition-editor-${targetCharacterId}-${crypto.randomUUID()}`,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table:
              "character_conditions",
            filter:
              `character_id=eq.${targetCharacterId}`,
          },
          () => {
            if (active) {
              void load();
            }
          },
        )
        .subscribe();

    return () => {
      active = false;

      void supabase
        .removeChannel(
          channel,
        );
    };
  }, [
    load,
    supabase,
    targetCharacterId,
  ]);

  useEffect(() => {
    if (!status) {
      return;
    }

    const timer =
      window.setTimeout(
        () => {
          setStatus("");
        },
        3000,
      );

    return () => {
      window.clearTimeout(
        timer,
      );
    };
  }, [status]);

  function addCondition() {
    const label =
      input
        .replace(/\s+/g, " ")
        .trim();

    if (
      !label ||
      pending
    ) {
      return;
    }

    startTransition(
      async () => {
        const result =
          await addCharacterCondition(
            targetCharacterId,
            label,
            scope,
          );

        setStatus(
          result.message,
        );
        setStatusOk(
          result.ok,
        );

        if (result.ok) {
          setConditions(
            result.conditions,
          );
          setInput("");
        }
      },
    );
  }

  function removeCondition(
    conditionId: string,
  ) {
    if (pending) {
      return;
    }

    startTransition(
      async () => {
        const result =
          await removeCharacterCondition(
            targetCharacterId,
            conditionId,
            scope,
          );

        setStatus(
          result.message,
        );
        setStatusOk(
          result.ok,
        );

        if (result.ok) {
          setConditions(
            result.conditions,
          );
        }
      },
    );
  }

  return (
    <div
      data-character-conditions-editor="true"
      className="border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="shrink-0 text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-806b50))]">
          Conditions
        </span>

        {scope ===
          "location" &&
        targets.length > 1 ? (
          <select
            value={
              targetCharacterId
            }
            onChange={(event) => {
              setTargetCharacterId(
                event.target.value,
              );
              setInput("");
              setStatus("");
            }}
            className="h-8 min-w-[160px] border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0f0c09))] px-2 text-[9px] text-[rgb(var(--sep-colour-cdb894))] outline-none focus:border-[rgb(var(--sep-colour-987344))]"
          >
            {targets.map(
              (entry) => (
                <option
                  key={entry.id}
                  value={entry.id}
                >
                  {entry.id ===
                  characterId
                    ? `You — ${entry.display_name}`
                    : entry.display_name}
                </option>
              ),
            )}
          </select>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          {conditions.map(
            (condition) => (
              <span
                key={condition.id}
                className="inline-flex max-w-full items-center gap-1 border border-[rgb(var(--sep-skin-c1))]/45 bg-[rgb(var(--sep-colour-17110d))] px-2 py-1 text-[8px] text-[rgb(var(--sep-skin-c2))]"
              >
                <span className="max-w-[190px] truncate">
                  {
                    condition.label
                  }
                </span>

                <button
                  type="button"
                  disabled={pending}
                  aria-label={`Remove ${condition.label}`}
                  title={`Remove ${condition.label}`}
                  onClick={() =>
                    removeCondition(
                      condition.id,
                    )
                  }
                  className="text-[11px] leading-none text-[rgb(var(--sep-skin-c1))] transition hover:text-[rgb(var(--sep-skin-c2))] disabled:opacity-40"
                >
                  ×
                </button>
              </span>
            ),
          )}

          <div className="flex min-w-[200px] flex-1 items-center">
            <input
              type="text"
              maxLength={40}
              value={input}
              disabled={
                pending ||
                conditions.length >=
                  10
              }
              onChange={(event) =>
                setInput(
                  event.target.value,
                )
              }
              onKeyDown={(event) => {
                if (
                  event.key !==
                    "Enter" ||
                  event.nativeEvent
                    .isComposing
                ) {
                  return;
                }

                event.preventDefault();
                addCondition();
              }}
              placeholder={
                conditions.length >=
                10
                  ? "10 Conditions maximum"
                  : "Blind, Blue Skin, Left Arm Missing..."
              }
              className="h-8 min-w-0 flex-1 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-0f0c09))] px-2.5 text-[9px] text-[rgb(var(--sep-colour-d0bea1))] outline-none placeholder:text-[rgb(var(--sep-colour-5f574d))] focus:border-[rgb(var(--sep-skin-c1))]"
            />

            <button
              type="button"
              disabled={
                pending ||
                !input.trim() ||
                conditions.length >=
                  10
              }
              onClick={
                addCondition
              }
              className="h-8 border border-l-0 border-[rgb(var(--sep-skin-c1))]/55 bg-[rgb(var(--sep-colour-21190f))] px-3 text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-skin-c1))] transition hover:bg-[rgb(var(--sep-colour-2b2014))] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Add
            </button>
          </div>
        </div>

        <span className="shrink-0 text-[7px] text-[rgb(var(--sep-colour-685d50))]">
          {conditions.length}/10
        </span>
      </div>

      {status ? (
        <p
          aria-live="polite"
          className={`mt-2 text-[8px] ${
            statusOk
              ? "text-[rgb(var(--sep-colour-9bb58c))]"
              : "text-[rgb(var(--sep-colour-d58d82))]"
          }`}
        >
          {status}
        </p>
      ) : null}
    </div>
  );
}
''', encoding="utf-8")
    created.append(CONDITION_EDITOR)

    # ================================================================
    # REUSABLE CHARACTER SHEET DISPLAY
    # ================================================================
    CONDITION_DISPLAY.write_text(r'''"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  createClient,
} from "@/lib/supabase/client";
import type {
  CharacterCondition,
} from "@/types/game";

export function CharacterConditionsDisplay({
  characterId,
}: {
  characterId: string;
}) {
  const [
    conditions,
    setConditions,
  ] = useState<
    CharacterCondition[]
  >([]);

  const supabase =
    useMemo(
      () => createClient(),
      [],
    );

  useEffect(() => {
    let active = true;

    async function load() {
      const {
        data,
        error,
      } = await supabase
        .from(
          "character_conditions",
        )
        .select(
          "id, character_id, label, created_at",
        )
        .eq(
          "character_id",
          characterId,
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

      if (
        !active
      ) {
        return;
      }

      if (error) {
        console.error(
          "Unable to load Character Conditions:",
          error.message,
        );
        return;
      }

      setConditions(
        (data ?? []) as
          CharacterCondition[],
      );
    }

    void load();

    const channel =
      supabase
        .channel(
          `condition-display-${characterId}-${crypto.randomUUID()}`,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table:
              "character_conditions",
            filter:
              `character_id=eq.${characterId}`,
          },
          () => {
            void load();
          },
        )
        .subscribe();

    return () => {
      active = false;

      void supabase
        .removeChannel(
          channel,
        );
    };
  }, [
    characterId,
    supabase,
  ]);

  return (
    <div
      data-character-conditions-display="true"
      className="mt-2 flex flex-wrap items-center gap-1.5"
    >
      <span className="mr-1 text-[7px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-796448))]">
        Conditions
      </span>

      {conditions.length ? (
        conditions.map(
          (condition) => (
            <span
              key={condition.id}
              className="border border-[rgb(var(--sep-skin-c1))]/35 bg-[rgb(var(--sep-colour-100c09))] px-2 py-1 text-[8px] text-[rgb(var(--sep-skin-c2))]"
            >
              {
                condition.label
              }
            </span>
          ),
        )
      ) : (
        <span className="text-[8px] italic text-[rgb(var(--sep-colour-756957))]">
          None
        </span>
      )}
    </div>
  );
}
''', encoding="utf-8")
    created.append(CONDITION_DISPLAY)

    # ================================================================
    # SQL MIGRATION
    # ================================================================
    SQL.write_text(r'''-- Sepulchria Character Conditions
-- Base commit:
-- 6a79eb388f4a7955d640ea3eaf0c18907a9aa8b6
--
-- Run this ONCE in Supabase SQL Editor after applying the Python patch.
--
-- Conditions are:
--   * editable by the Character themselves in Character -> Edit
--   * editable in Locations by the Character, and by Owner/Admin/Master
--     for co-located Characters
--   * editable in /admin/characters/[id] by Owner/Admin/Master
--   * visible on own and public Character Sheets
--   * snapshotted automatically onto every new room message

begin;

create table if not exists
  public.character_conditions (
    id uuid primary key
      default gen_random_uuid(),

    character_id uuid not null
      references public.characters(id)
      on delete cascade,

    label text not null,

    created_by_user_id uuid null
      references auth.users(id)
      on delete set null,

    created_by_role text not null
      default 'player',

    created_at timestamptz not null
      default now(),

    constraint
      character_conditions_label_length
      check (
        char_length(
          trim(label)
        )
        between 1 and 40
      ),

    constraint
      character_conditions_created_by_role
      check (
        created_by_role in (
          'player',
          'master',
          'admin',
          'owner'
        )
      )
  );

create unique index if not exists
  character_conditions_character_label_unique
on public.character_conditions (
  character_id,
  lower(label)
);

create index if not exists
  character_conditions_character_created_idx
on public.character_conditions (
  character_id,
  created_at,
  id
);

create or replace function
  public.validate_character_condition()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  active_count integer;
begin
  new.label :=
    regexp_replace(
      trim(new.label),
      '\s+',
      ' ',
      'g'
    );

  if
    char_length(new.label) < 1
    or
    char_length(new.label) > 40
  then
    raise exception
      'Condition must contain between 1 and 40 characters.';
  end if;

  if tg_op = 'INSERT' then
    select count(*)
    into active_count
    from
      public.character_conditions
    where
      character_id =
        new.character_id;

    if
      active_count >= 10
    then
      raise exception
        'A Character may have at most 10 active Conditions.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists
  character_conditions_validate
on public.character_conditions;

create trigger
  character_conditions_validate
before insert or update
on public.character_conditions
for each row
execute function
  public.validate_character_condition();

alter table
  public.character_conditions
enable row level security;

drop policy if exists
  character_conditions_authenticated_read
on public.character_conditions;

create policy
  character_conditions_authenticated_read
on public.character_conditions
for select
to authenticated
using (true);

grant select
on public.character_conditions
to authenticated;

revoke insert, update, delete
on public.character_conditions
from anon, authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where
      pubname =
        'supabase_realtime'
      and
      schemaname =
        'public'
      and
      tablename =
        'character_conditions'
  ) then
    alter publication
      supabase_realtime
    add table
      public.character_conditions;
  end if;
end;
$$;

alter table
  public.room_messages
add column if not exists
  condition_snapshot jsonb
  not null
  default '[]'::jsonb;

create or replace function
  public.snapshot_room_message_conditions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if
    new.character_id
      is null
  then
    new.condition_snapshot :=
      '[]'::jsonb;

    return new;
  end if;

  select
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'label',
          condition_row.label
        )
        order by
          condition_row.created_at,
          condition_row.id
      ),
      '[]'::jsonb
    )
  into
    new.condition_snapshot
  from
    public.character_conditions
      as condition_row
  where
    condition_row.character_id =
      new.character_id;

  return new;
end;
$$;

drop trigger if exists
  room_messages_condition_snapshot
on public.room_messages;

create trigger
  room_messages_condition_snapshot
before insert
on public.room_messages
for each row
execute function
  public.snapshot_room_message_conditions();

commit;
''', encoding="utf-8")
    created.append(SQL)

    # ================================================================
    # PARSE VALIDATION
    # ================================================================
    validator = r'''
const fs = require("fs");
const ts = require("typescript");

for (const file of process.argv.slice(1)) {
  const source =
    fs.readFileSync(
      file,
      "utf8",
    );

  const kind =
    file.endsWith(".tsx")
      ? ts.ScriptKind.TSX
      : ts.ScriptKind.TS;

  const sf =
    ts.createSourceFile(
      file,
      source,
      ts.ScriptTarget.Latest,
      true,
      kind,
    );

  if (
    sf.parseDiagnostics.length
  ) {
    console.error(
      "Parse diagnostics for",
      file,
    );

    console.error(
      sf.parseDiagnostics,
    );

    process.exit(1);
  }
}
'''

    subprocess.run(
        [
            "node",
            "-e",
            validator,
            *[
                str(path)
                for path in ALL_TS
            ],
        ],
        cwd=ROOT,
        check=True,
    )

except Exception as exc:
    restore()

    fail(
        f"{exc}\n"
        "All modified tracked files were restored and generated files were removed."
    )

print("\nFULL CHARACTER CONDITIONS SYSTEM APPLIED")
print("")
print("Base commit:")
print(f"  {EXPECTED_HEAD}")
print("")
print("CHARACTER:")
print("  - Character -> Edit can add/remove own Conditions")
print("  - works even when the approved-character fields themselves are locked")
print("")
print("CHARACTER SHEETS:")
print("  - own sheet displays active Conditions")
print("  - public /characters/[slug] sheet displays active Conditions")
print("  - display updates in realtime")
print("")
print("ADMIN:")
print("  - /admin/characters/[id] has a Conditions editor")
print("  - available to Owner / Admin / Master through character_edit capability")
print("  - can edit the Character regardless of Location")
print("")
print("LOCATIONS:")
print("  - Character can edit their own Conditions above the chat composer")
print("  - Owner / Admin / Master can select co-located Characters and edit theirs")
print("  - every new room message receives an immutable condition_snapshot")
print("  - old messages keep the Conditions they had when posted")
print("")
print("LIMITS:")
print("  - 10 active Conditions maximum")
print("  - 40 characters maximum per Condition")
print("  - duplicate labels blocked case-insensitively")
print("")
print("Generated SQL:")
print("  conditions_system_migration.sql")
print("")
print("NEXT:")
print("  1. Run conditions_system_migration.sql in Supabase SQL Editor")
print("  2. npm run build")
