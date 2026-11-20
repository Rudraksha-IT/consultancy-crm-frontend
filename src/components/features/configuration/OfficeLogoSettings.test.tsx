import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";

import { SetOfficeLogoContext } from "@/components/features/shell/officeLogo";
import { StaffContextContext } from "@/components/features/shell/staffContext";
import { ToastProvider } from "@/components/ui/ToastProvider";
import type { OfficeLogo, StaffContext } from "@/lib/api";
import { DEFAULT_THEME } from "@/lib/theme";
import { backend, callsTo, on } from "@/test/backend";

import { OfficeLogoSettings } from "./OfficeLogoSettings";
import { consultancySummary } from "@/test/consultancy";

const LOGO_PATH = "/api/configuration/logo/";
const LOGO = { url: "/api/consultancy/logo/1/", showName: true };
const LOGO_ANSWER = { logo: { url: "/api/consultancy/logo/1/", show_name: true } };
const MB = 1024 * 1024;

const ADMIN: StaffContext = {
  staff: { id: 1, name: "Sita Sharma", email: "sita@acme.test", role: "admin" },
  consultancy: consultancySummary(),
  modules: ["configuration"],
  dateDisplay: "AD",
  colourMode: "light",
  supportAccess: null,
  theme: DEFAULT_THEME,
};

/** The section inside a shell whose logo really changes, as the AppShell's does. */
function Shell({ start, onSet }: { start: OfficeLogo | null; onSet: (logo: unknown) => void }) {
  const [logo, setLogo] = useState(start);
  return (
    <StaffContextContext value={{ ...ADMIN, consultancy: { ...consultancySummary(), logo } }}>
      <SetOfficeLogoContext
        value={(next) => {
          setLogo(next);
          onSet(next);
        }}
      >
        <ToastProvider>
          <OfficeLogoSettings />
        </ToastProvider>
      </SetOfficeLogoContext>
    </StaffContextContext>
  );
}

function renderSection(start: OfficeLogo | null = null) {
  const onSet = vi.fn<(logo: unknown) => void>();
  render(<Shell start={start} onSet={onSet} />);
  return { onSet, section: screen.getByRole("region", { name: "Office logo" }) };
}

