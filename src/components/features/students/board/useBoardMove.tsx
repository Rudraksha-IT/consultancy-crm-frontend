"use client";

import { useState, type ReactNode } from "react";

import { useToast } from "@/components/ui/useToast";
import { ApplicationStatus } from "@/constants/applications";
import { MESSAGES } from "@/constants/messages";
import { STAGE_LABELS, Stage } from "@/constants/stages";
import { BOARD_TEXT } from "@/constants/students";
import { fetchStudentProfile, setStage, type BoardStudent, type StudentProfile } from "@/lib/api";

import { AddApplicationDialog } from "../profile/AddApplicationDialog";
import { AddOfferLetterDialog } from "../profile/AddOfferLetterDialog";
import { MarkLostDialog } from "../profile/MarkLostDialog";
import { stageFailure } from "../profile/saveErrors";
import { MoveCounsellorDialog } from "./MoveCounsellorDialog";
import { MoveStep, isForwardMove, nextMoveStep } from "./moveSteps";
import { VisaStepDialog } from "./VisaStepDialog";

type BoardMove = {
  /** Move a Student to a Stage: what dragging a card and Move both do. */
  moveTo: (student: BoardStudent, stage: Stage) => Promise<void>;
  /** Why the last move was refused, in the server's words. */
  failure: string | null;
  /** The popups a move may open: each step of a forward move, and why they are Lost. */
  dialogs: ReactNode;
};

/** A forward move under way: where it is going and what the Student's records are now. */
type Move = {
  student: BoardStudent;
  target: Stage;
  profile: StudentProfile;
  hasSkippedCounsellor: boolean;
  /** A step of this move was saved, so the board must show where the Student now is. */
  hasSaved: boolean;
};

type PopupStep = Exclude<MoveStep, typeof MoveStep.SetStage | typeof MoveStep.Done>;

/**
 * The board's one move flow, used by dragging and by Move (UI revamp 09). A forward move asks for
 * what each Stage on the way stands for (a counsellor, an Application, an Offer Letter, the visa),
 * one popup at a time, and the card moves only once they are saved; cancelling one keeps what was
 * already saved. A move back is sent as it is and a move to Lost asks why. When the server refuses
 * a move its reason is kept to show and the card stays. `onMoved` runs once the board must be
 * drawn again.
 */
export function useBoardMove(onMoved: (student: BoardStudent) => Promise<void>): BoardMove {
  const { showToast } = useToast();
  const [failure, setFailure] = useState<string | null>(null);
  const [losing, setLosing] = useState<BoardStudent | null>(null);
  const [open, setOpen] = useState<(Move & { step: PopupStep }) | null>(null);

  async function sendStage(student: BoardStudent, stage: Stage, hasSaved: boolean): Promise<void> {
    try {
      await setStage(student.id, { stage });
    } catch (error) {
      setFailure(stageFailure(error));
      if (hasSaved) await onMoved(student);
      return;
    }
    showToast(
      student.stage === Stage.Lost
        ? MESSAGES.backInCounselling
        : MESSAGES.stageSet(STAGE_LABELS[stage]),
    );
    await onMoved(student);
  }

  /** Open the next step's popup, or finish the move when nothing more is asked. */
  async function carryOn(move: Move): Promise<void> {
    const step = nextMoveStep(move.profile, move.target, move.hasSkippedCounsellor);
    if (step === MoveStep.Done) {
      setOpen(null);
      await onMoved(move.student);
    } else if (step === MoveStep.SetStage) {
      setOpen(null);
      await sendStage(move.student, move.target, move.hasSaved);
    } else {
      setOpen({ ...move, step });
    }
  }

  async function moveTo(student: BoardStudent, stage: Stage): Promise<void> {
    if (stage === student.stage) return;
    setFailure(null);
    if (stage === Stage.Lost) {
      setLosing(student);
      return;
    }
    if (!isForwardMove(student.stage, stage)) {
      await sendStage(student, stage, false);
      return;
    }
    let profile: StudentProfile;
    try {
      profile = await fetchStudentProfile(student.id);
    } catch {
      setFailure(BOARD_TEXT.studentNotLoaded);
      return;
    }
    await carryOn({
      student,
      target: stage,
      profile,
      hasSkippedCounsellor: false,
      hasSaved: false,
    });
  }

  return {
    moveTo,
    failure,
    dialogs: (
      <>
        {open !== null && (
          <StepDialog
            move={open}
            onCancel={() => {
              setOpen(null);
              if (open.hasSaved) void onMoved(open.student);
            }}
            onKept={(profile) => {
              setOpen({ ...open, profile, hasSaved: true });
            }}
            onCarryOn={(change) => void carryOn({ ...open, ...change })}
          />
        )}
        {losing !== null && (
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
        )}
      </>
    ),
  };
}

type StepDialogProps = {
  move: Move & { step: PopupStep };
  onCancel: () => void;
  /** Part of a step was saved and its popup stays open (the Chosen Offer, before the visa). */
  onKept: (profile: StudentProfile) => void;
  /** The step is over (saved, or skipped): work out the next one. */
  onCarryOn: (change: Partial<Move>) => void;
};

/** The popup of one step. Saving it hands the Student's new records on to the next step. */
function StepDialog({ move, onCancel, onKept, onCarryOn }: StepDialogProps) {
  const { profile, step } = move;
  const onSaved = (saved: StudentProfile): void => {
    onCarryOn({ profile: saved, hasSaved: true });
  };
  if (step === MoveStep.Counsellor) {
    return (
      <MoveCounsellorDialog
        profile={profile}
        onClose={onCancel}
        onSkip={() => {
          onCarryOn({ hasSkippedCounsellor: true });
        }}
        onSaved={onSaved}
      />
    );
  }
  if (step === MoveStep.Application) {
    return <AddApplicationDialog profile={profile} onClose={onCancel} onSaved={onSaved} />;
  }
  if (step === MoveStep.Offer) {
    const waiting = profile.applications.filter((one) => one.status === ApplicationStatus.Applied);
    return (
      <AddOfferLetterDialog
        profile={profile}
        applications={waiting}
        onClose={onCancel}
        onSaved={onSaved}
      />
    );
  }
  return (
    <VisaStepDialog profile={profile} onClose={onCancel} onChosen={onKept} onSaved={onSaved} />
  );
}
