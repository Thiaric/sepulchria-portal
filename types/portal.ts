export type PortalCharacterStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "rejected";

export type PortalPresenceStatus =
  | "online"
  | "away"
  | "busy";

export type PortalCodexReference = {
  id: string;
  name: string;
  slug: string;
  icon_url: string | null;
  colour: string | null;
};

export type PortalRoom = {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  is_outdoors: boolean;

  area: {
    id: string;
    name: string;
    slug: string;
  } | null;
};

export type PortalCharacter = {
  id: string;
  first_name: string;
  surname: string;
  display_name: string;
  portrait_url: string | null;
  occupation: string | null;
  title: string | null;
  biography: string | null;
  status: PortalCharacterStatus;

  race: PortalCodexReference | null;
  association: PortalCodexReference | null;

  current_room_id: string | null;
  currentRoom: PortalRoom | null;
};

export type PortalPresence = {
  status: PortalPresenceStatus;
  last_seen_at: string;
  room_id: string | null;
};

export type PortalPrivateLocation = {
  roomId: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  role: "owner" | "member" | "staff";
};

export type PortalContext = {
  user: {
    id: string;
    email: string | null;
  };

  character: PortalCharacter | null;
  presence: PortalPresence | null;
  unreadMessageCount: number;
  onlineCharacterCount: number;
  currentRoomAccessAllowed: boolean;
  isStaff: boolean;
  privateLocations: PortalPrivateLocation[];
  allOrderHeadquartersRoomIds: string[];
  visibleOrderHeadquartersRoomIds: string[];
};