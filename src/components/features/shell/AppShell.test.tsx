import { readFileSync } from "node:fs";
import { join } from "node:path";

import { uid } from "@/test/ids";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { jsonResponse } from "@/lib/api/core/test-helpers";
import { buildThemeTokens } from "@/lib/theme";
import { copyrightLine, yearInNepal } from "@/lib/brand/copyright";
import { resetTheme } from "@/test/themes";

import { AppShell } from "./AppShell";
import { useDates, useSetDateDisplay } from "./dateDisplay";
import { useSetOfficeLogo } from "./officeLogo";
import { testHost } from "@/test/hosts";
import { fakeMatchMedia } from "@/test/matchMedia";
import { PHONE_QUERY } from "@/components/ui/usePhoneWidth";

const router = vi.hoisted(() => ({
  replace: vi.fn<(href: string) => void>(),
  push: vi.fn<(href: string) => void>(),
}));
const pathname = vi.hoisted(() => ({ current: "/" }));
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => pathname.current,
}));
const navigate = vi.hoisted(() => vi.fn<(path: string) => void>());
vi.mock("@/hooks/useFullPageNavigation", () => ({ useFullPageNavigation: () => navigate }));

const TEACHER_CONTEXT = {
  staff: {
    id: uid(7),
    name: "Ram Thapa",
    email: "ram@acme.test",
    role: "teacher",
    colour_mode: "light",
  },
  consultancy: { name: "Acme Education" },
  modules: ["students", "tasks", "batches"],
  date_display: "AD",
  support_access: null,
};

const ADMIN_CONTEXT = {
  ...TEACHER_CONTEXT,
  staff: {
    id: uid(1),
    name: "Sita Sharma",
    email: "sita@acme.test",
    role: "admin",
    colour_mode: "light",
  },
  modules: ["students", "tasks", "documents", "configuration"],
};

const NO_NOTIFICATIONS = { count: 0, page: 1, page_size: 20, unread_count: 0, results: [] };

function answerContextWith(response: Response | Promise<Response>): typeof fetch {
  const fetchFn = vi.fn<typeof fetch>().mockImplementation((path) => {
    if (path === "/api/context/") return Promise.resolve(response);
    if (path === "/api/notifications/") return Promise.resolve(jsonResponse(NO_NOTIFICATIONS));
    return Promise.resolve(new Response(null, { status: 204 }));
  });
  vi.stubGlobal("fetch", fetchFn);
  return fetchFn;
}

async function renderShellFor(context: object): Promise<void> {
  answerContextWith(jsonResponse(context));
  render(<AppShell>page</AppShell>);
  await screen.findByText("page");
}

beforeEach(() => {
  router.replace.mockReset();
  router.push.mockReset();
  navigate.mockReset();
  pathname.current = "/";
});

afterEach(() => {
  resetTheme();
});

describe("AppShell: the browser tab (first live fixes, ticket 08)", () => {
  afterEach(() => {
    document.title = "";
  });

  it("names Home and the office on Home (list tidy-ups 07)", async () => {
    await renderShellFor(ADMIN_CONTEXT);

    await waitFor(() => {
      expect(document.title).toBe("Home | Acme Education");
    });
  });
});

/** A page showing one date the way every screen does, with a way to switch the calendar. */
function DatedPage() {
  const dates = useDates();
  const setDateDisplay = useSetDateDisplay();
  return (
    <>
      <p>Paid on {dates.date("2026-11-02")}</p>
      <button
        type="button"
        onClick={() => {
          setDateDisplay("BS");
        }}
      >
        Use BS
      </button>
    </>
  );
}

