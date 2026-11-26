import { uid } from "@/test/ids";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { jsonResponse } from "@/lib/api/core/test-helpers";

import { NewConsultancyForm } from "./NewConsultancyForm";
import { testHost } from "@/test/hosts";

const router = vi.hoisted(() => ({ push: vi.fn<(href: string) => void>() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const PRODUCT_DOMAIN_PATH = "/api/platform/product-domain/";

/** The backend: the product domain, then `create` for the create call. */
function backendAnswering(create: () => Promise<Response>, domain = "crm.example.com") {
  const fetchFn = vi.fn<typeof fetch>((path) =>
    path === PRODUCT_DOMAIN_PATH
      ? Promise.resolve(jsonResponse({ product_domain: domain }))
      : create(),
  );
  vi.stubGlobal("fetch", fetchFn);
  return fetchFn;
}

function createCalls(fetchFn: ReturnType<typeof backendAnswering>) {
  return fetchFn.mock.calls.filter(([path]) => path !== PRODUCT_DOMAIN_PATH);
}

const CREATED = {
  id: uid(3),
  name: "Acme Education",
  subdomain: "acme",
  host: testHost("acme"),
  status: "evaluation",
  status_reason: "",
  evaluation_ends_at: "2026-11-18T03:15:00Z",
  paid_until: null,
  modules: ["students"],
  setup_state: "setting_up",
};

async function fillAndSubmit(): Promise<void> {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Consultancy name"), "Acme Education");
  await user.type(screen.getByLabelText("Subdomain"), "acme");
  await user.type(screen.getByLabelText("Contact email"), "info@acme.com");
  await user.click(screen.getByRole("button", { name: "Create Consultancy" }));
}

beforeEach(() => {
  router.push.mockReset();
});

describe("NewConsultancyForm", () => {
  it("creates the Consultancy without any Admin and returns to the list", async () => {
    const fetchFn = backendAnswering(() => Promise.resolve(jsonResponse(CREATED, 202)));
    render(<NewConsultancyForm />);

    await fillAndSubmit();

    expect(fetchFn).toHaveBeenCalledWith(
      "/api/platform/consultancies/",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          name: "Acme Education",
          subdomain: "acme",
          contact_email: "info@acme.com",
          status: "evaluation",
        }),
      }),
    );
    expect(router.push).toHaveBeenCalledWith("/platform");
  });

  it("asks for no Admin, and says Admins are added once the office is set up", () => {
    backendAnswering(() => Promise.resolve(jsonResponse(CREATED, 202)));
    render(<NewConsultancyForm />);

    expect(screen.queryByLabelText(/admin/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/first admin/i)).not.toBeInTheDocument();
    expect(
      screen.getByText("Once it is set up, add its Admins with Add admin on its row."),
    ).toBeVisible();
  });

  it("shows the backend's product domain after the address field, and the full address as typed", async () => {
    backendAnswering(() => Promise.resolve(jsonResponse(CREATED, 202)));
    render(<NewConsultancyForm />);

    expect(await screen.findByText(".crm.example.com")).toBeVisible();
    await userEvent.type(screen.getByLabelText("Subdomain"), "acme");

    expect(screen.getByLabelText("Subdomain")).toHaveAccessibleDescription(
      "Only the first part: letters and numbers, starting with a letter. Staff will log in at acme.crm.example.com.",
    );
  });

  it("turns capitals into lowercase as they are typed", async () => {
    backendAnswering(() => Promise.resolve(jsonResponse(CREATED, 202)));
    render(<NewConsultancyForm />);

    await userEvent.type(screen.getByLabelText("Subdomain"), "AcmeEdu");

    expect(screen.getByLabelText("Subdomain")).toHaveValue("acmeedu");
  });

  it("still explains the address when the product domain can't be loaded", async () => {
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockRejectedValue(new TypeError("offline")));
    render(<NewConsultancyForm />);

    await userEvent.type(screen.getByLabelText("Subdomain"), "acme");

    expect(screen.getByLabelText("Subdomain")).toHaveAccessibleDescription(
      "Only the first part: letters and numbers, starting with a letter.",
    );
  });

  it("starts in Evaluation for 14 days unless the Platform Admin picks Active", () => {
    render(<NewConsultancyForm />);

    const choices = screen.getByRole("radiogroup", { name: "Starting status" });
    expect(screen.getByRole("radio", { name: "Evaluation (14 days)" })).toBeChecked();
    expect(choices).toBeInTheDocument();
    expect(screen.queryByLabelText("Paid until")).not.toBeInTheDocument();
  });

  it("can start the Consultancy Active, paid up to a date", async () => {
    const fetchFn = backendAnswering(() => Promise.resolve(jsonResponse(CREATED, 202)));
    render(<NewConsultancyForm />);

    await userEvent.click(screen.getByRole("radio", { name: "Active" }));
    await userEvent.type(screen.getByLabelText("Paid until"), "2099-12-31");
    await fillAndSubmit();

    const body = createCalls(fetchFn).at(-1)?.[1]?.body;
    const sent: unknown = typeof body === "string" ? JSON.parse(body) : null;
    expect(sent).toMatchObject({ status: "active", paid_until: "2099-12-31" });
  });

  it("shows a refused paid-until date under its field", async () => {
    backendAnswering(() =>
      Promise.resolve(jsonResponse({ paid_until: ["Choose a date after today."] }, 400)),
    );
    render(<NewConsultancyForm />);

    await userEvent.click(screen.getByRole("radio", { name: "Active" }));
    await userEvent.type(screen.getByLabelText("Paid until"), "2099-12-31");
    await fillAndSubmit();

    expect(await screen.findByLabelText("Paid until")).toHaveAccessibleDescription(
      "Choose a date after today.",
    );
  });

  it("shows each refused field's errors next to it", async () => {
    backendAnswering(() =>
      Promise.resolve(jsonResponse({ subdomain: ["This subdomain is already taken."] }, 400)),
    );
    render(<NewConsultancyForm />);

    await fillAndSubmit();

    expect(await screen.findByLabelText("Subdomain")).toHaveAccessibleDescription(
      "This subdomain is already taken.",
    );
    expect(screen.getByLabelText("Consultancy name")).not.toHaveAccessibleDescription();
    expect(router.push).not.toHaveBeenCalled();
  });

  it("asks for the office's contact email and says where replies go", () => {
    backendAnswering(() => Promise.resolve(jsonResponse(CREATED, 202)));
    render(<NewConsultancyForm />);

    const field = screen.getByLabelText("Contact email");
    expect(field).toHaveAttribute("type", "email");
    expect(field).toHaveAccessibleDescription("Where replies from Students and staff go.");
  });

  it.each([
    ["", "Enter the office's contact email."],
    ["   ", "Enter the office's contact email."],
    ["not an email", "Enter a real email address, like info@youroffice.com."],
    ["a@b.com, c@d.com", "Enter a real email address, like info@youroffice.com."],
    ["Acme <info@acme.com>", "Enter a real email address, like info@youroffice.com."],
  ])("refuses the contact email %j before sending", async (typed, message) => {
    const fetchFn = backendAnswering(() => Promise.resolve(jsonResponse(CREATED, 202)));
    const user = userEvent.setup();
    render(<NewConsultancyForm />);

    await user.type(screen.getByLabelText("Consultancy name"), "Acme Education");
    await user.type(screen.getByLabelText("Subdomain"), "acme");
    if (typed !== "") await user.type(screen.getByLabelText("Contact email"), typed);
    await user.click(screen.getByRole("button", { name: "Create Consultancy" }));

    const field = screen.getByLabelText("Contact email");
    expect(field).toHaveAccessibleDescription(message);
    expect(field).toHaveFocus();
    expect(createCalls(fetchFn)).toHaveLength(0);
    expect(router.push).not.toHaveBeenCalled();
  });

  it("sends the contact email trimmed", async () => {
    const fetchFn = backendAnswering(() => Promise.resolve(jsonResponse(CREATED, 202)));
    const user = userEvent.setup();
    render(<NewConsultancyForm />);

    await user.type(screen.getByLabelText("Consultancy name"), "Acme Education");
    await user.type(screen.getByLabelText("Subdomain"), "acme");
    await user.type(screen.getByLabelText("Contact email"), "  info@acme.com  ");
    await user.click(screen.getByRole("button", { name: "Create Consultancy" }));

    const body = createCalls(fetchFn).at(-1)?.[1]?.body;
    const sent: unknown = typeof body === "string" ? JSON.parse(body) : null;
    expect(sent).toMatchObject({ contact_email: "info@acme.com" });
  });

  it("shows a refused contact email under its field", async () => {
    backendAnswering(() =>
      Promise.resolve(jsonResponse({ contact_email: ["Enter a real email address."] }, 400)),
    );
    render(<NewConsultancyForm />);

    await fillAndSubmit();

    expect(await screen.findByLabelText("Contact email")).toHaveAccessibleDescription(
      "Enter a real email address.",
    );
    expect(router.push).not.toHaveBeenCalled();
  });

  it("shows a general error when the Consultancy can't be created", async () => {
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockRejectedValue(new TypeError("offline")));
    render(<NewConsultancyForm />);

    await fillAndSubmit();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "We couldn't create the Consultancy. Please try again.",
    );
    expect(screen.getByRole("button", { name: "Create Consultancy" })).toBeEnabled();
  });

  it("disables the button while creating", async () => {
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockReturnValue(new Promise(() => undefined)));
    render(<NewConsultancyForm />);

    await fillAndSubmit();

    expect(screen.getByRole("button", { name: "Creating…" })).toBeDisabled();
  });

  it("has no Colours part: every office shows the one theme (ticket 04)", async () => {
    const fetchFn = backendAnswering(() => Promise.resolve(jsonResponse(CREATED, 202)));
    render(<NewConsultancyForm />);

    expect(screen.queryByRole("heading", { name: "Colours" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Ready-made colours/)).not.toBeInTheDocument();
    expect(screen.queryByRole("img", { name: /Preview in/ })).not.toBeInTheDocument();

    await fillAndSubmit();

    const sent = createCalls(fetchFn).at(-1)?.[1]?.body;
    const body: unknown = JSON.parse(typeof sent === "string" ? sent : "null");
    expect(body).not.toHaveProperty("theme");
  });
});
