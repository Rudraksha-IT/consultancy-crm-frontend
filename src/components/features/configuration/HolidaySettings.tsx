"use client";

import { useState, type SubmitEvent } from "react";

import { useLoaded } from "@/components/features/home/useLoaded";
import { useDates } from "@/components/features/shell/dateDisplay";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Panel } from "@/components/ui/Panel";
import { RowItem } from "@/components/ui/RowItem";
import { RowList } from "@/components/ui/RowList";
import { Section } from "@/components/ui/Section";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { TextField } from "@/components/ui/TextField";
import { useToast } from "@/components/ui/useToast";
import { HOLIDAY_TEXT as TEXT } from "@/constants/clock";
import {
  addHoliday,
  fetchHolidays,
  InvalidFieldsError,
  removeHoliday,
  type Holiday,
} from "@/lib/api";

import { HolidayCalendar } from "./HolidayCalendar";
import { useHolidayChoice, type ChooseBy } from "./useHolidayChoice";

/**
 * Configuration → Holidays, while Clock-in is on (asked 2026-11-16): the days the office is
 * closed. Like the weekly days off they never count as "not in" or a short day, and can't be corrected;
 * anyone who works can still clock in.
 */
export function HolidaySettings() {
  const [version, setVersion] = useState(0);
  const state = useLoaded(fetchHolidays, version);
  const reload = () => {
    setVersion((known) => known + 1);
  };
  return (
    <Section title={TEXT.title}>
      <div className="grid gap-4">
        <p className="text-small text-ink-2">{TEXT.help}</p>
        <div className="grid min-w-0 content-start gap-4">
          {state.status === "loading" && <p className="text-ink-2">{TEXT.loading}</p>}
          {state.status === "failed" && <Banner tone="problem">{TEXT.loadFailed}</Banner>}
          {state.status === "loaded" && (
            <>
              <HolidayList holidays={state.data} onRemoved={reload} />
              <AddHolidayForm holidays={state.data} onAdded={reload} />
            </>
          )}
        </div>
      </div>
    </Section>
  );
}

function HolidayList({
  holidays,
  onRemoved,
}: {
  holidays: readonly Holiday[];
  onRemoved: () => void;
}) {
  const dates = useDates();
  const { showToast } = useToast();
  const [removing, setRemoving] = useState<Holiday | null>(null);

  async function remove(holiday: Holiday): Promise<void> {
    await removeHoliday(holiday.id);
    setRemoving(null);
    showToast(TEXT.removed(holiday.name));
    onRemoved();
  }

  return (
    <>
      <Panel>
        {holidays.length === 0 ? (
          <EmptyState>{TEXT.none}</EmptyState>
        ) : (
          <RowList label={TEXT.listLabel}>
            {holidays.map((holiday) => (
              <RowItem
                key={holiday.id}
                title={<span className="break-words">{holiday.name}</span>}
                meta={dates.date(holiday.date)}
                right={
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setRemoving(holiday);
                    }}
                  >
                    <span aria-hidden="true">{TEXT.remove}</span>
                    <span className="sr-only">{TEXT.removeFor(holiday.name)}</span>
                  </Button>
                }
              />
            ))}
          </RowList>
        )}
      </Panel>
      {removing !== null && (
        <ConfirmDialog
          title={TEXT.removeTitle(removing.name)}
          actionLabel={TEXT.remove}
          onClose={() => {
            setRemoving(null);
          }}
          onConfirm={() => remove(removing)}
          failureOf={() => TEXT.removeFailed}
        >
          {TEXT.removeBody(dates.date(removing.date))}
        </ConfirmDialog>
      )}
    </>
  );
}

type FieldErrors = { date?: string[] | undefined; name?: string[] | undefined };

type AddHolidayFormProps = { holidays: readonly Holiday[]; onAdded: () => void };

/**
 * Add holidays: tap their days on the calendar, give them one name, and each day is added in
 * turn. A refused day stops there, keeping the days not yet added chosen.
 */
function AddHolidayForm({ holidays, onAdded }: AddHolidayFormProps) {
  const { showToast } = useToast();
  const choice = useHolidayChoice(holidays);
  const { chosen } = choice;
  const [name, setName] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function add(days: readonly string[], trimmed: string): Promise<void> {
    setIsSaving(true);
    const added = await addEach(days, trimmed, setErrors, setFailure);
    choice.keep(days.slice(added));
    if (added === days.length) {
      setName("");
      showToast(TEXT.added(trimmed, added));
    }
    if (added > 0) onAdded();
    setIsSaving(false);
  }

  function submit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    const trimmed = name.trim();
    setFailure(null);
    setErrors({
      date: chosen.length === 0 ? [TEXT.chooseDay] : undefined,
      name: trimmed === "" ? [TEXT.enterName] : undefined,
    });
    if (chosen.length > 0 && trimmed !== "") void add(chosen, trimmed);
  }

  return (
    <Panel isPadded>
      <form noValidate onSubmit={submit} className="grid gap-4">
        <div className="wide:grid-cols-2 grid gap-6">
          <div className="grid min-w-0 content-start gap-3">
            <SegmentedControl
              label={TEXT.chooseBy}
              value={choice.chooseBy}
              onChange={choice.chooseHow}
              options={[
                { value: "days", label: TEXT.chooseByDays },
                { value: "range", label: TEXT.chooseByRange },
              ]}
            />
            <HolidayCalendar
              holidays={holidays}
              chosen={chosen}
              onToggle={choice.tap}
              hint={rangeHint(choice.chooseBy, choice.isWaitingForLast)}
              errors={errors.date}
            />
          </div>
          <div className="grid content-start gap-4">
            <p className="text-ink-2" aria-live="polite">
              {TEXT.chosen(chosen.length)}
            </p>
            <TextField
              label={TEXT.nameLabel}
              name="holiday_name"
              placeholder={TEXT.namePlaceholder}
              value={name}
              onChange={setName}
              errors={errors.name}
            />
            {failure !== null && <Banner tone="problem">{failure}</Banner>}
            <div>
              <Button type="submit" icon="plus" isLoading={isSaving}>
                {TEXT.add}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </Panel>
  );
}

/** What the calendar asks for next in From – to; its usual help otherwise. */
function rangeHint(chooseBy: ChooseBy, isWaitingForLast: boolean): string | undefined {
  if (chooseBy === "days") return undefined;
  return isWaitingForLast ? TEXT.tapLast : TEXT.tapFirst;
}

/** Adds each day in turn; how many were added before one was refused (or all of them). */
async function addEach(
  days: readonly string[],
  name: string,
  setErrors: (errors: FieldErrors) => void,
  setFailure: (failure: string) => void,
): Promise<number> {
  for (const [index, date] of days.entries()) {
    const refusal = await addOne(date, name);
    if (refusal !== null) {
      say(refusal, setErrors, setFailure);
      return index;
    }
  }
  return days.length;
}

function say(
  refusal: FieldErrors | "failed",
  setErrors: (errors: FieldErrors) => void,
  setFailure: (failure: string) => void,
): void {
  if (refusal === "failed") setFailure(TEXT.saveFailed);
  else setErrors(refusal);
}

/** Adds one day: null once added, the refused fields, or "failed" when it couldn't be sent. */
async function addOne(date: string, name: string): Promise<FieldErrors | "failed" | null> {
  try {
    await addHoliday({ date, name });
    return null;
  } catch (error: unknown) {
    if (!(error instanceof InvalidFieldsError)) return "failed";
    const refused: FieldErrors = error.fieldErrors;
    return { date: refused.date, name: refused.name };
  }
}
