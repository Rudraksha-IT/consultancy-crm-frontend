import { gridYears, isGoneBy, monthOf, monthsOf, startYear, toggleIntake } from "./monthGrid";

// 16 May 2030, so April 2030 has gone by and May is this month.
const TODAY = new Date(2030, 4, 16);

describe("monthOf", () => {
  it("gives the stored month of a day", () => {
    expect(monthOf(TODAY)).toBe("2030-05");
    expect(monthOf(new Date(2030, 11, 31))).toBe("2030-12");
  });
});

describe("toggleIntake", () => {
  it("adds a month in date order", () => {
    expect(toggleIntake(["2030-07", "2031-02"], "2030-09")).toEqual([
      "2030-07",
      "2030-09",
      "2031-02",
    ]);
  });

  it("removes a month already there", () => {
    expect(toggleIntake(["2030-07", "2030-09"], "2030-07")).toEqual(["2030-09"]);
  });

  it("never keeps a month twice", () => {
    expect(toggleIntake(["2030-07", "2030-07"], "2030-09")).toEqual(["2030-07", "2030-09"]);
  });
});

describe("isGoneBy", () => {
  it("is true only for months before this one", () => {
    expect(isGoneBy("2030-04", TODAY)).toBe(true);
    expect(isGoneBy("2030-05", TODAY)).toBe(false);
    expect(isGoneBy("2031-01", TODAY)).toBe(false);
  });
});

describe("gridYears", () => {
  it("runs from this year to four years on", () => {
    expect(gridYears(TODAY)).toEqual({ first: 2030, last: 2034 });
  });
});

describe("startYear", () => {
  it("opens on the year of the first upcoming intake", () => {
    expect(startYear(["2029-02", "2031-07"], TODAY)).toBe(2031);
  });

  it("opens on this year when there is none", () => {
    expect(startYear([], TODAY)).toBe(2030);
    expect(startYear(["2029-02"], TODAY)).toBe(2030);
  });

  it("never opens past the last year shown", () => {
    expect(startYear(["2040-02"], TODAY)).toBe(2034);
  });
});

describe("monthsOf", () => {
  it("lists the twelve months, chosen ones pressed and gone ones disabled", () => {
    const months = monthsOf(2030, ["2030-02", "2030-07"], TODAY);

    expect(months).toHaveLength(12);
    expect(months[0]).toEqual({
      value: "2030-01",
      label: "Jan",
      fullLabel: "Jan 2030",
      isChosen: false,
      isDisabled: true,
    });
    // A month gone by that is already chosen can still be taken off.
    expect(months[1]).toMatchObject({ value: "2030-02", isChosen: true, isDisabled: false });
    expect(months[4]).toMatchObject({ value: "2030-05", isChosen: false, isDisabled: false });
    expect(months[6]).toMatchObject({ value: "2030-07", label: "Jul", isChosen: true });
  });
});
