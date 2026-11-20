"use client";

import { EmailComposer } from "@/components/features/communication/EmailComposer";
import type { EmailRecipient } from "@/components/features/communication/recipients";
import type { StartWith } from "@/components/features/communication/useComposerText";
import { EXAMPLE_TEXT as TEXT } from "@/constants/documents";
import type { Attachable, ChecklistItem } from "@/lib/api";

type ExamplesComposerProps = {
  /** The checklist item whose examples are being emailed, or null while none is. */
  item: ChecklistItem | null;
  /** Who it goes to; absent when the Student can't be emailed. */
  student: EmailRecipient | undefined;
  onClose: () => void;
};

/**
 * "Email the examples to <first name>" (spec 65, ticket 12): the Plain email about one Document
 * Type, with its instruction and its example files attached.
 */
export function ExamplesComposer({ item, student, onClose }: ExamplesComposerProps) {
  if (item === null || student === undefined) return null;
  return (
    <EmailComposer
      recipients={[student]}
      isBulk={false}
      startWith={examplesEmail(item)}
      onClose={onClose}
      onSent={onClose}
    />
  );
}

function examplesEmail(item: ChecklistItem): StartWith {
  const typeName = item.documentType.name;
  const files: Attachable[] = item.examples.map((example) => ({
    kind: "document_example",
    id: example.id,
    name: example.fileName,
    fileName: example.fileName,
    size: example.size,
    group: typeName,
  }));
  return {
    kind: "plain",
    text: {
      subject: TEXT.exampleSubject(typeName),
      line: TEXT.exampleLine(typeName, item.instruction),
    },
    files,
  };
}
