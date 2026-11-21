import { uid } from "@/test/ids";
import type { RecordId } from "@/lib/recordId";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ToastProvider } from "@/components/ui/ToastProvider";
import { ApiRequestError } from "@/lib/api";
import { backend, callsTo, on } from "@/test/backend";

import { DocumentPickerDialog } from "./DocumentPickerDialog";

const TYPES_PATH = "/api/documents/types/";
const TYPES = {
  results: [
    { id: uid(1), name: "Passport", needed_by_everyone: true, usual_group: "applying" },
    {
      id: uid(20),
      name: "Genuine Student statement",
      needed_by_everyone: false,
      usual_group: "applying",
    },
    { id: uid(21), name: "CV", needed_by_everyone: false, usual_group: "applying" },
  ],
};
const LEAD = "Every Student applying to Federation University will need these.";

function renderPicker(
  onSave = vi.fn<(ids: RecordId[]) => Promise<void>>().mockResolvedValue(undefined),
  initialIds: readonly RecordId[] = [uid(21)],
) {
  const onClose = vi.fn<() => void>();
  render(
    <ToastProvider>
      <DocumentPickerDialog
        title="Documents for Federation University"
        lead={LEAD}
        initialIds={initialIds}
        onClose={onClose}
        onSave={onSave}
      />
    </ToastProvider>,
  );
  return { onSave, onClose };
}

async function choices(): Promise<HTMLElement> {
  return screen.findByRole("group", { name: "Documents to ask for" });
}

