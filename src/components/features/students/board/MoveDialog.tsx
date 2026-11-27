"use client";

import clsx from "clsx";

import { buttonClasses } from "@/components/ui/buttonStyles";
import { Dialog } from "@/components/ui/Dialog";
import { LABELS } from "@/constants/messages";
import { JOURNEY_STAGES, STAGE_LABELS, Stage } from "@/constants/stages";
import { BOARD_TEXT } from "@/constants/students";
import type { BoardStudent } from "@/lib/api";

import { BEAD_CLASSES } from "./beads";

type MoveDialogProps = {
  student: BoardStudent;
  onClose: () => void;
  /** The Stage picked; the dialog is closed first. */
  onChoose: (stage: Stage) => void;
};

const ROW = "w-full justify-start";

/** Move: the Stages to choose from, the Student's own marked, and Mark as Lost last in red. */
export function MoveDialog({ student, onClose, onChoose }: MoveDialogProps) {
  const firstOther = JOURNEY_STAGES.find((stage) => stage !== student.stage);
  return (
    <Dialog isOpen title={BOARD_TEXT.moveNamed(student.name)} onClose={onClose}>
      <p className="text-ink-2">
        <span>{BOARD_TEXT.nowAt(STAGE_LABELS[student.stage])}</span> {BOARD_TEXT.moveHelp}
      </p>
      <div role="group" aria-label={BOARD_TEXT.stages} className="mt-3 grid gap-1">
        {JOURNEY_STAGES.map((stage, index) => (
          <button
            key={stage}
            type="button"
            disabled={stage === student.stage}
            aria-pressed={stage === student.stage}
            data-first-focus={stage === firstOther ? "" : undefined}
            onClick={() => {
              onChoose(stage);
            }}
            className={clsx(buttonClasses("secondary", "md"), ROW, "aria-pressed:text-ink")}
          >
            <i
              aria-hidden="true"
              className={clsx("rounded-pill block size-2.5", BEAD_CLASSES[index])}
            />
            {STAGE_LABELS[stage]}
          </button>
        ))}
        {student.stage !== Stage.Lost && (
          <button
            type="button"
            onClick={() => {
              onChoose(Stage.Lost);
            }}
            className={clsx(buttonClasses("danger", "md"), ROW)}
          >
            {LABELS.markAsLost}
          </button>
        )}
      </div>
    </Dialog>
  );
}
