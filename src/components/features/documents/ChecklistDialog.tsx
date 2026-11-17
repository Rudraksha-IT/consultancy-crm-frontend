"use client";

import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Dialog } from "@/components/ui/Dialog";
import { DOCUMENT_TEXT } from "@/constants/documents";
import { ROUTES } from "@/constants/routes";

import { DocumentsSection } from "./DocumentsSection";

type ChecklistDialogProps = {
  student: { id: number; name: string };
  onClose: () => void;
};

/** One Student's checklist over the Documents page, to upload or open files without leaving. */
export function ChecklistDialog({ student, onClose }: ChecklistDialogProps) {
  return (
    <Dialog
      isOpen
      isWide
      title={DOCUMENT_TEXT.dialogTitle(student.name)}
      onClose={onClose}
      footer={
        <>
          <ButtonLink href={ROUTES.student(student.id)}>{DOCUMENT_TEXT.openTheirPage}</ButtonLink>
          <Button variant="primary" onClick={onClose}>
            {DOCUMENT_TEXT.done}
          </Button>
        </>
      }
    >
      <DocumentsSection studentId={student.id} studentName={student.name} />
    </Dialog>
  );
}
