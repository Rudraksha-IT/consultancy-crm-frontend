import { act, render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { StaffContext } from "@/lib/api";
import { backend, callsTo, on, onEach } from "@/test/backend";

import { NotificationsButton } from "./NotificationsButton";
import { StaffContextContext } from "./staffContext";
import { consultancySummary } from "@/test/consultancy";
import { uid } from "@/test/ids";

const COUNSELLOR: StaffContext = {
  staff: { id: uid(5), name: "Bikash Thapa", email: "bikash@acme.test", role: "counsellor" },
  consultancy: consultancySummary(),
  modules: ["students", "tasks"],
  dateDisplay: "AD",
  colourMode: "light",
  supportAccess: null,
};

const GIVEN = {
  id: uid(3),
  kind: "assigned",
  created_at: "2026-11-02T09:12:00+05:45",
  is_read: false,
  task: { id: uid(31), title: "First counselling call with Manisha", due_on: "2026-11-03" },
  by: { id: uid(4), name: "Ramesh KC" },
  student: { id: uid(7), name: "Manisha Rai" },
  transfer_request: null,
};

const ASKED = {
  ...GIVEN,
  id: uid(6),
  kind: "transfer_asked",
  task: null,
  by: { id: uid(3), name: "Anjali Gurung" },
  student: { id: uid(13), name: "Sarina Khadka" },
  transfer_request: { id: uid(801), status: "waiting" },
};

const APPROVED = {
  ...ASKED,
  id: uid(5),
  kind: "transfer_approved",
  by: { id: null, name: "Ramesh (Platform Admin)" },
  transfer_request: { id: uid(801), status: "approved" },
};

const DECLINED = { ...APPROVED, id: uid(4), kind: "transfer_declined", is_read: true };

const BIN_ADDED = {
  ...ASKED,
  id: uid(9),
  kind: "bin_added",
  by: { id: uid(5), name: "Bikash Thapa" },
  transfer_request: null,
  bin: { item: "page-2.pdf of Passport", reason: "<b>Blurry</b>" },
};
const BIN_RESTORED = {
  ...BIN_ADDED,
  id: uid(10),
  kind: "bin_restored",
  by: { id: uid(1), name: "Anita Rai" },
};
const BIN_DELETED = { ...BIN_RESTORED, id: uid(11), kind: "bin_deleted" };

const WFH = {
  id: uid(20),
  staff_id: uid(5),
  starts_on: "2026-11-06",
  ends_on: "2026-11-12",
  status: "waiting",
};
const WFH_ASKED = {
  ...ASKED,
  id: uid(20),
  kind: "work_from_home_asked",
  by: { id: uid(5), name: "Bikash Thapa" },
  student: null,
  transfer_request: null,
  work_from_home: WFH,
};
const WFH_APPROVED = {
  ...WFH_ASKED,
  id: uid(21),
  kind: "work_from_home_approved",
  by: { id: uid(1), name: "Anita Rai" },
  work_from_home: { ...WFH, status: "approved" },
};
const WFH_DECLINED = { ...WFH_APPROVED, id: uid(22), kind: "work_from_home_declined" };
const WFH_SET = {
  ...WFH_APPROVED,
  id: uid(23),
  kind: "work_from_home_set",
  work_from_home: { ...WFH, ends_on: null, status: "approved" },
};

const OVERDUE = {
  ...GIVEN,
  id: uid(2),
  kind: "overdue",
  task: { id: uid(30), title: "Call Sita about her IELTS retake date", due_on: "2026-10-30" },
  by: null,
  student: null,
};

const DUE_TODAY = {
  ...OVERDUE,
  id: uid(1),
  kind: "due_today",
  is_read: true,
  task: { id: uid(29), title: "Collect the bank statement", due_on: "2026-11-02" },
};

const URL = "/api/notifications/";
const READ_ALL = "/api/notifications/read-all/";

function pageOf(results: unknown[], unread: number) {
  return { count: results.length, page: 1, page_size: 20, unread_count: unread, results };
}

function renderBell(context: StaffContext = COUNSELLOR) {
  return render(
    <StaffContextContext value={context}>
      <NotificationsButton />
    </StaffContextContext>,
  );
}

async function openBell(): Promise<HTMLElement> {
  await userEvent.click(await screen.findByRole("button", { name: /^Notifications/ }));
  return screen.getByRole("dialog", { name: "Notifications" });
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("The notification bell", () => {
  it("shows how many are unread, in its name as well as on the badge", async () => {
    backend(on("GET", URL, pageOf([GIVEN, OVERDUE, DUE_TODAY], 2)));
    renderBell();

    const bell = await screen.findByRole("button", { name: "Notifications, 2 unread" });

    expect(bell).toHaveTextContent("2");
  });

  it("has no badge when everything is read", async () => {
    const fetchFn = backend(on("GET", URL, pageOf([DUE_TODAY], 0)));
    renderBell();
    await waitFor(() => {
      expect(callsTo(fetchFn, "GET", URL)).toHaveLength(1);
    });

    const bell = screen.getByRole("button", { name: "Notifications" });

    expect(bell.textContent).toBe("");
  });

  it("shows 99+ for a very large count", async () => {
    backend(on("GET", URL, pageOf([GIVEN], 150)));
    renderBell();

    expect(
      await screen.findByRole("button", { name: "Notifications, 150 unread" }),
    ).toHaveTextContent("99+");
  });

  it("lists them newest first in plain words, with unread ones named as unread", async () => {
    backend(on("GET", URL, pageOf([GIVEN, OVERDUE, DUE_TODAY], 2)));
    renderBell();

    const panel = await openBell();
    const items = within(panel).getAllByRole("listitem");

    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent(
      "Unread Ramesh KC assigned you a Task: First counselling call with Manisha",
    );
    expect(items[0]).toHaveTextContent("2 Nov 2026");
    expect(items[1]).toHaveTextContent(
      "Unread Task overdue: Call Sita about her IELTS retake date",
    );
    expect(items[2]).toHaveTextContent("Task due today: Collect the bank statement");
    expect(items[2]).not.toHaveTextContent("Unread");
  });

  it("says what was put in, restored from or deleted from the Bin, as text", async () => {
    backend(on("GET", URL, pageOf([BIN_ADDED, BIN_RESTORED, BIN_DELETED], 3)));
    renderBell();

    const panel = await openBell();
    const items = within(panel).getAllByRole("listitem");

    expect(items[0]).toHaveTextContent(
      "Bikash Thapa put page-2.pdf of Passport (Sarina Khadka) in the Bin: <b>Blurry</b>",
    );
    expect(items[1]).toHaveTextContent(
      "Anita Rai restored page-2.pdf of Passport (Sarina Khadka) from the Bin",
    );
    expect(items[2]).toHaveTextContent(
      "Anita Rai deleted page-2.pdf of Passport (Sarina Khadka) for good from the Bin",
    );
    expect(panel.querySelector("b")).toBeNull();
  });

  it("says what happened to Work from home dates, linking to where they are", async () => {
    backend(on("GET", URL, pageOf([WFH_ASKED, WFH_APPROVED, WFH_DECLINED, WFH_SET], 4)));
    renderBell();

    const panel = await openBell();
    const items = within(panel).getAllByRole("listitem");
    const [asked, approved] = items;
    if (asked === undefined || approved === undefined) throw new Error("missing notifications");

    expect(asked).toHaveTextContent(
      "Bikash Thapa asked to work from home: 6 Nov 2026 to 12 Nov 2026",
    );
    expect(within(asked).getByRole("link", { name: "Open" })).toHaveAttribute(
      "href",
      `/staff/${uid(5)}?tab=wfh`,
    );
    expect(approved).toHaveTextContent(
      "Anita Rai approved your work from home dates: 6 Nov 2026 to 12 Nov 2026",
    );
    expect(within(approved).getByRole("link", { name: "Open" })).toHaveAttribute("href", "/clock");
    expect(items[2]).toHaveTextContent(
      "Anita Rai declined your work from home dates: 6 Nov 2026 to 12 Nov 2026",
    );
    expect(items[3]).toHaveTextContent(
      "Anita Rai set work from home dates for you: 6 Nov 2026 onwards, no end date",
    );
  });

  it("says what happened to a Transfer Request, linking to the Student", async () => {
    backend(on("GET", URL, pageOf([ASKED, APPROVED, DECLINED], 2)));
    renderBell();

    const panel = await openBell();
    const items = within(panel).getAllByRole("listitem");

    expect(items[0]).toHaveTextContent("Unread Anjali Gurung asked to take Sarina Khadka");
    expect(items[1]).toHaveTextContent(
      "Unread Ramesh (Platform Admin) approved your request: Sarina Khadka is now your Student",
    );
    expect(items[2]).toHaveTextContent(
      "Ramesh (Platform Admin) declined your request for Sarina Khadka",
    );
    expect(within(panel).getAllByRole("link", { name: "Open Student" })[0]).toHaveAttribute(
      "href",
      `/students/${uid(13)}`,
    );
  });

  it("links to the Student, marking that one read", async () => {
    const fetchFn = backend(
      on("GET", URL, pageOf([GIVEN], 1)),
      on("PATCH", `/api/notifications/${uid(3)}/`, { ...GIVEN, is_read: true }),
    );
    renderBell();
    const panel = await openBell();
    const link = within(panel).getByRole("link", { name: "Open Student" });

    expect(link).toHaveAttribute("href", `/students/${uid(7)}`);
    await userEvent.click(link);

    const [call] = callsTo(fetchFn, "PATCH", `/api/notifications/${uid(3)}/`);
    expect(call?.[1]?.body).toBe(JSON.stringify({ read: true }));
    expect(screen.queryByRole("dialog", { name: "Notifications" })).not.toBeInTheDocument();
  });

  it("has no Student link when there is no Student to show", async () => {
    backend(on("GET", URL, pageOf([OVERDUE], 1)));
    renderBell();

    const panel = await openBell();

    expect(within(panel).queryByRole("link")).not.toBeInTheDocument();
  });

  it("marks all as read and clears the badge", async () => {
    let unread = 2;
    const fetchFn = backend(
      onEach("GET", URL, () =>
        pageOf(
          [GIVEN, OVERDUE].map((item) => ({ ...item, is_read: unread === 0 })),
          unread,
        ),
      ),
      (path, init) => {
        if (path !== READ_ALL || init?.method !== "POST") return undefined;
        unread = 0;
        return new Response(JSON.stringify({ unread_count: 0 }), { status: 200 });
      },
    );
    renderBell();
    const panel = await openBell();

    await userEvent.click(within(panel).getByRole("button", { name: "Mark all as read" }));

    expect(callsTo(fetchFn, "POST", READ_ALL)).toHaveLength(1);
    expect(await screen.findByRole("button", { name: "Notifications" })).toBeInTheDocument();
    expect(within(panel).queryByText("Unread")).not.toBeInTheDocument();
    expect(within(panel).getByRole("button", { name: "Mark all as read" })).toBeDisabled();
  });

  it("says so when marking all as read fails", async () => {
    backend(on("GET", URL, pageOf([GIVEN], 1)), on("POST", READ_ALL, { detail: "x" }, 500));
    renderBell();
    const panel = await openBell();

    await userEvent.click(within(panel).getByRole("button", { name: "Mark all as read" }));

    expect(await within(panel).findByRole("alert")).toHaveTextContent(
      "We couldn't mark them as read. Please try again.",
    );
    expect(screen.getByRole("button", { name: "Notifications, 1 unread" })).toBeInTheDocument();
  });

  it("says when there is nothing", async () => {
    backend(on("GET", URL, pageOf([], 0)));
    renderBell();

    const panel = await openBell();

    expect(panel).toHaveTextContent("Nothing new.");
  });

  it("says so when they can't be loaded", async () => {
    backend(on("GET", URL, { detail: "x" }, 500));
    renderBell();

    const panel = await openBell();

    expect(await within(panel).findByRole("alert")).toHaveTextContent(
      "We couldn't load your notifications. Please try again.",
    );
  });

  it("refuses an answer that isn't what the API promises", async () => {
    backend(on("GET", URL, pageOf([{ ...GIVEN, kind: "<script>" }], 1)));
    renderBell();

    const panel = await openBell();

    expect(await within(panel).findByRole("alert")).toBeInTheDocument();
    expect(panel).not.toHaveTextContent("<script>");
  });

  it("shows typed titles as text, never as HTML", async () => {
    const title = "<img src=x onerror=alert(1)>";
    backend(on("GET", URL, pageOf([{ ...GIVEN, task: { ...GIVEN.task, title } }], 1)));
    renderBell();

    const panel = await openBell();

    expect(panel).toHaveTextContent(`Ramesh KC assigned you a Task: ${title}`);
    expect(panel.querySelector("img")).toBeNull();
  });

  it("asks again every minute, and when opened, so due Tasks show up", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    const fetchFn = backend(on("GET", URL, pageOf([], 0)));
    renderBell();
    await waitFor(() => {
      expect(callsTo(fetchFn, "GET", URL)).toHaveLength(1);
    });

    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    await waitFor(() => {
      expect(callsTo(fetchFn, "GET", URL)).toHaveLength(2);
    });
    vi.useRealTimers();
    await openBell();

    await waitFor(() => {
      expect(callsTo(fetchFn, "GET", URL)).toHaveLength(3);
    });
  });

  it("moves focus in, and closes with Escape back to the bell", async () => {
    backend(on("GET", URL, pageOf([GIVEN], 1)));
    renderBell();
    const panel = await openBell();

    expect(panel).toHaveFocus();
    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("dialog", { name: "Notifications" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Notifications, 1 unread" })).toHaveFocus();
  });

  it("closes when clicking outside it", async () => {
    backend(on("GET", URL, pageOf([GIVEN], 1)));
    renderBell();
    await openBell();

    await userEvent.click(document.body);

    expect(screen.queryByRole("dialog", { name: "Notifications" })).not.toBeInTheDocument();
  });

  it("shows the time in the office's calendar", async () => {
    backend(on("GET", URL, pageOf([GIVEN], 1)));
    renderBell({ ...COUNSELLOR, dateDisplay: "BS" });

    const panel = await openBell();

    expect(panel).toHaveTextContent("2083");
  });
});
