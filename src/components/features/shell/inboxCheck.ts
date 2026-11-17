"use client";

import { createContext, useContext } from "react";

/** The Inbox check, shared by the AppShell: the menu's count, and a sign of new messages. */
export type InboxCheckState = {
  /** Conversations with unread messages: the Inbox menu item's count (never the bell). */
  unread: number;
  /** The newest message's id; when it changes, the Inbox page loads again. */
  latest: number | null;
  /** Check again now, e.g. after reading or sending. */
  refresh: () => void;
};

function doNothing(): void {
  return undefined;
}

export const InboxCheckContext = createContext<InboxCheckState>({
  unread: 0,
  latest: null,
  refresh: doNothing,
});

/** The Inbox check: unread count, newest message id, and a way to check again. */
export function useInboxCheck(): InboxCheckState {
  return useContext(InboxCheckContext);
}
