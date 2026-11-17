"use client";

import { useId, useState, type SubmitEvent } from "react";

import { FileField } from "@/components/ui/FileField";
import { FieldNote } from "@/components/ui/FieldNote";
import { SegmentedChoice, type ChoiceTone } from "@/components/ui/SegmentedChoice";
import { useToast } from "@/components/ui/useToast";
import { DOCUMENT_FILE_ACCEPT } from "@/constants/documents";
import { Stage } from "@/constants/stages";
import {
  VISA_RESULTS,
  VISA_STATUS_LABELS,
  VISA_TEXT,
  VisaStatus,
  type VisaResult,
} from "@/constants/visas";
import { addVisaLetter, type StudentProfile, type Visa } from "@/lib/api";
import { documentFileProblem } from "@/lib/documents";

import { SaveDialog } from "./SaveDialog";
import { statusSavedMessage } from "./statusSaved";
import { useFormSave } from "./useFormSave";

const RESULT_TONES: Record<VisaResult, ChoiceTone> = { granted: "good", refused: "bad" };
const RESULT_OPTIONS = VISA_RESULTS.map((result) => ({
  value: result,
  label: VISA_STATUS_LABELS[result],
  tone: RESULT_TONES[result],
}));

type VisaLetterDialogProps = {
  profile: StudentProfile;
  visa: Visa;
  onClose: () => void;
  onSaved: (profile: StudentProfile) => void;
};

/**
 * Upload a Visa's letter (spec 116; prototype visaLetter). On a Visa at Applied the letter says
 * Granted or Refused, and the server saves the file and the Status together; the Stage follows.
 * A Visa already decided only takes the letter, keeping its Status.
 */
export function VisaLetterDialog({ profile, visa, onClose, onSaved }: VisaLetterDialogProps) {
  const { showToast } = useToast();
  const formId = useId();
  const isWaiting = visa.status === VisaStatus.Applied;
  const [result, setResult] = useState<VisaResult | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [problems, setProblems] = useState<Problems>(NO_PROBLEMS);
  const { isSaving, fieldErrors, failure, save } = useFormSave();

  function submit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    const sentResult = isWaiting ? result : null;
    const found = problemsOf(file, isWaiting && result === null);
    setProblems(found);
    if (file === null || hasProblem(found)) return;
    void save(async () => {
      const saved = await addVisaLetter(profile.id, visa.id, { result: sentResult, file });
      showToast(savedMessage(visa, sentResult, profile.stage, saved.stage));
      onSaved(saved);
    });
  }

  return (
    <SaveDialog
      title={VISA_TEXT.letterTitle}
      formId={formId}
      saveLabel={VISA_TEXT.saveLetter}
      saveIcon="upload"
      isSaving={isSaving}
      failure={failure}
      onClose={onClose}
    >
      <form id={formId} noValidate onSubmit={submit} className="grid gap-5">
        <FileField
          label={VISA_TEXT.letter}
          name="file"
          accept={DOCUMENT_FILE_ACCEPT}
          hint={VISA_TEXT.letterHint}
          errors={problems.file === null ? fieldErrors.file : [problems.file]}
          onChange={(chosen) => {
            setFile(chosen);
            setProblems((found) => ({ ...found, file: null }));
          }}
        />
        {isWaiting && (
          <ResultField
            value={result}
            onChange={(chosen) => {
              setResult(chosen);
              setProblems((found) => ({ ...found, result: null }));
            }}
            errors={problems.result === null ? fieldErrors.result : [problems.result]}
          />
        )}
        <p className="text-secondary text-ink-2">{whatHappens(profile, visa)}</p>
      </form>
    </SaveDialog>
  );
}

type Problems = { file: string | null; result: string | null };

const NO_PROBLEMS: Problems = { file: null, result: null };

/** What is wrong before sending: no usable file, or a waiting Visa's result not chosen. */
function problemsOf(file: File | null, isResultMissing: boolean): Problems {
  return {
    file: documentFileProblem(file),
    result: isResultMissing ? VISA_TEXT.resultNeeded : null,
  };
}

function hasProblem(found: Problems): boolean {
  return found.file !== null || found.result !== null;
}

/** The toast: the new Status (and any Stage move), or only that the letter was saved. */
function savedMessage(
  visa: Visa,
  result: VisaResult | null,
  stageBefore: StudentProfile["stage"],
  stageAfter: StudentProfile["stage"],
): string {
  if (result === null) return VISA_TEXT.letterSaved;
  const done = VISA_TEXT.statusSaved(visa.university.name, VISA_STATUS_LABELS[result]);
  return statusSavedMessage(done, stageBefore, stageAfter);
}

/** What saving does: a waiting Visa takes the letter's result; a decided one keeps its Status. */
function whatHappens(profile: StudentProfile, visa: Visa): string {
  if (visa.status !== VisaStatus.Applied) {
    return VISA_TEXT.statusStays(VISA_STATUS_LABELS[visa.status]);
  }
  return profile.stage === Stage.Visa
    ? `${VISA_TEXT.statusFollows} ${VISA_TEXT.refusedGoesBack}`
    : VISA_TEXT.statusFollows;
}

type ResultFieldProps = {
  value: VisaResult | null;
  onChange: (result: VisaResult) => void;
  errors: readonly string[] | undefined;
};

/** Granted or Refused, each in its fixed status colour beside its word, with any reason under. */
function ResultField({ value, onChange, errors }: ResultFieldProps) {
  const name = useId();
  const noteId = useId();
  return (
    <div className="grid gap-2">
      <span aria-hidden="true" className="text-secondary text-ink font-semibold">
        {VISA_TEXT.whatItSays}
      </span>
      <SegmentedChoice
        label={VISA_TEXT.whatItSays}
        name={name}
        options={RESULT_OPTIONS}
        value={value}
        onChange={onChange}
      />
      <FieldNote
        id={noteId}
        description={errors === undefined ? undefined : { text: errors.join(" "), tone: "error" }}
      />
    </div>
  );
}
