"use client";

import { ButtonLink } from "@/components/ui/ButtonLink";
import { EmptyState } from "@/components/ui/EmptyState";
import { Panel } from "@/components/ui/Panel";
import { FEE_TYPE_STUDENTS_TEXT as TEXT } from "@/constants/feesByType";
import { ROUTES } from "@/constants/routes";
import { parseRecordId as parseId } from "@/lib/recordId";

import { FeeTypeStudentsPage } from "./FeeTypeStudentsPage";

/** One Fee Type's Students for the id in the address; one that isn't an id finds nothing. */
export function FeeTypeStudentsRoute({ idText }: { idText: string }) {
  const feeTypeId = parseId(idText);
  if (feeTypeId === null) {
    return (
      <Panel>
        <EmptyState action={<ButtonLink href={ROUTES.feesByType}>{TEXT.backToAll}</ButtonLink>}>
          {TEXT.notFound}
        </EmptyState>
      </Panel>
    );
  }
  return <FeeTypeStudentsPage key={feeTypeId} feeTypeId={feeTypeId} />;
}
