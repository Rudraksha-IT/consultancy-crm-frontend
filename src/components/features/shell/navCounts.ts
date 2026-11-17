"use client";

import { INBOX_TEXT } from "@/constants/inbox";
import { ROUTES } from "@/constants/routes";
import { TASK_TEXT } from "@/constants/tasks";
import { TRANSFER_TEXT } from "@/constants/transferRequests";

import { useInboxCheck } from "./inboxCheck";
import { useTransferCount } from "./menuCount";
import { useTaskCount } from "./taskCount";

/** Something waiting behind a menu link: a number, and its meaning for screen readers. */
export type Waiting = { count: number; label: string };

/** What waits behind the menu's links, shared by the sidebar and the phone tab bar. */
export function useNavCounts(): Partial<Record<string, Waiting>> {
  const { count: tasksDueNow } = useTaskCount();
  const { count: transfersWaiting } = useTransferCount();
  const { unread: unreadConversations } = useInboxCheck();
  return {
    [ROUTES.tasks]: { count: tasksDueNow, label: TASK_TEXT.dueNowCount(tasksDueNow) },
    [ROUTES.transferRequests]: {
      count: transfersWaiting,
      label: TRANSFER_TEXT.waitingCount(transfersWaiting),
    },
    [ROUTES.inbox]: {
      count: unreadConversations,
      label: INBOX_TEXT.unreadCount(unreadConversations),
    },
  };
}

/** Whether `href` is the open page, or a page under it (a Student under Students). */
export function isCurrentPage(href: string, pathname: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
