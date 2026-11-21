import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";

import { Button } from "./Button";
import { ConfirmDialog } from "./ConfirmDialog";
import { Dialog } from "./Dialog";

type HarnessProps = {
  onConfirm: () => Promise<void>;
  failureOf?: (error: unknown) => string;
};

/** A row with a Remove button that asks first, the way every screen uses it. */
function Harness({ onConfirm, failureOf }: HarnessProps) {
  const [isAsking, setIsAsking] = useState(false);
  return (
    <>
      <Button
        onClick={() => {
          setIsAsking(true);
        }}
      >
        Remove Grade 12 Transcript
      </Button>
      {isAsking && (
        <ConfirmDialog
          title="Remove the Grade 12 Transcript?"
          actionLabel="Remove"
          onConfirm={async () => {
            await onConfirm();
            setIsAsking(false);
          }}
          onClose={() => {
            setIsAsking(false);
          }}
          {...(failureOf === undefined ? {} : { failureOf })}
        >
          {"It comes off this Student's profile."}
        </ConfirmDialog>
      )}
    </>
  );
}

async function openIt(): Promise<void> {
  await userEvent.click(screen.getByRole("button", { name: "Remove Grade 12 Transcript" }));
}

describe("ConfirmDialog", () => {
  it("names the thing, says what will happen, and offers Cancel and a red action button", async () => {
    render(<Harness onConfirm={vi.fn().mockResolvedValue(undefined)} />);
    await openIt();

    const dialog = screen.getByRole("dialog", { name: "Remove the Grade 12 Transcript?" });
    expect(dialog).toHaveTextContent("It comes off this Student's profile.");
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    const action = screen.getByRole("button", { name: "Remove" });
    expect(action.className).toContain("text-bad");
    expect(screen.queryByRole("button", { name: /^(ok|yes)$/i })).toBeNull();
  });

  it("can name the calm button, e.g. Keep editing", () => {
    render(
      <ConfirmDialog
        title="Leave without saving?"
        actionLabel="Leave without saving"
        cancelLabel="Keep editing"
        onConfirm={() => Promise.resolve()}
        onClose={() => undefined}
      >
        Your changes on this page will be lost.
      </ConfirmDialog>,
    );

    expect(screen.getByRole("button", { name: "Keep editing" })).toHaveFocus();
    expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull();
  });

  it("starts with focus on Cancel", async () => {
    render(<Harness onConfirm={vi.fn().mockResolvedValue(undefined)} />);
    await openIt();

    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
  });

  it("does nothing when Cancel is pressed", async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(<Harness onConfirm={onConfirm} />);
    await openIt();

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("does nothing when Escape is pressed", async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(<Harness onConfirm={onConfirm} />);
    await openIt();

    await userEvent.keyboard("{Escape}");

    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("does nothing when Enter is pressed straight away, since focus is on Cancel", async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(<Harness onConfirm={onConfirm} />);
    await openIt();

    await userEvent.keyboard("{Enter}");

    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("calls the action once, even when the button is pressed twice", async () => {
    let finish = (): void => undefined;
    const onConfirm = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    render(<Harness onConfirm={onConfirm} />);
    await openIt();

    const action = screen.getByRole("button", { name: "Remove" });
    await userEvent.click(action);
    await userEvent.click(action);
    finish();

    expect(onConfirm).toHaveBeenCalledTimes(1);
    // Wait for the dialog itself to close: the button behind it is on screen all along.
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
    expect(screen.getByRole("button", { name: "Remove Grade 12 Transcript" })).toBeVisible();
  });

  it("stays open with a short message when the action fails, and can be tried again", async () => {
    const onConfirm = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error("secret detail"))
      .mockResolvedValueOnce(undefined);
    render(<Harness onConfirm={onConfirm} />);
    await openIt();

    await userEvent.click(screen.getByRole("button", { name: "Remove" }));

    expect(await screen.findByText("We couldn't remove it. Please try again.")).toBeVisible();
    expect(screen.queryByText("secret detail")).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: "Remove" }));

    expect(onConfirm).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("uses the screen's own words for a failure when given them", async () => {
    render(
      <Harness
        onConfirm={vi.fn().mockRejectedValue(new Error("x"))}
        failureOf={() => "Only an Admin can remove it."}
      />,
    );
    await openIt();

    await userEvent.click(screen.getByRole("button", { name: "Remove" }));

    expect(await screen.findByText("Only an Admin can remove it.")).toBeVisible();
  });

  it("closes only itself on Escape when it sits over another dialog", async () => {
    const onOuterClose = vi.fn();
    render(
      <Dialog isOpen title="IELTS Morning" onClose={onOuterClose}>
        <Harness onConfirm={vi.fn().mockResolvedValue(undefined)} />
      </Dialog>,
    );
    await openIt();

    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("dialog", { name: "Remove the Grade 12 Transcript?" })).toBeNull();
    expect(screen.getByRole("dialog", { name: "IELTS Morning" })).toBeVisible();
    expect(onOuterClose).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Remove Grade 12 Transcript" })).toHaveFocus();
  });
});

