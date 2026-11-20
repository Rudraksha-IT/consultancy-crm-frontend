import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { StaffContextContext } from "@/components/features/shell/staffContext";
import { ToastProvider } from "@/components/ui/ToastProvider";
import type { StaffContext } from "@/lib/api";
import { jsonResponse } from "@/lib/api/core/test-helpers";
import { DEFAULT_THEME } from "@/lib/theme";

import { EmployeesPage } from "./EmployeesPage";
import { consultancySummary } from "@/test/consultancy";
import { testHost } from "@/test/hosts";
import { uid } from "@/test/ids";

const ADMIN: StaffContext = {
  staff: { id: uid(1), name: "Asha Admin", email: "asha@acme.test", role: "admin" },
  consultancy: consultancySummary(),
  modules: ["staff"],
  dateDisplay: "AD",
  colourMode: "light",
  supportAccess: null,
  theme: DEFAULT_THEME,
};

function row(overrides: Record<string, unknown>) {
  return {
    id: uid(1),
    name: "Asha Admin",
    email: "asha@acme.test",
    mobile: "9800000001",
    job_title: "Director",
    role: "admin",
    joined_on: "2025-04-14",
    two_factor_required: false,
    two_factor_set_up: false,
    status: "active",
    ...overrides,
  };
}

const ME = row({});
const RAM = row({
  id: uid(2),
  name: "Ram Thapa",
  email: "ram@acme.test",
  job_title: "Senior counsellor",
  role: "counsellor",
});
const SITA = row({
  id: uid(3),
  name: "Sita Sharma",
  email: "sita@acme.test",
  job_title: "Receptionist",
  role: "front_desk",
  joined_on: "2026-11-01",
  status: "invited",
});
const HARI = row({ id: uid(4), name: "Hari KC", email: "hari@acme.test", status: "deactivated" });

type Route = Record<string, Response | (() => Response)>;

function backend(routes: Route) {
  const fetchFn = vi.fn((path: string, init?: RequestInit) =>
    Promise.resolve(answerTo(routes, `${init?.method ?? "GET"} ${path}`)),
  );
  vi.stubGlobal("fetch", fetchFn);
  return fetchFn;
}

function answerTo(routes: Route, key: string): Response {
  const answer = routes[key];
  const response = typeof answer === "function" ? answer() : answer;
  return response?.clone() ?? jsonResponse({}, 500);
}

function listing(extra: Route = {}) {
  return backend({ "GET /api/staff/": jsonResponse([ME, RAM, SITA, HARI]), ...extra });
}

function sentBody(fetchFn: ReturnType<typeof backend>, key: string): unknown {
  const call = fetchFn.mock.calls.find(
    ([path, init]) => `${init?.method ?? "GET"} ${path}` === key,
  );
  const body = call?.[1]?.body;
  return typeof body === "string" ? JSON.parse(body) : undefined;
}

function renderPage(context: StaffContext = ADMIN) {
  render(
    <StaffContextContext value={context}>
      <ToastProvider>
        <EmployeesPage />
      </ToastProvider>
    </StaffContextContext>,
  );
}

async function rowFor(name: string): Promise<HTMLElement> {
  const cell = await screen.findByText(name);
  const found = cell.closest("tr");
  if (found === null) throw new Error(`No row for ${name}`);
  return found;
}

