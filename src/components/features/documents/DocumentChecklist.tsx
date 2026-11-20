import clsx from "clsx";

import { Button } from "@/components/ui/Button";
import { Chip, type ChipTone } from "@/components/ui/Chip";
import { Icon, type IconName } from "@/components/ui/Icon";
import { IconButton } from "@/components/ui/IconButton";
import {
  BIN_TEXT,
  DOCUMENT_STATE_LABELS,
  DOCUMENT_TEXT,
  DocumentState,
} from "@/constants/documents";
import type { BinTarget, ChecklistItem, DocumentLinkedTo, StoredDocument } from "@/lib/api";

import { BinnedDocuments, BinnedFileItems, type BinViewer } from "./ChecklistBin";
import { DocumentExampleLine } from "./DocumentExampleLine";
import { OpenFileButton } from "./OpenFileButton";
import type { LinkAction } from "./useDocumentLink";

/** Status colours are fixed, and the state is always written in the chip beside them. */
const STATE_TONES: Record<DocumentState, ChipTone> = {
  not_received: "muted",
  waiting: "warn",
  verified: "good",
  rejected: "bad",
};

const TICK_CLASSES: Record<DocumentState, string> = {
  not_received: "border-2 border-dashed border-rule-2",
  waiting: "border-3 border-warn",
  verified: "bg-good-tint text-good",
  rejected: "bg-bad-tint text-bad",
};

type DocumentChecklistProps = {
  items: readonly ChecklistItem[];
  /** Names the list: its Document Group, or Other documents (issue 80). */
  label: string;
  /** The Student's counsellor or an Admin: may upload and check. */
  canChange: boolean;
  /** A check is being saved: its buttons wait. */
  isChecking?: boolean;
  onUpload: (documentTypeId: number) => void;
  /** Open or save one file of a Document. */
  onShow: (documentId: number, fileId: number, action: LinkAction) => void;
  /** Add more files to the item's Document (issue 78). */
  onAddFile: (item: AddingTo) => void;
  /** Mark the item's Document correct. */
  onVerify: (item: CheckedItem) => void;
  /** Ask why the item's Document is rejected. */
  onReject: (item: CheckedItem) => void;
  /** Take a type asked for this Student alone off the checklist ("Not needed"), after asking. */
  onNotNeeded?: (documentType: ChecklistItem["documentType"]) => void;
  /** Delete a Document or one of its files, after asking: to the Bin, or for good by an Admin. */
  onDelete: (deleting: Deleting) => void;
  /** Who is looking, for what is in the Bin (issue 79). */
  bin: BinViewer;
};

/** A Document, or one of its files, being deleted, with the name the dialog shows. */
export type Deleting = { target: BinTarget; name: string };

/** An item with a Document, to check. */
export type CheckedItem = { documentId: number; typeName: string };

/** An item whose Document gets more files; a Verified one will need checking again. */
export type AddingTo = CheckedItem & { isVerified: boolean };

/**
 * Each Document Type the Student must bring, with why it is there, its state and the files of
 * its newest Document (spec 64, 117). Their counsellor or an Admin uploads, adds files and checks
 * (spec 68-69); anyone who sees them opens the files.
 */
export function DocumentChecklist(props: DocumentChecklistProps) {
  const { items, label } = props;
  return (
    <ul aria-label={label} className="divide-rule divide-y">
      {items.map((item) => (
        <ChecklistRow key={item.documentType.id} item={item} {...props} />
      ))}
    </ul>
  );
}

/** States still waiting for the Student's paper: they show the type's Document Example (ticket 11). */
const STILL_TO_COME: readonly DocumentState[] = [DocumentState.NotReceived, DocumentState.Rejected];

/** The type's Document Example, while the Student's paper is still to come. */
function ItemExample({ item }: { item: ChecklistItem }) {
  if (!STILL_TO_COME.includes(item.state)) return null;
  return (
    <DocumentExampleLine
      typeName={item.documentType.name}
      instruction={item.instruction}
      examples={item.examples}
    />
  );
}