const REASON = {
  legend: "Why should it be deleted?",
  picks: ["Wrong Student", "Blurry scan"],
  otherChoice: "Other",
  otherLabel: "If Other, say why",
  otherPlaceholder: "For example, belongs to her brother",
  maxLength: 20,
  neededMessage: "Say why it should be deleted.",
  tooLongMessage: "Use at most 20 characters.",
};

type ReasonHarnessProps = {
  onConfirm: (reason: string) => Promise<void>;
  failureOf?: (error: unknown) => string;
};

function ReasonHarness({ onConfirm, failureOf }: ReasonHarnessProps) {
  return (
    <ConfirmDialog
      title="Delete Passport?"
      actionLabel="Put in the Bin"
      reason={REASON}
      onConfirm={onConfirm}
      onClose={vi.fn()}
      {...(failureOf === undefined ? {} : { failureOf })}
    >
      It goes to the Bin.
    </ConfirmDialog>
  );
}

describe("ConfirmDialog asking why (a Document put in the Bin)", () => {
  it("offers the quick picks and Other, the first chosen, and sends the pick", async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(<ReasonHarness onConfirm={onConfirm} />);

    const picks = screen.getByRole("radiogroup", { name: "Why should it be deleted?" });
    expect(picks).toHaveTextContent("Wrong StudentBlurry scanOther");
    expect(screen.getByRole("radio", { name: "Wrong Student" })).toBeChecked();
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();

    await userEvent.click(screen.getByRole("radio", { name: "Blurry scan" }));
    await userEvent.click(screen.getByRole("button", { name: "Put in the Bin" }));

    expect(onConfirm).toHaveBeenCalledWith("Blurry scan");
  });

  it("sends the words typed for Other, trimmed", async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(<ReasonHarness onConfirm={onConfirm} />);

    await userEvent.click(screen.getByRole("radio", { name: "Other" }));
    await userEvent.type(screen.getByLabelText("If Other, say why"), "  Her brother's  ");
    await userEvent.click(screen.getByRole("button", { name: "Put in the Bin" }));

    expect(onConfirm).toHaveBeenCalledWith("Her brother's");
  });

  it("typing in the box chooses Other", async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(<ReasonHarness onConfirm={onConfirm} />);

    await userEvent.type(screen.getByLabelText("If Other, say why"), "Old copy");

    expect(screen.getByRole("radio", { name: "Other" })).toBeChecked();
  });

  it("refuses Other with nothing typed, or too much, and sends nothing", async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(<ReasonHarness onConfirm={onConfirm} />);

    await userEvent.click(screen.getByRole("radio", { name: "Other" }));
    await userEvent.click(screen.getByRole("button", { name: "Put in the Bin" }));
    expect(screen.getByLabelText("If Other, say why")).toHaveAccessibleDescription(
      "Say why it should be deleted.",
    );

    await userEvent.type(screen.getByLabelText("If Other, say why"), "x".repeat(21));
    await userEvent.click(screen.getByRole("button", { name: "Put in the Bin" }));
    expect(screen.getByLabelText("If Other, say why")).toHaveAccessibleDescription(
      "Use at most 20 characters.",
    );
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("shows the screen's words for the server's refusal, as text", async () => {
    const onConfirm = vi.fn().mockRejectedValue(new Error("refused"));
    render(
      <ReasonHarness
        onConfirm={onConfirm}
        failureOf={() => "Use letters, numbers and punctuation only."}
      />,
    );

    await userEvent.click(screen.getByRole("radio", { name: "Other" }));
    await userEvent.type(screen.getByLabelText("If Other, say why"), "<b>x</b>");
    await userEvent.click(screen.getByRole("button", { name: "Put in the Bin" }));

    expect(await screen.findByText("Use letters, numbers and punctuation only.")).toBeVisible();
    expect(document.querySelector("b")).toBeNull();
  });
});
