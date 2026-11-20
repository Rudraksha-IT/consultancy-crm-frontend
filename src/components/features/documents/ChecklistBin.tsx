"use client";

import type { RecordId } from "@/lib/recordId";
import { useDates } from "@/components/features/shell/dateDisplay";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Chip } from "@/components/ui/Chip";
import { Icon } from "@/components/ui/Icon";
import { BIN_TEXT } from "@/constants/documents";
import { ROUTES } from "@/constants/routes";
import type { BinNote, BinTarget, BinnedDocument, BinnedFile } from "@/lib/api";

/** What the viewer may do with what is in the Bin. */
export type BinViewer = {
  /** Their Staff id, to offer "Take it out" on what they put there; null for a Platform Admin. */
  viewerId: number | null;
  /** An Admin: they open the Bin tab to restore or delete for good. */
  deletesForGood: boolean;
  /** Take something the viewer put in the Bin back out. */
  onTakeOut: (target: BinTarget, name: string) => void;
};

/** "Blurry scan. Bikash Thapa, 2 Nov 2026, 10:00": why, who and when, as text. */
function BinNoteLine({ note }: { note: BinNote }) {
  const dates = useDates();
  return (
    <span className="text-small text-ink-2 break-words">
      {BIN_TEXT.note(note.reason, note.by.name, dates.dateTime(note.at))}
    </span>
  );
}

function isMine(note: BinNote, viewerId: number | null): boolean {
  return viewerId !== null && note.by.id === viewerId;
}

type TakeOutProps = { name: string; target: BinTarget; onTakeOut: BinViewer["onTakeOut"] };

function TakeOutButton({ name, target, onTakeOut }: TakeOutProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => {
        onTakeOut(target, name);
      }}
    >
      <span aria-hidden="true">{BIN_TEXT.takeOut}</span>
      <span className="sr-only">{BIN_TEXT.takeOutFor(name)}</span>
    </Button>
  );
}

type BinnedFilesProps = BinViewer & { documentId: RecordId; files: readonly BinnedFile[] };

/** A Document's files in the Bin, under its files in use: named only, never opened here. */
export function BinnedFileItems({ documentId, files, viewerId, onTakeOut }: BinnedFilesProps) {
  return files.map((file) => (
    <li key={file.id} className="text-ink-3 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
      <span className="min-h-control inline-flex min-w-0 items-center gap-2 break-all">
        <Icon name="file" size="sm" />
        {file.fileName}
      </span>
      <Chip tone="muted" icon="trash">
        {BIN_TEXT.inTheBin}
      </Chip>
      <BinNoteLine note={file.bin} />
      {isMine(file.bin, viewerId) && (
        <TakeOutButton
          name={file.fileName}
          target={{ documentId, fileId: file.id }}
          onTakeOut={onTakeOut}
        />
      )}
    </li>
  ));
}

type BinnedDocumentsProps = BinViewer & {
  typeName: string;
  documents: readonly BinnedDocument[];
};

/**
 * The type's Documents in the Bin, greyed under the line: its files by name, who put it there,
 * when and why. Nobody opens or uses them; whoever put one there may take it out, and an Admin
 * goes to the Bin tab.
 */
export function BinnedDocuments(props: BinnedDocumentsProps) {
  const { typeName, documents } = props;
  if (documents.length === 0) return null;
  return (
    <ul aria-label={BIN_TEXT.inTheBinOf(typeName)} className="mt-2 grid gap-3">
      {documents.map((document) => (
        <li
          key={document.id}
          className="rounded-control border-rule bg-fill text-ink-3 grid gap-1 border border-dashed px-4 py-3"
        >
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Chip tone="muted" icon="trash">
              {BIN_TEXT.inTheBin}
            </Chip>
            <span className="text-small break-all">
              {document.files.map((file) => file.fileName).join(", ")}
            </span>
          </div>
          <BinNoteLine note={document.bin} />
          <span className="text-small">{BIN_TEXT.nobodyCanUse}</span>
          <BinnedDocumentAction {...props} document={document} />
        </li>
      ))}
    </ul>
  );
}

function BinnedDocumentAction(props: BinnedDocumentsProps & { document: BinnedDocument }) {
  const { document, typeName, viewerId, deletesForGood, onTakeOut } = props;
  if (isMine(document.bin, viewerId)) {
    return (
      <div>
        <TakeOutButton
          name={typeName}
          target={{ documentId: document.id, fileId: null }}
          onTakeOut={onTakeOut}
        />
      </div>
    );
  }
  if (!deletesForGood) return null;
  return (
    <div>
      <ButtonLink href={ROUTES.documentsBin} variant="ghost" size="sm">
        {BIN_TEXT.openBin}
      </ButtonLink>
    </div>
  );
}
