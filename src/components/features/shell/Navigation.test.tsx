import { uid } from "@/test/ids";
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
    pathname.current = `/batches/${uid(4)}`;
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

describe("The side menu's look (UI revamp, ticket 05)", () => {
  it("puts each label under its icon above 1024, and beside it in the slide-out menu", () => {
    render(<Navigation role={Role.Teacher} modules={MODULES} />);

    const link = screen.getByRole("link", { name: "Tasks" });
    expect(link).toHaveClass("flex", "items-center", "wide:flex-col", "wide:text-rail");
    // A page is never a smaller target than 44, on any width.
    expect(link).toHaveClass("min-h-side-item", "wide:min-h-rail-item");
  });

  it("marks the open page in the accent colour, with a soft fill in the strip", () => {
    pathname.current = "/tasks";
    render(<Navigation role={Role.Teacher} modules={MODULES} />);

    const open = screen.getByRole("link", { name: "Tasks" });
    expect(open).toHaveClass("text-accent", "font-semibold");
    // The fill is one shade of its own behind the open page, so it can glide to it (ticket 22).
    expect(document.querySelectorAll("[data-marker]")).toHaveLength(1);
    expect(open.querySelector("[data-marker]")).toHaveClass(
      "bg-side-active",
      "hidden",
      "wide:block",
    );
    expect(open.querySelector("[data-marker]")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByRole("link", { name: "Home" })).not.toHaveClass("text-accent");
  });

  it("draws a line before the Business pages, and keeps the group's name for screen readers", () => {
    render(<Navigation role={Role.Admin} modules={MODULES} />);

    const heading = screen.getByRole("heading", { name: "Business" });
    expect(heading).toHaveClass("border-t", "border-rule-2", "wide:h-0", "wide:overflow-hidden");
  });

  it("scrolls on its own and fades at its foot", () => {
    render(<Navigation role={Role.Admin} modules={MODULES} />);

    expect(screen.getByRole("navigation", { name: "Main" })).toHaveClass(
      "overflow-y-auto",
      "menu-fade",
    );
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
      <InboxCheckContext value={{ unread: 2, latest: uid(9), refresh: vi.fn<() => void>() }}>
        <Navigation role={Role.Teacher} modules={MODULES} />
      </InboxCheckContext>,
    );

    const link = screen.getByRole("link", { name: /^Inbox/ });
    expect(link).toHaveAccessibleName("Inbox, 2 conversations with unread messages");
    expect(link).toHaveAttribute("href", "/inbox");
  });

  it("shows no count when everything is read", () => {
    render(
      <InboxCheckContext value={{ unread: 0, latest: uid(9), refresh: vi.fn<() => void>() }}>
        <Navigation role={Role.Admin} modules={MODULES} />
      </InboxCheckContext>,
    );

    expect(screen.getByRole("link", { name: "Inbox" })).toHaveTextContent(/^Inbox$/);
  });
});