describe("AppShell dates", () => {
  it("shows dates in the office's calendar from the context", async () => {
    answerContextWith(jsonResponse({ ...TEACHER_CONTEXT, date_display: "BS" }));

    render(
      <AppShell>
        <DatedPage />
      </AppShell>,
    );

    expect(await screen.findByText("Paid on 16 Kartik 2083")).toBeInTheDocument();
  });

  it("switches every date at once when the setting changes", async () => {
    answerContextWith(jsonResponse(ADMIN_CONTEXT));
    render(
      <AppShell>
        <DatedPage />
      </AppShell>,
    );
    expect(await screen.findByText("Paid on 2 Nov 2026")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Use BS" }));

    expect(screen.getByText("Paid on 16 Kartik 2083")).toBeInTheDocument();
  });
});

const LOGO = { url: "/api/consultancy/logo/4/", show_name: true };

/** The office's logo wherever the side menu shows it (the product's own mark is not one). */
function sidebarImages(): HTMLImageElement[] {
  const sidebar = document.getElementById("side-nav");
  if (sidebar === null) throw new Error("no sidebar");
  return [...sidebar.querySelectorAll("img")].filter((image) => image.alt !== "Rudraksha CRM");
}

async function openYourMenu(name: string): Promise<HTMLElement> {
  await userEvent.click(await screen.findByRole("button", { name: `${name}, your menu` }));
  return screen.getByRole("menu", { name: "Your menu" });
}

function LogoChangingPage() {
  const setOfficeLogo = useSetOfficeLogo();
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOfficeLogo({ url: "/api/consultancy/logo/5/", showName: false });
        }}
      >
        New logo
      </button>
      <button
        type="button"
        onClick={() => {
          setOfficeLogo(null);
        }}
      >
        No logo
      </button>
    </>
  );
}

describe("AppShell's office logo", () => {
  it("shows the initials without a logo", async () => {
    await renderShellFor(TEACHER_CONTEXT);

    expect(sidebarImages()).toHaveLength(0);
    expect(document.getElementById("side-nav")).toHaveTextContent("AE");
  });

  it("shows the logo in the side menu (its strip and its slide-out top) and the top bar, with the name", async () => {
    await renderShellFor({
      ...TEACHER_CONTEXT,
      consultancy: { name: "Acme Education", logo: LOGO },
    });

    expect(sidebarImages().map((image) => image.getAttribute("src"))).toEqual([
      "/api/consultancy/logo/4/",
      "/api/consultancy/logo/4/",
    ]);
    expect(sidebarImages()[1]).toHaveClass("max-w-logo-rail");
    expect(document.getElementById("side-nav")).toHaveTextContent("Acme Education");
    const topBar = screen.getByRole("banner");
    expect(topBar.querySelector("img")).toHaveAttribute("src", "/api/consultancy/logo/4/");
    expect(within(topBar).getByText("Acme Education")).toBeVisible();
  });

  it("shows the logo alone when the name is switched off", async () => {
    await renderShellFor({
      ...TEACHER_CONTEXT,
      consultancy: { name: "Acme Education", logo: { ...LOGO, show_name: false } },
    });

    const sidebar = document.getElementById("side-nav");
    expect(sidebar).not.toHaveTextContent("Acme Education");
    // Too wide for the strip: it is at the top of the slide-out menu and in the top bar only.
    expect(
      within(sidebar ?? document.body).getAllByRole("img", { name: "Acme Education" }),
    ).toHaveLength(1);
    const topBar = screen.getByRole("banner");
    expect(within(topBar).getByRole("img", { name: "Acme Education" })).toBeVisible();
    expect(within(topBar).queryByText("Acme Education")).not.toBeInTheDocument();
  });

  it("changes the logo everywhere at once, e.g. after an Admin uploads one", async () => {
    answerContextWith(jsonResponse(ADMIN_CONTEXT));
    render(
      <AppShell>
        <LogoChangingPage />
      </AppShell>,
    );
    await userEvent.click(await screen.findByRole("button", { name: "New logo" }));

    expect(sidebarImages()[0]).toHaveAttribute("src", "/api/consultancy/logo/5/");
    expect(document.getElementById("side-nav")).not.toHaveTextContent("Acme Education");

    await userEvent.click(screen.getByRole("button", { name: "No logo" }));

    expect(sidebarImages()).toHaveLength(0);
  });
});

