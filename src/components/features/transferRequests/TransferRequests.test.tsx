import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { TransferCountContext } from "@/components/features/shell/menuCount";
import { StaffContextContext } from "@/components/features/shell/staffContext";
import { StudentProfilePage } from "@/components/features/students/profile/StudentProfilePage";
import { ToastProvider } from "@/components/ui/ToastProvider";
import type { StaffContext } from "@/lib/api";
import { DEFAULT_THEME } from "@/lib/theme";
import { backend, callsTo, on, onEach } from "@/test/backend";
import { consultancySummary } from "@/test/consultancy";
import { PROFILE } from "@/test/studentProfile";

import { TransferRequestsPage } from "./TransferRequestsPage";
import { uid } from "@/test/ids";

const COUNSELLOR: StaffContext = {
  staff: { id: uid(3), name: "Anjali Gurung", email: "anjali@acme.test", role: "counsellor" },
  consultancy: consultancySummary(),
  modules: ["students", "tasks"],
  dateDisplay: "AD",
  colourMode: "light",
  supportAccess: null,
  theme: DEFAULT_THEME,
};

function as(role: StaffContext["staff"]["role"], id = uid(9)): StaffContext {
  return { ...COUNSELLOR, staff: { ...COUNSELLOR.staff, id, name: "Someone Else", role } };
}

const STUDENT = `/api/students/${uid(7)}/`;
const ASK = `/api/students/${uid(7)}/transfer-requests/`;
const LIST = "/api/transfer-requests/";
const REASON = "Her sister Rojina is my Student, and the family wants one counsellor.";

const WAITING = {
  id: uid(801),
  student: { id: uid(7), name: "Sita Gurung" },
  asked_by: { id: uid(3), name: "Anjali Gurung" },
  reason: REASON,
  asked_at: "2026-10-27T10:35:00+00:00",
  status: "waiting",
  counsellor: { id: uid(2), name: "Bikash Thapa" },
  answered_by: null,
  answer_reason: "",
  answered_at: null,
  taken_from: "",
  can_answer: false,
  can_cancel: true,
};

const FOR_ME = { ...WAITING, can_answer: true, can_cancel: false };

const VIEW_ONLY = {
  ...PROFILE,
  assigned_counsellor: { id: uid(2), name: "Bikash Thapa" },
  can_change: false,
  can_set_stage: false,
  can_transfer: false,
  can_change_applications: false,
  can_change_documents: false,
  can_change_fees: false,
};

function renderWith(context: StaffContext, ui: React.ReactNode, refresh = vi.fn<() => void>()) {
  render(
    <StaffContextContext value={context}>
      <TransferCountContext value={{ count: 0, refresh }}>
        <ToastProvider>{ui}</ToastProvider>
      </TransferCountContext>
    </StaffContextContext>,
  );
  return refresh;
}

function sentJson(init: RequestInit | undefined): unknown {
  return typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
}

