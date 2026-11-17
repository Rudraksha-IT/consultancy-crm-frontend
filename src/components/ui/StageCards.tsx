import Link from "next/link";

import { LABELS } from "@/constants/messages";
import { JOURNEY_STAGES, STAGE_LABELS, Stage } from "@/constants/stages";
import { shareOf } from "@/lib/charts";

// The top edge deepens along the journey: 15% to 100% accent.
const DEPTH_CLASSES = [
  "border-t-[color-mix(in_srgb,var(--accent)_29%,var(--paper))]",
  "border-t-[color-mix(in_srgb,var(--accent)_43%,var(--paper))]",
  "border-t-[color-mix(in_srgb,var(--accent)_57%,var(--paper))]",
  "border-t-[color-mix(in_srgb,var(--accent)_72%,var(--paper))]",
  "border-t-[color-mix(in_srgb,var(--accent)_86%,var(--paper))]",
  "border-t-accent",
] as const;

type StageCardsProps = {
  counts: Record<Stage, number>;
  /** Where each card goes: the Student list filtered to that Stage. */
  hrefFor: (stage: Stage) => string;
};

/** The pipeline: a card per Stage with its count and share, and the Lost count apart. */
export function StageCards({ counts, hrefFor }: StageCardsProps) {
  const inProgress = JOURNEY_STAGES.reduce((total, stage) => total + counts[stage], 0);
  return (
    <div className="rounded-panel border-rule bg-paper shadow-raise overflow-hidden border">
      <ol
        aria-label={LABELS.studentsAtEachStage}
        className="tablet:grid-cols-3 wide:grid-cols-6 grid grid-cols-2 gap-3 p-4"
      >
        {JOURNEY_STAGES.map((stage, index) => (
          <li key={stage}>
            <Link
              href={hrefFor(stage)}
              aria-label={LABELS.stageCount(STAGE_LABELS[stage], counts[stage])}
              className={`rounded-control bg-fill text-secondary text-ink-2 hover:bg-tint grid gap-1 border-t-5 p-4 font-semibold no-underline ${DEPTH_CLASSES[index] ?? ""}`}
            >
              <span>{STAGE_LABELS[stage]}</span>
              <b className="text-page-title text-ink">{counts[stage]}</b>
              <small className="text-small text-ink-3 max-phone:hidden font-normal">
                {LABELS.shareOfStudents(shareOf(counts[stage], inProgress))}
              </small>
            </Link>
          </li>
        ))}
      </ol>
      <div className="border-rule bg-fill text-secondary text-ink-2 flex items-center justify-between gap-4 border-t px-6 py-1">
        <span>{LABELS.inProgress(inProgress)}</span>
        <Link
          href={hrefFor(Stage.Lost)}
          className="text-ink-2 min-h-control inline-flex items-center"
        >
          {LABELS.lostCount(counts.lost)}
        </Link>
      </div>
    </div>
  );
}
