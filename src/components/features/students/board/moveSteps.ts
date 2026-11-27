import { ApplicationStatus } from "@/constants/applications";
import { JOURNEY_STAGES, Stage } from "@/constants/stages";
import { VisaStatus } from "@/constants/visas";
import type { StudentProfile } from "@/lib/api";

/** What a move asks for next: a popup to save, the Stage set by hand, or nothing more. */
export const MoveStep = {
  Counsellor: "counsellor",
  Application: "application",
  Offer: "offer",
  Visa: "visa",
  SetStage: "setStage",
  Done: "done",
} as const;

export type MoveStep = (typeof MoveStep)[keyof typeof MoveStep];

/** What of a Student decides the steps of a move: their Stage and the records it follows. */
export type MoveRecords = Pick<StudentProfile, "stage" | "canAssign"> & {
  assignedCounsellor: object | null;
  applications: readonly { status: ApplicationStatus }[];
  visas: readonly { status: VisaStatus }[];
};

const at = (stage: Stage): number => JOURNEY_STAGES.findIndex((one) => one === stage);

/** A move to a later Stage of the journey. Lost is off the journey, so never forward. */
export function isForwardMove(from: Stage, to: Stage): boolean {
  return from !== Stage.Lost && to !== Stage.Lost && at(to) > at(from);
}

/**
 * The next step of moving a Student to `target` (UI revamp 09, prototype `moveTo`). A Stage only
 * follows what it stands for, so a forward move asks, in order, for a counsellor (a Lead with
 * none; may be skipped), an Application, an Offer Letter and the visa. It is worked out again
 * after each step is saved, so a jump over several Stages asks for each in turn. A move back, or
 * a Stage the records don't reach, is sent as it is and the server decides.
 */
export function nextMoveStep(
  student: MoveRecords,
  target: Stage,
  hasSkippedCounsellor: boolean,
): MoveStep {
  if (isForwardMove(student.stage, target)) {
    const needed = forwardStep(student, at(target), hasSkippedCounsellor);
    if (needed !== null) return needed;
  }
  return student.stage === target ? MoveStep.Done : MoveStep.SetStage;
}

type Needs = (student: MoveRecords, to: number, hasSkippedCounsellor: boolean) => MoveStep | null;

const has = (student: MoveRecords, status: ApplicationStatus): boolean =>
  student.applications.some((application) => application.status === status);

/** A Lead with no counsellor, when the viewer may give them one and hasn't skipped it. */
const needsCounsellor: Needs = (student, _to, hasSkippedCounsellor) => {
  const isAsked = student.stage === Stage.Lead && student.assignedCounsellor === null;
  return isAsked && student.canAssign && !hasSkippedCounsellor ? MoveStep.Counsellor : null;
};

const needsApplication: Needs = (student, to) =>
  to >= at(Stage.Applying) && student.applications.length === 0 ? MoveStep.Application : null;

/** An offer needs an Application waiting for one; with none, the Application comes first. */
const needsOffer: Needs = (student, to) => {
  if (to < at(Stage.Offer) || has(student, ApplicationStatus.Offer)) return null;
  return has(student, ApplicationStatus.Applied) ? MoveStep.Offer : MoveStep.Application;
};

const needsVisa: Needs = (student, to) => {
  const isInProgress = student.visas.some((visa) => visa.status !== VisaStatus.Refused);
  return to >= at(Stage.Visa) && !isInProgress ? MoveStep.Visa : null;
};

/** What each Stage on the way asks for, in the journey's order. */
const NEEDS: readonly Needs[] = [needsCounsellor, needsApplication, needsOffer, needsVisa];

function forwardStep(student: MoveRecords, to: number, hasSkipped: boolean): MoveStep | null {
  for (const needs of NEEDS) {
    const step = needs(student, to, hasSkipped);
    if (step !== null) return step;
  }
  return null;
}

/** "Anish" of "Anish Neupane", for a popup's title. */
export function firstNameOf(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}
