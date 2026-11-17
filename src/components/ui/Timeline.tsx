import clsx from "clsx";
import type { ReactNode } from "react";

import { LABELS } from "@/constants/messages";

/** One event on the line: a change, a Visit, a message. Small dot. */
export type TimelineItem = {
  kind?: "event";
  id: string;
  title: string;
  /** Who and when, e.g. "Bikash Thapa, 22 Oct 2026, 13:48". */
  meta: string;
  /** The text before the change, e.g. a Note's old text; left out when there's none to show. */
  before?: string;
  /** More about the change, e.g. why a Student was marked Lost; shown as it is. */
  detail?: string;
  /** What went wrong, shown in the problem colour, e.g. why a message failed. */
  problem?: string;
  /** Marked in the warning colour, e.g. a change a Platform Admin made. */
  isHighlighted?: boolean;
  /** A ring in the accent colour, for contact rather than a change (a Visit or a message). */
  isContact?: boolean;
};

/** Lost and Came back get a mild red or green, always with their word in `tag`. */
export type TimelineTone = "plain" | "lost" | "back";

/** A Stage change: a big dot with the Stages in bold, and the reason underneath. */
export type TimelineStage = {
  kind: "stage";
  id: string;
  tone: TimelineTone;
  /** Who and when. */
  meta: string;
  /** The word that goes with the colour, e.g. "Marked Lost". */
  tag?: string;
  reason?: string;
  isHighlighted?: boolean;
} & ({ move: { from: string; to: string } } | { title: string });

/** The line between two Stage dots, saying how long they spent there. */
export type TimelineGap = { kind: "gap"; id: string; text: string; isCurrent: boolean };

export type TimelineEntry = TimelineItem | TimelineStage | TimelineGap;

type TimelineProps = {
  label: string;
  items: readonly TimelineEntry[];
};

/** The line down the left, cut short above the first dot and below the last. */
const LINE =
  "relative grid gap-1 before:absolute before:top-0 before:bottom-0 first:before:top-5.5 last:before:bottom-auto last:before:h-5.5";

const TONE_CLASSES: Record<TimelineTone, string> = {
  plain: "after:border-accent",
  lost: "rounded-control bg-bad/7 after:border-bad",
  back: "rounded-control bg-good/8 after:border-good",
};

const TAG_CLASSES: Record<TimelineTone, string> = {
  plain: "text-ink-2",
  lost: "text-bad",
  back: "text-good",
};

/** Events down a line, newest first, such as a Student's Activity. */
export function Timeline({ label, items }: TimelineProps) {
  return (
    <ul aria-label={label} className="px-6 py-3">
      {items.map((item) => {
        if (item.kind === "gap") return <GapRow key={item.id} gap={item} />;
        if (item.kind === "stage") return <StageRow key={item.id} stage={item} />;
        return <EventRow key={item.id} item={item} />;
      })}
    </ul>
  );
}

function EventRow({ item }: { item: TimelineItem }) {
  return (
    <li
      data-kind="event"
      data-highlighted={item.isHighlighted === true}
      data-contact={item.isContact === true}
      className={clsx(
        LINE,
        "before:bg-rule before:left-1.5 before:w-0.5",
        "after:border-rule-2 after:bg-paper data-[contact=true]:after:border-accent data-[highlighted=true]:after:border-warn data-[highlighted=true]:after:bg-warn py-3.5 pl-8 after:absolute after:top-5 after:left-0 after:size-3.5 after:rounded-full after:border-3",
      )}
    >
      <span className="break-words">{item.title}</span>
      {item.problem !== undefined && (
        <span className="text-secondary text-bad">{item.problem}</span>
      )}
      <span className="text-small text-ink-3">{item.meta}</span>
      {item.before !== undefined && (
        <TextBox>{LABELS.before(item.before === "" ? LABELS.emptyText : item.before)}</TextBox>
      )}
      {item.detail !== undefined && <TextBox>{item.detail}</TextBox>}
    </li>
  );
}

function StageRow({ stage }: { stage: TimelineStage }) {
  return (
    <li
      data-kind="stage"
      data-tone={stage.tone}
      data-highlighted={stage.isHighlighted === true}
      className={clsx(
        LINE,
        "before:bg-rule before:left-1.5 before:w-0.5",
        "after:bg-paper py-3.5 pr-3 pl-10 after:absolute after:top-3.5 after:-left-0.75 after:size-5 after:rounded-full after:border-4",
        TONE_CLASSES[stage.tone],
        "data-[highlighted=true]:after:border-warn",
      )}
    >
      <span className="text-ink break-words">
        <b>
          {"move" in stage ? (
            <>
              {stage.move.from} <span aria-hidden="true">→</span>
              <span className="sr-only"> to </span> {stage.move.to}
            </>
          ) : (
            stage.title
          )}
        </b>
        {stage.tag !== undefined && (
          <span
            className={clsx(
              "rounded-pill bg-fill text-small ml-1.5 inline-block px-2 font-semibold",
              TAG_CLASSES[stage.tone],
            )}
          >
            {stage.tag}
          </span>
        )}
      </span>
      {stage.reason !== undefined && (
        <span className="text-ink-2 break-words whitespace-pre-wrap">{stage.reason}</span>
      )}
      <span className="text-small text-ink-3">{stage.meta}</span>
    </li>
  );
}

function GapRow({ gap }: { gap: TimelineGap }) {
  return (
    <li
      data-kind="gap"
      data-current={gap.isCurrent}
      className={clsx(LINE, "before:bg-fill-2 py-1.5 pl-8 before:left-1.25 before:w-1")}
    >
      <span
        className={clsx("text-small font-semibold", gap.isCurrent ? "text-accent" : "text-ink-3")}
      >
        {gap.text}
      </span>
    </li>
  );
}

function TextBox({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-control bg-fill text-secondary text-ink-2 mt-1.5 max-w-prose px-3.5 py-2.5 whitespace-pre-wrap">
      {children}
    </div>
  );
}
