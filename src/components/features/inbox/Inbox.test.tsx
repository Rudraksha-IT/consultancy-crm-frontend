import type { RecordId } from "@/lib/recordId";
import { uid } from "@/test/ids";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";

import { InboxCheckContext, type InboxCheckState } from "@/components/features/shell/inboxCheck";
import { StaffContextContext } from "@/components/features/shell/staffContext";
import type { StaffContext } from "@/lib/api";
import { backend, callsTo, on } from "@/test/backend";
import { consultancySummary } from "@/test/consultancy";
import { fakeMatchMedia } from "@/test/matchMedia";
import { testHost } from "@/test/hosts";

import { FIT_GAP_PX, FIT_LEAST_PX } from "@/lib/fitWindow/fitWindow";

import { InboxPage } from "./InboxPage";
import { openIdFrom } from "./InboxRoute";

const SITA: StaffContext = {
  staff: { id: uid(2), name: "Sita Karki", email: "counsellor@office.com", role: "counsellor" },
  consultancy: consultancySummary(),
  modules: ["students", "tasks"],
  dateDisplay: "AD",
  colourMode: "light",
  supportAccess: null,
};

const PLATFORM_VISIT: StaffContext = {
  ...SITA,
  staff: { ...SITA.staff, role: "admin" },
  supportAccess: { platformAdminName: "Platform Ops", platformHost: testHost("admin") },
};

const LIST = "/api/inbox/";
const PEOPLE = "/api/inbox/people/";
const WITH_NABIN = `/api/inbox/${uid(1)}/`;
const WITH_ROHAN = `/api/inbox/${uid(6)}/`;

const NABIN = { id: uid(1), name: "Nabin Adhikari", job_title: "Director", has_left: false };
const POOJA = { id: uid(4), name: "Pooja Shrestha", job_title: "Front desk", has_left: false };
const ROHAN = { id: uid(6), name: "Rohan Shah", job_title: "Counsellor", has_left: true };
const EARLIER = "2026-10-28T09:20:00+05:45";
const LATER = "2026-10-28T09:43:00+05:45";

const CONVERSATIONS = {
  conversations: [
    {
      person: POOJA,
      last: { text: "Shall I send her up?", from_me: false, sent_at: LATER },
      unread: true,
    },
    {
      person: NABIN,
      last: { text: "Yes, after lunch.", from_me: true, sent_at: EARLIER },
      unread: false,
    },
    {
      person: ROHAN,
      last: { text: "Handing over Rohan's notes.", from_me: false, sent_at: EARLIER },
      unread: false,
    },
  ],
};

const THREAD_WITH_NABIN = {
  person: NABIN,
  can_write: true,
  messages: [
    { id: uid(901), text: "Can you call Anjali's father?", from_me: false, sent_at: EARLIER },
    { id: uid(902), text: "Yes, after lunch.", from_me: true, sent_at: LATER },
  ],
  more: false,
};

function checkOf(overrides: Partial<InboxCheckState> = {}): InboxCheckState {
  return { unread: 1, latest: uid(902), refresh: vi.fn<() => void>(), ...overrides };
}

/** The page with its open conversation kept in state, as the route keeps it in the address. */
function Harness({ initial }: { initial: RecordId | null }) {
  const [openId, setOpenId] = useState(initial);
  return <InboxPage openId={openId} onOpen={setOpenId} />;
}

function renderInbox(
  options: { context?: StaffContext; check?: InboxCheckState; openId?: RecordId | null } = {},
) {
  const check = options.check ?? checkOf();
  const view = render(
    <StaffContextContext value={options.context ?? SITA}>
      <InboxCheckContext value={check}>
        <Harness initial={options.openId ?? null} />
      </InboxCheckContext>
    </StaffContextContext>,
  );
  return { check, view };
}

