import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Module } from "@/constants/modules";
import { Role } from "@/constants/roles";
import { backend, callsTo, on } from "@/test/backend";

import { GlobalSearch } from "./GlobalSearch";
import { uid } from "@/test/ids";

const router = { push: vi.fn() };
const path = { current: "/" };
vi.mock("next/navigation", () => ({ useRouter: () => router, usePathname: () => path.current }));

const BOX = { name: "Search Students and classes" };
/** In the top bar above 1024px, where there is no full-width search to close. */
const WIDE = { isExpanded: false, onCollapse: () => undefined };
const SITA = {
  kind: "student",
  id: uid(2),
  name: "Sita Karki",
  phone: "9841234567",
  stage: "counselling",
  assigned_counsellor: { id: 5, name: "Bikash Thapa" },
};
const ASHA = {
  ...SITA,
  id: uid(3),
  name: "Asha Sapkota",
  stage: "lead",
  assigned_counsellor: null,
};
const MORNING = { id: 7, name: "IELTS Morning", time_slot: "7:00-8:30 AM" };

function searchUrl(text: string): string {
  return `/api/search/?${new URLSearchParams({ q: text }).toString()}`;
}

function answer(text: string, body: unknown, status = 200) {
  return on("GET", searchUrl(text), body, status);
}

function renderSearch(role: Role = Role.Admin, modules: Module[] = [Module.Batches]) {
  const user = userEvent.setup();
  const view = render(<GlobalSearch role={role} modules={modules} {...WIDE} />);
  return { user, box: screen.getByRole("searchbox", BOX), ...view };
}

/** Let the 250 ms pause pass and the answer arrive. */
async function settle(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 300);
    });
  });
}

beforeEach(() => {
  router.push.mockClear();
  path.current = "/";
});

