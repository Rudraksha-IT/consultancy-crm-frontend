import { formatDate, formatDateTime, formatMoneyDate, formatOtherCalendar } from "./display";

describe("formatDate", () => {
  it("writes an AD date in the calendar the office chose", () => {
    expect(formatDate("2026-11-02", "AD")).toBe("2 Nov 2026");
    expect(formatDate("2026-11-02", "BS")).toBe("16 Kartik 2083");
  });

  it.each(["", "2026-13-01", "<script>"])("shows %j as a dash in either calendar", (value) => {
    expect(formatDate(value, "AD")).toBe("—");
    expect(formatDate(value, "BS")).toBe("—");
  });
});

describe("formatDateTime", () => {
  it("writes the local day in the chosen calendar, then the time", () => {
    const moment = "2026-11-02T12:00:00Z";
    const local = new Date(moment);
    const pad = (value: number) => String(value).padStart(2, "0");
    const time = `${pad(local.getHours())}:${pad(local.getMinutes())}`;

    expect(formatDateTime(moment, "AD")).toMatch(new RegExp(`^\\d{1,2} Nov 2026, ${time}$`));
    expect(formatDateTime(moment, "BS")).toMatch(new RegExp(`^\\d{1,2} Kartik 2083, ${time}$`));
  });

  it("shows a value that isn't a moment as a dash", () => {
    expect(formatDateTime("yesterday", "BS")).toBe("—");
  });
});

describe("formatMoneyDate", () => {
  it("adds the BS date beside an AD date", () => {
    expect(formatMoneyDate("2026-11-02", "AD")).toEqual({
      date: "2 Nov 2026",
      beside: "16 Kartik 2083 BS",
    });
  });

  it("shows only the BS date when the office uses BS", () => {
    expect(formatMoneyDate("2026-11-02", "BS")).toEqual({ date: "16 Kartik 2083", beside: null });
  });

  it("adds nothing beside a date outside the BS table", () => {
    expect(formatMoneyDate("2031-01-01", "AD")).toEqual({ date: "1 Jan 2031", beside: null });
  });
});

describe("formatOtherCalendar", () => {
  it("names the same day in the calendar the office isn't using", () => {
    expect(formatOtherCalendar("2026-11-02", "AD")).toBe("16 Kartik 2083 BS");
    expect(formatOtherCalendar("2026-11-02", "BS")).toBe("2 Nov 2026 AD");
  });

  it("is null when there is no date", () => {
    expect(formatOtherCalendar("", "AD")).toBeNull();
    expect(formatOtherCalendar("", "BS")).toBeNull();
    expect(formatOtherCalendar("1900-01-01", "AD")).toBeNull();
  });
});
