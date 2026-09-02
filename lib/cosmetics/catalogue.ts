export const COSMETIC_CATEGORIES = [
  "sheet_frame",
  "chat_frame",
  "portrait_frame",
  "profile_background",
  "pm_frame",
  "instant_chat_frame",
  "forum_frame",
  "action_style",
  "nameplate",
  "profile_crest",
  "action_flourish",
  "whisper_style",
  "header_control_frame",
  "left_panel_frame",
  "right_panel_frame",
  "centre_panel_frame",
  "location_frame",
  "location_atmosphere",
] as const;

export type CosmeticCategory =
  (typeof COSMETIC_CATEGORIES)[number];

export const PUBLIC_COSMETIC_CATEGORIES = [
  "sheet_frame",
  "chat_frame",
  "portrait_frame",
  "profile_background",
  "pm_frame",
  "instant_chat_frame",
  "forum_frame",
  "action_style",
  "nameplate",
  "profile_crest",
  "action_flourish",
  "whisper_style",
] as const satisfies readonly CosmeticCategory[];

export const PORTAL_ONLY_COSMETICS = [
  "header_control_frame",
  "left_panel_frame",
  "right_panel_frame",
  "centre_panel_frame",
  "location_frame",
  "location_atmosphere",
] as const satisfies readonly CosmeticCategory[];

export const COSMETIC_CATEGORY_SET =
  new Set<string>(COSMETIC_CATEGORIES);

export const COSMETIC_LABELS:
  Record<CosmeticCategory, string> = {
  sheet_frame: "Sheet Frame",
  chat_frame: "Location Action Frame",
  portrait_frame: "Portrait Frame",
  profile_background: "Profile Background",
  pm_frame: "Private Message Frame",
  instant_chat_frame: "Instant Chat Frame",
  forum_frame: "Forum Post Frame",
  action_style: "Location Action Style",
  nameplate: "Nameplate",
  profile_crest: "Profile Crest / Sigil",
  action_flourish: "Action Flourish",
  whisper_style: "Whisper Veil",
  header_control_frame: "Header Control Frame",
  left_panel_frame: "Left Panel Frame",
  right_panel_frame: "Right Panel Frame",
  centre_panel_frame: "Centre Panel Frame",
  location_frame: "Location Frame",
  location_atmosphere: "Location Atmosphere",
};

export const COSMETIC_PREFERENCE_COLUMN:
  Record<CosmeticCategory, string> = {
  sheet_frame: "equipped_sheet_frame_id",
  chat_frame: "equipped_chat_frame_id",
  portrait_frame: "equipped_portrait_frame_id",
  profile_background: "equipped_profile_background_id",
  pm_frame: "equipped_pm_frame_id",
  instant_chat_frame: "equipped_instant_chat_frame_id",
  forum_frame: "equipped_forum_frame_id",
  action_style: "equipped_action_style_id",
  nameplate: "equipped_nameplate_id",
  profile_crest: "equipped_profile_crest_id",
  action_flourish: "equipped_action_flourish_id",
  whisper_style: "equipped_whisper_style_id",
  header_control_frame: "equipped_header_control_frame_id",
  left_panel_frame: "equipped_left_panel_frame_id",
  right_panel_frame: "equipped_right_panel_frame_id",
  centre_panel_frame: "equipped_centre_panel_frame_id",
  location_frame: "equipped_location_frame_id",
  location_atmosphere: "equipped_location_atmosphere_id",
};

export function isCosmeticCategory(
  value: string,
): value is CosmeticCategory {
  return COSMETIC_CATEGORY_SET.has(value);
}
