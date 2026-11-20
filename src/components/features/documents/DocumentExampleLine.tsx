"use client";

import { useState } from "react";

import { useOpenLink } from "@/components/features/catalogue/useOpenLink";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Icon } from "@/components/ui/Icon";
import { EXAMPLE_TEXT as TEXT } from "@/constants/documents";
import { LABELS } from "@/constants/messages";
import { fetchDocumentExampleLink, type DocumentExample } from "@/lib/api";
import { formatFileSize } from "@/lib/catalogue";

type DocumentExampleLineProps = {
  typeName: string;
  instruction: string;
  examples: readonly DocumentExample[];
};

/**
 * Beside a Document still to come on a Student's checklist (ticket 11): the type's instruction
 * and a button to see its example files, which open through short links. Never the Student's own
 * Document. Nothing shows when the type has neither.
 */
export function DocumentExampleLine({ typeName, instruction, examples }: DocumentExampleLineProps) {
  if (instruction === "" && examples.length === 0) return null;
  return (
    <div className="rounded-control bg-fill text-small text-ink-2 mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
      <Icon name="info" size="sm" />
      <span className="min-w-0 flex-1 break-words">
        {instruction === "" ? TEXT.seeWhat : instruction}
      </span>
      <SeeExamples typeName={typeName} instruction={instruction} examples={examples} />
    </div>
  );
}

/** "See the example" or "See 2 examples", which opens them in a dialog; none without files. */
function SeeExamples({ typeName, instruction, examples }: DocumentExampleLineProps) {
  const [isOpen, setOpen] = useState(false);
  if (examples.length === 0) return null;
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          setOpen(true);
        }}
      >
        <span aria-hidden="true">{TEXT.see(examples.length)}</span>
        <span className="sr-only">{TEXT.seeFor(examples.length, typeName)}</span>
      </Button>
      {isOpen && (
        <ExamplesDialog
          typeName={typeName}
          instruction={instruction}
          examples={examples}
          onClose={() => {
            setOpen(false);
          }}
        />
      )}
    </>
  );
}

type ExamplesDialogProps = DocumentExampleLineProps & { onClose: () => void };

/** The instruction, and each example file to open or save. */
function ExamplesDialog({ typeName, instruction, examples, onClose }: ExamplesDialogProps) {
  const link = useOpenLink(TEXT.linkFailed);
  return (
    <Dialog
      isOpen
      isWide
      title={TEXT.viewTitle(typeName)}
      onClose={onClose}
      footer={<Button onClick={onClose}>{LABELS.close}</Button>}
    >
      <div className="grid gap-4">
        {instruction !== "" && <p className="break-words">{instruction}</p>}
        <ul aria-label={TEXT.examplesOf(typeName)} className="divide-rule grid divide-y">
          {examples.map((example) => (
            <li
              key={example.id}
              className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 py-2"
            >
              <span className="inline-flex min-w-0 flex-1 items-center gap-2">
                <Icon name="file" size="sm" />
                <span className="break-all">{example.fileName}</span>
                <span className="text-small text-ink-2 tabular-nums">
                  {formatFileSize(example.size)}
                </span>
              </span>
              <span className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  icon="file"
                  onClick={() => {
                    void link.open(() => fetchDocumentExampleLink(example.id, "open"));
                  }}
                >
                  <span aria-hidden="true">{TEXT.open}</span>
                  <span className="sr-only">{TEXT.openFile(example.fileName)}</span>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  icon="download"
                  onClick={() => {
                    void link.open(() => fetchDocumentExampleLink(example.id, "download"));
                  }}
                >
                  <span aria-hidden="true">{TEXT.download}</span>
                  <span className="sr-only">{TEXT.downloadFile(example.fileName)}</span>
                </Button>
              </span>
            </li>
          ))}
        </ul>
        {link.failure !== null && <Banner tone="problem">{link.failure}</Banner>}
        <p className="text-small text-ink-2">{TEXT.examplesOnly}</p>
      </div>
    </Dialog>
  );
}
