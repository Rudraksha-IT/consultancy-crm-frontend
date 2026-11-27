"use client";

import { useId, useState, type SubmitEvent } from "react";

import { Button } from "@/components/ui/Button";
import { SelectField } from "@/components/ui/SelectField";
import { useToast } from "@/components/ui/useToast";
import { LABELS, MESSAGES } from "@/constants/messages";
import { BOARD_TEXT } from "@/constants/students";
import { assignCounsellor, type StudentProfile } from "@/lib/api";

import { SaveDialog } from "../profile/SaveDialog";
import { useFormSave } from "../profile/useFormSave";
import { useCounsellorChoices } from "../useCounsellorChoices";
import { firstNameOf } from "./moveSteps";

type MoveCounsellorDialogProps = {
  profile: Pick<StudentProfile, "id" | "name">;
  onClose: () => void;
  /** Move on with no counsellor; one can be assigned later. */
  onSkip: () => void;
  onSaved: (profile: StudentProfile) => void;
};

const NONE = "";

/** A Lead on the way to Counselling: who counsels them, or "Skip for now" (UI revamp 09). */
export function MoveCounsellorDialog(props: MoveCounsellorDialogProps) {
  const { profile, onClose, onSkip, onSaved } = props;
  const formId = useId();
  const { showToast } = useToast();
  const choices = useCounsellorChoices();
  const [picked, setPicked] = useState(NONE);
  const [isMissing, setIsMissing] = useState(false);
  const { isSaving, fieldErrors, failure, save } = useFormSave();
  const options = [
    { value: NONE, label: LABELS.chooseCounsellor },
    ...choices.map((choice) => ({ value: choice.id, label: choice.name })),
  ];

  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    const counsellor = choices.find((choice) => choice.id === picked);
    setIsMissing(counsellor === undefined);
    if (counsellor === undefined) return;
    void save(async () => {
      const saved = await assignCounsellor(profile.id, counsellor.id);
      showToast(MESSAGES.counsellorAssigned);
      onSaved(saved);
    });
  }

  return (
    <SaveDialog
      title={BOARD_TEXT.whoCounsels(profile.name)}
      formId={formId}
      saveLabel={BOARD_TEXT.assignAndMove}
      saveIcon="userplus"
      isSaving={isSaving}
      failure={failure}
      onClose={onClose}
      sideAction={
        <Button isDisabled={isSaving} onClick={onSkip}>
          {BOARD_TEXT.skipForNow}
        </Button>
      }
    >
      <p className="text-ink-2">{BOARD_TEXT.counsellorHelp(firstNameOf(profile.name))}</p>
      <form id={formId} noValidate onSubmit={handleSubmit} className="mt-3">
        <SelectField
          label={LABELS.counsellor}
          name="counsellor"
          options={options}
          value={picked}
          onChange={setPicked}
          errors={isMissing ? [MESSAGES.chooseCounsellor] : fieldErrors.counsellor}
        />
      </form>
    </SaveDialog>
  );
}