/** One type: its state in words, what it is for, its files and why it was rejected. */
function ChecklistRow(props: ItemActionsProps) {
  const { item, canChange, onShow, onDelete, bin } = props;
  const { document } = item;
  const typeName = item.documentType.name;
  return (
    <li className="tablet:grid-cols-[auto_minmax(0,1fr)_auto] grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-3 px-6 py-5">
      <Tick state={item.state} />
      <div className="grid min-w-0 gap-1">
        <ItemName item={item} />
        <StateLine item={item} />
        {document !== null && (
          <FileList
            document={document}
            typeName={typeName}
            onShow={onShow}
            onDelete={canChange ? onDelete : null}
            bin={bin}
          />
        )}
        {item.state === DocumentState.Rejected && <RejectionReason document={document} />}
        <BinnedDocuments {...bin} typeName={typeName} documents={item.inBin} />
        <ItemExample item={item} />
      </div>
      {canChange && (
        <div className="tablet:col-start-auto tablet:justify-end col-start-2 flex flex-wrap gap-3">
          <ItemActions {...props} />
        </div>
      )}
    </li>
  );
}

/** The state in words beside its colour, and what the Document is for, if it is linked. */
function StateLine({ item }: { item: ChecklistItem }) {
  const link = item.document?.link ?? null;
  return (
    <div className="text-secondary text-ink-2 flex flex-wrap items-center gap-x-4 gap-y-1">
      <Chip tone={STATE_TONES[item.state]}>{DOCUMENT_STATE_LABELS[item.state]}</Chip>
      {link !== null && <span>{linkWords(link)}</span>}
    </div>
  );
}

const TICK_ICONS: Partial<Record<DocumentState, IconName>> = { verified: "check", rejected: "x" };

function Tick({ state }: { state: DocumentState }) {
  const name = TICK_ICONS[state];
  return (
    <span
      aria-hidden="true"
      className={clsx("rounded-pill grid size-7 place-items-center", TICK_CLASSES[state])}
    >
      {name !== undefined && <Icon name={name} size="sm" />}
    </span>
  );
}

function ItemName({ item }: { item: ChecklistItem }) {
  const reason = item.isRequired ? item.reason : DOCUMENT_TEXT.notOnChecklist;
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <span className="text-body text-ink font-semibold">{item.documentType.name}</span>
      {reason !== "" && <span className="text-small text-ink-3">{reason}</span>}
    </div>
  );
}

type FileListProps = {
  document: StoredDocument;
  typeName: string;
  onShow: DocumentChecklistProps["onShow"];
  /** Delete one file; offered only while the Document has more than one in use. */
  onDelete: DocumentChecklistProps["onDelete"] | null;
  bin: BinViewer;
};

/**
 * Every file of the Document, oldest first: its name opens it, the icon beside it saves it. Its
 * files in the Bin follow, by name only (issue 79).
 */
function FileList({ document, typeName, onShow, onDelete, bin }: FileListProps) {
  const canDeleteOne = onDelete !== null && document.files.length > 1;
  return (
    <ul aria-label={DOCUMENT_TEXT.filesOf(typeName)} className="text-secondary grid">
      {document.files.map((file) => (
        <li key={file.id} className="flex min-w-0 flex-wrap items-center gap-1">
          <OpenFileButton
            fileName={file.fileName}
            onOpen={() => {
              onShow(document.id, file.id, "open");
            }}
          />
          <IconButton
            icon="download"
            label={DOCUMENT_TEXT.download(file.fileName)}
            onClick={() => {
              onShow(document.id, file.id, "download");
            }}
          />
          {canDeleteOne && (
            <IconButton
              icon="trash"
              label={BIN_TEXT.deleteFile(file.fileName)}
              onClick={() => {
                onDelete({
                  target: { documentId: document.id, fileId: file.id },
                  name: file.fileName,
                });
              }}
            />
          )}
        </li>
      ))}
      <BinnedFileItems {...bin} documentId={document.id} files={document.binnedFiles} />
    </ul>
  );
}

/** Why a Document was rejected, written under it (as text, never markup). */
function RejectionReason({ document }: { document: StoredDocument | null }) {
  if (document === null) return null;
  return (
    <p className="text-secondary text-bad mt-1 break-words whitespace-pre-line">
      {DOCUMENT_TEXT.reasonLine(document.rejectionReason)}
    </p>
  );
}

/** "For Federation University" or "For the Deakin University visa". */
function linkWords(link: DocumentLinkedTo): string {
  return link.kind === "application"
    ? DOCUMENT_TEXT.forApplication(link.university)
    : DOCUMENT_TEXT.forVisa(link.university);
}

type ItemActionsProps = DocumentChecklistProps & { item: ChecklistItem };

/**
 * A copy waiting for a check is marked correct or rejected, and either it or a checked one can
 * get more files; a missing or Rejected one is uploaded.
 */
function ItemActions(props: ItemActionsProps) {
  const { document } = props.item;
  return (
    <>
      <StateActions {...props} />
      {document !== null && <DeleteButton {...props} documentId={document.id} />}
    </>
  );
}

