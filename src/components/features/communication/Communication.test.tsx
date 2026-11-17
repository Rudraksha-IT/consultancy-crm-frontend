import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { StaffContextContext } from "@/components/features/shell/staffContext";
import { StudentProfilePage } from "@/components/features/students/profile/StudentProfilePage";
import { ToastProvider } from "@/components/ui/ToastProvider";
import type { Message, StaffContext } from "@/lib/api";
import { DEFAULT_THEME } from "@/lib/theme";
import { backend, callsTo, on } from "@/test/backend";
import { PROFILE } from "@/test/studentProfile";

import { lengthHint } from "./MessageFields";
import { MessagesPage } from "./MessagesPage";
import { SendMessageDialog, type MessageRecipient } from "./SendMessageDialog";
import { consultancySummary } from "@/test/consultancy";

const COUNSELLOR: StaffContext = {
  staff: { id: 5, name: "Bikash Thapa", email: "bikash@acme.test", role: "counsellor" },
  consultancy: consultancySummary(),
  modules: ["students", "communication"],
  dateDisplay: "AD",
  colourMode: "device",
  supportAccess: null,
  theme: DEFAULT_THEME,
};

const SITA: MessageRecipient = {
  id: 7,
  name: "Sita Gurung",
  phone: "9841000001",
  email: "sita@example.test",
};

const SENT = {
  id: 4,
  student: { id: 7, name: "Sita Gurung" },
  channel: "sms",
  body: "Namaste Sita, see you at 10.",
  status: "sent",
  error: "",
  sent_to: "9841000001",
  sent_at: "2026-11-02T10:04:00+05:45",
  sent_by: { id: 5, name: "Bikash Thapa" },
};

const FAILED = {
  ...SENT,
  id: 3,
  student: { id: 8, name: "Manisha Rai" },
  body: "<script>alert(1)</script>",
  status: "failed",
  error: "014412345 isn't a 10-digit Nepali mobile number.",
  sent_to: "014412345",
};

const MESSAGES_PATH = "/api/messages/?page=1";
const SEND_PATH = "/api/students/7/messages/";

function page(results: unknown[], count = results.length) {
  return { count, page: 1, page_size: 25, results };
}

function renderIn(context: StaffContext, children: React.ReactNode) {
  return render(
    <StaffContextContext value={context}>
      <ToastProvider>{children}</ToastProvider>
    </StaffContextContext>,
  );
}

