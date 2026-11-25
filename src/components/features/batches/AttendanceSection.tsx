"use client";

import type { RecordId } from "@/lib/recordId";
import Link from "next/link";
import { useState, type SubmitEvent } from "react";

import { useDates } from "@/components/features/shell/dateDisplay";
import { useCurrentStaff } from "@/components/features/shell/useCurrentStaff";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { DateField } from "@/components/ui/DateField";
import { EmptyState } from "@/components/ui/EmptyState";
import { Panel } from "@/components/ui/Panel";
import { RowItem } from "@/components/ui/RowItem";
import { RowList } from "@/components/ui/RowList";
import { Section } from "@/components/ui/Section";
import { SegmentedChoice } from "@/components/ui/SegmentedChoice";
import { useToast } from "@/components/ui/useToast";
import {
  ATTENDANCE_MARK_LABELS,
  ATTENDANCE_MARK_TONES,
  ATTENDANCE_MARKS,
  AttendanceMark,
  BATCH_TEXT,
} from "@/constants/batches";
import { Role } from "@/constants/roles";
import { ROUTES } from "@/constants/routes";
import {
  InvalidFieldsError,
  saveAttendanceDay,
  type BatchWithStudents,
  type DayMarks,
} from "@/lib/api";
import { todayIso } from "@/lib/dates";

import { useAttendanceDay } from "./useBatchData";

const SATURDAY = 6;
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

const MARK_OPTIONS = ATTENDANCE_MARKS.map((mark) => ({
  value: mark,
  label: ATTENDANCE_MARK_LABELS[mark],
  tone: ATTENDANCE_MARK_TONES[mark],
}));

/** Today while the class runs; before it starts its first day, after it ends its last. */
function firstDay(batch: BatchWithStudents): string {
  const today = todayIso();
  if (today < batch.startsOn) return batch.startsOn;
  return today > batch.endsOn ? batch.endsOn : today;
}

function isClassDay(day: string, batch: BatchWithStudents): boolean {
  return ISO_DAY.test(day) && batch.startsOn <= day && day <= batch.endsOn;
}

/** Whether an AD day ("YYYY-MM-DD") is a Saturday, the usual day off. */
function isSaturday(day: string): boolean {
  return new Date(`${day}T12:00:00`).getDay() === SATURDAY;
}

type AttendanceSectionProps = {
  batch: BatchWithStudents;
  /** Attendance was saved, so the class's shares attended have changed. */
  onSaved: () => void;
};

/**
 * A class's Attendance for one day at a time (spec 85): its Teacher or an Admin marks each Student
 * Present, Absent, Late or Leave; everyone else who can open the class sees the marks.
 */
export function AttendanceSection({ batch, onSaved }: AttendanceSectionProps) {
  const [day, setDay] = useState(() => firstDay(batch));
  const shownDay = isClassDay(day, batch) ? day : null;

  return (
    <Section
      title={BATCH_TEXT.attendance}
      aside={<DayPicker batch={batch} day={day} isClassDay={shownDay !== null} onChange={setDay} />}
    >
      {shownDay !== null && (
        <>
          {isSaturday(shownDay) && <Banner tone="info">{BATCH_TEXT.saturday}</Banner>}
          <LoadedDay key={shownDay} batch={batch} day={shownDay} onSaved={onSaved} />
        </>
      )}
    </Section>
  );
}

type DayPickerProps = {
  batch: BatchWithStudents;
  day: string;
  isClassDay: boolean;
  onChange: (day: string) => void;
};

/** The day shown, in the office's calendar with the other one under it, within the class dates. */
function DayPicker({ batch, day, isClassDay, onChange }: DayPickerProps) {
  const dates = useDates();
  const outside = BATCH_TEXT.chooseDay(dates.date(batch.startsOn), dates.date(batch.endsOn));
  return (
    <div className="w-full max-w-80">
      <DateField
        label={BATCH_TEXT.day}
        name="attendance-day"
        display={dates.display}
        min={batch.startsOn}
        max={batch.endsOn}
        value={day}
        onChange={onChange}
        showsOtherCalendar
        errors={isClassDay ? undefined : [outside]}
      />
    </div>
  );
}

type LoadedDayProps = { batch: BatchWithStudents; day: string; onSaved: () => void };

function LoadedDay({ batch, day, onSaved }: LoadedDayProps) {
  const state = useAttendanceDay(batch.id, day, 0);
  if (state.status === "loading") return <p className="text-ink-2">{BATCH_TEXT.loadingDay}</p>;
  if (state.status !== "loaded") return <Banner tone="problem">{BATCH_TEXT.dayFailed}</Banner>;
  return (
    <DayForm
      batch={batch}
      day={day}
      initial={state.data.marks}
      canMark={state.data.canMark}
      onSaved={onSaved}
    />
  );
}

