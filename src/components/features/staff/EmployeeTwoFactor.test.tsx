import { uid } from "@/test/ids";
import { render, screen } from "@testing-library/react";

import type { Employee } from "@/lib/api";
import { applyThemeCase, resetTheme, THEME_CASES } from "@/test/themes";

import { EmployeeTwoFactorChip } from "./EmployeeTwoFactor";

const RAM: Employee = {
  id: uid(2),
  name: "Ram Thapa",
  email: "ram@acme.test",
  mobile: "9800000002",
  jobTitle: "Counsellor",
  role: "counsellor",
  joinedOn: "2026-01-01",
  status: "active",
  invitedBack: false,
  twoFactorRequired: true,
  twoFactorSetUp: false,
};

describe.each(THEME_CASES)("EmployeeTwoFactorChip in the $name Theme", ({ mode }) => {
  beforeEach(() => {
    applyThemeCase(mode);
  });
  afterEach(resetTheme);

  it.each([
    [true, true, "On, set up"],
    [true, false, "On, not set up"],
    [false, false, "Off"],
  ])("required %s, set up %s reads %s, always in words", (required, setUp, word) => {
    render(
      <EmployeeTwoFactorChip
        employee={{ ...RAM, twoFactorRequired: required, twoFactorSetUp: setUp }}
      />,
    );

    expect(screen.getByText("Two-step login")).toBeInTheDocument();
    expect(screen.getByText(word)).toBeInTheDocument();
  });
});
