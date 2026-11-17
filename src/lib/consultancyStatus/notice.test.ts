import { describe, expect, it } from "vitest";

import { ConsultancyStatus, STATUS_TEXT } from "@/constants/consultancyStatus";

import { evaluationLastDay, formatShortDay, statusNotice } from "./notice";

const NOW = new Date(2026, 10, 4, 9, 0);
const PAST_DUE_MESSAGE =
  "Your office's account is past due, so you can look things up but not make changes. Ask your Admin to contact the CRM team.";

/** A moment `hours` from NOW, as the API writes it. */
function inHours(hours: number): string {
  return new Date(NOW.getTime() + hours * 3_600_000).toISOString();
}

/** Midnight at the start of a local day: how an extended evaluation ends (after its last day). */
function midnightBefore(year: number, month: number, day: number): string {
  return new Date(year, month - 1, day).toISOString();
}

describe("statusNotice", () => {
  it("says nothing for an Active office", () => {
    expect(
      statusNotice(
        { status: ConsultancyStatus.Active, statusMessage: null, evaluationEndsAt: null },
        NOW,
      ),
    ).toBeNull();
  });

  it.each([ConsultancyStatus.PastDue, ConsultancyStatus.Suspended])(
    "warns with the server's reason when the office is %s",
    (status) => {
      expect(
        statusNotice({ status, statusMessage: PAST_DUE_MESSAGE, evaluationEndsAt: null }, NOW),
      ).toEqual({ tone: "warning", message: PAST_DUE_MESSAGE, isReadOnly: true });
    },
  );

  it("still warns a read-only office when the server's reason is missing", () => {
    const notice = statusNotice(
      { status: ConsultancyStatus.Suspended, statusMessage: null, evaluationEndsAt: null },
      NOW,
    );

    expect(notice?.message).toMatch(/not make changes/);
  });

  it("says nothing while an evaluation has more than 3 days left", () => {
    expect(
      statusNotice(
        {
          status: ConsultancyStatus.Evaluation,
          statusMessage: null,
          evaluationEndsAt: inHours(3 * 24 + 1),
        },
        NOW,
      ),
    ).toBeNull();
  });

  it("warns, naming the last day, once an evaluation has 3 days or less left", () => {
    const notice = statusNotice(
      {
        status: ConsultancyStatus.Evaluation,
        statusMessage: null,
        evaluationEndsAt: midnightBefore(2026, 11, 7),
      },
      NOW,
    );

    expect(notice).toEqual({
      tone: "warning",
      message: STATUS_TEXT.evaluationEndsSoon("6 Nov"),
      isReadOnly: false,
    });
  });

  it("says when the evaluation ends today", () => {
    const notice = statusNotice(
      { status: ConsultancyStatus.Evaluation, statusMessage: null, evaluationEndsAt: inHours(5) },
      NOW,
    );

    expect(notice?.message).toBe(STATUS_TEXT.evaluationEndsToday);
  });

  it("shows the server's reason once an evaluation has ended", () => {
    const notice = statusNotice(
      {
        status: ConsultancyStatus.Evaluation,
        statusMessage: "Your office's trial has ended.",
        evaluationEndsAt: inHours(-1),
      },
      NOW,
    );

    expect(notice).toEqual({
      tone: "problem",
      message: "Your office's trial has ended.",
      isReadOnly: true,
    });
  });

  it("says nothing about an evaluation with a broken end", () => {
    expect(
      statusNotice(
        { status: ConsultancyStatus.Evaluation, statusMessage: null, evaluationEndsAt: "soon" },
        NOW,
      ),
    ).toBeNull();
  });
});

describe("evaluationLastDay", () => {
  it("is the day before when the evaluation ends at midnight", () => {
    expect(evaluationLastDay(midnightBefore(2026, 11, 13))).toBe("2026-11-12");
  });

  it("is the same day when it ends during the day", () => {
    expect(evaluationLastDay(new Date(2026, 10, 18, 9, 30).toISOString())).toBe("2026-11-18");
  });

  it("is null for something that isn't a moment", () => {
    expect(evaluationLastDay("<script>")).toBeNull();
  });
});

describe("formatShortDay", () => {
  it("leaves the year out in the current year", () => {
    expect(formatShortDay("2026-11-12", NOW)).toBe("12 Nov");
  });

  it("writes the year for another year", () => {
    expect(formatShortDay("2027-01-03", NOW)).toBe("3 Jan 2027");
  });

  it("writes a dash for something that isn't a date", () => {
    expect(formatShortDay("12/11/2026", NOW)).toBe("—");
  });
});