function newName(): HTMLElement {
  return screen.getByRole("textbox", { name: "Something not on the list" });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("DocumentPickerDialog", () => {
  it("offers only the documents not every Student needs, ticking those already asked for", async () => {
    backend(on("GET", TYPES_PATH, TYPES));
    renderPicker();

    const group = await choices();
    expect(
      screen.getByRole("dialog", { name: "Documents for Federation University" }),
    ).toBeVisible();
    expect(screen.getByText(LEAD)).toBeInTheDocument();
    expect(within(group).queryByLabelText("Passport")).not.toBeInTheDocument();
    expect(within(group).getByLabelText("Genuine Student statement")).not.toBeChecked();
    expect(within(group).getByLabelText("CV")).toBeChecked();
  });

  it("saves the ticked documents", async () => {
    backend(on("GET", TYPES_PATH, TYPES));
    const { onSave } = renderPicker();

    await userEvent.click(within(await choices()).getByLabelText("Genuine Student statement"));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).toHaveBeenCalledWith([uid(20), uid(21)]);
  });

  it("adds a name not on the list, ticked, without closing", async () => {
    const fetchFn = backend(
      on("GET", TYPES_PATH, TYPES),
      on(
        "POST",
        TYPES_PATH,
        {
          id: uid(30),
          name: "Portfolio of work",
          needed_by_everyone: false,
          usual_group: "applying",
        },
        201,
      ),
    );
    const { onSave } = renderPicker();
    await choices();

    await userEvent.type(newName(), "  Portfolio of work ");
    await userEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(await within(await choices()).findByLabelText("Portfolio of work")).toBeChecked();
    expect(newName()).toHaveValue("");
    expect(newName()).toHaveFocus();
    expect(
      await screen.findByText("Portfolio of work added and ticked. Save to keep it."),
    ).toBeInTheDocument();
    expect(callsTo(fetchFn, "POST", TYPES_PATH)[0]?.[1]?.body).toBe(
      JSON.stringify({ name: "Portfolio of work" }),
    );
    expect(onSave).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave).toHaveBeenCalledWith([uid(21), uid(30)]);
  });

  it("adds with Enter too, without saving", async () => {
    backend(
      on("GET", TYPES_PATH, TYPES),
      on(
        "POST",
        TYPES_PATH,
        { id: uid(30), name: "Portfolio", needed_by_everyone: false, usual_group: "applying" },
        201,
      ),
    );
    const { onSave } = renderPicker();
    await choices();

    await userEvent.type(newName(), "Portfolio{Enter}");

    expect(await within(await choices()).findByLabelText("Portfolio")).toBeChecked();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("ticks a name already on the list (in any case) instead of adding it again", async () => {
    const fetchFn = backend(on("GET", TYPES_PATH, TYPES));
    renderPicker();
    await choices();

    await userEvent.type(newName(), "genuine  student STATEMENT{Enter}");

    expect(within(await choices()).getByLabelText("Genuine Student statement")).toBeChecked();
    expect(
      await screen.findByText("Genuine Student statement is already on the list, so it's ticked."),
    ).toBeInTheDocument();
    expect(newName()).toHaveValue("");
    expect(callsTo(fetchFn, "POST", TYPES_PATH)).toHaveLength(0);
  });

  it("says when every Student already needs that document", async () => {
    const fetchFn = backend(on("GET", TYPES_PATH, TYPES));
    renderPicker();
    await choices();

    await userEvent.type(newName(), "passport{Enter}");

    expect(newName()).toHaveAccessibleDescription("Passport is already needed by every Student.");
    expect(callsTo(fetchFn, "POST", TYPES_PATH)).toHaveLength(0);
  });

  it("asks for a name before adding anything", async () => {
    const fetchFn = backend(on("GET", TYPES_PATH, TYPES));
    renderPicker();
    await choices();

    await userEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(newName()).toHaveAccessibleDescription("Type the document's name first.");
    expect(newName()).toHaveAttribute("maxlength", "80");
    expect(callsTo(fetchFn, "POST", TYPES_PATH)).toHaveLength(0);
  });

  it("shows the server's refusal of a name under the field", async () => {
    const message = "There is already a document with this name.";
    backend(on("GET", TYPES_PATH, TYPES), on("POST", TYPES_PATH, { name: [message] }, 400));
    renderPicker();
    await choices();

    await userEvent.type(newName(), "Police report{Enter}");

    await waitFor(() => {
      expect(newName()).toHaveAccessibleDescription(message);
    });
  });

  it("says when another failure stops the add", async () => {
    backend(on("GET", TYPES_PATH, TYPES), on("POST", TYPES_PATH, {}, 500));
    renderPicker();
    await choices();

    await userEvent.type(newName(), "Police report{Enter}");

    await waitFor(() => {
      expect(newName()).toHaveAccessibleDescription("We couldn't save that. Try again.");
    });
  });

  it("shows why a save was refused and stays open", async () => {
    backend(on("GET", TYPES_PATH, TYPES));
    const reason = "A file is already uploaded for CV, so it stays on the checklist.";
    const refused = new ApiRequestError("/x", 400, { document_types: [reason] });
    const { onClose } = renderPicker(
      vi.fn<(ids: RecordId[]) => Promise<void>>().mockRejectedValue(refused),
    );

    await userEvent.click(within(await choices()).getByLabelText("CV"));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText(reason)).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("says when the list can't be loaded", async () => {
    backend(on("GET", TYPES_PATH, {}, 500));
    renderPicker();

    expect(
      await screen.findByText("We couldn't load the documents. Refresh the page to try again."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("says when there is nothing to pick yet", async () => {
    backend(on("GET", TYPES_PATH, { results: [TYPES.results[0]] }));
    renderPicker(undefined, []);

    expect(await screen.findByText("No other documents yet. Add one below.")).toBeInTheDocument();
  });

  it("closes with Escape", async () => {
    backend(on("GET", TYPES_PATH, TYPES));
    const { onClose } = renderPicker();
    await choices();

    await userEvent.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalled();
  });

  it("shows injection-shaped names as text", async () => {
    const name = "<img src=x onerror=alert(1)>";
    backend(
      on("GET", TYPES_PATH, {
        results: [{ id: uid(40), name, needed_by_everyone: false, usual_group: "applying" }],
      }),
    );
    renderPicker(undefined, []);

    expect(within(await choices()).getByLabelText(name)).toBeInTheDocument();
    expect(document.querySelector("img")).toBeNull();
  });
});
