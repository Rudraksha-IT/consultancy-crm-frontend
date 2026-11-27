"use client";

import type { RecordId } from "@/lib/recordId";
import { useState } from "react";

import { CheckboxField } from "@/components/ui/CheckboxField";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { BIN_REASON_MAX_LENGTH, BIN_REASONS, BIN_TEXT } from "@/constants/documents";
import type { Checklist, StoredDocument } from "@/lib/api";

import type { Deleting } from "./DocumentChecklist";
import { binFailure, type Removal } from "./useBinActions";

/** The quick picks and "Other" for why something goes to the Bin. */
const BIN_REASON = {
  legend: BIN_TEXT.whyLegend,
  picks: BIN_REASONS,
  otherChoice: BIN_TEXT.other,
  otherLabel: BIN_TEXT.otherLabel,
  otherPlaceholder: BIN_TEXT.otherPlaceholder,
  maxLength: BIN_REASON_MAX_LENGTH,
  neededMessage: BIN_TEXT.reasonNeeded,
  tooLongMessage: BIN_TEXT.reasonTooLong,
};

/** Confirm was pressed with no file ticked: nothing is sent. */
class NoFileTickedError extends Error {}

/** "Tick at least one file to delete.", or the server's short reason. */
function deleteFailure(error: unknown): string {
  return error instanceof NoFileTickedError ? BIN_TEXT.tickAFile : binFailure(error);
}

type DeleteDocumentDialogProps = {
  /** The Document being deleted; nothing shows while null. */
  deleting: Deleting | null;
  /** The checklist as it is now: the Document's files are read from it. */
  checklist: Checklist;
  studentName: string;
  onClose: () => void;
  /** Send it: the whole Document, or the ticked files; rejects with the reason it failed. */
  onConfirm: (removal: Removal, reason: string) => Promise<void>;
};

/**
 * Asks before deleting a Document (issue 79; UI revamp 11): why, for the Bin; or, for an Admin,
 * that it goes for good. A Document with several files lists them, all ticked: all ticked is the
 * whole Document, and unticking keeps a file. At least one must be ticked.
 */
export function DeleteDocumentDialog(props: DeleteDocumentDialogProps) {
  const { deleting, checklist, ...rest } = props;
  if (deleting === null) return null;
  const document = documentOf(checklist, deleting.documentId);
  if (document === null) return null;
  return (
    <AskingDialog
      key={deleting.documentId}
      name={deleting.name}
      document={document}
      forGood={checklist.deletesForGood}
      {...rest}
    />
  );
}

/** The Document on the checklist with this id, while it is still there. */
function documentOf(checklist: Checklist, documentId: RecordId): StoredDocument | null {
  const item = checklist.items.find((one) => one.document?.id === documentId);
  return item?.document ?? null;
}

type AskingDialogProps = Omit<DeleteDocumentDialogProps, "deleting" | "checklist"> & {
  name: string;
  document: StoredDocument;
  /** An Admin's delete skips the Bin and asks no reason. */
  forGood: boolean;
};

function AskingDialog(props: AskingDialogProps) {
  const { name, document, forGood, studentName, onClose, onConfirm } = props;
  // The files to keep. Every file starts ticked, and a file that has gone just drops out.
  const [kept, setKept] = useState<ReadonlySet<RecordId>>(new Set());
  const hasChoice = document.files.length > 1;
  const ticked = document.files.filter((file) => !kept.has(file.id));

  async function confirm(reason: string): Promise<void> {
    if (ticked.length === 0) throw new NoFileTickedError();
    const isWhole = ticked.length === document.files.length;
    await onConfirm({ documentId: document.id, name, files: isWhole ? null : ticked }, reason);
  }

  return (
    <ConfirmDialog
      title={BIN_TEXT.deleteTitle(name)}
      actionLabel={forGood ? BIN_TEXT.delete : BIN_TEXT.putInBin}
      reason={forGood ? undefined : BIN_REASON}
      onClose={onClose}
      onConfirm={confirm}
      failureOf={deleteFailure}
    >
      <div className="grid gap-4">
        {hasChoice && (
          <fieldset className="text-ink grid min-w-0 gap-1">
            <legend className="text-small mb-1 font-semibold">{BIN_TEXT.whichFiles}</legend>
            {document.files.map((file) => (
              <CheckboxField
                key={file.id}
                label={file.fileName}
                name="files"
                isChecked={!kept.has(file.id)}
                onChange={(isChecked) => {
                  setKept((current) => withKept(current, file.id, !isChecked));
                }}
              />
            ))}
            <p className="text-small text-ink-2 mt-1">{BIN_TEXT.whichFilesHint}</p>
          </fieldset>
        )}
        <p>{bodyWords(forGood, hasChoice, studentName)}</p>
      </div>
    </ConfirmDialog>
  );
}

/** The set of kept files with this one added or taken out. */
function withKept(current: ReadonlySet<RecordId>, fileId: RecordId, isKept: boolean) {
  const next = new Set(current);
  if (isKept) next.add(fileId);
  else next.delete(fileId);
  return next;
}

/** What will happen: to the Bin; or, for an Admin, gone for good (the chosen files, or all). */
function bodyWords(forGood: boolean, hasChoice: boolean, studentName: string): string {
  if (!forGood) return BIN_TEXT.binBody;
  return hasChoice
    ? BIN_TEXT.adminChosenBody(studentName)
    : BIN_TEXT.adminDocumentBody(studentName);
}
