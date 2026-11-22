/** Configuration → Office network (spec 104-105, issue 55). Say "internet address", never "IP". */
/** How often the Admin's dialog checks the network while the tab is shown (spec 16). */
export const OFFICE_NETWORK_CHECK_MS = 60 * 60 * 1000;

export const OFFICE_NETWORK_TEXT = {
  title: "Office network",
  help: "Staff can clock in and out only from these internet connections. Add the office wifi while you're at the office. No location is ever recorded.",
  listLabel: "Office networks",
  none: "No office network yet. Nobody can clock in until you add one.",
  loading: "Loading the office network…",
  loadFailed: "We couldn't load the office network. Please try again.",
  remove: "Remove",
  removeFor: (label: string) => `Remove ${label}`,
  removeTitle: (label: string) => `Remove ${label}?`,
  removeBody: (network: string) =>
    `Staff on ${network} won't be able to clock in from it any more. You can add it again later.`,
  removed: (label: string) => `${label} removed`,
  removeFailed: "We couldn't remove it. Please try again.",
  yourAddress: "Your internet address right now:",
  addressUnknown: "We can't see your internet address right now, so it can't be added from here.",
  alreadyListed: "Already on the list",
  addHere: "Add the network I'm on now",
  /** On IPv4 the one address the office shares; on IPv6 its /64 group (first live fixes, 3). */
  adds: (network: string) => `Adds ${network}: every device on this Wi-Fi.`,
  hereLabel: "Office network",
  addedHere: "Added. Staff on this connection can now clock in.",
  nameLabel: "Name",
  namePlaceholder: "For example, Second floor wifi",
  enterName: "Give the network a name.",
  addressLabel: "Internet address",
  addressPlaceholder: "110.44.115.82",
  enterAddress: "Enter the internet address, for example 110.44.115.82.",
  addressHint: (ipv4WidestPrefix: number) =>
    `One address, or a small range such as 110.44.115.0/${String(ipv4WidestPrefix)}.`,
  add: "Add network",
  added: (label: string) => `${label} added`,
  saveFailed: "We couldn't add the network. Please try again.",
  /** The Admin's dialog over any page when their network isn't saved (first live fixes, 10). */
  askTitle: "This network isn't on your office list",
  askOnlySaved: "Staff can clock in only from saved networks.",
  askAnyoneBefore: "Adding it lets ",
  askAnyone: "anyone on this network",
  askAnyoneAfter: " clock in and out.",
  askOnlyIf:
    "Only add it if Staff should clock in from here. If it isn't the office network, don't add it.",
  askAdd: "Add this network",
  askNotNow: "Not now",
  staticHelp: (maxNetworks: number) =>
    `Ask your internet provider for a fixed (static) address. If it changes, add the new one here. Phones on mobile data can't clock in. An office can have up to ${String(maxNetworks)} networks.`,
} as const;
