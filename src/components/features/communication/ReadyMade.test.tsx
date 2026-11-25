import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { StaffContextContext } from "@/components/features/shell/staffContext";
import { ToastProvider } from "@/components/ui/ToastProvider";
import type { StaffContext } from "@/lib/api";
import { DEFAULT_THEME } from "@/lib/theme";
import { backend, callsTo, on } from "@/test/backend";
import { consultancySummary } from "@/test/consultancy";
import { applyThemeCase, resetTheme, THEME_CASES } from "@/test/themes";

import { EmailComposer } from "./EmailComposer";
import { uid } from "@/test/ids";

const COUNSELLOR: StaffContext = {
  staff: { id: uid(5), name: "Bikash Thapa", email: "bikash@acme.test", role: "counsellor" },
  consultancy: {
    ...consultancySummary(),
    officeDetails: {
      contactEmail: "info@acme.test",
      phone: "",
      addressLine1: "",
      addressLine2: "",
      website: "",
    },
    hasContactEmail: true,
  },
  modules: ["students", "communication", "batches", "accounts"],
  dateDisplay: "AD",
  colourMode: "light",
  supportAccess: null,
  theme: DEFAULT_THEME,
};

const SITA = { id: uid(7), name: "Sita Gurung", email: "sita@example.test" };
const HARI = { id: uid(8), name: "Hari Thapa", email: "hari@example.test" };

const MENU_PATH = `/api/students/${uid(7)}/emails/ready-made/`;
const DRAFT_PATH = `/api/students/${uid(7)}/emails/draft/`;
const BULK_MENU_PATH = "/api/messages/bulk/ready-made/";
const BULK_DRAFT_PATH = "/api/messages/bulk/draft/";
const SEND_PATH = `/api/students/${uid(7)}/messages/`;

const PAYMENTS = [
  { id: uid(12), label: "Receipt 000012: Visa fee, NPR 40,000, 2 Nov 2026" },
  { id: uid(9), label: "Receipt 000009: IELTS class, NPR 10,000, 1 Oct 2026" },
];
const CLASSES = [{ id: uid(3), label: "IELTS Morning, 7:00-8:30 AM" }];

const MENU = {
  kinds: [
    { kind: "welcome", record: null, records: [], unavailable: null },
    { kind: "documents_needed", record: null, records: [], unavailable: "Every document is in" },
    { kind: "payment_received", record: "payment", records: PAYMENTS, unavailable: null },
    { kind: "fee_reminder", record: null, records: [], unavailable: "Only an Admin can send it" },
    { kind: "offer_received", record: "offer", records: [], unavailable: "No offer letters yet" },
    { kind: "visa_result", record: "visa", records: [], unavailable: "No visa result yet" },
    { kind: "class_details", record: "batch", records: CLASSES, unavailable: null },
    { kind: "checking_in", record: null, records: [], unavailable: "Only for Lost Students" },
    { kind: "plain", record: null, records: [], unavailable: null },
  ],
};
const BULK_MENU = {
  kinds: [
    { kind: "class_details", record: "batch", records: CLASSES, unavailable: null },
    { kind: "checking_in", record: null, records: [], unavailable: null },
    { kind: "plain", record: null, records: [], unavailable: null },
  ],
};

const WELCOME = {
  subject: "Welcome to Acme Education",
  body: "Dear Sita,\n\nThank you for choosing Acme Education.\n\nKind regards,\nBikash Thapa\nAcme Education",
  attachments: [],
};
const PAID_12 = {
  subject: "Payment received: receipt 000012",
  body: "Dear Sita,\n\nAmount: NPR 40,000\n\nKind regards,\nBikash Thapa\nAcme Education",
  attachments: [],
};
const PAID_9 = {
  subject: "Payment received: receipt 000009",
  body: "Dear Sita,\n\nAmount: NPR 10,000\n\nKind regards,\nBikash Thapa\nAcme Education",
  attachments: [],
};
const CLASS = {
  subject: "Your class: IELTS Morning",
  body: "Dear Student,\n\nClass: IELTS Morning\n\nKind regards,\nBikash Thapa\nAcme Education",
  attachments: [],
};

const CHECKING_IN = {
  subject: "Checking in from Acme Education",
  body: "Dear Student,\n\nWe haven't heard from you in a while.\n\nKind regards,\nBikash Thapa",
  attachments: [],
};

const draftPath = (path: string, kind: string, record?: number) =>
  `${path}?${new URLSearchParams(record === undefined ? { kind } : { kind, record: uid(record) }).toString()}`;

/** The backend for one Student: the menu and each draft. */
function oneStudentBackend(...more: Parameters<typeof backend>) {
  return backend(
    ...more,
    on("GET", MENU_PATH, MENU),
    on("GET", draftPath(DRAFT_PATH, "welcome"), WELCOME),
    on("GET", draftPath(DRAFT_PATH, "payment_received", 12), PAID_12),
    on("GET", draftPath(DRAFT_PATH, "payment_received", 9), PAID_9),
  );
}

