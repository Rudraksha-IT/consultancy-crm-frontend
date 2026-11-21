"use client";

import type { RecordId } from "@/lib/recordId";
import { useId, useState, type ReactNode, type SubmitEvent } from "react";

import { SelectField } from "@/components/ui/SelectField";
import { useToast } from "@/components/ui/useToast";
import { LABELS, MESSAGES } from "@/constants/messages";
import { assignCounsellor, transferStudent, type StudentProfile } from "@/lib/api";

import { useCounsellorChoices } from "../useCounsellorChoices";
import { SaveDialog } from "./SaveDialog";
import { useFormSave } from "./useFormSave";

type CounsellorDialogProps = {
  /** Only who they are and their counsellor are needed, so lists can open it too. */
  profile: Pick<StudentProfile, "id" | "name" | "assignedCounsellor">;
  onClose: () => void;
  onSaved: (profile: StudentProfile) => void;
};

/** Give a Student with no counsellor their first one (spec 28). */
export function AssignCounsellorDialog(props: CounsellorDialogProps) {
  const { profile } = props;
  return (
    <CounsellorDialog
      {...props}
      title={LABELS.assignCounsellorTo(profile.name)}
      selectLabel={LABELS.counsellor}
      saveLabel={LABELS.assign}
      send={(counsellorId) => assignCounsellor(profile.id, counsellorId)}
      doneMessage={() => MESSAGES.counsellorAssigned}
    />
  );
}

/** Hand the Student to another counsellor, who alone (with Admins) changes them after (spec 42). */
export function TransferDialog(props: CounsellorDialogProps) {
  const { profile } = props;
  const current = profile.assignedCounsellor;
  return (
    <CounsellorDialog
      {...props}
      title={LABELS.transferNamed(profile.name)}
      selectLabel={LABELS.transferTo}
      saveLabel={LABELS.transfer}
      excludeId={current?.id}
      send={(counsellorId) => transferStudent(profile.id, counsellorId)}
      doneMessage={(saved) => MESSAGES.transferredTo(saved.assignedCounsellor?.name ?? "")}
      intro={
        <p>
          {LABELS.currentlyWith} <b>{current?.name}</b>. {MESSAGES.transferExplained}
        </p>
      }
    />
  );
}

type ChoiceDialogProps = CounsellorDialogProps & {
  title: string;
  selectLabel: string;
  saveLabel: string;
  intro?: ReactNode;
  /** The current counsellor, who isn't offered again. */
  excludeId?: RecordId | undefined;
  send: (counsellorId: RecordId) => Promise<StudentProfile>;
  doneMessage: (saved: StudentProfile) => string;
};

const NONE = "";

function CounsellorDialog(props: ChoiceDialogProps) {
  const { title, selectLabel, saveLabel, intro, excludeId, send, doneMessage } = props;
  const { onClose, onSaved } = props;
  const formId = useId();
  const { showToast } = useToast();
  const choices = useCounsellorChoices().filter((choice) => choice.id !== excludeId);
  const [picked, setPicked] = useState(NONE);
  const [missing, setMissing] = useState(false);
  const { isSaving, fieldErrors, failure, save } = useFormSave();
  const options = [
    { value: NONE, label: LABELS.chooseCounsellor },
    ...choices.map((choice) => ({ value: choice.id, label: choice.name })),
  ];

  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    const counsellor = choices.find((choice) => choice.id === picked);
    setMissing(counsellor === undefined);
    if (counsellor === undefined) return;
    void save(async () => {
      const saved = await send(counsellor.id);
      showToast(doneMessage(saved));
      onSaved(saved);
    });
  }

  return (
    <SaveDialog
      title={title}
      formId={formId}
      saveLabel={saveLabel}
      saveIcon="userplus"
      isSaving={isSaving}
      failure={failure}
      onClose={onClose}
    >
      {intro}
      <form id={formId} noValidate onSubmit={handleSubmit}>
        <SelectField
          label={selectLabel}
          name="counsellor"
          options={options}
          value={picked}
          onChange={setPicked}
          errors={missing ? [MESSAGES.chooseCounsellor] : fieldErrors.counsellor}
        />
      </form>
    </SaveDialog>
  );
}
