export type StoreDestinationCategory =
  | "skin"
  | "cosmetic"
  | "music"
  | "friend_list"
  | "private_location"
  | "bundle";

export function storeDestinationForCategory(
  category: StoreDestinationCategory | string | null | undefined,
) {
  switch (category) {
    case "cosmetic":
      return "/cosmetics";
    case "skin":
      return "/appearance";
    case "music":
      return "/game";
    case "friend_list":
      return "/friends";
    case "private_location":
      return "/private-locations";
    default:
      return "/store";
  }
}
