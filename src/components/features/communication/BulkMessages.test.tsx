import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { BatchPage } from "@/components/features/batches/BatchPage";
import { StaffContextContext } from "@/components/features/shell/staffContext";
import { StudentsPage } from "@/components/features/students/StudentsPage";
import { ToastProvider } from "@/components/ui/ToastProvider";
import type { BulkRecipients, BulkResult, StaffContext } from "@/lib/api";
import { DEFAULT_THEME } from "@/lib/theme";
import { backend, callsTo, on } from "@/test/backend";

import { BulkMessageDialog } from "./BulkMessageDialog";
import { MessagesPage } from "./MessagesPage";
import { consultancySummary } from "@/test/consultancy";

const COUNSELLOR: StaffContext = {
  staff: { id: 5, name: "Bikash Thapa", email: "bikash@acme.test", role: "counsellor" },
  consultancy: consultancySummary(),
  modules: ["students", "communication", "batches"],
  dateDisplay: "AD",
  colourMode: "device",
  supportAccess: null,
  theme: DEFAULT_THEME,
};
const DESK: StaffContext = {
  ...COUNSELLOR,
  staff: { id: 4, name: "Ramesh KC", email: "ramesh@acme.test", role: "front_desk" },
};
const TEACHER: StaffContext = {
  ...COUNSELLOR,
  staff: { id: 9, name: "Gita Lama", email: "gita@acme.test", role: "teacher" },
};
const CLASSES_OFF: StaffContext = { ...COUNSELLOR, modules: ["students", "communication"] };
const MESSAGES_OFF: StaffContext = { ...COUNSELLOR, modules: ["students", "batches"] };

const FAILED = {
  id: 3,
  student: { id: 8, name: "Manisha Rai" },
  channel: "sms",
  body: "Namaste, class is at 7.",
  status: "failed",
  error: "014412345 isn't a 10-digit Nepali mobile number.",
  sent_to: "014412345",
  sent_at: "2026-11-02T10:04:00+05:45",
  sent_by: { id: 5, name: "Bikash Thapa" },
};

const BULK = "/api/messages/bulk/";
const MORNING = {
  id: 1,
  name: "IELTS Morning",
  test_type: "ielts",
  teacher: { id: 9, name: "Gita Lama" },
  time_slot: "7:00-8:30 AM",
  starts_on: "2026-10-05",
  ends_on: "2026-12-04",
  timing: "running",
  student_count: 2,
  attendance_taken_today: false,
  can_change: true,
};
const CLASS: BulkRecipients = { kind: "batch", batchId: 1 };

function pageOf(results: unknown[]) {
  return { count: results.length, page: 1, page_size: 25, results };
}

function renderIn(context: StaffContext, children: React.ReactNode) {
  return render(
    <StaffContextContext value={context}>
      <ToastProvider>{children}</ToastProvider>
    </StaffContextContext>,
  );
}

