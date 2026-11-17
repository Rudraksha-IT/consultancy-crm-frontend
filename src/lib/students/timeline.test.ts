import type { HistoryEntry } from "@/lib/api";

import { buildTimeline, lostStory, type TimelineRow } from "./timeline";

const CREATED = "2026-09-01T10:00:00+05:45";
const NOW = "2026-11-15T10:00:00+05:45";

let nextId = 1;

function change(at: string, before: string, after: string, detail = ""): HistoryEntry {
  nextId += 1;
  return {
    id: nextId,
    kind: "stage_changed",
    at,
    by: { name: "Bikash Thapa", isPlatformAdmin: false },
    before,
    after,
    detail,
  };
}

type Item = { key: string; at: string };

function item(key: string, at: string): Item {
  return { key, at };
}

/** A row as a short line, so a whole timeline reads at a glance. */
function line(row: TimelineRow<Item>): string {
  if (row.type === "gap") return `${row.isCurrent ? "now" : "gap"}: ${row.stage}, ${row.duration}`;
  if (row.type === "item") return `item: ${row.item.key}`;
  if (row.change === null) return "dot: became a Lead";
  return `dot: ${row.change.before} → ${row.change.after} (${row.tone})`;
}

const TO_COUNSELLING = change("2026-09-04T10:00:00+05:45", "lead", "counselling");
const TO_LOST = change("2026-09-16T10:00:00+05:45", "counselling", "lost", "Went quiet.");
const BACK = change("2026-10-07T10:00:00+05:45", "lost", "counselling");
const TO_APPLYING = change("2026-11-10T10:00:00+05:45", "counselling", "applying");

describe("buildTimeline", () => {
  it("is one Lead period, running until now, for a Student whose Stage never changed", () => {
    const rows = buildTimeline({ createdAt: CREATED, changes: [], items: [], now: NOW });

    expect(rows.map(line)).toEqual(["now: lead, 2 months 14 days", "dot: became a Lead"]);
  });

  it("puts the newest Stage at the top, with the time spent in each between the dots", () => {
    const rows = buildTimeline({
      createdAt: CREATED,
      changes: [TO_COUNSELLING, TO_LOST, BACK, TO_APPLYING],
      items: [],
      now: NOW,
    });

    expect(rows.map(line)).toEqual([
      "now: applying, 5 days",
      "dot: counselling → applying (plain)",
      "gap: counselling, 4 weeks",
      "dot: lost → counselling (back)",
      "gap: lost, 3 weeks",
      "dot: counselling → lost (lost)",
      "gap: counselling, 12 days",
      "dot: lead → counselling (plain)",
      "gap: lead, 3 days",
      "dot: became a Lead",
    ]);
  });

  it("keeps the order by time even when the changes come out of order", () => {
    const rows = buildTimeline({
      createdAt: CREATED,
      changes: [TO_APPLYING, TO_COUNSELLING],
      items: [],
      now: NOW,
    });

    expect(rows.filter((row) => row.type === "stage").map(line)).toEqual([
      "dot: counselling → applying (plain)",
      "dot: lead → counselling (plain)",
      "dot: became a Lead",
    ]);
  });

  it("places every other entry, newest first, inside the Stage it happened in", () => {
    const rows = buildTimeline({
      createdAt: CREATED,
      changes: [TO_COUNSELLING],
      items: [
        item("visit", "2026-09-01T10:00:00+05:45"),
        item("note", "2026-09-02T10:00:00+05:45"),
        item("payment", "2026-10-01T10:00:00+05:45"),
        item("email", "2026-11-01T10:00:00+05:45"),
      ],
      now: NOW,
    });

    expect(rows.map(line)).toEqual([
      "now: counselling, 2 months 11 days",
      "item: email",
      "item: payment",
      "dot: lead → counselling (plain)",
      "gap: lead, 3 days",
      "item: note",
      "item: visit",
      "dot: became a Lead",
    ]);
  });

  it("puts an entry made at the very moment of a change after it, in the new Stage", () => {
    const rows = buildTimeline({
      createdAt: CREATED,
      changes: [TO_COUNSELLING],
      items: [item("same moment", TO_COUNSELLING.at)],
      now: NOW,
    });

    expect(rows.map(line).slice(0, 3)).toEqual([
      "now: counselling, 2 months 11 days",
      "item: same moment",
      "dot: lead → counselling (plain)",
    ]);
  });

  it("keeps an entry older than the Student at the bottom, with becoming a Lead", () => {
    const rows = buildTimeline({
      createdAt: CREATED,
      changes: [],
      items: [item("imported", "2026-08-01T10:00:00+05:45")],
      now: NOW,
    });

    expect(rows.map(line)).toEqual([
      "now: lead, 2 months 14 days",
      "item: imported",
      "dot: became a Lead",
    ]);
  });

  it("leaves out the dots older than what is shown so far, keeping their time", () => {
    const rows = buildTimeline({
      createdAt: CREATED,
      changes: [TO_COUNSELLING, TO_LOST, BACK, TO_APPLYING],
      items: [item("call", "2026-10-20T10:00:00+05:45")],
      now: NOW,
      shownFrom: "2026-10-20T10:00:00+05:45",
    });

    expect(rows.map(line)).toEqual([
      "now: applying, 5 days",
      "dot: counselling → applying (plain)",
      "gap: counselling, 4 weeks",
      "item: call",
    ]);
  });

  it("never reads a change earlier than the Student was added as negative time", () => {
    const early = change("2026-08-30T10:00:00+05:45", "lead", "counselling");

    const rows = buildTimeline({ createdAt: CREATED, changes: [early], items: [], now: NOW });

    expect(rows.map(line)).toContain("gap: lead, less than an hour");
  });

  it("gives every row its own key", () => {
    const rows = buildTimeline({
      createdAt: CREATED,
      changes: [TO_COUNSELLING, TO_LOST, BACK],
      items: [item("visit-1", "2026-09-02T10:00:00+05:45")],
      now: NOW,
    });

    expect(new Set(rows.map((row) => row.key)).size).toBe(rows.length);
  });
});

describe("lostStory", () => {
  it("is empty for a Student who was never Lost", () => {
    expect(lostStory([TO_COUNSELLING, TO_APPLYING])).toEqual([]);
  });

  it("says when they were Lost, why, and when they came back, oldest first", () => {
    expect(lostStory([BACK, TO_COUNSELLING, TO_LOST])).toEqual([
      { kind: "lost", at: TO_LOST.at, reason: "Went quiet." },
      { kind: "back", at: BACK.at },
    ]);
  });

  it("counts a Student Lost now, who hasn't come back", () => {
    expect(lostStory([TO_COUNSELLING, TO_LOST])).toEqual([
      { kind: "lost", at: TO_LOST.at, reason: "Went quiet." },
    ]);
  });
});
