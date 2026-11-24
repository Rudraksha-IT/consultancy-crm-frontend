"use client";

import { useEffect, useState } from "react";

import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { IconButton } from "@/components/ui/IconButton";
import { SearchBox } from "@/components/ui/SearchBox";
import { COMMUNICATION_TEXT as TEXT } from "@/constants/communication";
import { LABELS } from "@/constants/messages";
import { STAGE_LABELS } from "@/constants/stages";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { fetchStudentsByName, type StudentRow } from "@/lib/api";

import type { EmailRecipient } from "./recipients";

const SEARCH_DELAY_MS = 300;

type StudentPickerProps = {
  /** One: a click picks that Student. Many: tick each, then go on to write. */
  mode: "one" | "many";
  /** Who is ticked already (many), e.g. from a class or after Change. */
  chosen: readonly EmailRecipient[];
  /** Said above the list, e.g. that only the first Students allowed were ticked. */
  note: string | null;
  onPick: (recipients: readonly EmailRecipient[]) => void;
  onClose: () => void;
};

/**
 * Choose who an email goes to (issue 04): search by name, phone or email; Lost Students and
 * Students with no email address are shown but can't be chosen.
 */
export function StudentPicker({ mode, chosen, note, onPick, onClose }: StudentPickerProps) {
  const [search, setSearch] = useState("");
  const found = useFound(useDebouncedValue(search.trim(), SEARCH_DELAY_MS));
  const [ticked, setTicked] = useState<readonly EmailRecipient[]>(chosen);
  const isMany = mode === "many";

  function toggle(student: EmailRecipient, isOn: boolean): void {
    setTicked((current) =>
      isOn ? [...current, student] : current.filter((one) => one.id !== student.id),
    );
  }

  return (
    <Dialog
      isOpen
      isWide
      hasSmallText
      title={WORDS[mode].title}
      onClose={onClose}
      // One Student: the × closes it. Many: Cancel and Next stay at the top (list tidy-ups 28).
      headerAside={
        isMany ? <PickerActions ticked={ticked} onPick={onPick} onClose={onClose} /> : undefined
      }
    >
      <p className="text-secondary text-ink-2">{WORDS[mode].hint}</p>
      {note !== null && <Banner tone="info">{note}</Banner>}
      <div className="flex">
        <SearchBox
          label={TEXT.findAStudent}
          placeholder={TEXT.findPlaceholder}
          value={search}
          onChange={setSearch}
        />
      </div>
      {isMany && (
        <Chosen
          ticked={ticked}
          onRemove={(student) => {
            toggle(student, false);
          }}
          onClear={() => {
            setTicked([]);
          }}
        />
      )}
      <Found
        found={found}
        search={search.trim()}
        isMany={isMany}
        ticked={ticked}
        onPick={(student) => {
          onPick([student]);
        }}
        onToggle={toggle}
      />
    </Dialog>
  );
}

const WORDS = {
  one: { title: TEXT.emailAStudent, hint: TEXT.pickOneHint },
  many: { title: TEXT.emailManyStudents, hint: TEXT.pickManyHint },
} as const;

type PickerActionsProps = {
  ticked: readonly EmailRecipient[];
  onPick: (recipients: readonly EmailRecipient[]) => void;
  onClose: () => void;
};

/** Cancel, and "Next: write the email" once someone is ticked. */
function PickerActions({ ticked, onPick, onClose }: PickerActionsProps) {
  return (
    <div className="max-phone:*:flex-1 flex flex-wrap gap-3">
      <Button onClick={onClose}>{LABELS.cancel}</Button>
      <Button
        variant="primary"
        icon="right"
        isDisabled={ticked.length === 0}
        onClick={() => {
          onPick(ticked);
        }}
      >
        {TEXT.nextWrite}
      </Button>
    </div>
  );
}

type FoundState =
  { status: "loading" } | { status: "loaded"; students: StudentRow[] } | { status: "failed" };

/** The first page of Students matching `search` (everyone when it is empty), A to Z. */
function useFound(search: string): FoundState {
  const [state, setState] = useState<FoundState>({ status: "loading" });
  useEffect(() => {
    let isCancelled = false;
    fetchStudentsByName(search).then(
      (page) => {
        if (!isCancelled) setState({ status: "loaded", students: page.students });
      },
      () => {
        if (!isCancelled) setState({ status: "failed" });
      },
    );
    return () => {
      isCancelled = true;
    };
  }, [search]);
  return state;
}

