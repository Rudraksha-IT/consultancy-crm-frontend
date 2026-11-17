/** The longest Inbox message, in characters (spec 129). */
export const INBOX_MESSAGE_MAX_LENGTH = 2000;

/** How often the app checks for new Inbox messages while the tab is shown (spec 129). */
export const INBOX_CHECK_MS = 30_000;

/** Everything the Inbox says on screen. Glossary: Inbox, never chat, messages or DMs. */
export const INBOX_TEXT = {
  title: "Inbox",
  intro:
    "Messages between you and one other person in the office. Only the two of you can read them.",
  platformAdmin: "Staff messages are private to the two people. Platform Admins can't read them.",
  newMessage: "New message",
  newMessageTitle: "New message",
  to: "To",
  toHint: "Anyone in the office, whatever their Role. Only the two of you can read it.",
  nobodyToWrite: "There is nobody else in the office to write to yet.",
  openConversation: "Open conversation",
  conversationsLabel: "Conversations",
  noConversations: "No conversations yet.",
  pickConversation: "Pick a conversation, or start a new one.",
  backToConversations: "Back to conversations",
  sayHello: (firstName: string) => `Say hello to ${firstName}.`,
  you: "You: ",
  hasLeft: "(has left)",
  hasLeftFoot: (name: string) => `${name} has left. You can read past messages, but not write.`,
  unread: "Unread",
  olderLeftOut: "Only the newest 200 messages are shown.",
  messageTo: (name: string) => `Message to ${name}`,
  placeholder: "Write a message",
  characters: (count: number) =>
    `${count.toLocaleString("en")} of ${INBOX_MESSAGE_MAX_LENGTH.toLocaleString("en")}`,
  keysHint: "Enter sends, Shift + Enter for a new line.",
  send: "Send",
  sending: "Sending…",
  tooLong: `Up to ${INBOX_MESSAGE_MAX_LENGTH.toLocaleString("en")} characters.`,
  sendFailed: "The message wasn't sent. Try again.",
  loadFailed: "The Inbox couldn't be loaded. Try again in a moment.",
  conversationFailed: "This conversation couldn't be loaded. Try again in a moment.",
  notFound: "This person isn't in the office.",
  footnote:
    "New messages show within about 30 seconds while this page is open. Plain text only, up to 2,000 characters. Messages can't be edited or deleted.",
  unreadCount: (count: number) =>
    count === 1
      ? "1 conversation with unread messages"
      : `${String(count)} conversations with unread messages`,
} as const;
