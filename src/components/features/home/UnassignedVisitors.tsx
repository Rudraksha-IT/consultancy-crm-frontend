"use client";

import Link from "next/link";
import { useState } from "react";

import { AssignCounsellorDialog } from "@/components/features/students/profile/CounsellorDialog";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
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

/** Leads nobody counsels yet, newest first, each with Assign (spec 22a, 28). */
export function UnassignedVisitors() {
  const [version, setVersion] = useState(0);
  const [assigning, setAssigning] = useState<StudentRow | null>(null);
  const state = useLoaded(loadUnassigned, version);

  return (
    <Section title={HOME_TEXT.unassignedTitle} fills>
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
  if (shown.length === 0) {
    return (
      <Panel>
        <EmptyState>{HOME_TEXT.everyoneHasCounsellor}</EmptyState>
      </Panel>
    );
  }
  return (
    <div className="grid grid-rows-[1fr_auto] gap-3">
      <Panel>
        <RowList label={HOME_TEXT.unassignedTitle}>
          {shown.map((student) => (
            <VisitorRow key={student.id} student={student} onAssign={onAssign} />
          ))}
        </RowList>
      </Panel>
      <SeeAllLink
        href={ROUTES.studentsWhere({ stage: Stage.Lead, counsellor: CounsellorFilter.None })}
        count={state.data.count}
      />
    </div>
  );
}

function VisitorRow({
  student,
  onAssign,
}: {
  student: StudentRow;
  onAssign: VisitorsBodyProps["onAssign"];
}) {
  return (
    <RowItem
      title={
        <Link
          href={ROUTES.student(student.id)}
          className="min-h-control inline-flex items-center hover:underline"
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
        <Button
          variant="primary"
          onClick={() => {
            onAssign(student);
          }}
        >
          <span aria-hidden="true">{HOME_TEXT.assign}</span>
          <span className="sr-only">{HOME_TEXT.assignNamed(student.name)}</span>
        </Button>
      }
    />
  );
}
