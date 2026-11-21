"use client";

import type { RecordId } from "@/lib/recordId";
import { useId, useState, type SubmitEvent } from "react";

import { useDates } from "@/components/features/shell/dateDisplay";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { SubmitKeysHint, SubmitKeysScope } from "@/components/ui/SubmitKeys";
import { Panel } from "@/components/ui/Panel";
import { TextAreaField } from "@/components/ui/TextAreaField";
import { TextField } from "@/components/ui/TextField";
import { useToast } from "@/components/ui/useToast";
import { CLOCK_TEXT as TEXT } from "@/constants/clock";
import { firstName } from "@/lib/home";
import {
  addMissedTime,
  ClockRefusedError,
  InvalidFieldsError,
  setMissingClockOut,
  type ClockDay,
  type ClockSession,
  updatingOr,
} from "@/lib/api";
import { durationText, hoursText, officeHhMm, officeTime } from "@/lib/clock";
import { formatMonth } from "@/lib/dates";

import { MonthCalendar } from "./MonthCalendar";
import { useClockMonth, type ClockMonthState } from "./useClockMonth";

type Open =
  | { kind: "month" }
  | { kind: "day"; date: string }
  | { kind: "fix"; date: string; session: ClockSession | null };

type StaffMonthDialogProps = {
  staffId: RecordId;
  name: string;
  month: string;
  /** Called after a correction is saved, so the lists behind can be read again. */
  onCorrected: () => void;
  onClose: () => void;
};

/**
 * One person's month for an Admin (spec 107-108): the calendar, where only a past day that is
 * short of the Working Day or missing a clock-out opens; then that day; then the correction.
 */
export function StaffMonthDialog({
  staffId,
  name,
  month,
  onCorrected,
  onClose,
}: StaffMonthDialogProps) {
  const { state, reload } = useClockMonth(month, staffId);
  const [open, setOpen] = useState<Open>({ kind: "month" });
  const backToMonth = () => {
    setOpen({ kind: "month" });
  };
  const day = openDay(state, open);

  if (day === null) {
    return (
      <MonthDialog
        title={TEXT.personMonth(name, formatMonth(month))}
        state={state}
        onOpenDay={(chosen) => {
          setOpen({ kind: "day", date: chosen.date });
        }}
        onClose={onClose}
      />
    );
  }
  if (open.kind !== "fix") {
    return (
      <DayDialog
        name={name}
        day={day.day}
        workingDayMinutes={day.workingDayMinutes}
        onFix={(session) => {
          setOpen({ kind: "fix", date: day.day.date, session });
        }}
        onBack={backToMonth}
        onClose={onClose}
      />
    );
  }
  return (
    <CorrectionDialog
      staffId={staffId}
      name={name}
      day={day.day}
      session={open.session}
      onBack={() => {
        setOpen({ kind: "day", date: day.day.date });
      }}
      onClose={onClose}
      onSaved={() => {
        reload();
        onCorrected();
        backToMonth();
      }}
    />
  );
}

/** The day that is open, with the month's Working Day; null while the month itself shows. */
function openDay(
  state: ClockMonthState,
  open: Open,
): { day: ClockDay; workingDayMinutes: number } | null {
  if (state.status !== "loaded" || open.kind === "month") return null;
  const day = state.month.days.find((d) => d.date === open.date);
  return day === undefined ? null : { day, workingDayMinutes: state.month.workingDayMinutes };
}

type MonthDialogProps = {
  title: string;
  state: ClockMonthState;
  onOpenDay: (day: ClockDay) => void;
  onClose: () => void;
};

function MonthDialog({ title, state, onOpenDay, onClose }: MonthDialogProps) {
  return (
    <Dialog
      isOpen
      isWide
      title={title}
      onClose={onClose}
      footer={
        <Button variant="primary" onClick={onClose}>
          {TEXT.done}
        </Button>
      }
    >
      {state.status === "loading" && <p className="text-ink-2">{TEXT.monthLoading}</p>}
      {state.status === "failed" && <Banner tone="problem">{TEXT.monthFailed}</Banner>}
      {state.status === "loaded" && <MonthCalendar month={state.month} onOpenDay={onOpenDay} />}
    </Dialog>
  );
}

