"use client";

import { useCallback, useState } from "react";

import { useLoaded, type Loaded } from "@/components/features/home/useLoaded";
import { Avatar } from "@/components/ui/Avatar";
import { Banner } from "@/components/ui/Banner";
import { Panel } from "@/components/ui/Panel";
import { SearchBox } from "@/components/ui/SearchBox";
import { StageMeter } from "@/components/ui/StageMeter";
import {
  RETURNING_MATCHES_SHOWN,
  RETURNING_SEARCH_MIN_LENGTH,
  VISIT_TEXT,
} from "@/constants/visits";
import { MESSAGES } from "@/constants/messages";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { fetchStudents, type StudentPage, type StudentRow } from "@/lib/api";
import { NO_STUDENT_FILTERS } from "@/lib/students";

import { ReturningVisitor } from "./ReturningVisitor";

const SEARCH_DELAY_MS = 300;

/**
 * A returning visitor: find them by name or mobile number, then log why they came (spec 23a).
 * `onLogged` runs after a Visit is saved, so today's timeline can reload.
 */
export function ReturningVisitorPanel({ onLogged }: { onLogged: () => void }) {
  const [search, setSearch] = useState("");
  const [pickedId, setPickedId] = useState<number | null>(null);

  function startOver(): void {
    setPickedId(null);
    setSearch("");
  }

  if (pickedId !== null) {
    return (
      <ReturningVisitor
        studentId={pickedId}
        onChooseAnother={startOver}
        onLogged={() => {
          startOver();
          onLogged();
        }}
      />
    );
  }
  return (
    <Panel isPadded>
      <div className="grid gap-2">
        <span className="text-body font-semibold" aria-hidden="true">
          {VISIT_TEXT.findTheVisitor}
        </span>
        <SearchBox
          label={VISIT_TEXT.findTheVisitor}
          placeholder={VISIT_TEXT.findPlaceholder}
          value={search}
          onChange={setSearch}
        />
      </div>
      <Matches search={search} onPick={setPickedId} />
    </Panel>
  );
}

function Matches({ search, onPick }: { search: string; onPick: (id: number) => void }) {
  const settled = useDebouncedValue(search.trim(), SEARCH_DELAY_MS);
  if (settled.length < RETURNING_SEARCH_MIN_LENGTH) {
    return <p className="text-ink-2">{VISIT_TEXT.startTyping}</p>;
  }
  return <FoundStudents key={settled} search={settled} onPick={onPick} />;
}

function FoundStudents({ search, onPick }: { search: string; onPick: (id: number) => void }) {
  const load = useCallback(() => fetchStudents({ ...NO_STUDENT_FILTERS, search }, 1), [search]);
  const state = useLoaded(load, 0);
  return <MatchList state={state} onPick={onPick} />;
}

function MatchList({
  state,
  onPick,
}: {
  state: Loaded<StudentPage>;
  onPick: (id: number) => void;
}) {
  if (state.status === "loading") return <p className="text-ink-2">{MESSAGES.loading}</p>;
  if (state.status === "failed") return <Banner tone="problem">{VISIT_TEXT.searchFailed}</Banner>;
  const shown = state.data.students.slice(0, RETURNING_MATCHES_SHOWN);
  if (shown.length === 0) return <p className="text-ink-2">{VISIT_TEXT.noOneMatches}</p>;
  return (
    <ul aria-label={VISIT_TEXT.matches} className="grid gap-2">
      {shown.map((student) => (
        <li key={student.id}>
          <MatchButton student={student} onPick={onPick} />
        </li>
      ))}
    </ul>
  );
}

function MatchButton({ student, onPick }: { student: StudentRow; onPick: (id: number) => void }) {
  return (
    <button
      type="button"
      aria-label={VISIT_TEXT.pick(student.name)}
      onClick={() => {
        onPick(student.id);
      }}
      className="rounded-control border-rule bg-paper hover:border-accent min-h-control-lg flex w-full cursor-pointer flex-wrap items-center gap-x-4 gap-y-2 border px-4 py-3 text-left"
    >
      <Avatar name={student.name} />
      <span className="grid min-w-0 flex-1">
        <b className="break-words">{student.name}</b>
        <span className="text-secondary text-ink-2 tabular-nums">{student.phone}</span>
      </span>
      <StageMeter stage={student.stage} />
    </button>
  );
}
