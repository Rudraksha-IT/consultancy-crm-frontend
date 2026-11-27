import clsx from "clsx";

import { JOURNEY_STAGES, STAGE_LABELS, Stage } from "@/constants/stages";

type StepState = "on" | "off";

/** The thread's shades, Lead to Visa (ticket 21); a Stage not reached is a hollow ring. */
const BEAD_CLASSES = ["bg-bead-1", "bg-bead-2", "bg-bead-3", "bg-bead-4", "bg-bead-5"] as const;
const HOLLOW_CLASSES = "border-rule-2 border";

const NAME_CLASSES: Partial<Record<Stage, string>> = {
  [Stage.Lost]: "text-bad",
};

type StageMeterProps = {
  stage: Stage;
};

/**
 * A compact Stage for lists: five small beads filled up to the Stage, each in its shade of the
 * thread, and its name. The beads are decoration; the name says it in words. On a phone only the
 * name is shown (owner, 2026-11-27).
 */
export function StageMeter({ stage }: StageMeterProps) {
  const at = JOURNEY_STAGES.findIndex((step) => step === stage);
  const stateOf = (index: number): StepState => (at >= 0 && index <= at ? "on" : "off");

  return (
    // Never wider than its cell: in a narrow one the name is cut with "…" and the beads stay.
    <span className="inline-flex max-w-full items-center gap-3 whitespace-nowrap">
      <span
        aria-hidden="true"
        className="max-phone:hidden inline-flex flex-none items-center gap-0.75"
      >
        {JOURNEY_STAGES.map((step, index) => (
          <i
            key={step}
            data-step={stateOf(index)}
            className={clsx(
              "rounded-pill block size-2",
              stateOf(index) === "on" ? BEAD_CLASSES[index] : HOLLOW_CLASSES,
            )}
          />
        ))}
      </span>
      <span className={clsx("min-w-0 truncate font-medium", NAME_CLASSES[stage])}>
        {STAGE_LABELS[stage]}
      </span>
    </span>
  );
}