function sentJson(init: RequestInit | undefined): unknown {
  return typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("The conversation list", () => {
  it("lists my conversations newest first: the name, the start of the last message, the time and what is unread (owner, 2026-11-27)", async () => {
    backend(on("GET", LIST, CONVERSATIONS));

    renderInbox();

    const list = await screen.findByRole("list", { name: "Conversations" });
    const rows = within(list).getAllByRole("button");
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringContaining("Pooja Shrestha"),
      expect.stringContaining("Nabin Adhikari"),
      expect.stringContaining("Rohan Shah (has left)"),
    ]);
    const pooja = within(list).getByRole("button", { name: /Pooja Shrestha/ });
    const nabin = within(list).getByRole("button", { name: /Nabin Adhikari/ });
    // The start of the last message is under the name, on one line; mine starts with "You: ".
    const theirs = within(pooja).getByText("Shall I send her up?");
    expect(theirs).toHaveClass("truncate");
    expect(within(nabin).getByText("You: Yes, after lunch.")).toHaveClass("truncate");
    expect(pooja).toHaveTextContent("PSPooja ShresthaShall I send her up?28 Oct 2026Unread");
    // The dot has its word for screen readers, so it never stands alone.
    expect(within(pooja).getByText("Unread")).toHaveClass("sr-only");
    expect(within(nabin).queryByText("Unread")).not.toBeInTheDocument();
    expect(screen.getByText("Pick a conversation, or start a new one.")).toBeInTheDocument();
  });

  it("shows an unread conversation in bold, with its dot; a read one is quieter", async () => {
    backend(on("GET", LIST, CONVERSATIONS));

    renderInbox();

    const list = await screen.findByRole("list", { name: "Conversations" });
    const pooja = within(list).getByRole("button", { name: /Pooja Shrestha/ });
    const nabin = within(list).getByRole("button", { name: /Nabin Adhikari/ });
    expect(within(pooja).getByText("Pooja Shrestha")).toHaveClass("font-semibold", "text-ink");
    expect(within(pooja).getByText("Shall I send her up?")).toHaveClass("text-ink", "font-medium");
    expect(within(nabin).getByText("Nabin Adhikari")).toHaveClass("font-medium");
    expect(within(nabin).getByText("Nabin Adhikari")).not.toHaveClass("font-semibold");
    expect(within(nabin).getByText("You: Yes, after lunch.")).toHaveClass("text-ink-2");
  });

  it("shows the last message as text, never as markup, and on one line", async () => {
    backend(
      on("GET", LIST, {
        conversations: [
          {
            person: POOJA,
            last: { text: "<b>Hi</b>\nsecond line", from_me: false, sent_at: LATER },
            unread: false,
          },
        ],
      }),
    );

    renderInbox();

    const list = await screen.findByRole("list", { name: "Conversations" });
    expect(within(list).getByText("<b>Hi</b> second line")).toBeInTheDocument();
    expect(list.querySelector("b")).toBeNull();
  });

  it("says when there are no conversations yet", async () => {
    backend(on("GET", LIST, { conversations: [] }));

    renderInbox();

    expect(await screen.findByText("No conversations yet.")).toBeInTheDocument();
  });

  it("says the Inbox couldn't load when the answer isn't one", async () => {
    backend(on("GET", LIST, { conversations: [{ person: NABIN }] }));

    renderInbox();

    expect(
      await screen.findByText("The Inbox couldn't be loaded. Try again in a moment."),
    ).toBeInTheDocument();
  });

  it("loads again when the check finds a new message", async () => {
    const fetchFn = backend(on("GET", LIST, CONVERSATIONS));
    const { view } = renderInbox();
    await screen.findByRole("list", { name: "Conversations" });
    const before = callsTo(fetchFn, "GET", LIST).length;

    view.rerender(
      <StaffContextContext value={SITA}>
        <InboxCheckContext value={checkOf({ latest: uid(950) })}>
          <Harness initial={null} />
        </InboxCheckContext>
      </StaffContextContext>,
    );

    await waitFor(() => {
      expect(callsTo(fetchFn, "GET", LIST).length).toBe(before + 1);
    });
  });
});

describe("The page", () => {
  it("has no line under its title and no note under the page", async () => {
    backend(on("GET", LIST, CONVERSATIONS));

    renderInbox();
    await screen.findByRole("list", { name: "Conversations" });

    expect(screen.queryByText(/Messages between you and one other person/)).not.toBeInTheDocument();
    expect(screen.queryByText(/New messages show within about 30 seconds/)).not.toBeInTheDocument();
  });
});

