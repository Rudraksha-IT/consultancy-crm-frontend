import { describe, expect, it } from "vitest";

import {
  DEFAULT_TIME_SLOT,
  endTimesAfter,
  formatTime,
  formatTimeSlot,
  keepEndAfterStart,
  parseTimeSlot,
  START_TIMES,
} from "./timeSlot";

describe("formatTime", () => {
  it("writes minutes after midnight as a 12-hour time", () => {
    expect(formatTime(360)).toBe("6:00 AM");
    expect(formatTime(690)).toBe("11:30 AM");
    expect(formatTime(720)).toBe("12:00 PM");
    expect(formatTime(1260)).toBe("9:00 PM");
  });
});

describe("formatTimeSlot", () => {
  it("names AM or PM once when both ends share it", () => {
    expect(formatTimeSlot({ from: 420, to: 510 })).toBe("7:00-8:30 AM");
    expect(formatTimeSlot({ from: 1050, to: 1140 })).toBe("5:30-7:00 PM");
  });

  it("names both when the class runs across noon", () => {
    expect(formatTimeSlot({ from: 690, to: 780 })).toBe("11:30 AM-1:00 PM");
  });
});

describe("parseTimeSlot", () => {
  it("reads back what formatTimeSlot writes", () => {
    for (const slot of [
      { from: 420, to: 510 },
      { from: 690, to: 780 },
      { from: 1050, to: 1140 },
    ]) {
      expect(parseTimeSlot(formatTimeSlot(slot))).toEqual(slot);
    }
  });

  it("reads typed slots with spaces and small letters", () => {
    expect(parseTimeSlot(" 7:00 am - 8:30 am ")).toEqual({ from: 420, to: 510 });
  });

  it("refuses text that isn't a slot on the list", () => {
    expect(parseTimeSlot("Mornings")).toBeUndefined();
    expect(parseTimeSlot("7:15-8:30 AM")).toBeUndefined();
    expect(parseTimeSlot("8:30-7:00 AM")).toBeUndefined();
    expect(parseTimeSlot("13:00-14:00 PM")).toBeUndefined();
    expect(parseTimeSlot("<script>-</script>")).toBeUndefined();
  });
});

describe("the choices", () => {
  it("start every half hour from 6:00 AM, leaving room to end by 9:00 PM", () => {
    expect(START_TIMES[0]).toBe(360);
    expect(START_TIMES.at(-1)).toBe(1230);
  });

  it("end only after the start", () => {
    expect(endTimesAfter(1200)).toEqual([1230, 1260]);
  });

  it("move the end on when the start passes it, keeping a 90-minute class", () => {
    expect(keepEndAfterStart({ from: 600, to: 510 })).toEqual({ from: 600, to: 690 });
    expect(keepEndAfterStart({ from: 1230, to: 510 })).toEqual({ from: 1230, to: 1260 });
    expect(keepEndAfterStart({ from: 420, to: 510 })).toEqual({ from: 420, to: 510 });
  });

  it("suggest 7:00-8:30 AM for a new class", () => {
    expect(formatTimeSlot(DEFAULT_TIME_SLOT)).toBe("7:00-8:30 AM");
  });
});
