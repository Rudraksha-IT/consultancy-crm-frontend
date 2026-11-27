import { uid } from "@/test/ids";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { jsonResponse } from "@/lib/api/core/test-helpers";
import type { StartedVisit } from "@/lib/api";
import { applyThemeCase, resetTheme, THEME_CASES } from "@/test/themes";

import { OpenOfficeDialog } from "./OpenOfficeDialog";
import { testHost } from "@/test/hosts";

const OFFICE = { id: uid(3), name: "Acme Education" };
const CODE = "Xy_9-abcdefghijklmnopqrstuvwxyz0123456789AB";
const STARTED = {
  visit: {
    id: uid(7),
    platform_admin: { name: "Ramesh" },
    consultancy: OFFICE,
    reason: "Fees",
    consultancy_status: "active",
    started_at: "2026-11-04T05:00:00+00:00",
    ended_at: null,
  },
  host: testHost("acme"),
  entry_code: CODE,
};

function answer(response: Response): typeof fetch {
  const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(response);
  vi.stubGlobal("fetch", fetchFn);
  return fetchFn;
}

function renderDialog() {
  const onClose = vi.fn<() => void>();
  const onOpened = vi.fn<(started: StartedVisit) => void>();
  render(<OpenOfficeDialog office={OFFICE} onClose={onClose} onOpened={onOpened} />);
  return { onClose, onOpened };
}

describe.each(THEME_CASES)("OpenOfficeDialog in the $name Theme", ({ mode }) => {
  beforeEach(() => {
    applyThemeCase(mode);
  });

  afterEach(() => {
    resetTheme();
  });

  it("says what opening the office means and asks why", () => {
    renderDialog();

    expect(
      screen.getByRole("dialog", { name: "Open Acme Education as Platform Admin" }),
    ).toBeVisible();
    expect(screen.getByText(/not through anyone's account/)).toBeVisible();
    expect(screen.getByRole("textbox", { name: "Why are you opening it?" })).toHaveFocus();
    expect(screen.getByText("Kept in the platform's visit log.")).toBeVisible();
  });

  it("opens the office with the reason", async () => {
    const fetchFn = answer(jsonResponse(STARTED, 201));
    const { onOpened } = renderDialog();

    await userEvent.type(screen.getByRole("textbox"), "  Admin asked for help with fees ");
    await userEvent.click(screen.getByRole("button", { name: "Open as Platform Admin" }));

    expect(onOpened).toHaveBeenCalledWith(
      expect.objectContaining({ host: testHost("acme"), entryCode: CODE }),
    );
    const init = vi.mocked(fetchFn).mock.calls[0]?.[1];
    expect(init?.body).toBe(JSON.stringify({ reason: "Admin asked for help with fees" }));
  });
});

describe("OpenOfficeDialog", () => {
  it("needs a reason before sending anything", async () => {
    const fetchFn = answer(jsonResponse(STARTED, 201));
    renderDialog();

    await userEvent.type(screen.getByRole("textbox"), "   ");
    await userEvent.click(screen.getByRole("button", { name: "Open as Platform Admin" }));

    expect(screen.getByText("Say why you're opening this office.")).toBeVisible();
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("shows the server's refusal of the reason under the field", async () => {
    answer(jsonResponse({ reason: ["Ensure this field has no more than 500 characters."] }, 400));
    const { onOpened } = renderDialog();

    await userEvent.type(screen.getByRole("textbox"), "Long");
    await userEvent.click(screen.getByRole("button", { name: "Open as Platform Admin" }));

    expect(
      await screen.findByText("Ensure this field has no more than 500 characters."),
    ).toBeVisible();
    expect(onOpened).not.toHaveBeenCalled();
  });

  it("says why the office can't be opened", async () => {
    answer(jsonResponse({ detail: "This office's account has been closed." }, 400));
    renderDialog();

    await userEvent.type(screen.getByRole("textbox"), "Help");
    await userEvent.click(screen.getByRole("button", { name: "Open as Platform Admin" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This office's account has been closed.",
    );
  });

  it("asks to try again when the call fails", async () => {
    answer(jsonResponse({}, 500));
    renderDialog();

    await userEvent.type(screen.getByRole("textbox"), "Help");
    await userEvent.click(screen.getByRole("button", { name: "Open as Platform Admin" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "That office couldn't be opened. Try again.",
    );
    expect(screen.getByRole("button", { name: "Open as Platform Admin" })).toBeEnabled();
  });

  it("closes with Escape and with Cancel", async () => {
    const { onClose } = renderDialog();

    await userEvent.keyboard("{Escape}");
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
