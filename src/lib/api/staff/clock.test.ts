import { uid } from "@/test/ids";
import {
  addHoliday,
  addMissedTime,
  ClockRefusedError,
  clockIn,
  clockOut,
  fetchClockMonth,
  fetchHolidays,
  fetchMyClock,
  fetchTeamMonth,
  fetchTeamNow,
  fetchWorkingDay,
  removeHoliday,
  saveWeeklyOff,
  saveWorkingDay,
  setMissingClockOut,
} from "./clock";
import { InvalidFieldsError } from "../core/errors";
import { jsonResponse } from "../core/test-helpers";

const MY_CLOCK = {
  now: "2026-11-05T05:15:00Z",
  office_network: "on",
  anywhere: null,
  open: { id: uid(4), clocked_in_at: "2026-11-05T03:17:00Z" },
  forgotten_day: null,
  today_minutes: 118,
  last_out: null,
};

const SESSION = {
  id: uid(4),
  clocked_in_at: "2026-11-03T03:15:00Z",
  clocked_out_at: "2026-11-03T07:15:00Z",
  missing_clock_out: false,
  added_by_correction: false,
  clock_out_by_correction: true,
  work_from_home: true,
};

const DAY = {
  date: "2026-11-03",
  minutes: 240,
  first_in: "2026-11-03T03:15:00Z",
  last_out: "2026-11-03T07:15:00Z",
  day_off: false,
  later: false,
  today: false,
  not_in: false,
  missing_clock_out: false,
  still_in: false,
  short: true,
  corrected: true,
  correctable: true,
  home: true,
  holiday: null,
  sessions: [SESSION],
};

const CORRECTION = {
  id: uid(2),
  day: "2026-11-03",
  before: "In 9:00 AM, no clock-out",
  after: "Out 1:00 PM",
  reason: "Left at one.",
  by: "Anita Admin",
  at: "2026-11-05T05:15:00Z",
};

const FIGURES = {
  days_worked: 1,
  minutes: 240,
  short_days: 1,
  missing_clock_outs: 0,
  corrected: 1,
};

const STAFF = { id: uid(7), name: "Sita Rai", job_title: "Counsellor", has_left: false };

const MONTH = {
  month: "2026-11",
  today: "2026-11-05",
  working_day_minutes: 480,
  staff: STAFF,
  figures: FIGURES,
  days: [DAY],
  corrections: [CORRECTION],
};

function answering(response: Response): ReturnType<typeof vi.fn<typeof fetch>> {
  return vi.fn<typeof fetch>().mockResolvedValue(response);
}

describe("fetchMyClock", () => {
  it("reads the clock in frontend terms", async () => {
    const fetchFn = answering(jsonResponse(MY_CLOCK));

    const clock = await fetchMyClock(fetchFn);

    expect(fetchFn.mock.calls[0]?.[0]).toBe("/api/clock/");
    expect(clock).toEqual({
      now: MY_CLOCK.now,
      officeNetwork: "on",
      anywhere: null,
      open: { id: uid(4), clockedInAt: "2026-11-05T03:17:00Z" },
      forgottenDay: null,
      todayMinutes: 118,
      lastOut: null,
    });
  });

  it.each(["admin", "work_from_home"] as const)(
    "says why I may clock in from any network: %s",
    async (anywhere) => {
      const clock = await fetchMyClock(answering(jsonResponse({ ...MY_CLOCK, anywhere })));

      expect(clock.anywhere).toBe(anywhere);
    },
  );

  it.each([
    { ...MY_CLOCK, anywhere: "home" },
    { ...MY_CLOCK, anywhere: undefined },
    { ...MY_CLOCK, office_network: "maybe" },
    { ...MY_CLOCK, open: { id: uid(4), clocked_in_at: "9:02" } },
    { ...MY_CLOCK, today_minutes: -1 },
    { ...MY_CLOCK, forgotten_day: "04/11/2026" },
    { ...MY_CLOCK, now: undefined },
  ])("refuses an answer that doesn't match: %j", async (body) => {
    await expect(fetchMyClock(answering(jsonResponse(body)))).rejects.toThrow();
  });
});

