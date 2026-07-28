export type PresenceStatus = "online" | "away" | "busy";

export type CharacterSummary = {
  id: string;
  display_name: string;
  portrait_url: string | null;
};

export type RoomMessage = {
  id: string;
  message: string;
  created_at: string;
  character_id: string;
  character: CharacterSummary | CharacterSummary[] | null;
};

export type PresentCharacter = {
  character_id: string;
  status: PresenceStatus;
  last_seen_at: string;
  character: CharacterSummary | CharacterSummary[] | null;
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
