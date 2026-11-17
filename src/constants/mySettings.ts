/** A person's own Settings (issue 38): their sections, choices and words on screen. */

/** Light, dark, or (until the person chooses) the same as their device. */
export const COLOUR_MODE_CHOICES = ["device", "light", "dark"] as const;
export type ColourModeChoice = (typeof COLOUR_MODE_CHOICES)[number];

/** The emails a person can choose to get, in the order they are shown. */
export const NOTIFICATION_CHOICES = ["taskGiven", "taskDueTomorrow", "morningSummary"] as const;
export type NotificationChoice = (typeof NOTIFICATION_CHOICES)[number];

export const NOTIFICATION_LABELS: Record<NotificationChoice, string> = {
  taskGiven: "Email me when someone gives me a task",
  taskDueTomorrow: "Email me when a task is due tomorrow",
  morningSummary: "Send me a short summary every morning",
};

/** The section menu, one section shown at a time. */
export const MY_SETTINGS_SECTIONS = [
  "details",
  "password",
  "twoFactor",
  "notifications",
  "preferences",
  "devices",
] as const;
export type MySettingsSection = (typeof MY_SETTINGS_SECTIONS)[number];

export const MY_SETTINGS_TEXT = {
  title: "Settings",
  intro: "Your own details and preferences. Office-wide settings are under Configuration.",
  menu: "Settings",
  backLabel: "All of Settings",
  sections: {
    details: { title: "My Details", help: "How you appear to the rest of the office." },
    password: {
      title: "Password",
      help: "Change it any time. Other devices are signed out when you do.",
    },
    // Issue 62: my own authenticator app.
    twoFactor: {
      title: "Two-step login",
      help: "After your password, you also enter a number from an authenticator app on your phone, so a stolen password alone can't open your account.",
    },
    notifications: { title: "Notifications", help: "Which emails the app sends you." },
    // Asked 2026-11-17: moved here from Configuration, so each person chooses for themselves.
    preferences: { title: "Preferences", help: "How the app behaves for you." },
    devices: {
      title: "Signed-in devices",
      help: "Where your account is logged in, and the last few places you logged out.",
    },
  } satisfies Record<MySettingsSection, { title: string; help: string }>,
  // My Details labels are in Title Case, as the prototype shows them.
  fullName: "Full Name",
  jobTitle: "Job Title",
  role: "Role",
  mobileNumber: "Mobile Number",
  workEmail: "Work Email",
  joinedOn: "Joined On",
  none: "—",
  editDetails: "Edit details",
  saveDetails: "Save details",
  detailsSaved: "Details saved",
  setByAdmin: (email: string) => `${email}. Job title, role and work email are set by an Admin.`,
  enterName: "Enter your name.",
  currentPassword: "Current password",
  changePassword: "Change password",
  passwordChanged: "Password changed. Other devices have been signed out.",
  enterCurrentPassword: "Enter your current password.",
  wrongCurrentPassword: "That isn't your current password.",
  forgotIt: "Forgot it? Log out and choose “Forgot your password?” to get a code by email.",
  saved: "Saved",
  thisBrowser: "This browser",
  youreHere: "You're here",
  signedInOn: (signedIn: string, lastUsed: string) =>
    `Logged in ${signedIn}, last used ${lastUsed}`,
  loggedOutOn: (day: string) => `Logged out on ${day}`,
  noOtherDevices: "You aren't logged in anywhere else.",
  signOutOthers: "Sign out of other devices",
  signedOutOthers: "Signed out of every other device",
  loadFailed: "Your settings couldn't be loaded. Try again in a moment.",
  saveFailed: "That didn't save. Try again in a moment.",
} as const;