type DayDialogProps = {
  name: string;
  day: ClockDay;
  workingDayMinutes: number;
  onFix: (session: ClockSession | null) => void;
  onBack: () => void;
  onClose: () => void;
};

/** One day: its sessions, Set clock-out on one that's missing, or Add missed time. */
function DayDialog({ name, day, workingDayMinutes, onFix, onBack, onClose }: DayDialogProps) {
  const dates = useDates();
  const left = workingDayMinutes - day.minutes;
  return (
    <Dialog
      isOpen
      title={TEXT.dayTitle(name, dates.date(day.date))}
      onClose={onClose}
      footer={<Button onClick={onBack}>{TEXT.backToMonth}</Button>}
    >
      <div className="grid gap-4">
        <p>{daySummary(day, workingDayMinutes)}</p>
        {day.sessions.length > 0 && (
          <Panel>
            <ul className="divide-rule divide-y">
              {day.sessions.map((session) => (
                <SessionRow key={session.id} session={session} onFix={onFix} />
              ))}
            </ul>
          </Panel>
        )}
        {!day.isMissingClockOut && left > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            <Button
              icon="plus"
              onClick={() => {
                onFix(null);
              }}
            >
              {TEXT.addMissedTime}
            </Button>
            <span className="text-small text-ink-2">
              {TEXT.upTo(durationText(left), hoursText(workingDayMinutes))}
            </span>
          </div>
        )}
        <p className="text-small text-ink-2">{TEXT.neverChanged}</p>
      </div>
    </Dialog>
  );
}

function daySummary(day: ClockDay, workingDayMinutes: number): string {
  if (day.isMissingClockOut) return TEXT.missing;
  if (day.sessions.length === 0) return TEXT.noClockIn;
  return TEXT.workedOf(durationText(day.minutes), hoursText(workingDayMinutes));
}

function SessionRow({
  session,
  onFix,
}: {
  session: ClockSession;
  onFix: (session: ClockSession) => void;
}) {
  const out = session.clockedOutAt;
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
      <span>
        {TEXT.sessionLine(officeTime(session.clockedInAt))}
        {out !== null ? (
          TEXT.outLine(officeTime(out))
        ) : (
          <b className="text-warn">{TEXT.noClockOutShort}</b>
        )}
      </span>
      {out !== null || !session.isMissingClockOut ? (
        <span className="text-small text-ink-2">{TEXT.recordedByClock}</span>
      ) : (
        <Button
          size="sm"
          onClick={() => {
            onFix(session);
          }}
        >
          {TEXT.setClockOut}
        </Button>
      )}
    </li>
  );
}

type CorrectionDialogProps = {
  staffId: RecordId;
  name: string;
  day: ClockDay;
  /** The session missing its clock-out, or null to add missed time. */
  session: ClockSession | null;
  onBack: () => void;
  onClose: () => void;
  onSaved: () => void;
};

type ErrorField = "clockedOutAt" | "from" | "to" | "reason";
type Errors = Partial<Record<ErrorField, string[] | undefined>>;
type Values = { from: string; to: string; reason: string };

/** Set the missing clock-out, or add missed time, with a required reason. */
function CorrectionDialog(props: CorrectionDialogProps) {
  const { name, day, session, onBack, onClose } = props;
  const formId = useId();
  const dates = useDates();
  const { errors, failure, isSaving, save } = useCorrection(props);

  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    void save(new FormData(event.currentTarget));
  }

  return (
    <SubmitKeysScope>
      <Dialog
        isOpen
        title={session === null ? TEXT.addTitle(name) : TEXT.setTitle(name)}
        onClose={onClose}
        footer={
          <>
            <SubmitKeysHint action="save" />
            <Button variant="ghost" onClick={onBack}>
              {TEXT.back}
            </Button>
            <Button variant="primary" type="submit" form={formId} isLoading={isSaving}>
              {TEXT.save}
            </Button>
          </>
        }
      >
        <form id={formId} noValidate onSubmit={handleSubmit} className="grid gap-5">
          <p className="text-ink-2">
            {TEXT.correctionIntro(dates.date(day.date), firstName(name))}
          </p>
          <TimeFields session={session} errors={errors} />
          <TextAreaField
            label={TEXT.why}
            name="reason"
            rows={2}
            placeholder={TEXT.whyPlaceholder}
            hint={TEXT.required}
            errors={errors.reason}
          />
          {failure !== null && <Banner tone="problem">{failure}</Banner>}
        </form>
      </Dialog>
    </SubmitKeysScope>
  );
}

