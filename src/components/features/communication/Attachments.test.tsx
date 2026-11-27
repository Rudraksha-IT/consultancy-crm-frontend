import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { StaffContextContext } from "@/components/features/shell/staffContext";
import { ToastProvider } from "@/components/ui/ToastProvider";
import type { Attachable, StaffContext } from "@/lib/api";
import type { RecordId } from "@/lib/recordId";
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
  modules: ["students", "communication"],
  dateDisplay: "AD",
  colourMode: "light",
  supportAccess: null,
};

const SITA = { id: uid(7), name: "Sita Gurung", email: "sita@example.test" };
const HARI = { id: uid(8), name: "Hari Thapa", email: "hari@example.test" };
const MB = 1024 * 1024;

const MENU_PATH = `/api/students/${uid(7)}/emails/ready-made/`;
const DRAFT_PATH = `/api/students/${uid(7)}/emails/draft/`;
const ATTACHABLE_PATH = `/api/students/${uid(7)}/emails/attachable/`;
const BULK_MENU_PATH = "/api/messages/bulk/ready-made/";
const BULK_DRAFT_PATH = "/api/messages/bulk/draft/";
const BULK_ATTACHABLE_PATH = "/api/messages/bulk/attachable/";
const SEND_PATH = `/api/students/${uid(7)}/messages/`;
const BULK_PATH = "/api/messages/bulk/";

const apiFile = (
  kind: Attachable["kind"],
  id: RecordId,
  name: string,
  size: number,
  group: string,
) => ({
  kind,
  id,
  name,
  file_name: name.endsWith(".pdf") || name.endsWith(".png") ? name : `${name}.pdf`,
  size,
  group,
});

const BROCHURE = apiFile("course_file", uid(3), "brochure.pdf", 2 * MB, "Deakin University, MIT");
const SAMPLE = apiFile(
  "document_example",
  uid(4),
  "sample-statement.pdf",
  200 * 1024,
  "Bank Statement",
);
const PASSPORT = apiFile("document_file", uid(9), "passport.pdf", 5 * MB, "Passport");
const BIG = apiFile("course_file", uid(6), "big-brochure.pdf", 5 * MB + MB / 2, "RMIT, MBA");
const ATTACHABLE = {
  course_files: [BROCHURE, BIG],
  document_examples: [SAMPLE],
  documents: [PASSPORT],
  max_bytes: 10 * MB,
};

const MENU = {
  kinds: [
    { kind: "documents_needed", record: null, records: [], unavailable: null },
    { kind: "welcome", record: null, records: [], unavailable: null },
    { kind: "plain", record: null, records: [], unavailable: null },
  ],
};
const NEEDED = {
  subject: "Documents we still need from you",
  body: "Dear Sita,\n\n- Bank Statement\n\nWe've attached examples.",
  attachments: [SAMPLE],
};
const WELCOME = { subject: "Welcome", body: "Dear Sita,\n\nWelcome.", attachments: [] };
const PLAIN = { subject: "", body: "Dear Sita,\n\n\n\nKind regards", attachments: [] };

const draftPath = (path: string, kind: string) =>
  `${path}?${new URLSearchParams({ kind }).toString()}`;

function sentMessage(attachments: string[]) {
  return {
    id: uid(4),
    student: { id: uid(7), name: "Sita Gurung" },
    channel: "email",
    subject: "Documents we still need from you",
    body: "Dear Sita,",
    status: "sent",
    error: "",
    sent_to: "sita@example.test",
    attachments,
    sent_at: "2026-11-02T10:04:00+05:45",
    sent_by: { id: uid(5), name: "Bikash Thapa" },
  };
}