function sentBody(fetchFn: ReturnType<typeof backend>): unknown {
  const body = callsTo(fetchFn, "POST", BULK)[0]?.[1]?.body;
  return typeof body === "string" ? JSON.parse(body) : null;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("BulkMessageDialog", () => {
  function renderDialog(recipients: BulkRecipients = CLASS) {
    const onClose = vi.fn();
    const onSent = vi.fn<(result: BulkResult) => void>();
    renderIn(
      COUNSELLOR,
      <BulkMessageDialog
        recipients={recipients}
        title="Message IELTS Morning"
        subtitle="2 Students in this class."
        onClose={onClose}
        onSent={onSent}
      />,
    );
    return {
      onClose,
      onSent,
      dialog: screen.getByRole("dialog", { name: "Message IELTS Morning" }),
    };
  }

  it("says who it goes to and how, and counts the Students on the send button", async () => {
    const fetchFn = backend(on("GET", `${BULK}?batch=1`, { count: 2, max: 200 }));
    const { dialog } = renderDialog();

    expect(dialog).toHaveTextContent("2 Students in this class.");
    expect(dialog).toHaveTextContent(
      "Sent one by one through your provider. You'll see which ones failed.",
    );
    const channel = within(dialog).getByRole("radiogroup", { name: "Channel" });
    // Email first and chosen; a Student without an email address still fails on its own line.
    expect(
      within(channel)
        .getAllByRole("radio")
        .map((radio) => radio.getAttribute("value")),
    ).toEqual(["email", "sms"]);
    expect(within(channel).getByRole("radio", { name: "Email" })).toBeChecked();
    expect(dialog).not.toHaveTextContent("SMS is chosen");
    expect(within(dialog).getByRole("textbox", { name: "Message" })).toHaveValue("Namaste, ");
    expect(await screen.findByRole("button", { name: "Send to 2" })).toBeEnabled();
    expect(callsTo(fetchFn, "GET", `${BULK}?batch=1`)).toHaveLength(1);
  });

  it("sends once and shows how it went: sent, failed and why", async () => {
    const result = { sent: 1, failed: 1, failed_messages: [FAILED] };
    const fetchFn = backend(
      on("GET", `${BULK}?batch=1`, { count: 2, max: 200 }),
      on("POST", BULK, result, 201),
    );
    const { onSent, onClose } = renderDialog();
    await userEvent.type(screen.getByRole("textbox", { name: "Message" }), "class is at 7. ");

    await userEvent.click(await screen.findByRole("button", { name: "Send to 2" }));

    expect(sentBody(fetchFn)).toEqual({
      channel: "email",
      body: "Namaste, class is at 7.",
      batch: 1,
    });
    const finished = await screen.findByRole("dialog", { name: "Sending finished" });
    expect(within(finished).getByText("Sent").parentElement).toHaveTextContent("Sent1");
    expect(within(finished).getByText("Failed").parentElement).toHaveTextContent("Failed1");
    const failures = within(finished).getByRole("list", { name: "Failed" });
    expect(failures).toHaveTextContent(
      "Manisha Rai — 014412345 isn't a 10-digit Nepali mobile number.",
    );
    expect(finished).toHaveTextContent("One failure never stops the rest.");
    expect(onSent).toHaveBeenCalledTimes(1);
    await userEvent.click(within(finished).getByRole("button", { name: "Done" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("lists no failures when all were sent", async () => {
    backend(
      on("GET", `${BULK}?batch=1`, { count: 2, max: 200 }),
      on("POST", BULK, { sent: 2, failed: 0, failed_messages: [] }, 201),
    );
    renderDialog();

    await userEvent.click(await screen.findByRole("button", { name: "Send to 2" }));

    const finished = await screen.findByRole("dialog", { name: "Sending finished" });
    expect(within(finished).queryByRole("list")).not.toBeInTheDocument();
  });

  it("sends on Ctrl + Enter in the message, with the keys shown", async () => {
    const fetchFn = backend(
      on("GET", `${BULK}?batch=1`, { count: 2, max: 200 }),
      on("POST", BULK, { sent: 2, failed: 0, failed_messages: [] }, 201),
    );
    const { dialog } = renderDialog();
    await screen.findByRole("button", { name: "Send to 2" });
    const box = within(dialog).getByRole("textbox", { name: "Message" });
    expect(box).toHaveAccessibleDescription(/Ctrl \+ Enter to send$/);

    await userEvent.type(box, "class is at 7.{Control>}{Enter}{/Control}");

    expect(await screen.findByRole("dialog", { name: "Sending finished" })).toBeInTheDocument();
    expect(sentBody(fetchFn)).toEqual({
      channel: "email",
      body: "Namaste, class is at 7.",
      batch: 1,
    });
  });

  it("sends nothing on Ctrl + Enter while it can't send", async () => {
    const fetchFn = backend(on("GET", `${BULK}?batch=1`, { count: 0, max: 200 }));
    const { dialog } = renderDialog();
    await within(dialog).findByText("No Students to send to.");

    await userEvent.type(
      within(dialog).getByRole("textbox", { name: "Message" }),
      "Hi{Control>}{Enter}{/Control}",
    );

    expect(fetchFn.mock.calls.some(([, init]) => init?.method === "POST")).toBe(false);
  });

  it("can't send when nobody is in it", async () => {
    backend(on("GET", `${BULK}?batch=1`, { count: 0, max: 200 }));
    const { dialog } = renderDialog();

    expect(await within(dialog).findByText("No Students to send to.")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Send" })).toBeDisabled();
  });

  it("can't send to more than the most allowed", async () => {
    backend(on("GET", `${BULK}?batch=1`, { count: 250, max: 200 }));
    const { dialog } = renderDialog();

    expect(
      await within(dialog).findByText(
        "Message at most 200 Students at once. Narrow the list first.",
      ),
    ).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Send to 250" })).toBeDisabled();
  });

  it("shows why it was refused, and stays open", async () => {
    const refusal = { channel: ["SMS isn't set up yet. An Admin can set it up in Configuration."] };
    backend(on("GET", `${BULK}?batch=1`, { count: 2, max: 200 }), on("POST", BULK, refusal, 400));
    const { dialog, onSent } = renderDialog();

    await userEvent.click(await screen.findByRole("button", { name: "Send to 2" }));

    expect(
      await within(dialog).findByText(
        "SMS isn't set up yet. An Admin can set it up in Configuration.",
      ),
    ).toBeInTheDocument();
    expect(onSent).not.toHaveBeenCalled();
  });

  it("shows the server's reason for refusing who it goes to", async () => {
    backend(
      on("GET", `${BULK}?batch=1`, { count: 2, max: 200 }),
      on("POST", BULK, { detail: "No Students to send to." }, 400),
    );
    const { dialog } = renderDialog();

    await userEvent.click(await screen.findByRole("button", { name: "Send to 2" }));

    expect(await within(dialog).findByText("No Students to send to.")).toBeInTheDocument();
  });

  it("says when the Students couldn't be counted", async () => {
    backend(on("GET", `${BULK}?batch=1`, {}, 500));
    const { dialog } = renderDialog();

    expect(
      await within(dialog).findByText("The Students couldn't be counted. Try again."),
    ).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Send" })).toBeDisabled();
  });

  it("closes with Escape", async () => {
    backend(on("GET", `${BULK}?batch=1`, { count: 2, max: 200 }));
    const { onClose } = renderDialog();

    await userEvent.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalled();
  });
});

describe("Email & SMS → Send email or SMS", () => {
  const MESSAGES = on("GET", "/api/messages/?page=1", pageOf([]));
  const CLASSES = on("GET", "/api/batches/?page=1", pageOf([MORNING]));

  it("picks a Stage or a class, counts it, then writes the message", async () => {
    const fetchFn = backend(
      MESSAGES,
      CLASSES,
      on("GET", `${BULK}?stage=lead`, { count: 4, max: 200 }),
      on("GET", `${BULK}?batch=1`, { count: 2, max: 200 }),
      on("POST", BULK, { sent: 2, failed: 0, failed_messages: [] }, 201),
    );
    renderIn(COUNSELLOR, <MessagesPage />);

    await userEvent.click(screen.getByRole("button", { name: "Send email or SMS" }));

    const pick = screen.getByRole("dialog", { name: "New bulk message" });
    const sendTo = within(pick).getByRole("combobox", { name: "Send to" });
    expect(within(sendTo).getByRole("option", { name: "Students in Stage: Lead" })).toBeVisible();
    expect(
      await within(sendTo).findByRole("option", { name: "Class: IELTS Morning" }),
    ).toBeInTheDocument();
    expect(await within(pick).findByText("4 Students")).toBeInTheDocument();
    await userEvent.selectOptions(sendTo, "Class: IELTS Morning");
    expect(await within(pick).findByText("2 Students")).toBeInTheDocument();
    await userEvent.click(within(pick).getByRole("button", { name: "Next" }));

    const compose = screen.getByRole("dialog", { name: "New bulk message" });
    expect(compose).toHaveTextContent("Class: IELTS Morning");
    await userEvent.click(await within(compose).findByRole("button", { name: "Send to 2" }));
    expect(sentBody(fetchFn)).toMatchObject({ batch: 1 });
    expect(await screen.findByRole("dialog", { name: "Sending finished" })).toBeInTheDocument();
  });

  it("sends to a Stage as a Student list", async () => {
    const fetchFn = backend(
      MESSAGES,
      CLASSES,
      on("GET", `${BULK}?stage=lead`, { count: 4, max: 200 }),
      on("POST", BULK, { sent: 4, failed: 0, failed_messages: [] }, 201),
    );
    renderIn(COUNSELLOR, <MessagesPage />);
    await userEvent.click(screen.getByRole("button", { name: "Send email or SMS" }));
    await userEvent.click(screen.getByRole("button", { name: "Next" }));

    await userEvent.click(await screen.findByRole("button", { name: "Send to 4" }));

    expect(sentBody(fetchFn)).toMatchObject({ students: { stage: "lead" } });
  });

  it.each([
    ["classes are off", CLASSES_OFF],
    ["Front Desk doesn't see classes", DESK],
  ])("offers no class when %s", async (_why, context) => {
    const fetchFn = backend(MESSAGES, on("GET", `${BULK}?stage=lead`, { count: 4, max: 200 }));
    renderIn(context, <MessagesPage />);

    await userEvent.click(screen.getByRole("button", { name: "Send email or SMS" }));

    const sendTo = screen.getByRole("combobox", { name: "Send to" });
    expect(await screen.findByText("4 Students")).toBeInTheDocument();
    expect(within(sendTo).queryByRole("option", { name: /^Class:/ })).not.toBeInTheDocument();
    expect(callsTo(fetchFn, "GET", "/api/batches/?page=1")).toHaveLength(0);
  });
});

describe("Students → Message this list", () => {
  const STUDENTS = on("GET", "/api/students/?counsellor=me", {
    count: 12,
    page: 1,
    page_size: 25,
    results: [],
  });
  const COUNSELLORS = on("GET", "/api/staff/counsellors/", []);

  it("messages the Students the filters show", async () => {
    const fetchFn = backend(
      STUDENTS,
      COUNSELLORS,
      on("GET", `${BULK}?counsellor=me`, { count: 12, max: 200 }),
      on("POST", BULK, { sent: 12, failed: 0, failed_messages: [] }, 201),
    );
    renderIn(COUNSELLOR, <StudentsPage initialSearch="" />);

    await userEvent.click(await screen.findByRole("button", { name: "Message this list" }));

    const dialog = await screen.findByRole("dialog", { name: "Message 12 Students" });
    expect(dialog).toHaveTextContent("From the current Student list filters.");
    await userEvent.click(await within(dialog).findByRole("button", { name: "Send to 12" }));
    expect(sentBody(fetchFn)).toMatchObject({ students: { counsellor: "me" } });
  });

  it("isn't offered while messaging is off", async () => {
    backend(STUDENTS, COUNSELLORS);
    renderIn(MESSAGES_OFF, <StudentsPage initialSearch="" />);

    await screen.findByRole("heading", { level: 1, name: "Students" });
    await waitFor(() => {
      expect(callsTo(vi.mocked(fetch), "GET", "/api/students/?counsellor=me")).toHaveLength(1);
    });
    expect(screen.queryByRole("button", { name: "Message this list" })).not.toBeInTheDocument();
  });
});

describe("A class → Message the class", () => {
  const ONE = on("GET", "/api/batches/1/", {
    ...MORNING,
    students: [
      { id: 7, name: "Sita Gurung", attended_percent: null },
      { id: 8, name: "Ram Shrestha", attended_percent: 92 },
    ],
  });
  const TODAY = on("GET", "/api/batches/1/attendance/2026-11-02/", {
    day: "2026-11-02",
    can_mark: false,
    marks: [],
  });

  it("messages everyone in the class", async () => {
    const fetchFn = backend(
      ONE,
      TODAY,
      on("GET", `${BULK}?batch=1`, { count: 2, max: 200 }),
      on("POST", BULK, { sent: 2, failed: 0, failed_messages: [] }, 201),
    );
    renderIn(COUNSELLOR, <BatchPage batchId={1} />);

    await userEvent.click(await screen.findByRole("button", { name: "Message the class" }));

    const dialog = screen.getByRole("dialog", { name: "Message IELTS Morning" });
    expect(dialog).toHaveTextContent("2 Students in this class.");
    await userEvent.click(await within(dialog).findByRole("button", { name: "Send to 2" }));
    expect(sentBody(fetchFn)).toMatchObject({ batch: 1 });
  });

  it.each([
    ["messaging is off", MESSAGES_OFF],
    ["a Teacher can't message", TEACHER],
  ])("isn't offered when %s", async (_why, context) => {
    backend(ONE, TODAY);
    renderIn(context, <BatchPage batchId={1} />);

    await screen.findByRole("heading", { level: 1, name: "IELTS Morning" });
    expect(screen.queryByRole("button", { name: "Message the class" })).not.toBeInTheDocument();
  });
});
