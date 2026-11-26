"use client";

import clsx from "clsx";
import Link from "next/link";
import { useId } from "react";

import { formatAppointment } from "@/components/features/visas/appointmentWhen";
import { useDates } from "@/components/features/shell/dateDisplay";
import { Icon, type IconName } from "@/components/ui/Icon";
import { HOME_TEXT } from "@/constants/home";
import { ROUTES } from "@/constants/routes";
import { APPOINTMENT_LABELS, AppointmentWhen } from "@/constants/visas";
import { fetchWaiting, type Waiting } from "@/lib/api";

import { useLoaded } from "./useLoaded";

const DOCUMENTS_HREF = `${ROUTES.documents}?waiting=true`;
const APPOINTMENTS_HREF = `${ROUTES.visas}?appointment=${AppointmentWhen.NextWeek}`;
/** How many visa appointments a card names under its words. */
const APPOINTMENTS_NAMED = 2;

/**
 * What's waiting for a Counsellor or Admin (spec 22a1), as cards to act on (UI revamp 07): each
 * has an icon in a soft round, how many, what, and an arrow, and opens where the work is. Amber
 * for what needs an answer (Documents to check, Work From Home requests, Transfer Requests); grey
 * for the Bin and for a Counsellor's Visa appointments in the next 7 days. Only what is waiting
 * shows: with nothing waiting, or when it can't load, the row is not there (the rest of the Home
 * still works). Computers and tablets: cards side by side, wrapping. Phones: one sheet with a row
 * for each.
 */
export function WaitingRow() {
  const waiting = useLoaded(fetchWaiting, 0);
  const dates = useDates();
  if (waiting.status !== "loaded") return null;
  const cards = waitingCards(waiting.data, dates.date).filter((card) => card.count > 0);
  if (cards.length === 0) return null;
  return (
    <section
      aria-label={HOME_TEXT.waitingForYou}
      className={clsx(
        "grid min-w-0",
        "phone:grid-cols-[repeat(auto-fit,minmax(var(--spacing-todo),1fr))] phone:gap-3",
        "max-phone:rounded-panel max-phone:border-sheet-rule max-phone:bg-paper max-phone:divide-rule max-phone:divide-y max-phone:overflow-hidden max-phone:border",
      )}
    >
      {cards.map((card) => (
        <WaitingCard key={card.href} card={card} />
      ))}
    </section>
  );
}

type Card = {
  count: number;
  /** What waits, after the count: "documents to check". */
  what: string;
  icon: IconName;
  href: string;
  /** Amber: someone is held up until this is answered. Quiet: worth a look. */
  tone: "warn" | "quiet";
  /** A short line under the words, e.g. the first appointments. */
  more?: string;
};

const ICON_TONES = { warn: "bg-warn-tint text-warn", quiet: "bg-fill text-ink-2" } as const;

/** One card; its name for screen readers is the whole phrase, "2 documents to check". */
function WaitingCard({ card }: { card: Card }) {
  const moreId = useId();
  return (
    <Link
      href={card.href}
      aria-label={HOME_TEXT.waitingCard(card.count, card.what)}
      aria-describedby={card.more === undefined ? undefined : moreId}
      className={clsx(
        "group text-ink flex min-w-0 items-center no-underline",
        "phone:min-h-todo-card phone:gap-3.5 phone:rounded-panel phone:border-sheet-rule phone:bg-paper phone:shadow-raise phone:hover:border-accent phone:border phone:py-3 phone:pr-3.5 phone:pl-4",
        "max-phone:min-h-todo-row max-phone:active:bg-fill max-phone:gap-3 max-phone:py-2.5 max-phone:pr-3 max-phone:pl-3.5",
      )}
    >
      <span
        data-todo-icon=""
        aria-hidden="true"
        className={clsx(
          "size-todo-icon max-phone:size-todo-icon-sm grid flex-none place-items-center rounded-full",
          ICON_TONES[card.tone],
        )}
      >
        <Icon name={card.icon} />
      </span>
      <span className="grid min-w-0 flex-1 gap-0.5">
        <span className="flex min-w-0 items-baseline gap-2">
          <b className="text-todo-count tabular-nums">{card.count}</b>
          <span className="text-secondary text-ink-2 min-w-0 font-medium">{card.what}</span>
        </span>
        {card.more !== undefined && (
          <span id={moreId} className="text-small text-ink-3 truncate">
            {card.more}
          </span>
        )}
      </span>
      <span aria-hidden="true" className="text-ink-3 group-hover:text-accent grid flex-none">
        <Icon name="right" />
      </span>
    </Link>
  );
}

function waitingCards(waiting: Waiting, date: (iso: string) => string): Card[] {
  const { waiting: words } = HOME_TEXT;
  return [
    {
      count: waiting.documents,
      what: words.documents(waiting.documents),
      icon: "file",
      href: DOCUMENTS_HREF,
      tone: "warn",
    },
    {
      count: waiting.workFromHome.count,
      what: words.workFromHome(waiting.workFromHome.count),
      icon: "home",
      href:
        waiting.workFromHome.firstStaffId === null
          ? ROUTES.staff
          : ROUTES.employeeWorkFromHome(waiting.workFromHome.firstStaffId),
      tone: "warn",
    },
    {
      count: waiting.transferRequests,
      what: words.transfers(waiting.transferRequests),
      icon: "transfer",
      href: ROUTES.transferRequests,
      tone: "warn",
    },
    {
      count: waiting.inBin,
      what: words.inBin(waiting.inBin),
      icon: "trash",
      href: ROUTES.documentsBin,
      tone: "quiet",
    },
    appointmentsCard(waiting, date),
  ];
}

/** A Counsellor's Visa appointments in the next 7 days, the first two named under the words. */
function appointmentsCard(waiting: Waiting, date: (iso: string) => string): Card {
  const named = waiting.appointments
    .slice(0, APPOINTMENTS_NAMED)
    .map((appointment) =>
      HOME_TEXT.appointmentLine(
        appointment.student.name,
        APPOINTMENT_LABELS[appointment.kind],
        formatAppointment(appointment.at, date),
      ),
    );
  const more = waiting.appointmentCount - named.length;
  return {
    count: waiting.appointmentCount,
    what: HOME_TEXT.waiting.appointments(waiting.appointmentCount),
    icon: "plane",
    href: APPOINTMENTS_HREF,
    tone: "quiet",
    more: named.join(HOME_TEXT.appointmentsJoin) + (more > 0 ? HOME_TEXT.andMore(more) : ""),
  };
}
