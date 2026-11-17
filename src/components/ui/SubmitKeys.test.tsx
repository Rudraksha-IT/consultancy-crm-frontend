import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Button } from "./Button";
import { SubmitKeysHint, SubmitKeysScope } from "./SubmitKeys";
import { TextAreaField } from "./TextAreaField";

type FormProps = {
  onSubmit: () => void;
  onEscape?: () => void;
  isSaving?: boolean;
  /** The Save button sits outside the form, as in a Dialog's footer. */
  isButtonOutside?: boolean;
};

function NoteForm({ onSubmit, onEscape, isSaving = false, isButtonOutside = false }: FormProps) {
  const save = <SaveButton isSaving={isSaving} />;
  return (
    <SubmitKeysScope>
      <form
        id="note-form"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <NoteBox onEscape={onEscape} />
        {!isButtonOutside && save}
      </form>
      {isButtonOutside && save}
      <SubmitKeysHint action="save" canEscape={onEscape !== undefined} />
    </SubmitKeysScope>
  );
}

function SaveButton({ isSaving }: { isSaving: boolean }) {
  return (
    <Button type="submit" form="note-form" variant="primary" isLoading={isSaving}>
      Save note
    </Button>
  );
}

function NoteBox({ onEscape }: { onEscape: (() => void) | undefined }) {
  const escape = onEscape === undefined ? {} : { onEscape };
  return (
    <TextAreaField label="Note" name="note" hint="Shown to everyone." isOptional {...escape} />
  );
}

function box(): HTMLElement {
  return screen.getByRole("textbox", { name: "Note (optional)" });
}

describe("Ctrl + Enter in a box of several lines", () => {
  it("saves the form on Ctrl + Enter", async () => {
    const onSubmit = vi.fn();
    render(<NoteForm onSubmit={onSubmit} />);

    await userEvent.type(box(), "Called about IELTS{Control>}{Enter}{/Control}");

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(box()).toHaveValue("Called about IELTS");
  });

  it("saves the form on ⌘ + Enter", async () => {
    const onSubmit = vi.fn();
    render(<NoteForm onSubmit={onSubmit} />);

    await userEvent.type(box(), "Hi{Meta>}{Enter}{/Meta}");

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("makes a new line on Enter and doesn't save", async () => {
    const onSubmit = vi.fn();
    render(<NoteForm onSubmit={onSubmit} />);

    await userEvent.type(box(), "First{Enter}Second");

    expect(box()).toHaveValue("First\nSecond");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("never saves while typing in another language", () => {
    const onSubmit = vi.fn();
    render(<NoteForm onSubmit={onSubmit} />);

    fireEvent.keyDown(box(), { key: "Enter", ctrlKey: true, isComposing: true });

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("presses a Save button outside the form, as in a dialog's footer", async () => {
    const onSubmit = vi.fn();
    render(<NoteForm onSubmit={onSubmit} isButtonOutside />);

    await userEvent.type(box(), "Hi{Control>}{Enter}{/Control}");

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("doesn't save again while the form is saving", async () => {
    const onSubmit = vi.fn();
    render(<NoteForm onSubmit={onSubmit} isSaving />);

    await userEvent.type(box(), "Hi{Control>}{Enter}{/Control}");

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("does nothing in a box outside any form", async () => {
    render(<TextAreaField label="Note" name="note" />);
    const lone = screen.getByRole("textbox", { name: "Note" });

    await userEvent.type(lone, "Hi{Control>}{Enter}{/Control}");

    expect(lone).toHaveValue("Hi");
  });
});

describe("Escape in a box of several lines", () => {
  it("cancels where the form says so", async () => {
    const onEscape = vi.fn();
    render(<NoteForm onSubmit={vi.fn()} onEscape={onEscape} />);

    await userEvent.type(box(), "Hi{Escape}");

    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  it("is left alone elsewhere, so a dialog can close on it", () => {
    render(<NoteForm onSubmit={vi.fn()} />);

    const escape = fireEvent.keyDown(box(), { key: "Escape" });

    expect(escape).toBe(true);
  });

  it("doesn't cancel while typing in another language", () => {
    const onEscape = vi.fn();
    render(<NoteForm onSubmit={vi.fn()} onEscape={onEscape} />);

    fireEvent.keyDown(box(), { key: "Escape", isComposing: true });

    expect(onEscape).not.toHaveBeenCalled();
  });
});

describe("the hint beside the Save button", () => {
  it("is shown and describes the box, after its own hint", () => {
    render(<NoteForm onSubmit={vi.fn()} />);

    expect(screen.getByText("Ctrl + Enter to save")).toBeInTheDocument();
    expect(box()).toHaveAccessibleDescription("Shown to everyone. Ctrl + Enter to save");
  });

  it("says Escape cancels where it does", () => {
    render(<NoteForm onSubmit={vi.fn()} onEscape={vi.fn()} />);

    expect(box()).toHaveAccessibleDescription(
      "Shown to everyone. Ctrl + Enter to save, Escape to cancel",
    );
  });

  it("names ⌘ on a Mac", () => {
    vi.spyOn(navigator, "platform", "get").mockReturnValue("MacIntel");
    render(<NoteForm onSubmit={vi.fn()} />);

    expect(screen.getByText("⌘ + Enter to save")).toBeInTheDocument();
  });

  it("describes a box with errors after the errors", () => {
    render(
      <SubmitKeysScope>
        <form>
          <TextAreaField label="Reason" name="reason" errors={["Say why."]} />
        </form>
        <SubmitKeysHint action="send" />
      </SubmitKeysScope>,
    );

    expect(screen.getByRole("textbox", { name: "Reason" })).toHaveAccessibleDescription(
      "Say why. Ctrl + Enter to send",
    );
  });

  it("leaves a box outside any hint's scope described only by its own hint", () => {
    render(<TextAreaField label="Note" name="note" hint="Shown to everyone." />);

    expect(screen.getByRole("textbox", { name: "Note" })).toHaveAccessibleDescription(
      "Shown to everyone.",
    );
  });
});
