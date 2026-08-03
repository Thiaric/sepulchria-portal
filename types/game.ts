export type PresenceStatus =
  | "online"
  | "away"
  | "busy";

export type CharacterSummary = {
  id: string;
  display_name: string;
  portrait_url: string | null;
  public_slug: string | null;
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
  | "attribute_check";

export type RoomMessage = {
  id: string;
  message: string;
  message_type: RoomMessageType;
  roll_label: string | null;
  dice_sides: number | null;
  dice_result: number | null;
  attribute_key: CharacterAttributeKey | null;
  attribute_value: number | null;
  roll_total: number | null;
  created_at: string;
  character_id: string;
  character:
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