describe("GlobalSearch", () => {
  it("waits for typing to pause, then shows Students and classes in named groups", async () => {
    const fetchFn = backend(
      answer("sa", { students: [SITA, ASHA], student_count: 2, batches: [MORNING] }),
    );
    const { user, box } = renderSearch();

    await user.type(box, "sa");
    expect(fetchFn).not.toHaveBeenCalled();
    await settle();

    const results = screen.getByRole("region", { name: "Search results" });
    const students = within(results).getByRole("group", { name: "Students" });
    expect(
      within(students)
        .getAllByRole("link")
        .map((link) => link.textContent),
    ).toEqual([
      "Sita Karki 9841234567Counselling, Bikash Thapa",
      "Asha Sapkota 9841234567Lead, no counsellor yet",
    ]);
    expect(within(students).getByRole("link", { name: /Sita Karki/ })).toHaveAttribute(
      "href",
      `/students/${uid(2)}`,
    );
    const classes = within(results).getByRole("group", { name: "Classes" });
    expect(within(classes).getByRole("link", { name: /IELTS Morning/ })).toHaveAttribute(
      "href",
      "/batches/7",
    );
    expect(within(classes).getByText("7:00-8:30 AM")).toBeInTheDocument();
    expect(
      within(results).getByRole("link", { name: "Open the Student list with this search" }),
    ).toHaveAttribute("href", "/students?q=sa");
    expect(box).toHaveAttribute("aria-controls", results.id);
  });

  it("offers every match on the Student list when there are more than five", async () => {
    backend(answer("sita", { students: [SITA], student_count: 12, batches: [] }));
    const { user, box } = renderSearch();

    await user.type(box, "sita");
    await settle();

    expect(
      screen.getByRole("link", { name: "See all 12 Students matching “sita”" }),
    ).toHaveAttribute("href", "/students?q=sita");
  });

  it("asks only once typing pauses, and only for the latest text", async () => {
    const fetchFn = backend(answer("sita", { students: [SITA], student_count: 1, batches: [] }));
    const { user, box } = renderSearch();

    await user.type(box, "s");
    await settle();
    await user.type(box, "ita");
    await settle();

    expect(fetchFn.mock.calls.map(([url]) => url)).toEqual([searchUrl("sita")]);
  });

  it("cancels a search still on its way when the text changes", async () => {
    const signals: AbortSignal[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init?: RequestInit) => {
        if (init?.signal) signals.push(init.signal);
        return new Promise<Response>(() => undefined);
      }),
    );
    const { user, box } = renderSearch();

    await user.type(box, "si");
    await settle();
    await user.type(box, "t");
    await settle();

    expect(signals.map((signal) => signal.aborted)).toEqual([true, false]);
    expect(screen.getByText("Searching…")).toBeInTheDocument();
  });

  it("says when nothing matches", async () => {
    backend(answer("zz", { students: [], student_count: 0, batches: [] }));
    const { user, box } = renderSearch();

    await user.type(box, "zz");
    await settle();

    expect(screen.getByRole("region", { name: "Search results" })).toHaveTextContent(
      "Nothing matches “zz”.",
    );
  });

  it("asks nothing for a single character", async () => {
    const fetchFn = backend();
    const { user, box } = renderSearch();

    await user.type(box, "s");
    await settle();

    expect(fetchFn).not.toHaveBeenCalled();
    expect(screen.queryByRole("region", { name: "Search results" })).not.toBeInTheDocument();
  });

  it("explains a rate limit and any other failure", async () => {
    backend(
      answer("sita", { detail: "Too many searches." }, 429),
      answer("ram", { detail: "Server error" }, 500),
    );
    const { user, box } = renderSearch();

    await user.type(box, "sita");
    await settle();
    expect(screen.getByText("Too many searches. Wait a minute and try again.")).toBeInTheDocument();

    await user.clear(box);
    await user.type(box, "ram");
    await settle();
    expect(
      screen.getByText("Search isn't working right now. Try again in a moment."),
    ).toBeInTheDocument();
  });

  it("refuses an answer of the wrong shape", async () => {
    backend(
      answer("sita", {
        students: [{ ...SITA, stage: "<b>won</b>" }],
        student_count: 1,
        batches: [],
      }),
    );
    const { user, box } = renderSearch();

    await user.type(box, "sita");
    await settle();

    expect(screen.queryByRole("link", { name: /Sita/ })).not.toBeInTheDocument();
    expect(screen.getByText(/isn't working right now/)).toBeInTheDocument();
  });

  it("moves through the results with the arrow keys and back to the box", async () => {
    backend(answer("sa", { students: [SITA, ASHA], student_count: 2, batches: [MORNING] }));
    const { user, box } = renderSearch();
    await user.type(box, "sa");
    await settle();
    const links = within(screen.getByRole("region", { name: "Search results" })).getAllByRole(
      "link",
    );

    await user.keyboard("{ArrowDown}");
    expect(links[0]).toHaveFocus();
    await user.keyboard("{ArrowDown}{ArrowDown}{ArrowDown}{ArrowDown}");
    expect(links[3]).toHaveFocus();
    await user.keyboard("{ArrowUp}{ArrowUp}{ArrowUp}{ArrowUp}");
    expect(box).toHaveFocus();
  });

  it("closes with Escape, clears the text and returns to the box", async () => {
    backend(answer("sita", { students: [SITA], student_count: 1, batches: [] }));
    const { user, box } = renderSearch();
    await user.type(box, "sita");
    await settle();
    await user.keyboard("{ArrowDown}");

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("region", { name: "Search results" })).not.toBeInTheDocument();
    expect(box).toHaveValue("");
    expect(box).toHaveFocus();
  });

  it("closes when someone clicks elsewhere, and opens again on focus", async () => {
    backend(answer("sita", { students: [SITA], student_count: 1, batches: [] }));
    const { user, box } = renderSearch();
    await user.type(box, "sita");
    await settle();

    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole("region", { name: "Search results" })).not.toBeInTheDocument();

    await user.click(box);
    expect(screen.getByRole("region", { name: "Search results" })).toBeInTheDocument();
  });

  it("closes and clears when another page opens", async () => {
    backend(answer("sita", { students: [SITA], student_count: 1, batches: [] }));
    const { user, box, rerender } = renderSearch();
    await user.type(box, "sita");
    await settle();

    path.current = `/students/${uid(2)}`;
    rerender(<GlobalSearch role={Role.Admin} modules={[Module.Batches]} {...WIDE} />);

    expect(screen.queryByRole("region", { name: "Search results" })).not.toBeInTheDocument();
    expect(box).toHaveValue("");
  });

  it("opens the Student list with the search on Enter", async () => {
    backend(answer("sita", { students: [], student_count: 0, batches: [] }));
    const { user, box } = renderSearch(Role.Counsellor);

    await user.type(box, "  sita {Enter}");

    expect(router.push).toHaveBeenCalledWith("/students?q=sita");
    expect(box).toHaveValue("");
  });

  it("shows nothing it was not sent as markup", async () => {
    backend(
      answer("<b", {
        students: [{ ...SITA, name: "<img src=x onerror=alert(1)>" }],
        student_count: 1,
        batches: [],
      }),
    );
    const { user, box, container } = renderSearch();

    await user.type(box, "<b");
    await settle();

    expect(screen.getByText("<img src=x onerror=alert(1)>")).toBeInTheDocument();
    expect(container.querySelector("img")).toBeNull();
  });
});

