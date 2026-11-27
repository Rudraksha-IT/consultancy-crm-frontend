import { uid } from "@/test/ids";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ToastProvider } from "@/components/ui/ToastProvider";
import { backend, callsTo, on, onEach } from "@/test/backend";
import { applyThemeCase, resetTheme, THEME_CASES } from "@/test/themes";

import { PlatformAdminsPage } from "./PlatformAdminsPage";

const PATH = "/api/platform/admins/";
const ME = {
  id: uid(1),
  name: "Platform Ops",
  email: "ops@platform.test",
  status: "active",
  two_factor_required: true,
  two_factor_set_up: true,
  is_me: true,
};
const SAM = {
  ...ME,
  id: uid(2),
  name: "Sam Rai",
  email: "sam@platform.test",
  two_factor_required: false,
  two_factor_set_up: false,
  is_me: false,
};
const RITA = {
  ...SAM,
  id: uid(3),
  name: "Rita Shrestha",
  email: "rita@platform.test",
  status: "invited",
};

function renderPage() {
  render(
    <ToastProvider>
      <PlatformAdminsPage />
    </ToastProvider>,
  );
}

function rowOf(name: string): HTMLElement {
  const row = screen.getByText(name).closest("li");
  if (row === null) throw new Error(`no row for ${name}`);
  return row;
}

function sentBody(fetchFn: ReturnType<typeof backend>, path: string): unknown {
  const body = callsTo(fetchFn, "POST", path)[0]?.[1]?.body;
  return JSON.parse(typeof body === "string" ? body : "null");
}