describe("The height", () => {
  const TOP = 150;

  /** A window this tall, with the Inbox starting `TOP` from its top. */
  function windowOf(height: number): void {
    vi.stubGlobal("innerHeight", height);
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(
      new DOMRect(0, TOP, 800, 0),
    );
  }

  function inboxBox(): HTMLElement {
    const box = document.querySelector<HTMLElement>("[data-fills-window]");
    if (box === null) throw new Error("The Inbox has no box that fills the window.");
    return box;
  }

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fills the window down to its bottom, and fits again when the window changes", async () => {
    windowOf(900);
    backend(on("GET", LIST, CONVERSATIONS), on("GET", WITH_NABIN, THREAD_WITH_NABIN));
    renderInbox({ openId: uid(1) });
    await screen.findByRole("log");

    expect(inboxBox()).toHaveStyle({ height: `${String(900 - TOP - FIT_GAP_PX)}px` });

    windowOf(700);
    act(() => {
      window.dispatchEvent(new Event("resize"));
    });

    expect(inboxBox()).toHaveStyle({ height: `${String(700 - TOP - FIT_GAP_PX)}px` });
  });

  it("stops above the phone tab bar", async () => {
    windowOf(800);
    const bar = document.createElement("nav");
    bar.setAttribute("data-tabbar", "");
    Object.defineProperty(bar, "offsetHeight", { value: 60 });
    document.body.append(bar);
    backend(on("GET", LIST, CONVERSATIONS));

    renderInbox();
    await screen.findByRole("list", { name: "Conversations" });

    expect(inboxBox()).toHaveStyle({ height: `${String(800 - TOP - 60 - FIT_GAP_PX)}px` });
    bar.remove();
  });

  it("keeps a least height in a very short window", async () => {
    windowOf(200);
    backend(on("GET", LIST, CONVERSATIONS));

    renderInbox();
    await screen.findByRole("list", { name: "Conversations" });

    expect(inboxBox()).toHaveStyle({ height: `${String(FIT_LEAST_PX)}px` });
  });

  it("scrolls the messages inside, with the box to write in under them", async () => {
    windowOf(900);
    backend(on("GET", LIST, CONVERSATIONS), on("GET", WITH_NABIN, THREAD_WITH_NABIN));
    renderInbox({ openId: uid(1) });

    const log = await screen.findByRole("log");
    const composer = screen
      .getByRole("textbox", { name: "Message to Nabin Adhikari" })
      .closest("form");

    // The messages take the room that is left and scroll; the composer is the row after them.
    expect(log).toHaveClass("min-h-0", "overflow-y-auto");
    expect(log.parentElement).toHaveClass("grid-rows-[auto_minmax(0,1fr)_auto]", "h-full");
    expect(log.nextElementSibling).toBe(composer);
    expect(inboxBox()).toContainElement(composer);
    // The list scrolls on its own too.
    expect(screen.getByRole("list", { name: "Conversations" }).parentElement).toHaveClass(
      "overflow-y-auto",
    );
  });
});

describe("The newest message", () => {
  /** A ResizeObserver the test fires by hand. */
  function fakeResizeObserver(): { fire: () => void } {
    const callbacks: (() => void)[] = [];
    class FakeResizeObserver {
      constructor(callback: () => void) {
        callbacks.push(callback);
      }
      observe = vi.fn<() => void>();
      disconnect = vi.fn<() => void>();
    }
    vi.stubGlobal("ResizeObserver", FakeResizeObserver);
    return {
      fire: () => {
        for (const callback of callbacks) callback();
      },
    };
  }

  function scrollable(log: HTMLElement, sizes: { scrollHeight: number; clientHeight: number }) {
    Object.defineProperty(log, "scrollHeight", { configurable: true, value: sizes.scrollHeight });
    Object.defineProperty(log, "clientHeight", { configurable: true, value: sizes.clientHeight });
  }

  it("stays in view when the window gets shorter", async () => {
    const resize = fakeResizeObserver();
    backend(on("GET", LIST, CONVERSATIONS), on("GET", WITH_NABIN, THREAD_WITH_NABIN));
    renderInbox({ openId: uid(1) });
    const log = await screen.findByRole("log");
    scrollable(log, { scrollHeight: 1000, clientHeight: 400 });
    log.scrollTop = 600;
    fireEvent.scroll(log);

    scrollable(log, { scrollHeight: 1000, clientHeight: 300 });
    act(() => {
      resize.fire();
    });

    expect(log.scrollTop).toBe(1000);
  });

  it("leaves me where I was reading older messages", async () => {
    const resize = fakeResizeObserver();
    backend(on("GET", LIST, CONVERSATIONS), on("GET", WITH_NABIN, THREAD_WITH_NABIN));
    renderInbox({ openId: uid(1) });
    const log = await screen.findByRole("log");
    scrollable(log, { scrollHeight: 1000, clientHeight: 400 });
    log.scrollTop = 100;
    fireEvent.scroll(log);

    scrollable(log, { scrollHeight: 1000, clientHeight: 300 });
    act(() => {
      resize.fire();
    });

    expect(log.scrollTop).toBe(100);
  });
});

