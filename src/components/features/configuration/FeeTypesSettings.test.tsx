import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ToastProvider } from "@/components/ui/ToastProvider";
import { backend, callsTo, on, onEach } from "@/test/backend";

import { FeeTypesSettings } from "./FeeTypesSettings";

const LIST = "/api/fee-types/";
const UNUSED = { fees: 0, payments: 0 };
const VISA = {
  id: 3,
  name: "Visa fee",
  hidden: false,
  other: false,
  uses: { fees: 2, payments: 1 },
};
const PTE = { id: 5, name: "PTE class", hidden: false, other: false, uses: UNUSED };
const OTHER = { id: 7, name: "Other", hidden: false, other: true, uses: UNUSED };

function renderSection() {
  render(
    <ToastProvider>
      <FeeTypesSettings />
    </ToastProvider>,
  );
  return screen.getByRole("region", { name: "Fee Types" });
}

async function listIn(section: HTMLElement) {
  return within(await within(section).findByRole("list", { name: "Fee Types" }));
}

function sentBody(fetchFn: ReturnType<typeof backend>, verb: string, path: string): unknown {
  const body = callsTo(fetchFn, verb, path)[0]?.[1]?.body;
  return typeof body === "string" ? JSON.parse(body) : undefined;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("FeeTypesSettings", () => {
  it("lists each Fee Type with how much uses it, and Other with no changes but moving", async () => {
    backend(on("GET", LIST, { results: [VISA, PTE, OTHER] }));
    const list = await listIn(renderSection());

    expect(list.getByText("Used by 2 Fees and 1 Payment")).toBeVisible();
    expect(list.getAllByText("Not used yet")).toHaveLength(1);
    expect(list.getByText("Not used yet. Always there, and asks for a short note")).toBeVisible();
    expect(list.getByRole("button", { name: "Move Visa fee up" })).toBeDisabled();
    expect(list.getByRole("button", { name: "Move Other down" })).toBeDisabled();
    expect(list.getByRole("button", { name: "Move Other up" })).toBeEnabled();
    expect(list.queryByRole("button", { name: "Rename Other" })).toBeNull();
    expect(list.queryByRole("button", { name: "Hide Other" })).toBeNull();
    expect(list.queryByRole("button", { name: "Delete Other" })).toBeNull();
  });

  it("offers Delete only for a Fee Type nobody uses", async () => {
    backend(on("GET", LIST, { results: [VISA, PTE, OTHER] }));
    const list = await listIn(renderSection());

    expect(list.queryByRole("button", { name: "Delete Visa fee" })).toBeNull();
    expect(list.getByRole("button", { name: "Delete PTE class" })).toBeVisible();
  });

  it("shows a problem when the list can't be loaded", async () => {
    backend(on("GET", LIST, {}, 500));
    const section = renderSection();

    expect(
      await within(section).findByText("We couldn't load the Fee Types. Please refresh the page."),
    ).toBeVisible();
  });

  it("adds one and clears the form", async () => {
    let types = [VISA, OTHER];
    const added = { ...PTE, id: 9, name: "SOP writing" };
    const fetchFn = backend(
      onEach("GET", LIST, () => ({ results: types })),
      (path, init) => {
        if (init?.method !== "POST" || path !== LIST) return undefined;
        types = [VISA, added, OTHER];
        return new Response(JSON.stringify(added), { status: 201 });
      },
    );
    const section = renderSection();
    await listIn(section);

    const field = within(section).getByRole("textbox", { name: "Add a Fee Type" });
    await userEvent.type(field, "  SOP writing ");
    await userEvent.click(within(section).getByRole("button", { name: "Add" }));

    expect(await screen.findByText("SOP writing added")).toBeVisible();
    expect(sentBody(fetchFn, "POST", LIST)).toEqual({ name: "SOP writing" });
    expect(field).toHaveValue("");
    expect((await listIn(section)).getByText("SOP writing")).toBeVisible();
  });

  it("asks for a name before sending anything", async () => {
    const fetchFn = backend(on("GET", LIST, { results: [OTHER] }));
    const section = renderSection();
    await listIn(section);

    await userEvent.click(within(section).getByRole("button", { name: "Add" }));

    expect(within(section).getByText("Type the Fee Type's name.")).toBeVisible();
    expect(callsTo(fetchFn, "POST", LIST)).toHaveLength(0);
  });

  it("shows the server's refusal of a name and keeps what was typed", async () => {
    const message = "There is already a Fee Type with this name.";
    backend(
      on("GET", LIST, { results: [VISA, OTHER] }),
      on("POST", LIST, { name: [message] }, 400),
    );
    const section = renderSection();
    await listIn(section);

    const field = within(section).getByRole("textbox", { name: "Add a Fee Type" });
    await userEvent.type(field, "visa fee");
    await userEvent.click(within(section).getByRole("button", { name: "Add" }));

    expect(await within(section).findByText(message)).toBeVisible();
    expect(field).toHaveValue("visa fee");
  });

  it("shows a typed name as text, never as markup", async () => {
    const name = "<img src=x onerror=alert(1)>";
    backend(on("GET", LIST, { results: [{ ...PTE, name }, OTHER] }));
    const list = await listIn(renderSection());

    expect(list.getByText(name)).toBeVisible();
    expect(document.querySelector("img")).toBeNull();
  });

  it("hides one and shows it again", async () => {
    const fetchFn = backend(
      on("GET", LIST, { results: [VISA, OTHER] }),
      on("PATCH", "/api/fee-types/3/", { ...VISA, hidden: true }),
    );
    const list = await listIn(renderSection());

    await userEvent.click(list.getByRole("button", { name: "Hide Visa fee" }));

    expect(await screen.findByText("Visa fee is hidden. Old records keep it.")).toBeVisible();
    expect(sentBody(fetchFn, "PATCH", "/api/fee-types/3/")).toEqual({ hidden: true });
    expect(list.getByText("Hidden")).toBeVisible();
    expect(list.getByRole("button", { name: "Show Visa fee" })).toBeVisible();
  });

  it("renames one in a dialog", async () => {
    const fetchFn = backend(
      on("GET", LIST, { results: [VISA, OTHER] }),
      on("PATCH", "/api/fee-types/3/", { ...VISA, name: "Visa lodgement" }),
    );
    const list = await listIn(renderSection());

    await userEvent.click(list.getByRole("button", { name: "Rename Visa fee" }));
    const dialog = within(screen.getByRole("dialog", { name: "Rename Visa fee" }));
    const field = dialog.getByRole("textbox", { name: "Fee Type" });
    await userEvent.clear(field);
    await userEvent.type(field, "Visa lodgement");
    await userEvent.click(dialog.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Renamed to Visa lodgement")).toBeVisible();
    expect(sentBody(fetchFn, "PATCH", "/api/fee-types/3/")).toEqual({
      name: "Visa lodgement",
    });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(list.getByText("Visa lodgement")).toBeVisible();
  });

  it("asks before deleting, then deletes", async () => {
    backend(on("GET", LIST, { results: [PTE, OTHER] }), (path, init) =>
      init?.method === "DELETE" && path === "/api/fee-types/5/"
        ? new Response(null, { status: 204 })
        : undefined,
    );
    const list = await listIn(renderSection());

    await userEvent.click(list.getByRole("button", { name: "Delete PTE class" }));
    const dialog = within(screen.getByRole("dialog", { name: "Delete PTE class?" }));
    expect(dialog.getByText("No Fee or Payment uses it, so nothing else changes.")).toBeVisible();
    await userEvent.click(dialog.getByRole("button", { name: "Delete" }));

    expect(await screen.findByText("PTE class deleted")).toBeVisible();
    await waitFor(() => {
      expect(list.queryByText("PTE class")).toBeNull();
    });
  });

  it("keeps the dialog open with the server's reason when a delete is refused", async () => {
    const detail = "Fees or Payments use this Fee Type. Hide it instead.";
    backend(
      on("GET", LIST, { results: [PTE, OTHER] }),
      on("DELETE", "/api/fee-types/5/", { detail }, 400),
    );
    const list = await listIn(renderSection());

    await userEvent.click(list.getByRole("button", { name: "Delete PTE class" }));
    const dialog = within(screen.getByRole("dialog", { name: "Delete PTE class?" }));
    await userEvent.click(dialog.getByRole("button", { name: "Delete" }));

    expect(await dialog.findByText(detail)).toBeVisible();
  });

  it("moves one down and keeps the cursor on its arrow", async () => {
    const fetchFn = backend(
      on("GET", LIST, { results: [VISA, PTE, OTHER] }),
      on("PUT", "/api/fee-types/order/", { results: [PTE, VISA, OTHER] }),
    );
    const list = await listIn(renderSection());

    await userEvent.click(list.getByRole("button", { name: "Move Visa fee down" }));

    expect(sentBody(fetchFn, "PUT", "/api/fee-types/order/")).toEqual({
      order: [5, 3, 7],
    });
    await waitFor(() => {
      expect(list.getAllByRole("listitem").map((row) => row.textContent)).toEqual([
        expect.stringContaining("PTE class"),
        expect.stringContaining("Visa fee"),
        expect.stringContaining("Other"),
      ]);
    });
    await waitFor(() => {
      expect(list.getByRole("button", { name: "Move Visa fee down" })).toHaveFocus();
    });
  });

  it("puts the cursor on the other arrow when a move reaches the top", async () => {
    backend(
      on("GET", LIST, { results: [VISA, PTE, OTHER] }),
      on("PUT", "/api/fee-types/order/", { results: [PTE, VISA, OTHER] }),
    );
    const list = await listIn(renderSection());

    await userEvent.click(list.getByRole("button", { name: "Move PTE class up" }));

    await waitFor(() => {
      expect(list.getByRole("button", { name: "Move PTE class down" })).toHaveFocus();
    });
  });
});
