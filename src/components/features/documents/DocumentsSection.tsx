"use client";

import type { RecordId } from "@/lib/recordId";
import { useState, type ComponentProps } from "react";

import { firstNameOf, type EmailRecipient } from "@/components/features/communication/recipients";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { Panel } from "@/components/ui/Panel";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Section } from "@/components/ui/Section";
import { useToast } from "@/components/ui/useToast";
import {
  BIN_REASON_MAX_LENGTH,
  BIN_REASONS,
  BIN_TEXT,
  DOCUMENT_GROUP_HELP,
  DOCUMENT_GROUP_LABELS,
  DOCUMENT_GROUPS,
  DOCUMENT_TEXT,
} from "@/constants/documents";
import {
  setStudentDocuments,
  type Checklist,
  type ChecklistItem,
  type DocumentLinkOption,
  type DocumentProgress,
} from "@/lib/api";

import { AddFileDialog } from "./AddFileDialog";
import { DocumentChecklist, type AddingTo, type Deleting } from "./DocumentChecklist";
import { DocumentPickerDialog } from "./DocumentPickerDialog";
import { ExamplesComposer } from "./ExamplesComposer";
import { RejectDocumentDialog } from "./RejectDocumentDialog";
import { UploadDocumentDialog } from "./UploadDocumentDialog";
import { binFailure, useBinActions } from "./useBinActions";
import { useChecklist } from "./useChecklist";
import { useDocumentChecks } from "./useDocumentChecks";
import { useDocumentLink } from "./useDocumentLink";
import { notNeededFailure, useNotNeeded } from "./useNotNeeded";

type DocumentsSectionProps = {
  studentId: RecordId;
  studentName: string;
  /** The Student's Applications and Visas an upload can be linked to (spec 66). */
  links?: readonly DocumentLinkOption[];
  /** Told the new count after an upload or a check, e.g. for the profile's tab. */
  onProgress?: (progress: DocumentProgress) => void;
  /** Who "Email the examples" goes to (ticket 12); absent when the Student can't be emailed. */
  emailTo?: EmailRecipient | undefined;
};

/**
 * A Student's document checklist with its progress, uploads, added files (issue 78), checks
 * (spec 68-69) and private file links.
 */
export function DocumentsSection(props: DocumentsSectionProps) {
  const { studentId, studentName, links = [], onProgress, emailTo } = props;
  const { state, replace } = useChecklist(studentId);
  if (state.status === "loading") return <p className="text-ink-2">{DOCUMENT_TEXT.loading}</p>;
  if (state.status === "failed") return <Banner tone="problem">{DOCUMENT_TEXT.failed}</Banner>;
  return (
    <LoadedSection
      studentId={studentId}
      studentName={studentName}
      emailTo={emailTo}
      links={links}
      checklist={state.checklist}
      onChanged={(checklist) => {
        replace(checklist);
        onProgress?.({ done: checklist.done, total: checklist.total });
      }}
    />
  );
}

type LoadedSectionProps = {
  studentId: RecordId;
  studentName: string;
  emailTo: EmailRecipient | undefined;
  links: readonly DocumentLinkOption[];
  checklist: Checklist;
  onChanged: (checklist: Checklist) => void;
};

