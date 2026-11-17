"use client";

import clsx from "clsx";
import Link from "next/link";

import { useDates } from "@/components/features/shell/dateDisplay";
import { useCurrentStaff } from "@/components/features/shell/useCurrentStaff";
import { Icon } from "@/components/ui/Icon";
import { Panel } from "@/components/ui/Panel";
import { RowItem } from "@/components/ui/RowItem";
import { RowList } from "@/components/ui/RowList";
import { Section } from "@/components/ui/Section";
import { ATTENDANCE_MARK_LABELS, AttendanceMark, BATCH_TEXT } from "@/constants/batches";
import { ROUTES } from "@/constants/routes";
import type { StudentClass } from "@/lib/api";

import { canSeeClasses } from "./canUseClasses";

const DOT_CLASSES: Record<AttendanceMark | "none", string> = {
  present: "bg-good",
  absent: "bg-bad",
  late: "bg-warn",
  leave: "bg-accent",
  none: "bg-fill-2",
};

/** The order marks are counted in words: attended first. */
const COUNTED: readonly AttendanceMark[] = [
  AttendanceMark.Present,
  AttendanceMark.Late,
  AttendanceMark.Absent,
  AttendanceMark.Leave,
];

type RecentDays = StudentClass["recentDays"];

/** E.g. "Last 4 class days: 1 present, 1 late, 1 absent, 1 not marked"; the dots' words. */
export function recentDaysText(days: RecentDays): string {
  const parts = COUNTED.map((mark) => {
    const count = days.filter((day) => day.mark === mark).length;
    return count === 0
      ? null
      : BATCH_TEXT.markCount(count, ATTENDANCE_MARK_LABELS[mark].toLowerCase());
  }).filter((part) => part !== null);
  const unmarked = days.filter((day) => day.mark === null).length;
  if (unmarked > 0) parts.push(BATCH_TEXT.markCount(unmarked, BATCH_TEXT.notMarked.toLowerCase()));
  return BATCH_TEXT.recentDays(days.length, parts);
}

/**
 * The classes a Student is in (spec 86): the share of class days attended and their latest class
 * days, as coloured marks with the same told in words. Only those who can open classes get links.
 */
export function StudentClasses({ classes }: { classes: readonly StudentClass[] }) {
  const linksClasses = canSeeClasses(useCurrentStaff());
  return (
    <Section title={BATCH_TEXT.classesHeading}>
      <Panel>
        <RowList label={BATCH_TEXT.classesHeading}>
          {classes.map((entry) => (
            <RowItem
              key={entry.id}
              title={
                linksClasses ? (
                  <Link
                    href={ROUTES.batch(entry.id)}
                    className="text-accent min-h-control inline-flex items-center hover:underline"
                  >
                    {entry.name}
                  </Link>
                ) : (
                  entry.name
                )
              }
              meta={
                <span className="inline-flex items-center gap-2">
                  <Icon name="clock" size="sm" />
                  {entry.timeSlot}
                </span>
              }
              right={<Share percent={entry.attendedPercent} />}
            >
              <RecentDayMarks days={entry.recentDays} />
            </RowItem>
          ))}
        </RowList>
      </Panel>
    </Section>
  );
}

function RecentDayMarks({ days }: { days: RecentDays }) {
  const dates = useDates();
  if (days.length === 0) {
    return <p className="text-secondary text-ink-2">{BATCH_TEXT.noAttendance}</p>;
  }
  return (
    <div className="mt-2 grid gap-2">
      <div aria-hidden="true" className="flex gap-1">
        {days.map(({ day, mark }) => (
          <i
            key={day}
            title={`${dates.date(day)}: ${mark === null ? BATCH_TEXT.notMarked : ATTENDANCE_MARK_LABELS[mark]}`}
            className={clsx("rounded-chip h-5.5 w-3", DOT_CLASSES[mark ?? "none"])}
          />
        ))}
      </div>
      <p className="text-small text-ink-2">{recentDaysText(days)}</p>
    </div>
  );
}

function Share({ percent }: { percent: number | null }) {
  return (
    <div className="grid justify-items-end text-right">
      <span className="text-page-title tabular-nums">
        {percent === null ? BATCH_TEXT.noShare : BATCH_TEXT.percent(percent)}
      </span>
      <span className="text-small text-ink-2">{BATCH_TEXT.classesAttended}</span>
    </div>
  );
}