describe("AppShell", () => {
  it("shows a loading message while the session is being checked", () => {
    answerContextWith(new Promise(() => undefined));

    render(<AppShell>page</AppShell>);

    expect(screen.getByText("Loading…")).toBeInTheDocument();
    expect(screen.queryByText("page")).not.toBeInTheDocument();
  });

  it("sends a visitor who isn't logged in to the login page", async () => {
    answerContextWith(jsonResponse({ detail: "Not logged in" }, 403));

    render(<AppShell>page</AppShell>);

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith("/login");
    });
    expect(screen.queryByText("page")).not.toBeInTheDocument();
  });

  it("shows the page with navigation built from the Staff member's Role and Modules", async () => {
    await renderShellFor(TEACHER_CONTEXT);

    expect(screen.getByRole("main")).toHaveTextContent("page");
    expect(screen.getAllByText("Acme Education").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "Classes" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Students" })).not.toBeInTheDocument();
  });

  it("lets a wide child scroll inside its own panel instead of widening the page", async () => {
    await renderShellFor(TEACHER_CONTEXT);

    const main = screen.getByRole("main");
    expect(main).toHaveClass("min-w-0");
    // grid-cols-1 is minmax(0, 1fr): the page column may shrink below a wide child's width.
    expect(main.firstElementChild).toHaveClass("grid-cols-1");
  });

  it("keeps the page margin on each side of the content at every width", async () => {
    await renderShellFor(TEACHER_CONTEXT);

    const main = screen.getByRole("main");
    expect(main).toHaveClass("px-page");
    expect(main.className).not.toMatch(/(^|\s)(wide:)?px-(4|10)(\s|$)/);
  });

  it("shows an error when the session can't be loaded", async () => {
    answerContextWith(jsonResponse({}, 500));

    render(<AppShell>page</AppShell>);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "We couldn't load your account. Please refresh the page.",
    );
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("logs out and loads the login page afresh, so no screen of the session survives", async () => {
    const fetchFn = answerContextWith(jsonResponse(TEACHER_CONTEXT));
    render(<AppShell>page</AppShell>);

    const menu = await openYourMenu("Ram Thapa");
    await userEvent.click(within(menu).getByRole("menuitem", { name: "Log out" }));

    expect(fetchFn).toHaveBeenCalledWith(
      "/api/auth/logout/",
      expect.objectContaining({ method: "POST" }),
    );
    expect(navigate).toHaveBeenCalledWith("/login");
  });
});

describe("AppShell's Theme", () => {
  it("shows the Porcelain theme even when an old answer still carries office colours", async () => {
    await renderShellFor({ ...TEACHER_CONTEXT, theme: { page: "ice", accent: "red" } });

    const expected = buildThemeTokens().light;
    // The shell applies the theme in an effect after the page shows.
    await waitFor(() => {
      expect(document.documentElement.style.getPropertyValue("--accent")).toBe(expected.accent);
    });
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("switches between light and dark with the top-bar icon, saving the choice for the person", async () => {
    const fetchFn = answerContextWith(jsonResponse(TEACHER_CONTEXT));
    render(<AppShell>page</AppShell>);
    await screen.findByText("page");

    await userEvent.click(screen.getByRole("button", { name: "Switch to dark mode" }));

    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(screen.getByRole("button", { name: "Switch to light mode" })).toBeInTheDocument();
    const saved = vi.mocked(fetchFn).mock.calls.find(([path]) => path === "/api/me/");
    expect(saved?.[1]).toMatchObject({ method: "PATCH", body: '{"colour_mode":"dark"}' });
  });

  it("starts in the person's saved mode, whatever the device", async () => {
    await renderShellFor({
      ...TEACHER_CONTEXT,
      staff: { ...TEACHER_CONTEXT.staff, colour_mode: "dark" },
    });

    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe("dark");
    });
  });
});

