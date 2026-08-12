export type PublicCharacterStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "rejected";

export type PublicPresenceStatus =
  | "online"
  | "away"
  | "busy";

export type PublicCodexReference = {
  id: string;
  name: string;
  slug: string;
  icon_url: string | null;
  colour: string | null;
};

export type PublicCharacterRoom = {
  id: string;
  name: string;
  slug: string;
  area: {
    id: string;
    name: string;
    slug: string;
  } | null;
};

export type PublicCharacterPresence = {
  status: PublicPresenceStatus;
  last_seen_at: string;
  room_id: string | null;
};

export type PublicCharacterProfile = {
  id: string;
  public_slug: string;
  first_name: string;
  surname: string;
  display_name: string;
  pronouns: string | null;
  date_of_birth: string | null;
  birthplace: string | null;
  origin: string | null;
  occupation: string | null;
  biography: string | null;
  portrait_url: string | null;
  music_url: string | null;
  physical_description: string | null;
  personality: string | null;
  public_notes: string | null;
  title: string | null;
  muscles: number | null;
  reflexes: number | null;
  vigor: number | null;
  brains: number | null;
  shrewd: number | null;
  presence_score: number | null;
  current_health: number | null;
  status: PublicCharacterStatus;

  race: PublicCodexReference | null;
  association: PublicCodexReference | null;

  current_room_id: string | null;
  currentRoom: PublicCharacterRoom | null;

  presence: PublicCharacterPresence | null;
};