describe("GlobalSearch for each Role", () => {
  it("tells Front Desk it finds Students, and an office without classes the same", () => {
    renderSearch(Role.FrontDesk);
    expect(screen.getByRole("searchbox", BOX)).toHaveAttribute("placeholder", "Find a Student");
  });

  it("tells an office without classes it finds Students", () => {
    renderSearch(Role.Counsellor, []);
    expect(screen.getByRole("searchbox", BOX)).toHaveAttribute("placeholder", "Find a Student");
  });

  it("tells a counsellor it finds Students and classes", () => {
    renderSearch(Role.Counsellor);
    expect(screen.getByRole("searchbox", BOX)).toHaveAttribute(
      "placeholder",
      "Find a Student or a class",
    );
  });

  it("shows a Teacher their Students' classes, with no Student list to open", async () => {
    backend(
      answer("sita", {
        students: [
          {
            kind: "class_student",
            id: uid(2),
            name: "Sita Karki",
            batch: { id: 7, name: "IELTS Morning" },
          },
        ],
        student_count: 1,
        batches: [],
      }),
    );
    const { user, box } = renderSearch(Role.Teacher);

    await user.type(box, "sita");
    await settle();

    const link = screen.getByRole("link", { name: /Sita Karki/ });
    expect(link).toHaveAttribute("href", "/batches/7");
    expect(link).toHaveTextContent("In your class");
    expect(screen.queryByRole("link", { name: /Student list/ })).not.toBeInTheDocument();
    await user.keyboard("{Enter}");
    expect(router.push).not.toHaveBeenCalled();
    expect(link).toHaveFocus();
  });

  it("tells a Teacher they only find their own classes when nothing matches", async () => {
    backend(answer("zz", { students: [], student_count: 0, batches: [] }));
    const { user, box } = renderSearch(Role.Teacher);

    await user.type(box, "zz");
    await settle();

    expect(screen.getByRole("region", { name: "Search results" })).toHaveTextContent(
      "Nothing matches “zz”. You can only find your own classes.",
    );
  });
});

describe("GlobalSearch's shortcut", () => {
  it.each([
    ["Ctrl K", { key: "k", ctrlKey: true }],
    ["⌘ K", { key: "k", metaKey: true }],
    ["/", { key: "/" }],
  ])("%s puts the cursor in the box", (_, keys) => {
    const { box } = renderSearch();

    const event = new KeyboardEvent("keydown", { ...keys, bubbles: true, cancelable: true });
    document.body.dispatchEvent(event);

    expect(box).toHaveFocus();
    expect(event.defaultPrevented).toBe(true);
  });

  it("doesn't fire while someone types in another field", () => {
    render(
      <>
        <GlobalSearch role={Role.Admin} modules={[]} {...WIDE} />
        <label>
          Note
          <textarea />
        </label>
      </>,
    );
    const note = screen.getByRole("textbox", { name: "Note" });
    note.focus();

    fireEvent.keyDown(note, { key: "/" });
    fireEvent.keyDown(note, { key: "k", ctrlKey: true });

    expect(note).toHaveFocus();
  });

  it("doesn't fire while a dialog is open", () => {
    render(
      <>
        <GlobalSearch role={Role.Admin} modules={[]} {...WIDE} />
        <div role="dialog" aria-modal="true" aria-label="Add a fee">
          <button type="button">Close</button>
        </div>
      </>,
    );
    const close = screen.getByRole("button", { name: "Close" });
    close.focus();

    fireEvent.keyDown(close, { key: "k", ctrlKey: true });

    expect(close).toHaveFocus();
  });

  it("shows the Ctrl K hint until something is typed", async () => {
    const { user, box, container } = renderSearch();
    const hint = container.querySelector("kbd");
    expect(hint).toHaveTextContent("Ctrl K");
    expect(hint).toBeVisible();

    await user.type(box, "s");

    expect(hint).not.toBeVisible();
  });

  it("names the shortcut for screen readers", () => {
    const { box } = renderSearch();

    expect(box).toHaveAttribute("aria-keyshortcuts", "Control+K /");
  });

  it("lets a slash be typed into the box itself", async () => {
    const { user, box } = renderSearch();

    await user.type(box, "a/b");

    expect(box).toHaveValue("a/b");
  });
});

