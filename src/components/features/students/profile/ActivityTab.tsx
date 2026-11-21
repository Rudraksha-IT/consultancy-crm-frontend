"use client";

import type { RecordId } from "@/lib/recordId";
import { useEffect, useMemo, useState } from "react";

import { useDates, type Dates } from "@/components/features/shell/dateDisplay";
import { useCurrentStaff } from "@/components/features/shell/useCurrentStaff";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Panel } from "@/components/ui/Panel";
import { Section } from "@/components/ui/Section";
import {
  Timeline,
  type TimelineEntry,
  type TimelineItem,
  type TimelineStage,
} from "@/components/ui/Timeline";
import { CHANNEL_LABELS, COMMUNICATION_TEXT } from "@/constants/communication";
import { LABELS, MESSAGES } from "@/constants/messages";
import { Module } from "@/constants/modules";
import { HistoryKind } from "@/constants/students";
import { VisitKind, VISIT_TEXT } from "@/constants/visits";
import {
  fetchStudentHistory,
  fetchStudentMessages,
  fetchStudentVisits,
  type HistoryEntry,
  type Message,
  type Visit,
} from "@/lib/api";
import { localDayIso } from "@/lib/dates";
import {
  buildTimeline,
  durationText,
  mergeActivity,
  sourcesToLoadNext,
  type ActivitySource,
  type MergedActivity,
  type StageRow,
  type StageTone,
  type TimelineRow,
} from "@/lib/students";

import { describeHistoryEntry, stageLabel } from "./historyDescriptions";

/** One thing on a Student's Activity: a change (History), a Visit or a message. */
type ActivityEntry =
  | { key: string; at: string; source: "history"; entry: HistoryEntry }
  | { key: string; at: string; source: "visit"; visit: Visit }
  | { key: string; at: string; source: "message"; message: Message };

type Source = ActivitySource<ActivityEntry>;
type LoadPage = (page: number) => Promise<Source>;

type ActivityState =
  { status: "loading" } | { status: "loaded"; sources: Source[] } | { status: "failed" };

type ActivityTabProps = {
  studentId: RecordId;
  /** When the Student was added: when they became a Lead. */
  createdAt: string;
  /** Every Stage change, from the profile, so the time in each Stage is known from the start. */
  stageChanges: readonly HistoryEntry[];
};

/** Where the Student's Stages come from, for working out the timeline. */
type StageStory = Pick<ActivityTabProps, "createdAt" | "stageChanges">;

/**
 * Everything that happened with the Student, newest first, in one timeline (spec 23c, 45, 91,
 * 123): each Stage change a big dot with the time spent between them, and along the line their
 * Visits, the messages sent to them while the Communication Module is on, and the rest of History.
 */
export function ActivityTab({ studentId, createdAt, stageChanges }: ActivityTabProps) {
  const { modules } = useCurrentStaff();
  const withMessages = modules.includes(Module.Communication);
  const loaders = useMemo(() => loadersFor(studentId, withMessages), [studentId, withMessages]);
  const [state, setState] = useState<ActivityState>({ status: "loading" });
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    Promise.all(loaders.map((load) => load(1))).then(
      (sources) => {
        if (!isCancelled) setState({ status: "loaded", sources });
      },
      () => {
        if (!isCancelled) setState({ status: "failed" });
      },
    );
    return () => {
      isCancelled = true;
    };
  }, [loaders]);

  async function loadOlder(sources: Source[]): Promise<void> {
    setIsLoadingMore(true);
    try {
      const next = [...sources];
      await Promise.all(
        sourcesToLoadNext(sources).map(async (index) => {
          const current = sources[index];
          const load = loaders[index];
          if (current === undefined || load === undefined) return;
          const older = await load(current.page + 1);
          next[index] = { ...older, items: [...current.items, ...older.items] };
        }),
      );
      setState({ status: "loaded", sources: next });
    } catch {
      setState({ status: "failed" });
    }
    setIsLoadingMore(false);
  }

  return (
    <Section
      title={LABELS.activity}
      aside={
        <span>{withMessages ? MESSAGES.activityAsideWithMessages : MESSAGES.activityAside}</span>
      }
    >
      <Panel>
        <ActivityContent
          story={{ createdAt, stageChanges }}
          state={state}
          isLoadingMore={isLoadingMore}
          onLoadOlder={(sources) => void loadOlder(sources)}
        />
      </Panel>
    </Section>
  );
}

