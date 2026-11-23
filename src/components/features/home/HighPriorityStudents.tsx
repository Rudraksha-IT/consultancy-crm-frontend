"use client";

import clsx from "clsx";
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
import { COUNTRY_LABELS, CounsellorFilter } from "@/constants/students";
import { fetchHighPriorityStudents, type StudentPage, type StudentRow } from "@/lib/api";

import { useLoaded, type Loaded } from "./useLoaded";

type HighPriorityStudentsProps = {
  /** A counsellor's own Students; an Admin's are everyone's. */
  mine: boolean;
};

/**
 * The High priority Students still being worked on (Lost left out): at most 3 small boxes in one
 * row, each opening the Student, and a last box "See all (N)" opening the Students list at High
 * (ticket 12; spec 90-94). Two to a row on tablets, one on phones.
 */
export function HighPriorityStudents({ mine }: HighPriorityStudentsProps) {
  const load = useCallback(() => fetchHighPriorityStudents({ mine }), [mine]);
  const state = useLoaded(load, 0);
  const seeAll = ROUTES.studentsWhere(
    mine ? { priority: "high", counsellor: CounsellorFilter.Me } : { priority: "high" },
  );
  return (
    <Section title={HOME_TEXT.highPriorityTitle}>
      <HighBody state={state} seeAll={seeAll} showsCounsellor={!mine} />
    </Section>
  );
}

type HighBodyProps = { state: Loaded<StudentPage>; seeAll: string; showsCounsellor: boolean };

function HighBody({ state, seeAll, showsCounsellor }: HighBodyProps) {
  if (state.status === "loading") return <p className="text-ink-2">{MESSAGES.loading}</p>;
  if (state.status === "failed") {
    return <Banner tone="problem">{HOME_TEXT.highPriorityFailed}</Banner>;
  }
  const { students, count } = state.data;
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
      className="tablet:grid-cols-2 wide:grid-cols-4 grid gap-4"
    >
      {students.slice(0, HIGH_PRIORITY_SHOWN).map((student) => (
        <li key={student.id} className="grid">
          <HighBox student={student} showsCounsellor={showsCounsellor} />
        </li>
      ))}
      <li className="grid">
        <Link
          href={seeAll}
          className={clsx(BOX, "text-accent items-center justify-center gap-1.5 font-semibold")}
        >
          {HOME_TEXT.seeAllCount(count)}
          <Icon name="right" size="sm" />
        </Link>
      </li>
    </ul>
  );
}

const BOX =
  "rounded-panel border-rule bg-paper shadow-raise hover:border-accent focus-visible:border-accent flex min-h-24 min-w-0 border p-5 transition-colors";

/** One High Student as a small box; the whole box opens their page. */
function HighBox({ student, showsCounsellor }: { student: StudentRow; showsCounsellor: boolean }) {
  return (
    <Link href={ROUTES.student(student.id)} className={clsx(BOX, "flex-col gap-2")}>
      <span className="text-ink flex min-w-0 items-center gap-2 font-semibold">
        <span aria-hidden="true" className="bg-bad size-2.5 shrink-0 rounded-full" />
        <span className="truncate">{student.name}</span>
      </span>
      <span className="text-secondary text-ink-2">{STAGE_LABELS[student.stage]}</span>
      <span className="text-small text-ink-3 truncate">
        {showsCounsellor
          ? (student.assignedCounsellor?.name ?? LABELS.noCounsellorYet)
          : HOME_TEXT.wants(COUNTRY_LABELS[student.country])}
      </span>
    </Link>
  );
}
