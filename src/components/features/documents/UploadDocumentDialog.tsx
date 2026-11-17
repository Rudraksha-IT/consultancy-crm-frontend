"use client";

import { useId, useState, type SubmitEvent } from "react";

import { SaveDialog } from "@/components/features/students/profile/SaveDialog";
import { useFormSave } from "@/components/features/students/profile/useFormSave";
import { FileField } from "@/components/ui/FileField";
import { SelectField } from "@/components/ui/SelectField";
import { DOCUMENT_FILE_ACCEPT, DOCUMENT_TEXT } from "@/constants/documents";
import { uploadDocument, type Checklist, type DocumentLinkOption } from "@/lib/api";
import { documentFilesProblem } from "@/lib/documents";

import { uploadFailure } from "./uploadFailure";

type UploadDocumentDialogProps = {
  studentId: number;
  studentName: string;
  /** The Document Types offered: the Student's checklist. */
  types: readonly { id: number; name: string }[];
  /** The type whose button opened the dialog. */
  initialTypeId: number;
  /** The Student's Applications and Visas it can be linked to (spec 66). */
  links?: readonly DocumentLinkOption[];
  onClose: () => void;
  /** Told the checklist as it is now, and how many files went into the new Document. */
  onUploaded: (checklist: Checklist, fileCount: number) => void;
};

const linkValue = (link: DocumentLinkOption): string => `${link.kind}:${String(link.id)}`;

/**
 * Upload one or more files as one of the Student's Documents (spec 65, 117), optionally for one
 * of their Applications or Visas (spec 66). They are checked here by name and size first; the
 * server checks what they really are, and the Document starts Pending Verification (spec 67).
 */
export function UploadDocumentDialog(props: UploadDocumentDialogProps) {
  const { studentId, studentName, types, initialTypeId, onClose, onUploaded } = props;
  const { links = [] } = props;
  const formId = useId();
  const [typeId, setTypeId] = useState(String(initialTypeId));
  const [linkChoice, setLinkChoice] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [fileProblem, setFileProblem] = useState<string | null>(null);
  const { isSaving, fieldErrors, failure, save } = useFormSave(uploadFailure);

  function submit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    const problem = documentFilesProblem(files);
    setFileProblem(problem);
    if (problem !== null) return;
    const link = links.find((one) => linkValue(one) === linkChoice) ?? null;
    void save(async () => {
      const saved = await uploadDocument(studentId, Number(typeId), files, undefined, link);
      onUploaded(saved, files.length);
    });
  }

  const fileErrors = fileProblem === null ? fieldErrors.file : [fileProblem];
  return (
    <SaveDialog
      title={DOCUMENT_TEXT.uploadTitle(studentName)}
      formId={formId}
      saveLabel={DOCUMENT_TEXT.upload}
      saveIcon="upload"
      isSaving={isSaving}
      failure={failure}
      onClose={onClose}
    >
      <form id={formId} noValidate onSubmit={submit} className="grid gap-5">
        <SelectField
          label={DOCUMENT_TEXT.documentType}
          name="document_type"
          options={types.map((type) => ({ value: String(type.id), label: type.name }))}
          value={typeId}
          onChange={setTypeId}
          errors={fieldErrors.documentType}
        />
        <FileField
          label={DOCUMENT_TEXT.file}
          name="file"
          accept={DOCUMENT_FILE_ACCEPT}
          multiple
          hint={DOCUMENT_TEXT.fileHint}
          errors={fileErrors}
          onFilesChange={(chosen) => {
            setFiles(chosen);
            setFileProblem(null);
          }}
        />
        {links.length > 0 && (
          <SelectField
            label={DOCUMENT_TEXT.linkTo}
            name="link"
            options={[
              { value: "", label: DOCUMENT_TEXT.justTheStudent },
              ...links.map((link) => ({ value: linkValue(link), label: link.label })),
            ]}
            value={linkChoice}
            onChange={setLinkChoice}
            errors={fieldErrors.linkApplication ?? fieldErrors.linkVisa}
          />
        )}
      </form>
    </SaveDialog>
  );
}
