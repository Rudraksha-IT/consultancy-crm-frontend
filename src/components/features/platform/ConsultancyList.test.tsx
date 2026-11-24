import { uid } from "@/test/ids";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ToastProvider } from "@/components/ui/ToastProvider";
import { jsonResponse } from "@/lib/api/core/test-helpers";
import { backend, callsTo, on, type Answer as Answer2 } from "@/test/backend";
import { applyThemeCase, CONTRASTING_THEME, resetTheme, THEME_CASES } from "@/test/themes";

import { ConsultancyList } from "./ConsultancyList";
import { testHost } from "@/test/hosts";

const ACME = {
  id: uid(3),
  name: "Acme Education",
  subdomain: "acme",
  host: testHost("acme"),
  status: "active",
  status_reason: "",
  evaluation_ends_at: null,
  paid_until: "2027-03-31",
  modules: ["students", "batches", "communication"],
  setup_state: "ready",
};

const CEDAR = {
  id: uid(5),
  name: "Cedar Abroad",
  subdomain: "cedar",
  host: testHost("cedar"),
  status: "evaluation",
  status_reason: "",
  evaluation_ends_at: "2099-11-13T00:00:00+05:45",
  paid_until: null,
  modules: ["students", "tasks"],
  setup_state: "ready",
};

const BETA = {
  id: uid(4),
  name: "Beta Overseas",
  subdomain: "beta",
  host: testHost("beta"),
  status: "terminated",
  status_reason: "Left us",
  evaluation_ends_at: null,
  paid_until: null,
  modules: ["students"],
  setup_state: "ready",
};

type Answer = Response | Promise<Response>;

type Answers = {
  /** A function gives a fresh answer each time the list is loaded again. */
  list: Answer | (() => Answer);
  status?: Response;
  features?: Response;
  colours?: Response;
  retry?: Answer;
};

function answerWith({ list, status, features, colours, retry }: Answers): typeof fetch {
  const answers: Record<string, () => Answer> = {
    "/api/platform/consultancies/": typeof list === "function" ? list : () => list,
    [`/api/platform/consultancies/${uid(3)}/retry-setup/`]: () => retry ?? jsonResponse({}, 500),
    "/api/platform/support-visits/": () => jsonResponse([]),
    [`/api/platform/consultancies/${uid(3)}/modules/`]: () => features ?? jsonResponse({}, 500),
    [`/api/platform/consultancies/${uid(3)}/theme/`]: () => colours ?? jsonResponse({}, 500),
  };
  const fetchFn = vi.fn<typeof fetch>().mockImplementation((path) => {
    const answer = typeof path === "string" ? answers[path] : undefined;
    return Promise.resolve(answer === undefined ? (status ?? jsonResponse({}, 500)) : answer());
  });
  vi.stubGlobal("fetch", fetchFn);
  return fetchFn;
}

function renderList() {
  return render(
    <ToastProvider>
      <ConsultancyList />
    </ToastProvider>,
  );
}

const ROW_BUTTONS = ["Configuration", "Open as Platform Admin", "Change status"];

function buttonsOf(name: string): string[] {
  return within(rowFor(name))
    .queryAllByRole("button")
    .map((button) => button.textContent);
}

/** Open a Consultancy's Configuration (ticket 16), on one of its parts. */
async function openConfiguration(
  name = "Acme Education",
  part: "Features" | "Colours" | "Admins" = "Features",
): Promise<HTMLElement> {
  await userEvent.click(within(await findRow(name)).getByRole("button", { name: "Configuration" }));
  const dialog = screen.getByRole("dialog", { name: `Configuration for ${name}` });
  if (part !== "Features") await userEvent.click(within(dialog).getByRole("tab", { name: part }));
  return dialog;
}

async function findRow(name: string): Promise<HTMLElement> {
  await screen.findByText(name);
  return rowFor(name);
}

function rowFor(name: string): HTMLElement {
  const row = screen.getAllByRole("listitem").find((item) => item.textContent.includes(name));
  if (row === undefined) throw new Error(`No row for ${name}`);
  return row;
}