function aFile(type = "image/png", bytes = 10, name = "logo.png"): File {
  return new File([new Uint8Array(bytes)], name, { type });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("OfficeLogoSettings", () => {
  it("explains the setting and previews the initials before any logo", () => {
    backend();
    const { section } = renderSection();

    expect(
      within(section).getByText(
        "Shown at the top of the menu and on receipts. A square or wide PNG, SVG or JPG works best.",
      ),
    ).toBeInTheDocument();
    const preview = within(section).getByTestId("logo-preview");
    expect(preview).toHaveTextContent("AE");
    expect(preview).toHaveTextContent("Acme Education");
    expect(within(section).getByLabelText("Upload a logo")).toHaveAttribute(
      "accept",
      "image/png,image/svg+xml,image/jpeg,image/webp",
    );
    expect(within(section).queryByRole("button", { name: "Remove" })).toBeNull();
    expect(within(section).queryByRole("checkbox")).toBeNull();
  });

  it("uploads a logo, shows it across the app at once and confirms", async () => {
    const fetchFn = backend(on("POST", LOGO_PATH, LOGO_ANSWER));
    const { onSet, section } = renderSection();
    const file = aFile();

    await userEvent.upload(within(section).getByLabelText("Upload a logo"), file);

    const [call] = callsTo(fetchFn, "POST", LOGO_PATH);
    const body = call?.[1]?.body;
    if (!(body instanceof FormData)) throw new Error("expected a form");
    expect(body.get("file")).toBe(file);
    expect(onSet).toHaveBeenCalledWith(LOGO);
    expect(await screen.findByText("Logo saved")).toBeInTheDocument();
    const preview = within(section).getByTestId("logo-preview");
    expect(preview.querySelector("img")).toHaveAttribute("src", "/api/consultancy/logo/1/");
    expect(within(section).getByLabelText("Change logo")).toBeInTheDocument();
    expect(within(section).getByRole("button", { name: "Remove" })).toBeInTheDocument();
    expect(
      within(section).getByRole("checkbox", { name: "Show the office name next to the logo" }),
    ).toBeChecked();
  });

  it("refuses a file over 1 MB without sending it", async () => {
    const fetchFn = backend();
    const { onSet, section } = renderSection();

    await userEvent.upload(
      within(section).getByLabelText("Upload a logo"),
      aFile("image/png", MB + 1),
    );

    expect(within(section).getByRole("alert")).toHaveTextContent(
      "That file is over 1 MB. Pick a smaller logo.",
    );
    expect(fetchFn).not.toHaveBeenCalled();
    expect(onSet).not.toHaveBeenCalled();
  });

  it("refuses a file that isn't a PNG, SVG, JPG or WebP without sending it", async () => {
    const fetchFn = backend();
    const { section } = renderSection();
    const user = userEvent.setup({ applyAccept: false });

    await user.upload(
      within(section).getByLabelText("Upload a logo"),
      aFile("application/pdf", 10, "x.pdf"),
    );

    expect(within(section).getByRole("alert")).toHaveTextContent(
      "Upload a PNG, SVG, JPG or WebP image.",
    );
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("shows the server's reason when it refuses the file", async () => {
    backend(on("POST", LOGO_PATH, { file: ["Upload a PNG, SVG, JPG or WebP image."] }, 400));
    const { onSet, section } = renderSection();

    await userEvent.upload(within(section).getByLabelText("Upload a logo"), aFile());

    expect(await within(section).findByRole("alert")).toHaveTextContent(
      "Upload a PNG, SVG, JPG or WebP image.",
    );
    expect(onSet).not.toHaveBeenCalled();
  });

  it("says so when the upload fails", async () => {
    backend(on("POST", LOGO_PATH, { detail: "The logo couldn't be saved. Try again." }, 503));
    const { section } = renderSection();

    await userEvent.upload(within(section).getByLabelText("Upload a logo"), aFile());

    expect(await within(section).findByRole("alert")).toHaveTextContent(
      "The logo couldn't be saved. Check your connection and try again.",
    );
  });

  it("removes the logo and returns to the initials", async () => {
    const fetchFn = backend((path, init) =>
      path === LOGO_PATH && init?.method === "DELETE"
        ? new Response(null, { status: 204 })
        : undefined,
    );
    const { onSet, section } = renderSection(LOGO);

    await userEvent.click(within(section).getByRole("button", { name: "Remove" }));
    const dialog = screen.getByRole("dialog", { name: "Remove the office logo?" });
    expect(dialog).toHaveTextContent(
      "The office name shows in its place. You can upload a logo again later.",
    );
    await userEvent.click(within(dialog).getByRole("button", { name: "Remove" }));

    await waitFor(() => {
      expect(callsTo(fetchFn, "DELETE", LOGO_PATH)).toHaveLength(1);
    });
    expect(onSet).toHaveBeenCalledWith(null);
    expect(await screen.findByText("Logo removed")).toBeInTheDocument();
    expect(within(section).getByTestId("logo-preview")).toHaveTextContent("AE");
    expect(within(section).getByLabelText("Upload a logo")).toBeInTheDocument();
  });

  it("removes nothing until the popup is confirmed", async () => {
    const fetchFn = backend();
    const { onSet, section } = renderSection(LOGO);

    await userEvent.click(within(section).getByRole("button", { name: "Remove" }));
    await userEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Cancel" }),
    );

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(fetchFn).not.toHaveBeenCalled();
    expect(onSet).not.toHaveBeenCalled();
  });

  it("says so when removing fails, keeping the logo", async () => {
    backend(on("DELETE", LOGO_PATH, { detail: "Forbidden." }, 403));
    const { onSet, section } = renderSection(LOGO);

    await userEvent.click(within(section).getByRole("button", { name: "Remove" }));
    const dialog = screen.getByRole("dialog", { name: "Remove the office logo?" });
    await userEvent.click(within(dialog).getByRole("button", { name: "Remove" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "The logo couldn't be removed. Check your connection and try again.",
    );
    expect(onSet).not.toHaveBeenCalled();
  });

  it("hides the office name beside the logo", async () => {
    const fetchFn = backend(
      on("PATCH", LOGO_PATH, { logo: { url: "/api/consultancy/logo/1/", show_name: false } }),
    );
    const { onSet, section } = renderSection(LOGO);

    await userEvent.click(
      within(section).getByRole("checkbox", { name: "Show the office name next to the logo" }),
    );

    expect(callsTo(fetchFn, "PATCH", LOGO_PATH)[0]?.[1]?.body).toBe(
      JSON.stringify({ show_name: false }),
    );
    expect(onSet).toHaveBeenCalledWith({ ...LOGO, showName: false });
    const preview = within(section).getByTestId("logo-preview");
    expect(preview).not.toHaveTextContent("Acme Education");
    expect(within(preview).getByRole("img", { name: "Acme Education" })).toBeInTheDocument();
    expect(
      within(section).getByRole("checkbox", { name: "Show the office name next to the logo" }),
    ).not.toBeChecked();
  });

  it("keeps the choice and says so when saving it fails", async () => {
    backend(on("PATCH", LOGO_PATH, { detail: "Forbidden." }, 403));
    const { onSet, section } = renderSection(LOGO);

    await userEvent.click(
      within(section).getByRole("checkbox", { name: "Show the office name next to the logo" }),
    );

    expect(await within(section).findByRole("alert")).toHaveTextContent(
      "The choice couldn't be saved. Check your connection and try again.",
    );
    expect(onSet).not.toHaveBeenCalled();
    expect(
      within(section).getByRole("checkbox", { name: "Show the office name next to the logo" }),
    ).toBeChecked();
  });
});
