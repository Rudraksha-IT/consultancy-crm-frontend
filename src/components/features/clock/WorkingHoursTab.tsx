"use client";

import clsx from "clsx";
import { useCallback, useId, useState } from "react";

import { ExportButton } from "@/components/features/exports/ExportButton";
import { useLoaded } from "@/components/features/home/useLoaded";
import { Avatar } from "@/components/ui/Avatar";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { Panel } from "@/components/ui/Panel";
import { PanelFoot } from "@/components/ui/PanelFoot";
import { Section } from "@/components/ui/Section";
import { CLOCK_TEXT as TEXT } from "@/constants/clock";
import { EXPORT_LIST_LABELS } from "@/constants/exports";
import {
  fetchTeamMonth,
  fetchTeamNow,
  type OfficeNetworkState,
  type PersonNow,
  type TeamMonth,
  type TeamMonthRow,
  type TeamNow,
} from "@/lib/api";
import { durationText, hoursText, officeTime } from "@/lib/clock";
import { describeFilters } from "@/lib/exports";
import { formatMonth, todayIso } from "@/lib/dates";

import { StaffMonthDialog } from "./CorrectDayDialogs";
import { MonthPicker } from "./MonthPicker";

const MONTH_LENGTH = 7;

type Person = { id: number; name: string };

/**
 * Employees → Working hours (spec 107-108), for Admins and a Platform Admin: who's in now, then
 * everyone's month with its export, both on one page (no switch between them, asked 2026-11-16).
 * Each person's month opens, and a day short of the Working Day or missing a clock-out can be
 * corrected there.
 */
export function WorkingHoursTab() {
  const [month, setMonth] = useState(() => todayIso().slice(0, MONTH_LENGTH));
  const [person, setPerson] = useState<{ person: Person; month: string } | null>(null);
  const [version, setVersion] = useState(0);
  const open = (chosen: Person, inMonth: string) => {
    setPerson({ person: chosen, month: inMonth });
  };
  return (
    <div className="grid gap-8">
      <Section title={TEXT.whoIsIn}>
        <WhoIsInNow version={version} />
      </Section>
      <Section title={TEXT.byMonth}>
        <ByMonth
          month={month}
          onMonth={setMonth}
          version={version}
          onOpen={(chosen) => {
            open(chosen, month);
          }}
        />
      </Section>
      {person !== null && (
        <StaffMonthDialog
          staffId={person.person.id}
          name={person.person.name}
          month={person.month}
          onCorrected={() => {
            setVersion((known) => known + 1);
          }}
          onClose={() => {
            setPerson(null);
          }}
        />
      )}
    </div>
  );
}

function WhoIsInNow({ version }: { version: number }) {
  const state = useLoaded(fetchTeamNow, version);
  if (state.status === "loading") return <p className="text-ink-2">{TEXT.monthLoading}</p>;
  if (state.status === "failed") return <Banner tone="problem">{TEXT.monthFailed}</Banner>;
  return <TeamNowPanel team={state.data} />;
}

function TeamNowPanel({ team }: { team: TeamNow }) {
  const groups = [
    { title: TEXT.inNowGroup, people: team.people.filter((p) => p.since !== null), tone: "good" },
    {
      title: TEXT.leftTodayGroup,
      people: team.people.filter((p) => p.since === null && p.leftAt !== null),
      tone: "quiet",
    },
    {
      title: TEXT.notInToday,
      people: team.people.filter((p) => p.since === null && p.leftAt === null),
      tone: "quiet",
    },
  ] as const;
  return (
    <Panel>
      <div className="border-rule text-secondary text-ink-2 flex flex-wrap items-center justify-between gap-3 border-b px-6 py-4">
        <span>
          <b className="text-ink">{TEXT.inNowCount(team.clockedInCount, team.people.length)}</b>
          {TEXT.areClockedIn}
        </span>
        <NetworkLine state={team.officeNetwork} />
      </div>
      {team.people.length === 0 ? (
        <EmptyState>{TEXT.noOne}</EmptyState>
      ) : (
        <div className="tablet:grid-cols-3 divide-rule tablet:divide-x tablet:divide-y-0 grid grid-cols-1 divide-y">
          {groups.map((group) => (
            <PeopleGroup key={group.title} {...group} />
          ))}
        </div>
      )}
    </Panel>
  );
}

/**
 * One group of Who's in now (asked 2026-11-16): a short list of faces and names, each with when
 * they came in or left. No buttons: each person's month opens from Hours by month.
 */
