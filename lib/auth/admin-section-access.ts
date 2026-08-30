export type StaffRole =
  | "owner"
  | "admin"
  | "moderator"
  | "master";

export type AdminSection =
  | "overview"
  | "races"
  | "areas"
  | "associations"
  | "codex"
  | "characters"
  | "events"
  | "expertise"
  | "gifts"
  | "items"
  | "jobs"
  | "market"
  | "forum"
  | "communication_logs"
  | "character_logs"
  | "safety"
  | "rooms"
  | "orders"
  | "rules"
  | "shapes"
  | "tidings"
  | "trophies"
  | "tickets"
  | "sanctions"
  | "media"
  | "missions"
  | "notifications"
  | "users"
  | "new_register"
  | "house_of_chances"
  | "gathering"
  | "world";

export const ADMIN_SECTION_ROLES: Record<
  AdminSection,
  readonly StaffRole[]
> = {
  overview: ["owner"],
  races: ["owner"],
  areas: ["owner"],
  associations: ["owner"],
  codex: ["owner", "admin"],
  characters: ["owner", "admin", "moderator", "master"],
  events: ["owner", "admin", "master"],
  expertise: ["owner", "admin", "master"],
  gifts: ["owner"],
  items: ["owner"],
  jobs: ["owner"],
  market: ["owner", "admin"],
  forum: ["owner", "admin", "moderator"],
  communication_logs: ["owner", "admin", "moderator"],
  character_logs: ["owner", "admin", "moderator"],
  safety: ["owner"],
  rooms: ["owner"],
  orders: ["owner"],
  rules: ["owner"],
  shapes: ["owner"],
  tidings: ["owner", "admin", "moderator", "master"],
  trophies: ["owner"],
  tickets: ["owner", "admin", "moderator", "master"],
  sanctions: ["owner", "admin", "moderator"],
  media: ["owner"],
  missions: ["owner", "admin"],
  notifications: ["owner", "admin", "master"],
  users: ["owner", "admin"],
  new_register: ["owner"],
  house_of_chances: ["owner", "admin"],
  gathering: ["owner", "admin"],
  world: ["owner", "admin", "master"],
};

export function canAccessAdminSection(
  role: StaffRole,
  section: AdminSection,
): boolean {
  return ADMIN_SECTION_ROLES[section].includes(role);
}
