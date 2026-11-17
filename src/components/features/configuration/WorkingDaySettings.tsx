"use client";

import clsx from "clsx";
import { useId, useState, type SubmitEvent } from "react";

import { useLoaded } from "@/components/features/home/useLoaded";
import { useDates } from "@/components/features/shell/dateDisplay";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Panel } from "@/components/ui/Panel";
import { Section } from "@/components/ui/Section";
import { TextField } from "@/components/ui/TextField";
import { useToast } from "@/components/ui/useToast";
import { CLOCK_TEXT as TEXT, WORKING_DAY, type WeeklyOff } from "@/constants/clock";
import {
  fetchWorkingDay,
  InvalidFieldsError,
  saveWeeklyOff,
  saveWorkingDay,
  type WorkingDay,
} from "@/lib/api";
import { hoursText } from "@/lib/clock";

const MINUTES_PER_HOUR = 60;
/** Whole or half hours as typed, e.g. "8" or "7.5". */
const TYPED_HOURS = /^\d{1,2}(\.\d)?$/;

/** The minutes typed as hours, or null unless 4 to 12 in half hours (asked 2026-11-17). */
export function minutesOf(typed: string): number | null {
  const trimmed = typed.trim();
  if (!TYPED_HOURS.test(trimmed)) return null;
  const minutes = Number(trimmed) * MINUTES_PER_HOUR;
  const isInRange = minutes >= WORKING_DAY.min && minutes <= WORKING_DAY.max;
  return isInRange && minutes % WORKING_DAY.step === 0 ? minutes : null;
}

/**
 * Configuration → Working day, while Clock-in is on (spec 105a): how long a full day is, from 4
 * to 12 hours in half hours (8 by default). Each change is recorded and the latest is shown.
 */
export function WorkingDaySettings() {
  const [version, setVersion] = useState(0);
  const state = useLoaded(fetchWorkingDay, version);
  return (
    <Section title={TEXT.workingDay}>
      <div className="grid gap-4">
        <p className="text-ink-2">{TEXT.workingDayHelp}</p>
        <div className="grid min-w-0 content-start gap-4">
          {state.status === "loading" && <p className="text-ink-2">{TEXT.monthLoading}</p>}
          {state.status === "failed" && <Banner tone="problem">{TEXT.workingDayLoadFailed}</Banner>}
          {state.status === "loaded" && (
            <WorkingDayForm
              key={state.data.minutes}
              working={state.data}
              onSaved={() => {
                setVersion((known) => known + 1);
              }}
            />
          )}
        </div>
      </div>
    </Section>
  );
}

function WorkingDayForm({ working, onSaved }: { working: WorkingDay; onSaved: () => void }) {
  const formId = useId();
  const dates = useDates();
  const { showToast } = useToast();
  const [hours, setHours] = useState(String(working.minutes / MINUTES_PER_HOUR));
  const [errors, setErrors] = useState<string[] | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);
  const last = working.changes[0];

  async function save(minutes: number): Promise<void> {
    setIsSaving(true);
    setErrors(undefined);
    try {
      const saved = await saveWorkingDay(minutes);
      showToast(TEXT.workingDaySaved(hoursText(saved.minutes)));
      onSaved();
    } catch (error) {
      setErrors(
        error instanceof InvalidFieldsError ? [TEXT.hoursRefused] : [TEXT.workingDaySaveFailed],
      );
    }
    setIsSaving(false);
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    const minutes = minutesOf(hours);
    if (minutes === null) setErrors([TEXT.hoursRefused]);
    else void save(minutes);
  }

  return (
    <Panel isPadded>
      <div className="tablet:grid-cols-2 grid gap-6">
        <form id={formId} noValidate onSubmit={handleSubmit} className="grid content-start gap-4">
          <div className="max-w-field-label">
            <TextField
              label={TEXT.hoursInADay}
              name="hours"
              inputMode="decimal"
              autoComplete="off"
              suffix={TEXT.hoursSuffix}
              value={hours}
              onChange={setHours}
              hint={TEXT.hoursHint}
              errors={errors}
            />
          </div>
          <div>
            <Button type="submit" isLoading={isSaving}>
              {TEXT.saveWorkingDay}
            </Button>
          </div>
          {last !== undefined && (
            <p className="text-small text-ink-2 break-words">
              {`${TEXT.workingDayChange(hoursText(last.oldMinutes), hoursText(last.newMinutes))}. ${last.by}, ${dates.dateTime(last.at)}`}
            </p>
          )}
        </form>
        {/* Beside the hours, in the same box (asked 2026-11-17); under them on a phone. */}
        <div className="border-rule tablet:border-l tablet:pl-6 max-tablet:border-t max-tablet:pt-5">
          <WeeklyOffChoice saved={working.weeklyOff} />
        </div>
      </div>
    </Panel>
  );
}