function oneStudentBackend(...more: Parameters<typeof backend>) {
  return backend(
    ...more,
    on("GET", MENU_PATH, MENU),
    on("GET", draftPath(DRAFT_PATH, "documents_needed"), NEEDED),
    on("GET", draftPath(DRAFT_PATH, "welcome"), WELCOME),
    on("GET", draftPath(DRAFT_PATH, "plain"), PLAIN),
    on("GET", ATTACHABLE_PATH, ATTACHABLE),
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
  const form = () => within(dialog).getByRole("region", { name: "Attached files" });
  return {
    dialog,
    form,
    chips: () => within(form()).queryByRole("list", { name: "Attached files" }),
    attach: () => within(dialog).getByRole("button", { name: "Attach files" }),
    send: () => within(dialog).getByRole("button", { name: /^Send/ }),
    subject: () => within(dialog).getByRole("textbox", { name: "Subject" }),
  };
}

function sentBody(fetchFn: ReturnType<typeof backend>, path: string): unknown {
  const body = callsTo(fetchFn, "POST", path)[0]?.[1]?.body;
  return typeof body === "string" ? JSON.parse(body) : null;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Attachments in an email to one Student", () => {
  it("attaches the examples Documents needed suggests, with their size and the total", async () => {
    oneStudentBackend();
    const { chips, form } = renderComposer();

    await waitFor(() => {
      expect(chips()).not.toBeNull();
    });
    expect(chips()).toHaveTextContent("sample-statement.pdf");
    expect(chips()).toHaveTextContent("200 KB");
    expect(form()).toHaveTextContent("200 KB of 10 MB");
  });

  it("says up to 10 MB while nothing is attached", async () => {
    oneStudentBackend();
    const { form, subject } = renderComposer({ startWith: { kind: "welcome" } });

    await waitFor(() => {
      expect(subject()).toHaveValue("Welcome");
    });
    expect(form()).toHaveTextContent("Up to 10 MB in all");
  });

  it("picks files from the app by where they come from, and sends them by kind and id", async () => {
    const fetchFn = oneStudentBackend(
      on("POST", SEND_PATH, sentMessage(["sample-statement.pdf", "brochure.pdf"]), 201),
    );
    const { dialog, attach, send, chips } = renderComposer();
    await waitFor(() => {
      expect(chips()).not.toBeNull();
    });

    await userEvent.click(attach());
    expect(attach()).toHaveAttribute("aria-expanded", "true");
    const picker = await within(dialog).findByRole("group", { name: "Attach files from the app" });
    const brochure = await within(picker).findByRole("checkbox", { name: /^brochure\.pdf/ });
    expect(within(picker).getByText("Deakin University, MIT · 2.0 MB")).toBeInTheDocument();
    await userEvent.click(brochure);
    expect(brochure).toBeChecked();
    expect(brochure).toHaveFocus();

    await userEvent.click(within(picker).getByRole("button", { name: "Their Documents" }));
    expect(within(picker).getByRole("checkbox", { name: /passport\.pdf/ })).not.toBeChecked();
    await userEvent.click(within(picker).getByRole("button", { name: "Done" }));
    expect(attach()).toHaveFocus();
    expect(within(dialog).queryByRole("group", { name: "Attach files from the app" })).toBeNull();

    await userEvent.click(send());
    await screen.findByText("Email sent to Sita Gurung");
    expect(sentBody(fetchFn, SEND_PATH)).toMatchObject({
      attachments: [
        { kind: "document_example", id: uid(4) },
        { kind: "course_file", id: uid(3) },
      ],
    });
    expect(callsTo(fetchFn, "GET", ATTACHABLE_PATH)).toHaveLength(1);
  });

  it("loads the files only when the picker opens", async () => {
    const fetchFn = oneStudentBackend();
    const { chips } = renderComposer();
    await waitFor(() => {
      expect(chips()).not.toBeNull();
    });

    expect(callsTo(fetchFn, "GET", ATTACHABLE_PATH)).toHaveLength(0);
  });

  it("removes a file and moves focus to the next one, then to Attach files", async () => {
    oneStudentBackend();
    const { chips, attach } = renderComposer({
      startWith: { kind: "welcome", files: [fileOf(BROCHURE), fileOf(PASSPORT)] },
    });
    await waitFor(() => {
      expect(chips()).toHaveTextContent("passport.pdf");
    });

    await userEvent.click(screen.getByRole("button", { name: "Remove brochure.pdf" }));
    expect(screen.getByRole("button", { name: "Remove passport.pdf" })).toHaveFocus();
    await userEvent.click(screen.getByRole("button", { name: "Remove passport.pdf" }));
    expect(attach()).toHaveFocus();
    expect(chips()).toBeNull();
  });

  it("refuses more than 10 MB, naming the biggest file, until one is removed", async () => {
    oneStudentBackend();
    const { form, send } = renderComposer({
      startWith: { kind: "welcome", files: [fileOf(PASSPORT), fileOf(BIG)] },
    });

    expect(
      await within(form()).findByText(
        "The files add up to 10.5 MB, more than the 10 MB one email can carry. Remove big-brochure.pdf or another file.",
      ),
    ).toBeInTheDocument();
    expect(send()).toBeDisabled();

    await userEvent.click(screen.getByRole("button", { name: "Remove big-brochure.pdf" }));
    expect(send()).toBeEnabled();
    expect(form()).toHaveTextContent("5.0 MB of 10 MB");
  });

  it("keeps files picked by hand and replaces the suggestions when another email is chosen", async () => {
    oneStudentBackend();
    const { dialog, chips } = renderComposer({
      startWith: { kind: "documents_needed", files: [fileOf(BROCHURE)] },
    });
    await waitFor(() => {
      expect(chips()).toHaveTextContent("sample-statement.pdf");
    });

    await userEvent.selectOptions(
      within(dialog).getByRole("combobox", { name: "Email" }),
      "welcome",
    );

    await waitFor(() => {
      expect(chips()).not.toHaveTextContent("sample-statement.pdf");
    });
    expect(chips()).toHaveTextContent("brochure.pdf");
  });

  it("shows the files in the preview", async () => {
    oneStudentBackend();
    const { dialog } = renderComposer();

    const preview = within(dialog).getByRole("region", { name: "Preview" });
    expect(await within(preview).findByRole("list", { name: "Attached files" })).toHaveTextContent(
      "sample-statement.pdf",
    );
  });

  it("shows the server's refusal of the files", async () => {
    const refusal = {
      attachments: ["One of these files can't be attached any more. Choose the files again."],
    };
    oneStudentBackend(on("POST", SEND_PATH, refusal, 400));
    const { chips, send, form } = renderComposer();
    await waitFor(() => {
      expect(chips()).not.toBeNull();
    });

    await userEvent.click(send());

    expect(
      await within(form()).findByText(
        "One of these files can't be attached any more. Choose the files again.",
      ),
    ).toBeInTheDocument();
  });

  it("says when the files couldn't be got", async () => {
    oneStudentBackend(
      on("POST", SEND_PATH, { detail: "We couldn't get the attached files." }, 503),
    );
    const { chips, send, dialog } = renderComposer();
    await waitFor(() => {
      expect(chips()).not.toBeNull();
    });

    await userEvent.click(send());

    expect(
      await within(dialog).findByText("We couldn't get the attached files. Try again."),
    ).toBeInTheDocument();
  });

  it("says when the files to pick couldn't load, and tries again", async () => {
    const answers = [{}, ATTACHABLE];
    const fetchFn = vi.fn((path: string) => {
      if (path === ATTACHABLE_PATH) {
        const body = answers.shift();
        return Promise.resolve(Response.json(body, { status: body === ATTACHABLE ? 200 : 500 }));
      }
      if (path === MENU_PATH) return Promise.resolve(Response.json(MENU));
      return Promise.resolve(Response.json(WELCOME));
    });
    vi.stubGlobal("fetch", fetchFn);
    const { dialog, attach } = renderComposer({ startWith: { kind: "welcome" } });

    await userEvent.click(attach());
    expect(await within(dialog).findByText(/The files couldn't be loaded/)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole("button", { name: "Try again" }));

    expect(
      await within(dialog).findByRole("checkbox", { name: /^brochure\.pdf/ }),
    ).toBeInTheDocument();
  });
});

describe("Attachments in an email to many Students", () => {
  it("offers only Course Files and Document Examples", async () => {
    const fetchFn = backend(
      on("GET", BULK_MENU_PATH, { kinds: [MENU.kinds[2]] }),
      on("GET", draftPath(BULK_DRAFT_PATH, "plain"), PLAIN),
      on("GET", BULK_ATTACHABLE_PATH, { ...ATTACHABLE, documents: [] }),
      on("POST", BULK_PATH, { sent: 2, failed: 0, failed_messages: [] }, 201),
    );
    const { dialog, attach, subject } = renderComposer({ recipients: [SITA, HARI], isBulk: true });

    await userEvent.click(attach());
    const picker = await within(dialog).findByRole("group", { name: "Attach files from the app" });
    expect(within(picker).queryByRole("button", { name: "Their Documents" })).toBeNull();
    expect(picker).toHaveTextContent(
      "Only Course Files and Document Examples can go to many Students.",
    );
    await userEvent.click(within(picker).getByRole("button", { name: "Document Examples" }));
    await userEvent.click(within(picker).getByRole("checkbox", { name: /sample-statement/ }));
    await userEvent.type(subject(), "News");
    await userEvent.click(within(dialog).getByRole("button", { name: "Send to 2" }));

    await screen.findByRole("dialog", { name: "Sending finished" });
    expect(sentBody(fetchFn, BULK_PATH)).toMatchObject({
      attachments: [{ kind: "document_example", id: uid(4) }],
      students: [uid(7), uid(8)],
    });
    expect(callsTo(fetchFn, "GET", BULK_ATTACHABLE_PATH)).toHaveLength(1);
  });
});

function fileOf(file: typeof BROCHURE): Attachable {
  return {
    kind: file.kind,
    id: file.id,
    name: file.name,
    fileName: file.file_name,
    size: file.size,
    group: file.group,
  };
}

describe.each(THEME_CASES)("Attachments in the $name Theme", ({ mode }) => {
  beforeEach(() => {
    applyThemeCase(mode);
  });

  afterEach(() => {
    resetTheme();
  });

  it("shows the files, the total and the picker", async () => {
    oneStudentBackend();
    const { dialog, attach, chips } = renderComposer();
    await waitFor(() => {
      expect(chips()).not.toBeNull();
    });

    await userEvent.click(attach());

    expect(
      await within(dialog).findByRole("checkbox", { name: /^brochure\.pdf/ }),
    ).toBeInTheDocument();
  });
});
