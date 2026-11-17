/** The Platform Admin's own Account page (issue 59): its words on screen. */

export const PLATFORM_ACCOUNT_TEXT = {
  title: "Account",
  intro: "Your own name, email, password and two-step login on the Platform.",
  openAccount: "Account",
  backLabel: "All of Account",
  details: {
    title: "My details",
    help: "Your name shows in the History of any office you change as Platform Admin.",
  },
  password: {
    title: "Password",
    help: "Change it any time. Your other sessions are signed out when you do.",
  },
  name: "Name",
  email: "Email",
  currentPassword: "Current password",
  saveDetails: "Save details",
  detailsSaved: "Details saved",
  emailCantChange: "Your email can't be changed here.",
  changePassword: "Change password",
  passwordChanged: "Password changed. Your other sessions have been signed out.",
  enterName: "Enter your name.",
  enterCurrentPassword: "Enter your current password.",
  wrongCurrentPassword: "That isn't your current password.",
  tooManyTries: "Too many wrong passwords. Wait 15 minutes, then try again.",
  nothingChanged: "Nothing to save: your name is as it was.",
  saveFailed: "We couldn't save that. Please try again.",
} as const;
