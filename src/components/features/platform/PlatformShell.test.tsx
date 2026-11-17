import { LABELS } from "@/constants/messages";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { jsonResponse } from "@/lib/api/core/test-helpers";

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

const ADMIN = { id: 1, name: "Platform Ops", email: "ops@platform.test" };

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

  it.each([
    ["/platform", "Consultancies"],
    ["/platform/admins", "Platform Admins"],
    ["/platform/settings", "Settings"],
  ])("has tabs for the Platform's pages, marking %s as %s", async (path, current) => {
    pathname.current = path;
    answerMeWith(jsonResponse({ platform_admin: ADMIN }));

    render(<PlatformShell>page</PlatformShell>);

    const tabs = within(await screen.findByRole("navigation", { name: "Platform" }));
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

  it("marks no tab on the Account page", async () => {
    pathname.current = "/platform/account";
    answerMeWith(jsonResponse({ platform_admin: ADMIN }));

    render(<PlatformShell>page</PlatformShell>);

    const tabs = within(await screen.findByRole("navigation", { name: "Platform" }));
    expect(tabs.getAllByRole("link").some((link) => link.hasAttribute("aria-current"))).toBe(false);
    pathname.current = "/platform";
  });

  it("takes you to the Platform's home from the name at the top", async () => {
    answerMeWith(jsonResponse({ platform_admin: ADMIN }));

    render(<PlatformShell>page</PlatformShell>);

    expect(await screen.findByRole("link", { name: LABELS.productName })).toHaveAttribute(
      "href",
      "/platform",
    );
  });

  it("lets a wide child scroll inside its own panel instead of widening the page", async () => {
    answerMeWith(jsonResponse({ platform_admin: ADMIN }));

    render(<PlatformShell>page</PlatformShell>);

    const main = await screen.findByRole("main");
    expect(main).toHaveClass("min-w-0");
    expect(main.firstElementChild).toHaveClass("grid-cols-1");
  });

  it("sends a 404 (e.g. not the Platform's address) to the login page (issue 66)", async () => {
    answerMeWith(jsonResponse({}, 404));

    render(<PlatformShell>page</PlatformShell>);

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith("/platform/login");
    });
  });

  it("shows an error when the session can't be loaded for another reason", async () => {
    answerMeWith(jsonResponse({}, 500));

    render(<PlatformShell>page</PlatformShell>);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "We couldn't load your account. Please refresh the page.",
    );
  });

  it("logs out of the Platform and loads the Platform login page afresh", async () => {
    const fetchFn = answerMeWith(jsonResponse({ platform_admin: ADMIN }));
    render(<PlatformShell>page</PlatformShell>);

    await userEvent.click(await screen.findByRole("button", { name: "Log out" }));

    expect(fetchFn).toHaveBeenCalledWith(
      "/api/platform/auth/logout/",
      expect.objectContaining({ method: "POST" }),
    );
    expect(navigate).toHaveBeenCalledWith("/platform/login");
  });

  it("links to the Account page from the header", async () => {
    answerMeWith(jsonResponse({ platform_admin: ADMIN }));

    render(<PlatformShell>page</PlatformShell>);

    expect(await screen.findByRole("link", { name: "Account" })).toHaveAttribute(
      "href",
      "/platform/account",
    );
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