/** What the item's state allows: upload, add files, or mark correct or rejected. */
function StateActions(props: ItemActionsProps) {
  const { item, isChecking = false, onVerify, onReject } = props;
  const { document } = item;
  if (document === null || !HOLDS_MORE_FILES.includes(item.state)) {
    return <UploadActions {...props} />;
  }
  const checked = { documentId: document.id, typeName: item.documentType.name };
  if (item.state === DocumentState.Verified) {
    return <AddFileButton item={{ ...checked, isVerified: true }} onAddFile={props.onAddFile} />;
  }
  return (
    <>
      <Button
        icon="check"
        isDisabled={isChecking}
        onClick={() => {
          onVerify(checked);
        }}
      >
        <span aria-hidden="true">{DOCUMENT_TEXT.itsCorrect}</span>
        <span className="sr-only">{DOCUMENT_TEXT.itsCorrectFor(item.documentType.name)}</span>
      </Button>
      <Button
        variant="danger"
        isDisabled={isChecking}
        onClick={() => {
          onReject(checked);
        }}
      >
        <span aria-hidden="true">{DOCUMENT_TEXT.reject}</span>
        <span className="sr-only">{DOCUMENT_TEXT.rejectFor(item.documentType.name)}</span>
      </Button>
      <AddFileButton item={{ ...checked, isVerified: false }} onAddFile={props.onAddFile} />
    </>
  );
}

/** "Delete" the whole Document: to the Bin, or for good by an Admin (issue 79). */
function DeleteButton({ item, onDelete, documentId }: ItemActionsProps & { documentId: number }) {
  const name = item.documentType.name;
  return (
    <Button
      variant="ghost"
      icon="trash"
      onClick={() => {
        onDelete({ target: { documentId, fileId: null }, name });
      }}
    >
      <span aria-hidden="true">{BIN_TEXT.delete}</span>
      <span className="sr-only">{BIN_TEXT.deleteFor(name)}</span>
    </Button>
  );
}

/** States whose Document can get more files: never a Rejected one, which needs a new copy. */
const HOLDS_MORE_FILES: readonly DocumentState[] = [DocumentState.Waiting, DocumentState.Verified];

type AddFileButtonProps = { item: AddingTo; onAddFile: DocumentChecklistProps["onAddFile"] };

/** "Add a file" to the Document, e.g. the back of a passport (issue 78). */
function AddFileButton({ item, onAddFile }: AddFileButtonProps) {
  return (
    <Button
      variant="ghost"
      icon="plus"
      onClick={() => {
        onAddFile(item);
      }}
    >
      <span aria-hidden="true">{DOCUMENT_TEXT.addFile}</span>
      <span className="sr-only">{DOCUMENT_TEXT.addFileTo(item.typeName)}</span>
    </Button>
  );
}

/** Upload (or Replace), and Not needed for a type asked for this Student alone. */
function UploadActions(props: ItemActionsProps) {
  const { item, onUpload } = props;
  return (
    <>
      <UploadButton item={item} onUpload={onUpload} />
      {item.addedForStudent && item.document === null && <NotNeededButton {...props} />}
    </>
  );
}

/** Asked for this Student alone and nothing uploaded yet: it can be taken off (spec 63b). */
function NotNeededButton({ item, onNotNeeded }: ItemActionsProps) {
  if (onNotNeeded === undefined) return null;
  return (
    <Button
      variant="ghost"
      onClick={() => {
        onNotNeeded(item.documentType);
      }}
    >
      <span aria-hidden="true">{DOCUMENT_TEXT.notNeeded}</span>
      <span className="sr-only">{DOCUMENT_TEXT.notNeededFor(item.documentType.name)}</span>
    </Button>
  );
}

type UploadButtonProps = { item: ChecklistItem; onUpload: DocumentChecklistProps["onUpload"] };

/** Upload when nothing is in, Upload new copy when it was Rejected. */
function UploadButton({ item, onUpload }: UploadButtonProps) {
  const label =
    item.state === DocumentState.Rejected ? DOCUMENT_TEXT.uploadNewCopy : DOCUMENT_TEXT.upload;
  return (
    <Button
      icon="upload"
      variant={item.state === DocumentState.Rejected ? "primary" : "secondary"}
      onClick={() => {
        onUpload(item.documentType.id);
      }}
    >
      <span aria-hidden="true">{label}</span>
      <span className="sr-only">{`${label} ${DOCUMENT_TEXT.uploadFor(item.documentType.name)}`}</span>
    </Button>
  );
}
