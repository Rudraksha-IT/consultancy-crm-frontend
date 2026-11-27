"use client";

import Link from "next/link";
import { useState } from "react";

import { AssignCounsellorDialog } from "@/components/features/students/profile/CounsellorDialog";
import { Banner } from "@/components/ui/Banner";
import { Panel } from "@/components/ui/Panel";
import { RowItem } from "@/components/ui/RowItem";
import { RowList } from "@/components/ui/RowList";
import { Section } from "@/components/ui/Section";
import { Loading } from "@/components/ui/Loading";
import { HOME_TEXT, UNASSIGNED_SHOWN } from "@/constants/home";
import { ROUTES } from "@/constants/routes";
import { Stage } from "@/constants/stages";
import { COUNTRY_LABELS, CounsellorFilter, SOURCE_LABELS } from "@/constants/students";
import { fetchStudents, type StudentPage, type StudentRow } from "@/lib/api";

import { DeskEmpty } from "./DeskEmpty";
import { SeeAllLink } from "./SeeAllLink";
import { useLoaded, type Loaded } from "./useLoaded";

const NEW_WITHOUT_COUNSELLOR = {
  search: "",
  stage: Stage.Lead,
  priority: "",
  counsellor: CounsellorFilter.None,
  source: "",
  country: "",
  targetLevel: "",
} as const;

function loadUnassigned() {
  return fetchStudents(NEW_WITHOUT_COUNSELLOR, 1);
}

const SEE_ALL = ROUTES.studentsWhere({ stage: Stage.Lead, counsellor: CounsellorFilter.None });

/**
 * Leads nobody counsels yet, newest first, at most 3, each with Assign (spec 22a, 28). "See all
 * (N)" sits beside the title (UI revamp 07). A part of the Admin's desk column.
 */
export function UnassignedVisitors() {
  const [version, setVersion] = useState(0);
  const [assigning, setAssigning] = useState<StudentRow | null>(null);
  const state = useLoaded(loadUnassigned, version);
  const hasAny = state.status === "loaded" && state.data.students.length > 0;

  return (
    <Section
      title={HOME_TEXT.unassignedTitle}
      keepsAsideOnLine
      {...(hasAny && { aside: <SeeAllLink href={SEE_ALL} count={state.data.count} /> })}
    >
      <VisitorsBody state={state} onAssign={setAssigning} />
      {assigning !== null && (
        <AssignCounsellorDialog
          profile={assigning}
          onClose={() => {
            setAssigning(null);
          }}
          onSaved={() => {
            setAssigning(null);
            setVersion((current) => current + 1);
          }}
        />
      )}
    </Section>
  );
}

type VisitorsBodyProps = {
  state: Loaded<StudentPage>;
  onAssign: (student: StudentRow) => void;
};

function VisitorsBody({ state, onAssign }: VisitorsBodyProps) {
  if (state.status === "loading") return <Loading />;
  if (state.status === "failed") {
    return <Banner tone="problem">{HOME_TEXT.unassignedFailed}</Banner>;
  }
  const shown = state.data.students.slice(0, UNASSIGNED_SHOWN);
  if (shown.length === 0) return <DeskEmpty>{HOME_TEXT.everyoneHasCounsellor}</DeskEmpty>;
  return (
    <Panel>
      <RowList label={HOME_TEXT.unassignedTitle}>
        {shown.map((student) => (
          <VisitorRow key={student.id} student={student} onAssign={onAssign} />
        ))}
      </RowList>
    </Panel>
  );
}

/**
 * On phones Assign is a small pill beside the visitor's name, not a wide bar under it: the
 * button stays 44 tall to tap and draws a 32 pill inside (UI revamp 07). In the desk column the
 * name stays on one line.
 */
const ASSIGN_BUTTON =
  "min-h-control rounded-control border-accent bg-accent text-accent-ink text-button px-button-main hover:border-accent-hover hover:bg-accent-hover max-phone:border-transparent max-phone:bg-transparent max-phone:px-0 max-phone:hover:bg-transparent inline-flex cursor-pointer items-center border font-medium whitespace-nowrap";
const ASSIGN_PILL =
  "max-phone:min-h-pill max-phone:rounded-pill max-phone:bg-accent max-phone:text-button-sm max-phone:px-3.5 inline-flex items-center";

function VisitorRow({
  student,
  onAssign,
}: {
  student: StudentRow;
  onAssign: VisitorsBodyProps["onAssign"];
}) {
  return (
    <RowItem
      keepsRightBesideOnPhone
      title={
        <Link
          href={ROUTES.student(student.id)}
          className="min-h-control desk:block desk:truncate desk:leading-(--spacing-control) inline-flex items-center hover:underline"
        >
          {student.name}
        </Link>
      }
      meta={
        <>
          <span>{HOME_TEXT.wants(COUNTRY_LABELS[student.country])}</span>
          <span>{SOURCE_LABELS[student.source]}</span>
        </>
      }
      right={
        <button
          type="button"
          aria-label={HOME_TEXT.assignNamed(student.name)}
          onClick={() => {
            onAssign(student);
          }}
          className={ASSIGN_BUTTON}
        >
          <span className={ASSIGN_PILL}>{HOME_TEXT.assign}</span>
        </button>
      }
    />
  );
}
