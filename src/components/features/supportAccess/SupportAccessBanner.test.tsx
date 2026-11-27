import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { applyThemeCase, resetTheme, THEME_CASES } from "@/test/themes";

import { entryUrl, platformUrl } from "./officeAddress";
import { SupportAccessBanner } from "./SupportAccessBanner";
import { testHost } from "@/test/hosts";

const navigate = vi.hoisted(() => vi.fn<(path: string) => void>());
vi.mock("@/hooks/useFullPageNavigation", () => ({ useFullPageNavigation: () => navigate }));

beforeEach(() => {
  navigate.mockReset();
});

describe.each(THEME_CASES)("SupportAccessBanner in the $name Theme", ({ mode }) => {
  beforeEach(() => {
    applyThemeCase(mode);
  });

  afterEach(() => {
    resetTheme();
  });

  it("says where the Platform Admin is and that changes carry their own name", () => {
    render(<SupportAccessBanner office="Acme Education" platformHost={testHost("admin")} />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "You're in Acme Education as Platform Admin. Your changes are recorded under your own name.",
    );
  });

  it("leaves the office: ends the visit, then goes back to the Platform", async () => {
    const endSession = vi.fn<() => Promise<void>>().mockResolvedValue();
    render(
      <SupportAccessBanner
        office="Acme Education"
        platformHost={testHost("admin")}
        endSession={endSession}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Leave this office" }));

    expect(endSession).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith(`http://${testHost("admin")}:3000/platform`);
  });
});

describe("SupportAccessBanner", () => {
  it("stays in the office and says so when leaving fails", async () => {
    const endSession = vi.fn<() => Promise<void>>().mockRejectedValue(new Error("offline"));
    render(
      <SupportAccessBanner
        office="Acme Education"
        platformHost={testHost("admin")}
        endSession={endSession}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Leave this office" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "You couldn't leave the office. Try again.",
    );
    expect(navigate).not.toHaveBeenCalled();
  });
});

describe("office addresses", () => {
  const LOCAL = { protocol: "http:", port: "8080" };
  const LIVE = { protocol: "https:", port: "" };

  it("enters an office on its own address, with the code after the #", () => {
    expect(entryUrl(testHost("acme"), "abc", LOCAL)).toBe(
      `http://${testHost("acme")}:8080/support-access#abc`,
    );
    expect(entryUrl("acme.crm.com", "abc", LIVE)).toBe("https://acme.crm.com/support-access#abc");
  });

  it("goes back to the Platform's page", () => {
    expect(platformUrl("admin.crm.com", LIVE)).toBe("https://admin.crm.com/platform");
    expect(platformUrl(`${testHost("admin")}:9000`, LOCAL)).toBe(
      `http://${testHost("admin")}:9000/platform`,
    );
  });
});
