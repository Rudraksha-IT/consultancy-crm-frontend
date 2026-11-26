"use client";

import Link from "next/link";
import { useCallback } from "react";

import { Banner } from "@/components/ui/Banner";
import { Section } from "@/components/ui/Section";
import { Loading } from "@/components/ui/Loading";
import { HIGH_PRIORITY_SHOWN, HOME_TEXT } from "@/constants/home";
import { LABELS } from "@/constants/messages";
import { ROUTES } from "@/constants/routes";
import { STAGE_LABELS } from "@/constants/stages";
import { CounsellorFilter } from "@/constants/students";
import { fetchHighPriorityStudents, type StudentPage, type StudentRow } from "@/lib/api";

import { DeskEmpty } from "./DeskEmpty";
import { SeeAllLink } from "./SeeAllLink";
import { useLoaded, type Loaded } from "./useLoaded";

type HighPriorityStudentsProps = {
  /** A counsellor's own Students; an Admin's are everyone's. */
  mine: boolean;
};

/**
 * The High priority Students still being worked on (Lost left out): at most 4 on one sheet, each
 * opening the Student, and "See all (N)" beside the title when there are more (ticket 12; spec
 * 90-94). Four to a row on computers, two on tablets, one on phones; in Home's desk column (from
 * 1280) one under another, each a name and one line whatever its text (UI revamp 07).
 */
export function HighPriorityStudents({ mine }: HighPriorityStudentsProps) {
  const load = useCallback(() => fetchHighPriorityStudents({ mine }), [mine]);
  const state = useLoaded(load, 0);
  const seeAll = ROUTES.studentsWhere(
    mine ? { priority: "high", counsellor: CounsellorFilter.Me } : { priority: "high" },
  );
  const hasMore = state.status === "loaded" && state.data.count > HIGH_PRIORITY_SHOWN;
  return (
    <Section
      title={HOME_TEXT.highPriorityTitle}
      keepsAsideOnLine
      {...(hasMore && { aside: <SeeAllLink href={seeAll} count={state.data.count} /> })}
    >
      <HighBody state={state} />
    </Section>
  );
}

function HighBody({ state }: { state: Loaded<StudentPage> }) {
  if (state.status === "loading") return <Loading />;
  if (state.status === "failed") {
    return <Banner tone="problem">{HOME_TEXT.highPriorityFailed}</Banner>;
  }
  const { students } = state.data;
  if (students.length === 0) return <DeskEmpty>{HOME_TEXT.noHighPriority}</DeskEmpty>;
  return (
    <ul
      aria-label={HOME_TEXT.highPriorityTitle}
      className="rounded-panel border-sheet-rule bg-paper shadow-raise tablet:grid-cols-2 wide:grid-cols-4 desk:grid-cols-1 grid gap-1 border p-1.5"
    >
      {students.slice(0, HIGH_PRIORITY_SHOWN).map((student) => (
        <li key={student.id} className="grid min-w-0">
          <HighBox student={student} />
        </li>
      ))}
    </ul>
  );
}

/**
 * One High Student, with the priority mark: the name, then their counsellor and Stage (on one
 * line in the desk column). Long text is cut with "…", so every row is the same height.
 */
function HighBox({ student }: { student: StudentRow }) {
  return (
    <Link
      href={ROUTES.student(student.id)}
      className="rounded-control hover:bg-fill grid min-w-0 content-center gap-0.5 px-3 py-2.5 no-underline"
    >
      <span className="text-ink flex min-w-0 items-center gap-2 font-semibold">
        <span aria-hidden="true" className="bg-bad size-2 shrink-0 rounded-full" />
        <span className="truncate">{student.name}</span>
      </span>
      <span className="text-small text-ink-2 desk:flex desk:gap-3 desk:whitespace-nowrap grid min-w-0 gap-0.5">
        <span className="truncate">
          {HOME_TEXT.counsellorLine(student.assignedCounsellor?.name ?? LABELS.notAssigned)}
        </span>
        <span className="desk:flex-none truncate">
          {HOME_TEXT.stageLine(STAGE_LABELS[student.stage])}
        </span>
      </span>
    </Link>
  );
}