describe("PlatformAdminsPage (issue 65)", () => {
  it("lists every Platform Admin with their status and two-step login in words", async () => {
    backend(on("GET", PATH, [ME, SAM, RITA]));
    renderPage();

    expect(await screen.findByRole("heading", { level: 1, name: "Platform Admins" })).toBeVisible();
    const me = within(await waitFor(() => rowOf("Platform Ops")));
    expect(me.getByText("You")).toBeVisible();
    expect(me.getByText("Active")).toBeVisible();
    expect(me.getByText("Two-step login on")).toBeVisible();
    expect(me.queryByRole("button", { name: /deactivate/i })).not.toBeInTheDocument();
    const rita = within(rowOf("Rita Shrestha"));
    expect(rita.getByText("Invited, not joined yet")).toBeVisible();
    expect(rita.getByRole("button", { name: "Send the code again" })).toBeVisible();
    expect(rita.getByRole("button", { name: "Cancel invite" })).toBeVisible();
    expect(within(rowOf("Sam Rai")).getByRole("button", { name: "Deactivate" })).toBeVisible();
    expect(within(rowOf("Sam Rai")).getByText("Two-step login off")).toBeVisible();
  });

  it("adds a Platform Admin by invite and shows them at once", async () => {
    const rows = [ME];
    const fetchFn = backend(
      onEach("GET", PATH, () => rows),
      on("POST", PATH, RITA, 201),
    );
    renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Add Platform Admin" }));
    const dialog = within(screen.getByRole("dialog", { name: "Add a Platform Admin" }));
    expect(dialog.getByLabelText("Name")).toHaveFocus();
    await user.type(dialog.getByLabelText("Name"), "Rita Shrestha");
    await user.type(dialog.getByLabelText("Email"), "rita@platform.test");
    await user.click(dialog.getByRole("button", { name: "Send invite" }));

    expect(await screen.findByText("Invite sent to Rita Shrestha")).toBeVisible();
    expect(sentBody(fetchFn, PATH)).toEqual({ name: "Rita Shrestha", email: "rita@platform.test" });
    expect(within(rowOf("Rita Shrestha")).getByText("Invited, not joined yet")).toBeVisible();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("asks for both fields, and shows a refused email under it", async () => {
    const fetchFn = backend(
      on("GET", PATH, [ME]),
      on("POST", PATH, { email: ["Another Platform Admin already uses this email."] }, 400),
    );
    renderPage();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Add Platform Admin" }));
    const dialog = within(screen.getByRole("dialog"));

    await user.click(dialog.getByRole("button", { name: "Send invite" }));
    expect(dialog.getByLabelText("Name")).toHaveAccessibleDescription("Enter their name.");
    expect(callsTo(fetchFn, "POST", PATH)).toHaveLength(0);

    await user.type(dialog.getByLabelText("Name"), "Rita");
    await user.type(dialog.getByLabelText("Email"), "ops@platform.test");
    await user.click(dialog.getByRole("button", { name: "Send invite" }));

    expect(
      await dialog.findByText("Another Platform Admin already uses this email."),
    ).toBeVisible();
  });

  it("sends the code again to someone invited", async () => {
    const fetchFn = backend(
      on("GET", PATH, [ME, RITA]),
      on("POST", `${PATH}${uid(3)}/resend/`, { detail: "A new code is on its way." }),
    );
    renderPage();

    await userEvent.click(
      within(await waitFor(() => rowOf("Rita Shrestha"))).getByRole("button", {
        name: "Send the code again",
      }),
    );

    expect(await screen.findByText("A new code is on its way to Rita Shrestha")).toBeVisible();
    expect(callsTo(fetchFn, "POST", `${PATH}${uid(3)}/resend/`)).toHaveLength(1);
  });

  it("deactivates someone after a warning, and shows it", async () => {
    const fetchFn = backend(
      on("GET", PATH, [ME, SAM]),
      on("POST", `${PATH}${uid(2)}/deactivate/`, { ...SAM, status: "deactivated" }),
    );
    renderPage();
    const user = userEvent.setup();

    await user.click(
      within(await waitFor(() => rowOf("Sam Rai"))).getByRole("button", { name: "Deactivate" }),
    );
    const dialog = within(screen.getByRole("dialog", { name: "Deactivate Sam Rai?" }));
    expect(dialog.getByText(/signed out now/)).toBeVisible();
    await user.click(dialog.getByRole("button", { name: "Deactivate" }));

    expect(await screen.findByText("Sam Rai deactivated")).toBeVisible();
    expect(within(rowOf("Sam Rai")).getByText("Deactivated")).toBeVisible();
    expect(within(rowOf("Sam Rai")).getByRole("button", { name: "Reactivate" })).toBeVisible();
    expect(callsTo(fetchFn, "POST", `${PATH}${uid(2)}/deactivate/`)).toHaveLength(1);
  });

  it("shows why a deactivation was refused, and closes the warning with Escape", async () => {
    backend(
      on("GET", PATH, [ME, SAM]),
      on(
        "POST",
        `${PATH}${uid(2)}/deactivate/`,
        { detail: "At least one active Platform Admin must stay." },
        400,
      ),
    );
    renderPage();
    const user = userEvent.setup();
    await user.click(
      within(await waitFor(() => rowOf("Sam Rai"))).getByRole("button", { name: "Deactivate" }),
    );
    const dialog = within(screen.getByRole("dialog"));

    await user.click(dialog.getByRole("button", { name: "Deactivate" }));

    expect(await dialog.findByText("At least one active Platform Admin must stay.")).toBeVisible();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("asks before cancelling an invite, and Cancel keeps it", async () => {
    const fetchFn = backend(on("GET", PATH, [ME, SAM, RITA]));
    renderPage();
    const user = userEvent.setup();
    await user.click(
      within(await waitFor(() => rowOf("Rita Shrestha"))).getByRole("button", {
        name: "Cancel invite",
      }),
    );
    const dialog = screen.getByRole("dialog", { name: "Cancel Rita Shrestha's invite?" });
    expect(within(dialog).getByRole("button", { name: "Cancel" })).toHaveFocus();

    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(fetchFn.mock.calls.some(([, init]) => init?.method === "POST")).toBe(false);
  });

  it("reactivates someone deactivated and shows them active again", async () => {
    const OLD = { ...SAM, status: "deactivated" };
    const fetchFn = backend(
      on("GET", PATH, [ME, OLD]),
      on("POST", `${PATH}${uid(2)}/reactivate/`, { ...SAM, status: "active" }),
    );
    renderPage();

    await userEvent.click(
      within(await waitFor(() => rowOf("Sam Rai"))).getByRole("button", { name: "Reactivate" }),
    );

    expect(await screen.findByText("Sam Rai reactivated")).toBeVisible();
    expect(within(rowOf("Sam Rai")).getByText("Active")).toBeVisible();
    expect(within(rowOf("Sam Rai")).getByRole("button", { name: "Deactivate" })).toBeVisible();
    expect(callsTo(fetchFn, "POST", `${PATH}${uid(2)}/reactivate/`)).toHaveLength(1);
  });

  it("says a reactivated invite gets a new code", async () => {
    backend(
      on("GET", PATH, [ME, { ...RITA, status: "deactivated" }]),
      on("POST", `${PATH}${uid(3)}/reactivate/`, RITA),
    );
    renderPage();

    await userEvent.click(
      within(await waitFor(() => rowOf("Rita Shrestha"))).getByRole("button", {
        name: "Reactivate",
      }),
    );

    expect(
      await screen.findByText("Rita Shrestha is invited again; a new code is on its way"),
    ).toBeVisible();
    expect(within(rowOf("Rita Shrestha")).getByText("Invited, not joined yet")).toBeVisible();
  });

  it("says when reactivating fails", async () => {
    backend(
      on("GET", PATH, [ME, { ...SAM, status: "deactivated" }]),
      on("POST", `${PATH}${uid(2)}/reactivate/`, {}, 500),
    );
    renderPage();

    await userEvent.click(
      within(await waitFor(() => rowOf("Sam Rai"))).getByRole("button", { name: "Reactivate" }),
    );

    expect(await screen.findByText("We couldn't do that. Please try again.")).toBeVisible();
    expect(within(rowOf("Sam Rai")).getByText("Deactivated")).toBeVisible();
  });

  it("says when the list can't be loaded", async () => {
    backend(on("GET", PATH, {}, 500));
    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "We couldn't load the Platform Admins. Please refresh the page.",
    );
  });

  it("keeps a name shaped like code as text", async () => {
    backend(on("GET", PATH, [ME, { ...SAM, name: "<b>Sam</b>" }]));
    renderPage();

    expect(await screen.findByText("<b>Sam</b>")).toBeVisible();
  });
});

describe.each(THEME_CASES)("PlatformAdminsPage in the $name Theme", ({ mode }) => {
  beforeEach(() => {
    applyThemeCase(mode);
  });
  afterEach(resetTheme);

  it("shows each status as a chip with its word", async () => {
    backend(
      on("GET", PATH, [
        ME,
        SAM,
        RITA,
        { ...SAM, id: uid(4), name: "Old Hand", status: "deactivated" },
      ]),
    );
    renderPage();

    expect(await screen.findByText("Invited, not joined yet")).toBeVisible();
    expect(screen.getAllByText("Active")).toHaveLength(2);
    expect(screen.getByText("Deactivated")).toBeVisible();
  });
});
