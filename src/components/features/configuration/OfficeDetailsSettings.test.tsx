import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";

import { SetOfficeDetailsContext } from "@/components/features/shell/officeDetails";
import { StaffContextContext } from "@/components/features/shell/staffContext";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { PHONE_QUERY } from "@/components/ui/usePhoneWidth";
import { NO_OFFICE_DETAILS, type OfficeDetails, type StaffContext } from "@/lib/api";
import { DEFAULT_THEME } from "@/lib/theme";
import { backend, callsTo, on } from "@/test/backend";
import { consultancySummary } from "@/test/consultancy";
import { fakeMatchMedia } from "@/test/matchMedia";
import { applyThemeCase, resetTheme, THEME_CASES } from "@/test/themes";

import { OfficeDetailsSettings } from "./OfficeDetailsSettings";

const PATH = "/api/configuration/office-details/";
const SAVED_API = {
  contact_email: "info@acme.com",
  phone: "01-4412345",
  address_line1: "Putalisadak, Kathmandu",
  address_line2: "Second floor",
  website: "https://acme.com",
};
const SAVED: OfficeDetails = {
  contactEmail: "info@acme.com",
  phone: "01-4412345",
  addressLine1: "Putalisadak, Kathmandu",
  addressLine2: "Second floor",
  website: "https://acme.com",
};

const ADMIN: StaffContext = {
  staff: { id: 1, name: "Sita Sharma", email: "sita@acme.test", role: "admin" },
  consultancy: consultancySummary(),
  modules: ["configuration"],
  dateDisplay: "AD",
  colourMode: "device",
  supportAccess: null,
  theme: DEFAULT_THEME,
};

/** The section inside a shell whose details really change, as the AppShell's do. */
function Shell({ start, onSet }: { start: OfficeDetails; onSet: (saved: unknown) => void }) {
  const [office, setOffice] = useState({ officeDetails: start, hasContactEmail: false });
  return (
    <StaffContextContext value={{ ...ADMIN, consultancy: { ...consultancySummary(), ...office } }}>
      <SetOfficeDetailsContext
        value={(next) => {
          setOffice(next);
          onSet(next);
        }}
      >
        <ToastProvider>
          <OfficeDetailsSettings />
        </ToastProvider>
      </SetOfficeDetailsContext>
    </StaffContextContext>
  );
}

function renderSection(start: OfficeDetails = NO_OFFICE_DETAILS) {
  const onSet = vi.fn<(saved: unknown) => void>();
  render(<Shell start={start} onSet={onSet} />);
  const section = screen.getByRole("region", { name: "Office details" });
  return { onSet, section, form: within(section) };
}

async function fillIn(values: Partial<Record<string, string>>): Promise<void> {
  const user = userEvent.setup();
  for (const [label, value] of Object.entries(values)) {
    const input = screen.getByLabelText(new RegExp(`^${label}`));
    await user.clear(input);
    if (value !== undefined && value !== "") await user.type(input, value);
  }
}

