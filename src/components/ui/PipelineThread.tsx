import Link from "next/link";

import { LABELS } from "@/constants/messages";
import { JOURNEY_STAGES, STAGE_LABELS, type Stage } from "@/constants/stages";
import { shareOf } from "@/lib/charts";

type PipelineThreadProps = {
  counts: Record<Stage, number>;
  /** Where each bead goes: the Student list filtered to that Stage. */
  hrefFor: (stage: Stage) => string;
};

/**
 * The office's Students on one thread (UI revamp 07; drawn in globals.css, "Home's Pipeline"):
 * five beads, Lead to Visa, each with its Stage, how many are there and their share of everyone
 * in progress. Each opens the Students at that Stage. Lost is not on the thread. Use inside a
 * `Panel`.
 */
export function PipelineThread({ counts, hrefFor }: PipelineThreadProps) {
  const inProgress = JOURNEY_STAGES.reduce((total, stage) => total + counts[stage], 0);
  return (
    <ol data-pipe-thread="" aria-label={LABELS.studentsAtEachStage}>
      {JOURNEY_STAGES.map((stage, index) => (
        <li key={stage} data-bead={index + 1}>
          <Link
            href={hrefFor(stage)}
            aria-label={LABELS.stageCount(STAGE_LABELS[stage], counts[stage])}
          >
            <span data-pipe-bead="" aria-hidden="true" />
            <span data-pipe-name="">{STAGE_LABELS[stage]}</span>
            <b data-pipe-count="">{counts[stage]}</b>
            <small data-pipe-share="">{LABELS.shareOf(shareOf(counts[stage], inProgress))}</small>
          </Link>
        </li>
      ))}
    </ol>
  );
}
