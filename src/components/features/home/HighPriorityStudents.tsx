"use client";

import Link from "next/link";
import { useCallback } from "react";

import { Banner } from "@/components/ui/Banner";
import { EmptyState } from "@/components/ui/EmptyState";
import { Panel } from "@/components/ui/Panel";
import { RowItem } from "@/components/ui/RowItem";
import { RowList } from "@/components/ui/RowList";
import { Section } from "@/components/ui/Section";
import { StageMeter } from "@/components/ui/StageMeter";
import { HIGH_PRIORITY_SHOWN, HOME_TEXT } from "@/constants/home";
import { LABELS, MESSAGES } from "@/constants/messages";
import { ROUTES } from "@/constants/routes";
import { COUNTRY_LABELS, CounsellorFilter } from "@/constants/students";
import { fetchHighPriorityStudents, type StudentPage, type StudentRow } from "@/lib/api";

import { SeeAllLink } from "./SeeAllLink";
import { useLoaded, type Loaded } from "./useLoaded";

type HighPriorityStudentsProps = {
  /** A counsellor's own Students; an Admin's are everyone's. */
  mine: boolean;
};

/**
 * The High priority Students still being worked on (Lost left out), first 3 with "See all (N)"
 * opening the Students list at High (ticket 12; spec 90-94).
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
    <>
      <Panel>
        <RowList label={HOME_TEXT.highPriorityTitle}>
          {students.slice(0, HIGH_PRIORITY_SHOWN).map((student) => (
            <HighRow key={student.id} student={student} showsCounsellor={showsCounsellor} />
          ))}
        </RowList>
      </Panel>
      <SeeAllLink href={seeAll} count={count} />
    </>
  );
}

function HighRow({ student, showsCounsellor }: { student: StudentRow; showsCounsellor: boolean }) {
  return (
    <RowItem
      title={
        <Link
          href={ROUTES.student(student.id)}
          className="text-ink hover:text-accent min-h-control inline-flex items-center break-words underline-offset-4 hover:underline"
        >
          {student.name}
        </Link>
      }
      meta={
        <>
          <span>{HOME_TEXT.wants(COUNTRY_LABELS[student.country])}</span>
          {showsCounsellor && (
            <span>{student.assignedCounsellor?.name ?? LABELS.noCounsellorYet}</span>
          )}
        </>
      }
      right={<StageMeter stage={student.stage} />}
    />
  );
}