function sentBody(fetchFn: ReturnType<typeof backend>, verb: string, path: string): unknown {
  const body = callsTo(fetchFn, verb, path)[0]?.[1]?.body;
  return typeof body === "string" ? JSON.parse(body) : null;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("lengthHint", () => {
  it.each([
    ["sms", 0, "0 characters, 1 SMS"],
    ["sms", 1, "1 character, 1 SMS"],
    ["sms", 160, "160 characters, 1 SMS"],
    ["sms", 161, "161 characters, 2 SMS"],
    ["email", 161, "161 characters"],
  ] as const)("counts a %s of %i characters", (channel, characters, said) => {
    expect(lengthHint(channel, characters)).toBe(said);
  });
});

describe("SendMessageDialog", () => {
  function renderDialog(student: MessageRecipient = SITA) {
    const onSent = vi.fn<(message: Message) => void>();
    const onClose = vi.fn();
    renderIn(COUNSELLOR, <SendMessageDialog student={student} onClose={onClose} onSent={onSent} />);
    return { onSent, onClose, dialog: screen.getByRole("dialog", { name: "Message Sita Gurung" }) };
  }

  it("offers Email first and starts on it, with a greeting, where it goes and its length", () => {
    backend();
    const { dialog } = renderDialog();

    const channel = within(dialog).getByRole("radiogroup", { name: "Channel" });
    expect(
      within(channel)
        .getAllByRole("radio")
        .map((radio) => radio.getAttribute("value")),
    ).toEqual(["email", "sms"]);
    expect(within(channel).getByRole("radio", { name: "Email" })).toBeChecked();
    // Focus moves to the first field, the channel.
    expect(within(channel).getByRole("radio", { name: "Email" })).toHaveFocus();
    const box = within(dialog).getByRole("textbox", { name: "Message" });
    expect(box).toHaveValue("Namaste, ");
    expect(box).toHaveAccessibleDescription("9 characters Ctrl + Enter to send");
    expect(dialog).toHaveTextContent("Goes to sita@example.test.");
    expect(dialog).not.toHaveTextContent("SMS is chosen");
  });

  it("counts SMS parts as you type and shows the mobile number for an SMS", async () => {
    backend();
    const { dialog } = renderDialog();
    const box = within(dialog).getByRole("textbox", { name: "Message" });

    await userEvent.type(box, "hi");
    await userEvent.click(within(dialog).getByRole("radio", { name: "SMS" }));

    expect(box).toHaveAccessibleDescription("11 characters, 1 SMS Ctrl + Enter to send");
    expect(dialog).toHaveTextContent("Goes to 9841000001.");
  });

  it("starts on SMS, and says why, when the Student has no email address", async () => {
    backend();
    const { dialog } = renderDialog({ ...SITA, email: "" });

    const channel = within(dialog).getByRole("radiogroup", { name: "Channel" });
    expect(within(channel).getByRole("radio", { name: "SMS" })).toBeChecked();
    expect(dialog).toHaveTextContent("SMS is chosen because this Student has no email address.");
    expect(dialog).toHaveTextContent("Goes to 9841000001.");

    await userEvent.click(within(dialog).getByRole("radio", { name: "Email" }));

    expect(dialog).toHaveTextContent("This Student has no email address.");
  });

  it("sends an email by default", async () => {
    const fetchFn = backend(on("POST", SEND_PATH, { ...SENT, channel: "email" }, 201));
    const { dialog } = renderDialog();

    await userEvent.click(within(dialog).getByRole("button", { name: "Send" }));

    expect(await screen.findByText("Email sent")).toBeInTheDocument();
    expect(sentBody(fetchFn, "POST", SEND_PATH)).toEqual({ channel: "email", body: "Namaste," });
  });

  it("sends on Ctrl + Enter in the message, with the keys shown beside Send", async () => {
    const fetchFn = backend(on("POST", SEND_PATH, { ...SENT, channel: "email" }, 201));
    const { dialog } = renderDialog();
    const box = within(dialog).getByRole("textbox", { name: "Message" });
    expect(within(dialog).getByText("Ctrl + Enter to send")).toBeInTheDocument();
    expect(box).toHaveAccessibleDescription(/Ctrl \+ Enter to send$/);

    await userEvent.type(box, "See you.{Control>}{Enter}{/Control}");

    expect(await screen.findByText("Email sent")).toBeInTheDocument();
    expect(sentBody(fetchFn, "POST", SEND_PATH)).toEqual({
      channel: "email",
      body: "Namaste, See you.",
    });
  });

  it("sends the trimmed text on the chosen channel and confirms", async () => {
    const fetchFn = backend(on("POST", SEND_PATH, SENT, 201));
    const { dialog, onSent } = renderDialog();
    const box = within(dialog).getByRole("textbox", { name: "Message" });

    await userEvent.clear(box);
    await userEvent.type(box, "  Namaste Sita, see you at 10.  ");
    await userEvent.click(within(dialog).getByRole("radio", { name: "SMS" }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Send" }));

    expect(await screen.findByText("SMS sent")).toBeInTheDocument();
    expect(sentBody(fetchFn, "POST", SEND_PATH)).toEqual({
      channel: "sms",
      body: "Namaste Sita, see you at 10.",
    });
    expect(onSent).toHaveBeenCalledWith(expect.objectContaining({ id: 4, status: "sent" }));
  });

  it("tells a failure with its reason, and it's still recorded", async () => {
    backend(on("POST", SEND_PATH, { ...FAILED, student: SENT.student }, 201));
    const { dialog, onSent } = renderDialog();

    await userEvent.click(within(dialog).getByRole("button", { name: "Send" }));

    expect(
      await screen.findByText("Failed: 014412345 isn't a 10-digit Nepali mobile number."),
    ).toBeInTheDocument();
    expect(onSent).toHaveBeenCalledOnce();
  });

  it("shows why a channel can't be used, and stays open", async () => {
    const refusal = {
      channel: ["Email isn't set up yet. An Admin can set it up in Configuration."],
    };
    backend(on("POST", SEND_PATH, refusal, 400));
    const { dialog, onSent } = renderDialog();

    await userEvent.click(within(dialog).getByRole("button", { name: "Send" }));

    expect(
      await within(dialog).findByText(
        "Email isn't set up yet. An Admin can set it up in Configuration.",
      ),
    ).toBeInTheDocument();
    expect(onSent).not.toHaveBeenCalled();
  });

  it("shows a refused text under the box", async () => {
    backend(on("POST", SEND_PATH, { body: ["An SMS can be at most 800 characters."] }, 400));
    const { dialog } = renderDialog();

    await userEvent.click(within(dialog).getByRole("button", { name: "Send" }));

    const box = within(dialog).getByRole("textbox", { name: "Message" });
    expect(
      await within(dialog).findByText("An SMS can be at most 800 characters."),
    ).toBeInTheDocument();
    expect(box).toHaveAttribute("aria-invalid", "true");
  });

  it("says when it couldn't be sent at all", async () => {
    backend(on("POST", SEND_PATH, {}, 500));
    const { dialog } = renderDialog();

    await userEvent.click(within(dialog).getByRole("button", { name: "Send" }));

    expect(
      await within(dialog).findByText("The message couldn't be sent. Try again."),
    ).toBeInTheDocument();
  });

  it("closes with Escape", async () => {
    backend();
    const { onClose } = renderDialog();

    await userEvent.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalled();
  });
});

describe("MessagesPage (shown as Email & SMS)", () => {
  it("lists every email and SMS newest first, with its Student, status in words and reason", async () => {
    backend(on("GET", MESSAGES_PATH, page([SENT, FAILED])));
    renderIn(COUNSELLOR, <MessagesPage />);

    expect(screen.getByRole("heading", { level: 1, name: "Email & SMS" })).toBeInTheDocument();
    expect(
      screen.getByText("Email and SMS sent to Students from the office's own accounts."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send email or SMS" })).toBeInTheDocument();
    expect(screen.queryByText(/Messages/)).not.toBeInTheDocument();
    const list = await screen.findByRole("list", { name: "Email & SMS" });
    const rows = within(list).getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    const [first, second] = rows.map((row) => within(row));
    if (first === undefined || second === undefined) throw new Error("expected two rows");
    expect(first.getByRole("link", { name: "Sita Gurung" })).toHaveAttribute("href", "/students/7");
    expect(rows[0]).toHaveTextContent("SMS");
    expect(rows[0]).toHaveTextContent("By Bikash Thapa");
    expect(first.getByText("Sent")).toBeInTheDocument();
    expect(second.getByText("Failed")).toBeInTheDocument();
    expect(rows[1]).toHaveTextContent("014412345 isn't a 10-digit Nepali mobile number.");
    // Typed text is shown as text, never run.
    expect(second.getByText("<script>alert(1)</script>")).toBeInTheDocument();
    expect(screen.getByText("2 sent")).toBeInTheDocument();
  });

  it("says when none have been sent", async () => {
    backend(on("GET", MESSAGES_PATH, page([])));
    renderIn(COUNSELLOR, <MessagesPage />);

    expect(
      await screen.findByText(
        "Nothing sent yet. Send an email or SMS with Send email or SMS, or from a Student's page.",
      ),
    ).toBeInTheDocument();
  });

  it("pages through older messages", async () => {
    const fetchFn = backend(
      on("GET", MESSAGES_PATH, page([SENT], 30)),
      on("GET", "/api/messages/?page=2", { ...page([FAILED], 30), page: 2 }),
    );
    renderIn(COUNSELLOR, <MessagesPage />);

    await userEvent.click(await screen.findByRole("button", { name: /Next/ }));

    expect(await screen.findByRole("link", { name: "Manisha Rai" })).toBeInTheDocument();
    expect(callsTo(fetchFn, "GET", "/api/messages/?page=2")).toHaveLength(1);
  });

  it("says when they can't be loaded", async () => {
    backend(on("GET", MESSAGES_PATH, {}, 500));
    renderIn(COUNSELLOR, <MessagesPage />);

    expect(
      await screen.findByText("Email & SMS couldn't be loaded. Try again."),
    ).toBeInTheDocument();
  });

  it.each([
    ["a Teacher", { ...COUNSELLOR, staff: { ...COUNSELLOR.staff, role: "teacher" as const } }],
    ["anyone while the Module is off", { ...COUNSELLOR, modules: ["students" as const] }],
  ])("isn't available to %s, and asks for nothing", (_, context) => {
    const fetchFn = backend();
    renderIn(context, <MessagesPage />);

    expect(screen.queryByRole("heading", { name: "Email & SMS" })).not.toBeInTheDocument();
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

describe("On a Student's page", () => {
  const profile = on("GET", "/api/students/7/", PROFILE);
  const studentMessages = (results: unknown[]) =>
    on("GET", "/api/students/7/messages/?page=1", page(results));
  const history = on("GET", "/api/students/7/history/", { ...page([]), page_size: 50 });
  const visits = on("GET", "/api/students/7/visits/?page=1", { ...page([]), page_size: 50 });

  async function openMore(): Promise<void> {
    await userEvent.click(await screen.findByRole("button", { name: /More/ }));
  }

  it("offers Send email or SMS under More, and sends from there", async () => {
    backend(profile, history, studentMessages([]), on("POST", SEND_PATH, SENT, 201));
    renderIn(COUNSELLOR, <StudentProfilePage studentId={7} />);

    await openMore();
    await userEvent.click(screen.getByRole("menuitem", { name: "Send email or SMS" }));
    const dialog = screen.getByRole("dialog", { name: "Message Sita Gurung" });
    await userEvent.click(within(dialog).getByRole("radio", { name: "SMS" }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Send" }));

    expect(await screen.findByText("SMS sent")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("doesn't offer it while the Module is off", async () => {
    backend(profile, history);
    renderIn({ ...COUNSELLOR, modules: ["students"] }, <StudentProfilePage studentId={7} />);

    await openMore();

    expect(screen.queryByRole("menuitem", { name: "Send email or SMS" })).not.toBeInTheDocument();
  });

  it("shows the Student's messages in their Activity", async () => {
    backend(profile, history, visits, studentMessages([SENT, FAILED]));
    renderIn(COUNSELLOR, <StudentProfilePage studentId={7} />);

    await userEvent.click(await screen.findByRole("tab", { name: "Activity" }));

    const timeline = await screen.findByRole("list", { name: "Activity" });
    expect(
      within(timeline).getByText("SMS sent: “Namaste Sita, see you at 10.”"),
    ).toBeInTheDocument();
    expect(within(timeline).getByText(/^SMS failed: /)).toBeInTheDocument();
    expect(within(timeline).getByText(FAILED.error)).toBeInTheDocument();
    expect(
      screen.getByText("Stage changes, visits, messages and other changes, recorded automatically"),
    ).toBeInTheDocument();
  });

  it("leaves messages out of the Activity while the Module is off", async () => {
    const fetchFn = backend(profile, history, visits);
    renderIn({ ...COUNSELLOR, modules: ["students"] }, <StudentProfilePage studentId={7} />);

    await userEvent.click(await screen.findByRole("tab", { name: "Activity" }));

    expect(await screen.findByText("Became a Lead")).toBeInTheDocument();
    expect(
      screen.getByText("Stage changes, visits and other changes, recorded automatically"),
    ).toBeInTheDocument();
    expect(callsTo(fetchFn, "GET", "/api/students/7/messages/?page=1")).toHaveLength(0);
  });
});