describe("clockIn and clockOut", () => {
  it("POST nothing (the time is the server's) and read the answer", async () => {
    const fetchFn = answering(
      jsonResponse({ clock: MY_CLOCK, marked_not_clocked_out: "2026-11-04" }, 201),
    );

    const answer = await clockIn(fetchFn);

    const [path, init] = fetchFn.mock.calls[0] ?? [];
    expect(path).toBe("/api/clock/in/");
    expect(init).toMatchObject({ method: "POST", body: "{}" });
    expect(answer.markedNotClockedOut).toBe("2026-11-04");
  });

  it("clock out answers with the minutes worked", async () => {
    const fetchFn = answering(jsonResponse({ clock: { ...MY_CLOCK, open: null }, minutes: 118 }));

    const answer = await clockOut(fetchFn);

    expect(fetchFn.mock.calls[0]?.[0]).toBe("/api/clock/out/");
    expect(answer.minutes).toBe(118);
  });

  it.each([
    [403, "You can only clock in from the office network."],
    [403, "Ask your Admin to add the office network."],
    [400, "You're already clocked in."],
  ])("a %i refusal comes back as the server's reason", async (status, detail) => {
    const refused = clockIn(answering(jsonResponse({ detail }, status)));

    await expect(refused).rejects.toBeInstanceOf(ClockRefusedError);
    await expect(refused).rejects.toThrow(detail);
  });

  it("other failures stay as they are", async () => {
    await expect(clockOut(answering(jsonResponse({}, 500)))).rejects.not.toBeInstanceOf(
      ClockRefusedError,
    );
  });
});

describe("fetchClockMonth", () => {
  it("asks for my month, or someone else's by id, and reads it", async () => {
    const fetchFn = answering(jsonResponse(MONTH));

    const month = await fetchClockMonth("2026-11", uid(7), fetchFn);

    expect(fetchFn.mock.calls[0]?.[0]).toBe(`/api/clock/month/?month=2026-11&staff=${uid(7)}`);
    expect(month.workingDayMinutes).toBe(480);
    expect(month.staff).toEqual({
      id: uid(7),
      name: "Sita Rai",
      jobTitle: "Counsellor",
      hasLeft: false,
    });
    expect(month.figures).toEqual({
      daysWorked: 1,
      minutes: 240,
      shortDays: 1,
      missingClockOuts: 0,
      corrected: 1,
    });
    expect(month.days[0]).toMatchObject({ isShort: true, isCorrectable: true, isHome: true });
    expect(month.days[0]?.sessions[0]).toMatchObject({
      isClockOutByCorrection: true,
      isWorkFromHome: true,
    });
    expect(month.corrections).toEqual([CORRECTION]);
  });

  it("leaves the staff out for my own month", async () => {
    const fetchFn = answering(jsonResponse(MONTH));

    await fetchClockMonth("2026-11", null, fetchFn);

    expect(fetchFn.mock.calls[0]?.[0]).toBe("/api/clock/month/?month=2026-11");
  });

  it.each([
    { ...MONTH, month: "2026-13" },
    { ...MONTH, days: [{ ...DAY, short: "yes" }] },
    { ...MONTH, days: [{ ...DAY, sessions: [{ ...SESSION, id: "4" }] }] },
    { ...MONTH, figures: { ...FIGURES, minutes: 1.5 } },
    { ...MONTH, corrections: [{ ...CORRECTION, at: "now" }] },
  ])("refuses an answer that doesn't match: %j", async (body) => {
    await expect(fetchClockMonth("2026-11", null, answering(jsonResponse(body)))).rejects.toThrow();
  });
});