describe("ConsultancyList", () => {
  it("shows a loading message while the list is loading", () => {
    answerWith({ list: new Promise(() => undefined) });

    renderList();

    expect(screen.getAllByText("Loading…")[0]).toBeInTheDocument();
  });

  it("lists each Consultancy with its subdomain and Status, and only three buttons (ticket 16)", async () => {
    answerWith({ list: jsonResponse([ACME, CEDAR, BETA]) });

    renderList();

    await screen.findByText("Acme Education");
    const acme = within(rowFor("Acme Education"));
    expect(acme.getByText(testHost("acme"))).toBeInTheDocument();
    expect(acme.getByText("Active")).toBeInTheDocument();
    expect(buttonsOf("Acme Education")).toEqual(ROW_BUTTONS);
    expect(within(rowFor("Cedar Abroad")).getByText("Evaluation, ends 12 Nov 2099")).toBeVisible();
    expect(within(rowFor("Beta Overseas")).getByText("Terminated")).toBeInTheDocument();
    expect(buttonsOf("Beta Overseas")).toEqual([]);
  });

  it("shows no Features on the row: they are inside Configuration (ticket 16)", async () => {
    answerWith({ list: jsonResponse([ACME, CEDAR]) });

    renderList();

    await screen.findByText("Acme Education");
    expect(screen.queryByRole("list", { name: "Features on" })).not.toBeInTheDocument();
    expect(screen.queryByText("Test-prep classes")).not.toBeInTheDocument();
    expect(screen.queryByText("Only the standard features")).not.toBeInTheDocument();
  });

  it("opens an office as Platform Admin from its row, with a reason", async () => {
    answerWith({ list: jsonResponse([ACME, CEDAR]) });
    renderList();

    await userEvent.click(
      within(await findRow("Cedar Abroad")).getByRole("button", { name: "Open as Platform Admin" }),
    );

    expect(
      screen.getByRole("dialog", { name: "Open Cedar Abroad as Platform Admin" }),
    ).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  describe("Configuration: Colours (ticket 16)", () => {
    async function openColours(answers: Partial<Answers> = {}): Promise<typeof fetch> {
      const fetchFn = answerWith({ list: jsonResponse([ACME]), ...answers });
      renderList();
      await openConfiguration("Acme Education", "Colours");
      return fetchFn;
    }

    it("shows the office's colours with a live preview in light and dark", async () => {
      await openColours();

      const dialog = within(
        screen.getByRole("dialog", { name: "Configuration for Acme Education" }),
      );
      expect(dialog.getByRole("img", { name: "Preview in light mode" })).toBeInTheDocument();
      expect(dialog.getByRole("img", { name: "Preview in dark mode" })).toBeInTheDocument();
    });

    it("saves the colours for that office and confirms", async () => {
      const fetchFn = await openColours({
        colours: jsonResponse({ ...ACME, theme: CONTRASTING_THEME }),
      });

      await userEvent.selectOptions(screen.getByLabelText("Accent"), "Crimson");
      await userEvent.click(screen.getByRole("button", { name: "Save colours" }));

      expect(await screen.findByText("Colours saved for Acme Education")).toBeInTheDocument();
      // The popup stays open on its part, for the next change.
      expect(screen.getByRole("tab", { name: "Colours" })).toHaveAttribute("aria-selected", "true");
      const call = vi
        .mocked(fetchFn)
        .mock.calls.find(([path]) => path === `/api/platform/consultancies/${uid(3)}/theme/`);
      expect(call?.[1]?.method).toBe("PUT");
    });

    it("keeps the dialog open and says so when saving fails", async () => {
      await openColours({ colours: jsonResponse({ page: ["Bad"] }, 400) });

      await userEvent.click(screen.getByRole("button", { name: "Save colours" }));

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "We couldn't save the colours. Please try again.",
      );
      expect(
        screen.getByRole("dialog", { name: "Configuration for Acme Education" }),
      ).toBeVisible();
    });

    it("closes with Escape without saving", async () => {
      const fetchFn = await openColours();

      await userEvent.keyboard("{Escape}");

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(
        vi
          .mocked(fetchFn)
          .mock.calls.some(([path]) => path === `/api/platform/consultancies/${uid(3)}/theme/`),
      ).toBe(false);
    });
  });

  it("lists the visits by Platform Admins under the offices", async () => {
    answerWith({ list: jsonResponse([ACME]) });
    renderList();

    expect(
      await screen.findByText("No Platform Admin has opened an office yet."),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Visits by Platform Admins" })).toBeVisible();
  });

  it("says when an evaluation has ended", async () => {
    answerWith({
      list: jsonResponse([{ ...CEDAR, evaluation_ends_at: "2020-01-01T00:00:00Z" }]),
    });

    renderList();

    expect(await screen.findByText("Evaluation, ended")).toBeInTheDocument();
  });

  it("links to the new Consultancy screen", async () => {
    answerWith({ list: jsonResponse([]) });

    renderList();

    expect(await screen.findByRole("link", { name: "New Consultancy" })).toHaveAttribute(
      "href",
      "/platform/consultancies/new",
    );
    expect(await screen.findByText("No Consultancies yet.")).toBeInTheDocument();
  });

  it("shows an error when the list can't be loaded", async () => {
    answerWith({ list: jsonResponse({}, 500) });

    renderList();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "We couldn't load the Consultancies. Please refresh the page.",
    );
  });

  it("ignores a list that arrives after the component has gone", async () => {
    let answer: (response: Response) => void = () => undefined;
    answerWith({
      list: new Promise<Response>((resolve) => {
        answer = resolve;
      }),
    });
    const { unmount } = renderList();

    unmount();
    answer(jsonResponse([ACME]));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(screen.queryByText("Acme Education")).not.toBeInTheDocument();
  });

  describe("Configuration: Features (ticket 16)", () => {
    async function openFeatures(answers: Partial<Answers> = {}): Promise<typeof fetch> {
      const fetchFn = answerWith({ list: jsonResponse([ACME]), ...answers });
      renderList();
      await openConfiguration();
      return fetchFn;
    }

    it("opens on Features, with its three parts as tabs", async () => {
      await openFeatures();

      const dialog = within(
        screen.getByRole("dialog", { name: "Configuration for Acme Education" }),
      );
      expect(dialog.getAllByRole("tab").map((tab) => tab.textContent)).toEqual([
        "Features",
        "Colours",
        "Admins",
      ]);
      expect(dialog.getByRole("tab", { name: "Features" })).toHaveAttribute(
        "aria-selected",
        "true",
      );
      expect(dialog.getByRole("tabpanel")).toHaveAccessibleName("Features");
    });

    it("shows one switch per extra feature, set to what the Consultancy has", async () => {
      await openFeatures();

      const dialog = within(
        screen.getByRole("dialog", { name: "Configuration for Acme Education" }),
      );
      expect(
        dialog.getByText(
          "Students, documents, applications, tasks and the visitor desk are always included. Turn on the extras this office pays for.",
        ),
      ).toBeInTheDocument();
      expect(dialog.getByRole("switch", { name: "Test-prep classes" })).toBeChecked();
      expect(dialog.getByRole("switch", { name: "Email" })).toBeChecked();
      expect(dialog.getByRole("switch", { name: "Accounts" })).not.toBeChecked();
      expect(
        dialog.getByRole("switch", { name: "Reports and charts" }),
      ).toHaveAccessibleDescription("Monthly charts of visitors, sign-ups, visas and money.");
      expect(dialog.getByRole("switch", { name: "Clock-in" })).not.toBeChecked();
      expect(dialog.getByRole("switch", { name: "Clock-in" })).toHaveAccessibleDescription(
        "Staff clock in and out from the office network. No location is recorded.",
      );
    });

    it("saves the switches and keeps the popup open with them as saved", async () => {
      const fetchFn = await openFeatures({
        features: jsonResponse({ ...ACME, modules: ["students", "batches", "accounts"] }),
      });

      await userEvent.click(screen.getByRole("switch", { name: "Email" }));
      await userEvent.click(screen.getByRole("switch", { name: "Accounts" }));
      await userEvent.click(screen.getByRole("button", { name: "Save features" }));

      expect(fetchFn).toHaveBeenCalledWith(
        `/api/platform/consultancies/${uid(3)}/modules/`,
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({
            batches: true,
            communication: false,
            accounts: true,
            reports: false,
            clock_in: false,
          }),
        }),
      );
      expect(await screen.findByText("Features saved for Acme Education")).toBeInTheDocument();
      expect(screen.getByRole("switch", { name: "Email" })).not.toBeChecked();
      expect(screen.getByRole("switch", { name: "Accounts" })).toBeChecked();

      await userEvent.click(screen.getByRole("button", { name: "Done" }));
      await openConfiguration();
      expect(screen.getByRole("switch", { name: "Accounts" })).toBeChecked();
    });

    it("keeps the dialog open with a message when saving fails", async () => {
      await openFeatures({ features: jsonResponse({}, 500) });

      await userEvent.click(screen.getByRole("switch", { name: "Accounts" }));
      await userEvent.click(screen.getByRole("button", { name: "Save features" }));

      const dialog = within(
        screen.getByRole("dialog", { name: "Configuration for Acme Education" }),
      );
      expect(await dialog.findByRole("alert")).toHaveTextContent(
        "We couldn't save the features. Please try again.",
      );
      expect(dialog.getByRole("switch", { name: "Accounts" })).toBeChecked();
    });

    it("closes without saving on Done, and starts fresh when opened again", async () => {
      const fetchFn = await openFeatures();

      await userEvent.click(screen.getByRole("switch", { name: "Accounts" }));
      await userEvent.click(screen.getByRole("button", { name: "Done" }));
      await openConfiguration();

      // Only the list and the visits were loaded: nothing was saved.
      expect(fetchFn).toHaveBeenCalledTimes(2);
      expect(screen.getByRole("switch", { name: "Accounts" })).not.toBeChecked();
    });

    it("closes on Escape, moving focus into the dialog first", async () => {
      await openFeatures();

      expect(screen.getByRole("dialog").contains(document.activeElement)).toBe(true);
      await userEvent.keyboard("{Escape}");

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  describe("Change status dialog", () => {
    async function openStatus(
      consultancy: object = ACME,
      answers: Partial<Answers> = {},
    ): Promise<typeof fetch> {
      const fetchFn = answerWith({ list: jsonResponse([consultancy]), ...answers });
      renderList();
      await userEvent.click(await screen.findByRole("button", { name: "Change status" }));
      return fetchFn;
    }

    function dialog() {
      return within(screen.getByRole("dialog", { name: /^Change the status of / }));
    }

    function optionsOf(): string[] {
      return within(dialog().getByRole("combobox", { name: "New status" }))
        .getAllByRole("option")
        .map((option) => option.textContent);
    }

    it("offers only the moves the rules allow, from each Status", async () => {
      await openStatus(CEDAR);
      expect(optionsOf()).toEqual(["Extend the evaluation", "Active", "Terminated"]);
      await userEvent.keyboard("{Escape}");
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("offers Active, Past due, Suspended and Terminated for an Active office", async () => {
      await openStatus();

      expect(optionsOf()).toEqual(["Active", "Past due", "Suspended", "Terminated"]);
      expect(dialog().getByRole("combobox", { name: "New status" })).toHaveFocus();
    });

    it("marks an office Past due with a required reason and shows the new Status", async () => {
      const fetchFn = await openStatus(ACME, {
        status: jsonResponse({ ...ACME, status: "past_due", status_reason: "Invoice 12" }),
      });

      await userEvent.selectOptions(
        dialog().getByRole("combobox", { name: "New status" }),
        "past_due",
      );
      expect(
        dialog().getByText("Staff can look things up and log in, but every change is refused."),
      ).toBeInTheDocument();
      expect(dialog().queryByLabelText(/Paid until/)).not.toBeInTheDocument();
      await userEvent.type(dialog().getByRole("textbox", { name: "Reason" }), "Invoice 12");
      await userEvent.click(dialog().getByRole("button", { name: "Save status" }));

      expect(fetchFn).toHaveBeenCalledWith(
        `/api/platform/consultancies/${uid(3)}/status/`,
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ status: "past_due", reason: "Invoice 12" }),
        }),
      );
      expect(await screen.findByText("Status saved for Acme Education")).toBeInTheDocument();
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(within(rowFor("Acme Education")).getByText("Past due")).toBeInTheDocument();
    });

    it("saves on Ctrl + Enter in the reason, with the keys shown beside Save", async () => {
      const fetchFn = await openStatus(ACME, {
        status: jsonResponse({ ...ACME, status: "past_due", status_reason: "Invoice 12" }),
      });

      await userEvent.selectOptions(
        dialog().getByRole("combobox", { name: "New status" }),
        "past_due",
      );
      const reason = dialog().getByRole("textbox", { name: "Reason" });
      expect(dialog().getByText("Ctrl + Enter to save")).toBeInTheDocument();
      expect(reason).toHaveAccessibleDescription(/Ctrl \+ Enter to save$/);
      await userEvent.type(reason, "Invoice 12{Control>}{Enter}{/Control}");

      expect(fetchFn).toHaveBeenCalledWith(
        `/api/platform/consultancies/${uid(3)}/status/`,
        expect.objectContaining({
          body: JSON.stringify({ status: "past_due", reason: "Invoice 12" }),
        }),
      );
      expect(await screen.findByText("Status saved for Acme Education")).toBeInTheDocument();
    });

    it("asks for the paid-until date when making an office Active", async () => {
      const fetchFn = await openStatus(CEDAR, {
        status: jsonResponse({ ...CEDAR, status: "active", paid_until: "2099-12-31" }),
      });

      await userEvent.selectOptions(
        dialog().getByRole("combobox", { name: "New status" }),
        "active",
      );
      await userEvent.type(dialog().getByLabelText("Paid until"), "2099-12-31");
      await userEvent.click(dialog().getByRole("button", { name: "Save status" }));

      expect(fetchFn).toHaveBeenCalledWith(
        `/api/platform/consultancies/${uid(5)}/status/`,
        expect.objectContaining({
          body: JSON.stringify({ status: "active", reason: "", paid_until: "2099-12-31" }),
        }),
      );
    });

    it("extends an evaluation to a new last day", async () => {
      const fetchFn = await openStatus(CEDAR, { status: jsonResponse(CEDAR) });

      await userEvent.type(dialog().getByLabelText("Evaluation ends on"), "2099-11-30");
      await userEvent.click(dialog().getByRole("button", { name: "Save status" }));

      expect(fetchFn).toHaveBeenCalledWith(
        `/api/platform/consultancies/${uid(5)}/status/`,
        expect.objectContaining({
          body: JSON.stringify({
            status: "evaluation",
            reason: "",
            evaluation_ends_at: "2099-11-30",
          }),
        }),
      );
    });

    it("shows the server's reasons under the fields and for the change as a whole", async () => {
      await openStatus(ACME, {
        status: jsonResponse(
          { reason: ["Ensure this field has no more than 500 characters."] },
          400,
        ),
      });

      await userEvent.selectOptions(
        dialog().getByRole("combobox", { name: "New status" }),
        "suspended",
      );
      await userEvent.click(dialog().getByRole("button", { name: "Save status" }));

      expect(await dialog().findByRole("textbox", { name: "Reason" })).toHaveAccessibleDescription(
        "Ensure this field has no more than 500 characters. Ctrl + Enter to save",
      );
      expect(within(rowFor("Acme Education")).getByText("Active")).toBeInTheDocument();
    });

    it("shows a refused move in a problem banner", async () => {
      await openStatus(ACME, {
        status: jsonResponse({ detail: "Give a reason." }, 400),
      });

      await userEvent.selectOptions(
        dialog().getByRole("combobox", { name: "New status" }),
        "suspended",
      );
      await userEvent.click(dialog().getByRole("button", { name: "Save status" }));

      expect(await dialog().findByRole("alert")).toHaveTextContent("Give a reason.");
    });

    it("shows a general message when saving fails", async () => {
      await openStatus(ACME, { status: jsonResponse({}, 500) });

      await userEvent.click(dialog().getByRole("button", { name: "Save status" }));

      expect(await dialog().findByRole("alert")).toHaveTextContent(
        "We couldn't save the status. Please try again.",
      );
    });

    it("needs the subdomain typed before terminating, and warns that it is final", async () => {
      const fetchFn = await openStatus(ACME, {
        status: jsonResponse({ ...ACME, status: "terminated", status_reason: "Left" }),
      });

      await userEvent.selectOptions(
        dialog().getByRole("combobox", { name: "New status" }),
        "terminated",
      );
      expect(dialog().getByText(/Terminating is final/)).toBeInTheDocument();
      await userEvent.type(dialog().getByRole("textbox", { name: "Reason" }), "Left");
      await userEvent.type(dialog().getByRole("textbox", { name: "Type acme to confirm" }), "acm");
      await userEvent.click(dialog().getByRole("button", { name: "Terminate" }));

      // Only the list and the visits were loaded: nothing was saved.
      expect(fetchFn).toHaveBeenCalledTimes(2);
      expect(
        dialog().getByRole("textbox", { name: "Type acme to confirm" }),
      ).toHaveAccessibleDescription("Type the subdomain exactly as shown.");

      await userEvent.type(dialog().getByRole("textbox", { name: "Type acme to confirm" }), "e");
      await userEvent.click(dialog().getByRole("button", { name: "Terminate" }));

      expect(fetchFn).toHaveBeenCalledWith(
        `/api/platform/consultancies/${uid(3)}/status/`,
        expect.objectContaining({
          body: JSON.stringify({ status: "terminated", reason: "Left" }),
        }),
      );
      expect(await within(rowFor("Acme Education")).findByText("Terminated")).toBeInTheDocument();
      expect(
        within(rowFor("Acme Education")).queryByRole("button", { name: "Change status" }),
      ).not.toBeInTheDocument();
    });

    it("keeps a reason shaped like code as text", async () => {
      const fetchFn = await openStatus(ACME, {
        status: jsonResponse({ ...ACME, status: "suspended" }),
      });

      await userEvent.selectOptions(
        dialog().getByRole("combobox", { name: "New status" }),
        "suspended",
      );
      await userEvent.type(
        dialog().getByRole("textbox", { name: "Reason" }),
        "<img src=x onerror=alert(1)>",
      );
      await userEvent.click(dialog().getByRole("button", { name: "Save status" }));

      expect(fetchFn).toHaveBeenCalledWith(
        `/api/platform/consultancies/${uid(3)}/status/`,
        expect.objectContaining({
          body: JSON.stringify({ status: "suspended", reason: "<img src=x onerror=alert(1)>" }),
        }),
      );
      expect(document.querySelector("img")).toBeNull();
    });
  });
});

describe("Configuration: Admins (issue 64, ticket 16)", () => {
  const ADMINS_PATH = `/api/platform/consultancies/${uid(3)}/admins/`;
  const INVITED = { name: "Sita Sharma", email: "sita@acme.test", status: "invited" };

  function onList(...more: Answer2[]) {
    return backend(
      on("GET", "/api/platform/consultancies/", [ACME, BETA]),
      on("GET", "/api/platform/support-visits/", []),
      ...more,
    );
  }

  async function fillAndSend(name = "Sita Sharma", email = "sita@acme.test"): Promise<void> {
    if (name !== "") await userEvent.type(screen.getByRole("textbox", { name: "Name" }), name);
    if (email !== "") await userEvent.type(screen.getByRole("textbox", { name: "Email" }), email);
    await userEvent.click(screen.getByRole("button", { name: "Send invite" }));
  }

  it("explains the invite and asks no password", async () => {
    onList();
    renderList();

    await openConfiguration("Acme Education", "Admins");

    expect(
      screen.getByText(
        "We'll email them a 6-digit code. They use it to choose their own password.",
      ),
    ).toBeVisible();
    expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Admins" })).toHaveFocus();
  });

  it("invites an Admin, says who, and stays open with the form empty for another", async () => {
    const fetchFn = onList(on("POST", ADMINS_PATH, INVITED, 201));
    renderList();
    await openConfiguration("Acme Education", "Admins");

    await fillAndSend();

    expect(await screen.findByText("Invite sent to Sita Sharma")).toBeVisible();
    const [call] = callsTo(fetchFn, "POST", ADMINS_PATH);
    expect(call?.[1]?.body).toBe(JSON.stringify({ name: "Sita Sharma", email: "sita@acme.test" }));
    expect(screen.getByRole("dialog", { name: "Configuration for Acme Education" })).toBeVisible();
    expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue("");
    expect(screen.getByRole("textbox", { name: "Email" })).toHaveValue("");
  });

  it("asks for both fields before sending anything", async () => {
    const fetchFn = onList();
    renderList();
    await openConfiguration("Acme Education", "Admins");

    await fillAndSend("", "");

    expect(screen.getByRole("textbox", { name: "Name" })).toHaveAccessibleDescription(
      "Enter their name.",
    );
    expect(screen.getByRole("textbox", { name: "Email" })).toHaveAccessibleDescription(
      "Enter their email.",
    );
    expect(callsTo(fetchFn, "POST", ADMINS_PATH)).toHaveLength(0);
  });

  it("shows the server's reasons under the fields", async () => {
    onList(on("POST", ADMINS_PATH, { email: ["Someone here already uses this email."] }, 400));
    renderList();
    await openConfiguration("Acme Education", "Admins");

    await fillAndSend();

    expect(await screen.findByRole("textbox", { name: "Email" })).toHaveAccessibleDescription(
      "Someone here already uses this email.",
    );
  });

  it("shows why the office can't take an Admin in a banner", async () => {
    onList(on("POST", ADMINS_PATH, { detail: "A Terminated Consultancy can't be changed." }, 400));
    renderList();
    await openConfiguration("Acme Education", "Admins");

    await fillAndSend();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "A Terminated Consultancy can't be changed.",
    );
  });

  it("shows a general message when sending fails", async () => {
    onList(on("POST", ADMINS_PATH, {}, 500));
    renderList();
    await openConfiguration("Acme Education", "Admins");

    await fillAndSend();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "We couldn't send the invite. Please try again.",
    );
  });

  it("keeps a name shaped like code as text", async () => {
    onList(on("POST", ADMINS_PATH, { name: ["Enter a name of 1 to 200 letters."] }, 400));
    renderList();
    await openConfiguration("Acme Education", "Admins");

    await fillAndSend("<b>Sita</b>");

    expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue("<b>Sita</b>");
    expect(document.querySelector("[role=dialog] b")).toBeNull();
  });

  it("keeps what was typed when moving between parts", async () => {
    onList();
    renderList();
    const dialog = await openConfiguration("Acme Education", "Admins");
    await userEvent.type(screen.getByRole("textbox", { name: "Name" }), "Sita");

    await userEvent.click(within(dialog).getByRole("tab", { name: "Features" }));
    await userEvent.click(within(dialog).getByRole("tab", { name: "Admins" }));

    expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue("Sita");
  });

  it("offers Configuration only on offices that are set up and not Terminated", async () => {
    answerWith({
      list: jsonResponse([ACME, BETA, { ...CEDAR, setup_state: "setting_up" }]),
    });
    renderList();
    await screen.findByText("Acme Education");

    const buttons = screen.getAllByRole("button", { name: "Configuration" });
    expect(buttons.map((button) => button.hasAttribute("disabled"))).toEqual([false, true]);
  });
});

