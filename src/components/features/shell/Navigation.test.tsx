import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { MODULES, Module } from "@/constants/modules";
import { Role } from "@/constants/roles";

import { InboxCheckContext } from "./inboxCheck";
import { TransferCountContext } from "./menuCount";
import { Navigation } from "./Navigation";
import { TaskCountContext } from "./taskCount";

const pathname = vi.hoisted(() => ({ current: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => pathname.current }));

const WITHOUT_TEST_PREP = MODULES.filter((module) => module !== Module.Batches);

function linkNames(): string[] {
  const nav = screen.getByRole("navigation", { name: "Main" });
  return within(nav)
    .getAllByRole("link")
    .map((link) => link.textContent);
}

describe("Navigation", () => {
  it("shows an Admin every screen", () => {
    render(<Navigation role={Role.Admin} modules={MODULES} />);

    expect(linkNames()).toEqual([
      "Home",
      "Students",
      "Applications",
      "Visas",
      "Documents",
      "Classes",
      "Tasks",
      "Inbox",
      "Transfer requests",
      "Email",
      "Accounts",
      "Employees",
      "Reports",
      "Catalogue",
      "Configuration",
    ]);
    expect(screen.getByRole("heading", { name: "Business" })).toBeInTheDocument();
  });

  it("shows a Teacher only Home, their classes and Tasks, with no Business heading", () => {
    render(<Navigation role={Role.Teacher} modules={MODULES} />);

    expect(linkNames()).toEqual(["Home", "Classes", "Tasks", "Inbox"]);
    expect(screen.queryByRole("heading", { name: "Business" })).not.toBeInTheDocument();
  });

  it("hides classes when the test-prep Module is off", () => {
    render(<Navigation role={Role.Counsellor} modules={WITHOUT_TEST_PREP} />);

    expect(linkNames()).toEqual([
      "Home",
      "Students",
      "Applications",
      "Visas",
      "Documents",
      "Tasks",
      "Inbox",
      "Transfer requests",
      "Email",
    ]);
  });

  it("hides Email when the Communication Module is off", () => {
    render(
      <Navigation
        role={Role.FrontDesk}
        modules={MODULES.filter((module) => module !== Module.Communication)}
      />,
    );

    expect(linkNames()).toEqual([
      "Visitor desk",
      "Students",
      "Applications",
      "Visas",
      "Tasks",
      "Inbox",
      "Transfer requests",
    ]);
  });

  it("links to each screen and marks the current one", () => {
    pathname.current = "/tasks";
    render(<Navigation role={Role.Teacher} modules={MODULES} />);

    expect(screen.getByRole("link", { name: "Tasks" })).toHaveAttribute("href", "/tasks");
    expect(screen.getByRole("link", { name: "Tasks" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Home" })).not.toHaveAttribute("aria-current");
  });

  it("marks a screen's section as current on its inner pages", () => {
    pathname.current = "/batches/4";
    render(<Navigation role={Role.Teacher} modules={MODULES} />);

    expect(screen.getByRole("link", { name: "Classes" })).toHaveAttribute("aria-current", "page");
  });

  it("tells its parent when a link is followed, so the slide-out menu can close", async () => {
    const handleNavigate = vi.fn();
    render(<Navigation role={Role.Teacher} modules={MODULES} onNavigate={handleNavigate} />);

    await userEvent.click(screen.getByRole("link", { name: "Tasks" }));

    expect(handleNavigate).toHaveBeenCalledOnce();
  });
});

describe("The Tasks count", () => {
  it("shows my Tasks due today or overdue beside Tasks, named for screen readers", () => {
    render(
      <TaskCountContext value={{ count: 3, refresh: vi.fn<() => void>() }}>
        <Navigation role={Role.Counsellor} modules={MODULES} />
      </TaskCountContext>,
    );

    const tasks = screen.getByRole("link", { name: /^Tasks/ });
    expect(tasks).toHaveAccessibleName("Tasks, 3 due today or overdue");
    expect(within(tasks).getByText("3")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Students" })).toBeInTheDocument();
  });

  it("shows nothing when none are due", () => {
    render(
      <TaskCountContext value={{ count: 0, refresh: vi.fn<() => void>() }}>
        <Navigation role={Role.Counsellor} modules={MODULES} />
      </TaskCountContext>,
    );

    expect(screen.getByRole("link", { name: "Tasks" })).toHaveTextContent(/^Tasks$/);
  });

  it("stays on the icon when the sidebar is collapsed", () => {
    render(
      <TaskCountContext value={{ count: 12, refresh: vi.fn<() => void>() }}>
        <Navigation role={Role.Teacher} modules={MODULES} isCollapsed />
      </TaskCountContext>,
    );

    expect(screen.getByRole("link", { name: /^Tasks/ })).toHaveAccessibleName(
      "Tasks, 12 due today or overdue",
    );
  });
});

describe("The Transfer requests count", () => {
  it("shows the requests waiting for my answer, named for screen readers", () => {
    render(
      <TransferCountContext value={{ count: 2, refresh: vi.fn<() => void>() }}>
        <Navigation role={Role.FrontDesk} modules={MODULES} />
      </TransferCountContext>,
    );

    const link = screen.getByRole("link", { name: /^Transfer requests/ });
    expect(link).toHaveAccessibleName("Transfer requests, 2 requests waiting for you");
    expect(link).toHaveAttribute("href", "/transfer-requests");
    expect(screen.getByRole("link", { name: "Tasks" })).toHaveTextContent(/^Tasks$/);
  });

  it("says one request plainly", () => {
    render(
      <TransferCountContext value={{ count: 1, refresh: vi.fn<() => void>() }}>
        <Navigation role={Role.Admin} modules={MODULES} />
      </TransferCountContext>,
    );

    expect(screen.getByRole("link", { name: /^Transfer requests/ })).toHaveAccessibleName(
      "Transfer requests, 1 request waiting for you",
    );
  });
});

describe("The Inbox count", () => {
  it("counts conversations with unread messages, named for screen readers", () => {
    render(
      <InboxCheckContext value={{ unread: 2, latest: 9, refresh: vi.fn<() => void>() }}>
        <Navigation role={Role.Teacher} modules={MODULES} />
      </InboxCheckContext>,
    );

    const link = screen.getByRole("link", { name: /^Inbox/ });
    expect(link).toHaveAccessibleName("Inbox, 2 conversations with unread messages");
    expect(link).toHaveAttribute("href", "/inbox");
  });

  it("shows no count when everything is read", () => {
    render(
      <InboxCheckContext value={{ unread: 0, latest: 9, refresh: vi.fn<() => void>() }}>
        <Navigation role={Role.Admin} modules={MODULES} />
      </InboxCheckContext>,
    );

    expect(screen.getByRole("link", { name: "Inbox" })).toHaveTextContent(/^Inbox$/);
  });
});
