/**
 * A Student's Activity as a timeline (spec 123, issue 82): every Stage change is a big dot, the
 * line between two dots says how long they spent in that Stage, and every other entry sits inside
 * the Stage it happened in. Newest at the top. Worked out from History; nothing is stored twice,
 * and time in Lost counts like any other Stage.
 */

import { Stage } from "@/constants/stages";
import type { HistoryEntry } from "@/lib/api";

import type { Dated } from "./activity";
import { durationText } from "./durations";

/** How a Stage dot is marked: Lost and Came back (Lost → Counselling) get their own colour. */
export type StageTone = "plain" | "lost" | "back";

/** The line below a newer dot: how long they were in `stage`, or have been so far. */
export type GapRow = {
  type: "gap";
  key: string;
  stage: string;
  duration: string;
  isCurrent: boolean;
};

/** A Stage change, or (with no change) the day they became a Lead. */
export type StageRow = {
  type: "stage";
  key: string;
  at: string;
  change: HistoryEntry | null;
  tone: StageTone;
};

/** Anything else: a Visit, a message, a Note edit, a Payment... */
export type ItemRow<Item extends Dated> = { type: "item"; key: string; item: Item };

export type TimelineRow<Item extends Dated> = GapRow | StageRow | ItemRow<Item>;

type TimelineInput<Item extends Dated> = {
  /** When the Student was added, which is when they became a Lead. */
  createdAt: string;
  /** Every Stage change of the Student, in any order. */
  changes: readonly HistoryEntry[];
  /** The other entries loaded so far, in any order. */
  items: readonly Item[];
  now: string;
  /** While older entries are still to load: the oldest moment shown. Older dots wait for them. */
  shownFrom?: string | null;
};

const LEAD: string = Stage.Lead;

/** One stretch in one Stage, from the change that began it until the next (or now). */
type Period = { start: string; end: string | null; stage: string; change: HistoryEntry | null };

/** The whole timeline, newest first. */
export function buildTimeline<Item extends Dated>({
  createdAt,
  changes,
  items,
  now,
  shownFrom = null,
}: TimelineInput<Item>): TimelineRow<Item>[] {
  const periods = periodsOf(createdAt, changes);
  const cutoff = shownFrom === null ? null : moment(shownFrom);
  return periods
    .map((period, index) => periodRows(period, index, { items, now, cutoff }))
    .reverse()
    .flat();
}

type PeriodContext<Item extends Dated> = {
  items: readonly Item[];
  now: string;
  cutoff: number | null;
};

/** One period, newest first: the line with its time, the entries inside it, then its dot. */
function periodRows<Item extends Dated>(
  period: Period,
  index: number,
  { items, now, cutoff }: PeriodContext<Item>,
): TimelineRow<Item>[] {
  if (endsBefore(period, cutoff)) return [];
  const inside = items
    .filter((one) => belongsTo(one, period, index === 0))
    .sort((a, b) => moment(b.at) - moment(a.at) || a.key.localeCompare(b.key))
    .map((one): ItemRow<Item> => ({ type: "item", key: one.key, item: one }));
  const showsDot = cutoff === null || moment(period.start) >= cutoff;
  return [gapRow(period, index, now), ...inside, ...(showsDot ? [dotRow(period, index)] : [])];
}

/** When they were Lost (with why) and when they came back, oldest first, for the ⓘ. */
export type LostMoment =
  { kind: "lost"; at: string; reason: string } | { kind: "back"; at: string };

export function lostStory(changes: readonly HistoryEntry[]): LostMoment[] {
  return oldestFirst(changes).flatMap((change): LostMoment[] => {
    if (change.after === Stage.Lost)
      return [{ kind: "lost", at: change.at, reason: change.detail }];
    if (change.before === Stage.Lost) return [{ kind: "back", at: change.at }];
    return [];
  });
}

function periodsOf(createdAt: string, changes: readonly HistoryEntry[]): Period[] {
  const ordered = oldestFirst(changes);
  const starts = [
    { start: createdAt, stage: LEAD, change: null },
    ...ordered.map((change) => ({ start: change.at, stage: change.after, change })),
  ];
  return starts.map((one, index) => ({ ...one, end: starts[index + 1]?.start ?? null }));
}

/** Over before the oldest moment shown, so nothing of it is shown yet. */
function endsBefore(period: Period, cutoff: number | null): boolean {
  return cutoff !== null && period.end !== null && moment(period.end) < cutoff;
}

/** Within [start, end); the oldest period also keeps anything from before it. */
function belongsTo(one: Dated, period: Period, isOldest: boolean): boolean {
  const at = moment(one.at);
  const afterStart = isOldest || at >= moment(period.start);
  return afterStart && (period.end === null || at < moment(period.end));
}

function gapRow(period: Period, index: number, now: string): GapRow {
  return {
    type: "gap",
    key: `stage-gap-${String(index)}`,
    stage: period.stage,
    duration: durationText(period.start, period.end ?? now),
    isCurrent: period.end === null,
  };
}

function dotRow(period: Period, index: number): StageRow {
  return {
    type: "stage",
    key: `stage-dot-${String(index)}`,
    at: period.start,
    change: period.change,
    tone: toneOf(period.change),
  };
}

function toneOf(change: HistoryEntry | null): StageTone {
  if (change?.after === Stage.Lost) return "lost";
  if (change?.before === Stage.Lost) return "back";
  return "plain";
}

/** Sorted by moment; changes at the same moment keep the order they came in. */
function oldestFirst(changes: readonly HistoryEntry[]): HistoryEntry[] {
  return [...changes].sort((a, b) => moment(a.at) - moment(b.at));
}

function moment(at: string): number {
  return Date.parse(at);
}