describe("Offices being set up (issue 60)", () => {
  const SETTING_UP = { ...ACME, setup_state: "setting_up" };
  const FAILED = { ...ACME, setup_state: "failed" };

  function listCalls(fetchFn: typeof fetch): number {
    return vi.mocked(fetchFn).mock.calls.filter(([path]) => path === "/api/platform/consultancies/")
      .length;
  }

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows Setting up with an icon instead of the Status, its actions switched off", async () => {
    answerWith({ list: () => jsonResponse([SETTING_UP]) });
    renderList();

    const row = within(await findRow("Acme Education"));
    // The word sits in its own span inside the chip (list tidy-ups 17).
    const chip = row.getByText("Setting up").parentElement;
    expect(chip?.querySelector("svg")).not.toBeNull();
    expect(row.queryByText("Active")).not.toBeInTheDocument();
    expect(
      row.getByText("Its features, colours and status can be changed once it is set up."),
    ).toBeVisible();
    for (const name of ROW_BUTTONS) {
      expect(row.getByRole("button", { name })).toBeDisabled();
    }
    expect(row.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
  });

  it("checks again every few seconds until the office is ready, then stops", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const answers = [[SETTING_UP], [SETTING_UP], [ACME]];
    const fetchFn = answerWith({
      list: () => jsonResponse(answers.shift() ?? [ACME]),
    });
    renderList();
    await findRow("Acme Education");
    expect(listCalls(fetchFn)).toBe(1);

    await act(() => vi.advanceTimersByTimeAsync(3000));
    expect(listCalls(fetchFn)).toBe(2);
    await act(() => vi.advanceTimersByTimeAsync(3000));
    expect(listCalls(fetchFn)).toBe(3);

    expect(await screen.findByText("Active")).toBeInTheDocument();
    expect(
      within(rowFor("Acme Education")).getByRole("button", { name: "Configuration" }),
    ).toBeEnabled();
    await act(() => vi.advanceTimersByTimeAsync(10_000));
    expect(listCalls(fetchFn)).toBe(3);
  });

  it("keeps checking after a check fails", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const answers: (() => Answer)[] = [
      () => jsonResponse([SETTING_UP]),
      () => jsonResponse({}, 500),
      () => jsonResponse([ACME]),
    ];
    const fetchFn = answerWith({
      list: () => (answers.shift() ?? answers[0] ?? (() => jsonResponse([ACME])))(),
    });
    renderList();
    await findRow("Acme Education");

    await act(() => vi.advanceTimersByTimeAsync(3000));
    expect(within(rowFor("Acme Education")).getByText("Setting up")).toBeInTheDocument();
    await act(() => vi.advanceTimersByTimeAsync(3000));

    expect(listCalls(fetchFn)).toBe(3);
    expect(await screen.findByText("Active")).toBeInTheDocument();
  });

  it("never checks again when every office is ready", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const fetchFn = answerWith({ list: () => jsonResponse([ACME, CEDAR]) });
    renderList();
    await findRow("Acme Education");

    await act(() => vi.advanceTimersByTimeAsync(10_000));

    expect(listCalls(fetchFn)).toBe(1);
  });

  it("shows Setup failed with Try again, which starts the setup again", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const fetchFn = answerWith({
      list: () => jsonResponse([FAILED]),
      retry: jsonResponse(SETTING_UP, 202),
    });
    renderList();
    const row = within(await findRow("Acme Education"));
    // The word sits in its own span inside the chip (list tidy-ups 17).
    const chip = row.getByText("Setup failed").parentElement;
    expect(chip?.querySelector("svg")).not.toBeNull();
    expect(row.getByRole("button", { name: "Change status" })).toBeDisabled();

    await userEvent.click(row.getByRole("button", { name: "Try again" }));

    expect(fetchFn).toHaveBeenCalledWith(
      `/api/platform/consultancies/${uid(3)}/retry-setup/`,
      expect.objectContaining({ method: "POST" }),
    );
    expect(await screen.findByText("Setting up Acme Education again")).toBeInTheDocument();
    expect(within(rowFor("Acme Education")).getByText("Setting up")).toBeInTheDocument();
    expect(
      within(rowFor("Acme Education")).queryByRole("button", { name: "Try again" }),
    ).not.toBeInTheDocument();
  });

  it("says so when Try again fails, and keeps the button", async () => {
    answerWith({ list: () => jsonResponse([FAILED]), retry: jsonResponse({}, 500) });
    renderList();
    const row = within(await findRow("Acme Education"));

    await userEvent.click(row.getByRole("button", { name: "Try again" }));

    expect(
      await screen.findByText("We couldn't start the setup again. Please try again."),
    ).toBeInTheDocument();
    expect(row.getByRole("button", { name: "Try again" })).toBeEnabled();
    expect(row.getByText("Setup failed")).toBeInTheDocument();
  });

  it("refuses a list whose setup state it doesn't know", async () => {
    answerWith({ list: () => jsonResponse([{ ...ACME, setup_state: "<b>ready</b>" }]) });
    renderList();

    expect(
      await screen.findByText("We couldn't load the Consultancies. Please refresh the page."),
    ).toBeInTheDocument();
    expect(document.querySelector("b")).toBeNull();
  });
});

describe.each(THEME_CASES)("ConsultancyList in the $name Theme", ({ config, mode }) => {
  beforeEach(() => {
    applyThemeCase(config, mode);
  });

  afterEach(() => {
    resetTheme();
  });

  it("shows each Status as a chip with its word, and the dialog", async () => {
    answerWith({
      list: jsonResponse([
        ACME,
        CEDAR,
        BETA,
        { ...ACME, id: uid(9), name: "Delta", status: "suspended" },
      ]),
    });
    renderList();

    expect(await screen.findByText("Suspended")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Terminated")).toBeInTheDocument();
    await userEvent.click(
      within(rowFor("Acme Education")).getByRole("button", { name: "Change status" }),
    );
    expect(
      screen.getByRole("dialog", { name: "Change the status of Acme Education" }),
    ).toBeVisible();
  });

  it("shows Setting up and Setup failed as chips with an icon and a word", async () => {
    answerWith({
      list: () =>
        jsonResponse([
          { ...ACME, setup_state: "failed" },
          { ...CEDAR, setup_state: "setting_up" },
        ]),
    });
    renderList();

    expect(await screen.findByText("Setup failed")).toBeInTheDocument();
    expect(screen.getByText("Setting up")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeEnabled();
  });
});
