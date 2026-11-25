import clsx from "clsx";

import { LABELS } from "@/constants/messages";
import { JOURNEY_STAGES, STAGE_LABELS, type Stage } from "@/constants/stages";

/**
 * The steps behind the Stage are light and the Stage itself is highlighted, the Visa Stage
 * included; only a granted visa makes every step `done`, filled dark green.
 */
type StepState = "past" | "now" | "next" | "done";

const STATE_CLASSES: Record<StepState, string> = {
  past: "bg-[color-mix(in_srgb,var(--accent)_35%,var(--paper))]",
  now: "bg-accent text-accent-ink",
  next: "bg-fill-2",
  done: "bg-accent text-accent-ink",
};

type ArrowStepsProps = {
  stage: Stage;
  /** The journey is finished (a granted Visa): every step is filled. */
  isDone?: boolean;
};

function stepState(index: number, at: number, isDone: boolean): StepState {
  if (isDone) return "done";
  if (at < 0 || index > at) return "next";
  return index === at ? "now" : "past";
}

/**
 * A Student's progress as arrow steps from Lead to Visa, naming the current Stage. A granted visa
 * fills every step.
 */
export function ArrowSteps({ stage, isDone = false }: ArrowStepsProps) {
  const at = JOURNEY_STAGES.findIndex((step) => step === stage);
  const stateOf = (index: number): StepState => stepState(index, at, isDone);

  return (
    <ol aria-label={LABELS.stageIs(STAGE_LABELS[stage])} className="grid grid-cols-5 gap-0.75">
      {JOURNEY_STAGES.map((step, index) => (
        <li
          key={step}
          data-state={stateOf(index)}
          title={STAGE_LABELS[step]}
          className={clsx(
            "text-tiny grid h-7.5 place-items-center overflow-hidden font-semibold whitespace-nowrap",
            index === 0 ? "clip-chevron-first rounded-l-chip" : "clip-chevron",
            STATE_CLASSES[stateOf(index)],
          )}
        >
          <span className="tablet:inline hidden">{index === at ? STAGE_LABELS[step] : ""}</span>
        </li>
      ))}
    </ol>
  );
}
