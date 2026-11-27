import { render, screen } from "@testing-library/react";

import { StaffContextContext } from "@/components/features/shell/staffContext";
import { ToastProvider } from "@/components/ui/ToastProvider";
import type { StaffContext } from "@/lib/api";
import { consultancySummary } from "@/test/consultancy";
import { uid } from "@/test/ids";

import { FeeTypeStudentsRoute } from "./FeeTypeStudentsRoute";

const ADMIN: StaffContext = {
  staff: { id: uid(1), name: "Asha Admin", email: "asha@acme.test", role: "admin" },
  consultancy: consultancySummary(),
  modules: ["students", "accounts"],
  dateDisplay: "AD",
  colourMode: "light",
  supportAccess: null,
};

function renderRoute(idText: string) {
  render(
    <StaffContextContext value={ADMIN}>
      <ToastProvider>
        <FeeTypeStudentsRoute idText={idText} />
      </ToastProvider>
    </StaffContextContext>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("FeeTypeStudentsRoute (ADR 0027)", () => {
  it.each(["1;drop", "7", "not-a-uuid", uid(7).replaceAll("-", "")])(
    "finds nothing for %j, which isn't a UUID, without asking the API",
    (idText) => {
      const fetchFn = vi.fn<typeof fetch>();
      vi.stubGlobal("fetch", fetchFn);

      renderRoute(idText);

      expect(screen.getByText("We couldn't find this Fee Type.")).toBeInTheDocument();
      expect(fetchFn).not.toHaveBeenCalled();
    },
  );

  it.each([uid(7), uid(7).toUpperCase()])("opens the Fee Type for a real id (%s)", (idText) => {
    const fetchFn = vi.fn<typeof fetch>().mockReturnValue(new Promise(() => undefined));
    vi.stubGlobal("fetch", fetchFn);

    renderRoute(idText);

    expect(fetchFn).toHaveBeenCalledWith(
      expect.stringContaining(`/api/accounts/fees-by-type/${uid(7)}/`),
      expect.anything(),
    );
  });
});
