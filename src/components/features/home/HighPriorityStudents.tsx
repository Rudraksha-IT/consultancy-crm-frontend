"use client";

import Link from "next/link";
import { useCallback } from "react";

import { Banner } from "@/components/ui/Banner";
import { EmptyState } from "@/components/ui/EmptyState";
import { Panel } from "@/components/ui/Panel";
import { Section } from "@/components/ui/Section";
import { Icon } from "@/components/ui/Icon";
import { HIGH_PRIORITY_SHOWN, HOME_TEXT } from "@/constants/home";
import { LABELS, MESSAGES } from "@/constants/messages";
import { ROUTES } from "@/constants/routes";
import { STAGE_LABELS } from "@/constants/stages";
import { CounsellorFilter } from "@/constants/students";
import { fetchHighPriorityStudents, type StudentPage, type StudentRow } from "@/lib/api";

import { useLoaded, type Loaded } from "./useLoaded";

type HighPriorityStudentsProps = {
  /** A counsellor's own Students; an Admin's are everyone's. */
  mine: boolean;
};

/**
 * The High priority Students still being worked on (Lost left out): at most 4 slim boxes in one
 * row, each opening the Student, and "See all (N)" beside the title when there are more
 * (ticket 12; spec 90-94). Two to a row on tablets, one on phones.
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
      {...(hasMore && {
        aside: (
          <Link
            href={seeAll}
            className="text-accent min-h-control inline-flex items-center gap-1.5 font-semibold underline-offset-4 hover:underline"
          >
            {HOME_TEXT.seeAllCount(state.data.count)}
            <Icon name="right" size="sm" />
          </Link>
        ),
      })}
    >
      <HighBody state={state} />
    </Section>
  );
}

function HighBody({ state }: { state: Loaded<StudentPage> }) {
  if (state.status === "loading") return <p className="text-ink-2">{MESSAGES.loading}</p>;
  if (state.status === "failed") {
    return <Banner tone="problem">{HOME_TEXT.highPriorityFailed}</Banner>;
  }
  const { students } = state.data;
  if (students.length === 0) {
    return (
      <Panel>
        <EmptyState>{HOME_TEXT.noHighPriority}</EmptyState>
      </Panel>
    );
  }
  return (
    <ul
      aria-label={HOME_TEXT.highPriorityTitle}
      className="tablet:grid-cols-2 wide:grid-cols-4 grid gap-3"
    >
      {students.slice(0, HIGH_PRIORITY_SHOWN).map((student) => (
        <li key={student.id} className="grid min-w-0">
          <HighBox student={student} />
        </li>
      ))}
    </ul>
  );
}

/** One High Student as a slim box: the name, then their counsellor and Stage; it opens them. */
function HighBox({ student }: { student: StudentRow }) {
  return (
    <Link
      href={ROUTES.student(student.id)}
      className="rounded-control border-rule bg-paper shadow-raise hover:border-accent focus-visible:border-accent grid min-w-0 gap-0.5 border px-4 py-3 transition-colors"
    >
      <span className="text-ink flex min-w-0 items-center gap-2 font-semibold">
        <span aria-hidden="true" className="bg-bad size-2 shrink-0 rounded-full" />
        <span className="truncate">{student.name}</span>
      </span>
      <span className="text-small text-ink-2 truncate">
        {HOME_TEXT.counsellorLine(student.assignedCounsellor?.name ?? LABELS.notAssigned)}
      </span>
      <span className="text-small text-ink-2 truncate">
        {HOME_TEXT.stageLine(STAGE_LABELS[student.stage])}
      </span>
    </Link>
  );
}