describe("AppShell's side menu (UI revamp, ticket 05)", () => {
  it("no longer shows who is logged in or Log out: they are in your menu", async () => {
    await renderShellFor(TEACHER_CONTEXT);

    const sidebar = document.getElementById("side-nav");
    if (sidebar === null) throw new Error("no sidebar");
    expect(sidebar).not.toHaveTextContent("Ram Thapa");
    expect(within(sidebar).queryByRole("link", { name: /Ram Thapa/ })).not.toBeInTheDocument();
    expect(within(sidebar).queryByRole("button", { name: "Log out" })).not.toBeInTheDocument();
  });

  it("has the product's mark alone at its foot", async () => {
    await renderShellFor(TEACHER_CONTEXT);

    const sidebar = document.getElementById("side-nav");
    if (sidebar === null) throw new Error("no sidebar");
    const mark = within(sidebar).getByRole("img", { name: "Rudraksha CRM" });
    expect(mark).toHaveClass("size-control");
    expect(sidebar.lastElementChild).toContainElement(mark);
    expect(sidebar.lastElementChild).not.toHaveTextContent("Rudraksha CRM");
  });

  it("can't be collapsed: there is one narrow strip", async () => {
    await renderShellFor(TEACHER_CONTEXT);

    expect(screen.queryByRole("button", { name: "Collapse the menu" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Expand the menu" })).not.toBeInTheDocument();
  });

  it("keeps its own scroll when a page is picked (U6)", async () => {
    answerContextWith(jsonResponse(ADMIN_CONTEXT));
    const { rerender } = render(<AppShell>page</AppShell>);
    await screen.findByText("page");
    const menu = screen.getByRole("navigation", { name: "Main" });
    menu.scrollTop = 180;

    await userEvent.click(within(menu).getByRole("link", { name: "Tasks" }));
    pathname.current = "/tasks";
    rerender(<AppShell>another page</AppShell>);
    await screen.findByText("another page");

    const after = screen.getByRole("navigation", { name: "Main" });
    expect(within(after).getByRole("link", { name: "Tasks" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    // The same menu, never drawn again from the top.
    expect(after).toBe(menu);
    expect(after.scrollTop).toBe(180);
  });

  it("slides out from the menu button and closes on Escape, on the close button or on a link", async () => {
    await renderShellFor(TEACHER_CONTEXT);
    const openButton = screen.getByRole("button", { name: "Open the menu" });

    await userEvent.click(openButton);
    expect(openButton).toHaveAttribute("aria-expanded", "true");
    await userEvent.keyboard("{Escape}");
    expect(openButton).toHaveAttribute("aria-expanded", "false");

    await userEvent.click(openButton);
    await userEvent.click(screen.getByRole("button", { name: "Close the menu" }));
    expect(openButton).toHaveAttribute("aria-expanded", "false");

    await userEvent.click(openButton);
    await userEvent.click(screen.getByRole("link", { name: "Tasks" }));
    expect(openButton).toHaveAttribute("aria-expanded", "false");
  });
});

describe("AppShell on a phone", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "matchMedia",
      fakeMatchMedia(
        () => false,
        (query) => query === PHONE_QUERY || query.includes("64.0625rem"),
      ).matchMedia,
    );
  });

  it("shows the tab bar, with Menu opening the slide-out sidebar", async () => {
    await renderShellFor(ADMIN_CONTEXT);
    const bar = screen.getByRole("navigation", { name: "Quick links" });
    const menu = within(bar).getByRole("button", { name: "Menu" });

    await userEvent.click(menu);

    expect(menu).toHaveAttribute("aria-expanded", "true");
    await userEvent.keyboard("{Escape}");
    expect(menu).toHaveAttribute("aria-expanded", "false");
  });

  it("shows the office's logo without its name in the top bar: the name is in the menu", async () => {
    await renderShellFor(TEACHER_CONTEXT);

    const topBar = screen.getByRole("banner");
    expect(topBar).toHaveTextContent("AE");
    expect(within(topBar).queryByText("Acme Education")).not.toBeInTheDocument();
    expect(document.getElementById("side-nav")).toHaveTextContent("Acme Education");
  });

  it("drops ☰ and light/dark from the top bar, and has light/dark in the side menu", async () => {
    await renderShellFor(TEACHER_CONTEXT);

    const topBar = screen.getByRole("banner");
    expect(within(topBar).queryByRole("button", { name: "Open the menu" })).not.toBeInTheDocument();
    expect(
      within(topBar).queryByRole("button", { name: "Switch to dark mode" }),
    ).not.toBeInTheDocument();
    expect(within(topBar).getByRole("button", { name: "Ram Thapa, your menu" })).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Switch to dark mode" }));
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("leaves room under the page for the tab bar", async () => {
    await renderShellFor(TEACHER_CONTEXT);

    expect(screen.getByRole("main")).toHaveClass("max-phone:pb-tabbar-room");
  });
});

describe("AppShell above phone width", () => {
  it("has no tab bar", async () => {
    await renderShellFor(ADMIN_CONTEXT);

    expect(screen.queryByRole("navigation", { name: "Quick links" })).not.toBeInTheDocument();
  });

  it("names the office at the top left as plain text, never a link", async () => {
    await renderShellFor(ADMIN_CONTEXT);

    const name = within(screen.getByRole("banner")).getByText("Acme Education");
    expect(name).toBeVisible();
    expect(name.closest("a")).toBeNull();
  });

  it("keeps light/dark in the top bar, and none in the side menu", async () => {
    await renderShellFor(ADMIN_CONTEXT);

    expect(screen.getAllByRole("button", { name: "Switch to dark mode" })).toHaveLength(1);
    expect(
      within(screen.getByRole("banner")).getByRole("button", { name: "Switch to dark mode" }),
    ).toBeVisible();
  });
});

describe("AppShell's top bar", () => {
  it("finds a Student from the search box", async () => {
    await renderShellFor(ADMIN_CONTEXT);

    const search = screen.getByRole("search");
    await userEvent.type(
      within(search).getByRole("searchbox", { name: "Search Students and classes" }),
      "Sita{Enter}",
    );

    expect(router.push).toHaveBeenCalledWith("/students?q=Sita");
  });

  it("lets a Teacher search their own classes", async () => {
    await renderShellFor(TEACHER_CONTEXT);

    expect(screen.getByRole("searchbox", { name: "Search Students and classes" })).toHaveAttribute(
      "placeholder",
      "Find your class or a Student in it",
    );
  });

  it("opens the search from the search icon, with the cursor in the box", async () => {
    await renderShellFor(ADMIN_CONTEXT);
    const icon = screen.getByRole("button", { name: "Search" });
    expect(icon).toHaveAttribute("aria-expanded", "false");

    await userEvent.click(icon);

    expect(icon).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("searchbox", { name: "Search Students and classes" })).toHaveFocus();
    expect(screen.getByRole("button", { name: "Close search" })).toBeInTheDocument();
  });

  it("closes the opened search with the × and gives the cursor back to the icon", async () => {
    await renderShellFor(ADMIN_CONTEXT);
    const icon = screen.getByRole("button", { name: "Search" });
    await userEvent.click(icon);

    await userEvent.click(screen.getByRole("button", { name: "Close search" }));

    expect(icon).toHaveAttribute("aria-expanded", "false");
    expect(icon).toHaveFocus();
    expect(screen.queryByRole("button", { name: "Close search" })).not.toBeInTheDocument();
  });

  it("closes the opened search with Escape", async () => {
    await renderShellFor(ADMIN_CONTEXT);
    const icon = screen.getByRole("button", { name: "Search" });
    await userEvent.click(icon);

    await userEvent.keyboard("{Escape}");

    expect(icon).toHaveAttribute("aria-expanded", "false");
    expect(icon).toHaveFocus();
  });

  it("has no gear: Settings is in your menu, with My working hours while Clock-in is on", async () => {
    await renderShellFor({ ...TEACHER_CONTEXT, modules: [...TEACHER_CONTEXT.modules, "clock_in"] });

    expect(screen.queryByRole("link", { name: "Settings" })).not.toBeInTheDocument();

    const menu = await openYourMenu("Ram Thapa");

    expect(within(menu).getByText("Teacher")).toBeVisible();
    expect(within(menu).getByRole("menuitem", { name: "Settings" })).toHaveAttribute(
      "href",
      "/settings",
    );
    expect(within(menu).getByRole("menuitem", { name: "My working hours" })).toHaveAttribute(
      "href",
      "/clock",
    );
  });

  it("has no My working hours in your menu while Clock-in is off", async () => {
    await renderShellFor(TEACHER_CONTEXT);

    const menu = await openYourMenu("Ram Thapa");

    expect(within(menu).queryByRole("menuitem", { name: "My working hours" })).toBeNull();
  });

  it("opens the notifications, which says when there is nothing new", async () => {
    await renderShellFor(TEACHER_CONTEXT);
    const bell = screen.getByRole("button", { name: "Notifications" });

    await userEvent.click(bell);

    expect(screen.getByRole("dialog", { name: "Notifications" })).toHaveTextContent("Nothing new.");
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Notifications" })).not.toBeInTheDocument();
    expect(bell).toHaveFocus();
  });
});

describe("AppShell's search", () => {
  it("ignores an empty search", async () => {
    await renderShellFor(ADMIN_CONTEXT);

    await userEvent.type(
      screen.getByRole("searchbox", { name: "Search Students and classes" }),
      "   {Enter}",
    );

    expect(router.push).not.toHaveBeenCalled();
  });
});

const VISITOR_CONTEXT = {
  ...ADMIN_CONTEXT,
  staff: { ...ADMIN_CONTEXT.staff, id: uid(0), name: "Ramesh", email: "ramesh@platform.test" },
  support_access: { platform_admin_name: "Ramesh", platform_host: testHost("admin") },
};

describe("AppShell during Support Access", () => {
  it("tells the Platform Admin where they are, on every screen, with a way out", async () => {
    await renderShellFor(VISITOR_CONTEXT);

    expect(
      screen.getByText(
        "You're in Acme Education as Platform Admin. Your changes are recorded under your own name.",
      ),
    ).toBeVisible();
    expect(
      within(screen.getAllByRole("status")[0] ?? document.body).getByRole("button", {
        name: "Leave this office",
      }),
    ).toBeVisible();
  });

  it("shows a shield and Platform Admin in place of initials and Role", async () => {
    await renderShellFor({ ...VISITOR_CONTEXT, modules: [...ADMIN_CONTEXT.modules, "clock_in"] });

    expect(screen.getByRole("button", { name: "Ramesh, your menu" })).not.toHaveTextContent("R");
    const menu = await openYourMenu("Ramesh");
    expect(within(menu).getByText("Platform Admin")).toBeVisible();
    // A Platform Admin is not Staff: no working hours of their own.
    expect(within(menu).queryByRole("menuitem", { name: "My working hours" })).toBeNull();
  });

  it("leaves the office from your menu too, back to the Platform", async () => {
    const fetchFn = answerContextWith(jsonResponse(VISITOR_CONTEXT));
    render(<AppShell>page</AppShell>);
    await screen.findByText("page");

    const menu = await openYourMenu("Ramesh");
    await userEvent.click(within(menu).getByRole("menuitem", { name: "Leave this office" }));

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith(`http://${testHost("admin")}:3000/platform`);
    });
    expect(vi.mocked(fetchFn).mock.calls.map(([path]) => path)).toContain("/api/auth/logout/");
  });

  it("never saves light or dark: there is no account here to save it in", async () => {
    const fetchFn = answerContextWith(jsonResponse(VISITOR_CONTEXT));
    render(<AppShell>page</AppShell>);
    await screen.findByText("page");

    await userEvent.click(screen.getByRole("button", { name: "Switch to dark mode" }));

    expect(screen.getByRole("button", { name: "Switch to light mode" })).toBeInTheDocument();
    expect(vi.mocked(fetchFn).mock.calls.map(([path]) => path)).not.toContain("/api/me/");
  });

  it("shows no banner to Staff", async () => {
    await renderShellFor({ ...ADMIN_CONTEXT, support_access: null });

    expect(screen.queryByRole("button", { name: "Leave this office" })).not.toBeInTheDocument();
  });
});

describe("the copyright line at the end of every page (owner, 2026-11-27)", () => {
  it("sits under the page's content, inside the page, small and quiet", async () => {
    await renderShellFor(ADMIN_CONTEXT);

    const line = screen.getByText(copyrightLine(yearInNepal(new Date())));
    const footer = line.closest("footer");
    expect(footer).toHaveAttribute("data-page-footer");
    expect(screen.getByRole("main")).toContainElement(footer);
    expect(line).toHaveClass("text-small", "text-ink-3");
  });

  it("is left off a page that fills the window (the Inbox)", () => {
    const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

    expect(css).toMatch(
      /main:has\(\[data-fills-window\]\) > \[data-page-footer\] \{\s*display: none;/,
    );
  });
});
