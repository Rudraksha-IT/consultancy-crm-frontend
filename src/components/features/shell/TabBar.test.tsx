import { uid } from "@/test/ids";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { PHONE_QUERY } from "@/components/ui/usePhoneWidth";
import { MODULES, Module } from "@/constants/modules";
import { Role } from "@/constants/roles";
import { fakeMatchMedia } from "@/test/matchMedia";

import { InboxCheckContext } from "./inboxCheck";
import { TabBar } from "./TabBar";
import { TaskCountContext } from "./taskCount";

const pathname = vi.hoisted(() => ({ current: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => pathname.current }));
// A tap only marks the tab here; the page itself never changes in these tests.
vi.mock("next/link", () => ({
  default: ({
    onClick,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a
      {...props}
      onClick={(event) => {
        onClick?.(event);
        event.preventDefault();
      }}
    />
  ),
}));

function doNothing(): void {
  return undefined;
}

function bar(): HTMLElement {
  return screen.getByRole("navigation", { name: "Quick links" });
}

function tabNames(): string[] {
  return within(bar())
    .getAllByRole("link")
    .map((link) => link.textContent);
}

function menuButton(): HTMLElement {
  return within(bar()).getByRole("button", { name: "Menu" });
}

type Shown = { role?: Role; modules?: readonly Module[]; onOpenMenu?: () => void };

function showBar({ role = Role.Admin, modules = MODULES, onOpenMenu = doNothing }: Shown = {}) {
  return render(
    <TabBar role={role} modules={modules} isMenuOpen={false} onOpenMenu={onOpenMenu} />,
  );
}

describe("TabBar", () => {
  beforeEach(() => {
    pathname.current = "/";
    vi.stubGlobal(
      "matchMedia",
      fakeMatchMedia(
        () => false,
        (query) => query === PHONE_QUERY,
      ).matchMedia,
    );
  });

  it("shows Home, Students, Tasks and Inbox, then Menu", () => {
    showBar();

    expect(tabNames()).toEqual(["Home", "Students", "Tasks", "Inbox"]);
    expect(menuButton()).toBeInTheDocument();
  });

  it("calls Front Desk's Home just Home, as the bar has no room for Visitor desk", () => {
    showBar({ role: Role.FrontDesk });

    expect(tabNames()).toEqual(["Home", "Students", "Tasks", "Inbox"]);
  });

  it("shows a Teacher Classes in place of Students", () => {
    showBar({ role: Role.Teacher });

    expect(tabNames()).toEqual(["Home", "Classes", "Tasks", "Inbox"]);
    expect(within(bar()).getByRole("link", { name: "Classes" })).toHaveAttribute(
      "href",
      "/batches",
    );
  });

  it("leaves out a page the sidebar doesn't have, such as Classes with test prep off", () => {
    showBar({ role: Role.Teacher, modules: MODULES.filter((m) => m !== Module.Batches) });

    expect(tabNames()).toEqual(["Home", "Tasks", "Inbox"]);
  });

  it("marks the current page, also on a page under it", () => {
    pathname.current = `/students/${uid(12)}`;
    showBar();

    expect(within(bar()).getByRole("link", { name: "Students" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(bar()).getByRole("link", { name: "Home" })).not.toHaveAttribute("aria-current");
    expect(menuButton()).not.toHaveAttribute("data-current");
  });

  it("moves the pill to a tapped tab at once, before the page has changed (owner)", async () => {
    const user = userEvent.setup();
    showBar();
    const tasks = within(bar()).getByRole("link", { name: "Tasks" });

    await user.click(tasks);

    expect(tasks).toHaveAttribute("data-current");
    expect(within(bar()).getByRole("link", { name: "Home" })).not.toHaveAttribute("data-current");
    // Screen readers still hear the page that is open until the next one has come.
    expect(within(bar()).getByRole("link", { name: "Home" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("slides only the pill: it is a layer of its own behind the icon (owner)", () => {
    showBar();

    const markers = bar().querySelectorAll("[data-marker]");
    expect(markers).toHaveLength(1);
    const pill = markers[0];
    expect(pill).toHaveClass("bg-tint", "absolute", "inset-0");
    expect(pill?.querySelector("svg")).toBeNull();
  });

  it("shows Menu as current on a page that isn't in the bar", () => {
    pathname.current = "/reports";
    showBar();

    expect(menuButton()).toHaveAttribute("data-current");
    for (const link of within(bar()).getAllByRole("link")) {
      expect(link).not.toHaveAttribute("aria-current");
    }
  });

  it("shows the same counts as the sidebar, with their meaning for screen readers", () => {
    render(
      <TaskCountContext value={{ count: 3, refresh: doNothing }}>
        <InboxCheckContext value={{ unread: 2, latest: uid(9), refresh: doNothing }}>
          <TabBar role={Role.Admin} modules={MODULES} isMenuOpen={false} onOpenMenu={doNothing} />
        </InboxCheckContext>
      </TaskCountContext>,
    );

    expect(within(bar()).getByRole("link", { name: /^Tasks/ })).toHaveAccessibleName(
      "Tasks, 3 due today or overdue",
    );
    expect(within(bar()).getByRole("link", { name: /^Inbox/ })).toHaveAccessibleName(
      "Inbox, 2 conversations with unread messages",
    );
    expect(within(bar()).getByRole("link", { name: "Home" })).toBeInTheDocument();
  });

  it("shows no badge for 0", () => {
    showBar();

    expect(within(bar()).getByRole("link", { name: "Tasks" })).toHaveTextContent(/^Tasks$/);
  });

  it("opens the slide-out sidebar from Menu", async () => {
    const onOpenMenu = vi.fn();
    showBar({ onOpenMenu });

    await userEvent.click(menuButton());

    expect(onOpenMenu).toHaveBeenCalledOnce();
    expect(menuButton()).toHaveAttribute("aria-controls", "side-nav");
    expect(menuButton()).toHaveAttribute("aria-expanded", "false");
  });

  it("is only shown on phones", () => {
    vi.stubGlobal("matchMedia", fakeMatchMedia(() => false).matchMedia);
    showBar();

    expect(screen.queryByRole("navigation", { name: "Quick links" })).not.toBeInTheDocument();
  });
});
