import { render, screen } from "@testing-library/react";

import { StaffContextContext } from "@/components/features/shell/staffContext";
import { ToastProvider } from "@/components/ui/ToastProvider";
import type { StaffContext } from "@/lib/api";
import { DEFAULT_THEME } from "@/lib/theme";

import { StudentProfileRoute } from "./StudentProfileRoute";
import { consultancySummary } from "@/test/consultancy";

const ADMIN: StaffContext = {
  staff: { id: 1, name: "Asha Admin", email: "asha@acme.test", role: "admin" },
  consultancy: consultancySummary(),
  modules: ["students"],
  dateDisplay: "AD",
  colourMode: "device",
  supportAccess: null,
  theme: DEFAULT_THEME,
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("StudentProfileRoute", () => {
  it("finds nobody for an address that isn't a Student id, without asking the API", () => {
    const fetchFn = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchFn);

    render(
      <StaffContextContext value={ADMIN}>
        <ToastProvider>
          <StudentProfileRoute idText="1;drop" />
        </ToastProvider>
      </StaffContextContext>,
    );

    expect(screen.getByText("We couldn't find this Student.")).toBeInTheDocument();
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("opens the Student for a real id", () => {
    const fetchFn = vi.fn<typeof fetch>().mockReturnValue(new Promise(() => undefined));
    vi.stubGlobal("fetch", fetchFn);

    render(
      <StaffContextContext value={ADMIN}>
        <ToastProvider>
          <StudentProfileRoute idText="7" />
        </ToastProvider>
      </StaffContextContext>,
    );

    expect(fetchFn).toHaveBeenCalledWith("/api/students/7/", expect.anything());
  });
});
