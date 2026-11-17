"use client";

import { useToast } from "@/components/ui/useToast";
import { WORK_FROM_HOME_TEXT as TEXT } from "@/constants/workFromHome";
import { askForWorkFromHome, type WorkFromHomeDates } from "@/lib/api";

import { WorkFromHomeDialog } from "./WorkFromHomeDialog";

type AskWorkFromHomeDialogProps = {
  onClose: () => void;
  onSent: (dates: WorkFromHomeDates) => void;
};

/** Ask for Work From Home dates (spec 132); every Admin is told. */
export function AskWorkFromHomeDialog({ onClose, onSent }: AskWorkFromHomeDialogProps) {
  const { showToast } = useToast();
  return (
    <WorkFromHomeDialog
      title={TEXT.askTitle}
      intro={TEXT.askIntro}
      saveLabel={TEXT.sendRequest}
      onClose={onClose}
      onSave={async (wanted) => {
        const sent = await askForWorkFromHome(wanted);
        showToast(TEXT.requestSent);
        onSent(sent);
      }}
    />
  );
}
