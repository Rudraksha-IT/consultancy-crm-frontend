"use client";

import { useId, useState, type SubmitEvent } from "react";

import { FileField } from "@/components/ui/FileField";
import { FieldNote } from "@/components/ui/FieldNote";
import { SegmentedChoice } from "@/components/ui/SegmentedChoice";
import { SelectField } from "@/components/ui/SelectField";
import { useToast } from "@/components/ui/useToast";
import { OFFER_KINDS, OFFER_KIND_LABELS, OFFER_TEXT, OfferKind } from "@/constants/applications";
import { DOCUMENT_FILE_ACCEPT } from "@/constants/documents";
import { Stage } from "@/constants/stages";
import { addOfferLetter, type Application, type StudentProfile } from "@/lib/api";
import { documentFileProblem } from "@/lib/documents";

import { SaveDialog } from "./SaveDialog";
import { statusSavedMessage } from "./statusSaved";
import { useFormSave } from "./useFormSave";

const KIND_OPTIONS = OFFER_KINDS.map((kind) => ({
  value: kind,
  label: OFFER_KIND_LABELS[kind],
  tone: "accent" as const,
}));

type AddOfferLetterDialogProps = {
  profile: StudentProfile;
  /** The Student's Applications waiting for an offer; the first is picked to start with. */
  applications: readonly Application[];
  onClose: () => void;
  onSaved: (profile: StudentProfile) => void;
};

/**
 * Add a University's offer letter (spec 114; prototype addOffer): which Application, Conditional
 * or Unconditional, and the file. It is kept as a Document linked to that Application, which
 * becomes Offer; the Student's Stage follows on the server.
 */
export function AddOfferLetterDialog(props: AddOfferLetterDialogProps) {
  const { profile, applications, onClose, onSaved } = props;
  const { showToast } = useToast();
  const formId = useId();
  const [applicationId, setApplicationId] = useState(applications[0]?.id ?? "");
  const [kind, setKind] = useState<OfferKind>(OfferKind.Conditional);
  const [file, setFile] = useState<File | null>(null);
  const [fileProblem, setFileProblem] = useState<string | null>(null);
  const { isSaving, fieldErrors, failure, save } = useFormSave();

  function submit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    const problem = documentFileProblem(file);
    setFileProblem(problem);
    const application = applications.find((one) => one.id === applicationId);
    if (problem !== null || file === null || application === undefined) return;
    void save(async () => {
      const saved = await addOfferLetter(profile.id, {
        applicationId: application.id,
        kind,
        file,
      });
      const done = OFFER_TEXT.added(OFFER_KIND_LABELS[kind], application.university.name);
      showToast(statusSavedMessage(done, profile.stage, saved.stage));
      onSaved(saved);
    });
  }

  const fileErrors = fileProblem === null ? fieldErrors.file : [fileProblem];
  return (
    <SaveDialog
      title={OFFER_TEXT.dialogTitle(profile.name)}
      formId={formId}
      saveLabel={OFFER_TEXT.add}
      saveIcon="plus"
      isSaving={isSaving}
      failure={failure}
      onClose={onClose}
    >
      <form id={formId} noValidate onSubmit={submit} className="grid gap-5">
        <SelectField
          label={OFFER_TEXT.whichApplication}
          name="application"
          options={applications.map((one) => ({
            value: one.id,
            label: OFFER_TEXT.applicationOption(one.university.name, one.course.name),
          }))}
          value={applicationId}
          onChange={setApplicationId}
          errors={fieldErrors.application}
        />
        <KindField value={kind} onChange={setKind} errors={fieldErrors.kind} />
        <FileField
          label={OFFER_TEXT.letter}
          name="file"
          accept={DOCUMENT_FILE_ACCEPT}
          hint={OFFER_TEXT.letterHint}
          errors={fileErrors}
          onChange={(chosen) => {
            setFile(chosen);
            setFileProblem(null);
          }}
        />
        <p className="text-secondary text-ink-2">{whatHappens(profile)}</p>
      </form>
    </SaveDialog>
  );
}

/** What adding the letter does: the first offer also moves an Applying Student to Offer. */
function whatHappens(profile: StudentProfile): string {
  return profile.stage === Stage.Applying
    ? OFFER_TEXT.becomesOfferAndMoves
    : OFFER_TEXT.becomesOffer;
}

type KindFieldProps = {
  value: OfferKind;
  onChange: (kind: OfferKind) => void;
  errors: readonly string[] | undefined;
};

/** Conditional or Unconditional, with the server's reason under it if it was refused. */
function KindField({ value, onChange, errors }: KindFieldProps) {
  const name = useId();
  const noteId = useId();
  return (
    <div className="grid gap-2">
      <span aria-hidden="true" className="text-secondary text-ink font-semibold">
        {OFFER_TEXT.kind}
      </span>
      <SegmentedChoice
        label={OFFER_TEXT.kind}
        name={name}
        options={KIND_OPTIONS}
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