describe("A conversation", () => {
  it("opens from the list, oldest first, mine and theirs told apart, and updates the count", async () => {
    const fetchFn = backend(
      on("GET", LIST, CONVERSATIONS),
      on("GET", WITH_NABIN, THREAD_WITH_NABIN),
    );
    const { check } = renderInbox();

    await userEvent.click(await screen.findByRole("button", { name: /Nabin Adhikari/ }));

    const thread = await screen.findByRole("log", { name: "Conversation with Nabin Adhikari" });
    const messages = within(thread).getAllByRole("article");
    expect(messages.map((message) => message.textContent)).toEqual([
      expect.stringContaining("Nabin Adhikari: Can you call Anjali's father?"),
      expect.stringContaining("You: Yes, after lunch."),
    ]);
    expect(screen.getByText("Director")).toBeInTheDocument();
    expect(callsTo(fetchFn, "GET", WITH_NABIN)).toHaveLength(1);
    await waitFor(() => {
      expect(check.refresh).toHaveBeenCalled();
    });
  });

  it("shows text exactly as written, never as HTML", async () => {
    const html = '<img src=x onerror="alert(1)">';
    backend(
      on("GET", LIST, CONVERSATIONS),
      on("GET", WITH_NABIN, {
        ...THREAD_WITH_NABIN,
        messages: [{ id: uid(1), text: html, from_me: false, sent_at: EARLIER }],
      }),
    );

    const { view } = renderInbox({ openId: uid(1) });

    expect(await screen.findByText(html)).toBeInTheDocument();
    expect(view.container.querySelector("img")).toBeNull();
  });

  it("invites a first message when the conversation is new", async () => {
    backend(
      on("GET", LIST, { conversations: [] }),
      on("GET", WITH_NABIN, { ...THREAD_WITH_NABIN, messages: [] }),
    );

    renderInbox({ openId: uid(1) });

    expect(await screen.findByText("Say hello to Nabin.")).toBeInTheDocument();
  });

  it("says only the newest 200 are shown when there are more", async () => {
    backend(
      on("GET", LIST, CONVERSATIONS),
      on("GET", WITH_NABIN, { ...THREAD_WITH_NABIN, more: true }),
    );

    renderInbox({ openId: uid(1) });

    expect(await screen.findByText("Only the newest 200 messages are shown.")).toBeInTheDocument();
  });

  it("goes back to the list", async () => {
    backend(on("GET", LIST, CONVERSATIONS), on("GET", WITH_NABIN, THREAD_WITH_NABIN));
    renderInbox({ openId: uid(1) });
    await screen.findByRole("log");

    await userEvent.click(screen.getByRole("button", { name: "Back to conversations" }));

    expect(screen.queryByRole("log")).not.toBeInTheDocument();
    expect(screen.getByText("Pick a conversation, or start a new one.")).toBeInTheDocument();
  });

  it("on a phone, gives the whole page to an open conversation, and brings the header back on the list", async () => {
    vi.stubGlobal(
      "matchMedia",
      fakeMatchMedia(
        () => false,
        (query) => query.includes("40.0625rem"),
      ).matchMedia,
    );
    backend(on("GET", LIST, CONVERSATIONS), on("GET", WITH_NABIN, THREAD_WITH_NABIN));
    renderInbox({ openId: uid(1) });
    await screen.findByRole("log");

    expect(screen.queryByRole("button", { name: "New message" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Inbox" })).toHaveClass("sr-only");

    await userEvent.click(screen.getByRole("button", { name: "Back to conversations" }));

    expect(screen.getByRole("button", { name: "New message" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Inbox" })).not.toHaveClass("sr-only");
  });

  it("keeps the title and New message beside an open conversation above 640", async () => {
    backend(on("GET", LIST, CONVERSATIONS), on("GET", WITH_NABIN, THREAD_WITH_NABIN));
    renderInbox({ openId: uid(1) });
    await screen.findByRole("log");

    expect(screen.getByRole("button", { name: "New message" })).toBeInTheDocument();
  });

  it("lets me read someone who has left, but not write to them", async () => {
    backend(
      on("GET", LIST, CONVERSATIONS),
      on("GET", WITH_ROHAN, {
        person: ROHAN,
        can_write: false,
        messages: [
          { id: uid(908), text: "Handing over Rohan's notes.", from_me: false, sent_at: EARLIER },
        ],
        more: false,
      }),
    );

    renderInbox({ openId: uid(6) });

    const thread = await screen.findByRole("log", { name: "Conversation with Rohan Shah" });
    expect(within(thread).getByText("Handing over Rohan's notes.")).toBeInTheDocument();
    expect(
      screen.getByText("Rohan Shah has left. You can read past messages, but not write."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("says so when the person isn't in the office", async () => {
    backend(
      on("GET", LIST, CONVERSATIONS),
      on("GET", `/api/inbox/${uid(77)}/`, { detail: "Not found." }, 404),
    );

    renderInbox({ openId: uid(77) });

    expect(await screen.findByText("This person isn't in the office.")).toBeInTheDocument();
  });
});

describe("Writing", () => {
  /** The conversation with Nabin, where sending answers with `answer`. */
  function sendingBackend(answer: { body: unknown; status: number }) {
    return backend(
      on("GET", LIST, CONVERSATIONS),
      on("GET", WITH_NABIN, THREAD_WITH_NABIN),
      on("POST", WITH_NABIN, answer.body, answer.status),
    );
  }

  const SENT = { id: uid(903), text: "On my way", from_me: true, sent_at: LATER };

  it("sends on Enter, shows the message and empties the box", async () => {
    const fetchFn = sendingBackend({ body: SENT, status: 201 });
    const { check } = renderInbox({ openId: uid(1) });
    const box = await screen.findByRole("textbox", { name: "Message to Nabin Adhikari" });

    await userEvent.type(box, "On my way{Enter}");

    await waitFor(() => {
      expect(callsTo(fetchFn, "POST", WITH_NABIN)).toHaveLength(1);
    });
    expect(sentJson(callsTo(fetchFn, "POST", WITH_NABIN)[0]?.[1])).toEqual({ text: "On my way" });
    expect(await screen.findByText("On my way")).toBeInTheDocument();
    expect(box).toHaveValue("");
    expect(check.refresh).toHaveBeenCalled();
  });

  it("makes a new line on Shift + Enter, and sends with the button", async () => {
    const fetchFn = sendingBackend({ body: { ...SENT, text: "Line one\nLine two" }, status: 201 });
    renderInbox({ openId: uid(1) });
    const box = await screen.findByRole("textbox", { name: "Message to Nabin Adhikari" });

    await userEvent.type(box, "Line one{Shift>}{Enter}{/Shift}Line two");
    expect(callsTo(fetchFn, "POST", WITH_NABIN)).toHaveLength(0);
    await userEvent.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() => {
      expect(sentJson(callsTo(fetchFn, "POST", WITH_NABIN)[0]?.[1])).toEqual({
        text: "Line one\nLine two",
      });
    });
  });

  it("has Send beside the box, on its line (owner, 2026-11-27)", async () => {
    sendingBackend({ body: SENT, status: 201 });
    renderInbox({ openId: uid(1) });
    const box = await screen.findByRole("textbox", { name: "Message to Nabin Adhikari" });

    const send = screen.getByRole("button", { name: "Send" });
    const line = send.parentElement;
    expect(line).toHaveClass("grid-cols-[minmax(0,1fr)_auto]", "items-start");
    expect(line).toContainElement(box);
    // One line to start with, growing with what is typed.
    expect(box).toHaveAttribute("rows", "1");
    expect(box).toHaveClass("field-sizing-content", "resize-none");
  });

  it("counts characters and tells the keys", async () => {
    sendingBackend({ body: SENT, status: 201 });
    renderInbox({ openId: uid(1) });
    const box = await screen.findByRole("textbox", { name: "Message to Nabin Adhikari" });

    await userEvent.type(box, "Hello");

    expect(box).toHaveAccessibleDescription(
      "5 of 2,000. Enter sends, Shift + Enter for a new line.",
    );
    expect(box).toHaveAttribute("maxlength", "2000");
  });

  it("sends nothing when the box is empty or only spaces", async () => {
    const fetchFn = sendingBackend({ body: SENT, status: 201 });
    renderInbox({ openId: uid(1) });
    const box = await screen.findByRole("textbox", { name: "Message to Nabin Adhikari" });

    await userEvent.type(box, "   {Enter}");

    expect(callsTo(fetchFn, "POST", WITH_NABIN)).toHaveLength(0);
  });

  it("shows the server's reason when the text is refused, keeping what was typed", async () => {
    sendingBackend({ body: { text: ["Write a message."] }, status: 400 });
    renderInbox({ openId: uid(1) });
    const box = await screen.findByRole("textbox", { name: "Message to Nabin Adhikari" });

    await userEvent.type(box, "Hi{Enter}");

    expect(await screen.findByText("Write a message.")).toBeInTheDocument();
    expect(box).toHaveValue("Hi");
  });

  it("shows a refusal's reason, e.g. a read-only office", async () => {
    sendingBackend({
      body: { detail: "This office can only be viewed right now.", status: "past_due" },
      status: 403,
    });
    renderInbox({ openId: uid(1) });
    const box = await screen.findByRole("textbox", { name: "Message to Nabin Adhikari" });

    await userEvent.type(box, "Hi{Enter}");

    expect(
      await screen.findByText("This office can only be viewed right now."),
    ).toBeInTheDocument();
  });

  it("says the message wasn't sent when anything else goes wrong", async () => {
    sendingBackend({ body: {}, status: 500 });
    renderInbox({ openId: uid(1) });
    const box = await screen.findByRole("textbox", { name: "Message to Nabin Adhikari" });

    await userEvent.type(box, "Hi{Enter}");

    expect(await screen.findByText("The message wasn't sent. Try again.")).toBeInTheDocument();
  });
});

describe("New message", () => {
  it("picks anyone active in the office and opens the conversation", async () => {
    backend(
      on("GET", LIST, { conversations: [] }),
      on("GET", PEOPLE, {
        people: [
          { id: uid(1), name: "Nabin Adhikari", job_title: "Director" },
          { id: uid(4), name: "Pooja Shrestha", job_title: "" },
        ],
      }),
      on("GET", `/api/inbox/${uid(4)}/`, {
        person: POOJA,
        can_write: true,
        messages: [],
        more: false,
      }),
    );
    renderInbox();

    await userEvent.click(await screen.findByRole("button", { name: "New message" }));
    const dialog = await screen.findByRole("dialog", { name: "New message" });
    const to = within(dialog).getByRole("combobox", { name: "To" });
    expect(
      within(to)
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual(["Nabin Adhikari, Director", "Pooja Shrestha"]);
    await userEvent.selectOptions(to, uid(4));
    await userEvent.click(within(dialog).getByRole("button", { name: "Open conversation" }));

    expect(await screen.findByText("Say hello to Pooja.")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("says when there is nobody to write to", async () => {
    backend(on("GET", LIST, { conversations: [] }), on("GET", PEOPLE, { people: [] }));
    renderInbox();

    await userEvent.click(await screen.findByRole("button", { name: "New message" }));

    expect(
      await screen.findByText("There is nobody else in the office to write to yet."),
    ).toBeInTheDocument();
  });

  it("closes with Escape", async () => {
    backend(on("GET", LIST, { conversations: [] }), on("GET", PEOPLE, { people: [] }));
    renderInbox();
    await userEvent.click(await screen.findByRole("button", { name: "New message" }));
    await screen.findByRole("dialog");

    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("A Platform Admin in Support Access", () => {
  it("is told the Inbox is private, and nothing is asked", async () => {
    const fetchFn = backend(on("GET", LIST, CONVERSATIONS));

    renderInbox({ context: PLATFORM_VISIT, openId: uid(1) });

    expect(
      screen.getByText(
        "Staff messages are private to the two people. Platform Admins can't read them.",
      ),
    ).toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

describe("The address", () => {
  it.each([
    [uid(7), uid(7)],
    [uid(7).toUpperCase(), uid(7)],
    ["7", null],
    [uid(7).replaceAll("-", ""), null],
    [null, null],
    ["", null],
    ["0", null],
    ["-3", null],
    ["2.5", null],
    ["7abc", null],
    ["<script>", null],
    ["99999999999999999999", null],
  ])("reads with=%s as %s", (value, expected) => {
    expect(openIdFrom(value)).toBe(expected);
  });
});
