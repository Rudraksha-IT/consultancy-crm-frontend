import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { MODULES, Module } from "@/constants/modules";
import { Role } from "@/constants/roles";
import { testHost } from "@/test/hosts";
import { uid } from "@/test/ids";

import { YourMenu } from "./YourMenu";

const navigate = vi.hoisted(() => vi.fn<(path: string) => void>());
vi.mock("@/hooks/useFullPageNavigation", () => ({ useFullPageNavigation: () => navigate }));

const STAFF = { id: uid(3), name: "Ram Thapa", email: "ram@acme.test", role: Role.Counsellor };
const WITHOUT_CLOCK_IN = MODULES.filter((module) => module !== Module.ClockIn);
const VISIT = { platformAdminName: "Ramesh", platformHost: testHost("admin") };

type Options = {
  role?: Role;
  modules?: Module[];
  supportAccess?: typeof VISIT | null;
};

function renderMenu({ role = Role.Counsellor, modules = MODULES, supportAccess = null }: Options) {
  render(
    <>
      <YourMenu staff={{ ...STAFF, role }} modules={modules} supportAccess={supportAccess} />
      <p>the page</p>
    </>,
  );
}

function menuButton(): HTMLElement {
  return screen.getByRole("button", { name: "Ram Thapa, your menu" });
}

async function openMenu(): Promise<HTMLElement> {
  await userEvent.click(menuButton());
  return screen.getByRole("menu", { name: "Your menu" });
}

function answerLogoutWith(answer: () => Promise<Response>): typeof fetch {
  const fetchFn = vi.fn<typeof fetch>().mockImplementation(answer);
  vi.stubGlobal("fetch", fetchFn);
  return fetchFn;
}

beforeEach(() => {
  navigate.mockReset();
});

describe("Your menu", () => {
  it("is closed until the initials are pressed", () => {
    renderMenu({});

    expect(menuButton()).toHaveTextContent("RT");
    expect(menuButton()).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("shows my name and Role, then My working hours, Settings and Log out", async () => {
    renderMenu({});

    const menu = await openMenu();

    expect(menuButton()).toHaveAttribute("aria-expanded", "true");
    expect(within(menu).getByText("Ram Thapa")).toBeVisible();
    expect(within(menu).getByText("Counsellor")).toBeVisible();
    const items = within(menu).getAllByRole("menuitem");
    expect(items.map((item) => item.textContent)).toEqual([
      "My working hours",
      "Settings",
      "Log out",
    ]);
    expect(items[0]).toHaveAttribute("href", "/clock");
    expect(items[1]).toHaveAttribute("href", "/settings");
  });

  it.each([
    [Role.Admin, "Admin"],
    [Role.Counsellor, "Counsellor"],
    [Role.FrontDesk, "Front Desk"],
    [Role.Teacher, "Teacher"],
  ])("gives a %s the same menu, with their Role", async (role, label) => {
    renderMenu({ role });

    const menu = await openMenu();

    expect(within(menu).getByText(label)).toBeVisible();
    expect(within(menu).getAllByRole("menuitem")).toHaveLength(3);
  });

  it("has no My working hours while Clock-in is off", async () => {
    renderMenu({ modules: WITHOUT_CLOCK_IN });

    const menu = await openMenu();

    expect(
      within(menu)
        .getAllByRole("menuitem")
        .map((item) => item.textContent),
    ).toEqual(["Settings", "Log out"]);
  });

  it("moves the cursor into the menu, and the arrow keys move between its items", async () => {
    renderMenu({});

    const menu = await openMenu();
    const items = within(menu).getAllByRole("menuitem");

    expect(items[0]).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}");
    expect(items[1]).toHaveFocus();
  });

  it("closes with Escape and gives the cursor back to the initials", async () => {
    renderMenu({});
    await openMenu();

    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(menuButton()).toHaveFocus();
  });

  it("closes on a click outside it, and on the initials again", async () => {
    renderMenu({});
    await openMenu();

    await userEvent.click(screen.getByText("the page"));
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    await openMenu();
    await userEvent.click(menuButton());
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("closes once a page is picked from it", async () => {
    renderMenu({});
    const menu = await openMenu();

    await userEvent.click(within(menu).getByRole("menuitem", { name: "Settings" }));

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("logs out and loads the login page afresh", async () => {
    const fetchFn = answerLogoutWith(() => Promise.resolve(new Response(null, { status: 204 })));
    renderMenu({});
    const menu = await openMenu();

    await userEvent.click(within(menu).getByRole("menuitem", { name: "Log out" }));

    expect(fetchFn).toHaveBeenCalledWith(
      "/api/auth/logout/",
      expect.objectContaining({ method: "POST" }),
    );
    expect(navigate).toHaveBeenCalledWith("/login");
  });

  it("can't be opened again while logging out", async () => {
    answerLogoutWith(() => new Promise(() => undefined));
    renderMenu({});
    const menu = await openMenu();

    await userEvent.click(within(menu).getByRole("menuitem", { name: "Log out" }));

    expect(screen.getByRole("button", { name: "Logging out…" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    await userEvent.click(screen.getByRole("button", { name: "Logging out…" }));
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("stays logged in and says so when logging out fails", async () => {
    answerLogoutWith(() => Promise.reject(new TypeError("offline")));
    renderMenu({});
    const menu = await openMenu();

    await userEvent.click(within(menu).getByRole("menuitem", { name: "Log out" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "We couldn't log you out. Please try again.",
    );
    expect(menuButton()).toHaveAttribute("aria-disabled", "false");
    expect(menuButton()).toHaveFocus();
    expect(navigate).not.toHaveBeenCalled();
  });
});

describe("Your menu during Support Access", () => {
  it("shows a shield and Platform Admin, with no My working hours", async () => {
    renderMenu({ role: Role.Admin, supportAccess: VISIT });

    const menu = await openMenu();

    expect(menuButton()).not.toHaveTextContent("RT");
    expect(within(menu).getByText("Platform Admin")).toBeVisible();
    expect(within(menu).queryByText("Admin")).not.toBeInTheDocument();
    expect(
      within(menu)
        .getAllByRole("menuitem")
        .map((item) => item.textContent),
    ).toEqual(["Settings", "Leave this office"]);
  });

  it("leaves the office, back to the Platform", async () => {
    const fetchFn = answerLogoutWith(() => Promise.resolve(new Response(null, { status: 204 })));
    renderMenu({ role: Role.Admin, supportAccess: VISIT });
    const menu = await openMenu();

    await userEvent.click(within(menu).getByRole("menuitem", { name: "Leave this office" }));

    expect(fetchFn).toHaveBeenCalledWith(
      "/api/auth/logout/",
      expect.objectContaining({ method: "POST" }),
    );
    expect(navigate).toHaveBeenCalledWith(`http://${VISIT.platformHost}:3000/platform`);
  });

  it("says so when leaving fails", async () => {
    answerLogoutWith(() => Promise.reject(new TypeError("offline")));
    renderMenu({ role: Role.Admin, supportAccess: VISIT });
    const menu = await openMenu();

    await userEvent.click(within(menu).getByRole("menuitem", { name: "Leave this office" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "You couldn't leave the office. Try again.",
    );
  });
});
