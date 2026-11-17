import type { Dates } from "@/components/features/shell/dateDisplay";
import type { ProgressChange } from "@/lib/api";

import { changeTitle, dayHeading } from "./changeText";

const DATES: Dates = {
  display: "AD",
  date: (iso) => `day ${iso}`,
  dateTime: (moment) => `moment ${moment}`,
  moneyDate: (iso) => ({ date: iso, beside: null }),
  otherCalendar: () => null,
};

function change(
  kind: ProgressChange["kind"],
  fields: Partial<ProgressChange> = {},
): ProgressChange {
  return {
    kind,
    at: "2026-11-04T09:15:00+00:00",
    before: "",
    after: "",
    detail: "",
    student: null,
    ...fields,
  };
}

describe("changeTitle", () => {
  it("says what a new visitor's Visit was", () => {
    expect(
      changeTitle(change("visit_logged", { before: "new", after: "First visit" }), DATES),
    ).toBe("Registered a new visitor: First visit");
  });

  it("says what a follow-up Visit was for", () => {
    expect(
      changeTitle(
        change("visit_logged", { before: "follow_up", after: "Bringing documents" }),
        DATES,
      ),
    ).toBe("Recorded a visit: Bringing documents");
  });

  it("names the University and Course of an Application made", () => {
    expect(
      changeTitle(
        change("application_made", { after: "Deakin University", detail: "Master of IT" }),
        DATES,
      ),
    ).toBe("Application made: Deakin University, Master of IT");
  });

  it("names the University of a Visa applied for", () => {
    expect(changeTitle(change("visa_applied_for", { after: "Monash University" }), DATES)).toBe(
      "Visa applied for: Monash University",
    );
  });

  it("names the class and how many Students were marked", () => {
    expect(
      changeTitle(change("attendance_marked", { after: "PTE Day", detail: "12" }), DATES),
    ).toBe("Marked attendance: PTE Day (12 Students)");
    expect(changeTitle(change("attendance_marked", { after: "PTE Day", detail: "1" }), DATES)).toBe(
      "Marked attendance: PTE Day (1 Student)",
    );
  });

  it("says History changes the way the Student's Activity does", () => {
    expect(
      changeTitle(change("stage_changed", { before: "lead", after: "counselling" }), DATES),
    ).toBe("Stage: Lead → Counselling");
    expect(changeTitle(change("task_done", { after: "Call Sita" }), DATES)).toBe(
      "Task done: Call Sita",
    );
  });
});

describe("dayHeading", () => {
  it("gives the short weekday and the office's date", () => {
    // 15 Nov 2026 is a Sunday.
    expect(dayHeading("2026-11-15", DATES)).toBe("Sun, day 2026-11-15");
  });
});
