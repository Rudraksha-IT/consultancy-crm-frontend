import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { RecordId } from "@/lib/recordId";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { BatchPage } from "@/components/features/batches/BatchPage";
import { StaffContextContext } from "@/components/features/shell/staffContext";
import { StudentProfilePage } from "@/components/features/students/profile/StudentProfilePage";
import { StudentsPage } from "@/components/features/students/StudentsPage";
import { ToastProvider } from "@/components/ui/ToastProvider";
import type { StaffContext } from "@/lib/api";
import { DEFAULT_THEME } from "@/lib/theme";
import { backend, callsTo, on } from "@/test/backend";
import { consultancySummary } from "@/test/consultancy";
import { PROFILE } from "@/test/studentProfile";

import { EmailComposer } from "./EmailComposer";
import { MessagesPage } from "./MessagesPage";
import { uid } from "@/test/ids";

const OFFICE = {
  ...consultancySummary(),
  officeDetails: {
    contactEmail: "info@acme.test",
    phone: "01-4412345",
    addressLine1: "Putalisadak",
    addressLine2: "",
    website: "",
  },
  hasContactEmail: true,
};

const COUNSELLOR: StaffContext = {
  staff: { id: uid(5), name: "Bikash Thapa", email: "bikash@acme.test", role: "counsellor" },
  consultancy: OFFICE,
  modules: ["students", "communication", "batches"],
  dateDisplay: "AD",
  colourMode: "light",
  supportAccess: null,
  theme: DEFAULT_THEME,
};
const ADMIN: StaffContext = {
  ...COUNSELLOR,
  staff: { id: uid(1), name: "Asha Admin", email: "admin@acme.test", role: "admin" },
};
const NO_CONTACT = { ...consultancySummary(), hasContactEmail: false };

const SITA = { id: uid(7), name: "Sita Gurung", email: "sita@example.test" };
const HARI = { id: uid(8), name: "Hari Thapa", email: "hari@example.test" };
const GITA = { id: uid(9), name: "Gita Rai", email: "gita@example.test" };

const SENT = {
  id: uid(4),
  student: { id: uid(7), name: "Sita Gurung" },
  channel: "email",
  subject: "Your visit tomorrow",
  body: "Dear Sita,",
  status: "sent",
  error: "",
  sent_to: "sita@example.test",
  attachments: [],
  sent_at: "2026-11-02T10:04:00+05:45",
  sent_by: { id: uid(5), name: "Bikash Thapa" },
};
const FAILED = {
  ...SENT,
  id: uid(3),
  student: { id: uid(8), name: "Hari Thapa" },
  subject: "<script>alert(1)</script>",
  status: "failed",
  error: "The email couldn't be sent. Try again in a few minutes.",
};
const OLD_SMS = {
  ...SENT,
  id: uid(2),
  channel: "sms",
  subject: "",
  body: "Namaste, class at 7.",
  sent_to: "9841000001",
};

const SEND_PATH = `/api/students/${uid(7)}/messages/`;
const BULK = "/api/messages/bulk/";

function page(results: unknown[], count = results.length) {
  return { count, page: 1, page_size: 25, results };
}

function row(id: RecordId, name: string, email: string, stage = "counselling") {
  return {
    id,
    name,
    phone: "9841000001",
    email,
    country: "australia",
    source: "walk_in",
    stage,
    priority: "normal",
    assigned_counsellor: null,
  };
}

const LIST = page([
  row(uid(7), "Sita Gurung", "sita@example.test"),
  row(uid(8), "Hari Thapa", "hari@example.test"),
  row(uid(10), "Maya Lama", ""),
  row(uid(11), "Lila Shrestha", "lila@example.test", "lost"),
]);

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