describe("GlobalSearch opened from the search icon (1024 px and below)", () => {
  function renderOpened(onCollapse = vi.fn<() => void>()) {
    const user = userEvent.setup();
    render(
      <GlobalSearch
        role={Role.Admin}
        modules={[Module.Batches]}
        isExpanded
        onCollapse={onCollapse}
      />,
    );
    return { user, onCollapse, box: screen.getByRole("searchbox", BOX) };
  }

  it("moves the cursor into the box when it opens", () => {
    const { box } = renderOpened();
    expect(box).toHaveFocus();
  });

  it("has no × while it sits in the top bar on wide screens", () => {
    renderSearch();
    expect(screen.queryByRole("button", { name: "Close search" })).not.toBeInTheDocument();
  });

  it("closes with the × and forgets the text", async () => {
    const { user, box, onCollapse } = renderOpened();
    await user.type(box, "si");
    await user.click(screen.getByRole("button", { name: "Close search" }));
    expect(onCollapse).toHaveBeenCalledOnce();
    expect(box).toHaveValue("");
  });

  it("clears the text with Escape first, then closes with the next Escape", async () => {
    backend(answer("sita", { students: [SITA], student_count: 1, batches: [] }));
    const { user, box, onCollapse } = renderOpened();
    await user.type(box, "sita");
    await settle();
    await user.keyboard("{Escape}");
    expect(box).toHaveValue("");
    expect(onCollapse).not.toHaveBeenCalled();
    await user.keyboard("{Escape}");
    expect(onCollapse).toHaveBeenCalledOnce();
  });

  it("shows the same results as on wide screens", async () => {
    backend(answer("sa", { students: [SITA, ASHA], student_count: 2, batches: [MORNING] }));
    const { user, box } = renderOpened();
    await user.type(box, "sa");
    await settle();
    const results = screen.getByRole("region", { name: "Search results" });
    expect(within(results).getByRole("link", { name: /Sita Karki/ })).toHaveAttribute(
      "href",
      `/students/${uid(2)}`,
    );
    expect(within(results).getByRole("link", { name: /IELTS Morning/ })).toBeInTheDocument();
    await user.keyboard("{ArrowDown}");
    expect(within(results).getAllByRole("link")[0]).toHaveFocus();
  });

  it("closes when a result opens another page", async () => {
    backend(answer("sita", { students: [SITA], student_count: 1, batches: [] }));
    const onCollapse = vi.fn<() => void>();
    const { user, box } = renderOpened(onCollapse);
    await user.type(box, "sita");
    await settle();
    path.current = `/students/${uid(2)}`;
    await user.click(screen.getByRole("link", { name: /Sita Karki/ }));
    expect(onCollapse).toHaveBeenCalled();
  });

  it("closes when the Student list opens with Enter", async () => {
    backend(answer("sita", { students: [], student_count: 0, batches: [] }));
    const { user, box, onCollapse } = renderOpened();
    await user.type(box, "sita{Enter}");
    expect(router.push).toHaveBeenCalledWith("/students?q=sita");
    expect(onCollapse).toHaveBeenCalledOnce();
  });
});

it("never calls the API with a POST", async () => {
  const fetchFn = backend(answer("sita", { students: [], student_count: 0, batches: [] }));
  const { user, box } = renderSearch();
  await user.type(box, "sita");
  await settle();
  expect(callsTo(fetchFn, "POST", searchUrl("sita"))).toEqual([]);
});
