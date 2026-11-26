"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

import { datesText } from "@/components/features/clock/WorkFromHomeRows";
import { Button } from "@/components/ui/Button";
import { NOTIFICATION_TEXT, NotificationKind } from "@/constants/notifications";
import { ROUTES } from "@/constants/routes";
import type { AppNotification } from "@/lib/api";

import { useDates } from "./dateDisplay";
import type { Notifications } from "./useNotifications";

type NotificationsPanelProps = {
  notifications: Notifications;
  onClose: () => void;
};

/** The open bell: newest first, unread ones marked with a dot and the word "Unread". */
export function NotificationsPanel({ notifications, onClose }: NotificationsPanelProps) {
  const { state, unreadCount, hasMarkFailed, markAllRead, markRead } = notifications;
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  return (
    <div
      ref={panelRef}
      tabIndex={-1}
      role="dialog"
      aria-label={NOTIFICATION_TEXT.title}
      className="rounded-panel border-rule bg-paper shadow-lift phone:inset-x-auto phone:right-0 phone:w-popover absolute inset-x-4 top-full z-20 mt-3 overflow-hidden border"
    >
      <header className="border-rule flex items-center justify-between gap-3 border-b px-5 py-3">
        <h3 className="text-card-title">{NOTIFICATION_TEXT.title}</h3>
        <Button
          variant="ghost"
          size="sm"
          isDisabled={unreadCount === 0}
          onClick={() => {
            void markAllRead();
          }}
        >
          {NOTIFICATION_TEXT.markAllRead}
        </Button>
      </header>
      {hasMarkFailed && (
        <p role="alert" className="text-bad border-rule border-b px-5 py-3">
          {NOTIFICATION_TEXT.markFailed}
        </p>
      )}
      <PanelBody
        state={state}
        onOpenStudent={(item) => {
          if (!item.isRead) markRead(item.id);
          onClose();
        }}
      />
    </div>
  );
}

function PanelBody({
  state,
  onOpenStudent,
}: {
  state: Notifications["state"];
  onOpenStudent: (item: AppNotification) => void;
}) {
  if (state.status === "loading") return null;
  if (state.status === "failed") {
    return (
      <p role="alert" className="text-ink-2 px-5 py-4">
        {NOTIFICATION_TEXT.loadFailed}
      </p>
    );
  }
  const items = state.page.notifications;
  if (items.length === 0) {
    return <p className="text-ink-2 px-5 py-4">{NOTIFICATION_TEXT.nothingNew}</p>;
  }
  return (
    <ul className="max-h-popover-list overflow-auto">
      {items.map((item) => (
        <NotificationItem key={item.id} item={item} onOpenStudent={onOpenStudent} />
      ))}
    </ul>
  );
}

function NotificationItem({
  item,
  onOpenStudent,
}: {
  item: AppNotification;
  onOpenStudent: (item: AppNotification) => void;
}) {
  const dates = useDates();
  return (
    <li className="border-rule relative grid gap-1 border-b py-4 pr-5 pl-10 last:border-b-0">
      <Words item={item} />
      <span className="text-small text-ink-3 flex flex-wrap items-center gap-x-3">
        {dates.dateTime(item.createdAt)}
        <OpenLink
          item={item}
          onOpen={() => {
            onOpenStudent(item);
          }}
        />
      </span>
    </li>
  );
}

/** What happened; an unread one has a dot and the word "Unread" for screen readers. */
function Words({ item }: { item: AppNotification }) {
  const dates = useDates();
  const words = wordsFor(item, dates.date);
  if (item.isRead) return <span className="break-words">{words}</span>;
  return (
    <>
      <span
        aria-hidden="true"
        className="bg-accent size-dot absolute top-6 left-4.5 rounded-full"
      />
      <span className="font-semibold break-words">
        <span className="sr-only">{NOTIFICATION_TEXT.unread} </span>
        {words}
      </span>
    </>
  );
}

/** The sentence: who did it, and what about (a Task's title, a Student's name, or the dates). */
function wordsFor(item: AppNotification, date: (iso: string) => string): string {
  const by = item.by === null ? "" : item.by.name;
  const words = NOTIFICATION_TEXT.message[item.kind](by, subjectOf(item, date));
  if (item.kind !== NotificationKind.BinAdded || item.bin === null) return words;
  return words + NOTIFICATION_TEXT.inTheBinBecause(item.bin.reason);
}

function subjectOf(item: AppNotification, date: (iso: string) => string): string {
  if (item.task !== null) return item.task.title;
  if (item.workFromHome !== null) return datesText(item.workFromHome, date);
  if (item.bin !== null) return binSubject(item.bin.item, item.student);
  return item.student === null ? "" : item.student.name;
}

/** "page-2.pdf of Passport (Sita Gurung)". */
function binSubject(binItem: string, student: AppNotification["student"]): string {
  return NOTIFICATION_TEXT.binItem(binItem, student === null ? "" : student.name);
}

/** Where the notification leads: its Student, or where the Work From Home dates are. */
function OpenLink({ item, onOpen }: { item: AppNotification; onOpen: () => void }) {
  const target = targetOf(item);
  if (target === null) return null;
  return (
    <Link
      href={target.href}
      onClick={onOpen}
      className="text-accent min-h-control inline-flex items-center font-semibold underline"
    >
      {target.label}
    </Link>
  );
}

function targetOf(item: AppNotification): { href: string; label: string } | null {
  if (item.student !== null) {
    return { href: ROUTES.student(item.student.id), label: NOTIFICATION_TEXT.openStudent };
  }
  if (item.workFromHome === null) return null;
  const href =
    item.kind === NotificationKind.WorkFromHomeAsked
      ? ROUTES.employeeWorkFromHome(item.workFromHome.staffId)
      : ROUTES.clockWorkFromHome;
  return { href, label: NOTIFICATION_TEXT.open };
}
