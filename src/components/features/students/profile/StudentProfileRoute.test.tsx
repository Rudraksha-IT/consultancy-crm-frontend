import { render, screen } from "@testing-library/react";

import { StaffContextContext } from "@/components/features/shell/staffContext";
import { ToastProvider } from "@/components/ui/ToastProvider";
import type { StaffContext } from "@/lib/api";
import { DEFAULT_THEME } from "@/lib/theme";

import { StudentProfileRoute } from "./StudentProfileRoute";
import { consultancySummary } from "@/test/consultancy";
import { uid } from "@/test/ids";

const ADMIN: StaffContext = {
  staff: { id: uid(1), name: "Asha Admin", email: "asha@acme.test", role: "admin" },
  consultancy: consultancySummary(),
  modules: ["students"],
  dateDisplay: "AD",
  colourMode: "light",
  supportAccess: null,
  theme: DEFAULT_THEME,
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("StudentProfileRoute", () => {
  it.each(["1;drop", "7", "not-a-uuid", uid(7).replaceAll("-", "")])(
    "finds nobody for an address that isn't a Student's UUID (%s), without asking the API",
    (idText) => {
      const fetchFn = vi.fn<typeof fetch>();
      vi.stubGlobal("fetch", fetchFn);

      render(
        <StaffContextContext value={ADMIN}>
          <ToastProvider>
            <StudentProfileRoute idText={idText} />
          </ToastProvider>
        </StaffContextContext>,
      );

      expect(screen.getByText("We couldn't find this Student.")).toBeInTheDocument();
      expect(fetchFn).not.toHaveBeenCalled();
    },
  );

  it.each([uid(7), uid(7).toUpperCase()])("opens the Student for a real id (%s)", (idText) => {
    const fetchFn = vi.fn<typeof fetch>().mockReturnValue(new Promise(() => undefined));
    vi.stubGlobal("fetch", fetchFn);

    render(
      <StaffContextContext value={ADMIN}>
        <ToastProvider>
          <StudentProfileRoute idText={idText} />
        </ToastProvider>
      </StaffContextContext>,
    );

    expect(fetchFn).toHaveBeenCalledWith(`/api/students/${uid(7)}/`, expect.anything());
  });

  it("shows the page loader in the middle of the screen while the Student loads (list tidy-ups 21)", () => {
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockReturnValue(new Promise(() => undefined)));

    render(
      <StaffContextContext value={ADMIN}>
        <ToastProvider>
          <StudentProfileRoute idText={uid(7)} />
        </ToastProvider>
      </StaffContextContext>,
    );

    const loader = document.querySelector('[role="status"] svg.logo-loader');
    expect(loader).toHaveAttribute("data-size", "page");
  });
});
