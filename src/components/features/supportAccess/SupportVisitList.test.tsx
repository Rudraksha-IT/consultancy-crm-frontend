import { uid } from "@/test/ids";
import { render, screen, within } from "@testing-library/react";

import type { SupportVisit } from "@/lib/api";
import { applyThemeCase, resetTheme, THEME_CASES } from "@/test/themes";

import { SupportVisitList } from "./SupportVisitList";

const OPEN: SupportVisit = {
  id: uid(8),
  platformAdminName: "Ramesh",
  consultancy: { id: uid(3), name: "Acme Education" },
  reason: "Bikash couldn't see a Student's documents",
  consultancyStatus: "active",
  startedAt: "2026-11-04T07:55:00+00:00",
  endedAt: null,
};
const ENDED: SupportVisit = {
  ...OPEN,
  id: uid(7),
  consultancy: { id: uid(4), name: "Beta Overseas" },
  reason: "Admin locked out",
  consultancyStatus: "past_due",
  endedAt: "2026-11-04T08:25:00+00:00",
};

describe.each(THEME_CASES)("SupportVisitList in the $name Theme", ({ mode }) => {
  beforeEach(() => {
    applyThemeCase(mode);
  });

  afterEach(() => {
    resetTheme();
  });

  it("lists who opened which office, why and when, never shown to the office", async () => {
    render(<SupportVisitList loadVisits={() => Promise.resolve([OPEN, ENDED])} />);

    const section = screen.getByRole("region", { name: "Visits by Platform Admins" });
    expect(within(section).getByText("Never shown to the consultancy")).toBeVisible();
    const [open, ended] = await within(section).findAllByRole("listitem");
    expect(open).toHaveTextContent("Acme Education");
    expect(open).toHaveTextContent("Ramesh: Bikash couldn't see a Student's documents");
    expect(open).toHaveTextContent("In progress");
    expect(ended).toHaveTextContent("Beta Overseas");
    expect(ended).toHaveTextContent("Past due at the time");
    expect(ended).toHaveTextContent(/Ended/);
    expect(ended).not.toHaveTextContent("In progress");
  });
});

describe("SupportVisitList", () => {
  it("says when there are no visits yet", async () => {
    render(<SupportVisitList loadVisits={() => Promise.resolve([])} />);

    expect(await screen.findByText("No Platform Admin has opened an office yet.")).toBeVisible();
  });

  it("says when the visits couldn't be loaded", async () => {
    render(<SupportVisitList loadVisits={() => Promise.reject(new Error("offline"))} />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The visits couldn't be loaded. Refresh the page to try again.",
    );
  });

  it("shows a reason typed like markup as text", async () => {
    const reason = "<img src=x onerror=alert(1)>";
    render(<SupportVisitList loadVisits={() => Promise.resolve([{ ...OPEN, reason }])} />);

    expect(await screen.findByText(`Ramesh: ${reason}`)).toBeVisible();
    expect(document.querySelector("img")).toBeNull();
  });
});