describe("EmailComposer to one Student", () => {
  function renderComposer(context = COUNSELLOR, recipient = SITA) {
    const onSent = vi.fn();
    const onClose = vi.fn();
    renderIn(
      context,
      <EmailComposer recipients={[recipient]} isBulk={false} onClose={onClose} onSent={onSent} />,
    );
    return { onSent, onClose, dialog: screen.getByRole("dialog", { name: "New email" }) };
  }

  it("starts on the Plain email: who it's to, an empty subject line and the greeting", () => {
    backend();
    const { dialog } = renderComposer();

    expect(within(dialog).getByRole("list", { name: "To" })).toHaveTextContent(
      "Sita Gurung sita@example.test",
    );
    const subject = within(dialog).getByRole("textbox", { name: "Subject" });
    expect(subject).toHaveValue("");
    expect(subject).toHaveFocus();
    expect(within(dialog).getByRole("textbox", { name: "Message" })).toHaveValue(
      "Dear Sita,\n\n\n\nKind regards,\nBikash Thapa\nAcme Education",
    );
    expect(dialog).toHaveTextContent("Sent as Acme Education.");
  });

  it("previews the email as the Student gets it, as words only, with the footer", async () => {
    backend();
    const { dialog } = renderComposer();
    const subject = within(dialog).getByRole("textbox", { name: "Subject" });

    await userEvent.type(subject, "<b>Visa</b> news");

    const preview = within(dialog).getByRole("region", { name: "Preview" });
    expect(within(preview).getByRole("heading", { name: "<b>Visa</b> news" })).toBeInTheDocument();
    expect(preview.querySelector("b")?.textContent).toBe("Acme Education");
    expect(preview).toHaveTextContent("Dear Sita,");
    expect(preview).toHaveTextContent("Phone 01-4412345");
    expect(preview).toHaveTextContent("Putalisadak");
    expect(preview).toHaveTextContent(
      "This email comes from an address that can't receive replies. To answer, write to info@acme.test.",
    );
    expect(preview).toHaveTextContent("replies go to info@acme.test");
    // Typing keeps focus where it was (design system rule 8).
    expect(subject).toHaveFocus();
  });

  it("turns blank lines into paragraphs and dash lines into a list in the preview", async () => {
    backend();
    const { dialog } = renderComposer();
    const message = within(dialog).getByRole("textbox", { name: "Message" });

    await userEvent.clear(message);
    await userEvent.type(message, "Bring these:{enter}- Passport{enter}- Photo");

    const preview = within(dialog).getByRole("region", { name: "Preview" });
    expect(
      within(preview)
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual(["Passport", "Photo"]);
  });

  it("sends the trimmed subject line and message, and says it was sent", async () => {
    const fetchFn = backend(on("POST", SEND_PATH, SENT, 201));
    const { dialog, onSent } = renderComposer();

    await userEvent.type(within(dialog).getByRole("textbox", { name: "Subject" }), " Hello ");
    await userEvent.click(within(dialog).getByRole("button", { name: "Send" }));

    expect(await screen.findByText("Email sent to Sita Gurung")).toBeInTheDocument();
    expect(sentBody(fetchFn, "POST", SEND_PATH)).toEqual({
      subject: "Hello",
      body: "Dear Sita,\n\n\n\nKind regards,\nBikash Thapa\nAcme Education",
      attachments: [],
    });
    expect(onSent).toHaveBeenCalledOnce();
  });

  it("says why it failed when the mail server didn't take it", async () => {
    backend(on("POST", SEND_PATH, { ...FAILED, student: SENT.student }, 201));
    const { dialog, onSent } = renderComposer();

    await userEvent.type(within(dialog).getByRole("textbox", { name: "Subject" }), "Hi");
    await userEvent.click(within(dialog).getByRole("button", { name: "Send" }));

    expect(
      await screen.findByText("Not sent: The email couldn't be sent. Try again in a few minutes."),
    ).toBeInTheDocument();
    expect(onSent).toHaveBeenCalledOnce();
  });

  it("shows a refused subject line under it and stays open", async () => {
    backend(
      on("POST", SEND_PATH, { subject: ["Use letters, numbers and punctuation only."] }, 400),
    );
    const { dialog, onSent } = renderComposer();

    await userEvent.type(within(dialog).getByRole("textbox", { name: "Subject" }), "Hi");
    await userEvent.click(within(dialog).getByRole("button", { name: "Send" }));

    expect(
      await within(dialog).findByText("Use letters, numbers and punctuation only."),
    ).toBeInTheDocument();
    expect(onSent).not.toHaveBeenCalled();
  });

  it("needs a subject line before sending", async () => {
    const fetchFn = backend();
    const { dialog } = renderComposer();

    await userEvent.click(within(dialog).getByRole("button", { name: "Send" }));

    expect(within(dialog).getByText("Write a subject line.")).toBeInTheDocument();
    expect(within(dialog).getByRole("textbox", { name: "Subject" })).toHaveFocus();
    expect(callsTo(fetchFn, "POST", SEND_PATH)).toHaveLength(0);
  });

  it("can't send until the office has a contact email, telling Staff to ask their Admin", () => {
    backend();
    const { dialog } = renderComposer({ ...COUNSELLOR, consultancy: NO_CONTACT });

    expect(dialog).toHaveTextContent(
      "Your Admin needs to add the office's contact email in Configuration first.",
    );
    expect(within(dialog).queryByRole("link", { name: "Open Office details" })).toBeNull();
    expect(within(dialog).getByRole("button", { name: "Send" })).toBeDisabled();
  });

  it("gives an Admin a link straight to Office details", () => {
    backend();
    const { dialog } = renderComposer({ ...ADMIN, consultancy: NO_CONTACT });

    expect(within(dialog).getByRole("link", { name: "Open Office details" })).toHaveAttribute(
      "href",
      "/configuration",
    );
  });

  it("says the Student has no email address, and can't send", () => {
    backend();
    const { dialog } = renderComposer(COUNSELLOR, { ...SITA, email: "" });

    expect(dialog).toHaveTextContent("Sita Gurung has no email address.");
    expect(within(dialog).getByRole("button", { name: "Send" })).toBeDisabled();
  });

  it("switches between writing and the preview, keeping what was typed", async () => {
    backend();
    const { dialog } = renderComposer();
    await userEvent.type(within(dialog).getByRole("textbox", { name: "Subject" }), "Kept");
    const show = within(dialog).getByRole("group", { name: "Show" });

    await userEvent.click(within(show).getByRole("button", { name: "Preview" }));
    expect(within(show).getByRole("button", { name: "Preview" })).toHaveFocus();
    await userEvent.click(within(show).getByRole("button", { name: "Write" }));

    expect(within(dialog).getByRole("textbox", { name: "Subject" })).toHaveValue("Kept");
  });

  it("closes with Escape", async () => {
    backend();
    const { onClose } = renderComposer();

    await userEvent.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalledOnce();
  });
});

describe("EmailComposer to many Students", () => {
  function renderMany(onChange = vi.fn()) {
    const onClose = vi.fn();
    renderIn(
      COUNSELLOR,
      <EmailComposer
        recipients={[
          SITA,
          HARI,
          GITA,
          { id: uid(12), name: "Ram KC", email: "ram@x.test" },
          {
            id: uid(13),
            name: "Mina Rai",
            email: "mina@x.test",
          },
        ]}
        isBulk
        onClose={onClose}
        onChange={onChange}
      />,
    );
    return { onClose, dialog: screen.getByRole("dialog", { name: "Email many Students" }) };
  }

  it('starts "Dear Student,", shows four names and how many more, and counts the Send', () => {
    backend();
    const { dialog } = renderMany();

    expect(within(dialog).getByRole("textbox", { name: "Message" })).toHaveValue(
      "Dear Student,\n\n\n\nKind regards,\nBikash Thapa\nAcme Education",
    );
    const to = within(dialog).getByRole("list", { name: "To" });
    expect(within(to).getAllByRole("listitem")).toHaveLength(5);
    expect(to).toHaveTextContent("+1 more");
    expect(within(dialog).getByRole("button", { name: "Send to 5" })).toBeInTheDocument();
    expect(dialog).toHaveTextContent("5 Students, each gets their own copy.");
    expect(within(dialog).getByRole("region", { name: "Preview" })).toHaveTextContent(
      "to each Student, one by one",
    );
  });

  it("sends to the Students chosen and shows how it went", async () => {
    const result = { sent: 4, failed: 1, failed_messages: [FAILED] };
    const fetchFn = backend(on("POST", BULK, result, 201));
    const { dialog } = renderMany();

    await userEvent.type(within(dialog).getByRole("textbox", { name: "Subject" }), "Closed");
    await userEvent.click(within(dialog).getByRole("button", { name: "Send to 5" }));

    const finished = await screen.findByRole("dialog", { name: "Sending finished" });
    expect(sentBody(fetchFn, "POST", BULK)).toMatchObject({
      subject: "Closed",
      students: [uid(7), uid(8), uid(9), uid(12), uid(13)],
    });
    expect(finished).toHaveTextContent(
      "Hari Thapa: The email couldn't be sent. Try again in a few minutes.",
    );
  });

  it("goes back to choosing the Students", async () => {
    backend();
    const onChange = vi.fn();
    const { dialog } = renderMany(onChange);

    await userEvent.click(within(dialog).getByRole("button", { name: "Change" }));

    expect(onChange).toHaveBeenCalledOnce();
  });

  it("shows the server's reason for refusing who it goes to", async () => {
    backend(on("POST", BULK, { students: ["Lost Students can't be chosen."] }, 400));
    const { dialog } = renderMany();

    await userEvent.type(within(dialog).getByRole("textbox", { name: "Subject" }), "Closed");
    await userEvent.click(within(dialog).getByRole("button", { name: "Send to 5" }));

    expect(await within(dialog).findByText("Lost Students can't be chosen.")).toBeInTheDocument();
  });
});

describe("The Email page", () => {
  const list = (results: unknown[]) => on("GET", "/api/messages/?page=1", page(results));
  const students = on("GET", "/api/students/", LIST);

  it("lists every email with its subject line, status in words and reason, and past SMS", async () => {
    backend(list([SENT, FAILED, OLD_SMS]));
    renderIn(COUNSELLOR, <MessagesPage />);

    expect(await screen.findByRole("heading", { name: "Email", level: 1 })).toBeInTheDocument();
    // The title shows before the list has loaded: wait for the list itself.
    const rows = within(await screen.findByRole("list", { name: "Email" })).getAllByRole(
      "listitem",
    );
    expect(rows[0]).toHaveTextContent("Your visit tomorrow");
    expect(rows[0]).toHaveTextContent("Sent");
    expect(rows[1]).toHaveTextContent("<script>alert(1)</script>");
    expect(rows[1]).toHaveTextContent("Failed");
    expect(rows[1]).toHaveTextContent(FAILED.error);
    expect(rows[2]).toHaveTextContent("SMS (no longer available)");
    expect(rows[2]).toHaveTextContent("Namaste, class at 7.");
    expect(screen.getByText(/replies go to info@acme.test\.$/)).toBeInTheDocument();
  });

  it("names the files each email carried (ticket 12)", async () => {
    const withFiles = { ...SENT, attachments: ["brochure.pdf", "<b>fees</b>.pdf"] };
    backend(list([withFiles, FAILED]));
    renderIn(COUNSELLOR, <MessagesPage />);

    const rows = within(await screen.findByRole("list", { name: "Email" })).getAllByRole(
      "listitem",
    );
    expect(rows[0]).toHaveTextContent("Attached: brochure.pdf, <b>fees</b>.pdf");
    expect(rows[1]).not.toHaveTextContent("Attached:");
  });

  it("says when none have been sent", async () => {
    backend(list([]));
    renderIn(COUNSELLOR, <MessagesPage />);

    expect(await screen.findByText("No emails sent yet.")).toBeInTheDocument();
  });

  it("shows the contact email banner while it isn't set", async () => {
    backend(list([]));
    renderIn({ ...COUNSELLOR, consultancy: NO_CONTACT }, <MessagesPage />);

    expect(
      await screen.findByText(
        "Your Admin needs to add the office's contact email in Configuration first.",
      ),
    ).toBeInTheDocument();
  });

  it("emails one Student: search, click them, write", async () => {
    const fetchFn = backend(
      list([]),
      students,
      on("GET", "/api/students/?q=sita", page([row(uid(7), "Sita Gurung", "sita@example.test")])),
    );
    renderIn(COUNSELLOR, <MessagesPage />);

    await userEvent.click(await screen.findByRole("button", { name: "Email a Student" }));
    const picker = screen.getByRole("dialog", { name: "Email a Student" });
    expect(await within(picker).findByRole("button", { name: /Maya Lama/ })).toBeDisabled();
    expect(within(picker).getByRole("button", { name: /Lila Shrestha/ })).toBeDisabled();
    await userEvent.type(within(picker).getByRole("searchbox", { name: "Find a Student" }), "sita");
    await waitFor(() => {
      expect(callsTo(fetchFn, "GET", "/api/students/?q=sita")).toHaveLength(1);
    });
    await userEvent.click(await within(picker).findByRole("button", { name: /Sita Gurung/ }));

    const composer = screen.getByRole("dialog", { name: "New email" });
    expect(within(composer).getByRole("list", { name: "To" })).toHaveTextContent("Sita Gurung");
  });

  it("emails many Students: tick them, then Next, and Change comes back with them ticked", async () => {
    backend(list([]), students);
    renderIn(COUNSELLOR, <MessagesPage />);

    await userEvent.click(await screen.findByRole("button", { name: "Email many Students" }));
    const picker = screen.getByRole("dialog", { name: "Email many Students" });
    const next = within(picker).getByRole("button", { name: "Next: write the email" });
    expect(next).toBeDisabled();
    expect(await within(picker).findByRole("checkbox", { name: /Maya Lama/ })).toBeDisabled();
    const sita = within(picker).getByRole("checkbox", { name: /Sita Gurung/ });
    await userEvent.click(sita);
    expect(sita).toHaveFocus();
    await userEvent.click(within(picker).getByRole("checkbox", { name: /Hari Thapa/ }));
    expect(picker).toHaveTextContent("2 Students chosen");
    await userEvent.click(next);

    const composer = screen.getByRole("dialog", { name: "Email many Students" });
    expect(within(composer).getByRole("button", { name: "Send to 2" })).toBeInTheDocument();
    await userEvent.click(within(composer).getByRole("button", { name: "Change" }));
    const again = await screen.findByRole("dialog", { name: "Email many Students" });
    expect(await within(again).findByRole("checkbox", { name: /Sita Gurung/ })).toBeChecked();
    expect(again).toHaveTextContent("2 Students chosen");
  });

  it("picks one Student in a wider box closed by its ×, with no Cancel below (list tidy-ups 28)", async () => {
    backend(list([]), students);
    renderIn(COUNSELLOR, <MessagesPage />);

    await userEvent.click(await screen.findByRole("button", { name: "Email a Student" }));
    const picker = screen.getByRole("dialog", { name: "Email a Student" });

    expect(picker).toHaveClass("max-w-composer");
    expect(within(picker).queryByRole("button", { name: "Cancel" })).toBeNull();
    expect(picker.querySelector("footer")).toBeNull();
    expect(within(picker).getByRole("button", { name: "Close" })).toBeInTheDocument();
  });

  it("puts Cancel and Next at the top when picking many, the chosen names small (list tidy-ups 28)", async () => {
    backend(list([]), students);
    renderIn(COUNSELLOR, <MessagesPage />);

    await userEvent.click(await screen.findByRole("button", { name: "Email many Students" }));
    const picker = screen.getByRole("dialog", { name: "Email many Students" });
    await userEvent.click(await within(picker).findByRole("checkbox", { name: /Sita Gurung/ }));

    expect(picker).toHaveClass("max-w-composer");
    expect(picker.querySelector("footer")).toBeNull();
    const header = picker.querySelector("header");
    expect(within(header ?? picker).getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(
      within(header ?? picker).getByRole("button", { name: "Next: write the email" }),
    ).toBeEnabled();
    const found = within(picker).getByRole("list", { name: "Students" });
    expect(found).toHaveClass("overflow-y-auto");
    expect(within(found).getByText(/sita@/i)).toHaveClass("text-tiny");
    const chosen = within(picker).getByRole("list", { name: "1 Student chosen" });
    expect(within(chosen).getByText("Sita Gurung").closest("li")).toHaveClass("text-small");
  });

  it("removes a chosen Student from the summary, and Clear removes them all", async () => {
    backend(list([]), students);
    renderIn(COUNSELLOR, <MessagesPage />);

    await userEvent.click(await screen.findByRole("button", { name: "Email many Students" }));
    const picker = screen.getByRole("dialog", { name: "Email many Students" });
    await userEvent.click(await within(picker).findByRole("checkbox", { name: /Sita Gurung/ }));
    await userEvent.click(within(picker).getByRole("checkbox", { name: /Hari Thapa/ }));
    await userEvent.click(within(picker).getByRole("button", { name: "Remove Sita Gurung" }));
    expect(within(picker).getByRole("checkbox", { name: /Sita Gurung/ })).not.toBeChecked();
    await userEvent.click(within(picker).getByRole("button", { name: "Clear" }));

    expect(picker).toHaveTextContent("Nobody chosen yet.");
  });
});

describe("When things go wrong", () => {
  const list = (results: unknown[]) => on("GET", "/api/messages/?page=1", page(results));

  it("isn't available to a Teacher", () => {
    backend();
    const teacher: StaffContext = {
      ...COUNSELLOR,
      staff: { ...COUNSELLOR.staff, role: "teacher" },
    };
    renderIn(teacher, <MessagesPage />);

    expect(screen.getByText(/isn't available/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Email a Student" })).toBeNull();
  });

  it("says when the emails can't be loaded", async () => {
    backend();
    renderIn(COUNSELLOR, <MessagesPage />);

    expect(
      await screen.findByText("The emails couldn't be loaded. Try again."),
    ).toBeInTheDocument();
  });

  it("says when the Students to choose from can't be loaded", async () => {
    backend(list([]));
    renderIn(COUNSELLOR, <MessagesPage />);

    await userEvent.click(await screen.findByRole("button", { name: "Email many Students" }));

    const picker = screen.getByRole("dialog", { name: "Email many Students" });
    expect(
      await within(picker).findByText("The Students couldn't be loaded. Try again."),
    ).toBeInTheDocument();
  });

  it("closes after one email is sent and shows it in the list", async () => {
    let sent: unknown[] = [];
    const fetchFn = backend(
      (path, init) =>
        path === "/api/messages/?page=1" && (init?.method ?? "GET") === "GET"
          ? new Response(JSON.stringify(page(sent)), { status: 200 })
          : undefined,
      on("GET", "/api/students/", LIST),
      (path, init) => {
        if (path !== SEND_PATH || init?.method !== "POST") return undefined;
        sent = [SENT];
        return new Response(JSON.stringify(SENT), { status: 201 });
      },
    );
    renderIn(COUNSELLOR, <MessagesPage />);

    await userEvent.click(await screen.findByRole("button", { name: "Email a Student" }));
    await userEvent.click(await screen.findByRole("button", { name: /Sita Gurung/ }));
    const composer = screen.getByRole("dialog", { name: "New email" });
    await userEvent.type(within(composer).getByRole("textbox", { name: "Subject" }), "Hi");
    await userEvent.click(within(composer).getByRole("button", { name: "Send" }));

    expect(await screen.findByText("Your visit tomorrow")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(callsTo(fetchFn, "GET", "/api/messages/?page=1")).toHaveLength(2);
  });

  it("says the contact email is missing when the server refuses for that reason", async () => {
    const refusal = { detail: "No contact email.", code: "no_contact_email" };
    backend(on("POST", SEND_PATH, refusal, 400));
    renderIn(COUNSELLOR, <EmailComposer recipients={[SITA]} isBulk={false} onClose={vi.fn()} />);
    const dialog = screen.getByRole("dialog", { name: "New email" });

    await userEvent.type(within(dialog).getByRole("textbox", { name: "Subject" }), "Hi");
    await userEvent.click(within(dialog).getByRole("button", { name: "Send" }));

    expect(
      await within(dialog).findByText(
        "Your Admin needs to add the office's contact email in Configuration first.",
      ),
    ).toBeInTheDocument();
  });

  it("says when the email couldn't be sent at all", async () => {
    backend();
    renderIn(COUNSELLOR, <EmailComposer recipients={[SITA, HARI]} isBulk onClose={vi.fn()} />);
    const dialog = screen.getByRole("dialog", { name: "Email many Students" });

    await userEvent.type(within(dialog).getByRole("textbox", { name: "Subject" }), "Hi");
    await userEvent.click(within(dialog).getByRole("button", { name: "Send to 2" }));

    expect(
      await within(dialog).findByText("The email couldn't be sent. Try again."),
    ).toBeInTheDocument();
  });

  it("shows the office's logo in the preview when it has one", () => {
    backend();
    const withLogo: StaffContext = {
      ...COUNSELLOR,
      consultancy: { ...OFFICE, logo: { url: "/api/consultancy/logo/3/", showName: true } },
    };
    renderIn(withLogo, <EmailComposer recipients={[SITA]} isBulk={false} onClose={vi.fn()} />);

    const preview = screen.getByRole("region", { name: "Preview" });
    expect(within(preview).getByRole("img", { name: "Acme Education" })).toBeInTheDocument();
  });

  it("starts with nobody ticked, and says so, when a class's Students can't be loaded", async () => {
    backend(
      on("GET", `/api/batches/${uid(1)}/`, {
        id: uid(1),
        name: "IELTS Morning",
        test_type: "ielts",
        teacher: { id: uid(9), name: "Gita Lama" },
        time_slot: "7:00-8:30 AM",
        starts_on: "2026-10-05",
        ends_on: "2026-12-04",
        timing: "running",
        student_count: 0,
        attendance_taken_today: false,
        can_change: true,
        students: [],
      }),
      on("GET", "/api/students/", LIST),
    );
    renderIn(COUNSELLOR, <BatchPage batchId={uid(1)} />);

    await userEvent.click(await screen.findByRole("button", { name: "Email the class" }));

    const picker = await screen.findByRole("dialog", { name: "Email many Students" });
    expect(picker).toHaveTextContent("The Students couldn't be loaded. Try again.");
    expect(picker).toHaveTextContent("Nobody chosen yet.");
  });
});

describe("On a Student's page", () => {
  const profile = on("GET", `/api/students/${uid(7)}/`, PROFILE);
  const history = on("GET", `/api/students/${uid(7)}/history/`, { ...page([]), page_size: 50 });
  const visits = on("GET", `/api/students/${uid(7)}/visits/?page=1`, {
    ...page([]),
    page_size: 50,
  });
  const studentMessages = (results: unknown[]) =>
    on("GET", `/api/students/${uid(7)}/messages/?page=1`, page(results));

  it("has Send email as its own button, which opens the composer to them", async () => {
    backend(profile, history);
    renderIn(COUNSELLOR, <StudentProfilePage studentId={uid(7)} />);

    await userEvent.click(await screen.findByRole("button", { name: "Send email" }));

    const composer = screen.getByRole("dialog", { name: "New email" });
    expect(within(composer).getByRole("list", { name: "To" })).toHaveTextContent(
      "Sita Gurung sita@example.test",
    );
  });

  it("doesn't offer it while the Module is off", async () => {
    backend(profile, history);
    renderIn({ ...COUNSELLOR, modules: ["students"] }, <StudentProfilePage studentId={uid(7)} />);

    expect(await screen.findByRole("heading", { name: "Sita Gurung" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Send email" })).not.toBeInTheDocument();
  });

  it("shows the Student's emails in their Activity by subject line", async () => {
    backend(
      profile,
      history,
      visits,
      studentMessages([SENT, { ...FAILED, student: SENT.student }]),
    );
    renderIn(COUNSELLOR, <StudentProfilePage studentId={uid(7)} />);

    await userEvent.click(await screen.findByRole("tab", { name: "Activity" }));

    const timeline = await screen.findByRole("list", { name: "Activity" });
    expect(within(timeline).getByText("Email sent: “Your visit tomorrow”")).toBeInTheDocument();
    expect(
      within(timeline).getByText("Email failed: “<script>alert(1)</script>”"),
    ).toBeInTheDocument();
  });

  it("names the files an email carried in their Activity (ticket 12)", async () => {
    backend(
      profile,
      history,
      visits,
      studentMessages([{ ...SENT, attachments: ["brochure.pdf", "sample.pdf"] }]),
    );
    renderIn(COUNSELLOR, <StudentProfilePage studentId={uid(7)} />);

    await userEvent.click(await screen.findByRole("tab", { name: "Activity" }));

    const timeline = await screen.findByRole("list", { name: "Activity" });
    expect(within(timeline).getByText("Attached: brochure.pdf, sample.pdf")).toBeInTheDocument();
  });
});

describe("Pre-ticked from a list or a class", () => {
  const choosable = {
    students: [
      { id: uid(7), name: "Sita Gurung", email: "sita@example.test", stage: "counselling" },
      { id: uid(8), name: "Hari Thapa", email: "hari@example.test", stage: "lead" },
    ],
    count: 2,
    max: 200,
  };

  const MINE = "/api/students/?counsellor=me";
  const COUNSELLORS = on("GET", "/api/staff/counsellors/", []);
  const CLASS = on("GET", `/api/batches/${uid(1)}/`, {
    id: uid(1),
    name: "IELTS Morning",
    test_type: "ielts",
    teacher: { id: uid(9), name: "Gita Lama" },
    time_slot: "7:00-8:30 AM",
    starts_on: "2026-10-05",
    ends_on: "2026-12-04",
    timing: "running",
    student_count: 2,
    attendance_taken_today: false,
    can_change: true,
    students: [
      { id: uid(7), name: "Sita Gurung", attended_percent: null },
      { id: uid(8), name: "Hari Thapa", attended_percent: 92 },
    ],
  });

  it("Email this list pre-ticks the Students its filters show", async () => {
    const fetchFn = backend(
      on("GET", MINE, LIST),
      COUNSELLORS,
      on("GET", `${BULK}?counsellor=me`, choosable),
      on("GET", "/api/students/", LIST),
    );
    renderIn(COUNSELLOR, <StudentsPage initialSearch="" />);

    await userEvent.click(await screen.findByRole("button", { name: "Email this list" }));

    const picker = await screen.findByRole("dialog", { name: "Email many Students" });
    expect(await within(picker).findByText("2 Students chosen")).toBeInTheDocument();
    expect(await within(picker).findByRole("checkbox", { name: /Sita Gurung/ })).toBeChecked();
    expect(callsTo(fetchFn, "GET", `${BULK}?counsellor=me`)).toHaveLength(1);
  });

  it("Email the class pre-ticks its Students, saying when there are more than can be sent", async () => {
    backend(
      CLASS,
      on("GET", `${BULK}?batch=${uid(1)}`, { ...choosable, count: 3, max: 2 }),
      on("GET", "/api/students/", LIST),
    );
    renderIn(COUNSELLOR, <BatchPage batchId={uid(1)} />);

    await userEvent.click(await screen.findByRole("button", { name: "Email the class" }));

    const picker = await screen.findByRole("dialog", { name: "Email many Students" });
    expect(await within(picker).findByText("2 Students chosen")).toBeInTheDocument();
    expect(picker).toHaveTextContent("3 Students can be chosen. The first 2 are ticked");
  });

  it("Email the class opens on Class details for that class", async () => {
    const classes = [
      { id: uid(2), label: "PTE Evening, 5 PM" },
      { id: uid(1), label: "IELTS Morning, 7 AM" },
    ];
    const details = {
      subject: "Your class: IELTS Morning",
      body: "Dear Student,",
      attachments: [],
    };
    backend(
      CLASS,
      on("GET", `${BULK}?batch=${uid(1)}`, choosable),
      on("GET", "/api/students/", LIST),
      on("GET", "/api/messages/bulk/ready-made/", {
        kinds: [
          { kind: "class_details", record: "batch", records: classes, unavailable: null },
          { kind: "plain", record: null, records: [], unavailable: null },
        ],
      }),
      on("GET", `/api/messages/bulk/draft/?kind=class_details&record=${uid(1)}`, details),
    );
    renderIn(COUNSELLOR, <BatchPage batchId={uid(1)} />);
    await userEvent.click(await screen.findByRole("button", { name: "Email the class" }));
    const picker = await screen.findByRole("dialog", { name: "Email many Students" });
    await within(picker).findByText(/Students? chosen/);

    await userEvent.click(within(picker).getByRole("button", { name: "Next: write the email" }));

    const composer = await screen.findByRole("dialog", { name: "Email many Students" });
    expect(await within(composer).findByDisplayValue(details.subject)).toBeInTheDocument();
    expect(within(composer).getByRole("combobox", { name: "Class" })).toHaveValue(uid(1));
  });

  const EMAIL_OFF: StaffContext = { ...COUNSELLOR, modules: ["students", "batches"] };
  const TEACHER: StaffContext = { ...COUNSELLOR, staff: { ...COUNSELLOR.staff, role: "teacher" } };

  it.each([
    ["the Module is off", EMAIL_OFF],
    ["a Teacher can't email", TEACHER],
  ])("Email the class isn't offered when %s", async (_why, context) => {
    backend(CLASS);
    renderIn(context, <BatchPage batchId={uid(1)} />);

    await screen.findByRole("heading", { level: 1, name: "IELTS Morning" });
    expect(screen.queryByRole("button", { name: "Email the class" })).not.toBeInTheDocument();
  });
});

describe("the email windows are wide (list tidy-ups 28)", () => {
  it("makes the writer and the picker 100rem wide at most, the writer 38rem tall at most", () => {
    const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

    expect(css).toMatch(/--container-composer: 100rem;/);
    expect(css).toMatch(/--spacing-composer: min\(38rem, calc\(100dvh - 2rem\)\);/);
  });
});

describe("the email windows use smaller text (list tidy-ups 31)", () => {
  it("marks the picker and the writer for small text", async () => {
    backend(on("GET", "/api/messages/?page=1", page([])), on("GET", "/api/students/", LIST));
    renderIn(COUNSELLOR, <MessagesPage />);

    await userEvent.click(await screen.findByRole("button", { name: "Email a Student" }));
    const picker = screen.getByRole("dialog", { name: "Email a Student" });
    expect(picker).toHaveAttribute("data-small-text");
    await userEvent.click(await within(picker).findByRole("button", { name: /Sita Gurung/ }));

    expect(screen.getByRole("dialog", { name: "New email" })).toHaveAttribute("data-small-text");
  });

  it("steps every text size down inside them, typing boxes too above phone width", () => {
    const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
    const start = css.indexOf("Small text in a dialog");
    const rules = css.slice(start, css.indexOf("End of small text in a dialog", start));

    expect(rules).toMatch(/\[data-small-text\] \{[^}]*--text-body: 0\.875rem/);
    expect(rules).toMatch(/\[data-small-text\] \{[^}]*--size-secondary: 0\.875rem/);
    expect(rules).toMatch(/--size-small: 0\.8125rem/);
    expect(rules).toMatch(/:is\(input, textarea, select\)[^{]*\{[^}]*font-size: 0\.875rem/);
  });
});
