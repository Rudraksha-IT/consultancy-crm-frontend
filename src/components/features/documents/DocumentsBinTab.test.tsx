import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { StaffContextContext } from "@/components/features/shell/staffContext";
import { ToastProvider } from "@/components/ui/ToastProvider";
import type { StaffContext } from "@/lib/api";
import { jsonResponse } from "@/lib/api/test-helpers";
import type { BlankTab } from "@/lib/documents";
import { DEFAULT_THEME } from "@/lib/theme";
import { backend, callsTo, on, onEach } from "@/test/backend";
import { consultancySummary } from "@/test/consultancy";
import { CHECKLIST } from "@/test/documents";

import { DocumentsPage } from "./DocumentsPage";

const { openBlankTab } = vi.hoisted(() => ({ openBlankTab: vi.fn<() => BlankTab | null>() }));
vi.mock("@/lib/documents/tab", () => ({ openBlankTab }));
vi.mock("@/hooks/useFullPageNavigation", () => ({ useFullPageNavigation: () => vi.fn() }));

function contextFor(role: StaffContext["staff"]["role"]): StaffContext {
  return {
    staff: { id: 1, name: "Anita Rai", email: "admin@office.com", role },
    consultancy: consultancySummary(),
    modules: ["documents"],
    dateDisplay: "AD",
    colourMode: "device",
    supportAccess: null,
    theme: DEFAULT_THEME,
  };
}

const BIN_PATH = "/api/documents/bin/?page=1";
const NOTE = {
  by: { id: 5, name: "Bikash Thapa" },
  at: "2026-11-02T10:00:00+05:45",
  reason: "Uploaded twice",
};
const WHOLE = {
  kind: "document",
  document: { id: 31, name: "Passport" },
  student: { id: 7, name: "Sita Gurung" },
  files: [
    { id: 41, file_name: "passport.pdf" },
    { id: 42, file_name: "back.pdf" },
  ],
  ...NOTE,
};
const ONE_FILE = {
  kind: "file",
  document: { id: 33, name: "Bank Statement" },
  student: { id: 8, name: "Ram Thapa" },
  files: [{ id: 50, file_name: "page-3.jpg" }],
  ...NOTE,
  reason: "<b>Blurry</b>",
};
const BIN = { count: 2, page: 1, page_size: 25, results: [WHOLE, ONE_FILE] };
const EMPTY = { count: 0, page: 1, page_size: 25, results: [] };
const PAPERWORK = {
  count: 0,
  page: 1,
  page_size: 25,
  totals: { rejected: 0, waiting: 0, missing: 0, verified: 0 },
  results: [],
};

function renderPage(role: StaffContext["staff"]["role"], initialTab: "students" | "bin" = "bin") {
  render(
    <StaffContextContext value={contextFor(role)}>
      <ToastProvider>
        <DocumentsPage initialTab={initialTab} />
      </ToastProvider>
    </StaffContextContext>,
  );
}

async function itemFor(name: string): Promise<HTMLElement> {
  const list = await screen.findByRole("list", { name: "Bin" });
  const found = within(list)
    .getAllByRole("listitem")
    .find((li) => li.textContent.includes(name) && li.parentElement === list);
  if (found === undefined) throw new Error(`No item for ${name}`);
  return found;
}

afterEach(() => {
  vi.unstubAllGlobals();
  openBlankTab.mockReset();
});