/** Anyone with an address; Lost Students too, to ask whether they want to carry on (34). */
function isChoosable(student: StudentRow): boolean {
  return student.email !== "";
}

function recipientOf({ id, name, email, stage }: StudentRow): EmailRecipient {
  return { id, name, email, stage };
}

type ChosenProps = {
  ticked: readonly EmailRecipient[];
  onRemove: (student: EmailRecipient) => void;
  onClear: () => void;
};

/** How many are chosen, each with a way to take them out, and Clear. */
function Chosen({ ticked, onRemove, onClear }: ChosenProps) {
  return (
    <div className="bg-fill rounded-control grid gap-2 px-3 py-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-secondary font-semibold" aria-live="polite">
          {ticked.length === 0 ? TEXT.nobodyChosen : TEXT.chosenCount(ticked.length)}
        </p>
        {ticked.length > 0 && (
          <Button size="sm" variant="ghost" onClick={onClear}>
            {TEXT.clear}
          </Button>
        )}
      </div>
      {ticked.length > 0 && (
        <ul aria-label={TEXT.chosenCount(ticked.length)} className="flex flex-wrap gap-2">
          {ticked.map((student) => (
            <li
              key={student.id}
              className="bg-paper rounded-control text-small flex min-w-0 items-center gap-1 pl-2.5"
            >
              <span className="min-w-0 truncate">{student.name}</span>
              <IconButton
                icon="x"
                label={TEXT.remove(student.name)}
                iconSize="sm"
                onClick={() => {
                  onRemove(student);
                }}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type FoundProps = {
  found: FoundState;
  search: string;
  isMany: boolean;
  ticked: readonly EmailRecipient[];
  onPick: (student: EmailRecipient) => void;
  onToggle: (student: EmailRecipient, isOn: boolean) => void;
};

function Found({ found, search, isMany, ticked, onPick, onToggle }: FoundProps) {
  if (found.status === "loading") return <p className="text-ink-2">{TEXT.loadingStudents}</p>;
  if (found.status === "failed") return <Banner tone="problem">{TEXT.searchFailed}</Banner>;
  if (found.students.length === 0) return <p className="text-ink-2">{TEXT.noMatch(search)}</p>;
  return (
    // Only the list scrolls; the search and the chosen names stay put (list tidy-ups 28).
    <ul
      aria-label={TEXT.studentsList}
      className="border-rule divide-rule max-h-picker-list grid divide-y overflow-y-auto overscroll-contain border-y"
    >
      {found.students.map((student) => (
        <li key={student.id}>
          {isMany ? (
            <TickRow
              student={student}
              isTicked={ticked.some((one) => one.id === student.id)}
              onToggle={onToggle}
            />
          ) : (
            <button
              type="button"
              disabled={!isChoosable(student)}
              onClick={() => {
                onPick(recipientOf(student));
              }}
              className="hover:bg-fill min-h-control flex w-full cursor-pointer items-center justify-between gap-4 px-2 py-3 text-left disabled:cursor-not-allowed disabled:opacity-60"
            >
              <StudentLine student={student} />
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

type TickRowProps = {
  student: StudentRow;
  isTicked: boolean;
  onToggle: (student: EmailRecipient, isOn: boolean) => void;
};

function TickRow({ student, isTicked, onToggle }: TickRowProps) {
  const isDisabled = !isChoosable(student);
  return (
    <label className="hover:bg-fill min-h-control flex cursor-pointer items-center gap-3 px-2 py-3 has-disabled:cursor-not-allowed has-disabled:opacity-60">
      <input
        type="checkbox"
        checked={isTicked}
        disabled={isDisabled}
        onChange={(event) => {
          onToggle(recipientOf(student), event.target.checked);
        }}
        className="accent-accent size-5 flex-none"
      />
      <StudentLine student={student} />
    </label>
  );
}

/** The name, then the address (or that there is none) and the Stage. */
function StudentLine({ student }: { student: StudentRow }) {
  return (
    <span className="grid min-w-0 flex-1 gap-0.5">
      <span className="text-ink truncate font-semibold">{student.name}</span>
      <span className="text-tiny text-ink-2 truncate">
        {student.email === "" ? TEXT.noEmail : student.email} · {STAGE_LABELS[student.stage]}
      </span>
    </span>
  );
}
