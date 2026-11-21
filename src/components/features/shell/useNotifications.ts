"use client";

import type { RecordId } from "@/lib/recordId";
import { useCallback, useEffect, useRef, useState } from "react";

import { NOTIFICATIONS_REFRESH_MS } from "@/constants/notifications";
import {
  fetchNotifications,
  markAllNotificationsRead,
  setNotificationRead,
  type NotificationPage,
} from "@/lib/api";

export type NotificationsState =
  { status: "loading" } | { status: "loaded"; page: NotificationPage } | { status: "failed" };

export type Notifications = {
  state: NotificationsState;
  /** How many are unread; 0 until they've loaded. */
  unreadCount: number;
  /** Whether marking all as read just failed. */
  hasMarkFailed: boolean;
  reload: () => void;
  markAllRead: () => Promise<void>;
  markRead: (id: RecordId) => void;
};

/**
 * My notifications, asked for when the shell opens and every minute after. Asking is also how
 * the server notices Tasks that fell due (spec 80). A failed refresh keeps the last list.
 */
export function useNotifications(): Notifications {
  const [state, setState] = useState<NotificationsState>({ status: "loading" });
  const [hasMarkFailed, setHasMarkFailed] = useState(false);
  const isMounted = useRef(true);

  const reload = useCallback(() => {
    void (async () => {
      try {
        const page = await fetchNotifications();
        if (isMounted.current) setState({ status: "loaded", page });
      } catch {
        if (isMounted.current) {
          setState((current) => (current.status === "loaded" ? current : { status: "failed" }));
        }
      }
    })();
  }, []);

  useEffect(() => {
    isMounted.current = true;
    reload();
    const timer = setInterval(reload, NOTIFICATIONS_REFRESH_MS);
    return () => {
      isMounted.current = false;
      clearInterval(timer);
    };
  }, [reload]);

  const markAllRead = useCallback(async () => {
    setHasMarkFailed(false);
    try {
      await markAllNotificationsRead();
    } catch {
      setHasMarkFailed(true);
      return;
    }
    reload();
  }, [reload]);

  const markRead = useCallback(
    (id: RecordId) => {
      void (async () => {
        try {
          await setNotificationRead(id, true);
          reload();
        } catch {
          // It stays unread; the next refresh shows it as it is.
        }
      })();
    },
    [reload],
  );

  return {
    state,
    unreadCount: state.status === "loaded" ? state.page.unreadCount : 0,
    hasMarkFailed,
    reload,
    markAllRead,
    markRead,
  };
}