function PeopleGroup({
  title,
  people,
  tone,
}: {
  title: string;
  people: readonly PersonNow[];
  tone: "good" | "quiet";
}) {
  const headingId = useId();
  return (
    <div className="grid min-w-0 content-start gap-3 px-6 py-5">
      <h3 id={headingId} className="text-secondary flex items-center gap-2 font-semibold">
        <span
          aria-hidden="true"
          className={clsx("size-dot rounded-pill", tone === "good" ? "bg-good" : "bg-rule-2")}
        />
        {title}
        <span className="text-ink-3 font-normal tabular-nums">{people.length}</span>
      </h3>
      {people.length === 0 ? (
        <p className="text-secondary text-ink-3">{TEXT.nobodyInGroup}</p>
      ) : (
        <ul aria-label={TEXT.groupLabel(title, people.length)} className="grid gap-3">
          {people.map((person) => (
            <li key={person.id} className="flex min-w-0 items-center gap-3">
              <Avatar name={person.name} />
              <span className="grid min-w-0">
                <span className="font-semibold break-words">{person.name}</span>
                {timeWords(person) !== null && (
                  <span className="text-small text-ink-2 tabular-nums">{timeWords(person)}</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function timeWords(person: PersonNow): string | null {
  if (person.since !== null) return TEXT.sinceTime(officeTime(person.since));
  if (person.leftAt !== null) return TEXT.atTime(officeTime(person.leftAt));
  return null;
}

function NetworkLine({ state }: { state: OfficeNetworkState }) {
  const isOn = state === "on";
  const words = { on: TEXT.networkOn, off: TEXT.networkOff, none: TEXT.networkNone }[state];
  return (
    <span className={clsx("inline-flex items-center gap-1.5", isOn ? "text-good" : "text-warn")}>
      <Icon name={isOn ? "wifi" : "alert"} size="sm" />
      {words}
    </span>
  );
}

type ByMonthProps = {
  month: string;
  onMonth: (month: string) => void;
  version: number;
  onOpen: (person: Person) => void;
};

function ByMonth({ month, onMonth, version, onOpen }: ByMonthProps) {
  const load = useCallback(() => fetchTeamMonth(month), [month]);
  const state = useLoaded(load, version);
  const monthName = formatMonth(month);
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <MonthPicker value={month} onChange={onMonth} />
        <ExportButton
          list="clock_in"
          count={state.status === "loaded" ? state.data.rows.length : null}
          filters={{ month }}
          filtersText={describeFilters([[TEXT.month, monthName]], "")}
        />
      </div>
      {state.status === "loading" && <p className="text-ink-2">{TEXT.monthLoading}</p>}
      {state.status === "failed" && <Banner tone="problem">{TEXT.monthFailed}</Banner>}
      {state.status === "loaded" && (
        <TeamMonthTable team={state.data} monthName={monthName} onOpen={onOpen} />
      )}
    </div>
  );
}

const HEAD = "text-small text-ink-2 bg-fill px-5 py-3 font-semibold";
const CELL = "px-5 py-4 align-middle max-tablet:p-0";
const NUMBER = "tabular-nums tablet:text-right";

function TeamMonthTable({
  team,
  monthName,
  onOpen,
}: {
  team: TeamMonth;
  monthName: string;
  onOpen: (person: Person) => void;
}) {
  return (
    <Panel>
      <table className="text-body w-full border-collapse" aria-label={EXPORT_LIST_LABELS.clock_in}>
        <thead className="max-tablet:sr-only">
          <tr>
            <th scope="col" className={`${HEAD} text-left`}>
              {TEXT.employee}
            </th>
            {[TEXT.daysWorked, TEXT.hours, TEXT.averageDay, TEXT.shortDays, TEXT.noClockOut].map(
              (heading) => (
                <th key={heading} scope="col" className={`${HEAD} text-right`}>
                  {heading}
                </th>
              ),
            )}
            <th scope="col" className={HEAD}>
              <span className="sr-only">{TEXT.seeDays}</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-rule divide-y">
          {team.rows.map((row) => (
            <TeamRow key={row.staff.id} row={row} onOpen={onOpen} />
          ))}
        </tbody>
      </table>
      <PanelFoot>{TEXT.teamFoot(monthName, hoursText(team.workingDayMinutes))}</PanelFoot>
    </Panel>
  );
}

function TeamRow({ row, onOpen }: { row: TeamMonthRow; onOpen: (person: Person) => void }) {
  const { staff } = row;
  const average = row.daysWorked === 0 ? "—" : durationText(row.minutes / row.daysWorked);
  return (
    <tr className="max-tablet:grid max-tablet:gap-2 max-tablet:p-5">
      <td className={CELL}>
        <div className="font-semibold break-words">
          {staff.name}
          {staff.hasLeft && <span className="text-ink-3 font-normal">{` ${TEXT.hasLeft}`}</span>}
        </div>
        <div className="text-secondary text-ink-2 break-words">{staff.jobTitle}</div>
      </td>
      <NumberCell label={TEXT.daysWorked} value={String(row.daysWorked)} />
      <NumberCell label={TEXT.hours} value={hoursText(row.minutes)} />
      <NumberCell label={TEXT.averageDay} value={average} />
      <CountCell label={TEXT.shortDays} count={row.shortDays} />
      <CountCell label={TEXT.noClockOut} count={row.missingClockOuts} />
      <td className={`${CELL} tablet:text-right`}>
        <Button
          size="sm"
          onClick={() => {
            onOpen(staff);
          }}
        >
          <span aria-hidden="true">{TEXT.seeDays}</span>
          <span className="sr-only">{TEXT.personMonth(staff.name, TEXT.month)}</span>
        </Button>
      </td>
    </tr>
  );
}

/** A figure; below tablet width its column name is written beside it. */
function NumberCell({ label, value }: { label: string; value: string }) {
  return (
    <td className={`${CELL} ${NUMBER}`}>
      <span className="text-ink-2 tablet:sr-only">{`${label}: `}</span>
      {value}
    </td>
  );
}

function CountCell({ label, count }: { label: string; count: number }) {
  return (
    <td className={`${CELL} ${NUMBER}`}>
      <span className="text-ink-2 tablet:sr-only">{`${label}: `}</span>
      {count > 0 ? <Chip tone="warn">{String(count)}</Chip> : <span className="text-ink-3">0</span>}
    </td>
  );
}