type DayFormProps = {
  batch: BatchWithStudents;
  day: string;
  initial: DayMarks;
  canMark: boolean;
  onSaved: () => void;
};

/** Each Student's mark for the day, and Save for those who may take it. */
function DayForm({ batch, day, initial, canMark, onSaved }: DayFormProps) {
  const dates = useDates();
  const toast = useToast();
  const [marks, setMarks] = useState<DayMarks>(initial);
  const [problem, setProblem] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  if (batch.students.length === 0) {
    return (
      <Panel>
        <EmptyState>{BATCH_TEXT.nobodyInClass}</EmptyState>
      </Panel>
    );
  }

  async function save(event: SubmitEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setIsSaving(true);
    setProblem(null);
    try {
      const saved = await saveAttendanceDay(batch.id, day, marks);
      setMarks(saved.marks);
      toast.showToast(BATCH_TEXT.attendanceSaved(dates.date(day)));
      onSaved();
    } catch (error) {
      setProblem(refusal(error));
    } finally {
      setIsSaving(false);
    }
  }

  const everyonePresent = () => {
    setMarks(Object.fromEntries(batch.students.map((s) => [s.id, AttendanceMark.Present])));
  };

  return (
    <form className="grid gap-4" onSubmit={(event) => void save(event)} noValidate>
      {problem !== null && <Banner tone="problem">{problem}</Banner>}
      <Panel>
        <DayRows
          batch={batch}
          marks={marks}
          canMark={canMark}
          onMark={(studentId, mark) => {
            setMarks((current) => ({ ...current, [studentId]: mark }));
          }}
        />
        <div className="border-rule text-secondary text-ink-2 px-gutter flex flex-wrap items-center justify-end gap-3 border-t py-4">
          {canMark ? (
            <>
              <Button onClick={everyonePresent}>{BATCH_TEXT.everyonePresent}</Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={isSaving}
                loadingLabel={BATCH_TEXT.saving}
              >
                {BATCH_TEXT.saveAttendance}
              </Button>
            </>
          ) : (
            <span className="mr-auto">{BATCH_TEXT.onlyTeacherOrAdmin}</span>
          )}
        </div>
      </Panel>
    </form>
  );
}

/** The short reason a save was refused, as the API gave it, or a general one. */
function refusal(error: unknown): string {
  if (error instanceof InvalidFieldsError) {
    const errors: Partial<Record<string, string[]>> = error.fieldErrors;
    const [first] = [...(errors.day ?? []), ...(errors.marks ?? [])];
    if (first !== undefined) return first;
  }
  return BATCH_TEXT.saveFailed;
}

type DayRowsProps = {
  batch: BatchWithStudents;
  marks: DayMarks;
  canMark: boolean;
  onMark: (studentId: RecordId, mark: AttendanceMark) => void;
};

function DayRows({ batch, marks, canMark, onMark }: DayRowsProps) {
  const { staff } = useCurrentStaff();
  const linksStudents = staff.role !== Role.Teacher;
  return (
    <RowList label={BATCH_TEXT.students}>
      {batch.students.map((member) => {
        const mark = marks[member.id] ?? null;
        return (
          <RowItem
            key={member.id}
            title={
              linksStudents ? (
                <Link
                  href={ROUTES.student(member.id)}
                  className="text-accent min-h-control inline-flex items-center hover:underline"
                >
                  {member.name}
                </Link>
              ) : (
                member.name
              )
            }
            meta={
              member.attendedPercent === null
                ? BATCH_TEXT.noAttendance
                : BATCH_TEXT.attendedOfClasses(member.attendedPercent)
            }
            right={
              canMark ? (
                <SegmentedChoice
                  label={BATCH_TEXT.marksFor(member.name)}
                  name={`attendance-${member.id}`}
                  options={MARK_OPTIONS}
                  value={mark}
                  onChange={(chosen) => {
                    onMark(member.id, chosen);
                  }}
                />
              ) : (
                <MarkWord mark={mark} />
              )
            }
          />
        );
      })}
    </RowList>
  );
}

/** A mark as a coloured word, or "Not marked". */
export function MarkWord({ mark }: { mark: AttendanceMark | null }) {
  if (mark === null) return <span className="text-ink-2">{BATCH_TEXT.notMarked}</span>;
  return <Chip tone={ATTENDANCE_MARK_TONES[mark]}>{ATTENDANCE_MARK_LABELS[mark]}</Chip>;
}
