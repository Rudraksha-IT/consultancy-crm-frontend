import { uid } from "@/test/ids";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";

import type { StaffContext } from "@/lib/api";

import { StaffContextContext } from "./staffContext";
import { useCurrentStaff } from "./useCurrentStaff";
import { consultancySummary } from "@/test/consultancy";

const CONTEXT: StaffContext = {
  staff: { id: uid(1), name: "Sita Sharma", email: "sita@acme.test", role: "admin" },
  consultancy: consultancySummary(),
  modules: ["students"],
  dateDisplay: "AD",
  colourMode: "light",
  supportAccess: null,
};

describe("useCurrentStaff", () => {
  it("returns the context the AppShell provides", () => {
    function wrapper({ children }: { children: ReactNode }) {
      return <StaffContextContext value={CONTEXT}>{children}</StaffContextContext>;
    }

    const { result } = renderHook(() => useCurrentStaff(), { wrapper });

    expect(result.current).toEqual(CONTEXT);
  });

  it("fails loudly outside the AppShell", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(() => renderHook(() => useCurrentStaff())).toThrow(/inside the AppShell/);
  });
});