function LoadedSection(props: LoadedSectionProps) {
  const { studentId, studentName, emailTo, links, checklist, onChanged } = props;
  const { showToast } = useToast();
  const examples = useExamplesEmail(emailTo);
  const [uploadingTypeId, setUploadingTypeId] = useState<RecordId | null>(null);
  const [addingTo, setAddingTo] = useState<AddingTo | null>(null);
  const [isAsking, setIsAsking] = useState(false);
  const [notNeeded, setNotNeeded] = useState<ChecklistItem["documentType"] | null>(null);
  const [deleting, setDeleting] = useState<Deleting | null>(null);
  const bin = useBinActions(studentId, onChanged);
  const checks = useDocumentChecks(studentId, onChanged);
  const dropping = useNotNeeded(studentId, onChanged);
  const { rejecting } = checks;
  const { show, failure } = useDocumentLink(studentId);
  const { done, total, items } = checklist;
  const problem = firstProblem(checks.problem, failure, bin.problem);

  return (
    <Section
      title={DOCUMENT_TEXT.received(done, total)}
      aside={<Progress done={done} total={total} />}
    >
      {problem !== null && <Banner tone="problem">{problem}</Banner>}
      <ChecklistPanel
        checklist={checklist}
        isChecking={checks.isChecking}
        onUpload={setUploadingTypeId}
        onShow={(documentId, fileId, action) => {
          void show(documentId, fileId, action);
        }}
        onAddFile={setAddingTo}
        onVerify={(item) => {
          void checks.verify(item);
        }}
        onReject={checks.startRejecting}
        onNotNeeded={setNotNeeded}
        onDelete={setDeleting}
        bin={{
          viewerId: checklist.viewerId,
          deletesForGood: checklist.deletesForGood,
          onTakeOut: (target, name) => {
            void bin.takeOut(target, name);
          },
        }}
        onAsk={() => {
          setIsAsking(true);
        }}
        emailExamples={examples.offer}
      />
      <ExamplesComposer item={examples.emailing} student={emailTo} onClose={examples.stop} />
      <DeleteDialog
        deleting={deleting}
        studentName={studentName}
        forGood={checklist.deletesForGood}
        onClose={() => {
          setDeleting(null);
        }}
        onConfirm={async (reason) => {
          if (deleting === null) return;
          await bin.remove(deleting, reason, checklist.deletesForGood);
          setDeleting(null);
        }}
      />
      <NotNeededDialog
        documentType={notNeeded}
        studentName={studentName}
        onClose={() => {
          setNotNeeded(null);
        }}
        onConfirm={async (documentTypeId) => {
          await dropping.drop(documentTypeId);
          setNotNeeded(null);
        }}
      />
      {isAsking && (
        <DocumentPickerDialog
          title={DOCUMENT_TEXT.askTitle(studentName)}
          lead={DOCUMENT_TEXT.askLead(studentName)}
          initialIds={checklist.asked}
          onClose={() => {
            setIsAsking(false);
          }}
          onSave={async (ids) => {
            const saved = await setStudentDocuments(studentId, ids);
            setIsAsking(false);
            showToast(DOCUMENT_TEXT.listSaved);
            onChanged(saved);
          }}
        />
      )}
      {uploadingTypeId !== null && (
        <UploadDocumentDialog
          studentId={studentId}
          studentName={studentName}
          types={items.map((item) => item.documentType)}
          initialTypeId={uploadingTypeId}
          links={links}
          onClose={() => {
            setUploadingTypeId(null);
          }}
          onUploaded={(saved, fileCount) => {
            setUploadingTypeId(null);
            showToast(uploadedWords(fileCount));
            onChanged(saved);
          }}
        />
      )}
      <AddingFile
        studentId={studentId}
        studentName={studentName}
        addingTo={addingTo}
        onClose={() => {
          setAddingTo(null);
        }}
        onChanged={onChanged}
      />
      {rejecting !== null && (
        <RejectDocumentDialog
          studentId={studentId}
          documentId={rejecting.documentId}
          onClose={checks.stopRejecting}
          onRejected={(saved) => {
            checks.stopRejecting();
            showToast(DOCUMENT_TEXT.rejected);
            onChanged(saved);
          }}
        />
      )}
    </Section>
  );
}

/** The toast after an upload: one file, or several as one Document. */
/** "Email the examples" (ticket 12): offered only when there is a Student who can be emailed. */
function useExamplesEmail(emailTo: EmailRecipient | undefined) {
  const [emailing, setEmailing] = useState<ChecklistItem | null>(null);
  return {
    emailing,
    offer:
      emailTo === undefined
        ? undefined
        : { firstName: firstNameOf(emailTo.name), onEmail: setEmailing },
    stop: () => {
      setEmailing(null);
    },
  };
}

function uploadedWords(fileCount: number): string {
  return fileCount > 1 ? DOCUMENT_TEXT.uploadedMany(fileCount) : DOCUMENT_TEXT.uploaded;
}

type AddingFileProps = {
  studentId: RecordId;
  studentName: string;
  /** The Document getting more files; nothing shows while null. */
  addingTo: AddingTo | null;
  onClose: () => void;
  onChanged: (checklist: Checklist) => void;
};

/** Adding files to a Document, confirmed with a toast that says if it needs checking again. */
function AddingFile({ addingTo, onClose, onChanged, ...student }: AddingFileProps) {
  const { showToast } = useToast();
  if (addingTo === null) return null;
  return (
    <AddFileDialog
      {...student}
      addingTo={addingTo}
      onClose={onClose}
      onAdded={(saved, fileCount) => {
        onClose();
        showToast(DOCUMENT_TEXT.fileAdded(fileCount, addingTo.isVerified));
        onChanged(saved);
      }}
    />
  );
}

type NotNeededDialogProps = {
  /** The type being taken off; nothing shows while null. */
  documentType: ChecklistItem["documentType"] | null;
  studentName: string;
  onClose: () => void;
  onConfirm: (documentTypeId: RecordId) => Promise<void>;
};

/** Asks before taking a document off this Student's checklist ("Not needed"). */
function NotNeededDialog({ documentType, studentName, onClose, onConfirm }: NotNeededDialogProps) {
  if (documentType === null) return null;
  return (
    <ConfirmDialog
      title={DOCUMENT_TEXT.takeOffTitle(documentType.name, studentName)}
      actionLabel={DOCUMENT_TEXT.takeOff}
      onClose={onClose}
      onConfirm={() => onConfirm(documentType.id)}
      failureOf={notNeededFailure}
    >
      {DOCUMENT_TEXT.takeOffBody}
    </ConfirmDialog>
  );
}

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

type DeleteDialogProps = {
  /** What is being deleted; nothing shows while null. */
  deleting: Deleting | null;
  studentName: string;
  /** An Admin's delete skips the Bin and asks no reason. */
  forGood: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
};

