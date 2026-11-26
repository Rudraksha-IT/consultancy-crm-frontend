import { ApplicationStatus } from "@/constants/applications";
import { Stage } from "@/constants/stages";
import { VisaStatus } from "@/constants/visas";

import { MoveStep, isForwardMove, nextMoveStep, type MoveRecords } from "./moveSteps";

const LEAD: MoveRecords = {
  stage: Stage.Lead,
  assignedCounsellor: null,
  canAssign: true,
  applications: [],
  visas: [],
};
const COUNSELLED: MoveRecords = {
  ...LEAD,
  stage: Stage.Counselling,
  assignedCounsellor: { id: "c" },
};
const APPLIED = { status: ApplicationStatus.Applied };
const OFFERED = { status: ApplicationStatus.Offer };
const REJECTED = { status: ApplicationStatus.Rejected };

describe("isForwardMove", () => {
  it("is a move to a later Stage of the journey", () => {
    expect(isForwardMove(Stage.Lead, Stage.Counselling)).toBe(true);
    expect(isForwardMove(Stage.Lead, Stage.Visa)).toBe(true);
    expect(isForwardMove(Stage.Offer, Stage.Counselling)).toBe(false);
    expect(isForwardMove(Stage.Offer, Stage.Offer)).toBe(false);
  });

  it("is never a move from or to Lost", () => {
    expect(isForwardMove(Stage.Lost, Stage.Counselling)).toBe(false);
    expect(isForwardMove(Stage.Lead, Stage.Lost)).toBe(false);
  });
});

describe("nextMoveStep", () => {
  it("asks a Lead with no counsellor for one first, whatever Stage is wanted", () => {
    expect(nextMoveStep(LEAD, Stage.Counselling, false)).toBe(MoveStep.Counsellor);
    expect(nextMoveStep(LEAD, Stage.Visa, false)).toBe(MoveStep.Counsellor);
  });

  it("sets Counselling by hand once the counsellor is chosen or skipped", () => {
    expect(nextMoveStep(LEAD, Stage.Counselling, true)).toBe(MoveStep.SetStage);
    const assigned = { ...LEAD, assignedCounsellor: { id: "c" } };
    expect(nextMoveStep(assigned, Stage.Counselling, false)).toBe(MoveStep.SetStage);
  });

  it("does not ask for a counsellor when the viewer may not assign one", () => {
    expect(nextMoveStep({ ...LEAD, canAssign: false }, Stage.Counselling, false)).toBe(
      MoveStep.SetStage,
    );
  });

  it("does not ask a Student already past Lead for a counsellor", () => {
    const unassigned = { ...COUNSELLED, assignedCounsellor: null };
    expect(nextMoveStep(unassigned, Stage.Applying, false)).toBe(MoveStep.Application);
  });

  it("asks for an Application on the way to Applying, then is done", () => {
    expect(nextMoveStep(COUNSELLED, Stage.Applying, false)).toBe(MoveStep.Application);
    const applying = { ...COUNSELLED, stage: Stage.Applying, applications: [APPLIED] };
    expect(nextMoveStep(applying, Stage.Applying, false)).toBe(MoveStep.Done);
  });

  it("asks for an Application before the offer when none waits for one", () => {
    expect(nextMoveStep(COUNSELLED, Stage.Offer, false)).toBe(MoveStep.Application);
    const rejected = { ...COUNSELLED, stage: Stage.Applying, applications: [REJECTED] };
    expect(nextMoveStep(rejected, Stage.Offer, false)).toBe(MoveStep.Application);
  });

  it("asks for the Offer Letter when an Application waits for one", () => {
    const applying = { ...COUNSELLED, stage: Stage.Applying, applications: [APPLIED] };
    expect(nextMoveStep(applying, Stage.Offer, false)).toBe(MoveStep.Offer);
    expect(nextMoveStep(applying, Stage.Visa, false)).toBe(MoveStep.Offer);
  });

  it("asks for the visa once there is an offer and no visa in progress", () => {
    const offer = { ...COUNSELLED, stage: Stage.Offer, applications: [OFFERED] };
    expect(nextMoveStep(offer, Stage.Visa, false)).toBe(MoveStep.Visa);
    const refused = { ...offer, visas: [{ status: VisaStatus.Refused }] };
    expect(nextMoveStep(refused, Stage.Visa, false)).toBe(MoveStep.Visa);
    const atVisa = { ...offer, stage: Stage.Visa, visas: [{ status: VisaStatus.Applied }] };
    expect(nextMoveStep(atVisa, Stage.Visa, false)).toBe(MoveStep.Done);
  });

  it("leaves a Stage the records don't reach to the server, which says why", () => {
    const cameBack = { ...COUNSELLED, applications: [APPLIED] };
    expect(nextMoveStep(cameBack, Stage.Applying, false)).toBe(MoveStep.SetStage);
  });

  it("sends a move back as it is", () => {
    const applying = { ...COUNSELLED, stage: Stage.Applying, applications: [APPLIED] };
    expect(nextMoveStep(applying, Stage.Lead, false)).toBe(MoveStep.SetStage);
  });
});
