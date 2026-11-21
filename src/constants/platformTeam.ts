/** The Platform Admins tab (issue 65): its words on screen. */
export const PLATFORM_TEAM_TEXT = {
  title: "Platform Admins",
  intro:
    "Everyone who runs the product. Invite a colleague by email; they choose their own password.",
  add: "Add Platform Admin",
  addTitle: "Add a Platform Admin",
  addIntro:
    "We'll email them a 6-digit code. They use it on the Join page to choose their password.",
  name: "Name",
  email: "Email",
  sendInvite: "Send invite",
  enterName: "Enter their name.",
  enterEmail: "Enter their email.",
  inviteSent: (name: string) => `Invite sent to ${name}`,
  you: "You",
  status: { invited: "Invited, not joined yet", active: "Active", deactivated: "Deactivated" },
  twoStepOn: "Two-step login on",
  twoStepOff: "Two-step login off",
  resend: "Send the code again",
  resent: (name: string) => `A new code is on its way to ${name}`,
  deactivate: "Deactivate",
  cancelInvite: "Cancel invite",
  deactivateTitle: (name: string) => `Deactivate ${name}?`,
  cancelTitle: (name: string) => `Cancel ${name}'s invite?`,
  deactivateWarning:
    "They can't log in any more and are signed out now. Their past changes keep their name.",
  cancelWarning: "Their code stops working. You can invite them again later with Reactivate.",
  reactivate: "Reactivate",
  reactivated: (name: string) => `${name} reactivated`,
  invitedAgain: (name: string) => `${name} is invited again; a new code is on its way`,
  deactivated: (name: string) => `${name} deactivated`,
  inviteCancelled: (name: string) => `${name}'s invite cancelled`,
  loadFailed: "We couldn't load the Platform Admins. Please refresh the page.",
  changeFailed: "We couldn't do that. Please try again.",
} as const;

/** The Platform's Settings tab (issue 65). */
export const PLATFORM_SETTINGS_TEXT = {
  title: "Settings",
  intro: "How the product itself looks before anyone logs in, and whether its email is working.",
  logoTitle: "Product logo",
  logoHelp:
    "Shown on the Platform login, the Central login and at the top of the Platform. A square or wide PNG, SVG or JPG works best.",
} as const;

/** Platform → Settings: is email working? (spec 2026-11-18 stories 3-4, ADR 0023). */
export const PLATFORM_EMAIL_TEXT = {
  title: "Email",
  help: "Every email from every office goes out through the product's own email account. Its details are set only in the server's deploy values, never in the app.",
  statusLabel: "Email:",
  state: { working: "Working", failed: "Last test failed", untested: "Not tested yet" },
  lastSent: (at: string) => `Last test sent ${at}`,
  tried: (at: string) => `Tried ${at}`,
  failed: "The test email couldn't be sent. Check the email values in the deploy.",
  quote: (reference: string) => ` If you ask for help, quote reference ${reference}.`,
  platformEmails: "Platform emails",
  officeEmails: "Office emails",
  sender: (name: string, address: string) => `${name} <${address}>`,
  officeSender: (address: string) =>
    `The office's name <${address}>, with Reply-To the office's contact email`,
  send: "Send a test email",
  sending: "Sending…",
  goesTo: (email: string) => `It goes to you, at ${email}.`,
  sent: (email: string) => `Test email sent to ${email}`,
  sendFailed: "The test email failed",
  tooMany: "Too many test emails. Try again in an hour.",
  notStarted: "The test email couldn't be sent. Try again in a few minutes.",
  loadFailed: "The email status couldn't be loaded.",
} as const;