/** Asks before deleting: why, for the Bin; or, for an Admin, that it goes for good (issue 79). */
function DeleteDialog({ deleting, studentName, forGood, onClose, onConfirm }: DeleteDialogProps) {
  if (deleting === null) return null;
  const words = forGood ? forGoodWords(deleting, studentName) : TO_THE_BIN;
  return (
    <ConfirmDialog
      title={BIN_TEXT.deleteTitle(deleting.name)}
      actionLabel={words.action}
      reason={words.reason}
      onClose={onClose}
      onConfirm={onConfirm}
      failureOf={binFailure}
    >
      {words.body}
    </ConfirmDialog>
  );
}

type DeleteWords = { action: string; body: string; reason: typeof BIN_REASON | undefined };

const TO_THE_BIN: DeleteWords = {
  action: BIN_TEXT.putInBin,
  body: BIN_TEXT.binBody,
  reason: BIN_REASON,
};

/** An Admin's own delete: no reason, and it says the Document or file goes for good. */
function forGoodWords(deleting: Deleting, studentName: string): DeleteWords {
  const body =
    deleting.target.fileId === null ? BIN_TEXT.adminDocumentBody : BIN_TEXT.adminFileBody;
  return { action: BIN_TEXT.delete, body: body(studentName), reason: undefined };
}

/** The first of these problems that there is, if any. */
function firstProblem(...problems: readonly (string | null)[]): string | null {
  return problems.find((problem) => problem !== null) ?? null;
}

type ChecklistPanelProps = Omit<
  ComponentProps<typeof DocumentChecklist>,
  "items" | "canChange" | "label"
> & {
  checklist: Checklist;
  /** Open the picker to ask this Student alone for more documents. */
  onAsk: () => void;
};

/**
 * The checklist in Applying, Visa and Statements, then the Documents no longer on it ("Other
 * documents"), each group in its panel; then asking for another document and the note on
 * private files (issue 80; prototype `#student-1`, Documents tab).
 */
function ChecklistPanel({ checklist, onAsk, ...actions }: ChecklistPanelProps) {
  const { items, canChange } = checklist;
  const others = items.filter((item) => item.group === null);
  return (
    <div className="grid gap-6">
      {DOCUMENT_GROUPS.map((group) => (
        <ChecklistGroup
          key={group}
          title={DOCUMENT_GROUP_LABELS[group]}
          help={DOCUMENT_GROUP_HELP[group]}
          items={items.filter((item) => item.group === group)}
          canChange={canChange}
          {...actions}
        />
      ))}
      <ChecklistGroup
        title={DOCUMENT_TEXT.otherDocuments}
        help={DOCUMENT_TEXT.otherDocumentsHelp}
        items={others}
        canChange={canChange}
        {...actions}
      />
      <Panel>
        {items.length === 0 && <EmptyState>{DOCUMENT_TEXT.empty}</EmptyState>}
        {canChange && <AskAnother onAsk={onAsk} />}
        <PanelFoot canChange={canChange} />
      </Panel>
    </div>
  );
}

type ChecklistGroupProps = Omit<ComponentProps<typeof DocumentChecklist>, "label"> & {
  title: string;
  help: string;
};

/** One Document Group's heading, the line under it, and its items; nothing when it is empty. */
function ChecklistGroup({ title, help, items, ...actions }: ChecklistGroupProps) {
  if (items.length === 0) return null;
  return (
    <div className="grid min-w-0 gap-3">
      <h3 className="text-body flex flex-wrap items-baseline gap-x-3 font-semibold">
        {title}
        <span className="text-small text-ink-2 font-normal">{help}</span>
      </h3>
      <Panel>
        <DocumentChecklist items={items} label={title} {...actions} />
      </Panel>
    </div>
  );
}

/** "Ask for another document", only for this Student (spec 63b). */
function AskAnother({ onAsk }: { onAsk: () => void }) {
  return (
    <div className="border-rule px-gutter flex flex-wrap items-center gap-x-5 gap-y-3 border-t py-4">
      <Button icon="plus" onClick={onAsk}>
        {DOCUMENT_TEXT.askAnother}
      </Button>
      <span className="text-small text-ink-2">{DOCUMENT_TEXT.askAnotherHint}</span>
    </div>
  );
}

function Progress({ done, total }: { done: number; total: number }) {
  return (
    <div className="w-40">
      <ProgressBar label={DOCUMENT_TEXT.progressLabel} value={done} max={total} />
    </div>
  );
}

/** Files are private; someone who can't upload is told who can. */
function PanelFoot({ canChange }: { canChange: boolean }) {
  return (
    <div className="border-rule text-secondary text-ink-2 px-gutter flex flex-wrap items-center justify-between gap-4 border-t py-4">
      <span className="inline-flex items-center gap-2.5">
        <Icon name="lock" size="sm" />
        {DOCUMENT_TEXT.privateFiles}
      </span>
      {!canChange && <span>{DOCUMENT_TEXT.viewOnly}</span>}
    </div>
  );
}
