"use client";

import clsx from "clsx";
import { useState } from "react";

import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Panel } from "@/components/ui/Panel";
import { Loading } from "@/components/ui/Loading";
import {
  DOCUMENT_TEXT,
  DOCUMENTS_PARTS_TEXT,
  DocumentsPart,
  EXAMPLE_TEXT,
} from "@/constants/documents";
import type { ConfiguredDocumentType as DocumentType } from "@/lib/api";

import { AddDocumentTypeForm } from "./AddDocumentTypeForm";
import { DocumentExamplesDialog } from "./DocumentExamplesDialog";
import { removalFailure, useDocumentTypes } from "./useDocumentTypes";

type DocumentTypesSettingsProps = {
  /** Which of Configuration → Documents' lists to show (issue 97). */
  part: typeof DocumentsPart.Always | typeof DocumentsPart.Extra;
};

/**
 * Configuration → Documents → Always needed or Extra documents (spec 63; issue 97): one list,
 * moving a type to the other, and, under Extra documents, removing an unused one and adding one.
 */
export function DocumentTypesSettings({ part }: DocumentTypesSettingsProps) {
  const { state, failure, move, remove, keep, change } = useDocumentTypes();
  const [removing, setRemoving] = useState<DocumentType | null>(null);
  const [editing, setEditing] = useState<DocumentType | null>(null);
  const isExtra = part === DocumentsPart.Extra;

  return (
    <>
      <div className="grid min-w-0 content-start gap-6">
        {failure !== null && <Banner tone="problem">{failure}</Banner>}
        <TypeList
          state={state}
          isExtra={isExtra}
          onMove={move}
          onRemove={setRemoving}
          onExamples={setEditing}
        />
        {isExtra && <AddDocumentTypeForm onAdded={keep} />}
      </div>
      {removing !== null && (
        <ConfirmDialog
          title={DOCUMENT_TEXT.removeTitle(removing.name)}
          actionLabel={DOCUMENT_TEXT.remove}
          onClose={() => {
            setRemoving(null);
          }}
          onConfirm={async () => {
            await remove(removing);
            setRemoving(null);
          }}
          failureOf={removalFailure}
        >
          {DOCUMENT_TEXT.removeBody}
        </ConfirmDialog>
      )}
      {editing !== null && (
        <DocumentExamplesDialog
          type={editing}
          onChanged={change}
          onClose={() => {
            setEditing(null);
          }}
        />
      )}
    </>
  );
}

type TypeActions = {
  onMove: (type: DocumentType) => Promise<void>;
  /** Asks before removing it. */
  onRemove: (type: DocumentType) => void;
  /** Opens its instruction and example files (ticket 11). */
  onExamples: (type: DocumentType) => void;
};

type TypeListProps = TypeActions & {
  state: ReturnType<typeof useDocumentTypes>["state"];
  /** Extra documents: say where each is used, and offer Remove for those nothing uses. */
  isExtra: boolean;
};

function TypeList({ state, isExtra, ...actions }: TypeListProps) {
  if (state.status === "loading") return <Loading />;
  if (state.status === "failed") return <Banner tone="problem">{DOCUMENT_TEXT.typesFailed}</Banner>;
  const title = DOCUMENTS_PARTS_TEXT[isExtra ? DocumentsPart.Extra : DocumentsPart.Always].tab;
  const types = state.types.filter((type) => type.neededByEveryone !== isExtra);
  return (
    <Panel>
      {types.length === 0 ? (
        <EmptyState>{DOCUMENT_TEXT.noneHere}</EmptyState>
      ) : (
        <ul aria-label={title} className="divide-rule divide-y">
          {types.map((type) => (
            <TypeRow key={type.id} type={type} isExtra={isExtra} {...actions} />
          ))}
        </ul>
      )}
    </Panel>
  );
}

type TypeRowProps = TypeActions & { type: DocumentType; isExtra: boolean };

/**
 * How a row looks under each list: the move button, and, under Extra documents, its uses. An
 * Always needed row stays on one line on every width, its buttons small, and a name that does not
 * fit is cut with "…" (owner, 2026-11-27); an Extra documents row wraps, as it has more to say.
 */
const ROW_LOOK = {
  always: {
    moveLabel: DOCUMENT_TEXT.moveToOptional,
    moveVariant: "ghost",
    row: "flex-nowrap",
    text: "truncate",
    buttons: "flex-none flex-nowrap gap-1",
  },
  extra: {
    moveLabel: DOCUMENT_TEXT.moveToEveryone,
    moveVariant: "secondary",
    row: "flex-wrap",
    text: "break-words",
    buttons: "flex flex-wrap gap-2",
  },
} as const;

function TypeRow({ type, isExtra, onMove, onRemove, onExamples }: TypeRowProps) {
  const look = ROW_LOOK[isExtra ? "extra" : "always"];
  return (
    <li
      className={clsx("px-gutter flex min-h-15 items-center justify-between gap-3 py-3", look.row)}
    >
      <div className="grid min-w-0 gap-1">
        <span className={look.text}>{type.name}</span>
        {isExtra && <span className="text-small text-ink-2">{usesWords(type.usedBy)}</span>}
        <span className={clsx("text-small text-ink-2", look.text)}>
          {EXAMPLE_TEXT.summary(type.instruction !== "", type.examples.length)}
        </span>
      </div>
      <div className={clsx("flex", look.buttons)}>
        <Button
          size="sm"
          icon="file"
          onClick={() => {
            onExamples(type);
          }}
        >
          <span aria-hidden="true">{EXAMPLE_TEXT.examples}</span>
          <span className="sr-only">{EXAMPLE_TEXT.examplesFor(type.name)}</span>
        </Button>
        <Button
          variant={look.moveVariant}
          size="sm"
          onClick={() => {
            void onMove(type);
          }}
        >
          <span aria-hidden="true">{look.moveLabel}</span>
          <span className="sr-only">{`${look.moveLabel}: ${type.name}`}</span>
        </Button>
        {isExtra && isUnused(type) && <RemoveButton type={type} onRemove={onRemove} />}
      </div>
    </li>
  );
}

function RemoveButton({
  type,
  onRemove,
}: {
  type: DocumentType;
  onRemove: TypeActions["onRemove"];
}) {
  return (
    <Button
      variant="ghost"
      onClick={() => {
        onRemove(type);
      }}
    >
      <span aria-hidden="true">{DOCUMENT_TEXT.remove}</span>
      <span className="sr-only">{DOCUMENT_TEXT.removeFor(type.name)}</span>
    </Button>
  );
}

type Uses = DocumentType["usedBy"];

/** "Asked for by 2 countries, 6 courses · 3 files uploaded", or "Not asked for yet". */
function usesWords(uses: Uses): string {
  const askers = (
    [
      [uses.countries, DOCUMENT_TEXT.countries],
      [uses.courses, DOCUMENT_TEXT.courses],
      [uses.students, DOCUMENT_TEXT.students],
    ] as const
  )
    .filter(([count]) => count > 0)
    .map(([count, words]) => words(count));
  const asked = askers.length > 0 ? DOCUMENT_TEXT.usedBy(askers) : DOCUMENT_TEXT.notAskedYet;
  return uses.documents > 0 ? `${asked} · ${DOCUMENT_TEXT.files(uses.documents)}` : asked;
}

/** Nothing asks for it, no file of it is in, and it has no example files (even in the Bin). */
function isUnused({ usedBy: uses, exampleCount }: DocumentType): boolean {
  return uses.countries + uses.courses + uses.students + uses.documents + exampleCount === 0;
}