function pageOf(results: unknown[], waiting = 0, count = results.length) {
  return { count, page: 1, page_size: 20, waiting_for_me_count: waiting, results };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Asking to take a Student", () => {
  it("offers the button on a view-only Student and sends the reason", async () => {
    let asked = false;
    const fetchFn = backend(
      onEach("GET", STUDENT, () =>
        asked
          ? { ...VIEW_ONLY, can_ask_transfer: false, transfer_request: WAITING }
          : { ...VIEW_ONLY, can_ask_transfer: true },
      ),
      onEach(
        "POST",
        ASK,
        () => {
          asked = true;
          return WAITING;
        },
        201,
      ),
    );
    renderWith(COUNSELLOR, <StudentProfilePage studentId={uid(7)} />);

    await userEvent.click(await screen.findByRole("button", { name: "Ask to take this Student" }));
    const dialog = screen.getByRole("dialog", { name: "Ask to take Sita Gurung" });
    expect(dialog).toHaveTextContent(
      "Sita Gurung is with Bikash Thapa. Bikash Thapa and the Admins will get a notification.",
    );
    await userEvent.type(
      within(dialog).getByLabelText("Why should you take this Student?"),
      REASON,
    );
    await userEvent.click(within(dialog).getByRole("button", { name: "Send request" }));

    expect(await screen.findByText("Request sent. Bikash Thapa and the Admins have been told."));
    const [, init] = callsTo(fetchFn, "POST", ASK)[0] ?? [];
    expect(sentJson(init)).toEqual({ reason: REASON });
    expect(
      await screen.findByText(/You asked to take this Student on 27 Oct 2026/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Waiting for Bikash Thapa or an Admin to answer/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ask to take this Student" })).toBeNull();
  });

  it("sends on Ctrl + Enter, with the keys shown beside the button", async () => {
    const fetchFn = backend(
      on("GET", STUDENT, { ...VIEW_ONLY, can_ask_transfer: true }),
      on("POST", ASK, WAITING, 201),
    );
    renderWith(COUNSELLOR, <StudentProfilePage studentId={uid(7)} />);

    await userEvent.click(await screen.findByRole("button", { name: "Ask to take this Student" }));
    const dialog = screen.getByRole("dialog", { name: "Ask to take Sita Gurung" });
    const box = within(dialog).getByLabelText("Why should you take this Student?");
    expect(within(dialog).getByText("Ctrl + Enter to send")).toBeInTheDocument();
    expect(box).toHaveAccessibleDescription(/Ctrl \+ Enter to send$/);
    await userEvent.type(box, `${REASON}{Control>}{Enter}{/Control}`);

    expect(await screen.findByText("Request sent. Bikash Thapa and the Admins have been told."));
    const [, init] = callsTo(fetchFn, "POST", ASK)[0] ?? [];
    expect(sentJson(init)).toEqual({ reason: REASON });
  });

  it("names Front Desk for a Student with no counsellor", async () => {
    backend(
      on("GET", STUDENT, { ...VIEW_ONLY, assigned_counsellor: null, can_ask_transfer: true }),
    );
    renderWith(COUNSELLOR, <StudentProfilePage studentId={uid(7)} />);

    await userEvent.click(await screen.findByRole("button", { name: "Ask to take this Student" }));

    expect(screen.getByRole("dialog")).toHaveTextContent(
      "Sita Gurung has no counsellor yet. Front Desk and the Admins will get a notification.",
    );
  });

  it("shows the server's reason under the field and keeps the dialog open", async () => {
    backend(
      on("GET", STUDENT, { ...VIEW_ONLY, can_ask_transfer: true }),
      on("POST", ASK, { reason: ["Say why you should take this Student."] }, 400),
    );
    renderWith(COUNSELLOR, <StudentProfilePage studentId={uid(7)} />);

    await userEvent.click(await screen.findByRole("button", { name: "Ask to take this Student" }));
    await userEvent.click(screen.getByRole("button", { name: "Send request" }));

    expect(await screen.findByText("Say why you should take this Student.")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("says when someone asked first", async () => {
    backend(
      on("GET", STUDENT, { ...VIEW_ONLY, can_ask_transfer: true }),
      on("POST", ASK, { detail: "Someone has already asked to take this Student." }, 409),
    );
    renderWith(COUNSELLOR, <StudentProfilePage studentId={uid(7)} />);

    await userEvent.click(await screen.findByRole("button", { name: "Ask to take this Student" }));
    await userEvent.type(screen.getByLabelText("Why should you take this Student?"), "x");
    await userEvent.click(screen.getByRole("button", { name: "Send request" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Someone has already asked to take this Student.",
    );
  });

  it("isn't offered when the profile says I can't ask", async () => {
    backend(on("GET", STUDENT, { ...VIEW_ONLY, can_ask_transfer: false }));
    renderWith(as("front_desk"), <StudentProfilePage studentId={uid(7)} />);

    expect(await screen.findByText(/View only/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ask to take this Student" })).toBeNull();
  });

  it("lets whoever asked cancel from the banner", async () => {
    let cancelled = false;
    const refresh = vi.fn<() => void>();
    const fetchFn = backend(
      onEach("GET", STUDENT, () =>
        cancelled
          ? { ...VIEW_ONLY, can_ask_transfer: true }
          : { ...VIEW_ONLY, transfer_request: WAITING },
      ),
      onEach("POST", `/api/transfer-requests/${uid(801)}/cancel/`, () => {
        cancelled = true;
        return { ...WAITING, status: "cancelled", answered_at: "2026-10-28T09:00:00+00:00" };
      }),
    );
    renderWith(COUNSELLOR, <StudentProfilePage studentId={uid(7)} />, refresh);

    await userEvent.click(await screen.findByRole("button", { name: "Cancel request" }));
    const dialog = screen.getByRole("dialog", { name: "Cancel this request?" });
    expect(dialog).toHaveTextContent("Bikash Thapa is no longer asked to hand over this Student.");
    await userEvent.click(within(dialog).getByRole("button", { name: "Cancel request" }));

    expect(await screen.findByText("Request cancelled")).toBeInTheDocument();
    expect(callsTo(fetchFn, "POST", `/api/transfer-requests/${uid(801)}/cancel/`)).toHaveLength(1);
    expect(
      await screen.findByRole("button", { name: "Ask to take this Student" }),
    ).toBeInTheDocument();
    expect(refresh).toHaveBeenCalled();
  });
});

describe("Cancelling needs the popup", () => {
  it("keeps the request when the popup is cancelled", async () => {
    const fetchFn = backend(on("GET", STUDENT, { ...VIEW_ONLY, transfer_request: WAITING }));
    renderWith(COUNSELLOR, <StudentProfilePage studentId={uid(7)} />);

    await userEvent.click(await screen.findByRole("button", { name: "Cancel request" }));
    await userEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Cancel" }),
    );

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: "Cancel request" })).toBeVisible();
    expect(callsTo(fetchFn, "POST", `/api/transfer-requests/${uid(801)}/cancel/`)).toHaveLength(0);
  });
});

describe("Answering on the profile", () => {
  const MINE = { ...PROFILE, assigned_counsellor: { id: uid(2), name: "Bikash Thapa" } };
  const BIKASH = as("counsellor", uid(2));

  it("shows who asked, when and why, with Approve and Decline", async () => {
    backend(on("GET", STUDENT, { ...MINE, transfer_request: FOR_ME }));
    renderWith(BIKASH, <StudentProfilePage studentId={uid(7)} />);

    const name = await screen.findByText("Anjali Gurung");
    const banner = screen.getAllByRole("status").find((status) => status.contains(name));
    expect(banner).toHaveTextContent(
      `Anjali Gurung asked to take this Student on 27 Oct 2026, 16:20: “${REASON}”ApproveDecline`,
    );
  });

  it("says who can answer when I can't", async () => {
    backend(
      on("GET", STUDENT, { ...VIEW_ONLY, transfer_request: { ...FOR_ME, can_answer: false } }),
    );
    renderWith(as("counsellor", uid(11)), <StudentProfilePage studentId={uid(7)} />);

    expect(await screen.findByText(/Waiting for Bikash Thapa or an Admin\./)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Approve" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Cancel request" })).toBeNull();
  });

  it("approves after confirming, and loads the Student again", async () => {
    let approved = false;
    const refresh = vi.fn<() => void>();
    const fetchFn = backend(
      onEach("GET", STUDENT, () =>
        approved
          ? { ...VIEW_ONLY, assigned_counsellor: { id: uid(3), name: "Anjali Gurung" } }
          : { ...MINE, transfer_request: FOR_ME },
      ),
      onEach("POST", `/api/transfer-requests/${uid(801)}/approve/`, () => {
        approved = true;
        return { ...FOR_ME, status: "approved", can_answer: false };
      }),
    );
    renderWith(BIKASH, <StudentProfilePage studentId={uid(7)} />, refresh);

    await userEvent.click(await screen.findByRole("button", { name: "Approve" }));
    const dialog = screen.getByRole("dialog", { name: "Approve this request?" });
    expect(dialog).toHaveTextContent(
      "Sita Gurung moves from Bikash Thapa to Anjali Gurung. After that only Anjali and the Admins can change this Student.",
    );
    await userEvent.click(within(dialog).getByRole("button", { name: "Approve and transfer" }));

    expect(await screen.findByText("Sita Gurung is now with Anjali Gurung")).toBeInTheDocument();
    expect(callsTo(fetchFn, "POST", `/api/transfer-requests/${uid(801)}/approve/`)).toHaveLength(1);
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Approve" })).toBeNull();
    });
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("keeps the dialog open with the reason when it's no longer waiting", async () => {
    backend(
      on("GET", STUDENT, { ...MINE, transfer_request: FOR_ME }),
      on(
        "POST",
        `/api/transfer-requests/${uid(801)}/approve/`,
        { detail: "This request is no longer waiting for an answer." },
        409,
      ),
    );
    renderWith(BIKASH, <StudentProfilePage studentId={uid(7)} />);

    await userEvent.click(await screen.findByRole("button", { name: "Approve" }));
    await userEvent.click(screen.getByRole("button", { name: "Approve and transfer" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This request is no longer waiting for an answer.",
    );
  });

  it("declines with an optional reason", async () => {
    const fetchFn = backend(
      on("GET", STUDENT, { ...MINE, transfer_request: FOR_ME }),
      on("POST", `/api/transfer-requests/${uid(801)}/decline/`, {
        ...FOR_ME,
        status: "declined",
        can_answer: false,
      }),
    );
    renderWith(BIKASH, <StudentProfilePage studentId={uid(7)} />);

    await userEvent.click(await screen.findByRole("button", { name: "Decline" }));
    const dialog = screen.getByRole("dialog", { name: "Decline Anjali Gurung's request?" });
    expect(dialog).toHaveTextContent("Sita Gurung stays with Bikash Thapa.");
    expect(dialog).toHaveTextContent("Anjali will see it.");
    await userEvent.type(within(dialog).getByLabelText("Reason (optional)"), "After her PTE.");
    await userEvent.click(within(dialog).getByRole("button", { name: "Decline" }));

    expect(await screen.findByText("Request declined")).toBeInTheDocument();
    const [, init] =
      callsTo(fetchFn, "POST", `/api/transfer-requests/${uid(801)}/decline/`)[0] ?? [];
    expect(sentJson(init)).toEqual({ reason: "After her PTE." });
  });

  it("declines on Ctrl + Enter in the reason", async () => {
    const fetchFn = backend(
      on("GET", STUDENT, { ...MINE, transfer_request: FOR_ME }),
      on("POST", `/api/transfer-requests/${uid(801)}/decline/`, {
        ...FOR_ME,
        status: "declined",
        can_answer: false,
      }),
    );
    renderWith(BIKASH, <StudentProfilePage studentId={uid(7)} />);

    await userEvent.click(await screen.findByRole("button", { name: "Decline" }));
    const dialog = screen.getByRole("dialog", { name: "Decline Anjali Gurung's request?" });
    const box = within(dialog).getByLabelText("Reason (optional)");
    expect(box).toHaveAccessibleDescription(/Ctrl \+ Enter to save$/);
    await userEvent.type(box, "After her PTE.{Control>}{Enter}{/Control}");

    expect(await screen.findByText("Request declined")).toBeInTheDocument();
    const [, init] =
      callsTo(fetchFn, "POST", `/api/transfer-requests/${uid(801)}/decline/`)[0] ?? [];
    expect(sentJson(init)).toEqual({ reason: "After her PTE." });
  });

  it("closes a dialog with Escape, moving focus into it first", async () => {
    backend(on("GET", STUDENT, { ...MINE, transfer_request: FOR_ME }));
    renderWith(BIKASH, <StudentProfilePage studentId={uid(7)} />);

    await userEvent.click(await screen.findByRole("button", { name: "Decline" }));
    expect(screen.getByLabelText("Reason (optional)")).toHaveFocus();
    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows typed reasons as text, never as HTML", async () => {
    const reason = "<img src=x onerror=alert(1)>";
    backend(on("GET", STUDENT, { ...MINE, transfer_request: { ...FOR_ME, reason } }));
    renderWith(BIKASH, <StudentProfilePage studentId={uid(7)} />);

    expect(await screen.findByText(`“${reason}”`, { exact: false })).toBeInTheDocument();
    expect(document.querySelector("img[src=x]")).toBeNull();
  });
});

describe("The Transfer requests page", () => {
  const DECLINED = {
    ...WAITING,
    id: uid(804),
    student: { id: uid(9), name: "Asmita Rai" },
    status: "declined",
    answered_by: { name: "Bikash Thapa", is_platform_admin: false },
    answer_reason: "Let's ask again after her PTE.",
    answered_at: "2026-10-10T09:17:00+00:00",
    taken_from: "Bikash Thapa",
    // Transferred to Anjali later, another way.
    counsellor: { id: uid(3), name: "Anjali Gurung" },
    can_cancel: false,
  };
  const APPROVED = {
    ...DECLINED,
    id: uid(805),
    student: { id: uid(10), name: "Dipesh Rana" },
    status: "approved",
    answer_reason: "",
    counsellor: { id: uid(3), name: "Anjali Gurung" },
    taken_from: "",
  };

  it("opens on what waits for my answer, with its count", async () => {
    const fetchFn = backend(on("GET", `${LIST}?box=waiting_for_me&page=1`, pageOf([FOR_ME], 1)));
    renderWith(COUNSELLOR, <TransferRequestsPage />);

    const row = (await screen.findByRole("link", { name: "Sita Gurung" })).closest("li");
    expect(row).toHaveTextContent("Waiting");
    expect(row).toHaveTextContent(
      "Anjali Gurung asked to take over from Bikash Thapa, 27 Oct 2026",
    );
    expect(row).toHaveTextContent(`“${REASON}”`);
    expect(screen.getByRole("link", { name: "Sita Gurung" })).toHaveAttribute(
      "href",
      `/students/${uid(7)}`,
    );
    expect(screen.getByRole("button", { name: "Waiting for me, 1" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(callsTo(fetchFn, "GET", `${LIST}?box=waiting_for_me&page=1`)).toHaveLength(1);
  });

  it("shows how each one ended in Sent by me", async () => {
    backend(
      on("GET", `${LIST}?box=waiting_for_me&page=1`, pageOf([])),
      on("GET", `${LIST}?box=sent&page=1`, pageOf([WAITING, DECLINED, APPROVED])),
    );
    renderWith(COUNSELLOR, <TransferRequestsPage />);

    await userEvent.click(await screen.findByRole("button", { name: "Sent by me" }));

    const rows = await screen.findAllByRole("listitem");
    expect(rows[0]).toHaveTextContent("Cancel request");
    expect(rows[1]).toHaveTextContent("Anjali Gurung asked to take over from Bikash Thapa");
    expect(rows[1]).toHaveTextContent(
      "Declined by Bikash Thapa, 10 Oct 2026, 15:02: “Let's ask again after her PTE.”",
    );
    expect(rows[2]).toHaveTextContent("asked to take over from no counsellor");
    expect(rows[2]).toHaveTextContent("Approved by Bikash Thapa");
  });

  it("says when nothing waits", async () => {
    backend(on("GET", `${LIST}?box=waiting_for_me&page=1`, pageOf([])));
    renderWith(COUNSELLOR, <TransferRequestsPage />);

    expect(await screen.findByText("Nothing is waiting for your answer.")).toBeInTheDocument();
  });

  it("gives Front Desk no Sent by me, and Admins Everyone", async () => {
    backend(on("GET", `${LIST}?box=waiting_for_me&page=1`, pageOf([])));
    renderWith(as("front_desk"), <TransferRequestsPage />);
    const group = await screen.findByRole("group", { name: "Which requests" });
    expect(
      within(group)
        .getAllByRole("button")
        .map((b) => b.textContent),
    ).toEqual(["Waiting for me"]);
  });

  it("gives Admins every box", async () => {
    backend(
      on("GET", `${LIST}?box=waiting_for_me&page=1`, pageOf([])),
      on("GET", `${LIST}?box=all&page=1`, pageOf([DECLINED])),
    );
    renderWith(as("admin"), <TransferRequestsPage />);

    await userEvent.click(await screen.findByRole("button", { name: "Everyone" }));

    expect(await screen.findByRole("link", { name: "Asmita Rai" })).toBeInTheDocument();
  });

  it("loads the box again after an answer and refreshes the menu count", async () => {
    let declined = false;
    const refresh = vi.fn<() => void>();
    const fetchFn = backend(
      onEach("GET", `${LIST}?box=waiting_for_me&page=1`, () =>
        declined ? pageOf([]) : pageOf([FOR_ME], 1),
      ),
      onEach("POST", `/api/transfer-requests/${uid(801)}/decline/`, () => {
        declined = true;
        return { ...FOR_ME, status: "declined" };
      }),
    );
    renderWith(COUNSELLOR, <TransferRequestsPage />, refresh);

    await userEvent.click(await screen.findByRole("button", { name: "Decline" }));
    await userEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Decline" }),
    );

    expect(await screen.findByText("Nothing is waiting for your answer.")).toBeInTheDocument();
    expect(callsTo(fetchFn, "GET", `${LIST}?box=waiting_for_me&page=1`)).toHaveLength(2);
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("says so when the list can't load", async () => {
    backend(on("GET", `${LIST}?box=waiting_for_me&page=1`, { results: "nope" }));
    renderWith(COUNSELLOR, <TransferRequestsPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "We couldn't load the transfer requests. Please try again.",
    );
  });

  it("isn't for Teachers", () => {
    backend();
    renderWith(as("teacher"), <TransferRequestsPage />);

    expect(screen.getByRole("link", { name: /home/i })).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Which requests" })).toBeNull();
  });

  it("pages through a long box", async () => {
    const fetchFn = backend(
      on("GET", `${LIST}?box=waiting_for_me&page=1`, pageOf([FOR_ME], 1, 21)),
      on("GET", `${LIST}?box=waiting_for_me&page=2`, {
        ...pageOf([{ ...FOR_ME, id: uid(900) }], 1, 21),
        page: 2,
      }),
    );
    renderWith(COUNSELLOR, <TransferRequestsPage />);

    await userEvent.click(await screen.findByRole("button", { name: /next/i }));

    await waitFor(() => {
      expect(callsTo(fetchFn, "GET", `${LIST}?box=waiting_for_me&page=2`)).toHaveLength(1);
    });
  });
});
