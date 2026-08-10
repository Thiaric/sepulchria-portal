export type PresenceStatus =
  | "online"
  | "away"
  | "busy";

export type CharacterIdentityRelation = {
  id: string;
  name: string;
  icon_url: string | null;
};

export type CharacterSummary = {
  id: string;
  first_name?: string | null;
  display_name: string;
  portrait_url: string | null;
  public_slug: string | null;
  race?:
    | CharacterIdentityRelation
    | CharacterIdentityRelation[]
    | null;
  association?:
    | CharacterIdentityRelation
    | CharacterIdentityRelation[]
    | null;
};

export type PresentRoomCharacter = {
  id: string;
  display_name: string;
};

export type CharacterAttributeKey =
  | "muscles"
  | "reflexes"
  | "vigor"
  | "brains"
  | "shrewd"
  | "presence_score";

export type CharacterAttributes = {
  muscles: number | null;
  reflexes: number | null;
  vigor: number | null;
  brains: number | null;
  shrewd: number | null;
  presence_score: number | null;
};

export type RoomMessageType =
  | "action"
  | "dice_roll"
  | "attribute_check"
  | "whisper"
  | "fate";

export type RoomMessage = {
  id: string;
  message: string;
  message_type: RoomMessageType;
  roll_label: string | null;
  dice_sides: number | null;
  dice_result: number | null;
  attribute_key:
    | CharacterAttributeKey
    | null;
  attribute_value: number | null;
  roll_total: number | null;
  whisper_recipient_character_id:
    | string
    | null;
  created_at: string;
  character_id: string;
  character:
    | CharacterSummary
    | CharacterSummary[]
    | null;
  whisperRecipient:
    | CharacterSummary
    | CharacterSummary[]
    | null;
};

export type PresentCharacter = {
  character_id: string;
  status: PresenceStatus;
  last_seen_at: string;
  character:
    | CharacterSummary
    | CharacterSummary[]
    | null;
};

export type ActionState = {
  ok: boolean;
  message: string;
  submittedAt?: number;
};

export type PresenceActionResult = {
  ok: boolean;
  status: PresenceStatus;
  message: string;
};