function loadersFor(studentId: RecordId, withMessages: boolean): LoadPage[] {
  const history: LoadPage = async (page) => {
    const found = await fetchStudentHistory(studentId, page);
    return {
      count: found.count,
      page: found.page,
      items: found.entries.map((entry) => ({
        key: `history-${entry.id}`,
        at: entry.at,
        source: "history",
        entry,
      })),
    };
  };
  const visits: LoadPage = async (page) => {
    const found = await fetchStudentVisits(studentId, page);
    return {
      count: found.count,
      page: found.page,
      items: found.visits.map((visit) => ({
        key: `visit-${visit.id}`,
        at: visit.at,
        source: "visit",
        visit,
      })),
    };
  };
  const messages: LoadPage = async (page) => {
    const found = await fetchStudentMessages(studentId, page);
    return {
      count: found.count,
      page: found.page,
      items: found.rows.map((message) => ({
        key: `message-${message.id}`,
        at: message.sentAt,
        source: "message",
        message,
      })),
    };
  };
  return withMessages ? [visits, messages, history] : [visits, history];
}

type ActivityContentProps = {
  story: StageStory;
  state: ActivityState;
  isLoadingMore: boolean;
  onLoadOlder: (sources: Source[]) => void;
};

function ActivityContent({ story, state, isLoadingMore, onLoadOlder }: ActivityContentProps) {
  const dates = useDates();
  if (state.status === "loading") return <p className="text-ink-2 p-6">{MESSAGES.loading}</p>;
  if (state.status === "failed") {
    return (
      <div className="p-6">
        <Banner tone="problem">{MESSAGES.activityFailed}</Banner>
      </div>
    );
  }
  const merged = mergeActivity(state.sources);
  const now = new Date().toISOString();
  const rows = timelineRows(story, merged, now);
  return (
    <>
      <p className="text-ink-2 flex items-center gap-2.5 px-6 pt-4.5">
        <Icon name="clock" size="sm" />
        <span>
          <b className="text-ink">{durationText(story.createdAt, now)}</b>{" "}
          {LABELS.sinceTheyBecameALead}
        </span>
      </p>
      <Timeline
        label={LABELS.activity}
        items={rows.map((row) => toTimelineEntry(row, story.createdAt, dates))}
      />
      {merged.hasOlder && (
        <div className="border-rule border-t px-6 py-4">
          <Button
            isLoading={isLoadingMore}
            loadingLabel={MESSAGES.loading}
            onClick={() => {
              onLoadOlder(state.sources);
            }}
          >
            {LABELS.showOlder}
          </Button>
        </div>
      )}
    </>
  );
}

/** The timeline from what is loaded so far; older Stage dots wait for older entries. */
function timelineRows(
  story: StageStory,
  merged: MergedActivity<ActivityEntry>,
  now: string,
): TimelineRow<ActivityEntry>[] {
  // Stage changes are the big dots, taken from the profile; History lists them too.
  const items = merged.items.filter(
    (item) => item.source !== "history" || item.entry.kind !== HistoryKind.StageChanged,
  );
  const oldestShown = merged.items.at(-1)?.at ?? null;
  return buildTimeline({
    createdAt: story.createdAt,
    changes: story.stageChanges,
    items,
    now,
    shownFrom: merged.hasOlder ? oldestShown : null,
  });
}

