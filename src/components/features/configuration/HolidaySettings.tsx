"use client";

import { useRef, useState, type RefObject, type SubmitEvent } from "react";

import { HOLIDAY_CARD_BUTTONS, HolidayCards } from "@/components/features/clock/HolidayCards";
import { useLoaded } from "@/components/features/home/useLoaded";
import { useDates } from "@/components/features/shell/dateDisplay";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Panel } from "@/components/ui/Panel";
import { Section } from "@/components/ui/Section";
import { TextField } from "@/components/ui/TextField";
import { useToast } from "@/components/ui/useToast";
import { HOLIDAY_TEXT as TEXT } from "@/constants/clock";
import { useFocusAfterChange } from "@/hooks/useFocusAfterChange";
import {
  addHolidays,
  fetchHolidays,
  InvalidFieldsError,
  removeHolidays,
  type Holiday,
} from "@/lib/api";
import {
  HOLIDAY_DAYS_MAX,
  holidayGroups,
  splitHolidays,
  toggleDay,
  type HolidayGroup,
} from "@/lib/clock/holidays";
import { todayIso } from "@/lib/dates";

import { HolidayCalendar } from "./HolidayCalendar";

const NAME_FIELD = "holiday_name";

/**
 * Configuration → Working hours → Holidays, while Clock-in is on (asked 2026-11-16; UI revamp
 * 17): the days the office is closed, shown and changed as whole holidays. Only the coming ones
 * are here (everyone sees the past ones on the Working hours page). Like the weekly days off they
 * never count as "not in" or a short day, and can't be corrected; anyone who works can still
 * clock in.
 */
export function HolidaySettings() {
  const state = useLoaded(fetchHolidays, 0);
  return (
    <Section title={TEXT.title}>
      <div className="grid gap-4">
        <p className="text-small text-ink-2">{TEXT.help}</p>
        {state.status === "loading" && <p className="text-ink-2">{TEXT.loading}</p>}
        {state.status === "failed" && <Banner tone="problem">{TEXT.loadFailed}</Banner>}
        {state.status === "loaded" && <LoadedHolidays loaded={state.data} />}
      </div>
    </Section>
  );
}

/**
 * The holidays once read. A change made here is kept in place from the server's own answer, so
 * the list is never read again and the page never moves (design system rule 8).
 */
function LoadedHolidays({ loaded }: { loaded: readonly Holiday[] }) {
  const [holidays, setHolidays] = useState(loaded);
  const areaRef = useRef<HTMLDivElement>(null);
  return (
    <div ref={areaRef} className="grid min-w-0 content-start gap-4">
      <ComingHolidays
        holidays={holidays}
        areaRef={areaRef}
        onRemoved={(ids) => {
          setHolidays((known) => known.filter((holiday) => !ids.includes(holiday.id)));
        }}
      />
      <AddHolidayForm
        holidays={holidays}
        onAdded={(added) => {
          setHolidays((known) => [...known, ...added]);
        }}
      />
    </div>
  );
}

type ComingHolidaysProps = {
  holidays: readonly Holiday[];
  areaRef: RefObject<HTMLDivElement | null>;
  onRemoved: (ids: readonly string[]) => void;
};

/** The coming holidays, each removed as one after the shared confirm popup. */
function ComingHolidays({ holidays, areaRef, onRemoved }: ComingHolidaysProps) {
  const dates = useDates();
  const { showToast } = useToast();
  const [removing, setRemoving] = useState<HolidayGroup | null>(null);
  const focusAfterChange = useFocusAfterChange();
  const { coming } = splitHolidays(holidayGroups(holidays), todayIso());

  async function remove(group: HolidayGroup): Promise<void> {
    const ids = group.days.map((day) => day.id);
    const place = coming.findIndex((one) => one.key === group.key);
    await removeHolidays(ids);
    setRemoving(null);
    showToast(TEXT.removed(group.name));
    onRemoved(ids);
    focusAfterChange(() => afterRemoval(areaRef.current, place));
  }

  return (
    <>
      {holidays.length === 0 ? (
        <Panel>
          <EmptyState>{TEXT.none}</EmptyState>
        </Panel>
      ) : (
        <HolidayCards
          title={TEXT.comingUp}
          level="h4"
          groups={coming}
          emptyText={TEXT.noneComing}
          onRemove={setRemoving}
        />
      )}
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
          {removalWords(removing, dates.date)}
        </ConfirmDialog>
      )}
    </>
  );
}

