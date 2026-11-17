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
  intro: "How the product itself looks before anyone logs in.",
  logoTitle: "Product logo",
  logoHelp:
    "Shown on the Platform login, the Central login and at the top of the Platform. A square or wide PNG, SVG or JPG works best.",
} as const;