describe("EmployeesPage", () => {
  it("lists each employee with job title, contact, Role, status and joining date", async () => {
    listing();
    renderPage();

    const ram = await rowFor("Ram Thapa");
    expect(screen.getByRole("heading", { level: 1, name: "Employees" })).toBeInTheDocument();
    expect(screen.getByText("2 people work at the office.")).toBeInTheDocument();
    expect(within(ram).getByText("Senior counsellor")).toBeInTheDocument();
    expect(within(ram).getByText("ram@acme.test")).toBeInTheDocument();
    expect(within(ram).getByText("Counsellor")).toBeInTheDocument();
    expect(within(ram).getByText("14 Apr 2025")).toBeInTheDocument();
    expect(
      within(await rowFor("Sita Sharma")).getByText("Invited, not joined yet"),
    ).toBeInTheDocument();
    expect(within(await rowFor("Hari KC")).getByText("Has left")).toBeInTheDocument();
  });

  it("links each employee who has joined to their page, with its Progress tab (issue 84)", async () => {
    listing();
    renderPage();

    expect(
      within(await rowFor("Ram Thapa")).getByRole("link", { name: "Ram Thapa" }),
    ).toHaveAttribute("href", `/staff/${uid(2)}`);
    expect(within(await rowFor("Hari KC")).getByRole("link", { name: "Hari KC" })).toHaveAttribute(
      "href",
      `/staff/${uid(4)}`,
    );
    expect(within(await rowFor("Sita Sharma")).queryByRole("link")).toBeNull();
  });

  it("offers Manage for others who are active, never for yourself or people who left", async () => {
    listing();
    renderPage();

    expect(
      within(await rowFor("Ram Thapa")).getByRole("button", { name: "Manage Ram Thapa" }),
    ).toBeInTheDocument();
    expect(within(await rowFor("Asha Admin")).queryByRole("button")).toBeNull();
    expect(within(await rowFor("Hari KC")).queryByRole("button")).toBeNull();
  });

  it("is not available to other Roles", () => {
    const fetchFn = listing();

    renderPage({ ...ADMIN, staff: { ...ADMIN.staff, role: "counsellor" } });

    expect(screen.getByText("This page isn't available to you.")).toBeInTheDocument();
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("says so when the list can't load", async () => {
    backend({ "GET /api/staff/": jsonResponse({}, 500) });
    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent("couldn't load the employees");
  });

  it("shows an empty list", async () => {
    backend({ "GET /api/staff/": jsonResponse([]) });
    renderPage();

    expect(await screen.findByText("Nobody has been added yet.")).toBeInTheDocument();
  });

  describe("when the office shows dates in BS", () => {
    it("lists joining dates in BS", async () => {
      listing();
      renderPage({ ...ADMIN, dateDisplay: "BS" });

      expect(within(await rowFor("Asha Admin")).getByText("1 Baisakh 2082")).toBeInTheDocument();
    });

    it("takes the joining date in BS and sends it in AD", async () => {
      const fetchFn = listing({ "POST /api/staff/": jsonResponse(row({ id: uid(9) }), 201) });
      renderPage({ ...ADMIN, dateDisplay: "BS" });
      await userEvent.click(await screen.findByRole("button", { name: "Add an employee" }));
      const dialog = screen.getByRole("dialog", { name: "Add an employee" });
      await userEvent.type(within(dialog).getByLabelText("Full name"), "Gita Rai");
      await userEvent.type(within(dialog).getByLabelText("Mobile number"), "9812345670");
      await userEvent.type(within(dialog).getByLabelText("Work email"), "gita@acme.test");
      await userEvent.type(within(dialog).getByLabelText("Job title"), "Counsellor");
      const joined = within(dialog).getByRole("group", { name: "Joined on" });

      await userEvent.selectOptions(within(joined).getByRole("combobox", { name: "Month" }), "1");
      await userEvent.selectOptions(within(joined).getByRole("combobox", { name: "Day" }), "1");
      await userEvent.clear(within(joined).getByRole("textbox", { name: "Year" }));
      await userEvent.type(within(joined).getByRole("textbox", { name: "Year" }), "2083");
      await userEvent.click(within(dialog).getByRole("button", { name: "Add and send the code" }));

      await screen.findByText(/added\. Code sent to/);
      expect(sentBody(fetchFn, "POST /api/staff/")).toMatchObject({ joined_on: "2026-04-14" });
    });
  });

  describe("adding an employee", () => {
    const NEW = row({ id: uid(9), name: "Gita Rai", email: "gita@acme.test", status: "invited" });

    async function fillAndSend(): Promise<HTMLElement> {
      await userEvent.click(await screen.findByRole("button", { name: "Add an employee" }));
      const dialog = screen.getByRole("dialog", { name: "Add an employee" });
      await userEvent.type(within(dialog).getByLabelText("Full name"), "Gita Rai");
      await userEvent.type(within(dialog).getByLabelText("Mobile number"), "9812345670");
      await userEvent.type(within(dialog).getByLabelText("Work email"), "gita@acme.test");
      await userEvent.type(within(dialog).getByLabelText("Job title"), "Counsellor");
      await userEvent.selectOptions(
        within(dialog).getByLabelText("Can use the app as"),
        "counsellor",
      );
      await userEvent.clear(within(dialog).getByLabelText("Joined on"));
      await userEvent.type(within(dialog).getByLabelText("Joined on"), "2026-11-01");
      await userEvent.click(within(dialog).getByRole("button", { name: "Add and send the code" }));
      return dialog;
    }

    it("sends the details, shows them as invited and confirms the code was sent", async () => {
      const fetchFn = listing({ "POST /api/staff/": jsonResponse(NEW, 201) });
      renderPage();

      await fillAndSend();

      expect(
        await screen.findByText("Gita Rai added. Code sent to gita@acme.test."),
      ).toBeInTheDocument();
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(
        within(await rowFor("Gita Rai")).getByText("Invited, not joined yet"),
      ).toBeInTheDocument();
      expect(sentBody(fetchFn, "POST /api/staff/")).toEqual({
        name: "Gita Rai",
        mobile: "9812345670",
        email: "gita@acme.test",
        job_title: "Counsellor",
        role: "counsellor",
        joined_on: "2026-11-01",
      });
    });

    it("never asks for a password and explains the code", async () => {
      listing();
      renderPage();

      await userEvent.click(await screen.findByRole("button", { name: "Add an employee" }));
      const dialog = screen.getByRole("dialog");

      expect(within(dialog).queryByLabelText(/password/i)).toBeNull();
      expect(within(dialog).getByText(/You never see or set their password/)).toBeInTheDocument();
    });

    it("offers Teacher only while test-prep classes are on", async () => {
      listing();
      renderPage();
      await userEvent.click(await screen.findByRole("button", { name: "Add an employee" }));

      const roles = within(screen.getByLabelText("Can use the app as")).getAllByRole("option");

      expect(roles.map((option) => option.textContent)).toEqual([
        "Admin",
        "Counsellor",
        "Front Desk",
      ]);
    });

    it("shows the server's field errors next to the fields", async () => {
      listing({
        "POST /api/staff/": jsonResponse({ email: ["Someone here already uses this email."] }, 400),
      });
      renderPage();

      const dialog = await fillAndSend();

      expect(
        await within(dialog).findByText("Someone here already uses this email."),
      ).toBeInTheDocument();
      expect(within(dialog).getByLabelText("Work email")).toHaveAttribute("aria-invalid", "true");
    });

    it("says when adding fails", async () => {
      listing({ "POST /api/staff/": jsonResponse({}, 500) });
      renderPage();

      const dialog = await fillAndSend();

      expect(await within(dialog).findByRole("alert")).toHaveTextContent("We couldn't add them.");
    });

    it("closes with Cancel", async () => {
      listing();
      renderPage();
      await userEvent.click(await screen.findByRole("button", { name: "Add an employee" }));

      await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });

  describe("invites", () => {
    it("sends the code again", async () => {
      listing({ [`POST /api/staff/${uid(3)}/invite/`]: jsonResponse(SITA, 202) });
      renderPage();

      await userEvent.click(
        within(await rowFor("Sita Sharma")).getByRole("button", { name: "Send the code again" }),
      );

      expect(
        await screen.findByText(/A new code is on its way to sita@acme.test/),
      ).toBeInTheDocument();
    });

    it("explains the hourly limit", async () => {
      listing({ [`POST /api/staff/${uid(3)}/invite/`]: jsonResponse({}, 429) });
      renderPage();

      await userEvent.click(
        within(await rowFor("Sita Sharma")).getByRole("button", { name: "Send the code again" }),
      );

      expect(await screen.findByRole("alert")).toHaveTextContent("Too many codes");
    });

    it("cancels the invite and removes the row", async () => {
      listing({ [`DELETE /api/staff/${uid(3)}/invite/`]: new Response(null, { status: 204 }) });
      renderPage();

      await userEvent.click(
        within(await rowFor("Sita Sharma")).getByRole("button", { name: "Cancel invite" }),
      );
      const dialog = screen.getByRole("dialog", { name: "Cancel the invite for Sita Sharma?" });
      expect(dialog).toHaveTextContent("The code they were sent stops working.");
      await userEvent.click(within(dialog).getByRole("button", { name: "Cancel invite" }));

      expect(
        await screen.findByText("Invite for Sita Sharma cancelled. The code no longer works."),
      ).toBeInTheDocument();
      expect(screen.queryByRole("cell", { name: /Sita Sharma/ })).toBeNull();
    });

    it("says when cancelling fails", async () => {
      listing({ [`DELETE /api/staff/${uid(3)}/invite/`]: jsonResponse({}, 400) });
      renderPage();

      await userEvent.click(
        within(await rowFor("Sita Sharma")).getByRole("button", { name: "Cancel invite" }),
      );
      const dialog = screen.getByRole("dialog");
      await userEvent.click(within(dialog).getByRole("button", { name: "Cancel invite" }));

      expect(await within(dialog).findByRole("alert")).toHaveTextContent("We couldn't save that.");
    });

    it("keeps the invite when the popup is cancelled", async () => {
      const fetchFn = listing();
      renderPage();

      await userEvent.click(
        within(await rowFor("Sita Sharma")).getByRole("button", { name: "Cancel invite" }),
      );
      await userEvent.click(
        within(screen.getByRole("dialog")).getByRole("button", { name: "Cancel" }),
      );

      expect(screen.queryByRole("dialog")).toBeNull();
      expect(await rowFor("Sita Sharma")).toBeVisible();
      expect(fetchFn.mock.calls.some(([, init]) => init?.method === "DELETE")).toBe(false);
    });
  });

  describe("managing an employee", () => {
    async function openManage(): Promise<HTMLElement> {
      await userEvent.click(
        within(await rowFor("Ram Thapa")).getByRole("button", { name: "Manage Ram Thapa" }),
      );
      return screen.getByRole("dialog", { name: "Manage Ram Thapa" });
    }

    it("changes the Role", async () => {
      const fetchFn = listing({
        [`PATCH /api/staff/${uid(2)}/`]: jsonResponse({ ...RAM, role: "admin" }),
      });
      renderPage();

      const dialog = await openManage();
      expect(
        within(dialog).getByText("The role decides what they can see and do."),
      ).toBeInTheDocument();
      await userEvent.selectOptions(within(dialog).getByLabelText("Role"), "admin");
      await userEvent.click(within(dialog).getByRole("button", { name: "Save" }));

      expect(await screen.findByText("Ram Thapa is now Admin")).toBeInTheDocument();
      expect(sentBody(fetchFn, `PATCH /api/staff/${uid(2)}/`)).toEqual({ role: "admin" });
      expect(within(await rowFor("Ram Thapa")).getByText("Admin")).toBeInTheDocument();
    });

    it("closes without saving when the Role is unchanged", async () => {
      const fetchFn = listing();
      renderPage();

      const dialog = await openManage();
      await userEvent.click(within(dialog).getByRole("button", { name: "Save" }));

      expect(screen.queryByRole("dialog")).toBeNull();
      expect(sentBody(fetchFn, `PATCH /api/staff/${uid(2)}/`)).toBeUndefined();
    });

    it("says when the change fails", async () => {
      listing({ [`PATCH /api/staff/${uid(2)}/`]: jsonResponse({}, 500) });
      renderPage();

      const dialog = await openManage();
      await userEvent.selectOptions(within(dialog).getByLabelText("Role"), "front_desk");
      await userEvent.click(within(dialog).getByRole("button", { name: "Save" }));

      expect(await within(dialog).findByRole("alert")).toHaveTextContent("We couldn't save that.");
    });

    it("deactivates after confirming, and shows them as having left", async () => {
      listing({
        [`GET /api/staff/${uid(2)}/assigned-students/`]: jsonResponse([]),
        [`POST /api/staff/${uid(2)}/deactivate/`]: jsonResponse({ ...RAM, status: "deactivated" }),
      });
      renderPage();

      const dialog = await openManage();
      expect(within(dialog).getByText(/If Ram has left the office/)).toBeInTheDocument();
      await userEvent.click(within(dialog).getByRole("button", { name: "Deactivate" }));
      const confirm = screen.getByRole("dialog", { name: "Deactivate Ram Thapa?" });
      expect(within(confirm).getByText(/won't be able to log in/)).toBeInTheDocument();
      await userEvent.click(within(confirm).getByRole("button", { name: "Deactivate" }));

      expect(await screen.findByText("Staff member deactivated")).toBeInTheDocument();
      expect(within(await rowFor("Ram Thapa")).getByText("Has left")).toBeInTheDocument();
    });

    it("says when deactivating fails", async () => {
      listing({
        [`GET /api/staff/${uid(2)}/assigned-students/`]: jsonResponse([]),
        [`POST /api/staff/${uid(2)}/deactivate/`]: jsonResponse({}, 500),
      });
      renderPage();

      const dialog = await openManage();
      await userEvent.click(within(dialog).getByRole("button", { name: "Deactivate" }));
      const confirm = screen.getByRole("dialog", { name: "Deactivate Ram Thapa?" });
      await userEvent.click(within(confirm).getByRole("button", { name: "Deactivate" }));

      expect(await within(confirm).findByRole("alert")).toHaveTextContent("We couldn't save that.");
    });

    it("lists the Students still assigned to them before confirming", async () => {
      const fetchFn = listing({
        [`GET /api/staff/${uid(2)}/assigned-students/`]: jsonResponse([
          { id: uid(4), name: "Rohan Bhandari", stage: "counselling" },
          { id: uid(1), name: "Sita Karki", stage: "applying" },
        ]),
        [`POST /api/staff/${uid(2)}/deactivate/`]: jsonResponse({ ...RAM, status: "deactivated" }),
      });
      renderPage();

      const dialog = await openManage();
      await userEvent.click(within(dialog).getByRole("button", { name: "Deactivate" }));
      const confirm = screen.getByRole("dialog", { name: "Deactivate Ram Thapa?" });

      expect(
        await within(confirm).findByText("2 Students are still assigned to Ram."),
      ).toBeInTheDocument();
      expect(
        within(confirm).getByText(
          "Transfer them first, or they'll be left with a counsellor who has left:",
        ),
      ).toBeInTheDocument();
      expect(within(confirm).getByRole("link", { name: "Rohan Bhandari" })).toHaveAttribute(
        "href",
        `/students/${uid(4)}`,
      );
      expect(within(confirm).getByText(/, Applying$/)).toBeInTheDocument();
      await userEvent.click(within(confirm).getByRole("button", { name: "Deactivate anyway" }));

      expect(await screen.findByText("Staff member deactivated")).toBeInTheDocument();
      expect(sentBody(fetchFn, `POST /api/staff/${uid(2)}/deactivate/`)).toEqual({});
    });

    it("names one Student in the singular", async () => {
      listing({
        [`GET /api/staff/${uid(2)}/assigned-students/`]: jsonResponse([
          { id: uid(4), name: "Rohan Bhandari", stage: "lead" },
        ]),
      });
      renderPage();

      const dialog = await openManage();
      await userEvent.click(within(dialog).getByRole("button", { name: "Deactivate" }));

      expect(await screen.findByText("1 Student is still assigned to Ram.")).toBeInTheDocument();
    });

    it("still lets them be deactivated when the check fails, and says so", async () => {
      listing({
        [`GET /api/staff/${uid(2)}/assigned-students/`]: jsonResponse({}, 500),
        [`POST /api/staff/${uid(2)}/deactivate/`]: jsonResponse({ ...RAM, status: "deactivated" }),
      });
      renderPage();

      const dialog = await openManage();
      await userEvent.click(within(dialog).getByRole("button", { name: "Deactivate" }));
      const confirm = screen.getByRole("dialog", { name: "Deactivate Ram Thapa?" });

      expect(
        await within(confirm).findByText(
          "We couldn't check which Students are assigned to them. Check the Student list first.",
        ),
      ).toBeInTheDocument();
      await userEvent.click(within(confirm).getByRole("button", { name: "Deactivate" }));
      expect(await screen.findByText("Staff member deactivated")).toBeInTheDocument();
    });

    it("closes with Escape", async () => {
      listing();
      renderPage();

      await openManage();
      await userEvent.keyboard("{Escape}");

      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });
});

describe("EmployeesPage: two-step login (issue 62)", () => {
  const RAM_ON = { ...RAM, two_factor_required: true, two_factor_set_up: true };

  async function openManage(): Promise<HTMLElement> {
    await userEvent.click(
      within(await rowFor("Ram Thapa")).getByRole("button", { name: "Manage Ram Thapa" }),
    );
    return screen.getByRole("dialog", { name: "Manage Ram Thapa" });
  }

  it("shows each person's two-step login in words: on and set up, on and not set up, or off", async () => {
    backend({
      "GET /api/staff/": jsonResponse([ME, RAM_ON, { ...SITA, two_factor_required: true }, HARI]),
    });
    renderPage();

    expect(within(await rowFor("Ram Thapa")).getByText("On, set up")).toBeInTheDocument();
    expect(within(await rowFor("Sita Sharma")).getByText("On, not set up")).toBeInTheDocument();
    expect(within(await rowFor("Asha Admin")).getByText("Off")).toBeInTheDocument();
    expect(within(await rowFor("Ram Thapa")).getByText("Two-step login")).toBeInTheDocument();
  });

  it("switches it on with Save, saying they'll be signed out", async () => {
    const fetchFn = listing({
      [`PATCH /api/staff/${uid(2)}/two-factor/`]: jsonResponse({
        ...RAM,
        two_factor_required: true,
      }),
    });
    renderPage();

    const dialog = await openManage();
    const toggle = within(dialog).getByRole("switch", { name: "Two-step login" });
    expect(toggle).not.toBeChecked();
    expect(within(dialog).getByText(/signs them out/)).toBeInTheDocument();
    await userEvent.click(toggle);
    await userEvent.click(within(dialog).getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Two-step login switched on for Ram Thapa")).toBeInTheDocument();
    expect(sentBody(fetchFn, `PATCH /api/staff/${uid(2)}/two-factor/`)).toEqual({ required: true });
    expect(sentBody(fetchFn, `PATCH /api/staff/${uid(2)}/`)).toBeUndefined();
    expect(within(await rowFor("Ram Thapa")).getByText("On, not set up")).toBeInTheDocument();
  });

  it("switches it off", async () => {
    const fetchFn = backend({
      "GET /api/staff/": jsonResponse([ME, RAM_ON]),
      [`PATCH /api/staff/${uid(2)}/two-factor/`]: jsonResponse(RAM),
    });
    renderPage();

    const dialog = await openManage();
    await userEvent.click(within(dialog).getByRole("switch", { name: "Two-step login" }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Save" }));

    expect(
      await screen.findByText("Two-step login switched off for Ram Thapa"),
    ).toBeInTheDocument();
    expect(sentBody(fetchFn, `PATCH /api/staff/${uid(2)}/two-factor/`)).toEqual({
      required: false,
    });
  });

  it("resets it after a warning that they'll be signed out", async () => {
    const fetchFn = backend({
      "GET /api/staff/": jsonResponse([ME, RAM_ON]),
      [`POST /api/staff/${uid(2)}/two-factor/reset/`]: jsonResponse({
        ...RAM_ON,
        two_factor_set_up: false,
      }),
    });
    renderPage();

    const dialog = await openManage();
    await userEvent.click(within(dialog).getByRole("button", { name: "Reset two-step login" }));
    const confirm = screen.getByRole("dialog", { name: "Reset two-step login for Ram Thapa?" });
    expect(within(confirm).getByText(/signed out everywhere/)).toBeInTheDocument();
    expect(within(confirm).getByText(/set up their app again/)).toBeInTheDocument();
    await userEvent.click(within(confirm).getByRole("button", { name: "Reset" }));

    expect(await screen.findByText("Two-step login reset for Ram Thapa")).toBeInTheDocument();
    expect(sentBody(fetchFn, `POST /api/staff/${uid(2)}/two-factor/reset/`)).toEqual({});
    expect(within(await rowFor("Ram Thapa")).getByText("On, not set up")).toBeInTheDocument();
  });

  it("offers no reset when there's nothing set up to reset", async () => {
    listing();
    renderPage();

    const dialog = await openManage();

    expect(within(dialog).queryByRole("button", { name: "Reset two-step login" })).toBeNull();
  });

  it("says when the reset fails", async () => {
    backend({
      "GET /api/staff/": jsonResponse([ME, RAM_ON]),
      [`POST /api/staff/${uid(2)}/two-factor/reset/`]: jsonResponse({}, 500),
    });
    renderPage();

    const dialog = await openManage();
    await userEvent.click(within(dialog).getByRole("button", { name: "Reset two-step login" }));
    const confirm = screen.getByRole("dialog", { name: "Reset two-step login for Ram Thapa?" });
    await userEvent.click(within(confirm).getByRole("button", { name: "Reset" }));

    expect(await within(confirm).findByRole("alert")).toHaveTextContent("We couldn't save that.");
  });
});

describe("EmployeesPage for a Platform Admin inside the office", () => {
  const VISITOR: StaffContext = {
    ...ADMIN,
    staff: { id: uid(0), name: "Ramesh", email: "ramesh@platform.test", role: "admin" },
    supportAccess: { platformAdminName: "Ramesh", platformHost: testHost("admin") },
  };

  it("can manage every active person, Admins included, and send a reset code", async () => {
    const fetchFn = listing({
      [`POST /api/support-access/staff/${uid(1)}/reset-code/`]: jsonResponse({
        detail: "Reset code sent.",
      }),
    });
    renderPage(VISITOR);

    await userEvent.click(
      within(await rowFor("Asha Admin")).getByRole("button", { name: "Manage Asha Admin" }),
    );
    const dialog = within(screen.getByRole("dialog", { name: "Manage Asha Admin" }));
    expect(dialog.getByText("Platform Admin only")).toBeVisible();
    await userEvent.click(dialog.getByRole("button", { name: "Send a password reset code" }));

    expect(await screen.findByText("Reset code sent to asha@acme.test")).toBeInTheDocument();
    expect(
      fetchFn.mock.calls.some(
        ([path]) => path === `/api/support-access/staff/${uid(1)}/reset-code/`,
      ),
    ).toBe(true);
  });

  it("signs someone out of every device", async () => {
    listing({
      [`POST /api/support-access/staff/${uid(2)}/sign-out/`]: () =>
        new Response(null, { status: 204 }),
    });
    renderPage(VISITOR);

    await userEvent.click(
      within(await rowFor("Ram Thapa")).getByRole("button", { name: "Manage Ram Thapa" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Sign out of every device" }));

    expect(await screen.findByText("Ram Thapa is signed out everywhere")).toBeInTheDocument();
  });

  it("is never offered to the office's own Admin", async () => {
    listing();
    renderPage();

    await userEvent.click(
      within(await rowFor("Ram Thapa")).getByRole("button", { name: "Manage Ram Thapa" }),
    );

    expect(screen.queryByText("Platform Admin only")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Send a password reset code" }),
    ).not.toBeInTheDocument();
  });
});