/** Adding: From and To. Setting a clock-out: the recorded clock-in (not editable) and Out. */
function TimeFields({ session, errors }: { session: ClockSession | null; errors: Errors }) {
  if (session === null) {
    return (
      <div className="tablet:grid-cols-2 grid gap-5">
        <TextField label={TEXT.from} name="from" type="time" errors={errors.from} />
        <TextField label={TEXT.to} name="to" type="time" errors={errors.to} />
      </div>
    );
  }
  return (
    <div className="tablet:grid-cols-2 grid gap-5">
      <div className="grid content-start gap-2">
        <span className="text-secondary font-semibold">{TEXT.clockedInField}</span>
        <span className="min-h-control text-ink-2 grid items-center">
          {TEXT.clockedInValue(officeTime(session.clockedInAt))}
        </span>
      </div>
      <TextField
        label={TEXT.clockedOutField}
        name="to"
        type="time"
        min={officeHhMm(session.clockedInAt)}
        errors={errors.clockedOutAt}
      />
    </div>
  );
}

/** Check what was entered, send it, and keep what the server refused to show it. */
function useCorrection({ staffId, day, session, onSaved }: CorrectionDialogProps) {
  const { showToast } = useToast();
  const [errors, setErrors] = useState<Errors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  function send(values: Values): Promise<unknown> {
    return session === null
      ? addMissedTime(staffId, { day: day.date, ...values })
      : setMissingClockOut(session.id, { clockedOutAt: values.to, reason: values.reason });
  }

  async function save(form: FormData): Promise<void> {
    const values = {
      from: textOf(form, "from"),
      to: textOf(form, "to"),
      reason: textOf(form, "reason").trim(),
    };
    const missing = missingOf(session === null, values);
    setErrors(missing);
    setFailure(null);
    if (Object.keys(missing).length > 0) return;
    setIsSaving(true);
    try {
      await send(values);
      showToast(TEXT.saved);
      onSaved();
    } catch (error) {
      setErrors(refusedFields(error));
      setFailure(failureOf(error));
      setIsSaving(false);
    }
  }

  return { errors, failure, isSaving, save };
}

function textOf(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

/** The server's reasons on fields, named as this form names them. */
function refusedFields(error: unknown): Errors {
  if (!(error instanceof InvalidFieldsError)) return {};
  const refused: Partial<Record<string, string[]>> = error.fieldErrors;
  return {
    clockedOutAt: refused.clockedOutAt,
    from: refused.from ?? refused.day,
    to: refused.to,
    reason: refused.reason,
  };
}

/** A rule the day breaks, in the server's words; nothing when a field was refused instead. */
function failureOf(error: unknown): string | null {
  if (error instanceof InvalidFieldsError) return null;
  return error instanceof ClockRefusedError ? error.message : updatingOr(error, TEXT.failed);
}

function missingOf(isAdding: boolean, values: Values): Errors {
  const checks: [ErrorField, boolean, string][] = [
    ["from", isAdding && values.from === "", TEXT.enterTime],
    [isAdding ? "to" : "clockedOutAt", values.to === "", TEXT.enterTime],
    ["reason", values.reason === "", TEXT.sayWhy],
  ];
  const missing: Errors = {};
  for (const [field, isMissing, message] of checks) {
    if (isMissing) missing[field] = [message];
  }
  return missing;
}
