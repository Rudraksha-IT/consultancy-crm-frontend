"use client";

import type { RecordId } from "@/lib/recordId";
import { useId, useState, type SubmitEvent } from "react";

import { SaveDialog } from "@/components/features/students/profile/SaveDialog";
import { useFormSave } from "@/components/features/students/profile/useFormSave";
import { FileField } from "@/components/ui/FileField";
import { DOCUMENT_TEXT, STUDENT_DOCUMENT_FILE_ACCEPT } from "@/constants/documents";
import { addDocumentFiles, type Checklist } from "@/lib/api";
import { documentFilesProblem } from "@/lib/documents";

import type { AddingTo } from "./DocumentChecklist";
import { uploadFailure } from "./uploadFailure";

type AddFileDialogProps = {
  studentId: RecordId;
  studentName: string;
  /** The Document the files join. */
  addingTo: AddingTo;
  onClose: () => void;
  /** Told the checklist as it is now, and how many files were added. */
  onAdded: (checklist: Checklist, fileCount: number) => void;
};

/**
 * Add one or more files to a Document, such as the back of a passport (spec 117, issue 78).
 * Verification covers all its files, so a checked Document needs checking again, and the dialog
 * says so before anything is sent.
 */
export function AddFileDialog(props: AddFileDialogProps) {
  const { studentId, studentName, addingTo, onClose, onAdded } = props;
  const formId = useId();
  const [files, setFiles] = useState<File[]>([]);
  const [fileProblem, setFileProblem] = useState<string | null>(null);
  const { isSaving, fieldErrors, failure, save } = useFormSave(uploadFailure);

  function submit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    const problem = documentFilesProblem(files);
    setFileProblem(problem);
    if (problem !== null) return;
    void save(async () => {
      onAdded(await addDocumentFiles(studentId, addingTo.documentId, files), files.length);
    });
  }

  return (
    <SaveDialog
      title={DOCUMENT_TEXT.addFileTo(addingTo.typeName)}
      formId={formId}
      saveLabel={DOCUMENT_TEXT.addFileSave}
      saveIcon="upload"
      isSaving={isSaving}
      failure={failure}
      onClose={onClose}
    >
      <form id={formId} noValidate onSubmit={submit} className="grid gap-5">
        <p className="text-secondary text-ink-2">
          {DOCUMENT_TEXT.addFileLead(studentName, addingTo.isVerified)}
        </p>
        <FileField
          label={DOCUMENT_TEXT.file}
          name="file"
          accept={STUDENT_DOCUMENT_FILE_ACCEPT}
          multiple
          hint={DOCUMENT_TEXT.addFileHint}
          errors={fileProblem === null ? fieldErrors.file : [fileProblem]}
          onFilesChange={(chosen) => {
            setFiles(chosen);
            setFileProblem(null);
          }}
        />
      </form>
    </SaveDialog>
  );
}
