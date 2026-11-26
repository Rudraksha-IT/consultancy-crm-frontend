import type { RecordId } from "@/lib/recordId";
import { uid } from "@/test/ids";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ToastProvider } from "@/components/ui/ToastProvider";
import { InvalidFieldsError, type Employee } from "@/lib/api";
import { applyThemeCase, resetTheme, THEME_CASES } from "@/test/themes";

import { PlatformAdminActions } from "./PlatformAdminActions";

const ADMIN: Employee = {
  id: uid(4),
  name: "Sita Sharma",
  email: "sita@acme.test",
  mobile: "9812345670",
  jobTitle: "Director",
  role: "admin",
  joinedOn: "2026-01-01",
  status: "active",
  invitedBack: false,
  twoFactorRequired: false,
  twoFactorSetUp: false,
};

function renderActions(
  sendCode = vi.fn<(id: RecordId) => Promise<void>>().mockResolvedValue(),
  signOut = vi.fn<(id: RecordId) => Promise<void>>().mockResolvedValue(),
) {
  render(
    <ToastProvider>
      <PlatformAdminActions employee={ADMIN} sendCode={sendCode} signOut={signOut} />
    </ToastProvider>,
  );
  return { sendCode, signOut };
}

describe.each(THEME_CASES)("PlatformAdminActions in the $name Theme", ({ mode }) => {
  beforeEach(() => {
    applyThemeCase(mode);
  });

  afterEach(() => {
    resetTheme();
  });

  it("sends an Admin a password reset code", async () => {
    const { sendCode } = renderActions();

    expect(screen.getByText("Platform Admin only")).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Send a password reset code" }));

    expect(sendCode).toHaveBeenCalledWith(uid(4));
    expect(await screen.findByText("Reset code sent to sita@acme.test")).toBeInTheDocument();
  });

  it("signs an Admin out of every device", async () => {
    const { signOut } = renderActions();

    await userEvent.click(screen.getByRole("button", { name: "Sign out of every device" }));

    expect(signOut).toHaveBeenCalledWith(uid(4));
    expect(await screen.findByText("Sita Sharma is signed out everywhere")).toBeInTheDocument();
  });
});

describe("PlatformAdminActions", () => {
  it("says why a code wasn't sent", async () => {
    renderActions(
      vi
        .fn<(id: RecordId) => Promise<void>>()
        .mockRejectedValue(new InvalidFieldsError({ detail: ["Too many codes were sent."] })),
    );

    await userEvent.click(screen.getByRole("button", { name: "Send a password reset code" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Too many codes were sent.");
  });

  it("asks to try again when signing out fails", async () => {
    renderActions(
      undefined,
      vi.fn<(id: RecordId) => Promise<void>>().mockRejectedValue(new Error()),
    );

    await userEvent.click(screen.getByRole("button", { name: "Sign out of every device" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("That didn't work. Try again.");
    expect(screen.getByRole("button", { name: "Sign out of every device" })).toBeEnabled();
  });
});
