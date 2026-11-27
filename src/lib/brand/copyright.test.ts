import { COPYRIGHT_HOLDER, FIRST_YEAR, copyrightLine, yearInNepal } from "./copyright";

describe("the copyright line (owner, 2026-11-27)", () => {
  it("names Rudraksha Labs from 2026", () => {
    expect(COPYRIGHT_HOLDER).toBe("Rudraksha Labs");
    expect(FIRST_YEAR).toBe(2026);
  });

  it("shows one year while it is still the first", () => {
    expect(copyrightLine(2026)).toBe("© 2026 Rudraksha Labs. All rights reserved.");
  });

  it.each([
    [2027, "2026-2027"],
    [2031, "2026-2031"],
  ])("shows the first year to this one after that (%i)", (year, years) => {
    expect(copyrightLine(year)).toBe(`© ${years} Rudraksha Labs. All rights reserved.`);
  });

  it("never shows a year before the first, whatever the device's clock says", () => {
    expect(copyrightLine(2025)).toBe("© 2026 Rudraksha Labs. All rights reserved.");
  });

  it("turns the year at midnight in Nepal, not UTC", () => {
    // 00:15 on 1 January 2028 in Kathmandu.
    expect(yearInNepal(new Date("2027-12-31T18:30:00Z"))).toBe(2028);
    expect(yearInNepal(new Date("2027-12-31T18:00:00Z"))).toBe(2027);
  });
});
