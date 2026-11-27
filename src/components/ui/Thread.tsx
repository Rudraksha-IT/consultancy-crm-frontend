import { LABELS } from "@/constants/messages";
import { JOURNEY_STAGES, STAGE_LABELS, type Stage } from "@/constants/stages";

/** A bead reached, the current one, or one still to come. */
type BeadState = "past" | "now" | "next";

type ThreadProps = {
  stage: Stage;
  /** The journey is finished (a granted Visa): every bead is filled. */
  isDone?: boolean;
};

function beadState(index: number, at: number): BeadState {
  if (at < 0 || index > at) return "next";
  return index === at ? "now" : "past";
}

/**
 * A Student's journey as five beads on a string, Lead to Visa, each a shade deeper (ticket 21;
 * drawn in globals.css, "The thread"). The Stage's name is always written beside the beads, so the
 * colour never stands alone; screen readers hear "Stage: Offer" once, from the list. A Lost
 * Student has no bead marked.
 */
export function Thread({ stage, isDone = false }: ThreadProps) {
  const at = isDone ? JOURNEY_STAGES.length : JOURNEY_STAGES.findIndex((step) => step === stage);

  return (
    <span className="max-phone:grid-cols-[6rem_minmax(0,1fr)] max-phone:gap-2.5 grid min-w-0 grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-3">
      <b aria-hidden="true" className="text-secondary text-ink whitespace-nowrap">
        {STAGE_LABELS[stage]}
      </b>
      <ol data-thread="" aria-label={LABELS.stageIs(STAGE_LABELS[stage])}>
        {JOURNEY_STAGES.map((step, index) => (
          <li
            key={step}
            data-bead={index + 1}
            data-state={beadState(index, at)}
            title={STAGE_LABELS[step]}
          />
        ))}
      </ol>
    </span>
  );
}