/** What removing does: one day is named, several are counted. */
function removalWords(group: HolidayGroup, formatDay: (iso: string) => string): string {
  const [first] = group.days;
  if (group.days.length === 1 && first !== undefined) return TEXT.removeBody(formatDay(first.date));
  return TEXT.removeBodyDays(group.days.length);
}

/**
 * The removed card is gone, so the cursor goes to the Remove now in its place, else the one
 * before, else the name of a new holiday (design system rule 8).
 */
function afterRemoval(area: HTMLElement | null, place: number): HTMLElement | null {
  if (area === null) return null;
  const buttons = [...area.querySelectorAll<HTMLElement>(HOLIDAY_CARD_BUTTONS)];
  return (
    buttons[place] ??
    buttons[place - 1] ??
    area.querySelector<HTMLElement>(`input[name="${NAME_FIELD}"]`)
  );
}

type FieldErrors = { dates?: string[] | undefined; name?: string[] | undefined };

type AddHolidayFormProps = {
  holidays: readonly Holiday[];
  onAdded: (added: readonly Holiday[]) => void;
};

/**
 * Add a holiday: give it a name and tap each of its days on the calendar (tap again to take one
 * off). One call adds every day, or none: a refused day keeps the days chosen.
 */
function AddHolidayForm({ holidays, onAdded }: AddHolidayFormProps) {
  const { showToast } = useToast();
  const [chosen, setChosen] = useState<readonly string[]>([]);
  const [name, setName] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function add(dates: readonly string[], trimmed: string): Promise<void> {
    setIsSaving(true);
    try {
      const added = await addHolidays({ name: trimmed, dates });
      setChosen([]);
      setName("");
      showToast(TEXT.added(trimmed, added.length));
      onAdded(added);
    } catch (error: unknown) {
      if (error instanceof InvalidFieldsError) setErrors(refusedFields(error.fieldErrors));
      else setFailure(TEXT.saveFailed);
    } finally {
      setIsSaving(false);
    }
  }

  function submit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    const trimmed = name.trim();
    const problems = {
      dates: daysProblem(chosen.length),
      name: trimmed === "" ? [TEXT.enterName] : undefined,
    };
    setFailure(null);
    setErrors(problems);
    if (problems.dates === undefined && problems.name === undefined) void add(chosen, trimmed);
  }

  return (
    <Panel isPadded>
      <form noValidate onSubmit={submit} className="grid gap-4">
        <h4 className="text-body text-ink font-semibold">{TEXT.addTitle}</h4>
        <div className="max-w-90">
          <TextField
            label={TEXT.nameLabel}
            name={NAME_FIELD}
            placeholder={TEXT.namePlaceholder}
            value={name}
            onChange={setName}
            errors={errors.name}
          />
        </div>
        <HolidayCalendar
          holidays={holidays}
          chosen={chosen}
          onToggle={(iso) => {
            setChosen((known) => toggleDay(known, iso));
          }}
          errors={errors.dates}
        />
        {failure !== null && <Banner tone="problem">{failure}</Banner>}
        <div>
          <Button type="submit" icon="plus" isLoading={isSaving}>
            {TEXT.add}
          </Button>
        </div>
      </form>
    </Panel>
  );
}

/** Why these days can't be sent, before asking the server. */
function daysProblem(count: number): string[] | undefined {
  if (count === 0) return [TEXT.chooseDay];
  return count > HOLIDAY_DAYS_MAX ? [TEXT.tooManyDays(HOLIDAY_DAYS_MAX)] : undefined;
}

function refusedFields(refused: FieldErrors): FieldErrors {
  return { dates: refused.dates, name: refused.name };
}