type ComposerOptions = Partial<React.ComponentProps<typeof EmailComposer>>;

function renderComposer(options: ComposerOptions = {}) {
  render(
    <StaffContextContext value={COUNSELLOR}>
      <ToastProvider>
        <EmailComposer
          recipients={[SITA]}
          isBulk={false}
          onClose={vi.fn()}
          onSent={vi.fn()}
          {...options}
        />
      </ToastProvider>
    </StaffContextContext>,
  );
  const dialog = screen.getByRole("dialog");
  return {
    dialog,
    kind: () => within(dialog).getByRole("combobox", { name: "Email" }),
    subject: () => within(dialog).getByRole("textbox", { name: "Subject" }),
    message: () => within(dialog).getByRole("textbox", { name: "Message" }),
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Ready-made emails to one Student", () => {
  it("opens on the first one that can be used, filled in by the backend", async () => {
    oneStudentBackend();
    const { kind, subject, message } = renderComposer();

    await waitFor(() => {
      expect(subject()).toHaveValue(WELCOME.subject);
    });
    expect(kind()).toHaveValue("welcome");
    expect(message()).toHaveValue(WELCOME.body);
    // No note under the choice (list tidy-ups 32).
    expect(screen.queryByText(/Choosing another email replaces/)).toBeNull();
    expect(screen.queryByText(/Greets them by name/)).toBeNull();
  });

  it("offers all nine, greying out those that can't be used with the reason", async () => {
    oneStudentBackend();
    const { kind, subject } = renderComposer();
    await waitFor(() => {
      expect(subject()).toHaveValue(WELCOME.subject);
    });

    const options = within(kind()).getAllByRole("option");
    expect(options.map((option) => option.textContent)).toEqual([
      "Welcome",
      "Documents needed (every document is in)",
      "Payment received",
      "Fee reminder (only an admin can send it)",
      "Offer received (no offer letters yet)",
      "Visa result (no visa result yet)",
      "Class details",
      "Checking in (only for lost students)",
      "Plain email",
    ]);
    expect(within(kind()).getByRole("option", { name: /^Offer received/ })).toBeDisabled();
    expect(within(kind()).getByRole("option", { name: "Payment received" })).toBeEnabled();
  });

  it("asks for the Payment and fills in the first, then another, keeping focus", async () => {
    const fetchFn = oneStudentBackend();
    const { dialog, kind, subject, message } = renderComposer();
    await waitFor(() => {
      expect(subject()).toHaveValue(WELCOME.subject);
    });

    await userEvent.selectOptions(kind(), "payment_received");

    const payment = await within(dialog).findByRole("combobox", { name: "Payment" });
    await waitFor(() => {
      expect(subject()).toHaveValue(PAID_12.subject);
    });
    expect(message()).toHaveValue(PAID_12.body);
    expect(kind()).toHaveFocus();
    expect(
      within(payment)
        .getAllByRole("option")
        .map((o) => o.textContent),
    ).toEqual(PAYMENTS.map((p) => p.label));

    await userEvent.selectOptions(payment, uid(9));

    await waitFor(() => {
      expect(subject()).toHaveValue(PAID_9.subject);
    });
    expect(payment).toHaveFocus();
    expect(callsTo(fetchFn, "GET", draftPath(DRAFT_PATH, "payment_received", 9))).toHaveLength(1);
  });

  it("shows the draft in the preview", async () => {
    oneStudentBackend();
    const { dialog, subject } = renderComposer();
    await waitFor(() => {
      expect(subject()).toHaveValue(WELCOME.subject);
    });

    const preview = within(dialog).getByRole("region", { name: "Preview" });
    expect(within(preview).getByRole("heading", { name: WELCOME.subject })).toBeInTheDocument();
    expect(preview).toHaveTextContent("Thank you for choosing Acme Education.");
  });

  it("sends what Staff edited", async () => {
    const fetchFn = oneStudentBackend(on("POST", SEND_PATH, sentMessage(), 201));
    const { dialog, subject, message } = renderComposer();
    await waitFor(() => {
      expect(subject()).toHaveValue(WELCOME.subject);
    });

    await userEvent.type(message(), "{enter}See you on Sunday.");
    await userEvent.click(within(dialog).getByRole("button", { name: "Send" }));

    await screen.findByText("Email sent to Sita Gurung");
    const body = callsTo(fetchFn, "POST", SEND_PATH)[0]?.[1]?.body;
    expect(typeof body === "string" ? JSON.parse(body) : null).toEqual({
      subject: WELCOME.subject,
      body: `${WELCOME.body}\nSee you on Sunday.`,
      attachments: [],
    });
  });

  it("starts again from the ready-made text after editing, keeping focus nearby", async () => {
    oneStudentBackend();
    const { dialog, subject, message } = renderComposer();
    await waitFor(() => {
      expect(subject()).toHaveValue(WELCOME.subject);
    });
    expect(within(dialog).queryByRole("button", { name: "Start again" })).toBeNull();

    await userEvent.clear(subject());
    await userEvent.type(subject(), "Hello");
    await userEvent.click(within(dialog).getByRole("button", { name: "Start again" }));

    await waitFor(() => {
      expect(subject()).toHaveValue(WELCOME.subject);
    });
    expect(message()).toHaveValue(WELCOME.body);
    expect(message()).toHaveFocus();
    expect(within(dialog).queryByRole("button", { name: "Start again" })).toBeNull();
  });

  it("opens on the email and record it was asked for, e.g. from a receipt", async () => {
    oneStudentBackend();
    const { dialog, kind, subject } = renderComposer({
      startWith: { kind: "payment_received", record: uid(9) },
    });

    await waitFor(() => {
      expect(subject()).toHaveValue(PAID_9.subject);
    });
    expect(kind()).toHaveValue("payment_received");
    expect(within(dialog).getByRole("combobox", { name: "Payment" })).toHaveValue(uid(9));
  });

  it("starts from given words: a subject, and a line under the greeting (Course brochures)", async () => {
    const plain = {
      subject: "",
      body: "Dear Sita,\n\nKind regards,\nBikash Thapa\nAcme Education",
      attachments: [],
    };
    oneStudentBackend(on("GET", draftPath(DRAFT_PATH, "plain"), plain));
    const { kind, subject, message } = renderComposer({
      startWith: {
        kind: "plain",
        text: { subject: "Master of IT at Deakin", line: "Here is the brochure for Master of IT." },
      },
    });

    await waitFor(() => {
      expect(subject()).toHaveValue("Master of IT at Deakin");
    });
    expect(kind()).toHaveValue("plain");
    expect(message()).toHaveValue(
      "Dear Sita,\n\nHere is the brochure for Master of IT.\n\nKind regards,\nBikash Thapa\nAcme Education",
    );
  });

  it("uses the given words only once: choosing another email replaces them", async () => {
    const plain = {
      subject: "",
      body: "Dear Sita,\n\nKind regards,\nBikash Thapa",
      attachments: [],
    };
    oneStudentBackend(on("GET", draftPath(DRAFT_PATH, "plain"), plain));
    const { kind, subject, message } = renderComposer({
      startWith: { kind: "plain", text: { subject: "Brochures", line: "Here they are." } },
    });
    await waitFor(() => {
      expect(subject()).toHaveValue("Brochures");
    });

    await userEvent.selectOptions(kind(), "welcome");

    await waitFor(() => {
      expect(subject()).toHaveValue(WELCOME.subject);
    });
    expect(message()).toHaveValue(WELCOME.body);
  });

  it("keeps what was typed before the ready-made emails arrived", async () => {
    let answer: (response: Response) => void = () => undefined;
    const menu = new Promise<Response>((resolve) => {
      answer = resolve;
    });
    const fetchFn = vi.fn((path: string) =>
      path === MENU_PATH ? menu : Promise.resolve(Response.json(WELCOME)),
    );
    vi.stubGlobal("fetch", fetchFn);
    const { kind, subject } = renderComposer();

    await userEvent.type(subject(), "My own words");
    answer(Response.json(MENU));

    await waitFor(() => {
      expect(kind()).toHaveValue("plain");
    });
    expect(subject()).toHaveValue("My own words");
    expect(fetchFn.mock.calls.map(([path]) => path)).toEqual([MENU_PATH]);
  });

  it("falls back to writing it yourself when the ready-made emails can't load", async () => {
    backend();
    const { dialog, message } = renderComposer();

    expect(
      await within(dialog).findByText(
        "The ready-made emails couldn't be loaded. You can still write the email yourself.",
      ),
    ).toBeInTheDocument();
    expect(message()).toHaveValue("Dear Sita,\n\n\n\nKind regards,\nBikash Thapa\nAcme Education");
    expect(within(dialog).queryByRole("combobox", { name: "Email" })).toBeNull();
  });

  it("says so when one email can't be filled in, leaving the text alone", async () => {
    backend(on("GET", MENU_PATH, MENU), on("GET", draftPath(DRAFT_PATH, "welcome"), WELCOME));
    const { dialog, kind, subject } = renderComposer();
    await waitFor(() => {
      expect(subject()).toHaveValue(WELCOME.subject);
    });

    await userEvent.selectOptions(kind(), "payment_received");

    expect(
      await within(dialog).findByText(
        "That email couldn't be filled in. Try again, or write it yourself.",
      ),
    ).toBeInTheDocument();
    expect(subject()).toHaveValue(WELCOME.subject);
  });

  it("shows a damaged menu as one that couldn't load", async () => {
    backend(on("GET", MENU_PATH, { kinds: [{ kind: "sms" }] }));
    const { dialog } = renderComposer();

    expect(
      await within(dialog).findByText(/The ready-made emails couldn't be loaded/),
    ).toBeInTheDocument();
  });
});

describe("Ready-made emails to many Students", () => {
  function renderBulk() {
    return renderComposer({ recipients: [SITA, HARI], isBulk: true });
  }

  it("offers Class details and Plain email, starting Dear Student,", async () => {
    backend(
      on("GET", BULK_MENU_PATH, BULK_MENU),
      on("GET", draftPath(BULK_DRAFT_PATH, "class_details", 3), CLASS),
    );
    const { dialog, kind, subject, message } = renderBulk();

    await waitFor(() => {
      expect(subject()).toHaveValue(CLASS.subject);
    });
    expect(message()).toHaveValue(CLASS.body);
    expect(
      within(kind())
        .getAllByRole("option")
        .map((o) => o.textContent),
    ).toEqual(["Class details", "Checking in", "Plain email"]);
    expect(within(dialog).getByRole("combobox", { name: "Class" })).toHaveValue(uid(3));
  });

  it("opens on Checking in when every Student chosen is Lost (list tidy-ups 34)", async () => {
    backend(
      on("GET", BULK_MENU_PATH, BULK_MENU),
      on("GET", draftPath(BULK_DRAFT_PATH, "checking_in"), CHECKING_IN),
    );
    const { kind, subject } = renderComposer({
      recipients: [
        { ...SITA, stage: "lost" },
        { ...HARI, stage: "lost" },
      ],
      isBulk: true,
    });

    await waitFor(() => {
      expect(subject()).toHaveValue(CHECKING_IN.subject);
    });
    expect(kind()).toHaveValue("checking_in");
  });

  it("never opens on Checking in when someone chosen isn't Lost, even with no class", async () => {
    const plain = { subject: "", body: "Dear Student,\n\n\n\nKind regards", attachments: [] };
    const noClass = {
      kinds: BULK_MENU.kinds.map((entry) =>
        entry.kind === "class_details"
          ? { ...entry, records: [], unavailable: "No classes yet" }
          : entry,
      ),
    };
    backend(
      on("GET", BULK_MENU_PATH, noClass),
      on("GET", draftPath(BULK_DRAFT_PATH, "plain"), plain),
    );
    const { kind, message } = renderComposer({
      recipients: [{ ...SITA, stage: "lost" }, HARI],
      isBulk: true,
    });

    await waitFor(() => {
      expect(message()).toHaveValue(plain.body);
    });
    expect(kind()).toHaveValue("plain");
  });

  it("asks the backend for the Plain email when it is chosen", async () => {
    const plain = {
      subject: "",
      body: "Dear Student,\n\n\n\nKind regards,\nBikash Thapa",
      attachments: [],
    };
    backend(
      on("GET", BULK_MENU_PATH, BULK_MENU),
      on("GET", draftPath(BULK_DRAFT_PATH, "class_details", 3), CLASS),
      on("GET", draftPath(BULK_DRAFT_PATH, "plain"), plain),
    );
    const { dialog, kind, subject, message } = renderBulk();
    await waitFor(() => {
      expect(subject()).toHaveValue(CLASS.subject);
    });

    await userEvent.selectOptions(kind(), "plain");

    await waitFor(() => {
      expect(message()).toHaveValue(plain.body);
    });
    expect(subject()).toHaveValue("");
    expect(within(dialog).queryByRole("combobox", { name: "Class" })).toBeNull();
  });
});

describe.each(THEME_CASES)("Ready-made emails in the $name Theme", ({ mode }) => {
  beforeEach(() => {
    applyThemeCase(mode);
  });

  afterEach(() => {
    resetTheme();
  });

  it("shows the Email row and the record picker", async () => {
    oneStudentBackend();
    const { dialog, kind } = renderComposer({ startWith: { kind: "payment_received" } });

    expect(await within(dialog).findByRole("combobox", { name: "Payment" })).toBeInTheDocument();
    expect(kind()).toHaveValue("payment_received");
  });
});

function sentMessage() {
  return {
    id: uid(4),
    student: { id: uid(7), name: "Sita Gurung" },
    channel: "email",
    subject: WELCOME.subject,
    body: WELCOME.body,
    status: "sent",
    error: "",
    sent_to: "sita@example.test",
    attachments: [],
    sent_at: "2026-11-02T10:04:00+05:45",
    sent_by: { id: uid(5), name: "Bikash Thapa" },
  };
}
