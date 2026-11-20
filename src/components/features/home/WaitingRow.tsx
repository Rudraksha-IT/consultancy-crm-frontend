"use client";

import type { ReactNode } from "react";

import { formatAppointment } from "@/components/features/visas/appointmentWhen";
import { useDates } from "@/components/features/shell/dateDisplay";
import { FigureTile } from "@/components/ui/FigureTile";
import type { IconName } from "@/components/ui/Icon";
import { BIN_TEXT } from "@/constants/documents";
import { HOME_TEXT } from "@/constants/home";
import { ROUTES } from "@/constants/routes";
import { APPOINTMENT_LABELS, AppointmentWhen } from "@/constants/visas";
import { WORK_FROM_HOME_TEXT } from "@/constants/workFromHome";
import { fetchWaiting, type Waiting } from "@/lib/api";

import { useLoaded } from "./useLoaded";

const DOCUMENTS_HREF = `${ROUTES.documents}?waiting=true`;
const APPOINTMENTS_HREF = `${ROUTES.visas}?appointment=${AppointmentWhen.NextWeek}`;

/**
 * What's waiting on a Counsellor or Admin (spec 22a1): Documents to check, the Bin and Work From
 * Home requests (Admins), Transfer Requests to answer and a Counsellor's Visa appointments in the
 * next 7 days. Each opens its list already
 * filtered; an item with nothing waiting is hidden, and so is the row when nothing waits or it
 * can't load (the rest of the Home still works). On a phone the tiles sit two per row and the visa
 * appointments, with their list, take the whole row.
 */
export function WaitingRow() {
  const waiting = useLoaded(fetchWaiting, 0);
  if (waiting.status !== "loaded") return null;
  const items = waitingItems(waiting.data).filter((item) => item.count > 0);
  if (items.length === 0) return null;
  return (
    <section
      aria-label={HOME_TEXT.waitingOnYou}
      className="tablet:grid-flow-col tablet:auto-cols-fr max-phone:grid-cols-2 max-phone:gap-2 max-phone:[&>:has(ul)]:col-span-2 grid gap-4"
    >
      {items.map((item) => (
        <FigureTile
          key={item.href}
          label={item.label}
          value={item.count}
          icon={item.icon}
          tone={item.tone}
          href={item.href}
        >
          {item.details}
        </FigureTile>
      ))}
    </section>
  );
}

type WaitingItem = {
  label: string;
  count: number;
  icon: IconName;
  href: string;
  /** Work someone is held up on is shown in the warning colour (with its words). */
  tone?: "warn";
  details?: ReactNode;
};

function waitingItems(waiting: Waiting): WaitingItem[] {
  return [
    {
      label: HOME_TEXT.documentsWaiting,
      count: waiting.documents,
      icon: "file",
      href: DOCUMENTS_HREF,
      tone: "warn",
    },
    {
      label: BIN_TEXT.waitingOnHome,
      count: waiting.inBin,
      icon: "trash",
      href: ROUTES.documentsBin,
      tone: "warn",
    },
    {
      label: WORK_FROM_HOME_TEXT.requestsWaiting,
      count: waiting.workFromHome.count,
      icon: "home",
      href:
        waiting.workFromHome.firstStaffId === null
          ? ROUTES.staff
          : ROUTES.employeeWorkFromHome(waiting.workFromHome.firstStaffId),
      tone: "warn",
    },
    {
      label: HOME_TEXT.transfersWaiting,
      count: waiting.transferRequests,
      icon: "transfer",
      href: ROUTES.transferRequests,
      tone: "warn",
    },
    {
      label: HOME_TEXT.appointmentsSoon,
      count: waiting.appointmentCount,
      icon: "plane",
      href: APPOINTMENTS_HREF,
      details: <Appointments waiting={waiting} />,
    },
  ];
}

function Appointments({ waiting }: { waiting: Waiting }) {
  const dates = useDates();
  const more = waiting.appointmentCount - waiting.appointments.length;
  return (
    <ul className="text-secondary text-ink-2 grid list-disc gap-1 pl-5">
      {waiting.appointments.map((appointment) => (
        <li key={`${appointment.visaId}-${appointment.kind}`}>
          {HOME_TEXT.appointmentLine(
            appointment.student.name,
            APPOINTMENT_LABELS[appointment.kind],
            formatAppointment(appointment.at, dates.date),
          )}
        </li>
      ))}
      {more > 0 && <li>{HOME_TEXT.andMore(more)}</li>}
    </ul>
  );
}