describe("the Bin tab (Admins, issue 79)", () => {
  it("lists each item with its Student, files, who, when and why", async () => {
    backend(
      on("GET", BIN_PATH, BIN),
      on("GET", "/api/documents/students/?scope=everyone&page=1", PAPERWORK),
    );
    renderPage("admin");

    expect(screen.getByRole("button", { name: /^Bin/ })).toHaveAttribute("aria-pressed", "true");
    const whole = await itemFor("Passport");
    expect(whole).toHaveTextContent("Sita Gurung");
    expect(whole).toHaveTextContent("Bikash Thapa, 2 Nov 2026");
    expect(whole).toHaveTextContent("Why: Uploaded twice");
    expect(within(whole).getByRole("button", { name: "Open passport.pdf" })).toBeVisible();
    expect(within(whole).getByRole("button", { name: "Open back.pdf" })).toBeVisible();
    expect(within(whole).getByRole("link", { name: "Sita Gurung" })).toHaveAttribute(
      "href",
      "/students/7",
    );
    const file = await itemFor("page-3.jpg");
    expect(file).toHaveTextContent("one file of Bank Statement");
    expect(file).toHaveTextContent("Why: <b>Blurry</b>");
    expect(file.querySelector("b")).toBeNull();
  });

  it("opens a file through the Bin's own link", async () => {
    const tab = { opener: {}, location: { replace: vi.fn() }, close: vi.fn() };
    openBlankTab.mockReturnValue(tab);
    const fetchFn = backend(
      on("GET", BIN_PATH, BIN),
      on("GET", "/api/documents/bin/files/41/link/?action=open", {
        url: "https://files.test/k?sig=1",
        expires_in: 300,
      }),
    );
    renderPage("admin");

    await userEvent.click(
      within(await itemFor("Passport")).getByRole("button", { name: "Open passport.pdf" }),
    );

    expect(callsTo(fetchFn, "GET", "/api/documents/bin/files/41/link/?action=open")).toHaveLength(
      1,
    );
    expect(tab.location.replace).toHaveBeenCalledWith("https://files.test/k?sig=1");
  });

  it("restores an item and says so", async () => {
    let restored = false;
    const fetchFn = backend(
      onEach("GET", BIN_PATH, () => (restored ? { ...BIN, count: 1, results: [ONE_FILE] } : BIN)),
      (path, init) => {
        if (init?.method !== "POST" || path !== "/api/students/7/documents/31/restore/")
          return undefined;
        restored = true;
        return jsonResponse(CHECKLIST);
      },
    );
    renderPage("admin");

    await userEvent.click(
      within(await itemFor("Passport")).getByRole("button", { name: "Restore Passport" }),
    );

    expect(callsTo(fetchFn, "POST", "/api/students/7/documents/31/restore/")).toHaveLength(1);
    expect(await screen.findByText("Passport restored")).toBeVisible();
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Restore Passport" })).toBeNull();
    });
    expect(screen.getByRole("button", { name: "Restore page-3.jpg" })).toBeVisible();
  });

  it("deletes one file for good after asking", async () => {
    const fetchFn = backend(
      on("GET", BIN_PATH, BIN),
      on("DELETE", "/api/students/8/documents/33/files/50/", CHECKLIST),
    );
    renderPage("admin");

    await userEvent.click(
      within(await itemFor("page-3.jpg")).getByRole("button", {
        name: "Delete page-3.jpg for good",
      }),
    );
    const dialog = screen.getByRole("dialog", { name: "Delete page-3.jpg for good?" });
    expect(dialog).toHaveTextContent("The file is removed from storage. This can't be undone.");
    expect(within(dialog).getByRole("button", { name: "Cancel" })).toHaveFocus();
    await userEvent.click(within(dialog).getByRole("button", { name: "Delete for good" }));

    expect(callsTo(fetchFn, "DELETE", "/api/students/8/documents/33/files/50/")).toHaveLength(1);
    expect(await screen.findByText("page-3.jpg deleted for good")).toBeVisible();
  });

  it("sends nothing when the delete is cancelled", async () => {
    const fetchFn = backend(on("GET", BIN_PATH, BIN));
    renderPage("admin");

    await userEvent.click(
      within(await itemFor("Passport")).getByRole("button", { name: "Delete Passport for good" }),
    );
    await userEvent.keyboard("{Escape}");

    expect(fetchFn.mock.calls.filter(([, init]) => init?.method === "DELETE")).toHaveLength(0);
  });

  it("says when the Bin is empty", async () => {
    backend(on("GET", BIN_PATH, EMPTY));
    renderPage("admin");

    expect(await screen.findByText("The Bin is empty.")).toBeVisible();
  });

  it("says when the Bin can't be loaded", async () => {
    backend(on("GET", BIN_PATH, { detail: "x" }, 500));
    renderPage("admin");

    expect(
      await screen.findByText("We couldn't load the Bin. Refresh the page to try again."),
    ).toBeVisible();
  });

  it("switches between Students and the Bin, with how many wait in it", async () => {
    backend(
      on("GET", BIN_PATH, BIN),
      on("GET", "/api/documents/students/?scope=everyone&page=1", PAPERWORK),
    );
    renderPage("admin", "students");

    const binTab = await screen.findByRole("button", { name: "Bin, 2" });
    await userEvent.click(binTab);

    expect(await itemFor("Passport")).toBeVisible();
  });

  it("is never shown to a Counsellor", async () => {
    const fetchFn = backend(on("GET", "/api/documents/students/?scope=mine&page=1", PAPERWORK));
    renderPage("counsellor");

    expect(await screen.findByText("No Students here yet.")).toBeVisible();
    expect(screen.queryByRole("button", { name: /^Bin/ })).toBeNull();
    expect(callsTo(fetchFn, "GET", BIN_PATH)).toHaveLength(0);
  });
});
