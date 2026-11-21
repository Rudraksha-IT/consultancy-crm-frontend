"use client";

import { ButtonLink } from "@/components/ui/ButtonLink";
import { EmptyState } from "@/components/ui/EmptyState";
import { Panel } from "@/components/ui/Panel";
import { LABELS, MESSAGES } from "@/constants/messages";
import { ROUTES } from "@/constants/routes";
import { parseRecordId } from "@/lib/recordId";

import { profileTabFrom, StudentProfilePage } from "./StudentProfilePage";

/** The Student page for the id in the address; an address that isn't an id finds nobody. */
export function StudentProfileRoute({ idText, tabText }: { idText: string; tabText?: string }) {
  const studentId = parseRecordId(idText);
  if (studentId === null) {
    return (
      <Panel>
        <EmptyState action={<ButtonLink href={ROUTES.students}>{LABELS.allStudents}</ButtonLink>}>
          {MESSAGES.studentNotFound}
        </EmptyState>
      </Panel>
    );
  }
  const startTab = profileTabFrom(tabText);
  return (
    <StudentProfilePage
      key={studentId}
      studentId={studentId}
      {...(startTab !== undefined && { startTab })}
    />
  );
}
