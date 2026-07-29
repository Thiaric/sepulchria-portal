export type PublicCharacterStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "rejected";

export type PublicPresenceStatus =
  | "online"
  | "away"
  | "busy";

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
  physical_description: string | null;
  personality: string | null;
  public_notes: string | null;
  faction: string | null;
  title: string | null;
  status: PublicCharacterStatus;
  current_room_id: string | null;
  currentRoom: PublicCharacterRoom | null;
  presence: {
    status: PublicPresenceStatus;
    last_seen_at: string;
  } | null;
};