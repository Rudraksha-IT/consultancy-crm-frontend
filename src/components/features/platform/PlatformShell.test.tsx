import { copyrightLine, yearInNepal } from "@/lib/brand/copyright";
import { uid } from "@/test/ids";
import { LABELS } from "@/constants/messages";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { jsonResponse } from "@/lib/api/core/test-helpers";
import { APP_LOGO_URL } from "@/lib/brand/appLogo";

import { useCurrentPlatformAdmin } from "./platformAdminContext";
import { PlatformShell } from "./PlatformShell";

/** A page that renames the Platform Admin, as the Account page does after a save. */
function Renamer() {
  const { admin, setAdmin } = useCurrentPlatformAdmin();
  return (
    <button
      type="button"
      onClick={() => {
        setAdmin({ ...admin, name: "Ramesh" });
      }}
    >
      Rename
    </button>
  );
}

const router = vi.hoisted(() => ({ replace: vi.fn<(href: string) => void>() }));
const pathname = vi.hoisted(() => ({ current: "/platform" }));
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => pathname.current,
}));
const navigate = vi.hoisted(() => vi.fn<(path: string) => void>());
vi.mock("@/hooks/useFullPageNavigation", () => ({ useFullPageNavigation: () => navigate }));

const ADMIN = { id: uid(1), name: "Platform Ops", email: "ops@platform.test" };

function answerMeWith(response: Response | Promise<Response>): typeof fetch {
  const fetchFn = vi
    .fn<typeof fetch>()
    .mockImplementation((path) =>
      path === "/api/platform/me/"
        ? Promise.resolve(response)
        : Promise.resolve(new Response(null, { status: 204 })),
    );
  vi.stubGlobal("fetch", fetchFn);
  return fetchFn;
}

beforeEach(() => {
  router.replace.mockReset();
  navigate.mockReset();
});

describe("PlatformShell", () => {
  it("shows a loading message while the session is being checked", () => {
    answerMeWith(new Promise(() => undefined));

    render(<PlatformShell>page</PlatformShell>);

    expect(screen.getByText("Loading…")).toBeInTheDocument();
    expect(screen.queryByText("page")).not.toBeInTheDocument();
  });

  it("sends a visitor who isn't logged in to the Platform login page", async () => {
    answerMeWith(jsonResponse({ detail: "Not logged in" }, 403));

    render(<PlatformShell>page</PlatformShell>);

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith("/platform/login");
    });
  });

  it("shows the page under a Platform header with the Platform Admin's name", async () => {
    answerMeWith(jsonResponse({ platform_admin: ADMIN }));

    render(<PlatformShell>page</PlatformShell>);

    expect(await screen.findByText("page")).toBeInTheDocument();
    expect(screen.queryByText("Platform")).not.toBeInTheDocument();
    expect(screen.getByText("Platform Ops")).toBeInTheDocument();
  });

  it("ends every page with the copyright line (owner, 2026-11-27)", async () => {
    answerMeWith(jsonResponse({ platform_admin: ADMIN }));

    render(<PlatformShell>page</PlatformShell>);

    await screen.findByText("page");
    const line = screen.getByText(copyrightLine(yearInNepal(new Date())));
    expect(screen.getByRole("main")).toContainElement(line);
  });

  it("shows the app's own logo beside the product's name while no upload is in use (ticket 07)", async () => {
    answerMeWith(jsonResponse({ platform_admin: ADMIN }));

    render(<PlatformShell>page</PlatformShell>);

    await screen.findByText("page");
    const home = screen.getByRole("link", { name: new RegExp(LABELS.productName) });
    expect(home.querySelector("img")?.getAttribute("src")).toBe(APP_LOGO_URL);
    expect(home).not.toHaveTextContent("RC");
  });

  it.each([
    ["/platform", "Consultancies"],
    ["/platform/admins", "Platform Admins"],
    ["/platform/settings", "Settings"],
  ])("has tabs for the Platform's pages, marking %s as %s", async (path, current) => {
    pathname.current = path;
    answerMeWith(jsonResponse({ platform_admin: ADMIN }));

    render(<PlatformShell>page</PlatformShell>);

    const nav = await screen.findByRole("navigation", { name: "Platform" });
    const tabs = within(nav);
    // In the page, above its content, not under the header (ticket 16).
    expect(screen.getByRole("main")).toContainElement(nav);
    expect(screen.getByRole("banner")).not.toContainElement(nav);
    expect(
      tabs.getAllByRole("link").map((link) => [link.textContent, link.getAttribute("href")]),
    ).toEqual([
      ["Consultancies", "/platform"],
      ["Platform Admins", "/platform/admins"],
      ["Settings", "/platform/settings"],
    ]);
    expect(tabs.getByRole("link", { name: current })).toHaveAttribute("aria-current", "page");
    expect(
      tabs.getAllByRole("link").filter((link) => link.hasAttribute("aria-current")),
    ).toHaveLength(1);
    pathname.current = "/platform";
  });

  it("names the page and the product in the browser tab (list tidy-ups 08)", async () => {
    pathname.current = "/platform/admins";
    answerMeWith(jsonResponse({ platform_admin: ADMIN }));

    render(<PlatformShell>page</PlatformShell>);

    await waitFor(() => {
      expect(document.title).toBe("Platform Admins | Rudraksha CRM");
    });
    pathname.current = "/platform";
  });

  it("has one Settings: a tab, and no gear in the header (list tidy-ups 04)", async () => {
    answerMeWith(jsonResponse({ platform_admin: ADMIN }));

    render(<PlatformShell>page</PlatformShell>);

    const tabs = within(await screen.findByRole("navigation", { name: "Platform" }));
    expect(tabs.getByRole("link", { name: "Settings" })).toHaveAttribute(
      "href",
      "/platform/settings",
    );
    const header = within(screen.getByRole("banner"));
    expect(header.queryByRole("link", { name: "Account" })).not.toBeInTheDocument();
    expect(header.queryByRole("link", { name: /settings/i })).not.toBeInTheDocument();
  });

  it("shows a saved name change in the header at once", async () => {
    answerMeWith(jsonResponse({ platform_admin: ADMIN }));
    render(
      <PlatformShell>
        <Renamer />
      </PlatformShell>,
    );

    await userEvent.click(await screen.findByRole("button", { name: "Rename" }));

    expect(screen.getByText("Ramesh")).toBeInTheDocument();
    expect(screen.queryByText("Platform Ops")).not.toBeInTheDocument();
  });

  it("refuses the Account context outside the Platform frame", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(() => render(<Renamer />)).toThrow("needs the PlatformShell");
  });
});