function saveButton(): HTMLElement {
  return screen.getByRole("button", { name: "Save office details" });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("OfficeDetailsSettings", () => {
  it("explains where the details go and shows every field, with the contact email first", () => {
    backend();
    const { form } = renderSection();

    expect(
      form.getByText(
        "Printed at the bottom of every email from the office. A Student who presses Reply reaches the contact email.",
      ),
    ).toBeInTheDocument();
    expect(form.getByLabelText("Contact email")).toHaveAccessibleDescription(
      "Needed before anyone can email a Student. Replies go here.",
    );
    expect(form.getByLabelText("Phone (optional)")).toHaveAttribute("type", "tel");
    expect(form.getByLabelText("Website (optional)")).toHaveAccessibleDescription(
      "Starts with https:// or http://",
    );
    expect(form.getByLabelText("Address (optional)")).toBeInTheDocument();
    expect(form.getByLabelText("Address, second line (optional)")).toBeInTheDocument();
  });

  it("starts from the saved details and previews the email footer as they are typed", async () => {
    backend();
    const { form } = renderSection(SAVED);
    const preview = form.getByTestId("footer-preview");

    expect(form.getByLabelText("Contact email")).toHaveValue("info@acme.com");
    expect(preview).toHaveTextContent("At the bottom of every email");
    expect(preview).toHaveTextContent("Acme Education");
    expect(preview).toHaveTextContent("Phone 01-4412345");
    expect(preview).toHaveTextContent("To answer, write to info@acme.com.");

    await fillIn({ Phone: "" });

    expect(preview).not.toHaveTextContent("Phone");
  });

  it("leaves empty details out of the footer and says replies can't be received", () => {
    backend();
    const { form } = renderSection();
    const preview = form.getByTestId("footer-preview");

    expect(preview).toHaveTextContent(
      "Acme EducationThis email comes from an address that can't receive replies.",
    );
    expect(preview).not.toHaveTextContent("To answer");
  });

  it("shows typed markup as words in the footer, never as markup", async () => {
    backend();
    const { form } = renderSection();

    await fillIn({ "Address \\(": "<b>Tower</b>" });

    const preview = form.getByTestId("footer-preview");
    expect(preview).toHaveTextContent("<b>Tower</b>");
    expect(preview.querySelector("b b")).toBeNull();
  });

  it("saves the tidied details, shows them across the app and keeps focus on Save", async () => {
    const fetchFn = backend(
      on("PUT", PATH, { office_details: SAVED_API, has_contact_email: true }),
    );
    const { onSet } = renderSection();

    await fillIn({
      "Contact email": " info@acme.com ",
      Phone: "01-4412345",
      Website: "https://acme.com",
      "Address \\(": "Putalisadak,   Kathmandu",
      "Address,": "Second floor",
    });
    await userEvent.setup().click(saveButton());

    expect(await screen.findByText("Office details saved")).toBeInTheDocument();
    const body = callsTo(fetchFn, "PUT", PATH)[0]?.[1]?.body;
    expect(JSON.parse(typeof body === "string" ? body : "")).toEqual(SAVED_API);
    expect(onSet).toHaveBeenCalledWith({ officeDetails: SAVED, hasContactEmail: true });
    expect(saveButton()).toHaveFocus();
  });

  it("says emails to Students stay off when saved without a contact email", async () => {
    backend(
      on("PUT", PATH, {
        office_details: { ...SAVED_API, contact_email: "" },
        has_contact_email: false,
      }),
    );
    renderSection(SAVED);

    await fillIn({ "Contact email": "" });
    await userEvent.setup().click(saveButton());

    expect(
      await screen.findByText("Saved. Emails to Students stay off until you add a contact email."),
    ).toBeInTheDocument();
  });

  it("refuses wrong details before sending, naming each one, and focuses the first", async () => {
    const fetchFn = backend();
    renderSection();

    await fillIn({ "Contact email": "info@acme", Phone: "call me", Website: "acme.com" });
    await userEvent.setup().click(saveButton());

    expect(screen.getByLabelText("Contact email")).toHaveAccessibleDescription(
      "Enter a real email address, like info@youroffice.com.",
    );
    expect(screen.getByLabelText("Phone (optional)")).toHaveAccessibleDescription(
      "A phone number can have digits, spaces, + ( ) and -.",
    );
    expect(screen.getByLabelText("Website (optional)")).toHaveAccessibleDescription(
      "The website must start with https:// or http://.",
    );
    expect(screen.getByLabelText("Contact email")).toHaveFocus();
    expect(callsTo(fetchFn, "PUT", PATH)).toHaveLength(0);
  });

  it("shows the server's words when it refuses a field", async () => {
    backend(
      on("PUT", PATH, { website: ["The website must start with https:// or http://."] }, 400),
    );
    renderSection();

    await fillIn({ Website: "https://acme.com" });
    await userEvent.setup().click(saveButton());

    const website = screen.getByLabelText("Website (optional)");
    await screen.findByText("The website must start with https:// or http://.");
    expect(website).toHaveAccessibleDescription("The website must start with https:// or http://.");
    expect(website).toHaveFocus();
  });

  it("says so when saving fails, and keeps what was typed", async () => {
    backend(on("PUT", PATH, {}, 500));
    renderSection();

    await fillIn({ "Contact email": "info@acme.com" });
    await userEvent.setup().click(saveButton());

    expect(
      await screen.findByText(
        "The office details couldn't be saved. Check your connection and try again.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Contact email")).toHaveValue("info@acme.com");
  });

  it("ignores a saved answer the server didn't send in the right shape", async () => {
    backend(on("PUT", PATH, { office_details: { contact_email: 7 } }));
    const { onSet } = renderSection();

    await fillIn({ "Contact email": "info@acme.com" });
    await userEvent.setup().click(saveButton());

    expect(
      await screen.findByText(
        "The office details couldn't be saved. Check your connection and try again.",
      ),
    ).toBeInTheDocument();
    expect(onSet).not.toHaveBeenCalled();
  });

  it("works on a phone-width screen", () => {
    vi.stubGlobal(
      "matchMedia",
      fakeMatchMedia(
        () => false,
        (query) => query === PHONE_QUERY,
      ).matchMedia,
    );
    backend();
    const { form } = renderSection(SAVED);

    expect(form.getByLabelText("Contact email")).toBeVisible();
    expect(saveButton()).toBeVisible();
  });
});

describe.each(THEME_CASES)("OfficeDetailsSettings in the $name Theme", ({ config, mode }) => {
  beforeEach(() => {
    applyThemeCase(config, mode);
  });
  afterEach(resetTheme);

  it("shows the fields, the footer and Save", () => {
    backend();
    const { form } = renderSection(SAVED);

    expect(form.getByLabelText("Contact email")).toHaveValue("info@acme.com");
    expect(form.getByTestId("footer-preview")).toHaveTextContent("Putalisadak, Kathmandu");
    expect(saveButton()).toBeEnabled();
  });
});
