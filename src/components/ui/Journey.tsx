import clsx from "clsx";
import type { ReactNode } from "react";

import { LABELS, MESSAGES } from "@/constants/messages";
import { JOURNEY_STAGES, MANUAL_STAGES, STAGE_LABELS, Stage } from "@/constants/stages";

import { Icon } from "./Icon";

type StopState = "done" | "current" | "next";

type JourneyProps = {
  stage: Stage;
  /** What to do next, shown under the journey; none for some Stages. */
  nextStep: string | null;
  /** The journey is finished (a granted Visa): every step is ticked and the note says Done. */
  isDone?: boolean;
  /**
   * Given, the other hand-set Stage (Lead or Counselling) becomes a button while the Student is
   * at one of them.
   */
  onMoveTo?: ((stage: Stage) => void) | undefined;
  /** A move is being saved, so the buttons wait. */
  isMoving?: boolean;
  /** Shown above the Stages, e.g. the ⓘ for a Student who was Lost before. */
  info?: ReactNode;
};

const STOP_CLASSES: Record<StopState, string> = {
  done: "border-accent bg-accent text-accent-ink",
  current: "border-accent bg-paper ring-5 ring-tint",
  next: "border-rule-2 bg-paper",
};

const NAME_CLASSES: Record<StopState, string> = {
  done: "text-ink-2 font-medium",
  current: "text-ink font-bold",
  next: "text-ink-3 font-medium",
};

/**
 * A Student's Stage journey: Lead → Counselling → Applying → Offer → Visa; a granted Visa ticks
 * the last step too. A Lost Student's journey is faded with nothing marked. It runs across: above
 * 640 at full size, scrolling inside its panel if it must; at 640 and below as a compact stepper,
 * five dots in a row with the names small under them (design system: Journey).
 */
export function Journey({ stage, nextStep, isDone, onMoveTo, isMoving, info }: JourneyProps) {
  const isLost = stage === Stage.Lost;
  const moveTo = MANUAL_STAGES.includes(stage) ? onMoveTo : undefined;
  const at = JOURNEY_STAGES.findIndex((step) => step === stage);

  return (
    <div
      data-lost={isLost}
      className="rounded-panel border-rule bg-paper shadow-raise phone:px-6 phone:pt-7 phone:pb-6 max-phone:px-3 max-phone:pt-4 max-phone:pb-3.5 min-w-0 border p-5"
    >
      {info !== undefined && <div className="-mt-2 mb-2 flex items-center gap-1.5">{info}</div>}
      <div className="phone:overflow-x-auto">
        <ol
          aria-label={LABELS.stageIs(STAGE_LABELS[stage])}
          className={clsx(
            "grid grid-cols-[repeat(5,minmax(0,1fr))]",
            "phone:min-w-journey",
            isLost && "opacity-40",
          )}
        >
          {JOURNEY_STAGES.map((step, index) => (
            <Stop
              key={step}
              step={step}
              state={isDone === true ? "done" : stopState(index, at, isLost)}
              isLast={index === JOURNEY_STAGES.length - 1}
              onMove={step === stage || !MANUAL_STAGES.includes(step) ? undefined : moveTo}
              isMoving={isMoving === true}
            />
          ))}
        </ol>
      </div>
      {!isLost && (
        <JourneyNote nextStep={nextStep} isDone={isDone === true} canMove={moveTo !== undefined} />
      )}
    </div>
  );
}

function stopState(index: number, at: number, isLost: boolean): StopState {
  if (isLost || index > at) return "next";
  return index < at ? "done" : "current";
}

type StopProps = {
  step: Stage;
  state: StopState;
  /** Given, the Stage's name is a button that moves the Student there. */
  onMove: ((stage: Stage) => void) | undefined;
  isMoving: boolean;
  /** The last Stage: no line runs on from it. */
  isLast: boolean;
};

/**
 * A compact stepper on a phone: the stop centred over its small name, the line running from this
 * stop's centre to the next one's.
 */
const PHONE_STOP =
  "grid-cols-1 content-start items-start justify-items-center gap-1.5 text-center before:top-2.5 before:left-1/2 before:-right-1/2 before:h-0.75";
/** Across above 640: the stop over the name, the line running right from the stop. */
const ACROSS_STOP =
  "phone:content-start phone:items-start phone:justify-items-start phone:gap-3 phone:text-left phone:before:top-2.5 phone:before:bottom-auto phone:before:right-1 phone:before:left-5 phone:before:w-auto phone:before:h-0.75";

function Stop({ step, state, onMove, isMoving, isLast }: StopProps) {
  return (
    <li
      data-state={state}
      className={clsx(
        "before:bg-fill-2 relative grid before:absolute before:rounded-full",
        PHONE_STOP,
        ACROSS_STOP,
        state === "done" && "before:bg-accent",
        isLast && "before:hidden",
      )}
    >
      <span
        className={clsx(
          "relative z-10 grid size-5.5 place-items-center rounded-full border-3",
          STOP_CLASSES[state],
        )}
      >
        {state === "done" && <Icon name="check" size="sm" />}
      </span>
      {onMove === undefined ? (
        <span
          className={clsx(
            "text-body max-phone:text-tiny max-phone:truncate max-w-full min-w-0",
            NAME_CLASSES[state],
          )}
        >
          {STAGE_LABELS[step]}
        </span>
      ) : (
        <button
          type="button"
          aria-label={LABELS.moveTo(STAGE_LABELS[step])}
          disabled={isMoving}
          onClick={() => {
            onMove(step);
          }}
          className="text-body text-accent min-h-control min-w-control rounded-control max-phone:text-tiny max-phone:-my-3 max-phone:justify-self-center max-phone:justify-center -my-2.5 inline-flex max-w-full items-center justify-self-start font-semibold underline decoration-dotted underline-offset-4 disabled:opacity-60"
        >
          {STAGE_LABELS[step]}
        </button>
      )}
    </li>
  );
}

type JourneyNoteProps = { nextStep: string | null; isDone: boolean; canMove: boolean };

function JourneyNote({ nextStep, isDone, canMove }: JourneyNoteProps) {
  if (nextStep === null && !canMove) return null;
  return (
    <p className="text-secondary text-ink-2 max-phone:mt-3.5 max-phone:line-clamp-2 mt-5">
      {nextStep !== null && <NextStep text={nextStep} isDone={isDone} isFollowed={canMove} />}
      {canMove && <span>{MESSAGES.moveByHand}</span>}
    </p>
  );
}

type NextStepProps = { text: string; isDone: boolean; isFollowed: boolean };

function NextStep({ text, isDone, isFollowed }: NextStepProps) {
  return (
    <>
      <b className="text-ink">{isDone ? LABELS.done : LABELS.nextStep}</b> <span>{text}</span>
      {isFollowed && ". "}
    </>
  );
}
