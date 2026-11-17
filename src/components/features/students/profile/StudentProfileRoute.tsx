"use client";

import { ButtonLink } from "@/components/ui/ButtonLink";
import { EmptyState } from "@/components/ui/EmptyState";
import { Panel } from "@/components/ui/Panel";
import { LABELS, MESSAGES } from "@/constants/messages";
import { ROUTES } from "@/constants/routes";
import { parseStudentId } from "@/lib/students";

import { StudentProfilePage } from "./StudentProfilePage";

/** The Student page for the id in the address; an address that isn't an id finds nobody. */
export function StudentProfileRoute({ idText }: { idText: string }) {
  const studentId = parseStudentId(idText);
  if (studentId === null) {
    return (
      <Panel>
        <EmptyState action={<ButtonLink href={ROUTES.students}>{LABELS.allStudents}</ButtonLink>}>
          {MESSAGES.studentNotFound}
        </EmptyState>
      </Panel>
    );
  }
  return <StudentProfilePage key={studentId} studentId={studentId} />;
}