function toTimelineEntry(
  row: TimelineRow<ActivityEntry>,
  createdAt: string,
  dates: Dates,
): TimelineEntry {
  if (row.type === "item") return toTimelineItem(row.item, dates);
  if (row.type === "stage") return stageEntry(row, createdAt, dates);
  const stage = stageLabel(row.stage);
  return {
    kind: "gap",
    id: row.key,
    isCurrent: row.isCurrent,
    text: row.isCurrent
      ? LABELS.inStageSoFar(stage, row.duration)
      : LABELS.timeInStage(capitalised(row.duration), stage),
  };
}

/** A big dot: a Stage change with who, when and why, or the day they became a Lead. */
function stageEntry(row: StageRow, createdAt: string, dates: Dates): TimelineStage {
  const { change } = row;
  if (change === null) {
    const day = localDayIso(createdAt) ?? createdAt;
    return {
      kind: "stage",
      id: row.key,
      tone: "plain",
      title: LABELS.becameALead,
      meta: dates.date(day),
    };
  }
  const who = change.by.isPlatformAdmin ? LABELS.byPlatformAdmin(change.by.name) : change.by.name;
  return {
    kind: "stage",
    id: row.key,
    tone: row.tone,
    move: { from: stageLabel(change.before), to: stageLabel(change.after) },
    meta: LABELS.byWhen(who, dates.dateTime(change.at)),
    isHighlighted: change.by.isPlatformAdmin,
    ...TONE_TAGS[row.tone],
    ...(change.detail !== "" && { reason: change.detail }),
  };
}

/** The word that goes with Lost's and Came back's colour, so colour never stands alone. */
const TONE_TAGS: Record<StageTone, { tag?: string }> = {
  plain: {},
  lost: { tag: LABELS.markedLost },
  back: { tag: LABELS.cameBack },
};

/** "12 days" at the start of a line reads "12 days"; "less than an hour" becomes "Less than...". */
function capitalised(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function toTimelineItem(item: ActivityEntry, dates: Dates): TimelineItem {
  if (item.source === "visit") return visitItem(item.key, item.visit, dates);
  if (item.source === "message") return messageItem(item.key, item.message, dates);
  return historyItem(item.key, item.entry, dates);
}

function visitItem(key: string, visit: Visit, dates: Dates): TimelineItem {
  return {
    id: key,
    title:
      visit.kind === VisitKind.New
        ? VISIT_TEXT.firstVisit(visit.purpose)
        : VISIT_TEXT.visitedTheOffice(visit.purpose),
    meta: LABELS.byWhen(visit.recordedBy.name, dates.dateTime(visit.at)),
    isContact: true,
  };
}

/** An email by its subject line; a past SMS (sent before there was only email) by its words. */
function messageItem(key: string, message: Message, dates: Dates): TimelineItem {
  const isEmail = message.channel === "email";
  const kind = isEmail ? CHANNEL_LABELS.email : COMMUNICATION_TEXT.pastSms;
  const words = isEmail ? message.subject : message.body;
  return {
    id: key,
    title:
      message.status === "sent"
        ? LABELS.messageSent(kind, words)
        : LABELS.messageFailed(kind, words),
    meta: LABELS.byWhen(message.sentBy.name, dates.dateTime(message.sentAt)),
    ...attachedNames(message),
    ...(message.error !== "" && { problem: message.error }),
    isContact: true,
  };
}

/** "Attached: brochure.pdf, passport.pdf" under an email that carried files (ticket 12). */
function attachedNames(message: Message): { detail?: string } {
  if (message.attachments.length === 0) return {};
  return { detail: COMMUNICATION_TEXT.attachmentsOf(message.attachments.join(", ")) };
}

function historyItem(key: string, entry: HistoryEntry, dates: Dates): TimelineItem {
  const who = entry.by.isPlatformAdmin ? LABELS.byPlatformAdmin(entry.by.name) : entry.by.name;
  return {
    id: key,
    meta: LABELS.byWhen(who, dates.dateTime(entry.at)),
    isHighlighted: entry.by.isPlatformAdmin,
    ...describeHistoryEntry(entry, dates),
  };
}
