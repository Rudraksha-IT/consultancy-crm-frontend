"use client";

import { useState, type ReactNode } from "react";

import { useToast } from "@/components/ui/useToast";
import { MESSAGES } from "@/constants/messages";
import { STAGE_LABELS, Stage } from "@/constants/stages";
import { setStage, type BoardStudent } from "@/lib/api";

import { MarkLostDialog } from "../profile/MarkLostDialog";
import { stageFailure } from "../profile/saveErrors";

type BoardMove = {
  /** Move a Student to a Stage: what dragging a card and Move both do. */
  moveTo: (student: BoardStudent, stage: Stage) => Promise<void>;
  /** Why the last move was refused, in the server's words. */
  failure: string | null;
  /** The popups a move may open (why they are Lost). */
  dialogs: ReactNode;
};

/**
 * The board's one move flow, used by dragging and by Move. A move to Lost asks why; any other is
 * sent as it is, and when the server refuses it (a Stage that follows the Student's records) its
 * reason is kept to show and the card stays. `onMoved` runs once a move is saved.
 */
export function useBoardMove(onMoved: (student: BoardStudent) => Promise<void>): BoardMove {
  const { showToast } = useToast();
  const [failure, setFailure] = useState<string | null>(null);
  const [losing, setLosing] = useState<BoardStudent | null>(null);

  async function moveTo(student: BoardStudent, stage: Stage): Promise<void> {
    if (stage === student.stage) return;
    setFailure(null);
    if (stage === Stage.Lost) {
      setLosing(student);
      return;
    }
    try {
      await setStage(student.id, { stage });
    } catch (error) {
      setFailure(stageFailure(error));
      return;
    }
    showToast(
      student.stage === Stage.Lost
        ? MESSAGES.backInCounselling
        : MESSAGES.stageSet(STAGE_LABELS[stage]),
    );
    await onMoved(student);
  }

  const dialogs = losing !== null && (
    <MarkLostDialog
      studentId={losing.id}
      onClose={() => {
        setLosing(null);
      }}
      onSaved={() => {
        setLosing(null);
        void onMoved(losing);
      }}
    />
  );

  return { moveTo, failure, dialogs };
}
