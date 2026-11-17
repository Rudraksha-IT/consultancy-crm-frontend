/** The fixed Roles a Staff member can have; values match the API. */
export const Role = {
  Admin: "admin",
  Counsellor: "counsellor",
  FrontDesk: "front_desk",
  Teacher: "teacher",
} as const;

export type Role = (typeof Role)[keyof typeof Role];

export const ROLES = Object.values(Role);

/** How each Role is named on screen. */
export const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  counsellor: "Counsellor",
  front_desk: "Front Desk",
  teacher: "Teacher",
};