type DaysOff = { saturday: boolean; sunday: boolean };
const WEEK_DAYS = ["saturday", "sunday"] as const;

function daysOf(choice: WeeklyOff): DaysOff {
  return {
    saturday: choice === "saturday" || choice === "both",
    sunday: choice === "sunday" || choice === "both",
  };
}

function choiceOf({ saturday, sunday }: DaysOff): WeeklyOff {
  if (saturday && sunday) return "both";
  if (saturday) return "saturday";
  return sunday ? "sunday" : "none";
}

function savedWords(choice: WeeklyOff): string {
  return choice === "none" ? TEXT.noWeeklyOff : TEXT.weeklyOffSaved(TEXT.weeklyOffLabels[choice]);
}

/**
 * Weekly days off (asked 2026-11-17): a tile each for Saturday and Sunday, tapped to close or
 * open that day, saved at once. They decide which days count as not in or short, like holidays.
 */
function WeeklyOffChoice({ saved }: { saved: WeeklyOff }) {
  const { showToast } = useToast();
  const [chosen, setChosen] = useState(saved);
  const [failure, setFailure] = useState<string | null>(null);
  const days = daysOf(chosen);

  async function toggle(day: (typeof WEEK_DAYS)[number]): Promise<void> {
    const before = chosen;
    const next = choiceOf({ ...days, [day]: !days[day] });
    setChosen(next);
    setFailure(null);
    try {
      const answer = await saveWeeklyOff(next);
      setChosen(answer.weeklyOff);
      showToast(savedWords(answer.weeklyOff));
    } catch {
      setChosen(before);
      setFailure(TEXT.weeklyOffSaveFailed);
    }
  }

  return (
    <div role="group" aria-label={TEXT.weeklyOff} className="grid content-start gap-3">
      <p className="text-secondary text-ink font-semibold">{TEXT.weeklyOff}</p>
      <div className="grid grid-cols-2 gap-3">
        {WEEK_DAYS.map((day) => (
          <DayTile
            key={day}
            label={TEXT.weeklyOffLabels[day]}
            isClosed={days[day]}
            onToggle={() => {
              void toggle(day);
            }}
          />
        ))}
      </div>
      <p className="text-small text-ink-2">{TEXT.weeklyOffHelp}</p>
      {failure !== null && <Banner tone="problem">{failure}</Banner>}
    </div>
  );
}

type DayTileProps = { label: string; isClosed: boolean; onToggle: () => void };

/** How a tile looks when its day is closed (a day off) or open. */
const TILE_LOOK = {
  closed: {
    tile: "border-accent bg-tint",
    tick: "border-accent bg-accent text-accent-ink",
    words: "text-accent",
    text: TEXT.dayClosed,
  },
  open: {
    tile: "border-rule bg-paper hover:border-accent",
    tick: "border-rule",
    words: "text-ink-2",
    text: TEXT.dayOpen,
  },
} as const;

/** One weekday: "Closed" with a tick when it is a day off, "Open" when people work. */
function DayTile({ label, isClosed, onToggle }: DayTileProps) {
  const look = TILE_LOOK[isClosed ? "closed" : "open"];
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={isClosed}
      onClick={onToggle}
      className={clsx(
        "rounded-control min-h-control grid cursor-pointer grid-cols-[1fr_auto] items-center gap-x-3 border px-4 py-3 text-left",
        look.tile,
      )}
    >
      <span className="text-ink font-semibold">{label}</span>
      <span
        aria-hidden="true"
        className={clsx("rounded-pill grid size-6 place-items-center border", look.tick)}
      >
        {isClosed && <Icon name="check" size="sm" />}
      </span>
      <span className={clsx("text-small", look.words)}>{look.text}</span>
    </button>
  );
}