describe("the team", () => {
  it("reads who's in now", async () => {
    const fetchFn = answering(
      jsonResponse({
        now: "2026-11-05T05:15:00Z",
        office_network: "off",
        clocked_in_count: 1,
        people: [
          {
            id: uid(7),
            name: "Sita Rai",
            job_title: "",
            state: "in",
            since: "2026-11-05T03:17:00Z",
            left_at: null,
          },
        ],
      }),
    );

    const team = await fetchTeamNow(fetchFn);

    expect(fetchFn.mock.calls[0]?.[0]).toBe("/api/clock/team/now/");
    expect(team.officeNetwork).toBe("off");
    expect(team.people[0]).toEqual({
      id: uid(7),
      name: "Sita Rai",
      jobTitle: "",
      state: "in",
      since: "2026-11-05T03:17:00Z",
      leftAt: null,
    });
  });

  it("reads everyone's month", async () => {
    const fetchFn = answering(
      jsonResponse({
        month: "2026-10",
        working_day_minutes: 480,
        rows: [{ staff: STAFF, ...FIGURES }],
      }),
    );

    const team = await fetchTeamMonth("2026-10", fetchFn);

    expect(fetchFn.mock.calls[0]?.[0]).toBe("/api/clock/team/?month=2026-10");
    expect(team.rows[0]).toEqual({
      staff: { id: uid(7), name: "Sita Rai", jobTitle: "Counsellor", hasLeft: false },
      daysWorked: 1,
      minutes: 240,
      shortDays: 1,
      missingClockOuts: 0,
      corrected: 1,
    });
  });

  it("refuses a person whose state it doesn't know", async () => {
    const body = {
      now: "2026-11-05T05:15:00Z",
      office_network: "on",
      clocked_in_count: 0,
      people: [{ id: uid(1), name: "A", job_title: "", state: "away", since: null, left_at: null }],
    };

    await expect(fetchTeamNow(answering(jsonResponse(body)))).rejects.toThrow();
  });
});

describe("the Working Day", () => {
  const ANSWER = {
    minutes: 450,
    weekly_off: "sunday",
    changes: [
      { id: uid(1), old_minutes: 480, new_minutes: 450, by: "Anita", at: "2026-11-05T05:15:00Z" },
    ],
  };

  it("reads it and its changes", async () => {
    const working = await fetchWorkingDay(answering(jsonResponse(ANSWER)));

    expect(working.changes[0]).toEqual({
      id: uid(1),
      oldMinutes: 480,
      newMinutes: 450,
      by: "Anita",
      at: "2026-11-05T05:15:00Z",
    });
  });

  it("PUTs the minutes and refuses with the field's reason", async () => {
    const fetchFn = answering(
      jsonResponse({ minutes: ["Enter between 4 and 12 hours, in half hours."] }, 400),
    );

    const refused = saveWorkingDay(455, fetchFn);

    await expect(refused).rejects.toBeInstanceOf(InvalidFieldsError);
    expect(fetchFn.mock.calls[0]?.[1]?.method).toBe("PUT");
    expect(fetchFn.mock.calls[0]?.[1]?.body).toBe('{"minutes":455}');
  });

  it("reads the weekly days off (asked 2026-11-17)", async () => {
    expect((await fetchWorkingDay(answering(jsonResponse(ANSWER)))).weeklyOff).toBe("sunday");
  });

  it("PUTs a new choice of days off", async () => {
    const fetchFn = answering(jsonResponse({ ...ANSWER, weekly_off: "none" }));

    const saved = await saveWeeklyOff("none", fetchFn);

    expect(saved.weeklyOff).toBe("none");
    const [path, init] = fetchFn.mock.calls[0] ?? [];
    expect(path).toBe("/api/clock/days-off/");
    expect(init).toMatchObject({ method: "PUT", body: '{"weekly_off":"none"}' });
  });

  it("refuses a days-off answer it doesn't know", async () => {
    await expect(
      fetchWorkingDay(answering(jsonResponse({ ...ANSWER, weekly_off: "monday" }))),
    ).rejects.toThrow();
  });
});

