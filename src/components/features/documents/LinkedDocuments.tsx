"use client";

import type { RecordId } from "@/lib/recordId";
import { Banner } from "@/components/ui/Banner";
import { Chip, type ChipTone } from "@/components/ui/Chip";
import { DOCUMENT_TEXT, VERIFICATION_LABELS, type VERIFICATIONS } from "@/constants/documents";
import type { LinkedDocument } from "@/lib/api";

import { OpenFileButton } from "./OpenFileButton";
import { useDocumentLink } from "./useDocumentLink";

/** Status colours are fixed; the word is always shown with them. */
const VERIFICATION_TONES: Record<(typeof VERIFICATIONS)[number], ChipTone> = {
  pending: "warn",
  verified: "good",
  rejected: "bad",
};

type LinkedDocumentsProps = {
  studentId: RecordId;
  /** What they are for, e.g. "Deakin University" or "the Deakin University visa". */
  record: string;
  documents: readonly LinkedDocument[];
};

/**
 * The Documents linked to one Application or Visa (spec 66): each type, its files (each opens
 * through a short-lived link; issue 78) and how it was judged. Nothing shows when there are none.
 */
export function LinkedDocuments({ studentId, record, documents }: LinkedDocumentsProps) {
  const { show, failure } = useDocumentLink(studentId);
  if (documents.length === 0) return null;
  return (
    <div className="mt-2 grid gap-2">
      {failure !== null && <Banner tone="problem">{failure}</Banner>}
      <ul aria-label={DOCUMENT_TEXT.linkedFor(record)} className="grid gap-1">
        {documents.map((document) => (
          <li
            key={document.id}
            className="text-secondary text-ink-2 flex flex-wrap items-center gap-x-4 gap-y-1"
          >
            <span className="text-ink font-semibold">{document.documentType.name}</span>
            {document.files.map((file) => (
              <OpenFileButton
                key={file.id}
                fileName={file.fileName}
                onOpen={() => {
                  void show(document.id, file.id, "open");
                }}
              />
            ))}
            <Chip tone={VERIFICATION_TONES[document.verification]}>
              {VERIFICATION_LABELS[document.verification]}
            </Chip>
          </li>
        ))}
      </ul>
    </div>
  );
}
