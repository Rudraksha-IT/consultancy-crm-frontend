import clsx from "clsx";

import { JOURNEY_STAGES, STAGE_LABELS, Stage } from "@/constants/stages";

type StepState = "on" | "off";

const STEP_CLASSES: Record<StepState, string> = {
  on: "bg-accent",
  off: "bg-fill-2",
};

const NAME_CLASSES: Partial<Record<Stage, string>> = {
  [Stage.Lost]: "text-bad",
};

type StageMeterProps = {
  stage: Stage;
};

/**
 * A compact Stage for lists: five small steps filled up to the Stage, and its name. The steps are
 * decoration; the name says it in words. On a phone only the name shows.
 */
export function StageMeter({ stage }: StageMeterProps) {
  const at = JOURNEY_STAGES.findIndex((step) => step === stage);
  const stateOf = (index: number): StepState => (at >= 0 && index <= at ? "on" : "off");

  return (
    <span className="inline-flex items-center gap-3 whitespace-nowrap">
      <span aria-hidden="true" className="max-phone:hidden inline-grid grid-cols-5 gap-0.75">
        {JOURNEY_STAGES.map((step, index) => (
          <i
            key={step}
            data-step={stateOf(index)}
            className={clsx("rounded-pill block h-2 w-3", STEP_CLASSES[stateOf(index)])}
          />
        ))}
      </span>
      <span className={clsx("font-medium", NAME_CLASSES[stage])}>{STAGE_LABELS[stage]}</span>
    </span>
  );
}