describe("corrections", () => {
  it("sets a missing clock-out", async () => {
    const fetchFn = answering(jsonResponse(CORRECTION, 201));

    const saved = await setMissingClockOut(uid(4), { clockedOutAt: "13:00", reason: "x" }, fetchFn);

    expect(fetchFn.mock.calls[0]?.[0]).toBe(`/api/clock/sessions/${uid(4)}/clock-out/`);
    expect(fetchFn.mock.calls[0]?.[1]?.body).toBe('{"clocked_out_at":"13:00","reason":"x"}');
    expect(saved).toEqual(CORRECTION);
  });

  it("adds missed time", async () => {
    const fetchFn = answering(jsonResponse(CORRECTION, 201));
    const missed = { day: "2026-11-04", from: "09:00", to: "17:00", reason: "x" };

    await addMissedTime(uid(7), missed, fetchFn);

    expect(fetchFn.mock.calls[0]?.[0]).toBe(`/api/clock/staff/${uid(7)}/missed-time/`);
    expect(fetchFn.mock.calls[0]?.[1]?.body).toBe(JSON.stringify(missed));
  });

  it("a rule the day breaks comes back as the server's reason", async () => {
    const detail = "That overlaps time already recorded on this day.";

    const refused = setMissingClockOut(
      uid(4),
      { clockedOutAt: "13:00", reason: "x" },
      answering(jsonResponse({ detail }, 400)),
    );

    await expect(refused).rejects.toThrow(new ClockRefusedError(detail, 400));
  });

  it("a refused field comes back named in frontend terms", async () => {
    const refused = addMissedTime(
      uid(7),
      { day: "2026-11-04", from: "9", to: "10:00", reason: "x" },
      answering(jsonResponse({ from: ["Enter a time such as 17:30."] }, 400)),
    );

    await expect(refused).rejects.toMatchObject({
      fieldErrors: { from: ["Enter a time such as 17:30."] },
    });
  });
});

describe("holidays", () => {
  it("reads the list", async () => {
    const fetchFn = answering(
      jsonResponse({ holidays: [{ id: uid(4), date: "2026-10-21", name: "Dashain" }] }),
    );

    const holidays = await fetchHolidays(fetchFn);

    expect(holidays).toEqual([{ id: uid(4), date: "2026-10-21", name: "Dashain" }]);
    expect(fetchFn.mock.calls[0]?.[0]).toBe("/api/clock/holidays/");
  });

  it("POSTs a new one and names a refused field in frontend terms", async () => {
    const fetchFn = answering(
      jsonResponse({ date: ["There is already a holiday on that day."] }, 400),
    );

    const refused = addHoliday({ date: "2026-10-21", name: "Dashain" }, fetchFn);

    await expect(refused).rejects.toMatchObject({
      fieldErrors: { date: ["There is already a holiday on that day."] },
    });
    expect(fetchFn.mock.calls[0]?.[1]?.method).toBe("POST");
    expect(fetchFn.mock.calls[0]?.[1]?.body).toBe('{"date":"2026-10-21","name":"Dashain"}');
  });

  it("DELETEs one", async () => {
    const fetchFn = answering(new Response(null, { status: 204 }));

    await removeHoliday(uid(4), fetchFn);

    expect(fetchFn.mock.calls[0]?.[0]).toBe(`/api/clock/holidays/${uid(4)}/`);
    expect(fetchFn.mock.calls[0]?.[1]?.method).toBe("DELETE");
  });

  it("refuses a list it can't read", async () => {
    const fetchFn = answering(jsonResponse({ holidays: [{ id: "x", date: "soon" }] }));

    await expect(fetchHolidays(fetchFn)).rejects.toThrow();
  });
});
