import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Banner } from "./Banner";
import { CheckboxGroup } from "./CheckboxGroup";
import { DetailList } from "./DetailList";
import { InfoTip } from "./InfoTip";
import { Journey } from "./Journey";
import { NoteCard } from "./NoteCard";
import { Timeline } from "./Timeline";

describe("Journey", () => {
  it("marks the Stages before the current one as done and names the current one", () => {
    render(<Journey stage="applying" nextStep="Waiting for an offer, Deakin University" />);

    const journey = screen.getByRole("list", { name: "Stage: Applying" });
    const steps = within(journey).getAllByRole("listitem");
    expect(steps.map((step) => step.textContent)).toEqual([
      "Lead",
      "Counselling",
      "Applying",
      "Offer",
      "Visa",
    ]);
    expect(steps.map((step) => step.dataset.state)).toEqual([
      "done",
      "done",
      "current",
      "next",
      "next",
    ]);
    expect(screen.getByText("Waiting for an offer, Deakin University")).toBeInTheDocument();
    expect(screen.getByText(/Next step:/)).toBeInTheDocument();
  });

  it("shows extra information above the Stages when it is given", () => {
    render(<Journey stage="counselling" nextStep={null} info={<span>Lost before</span>} />);

    expect(screen.getByText("Lost before")).toBeInTheDocument();
  });

  it("has no Onboarded or Completed step and no country at the end", () => {
    render(<Journey stage="visa" nextStep={null} />);

    const journey = screen.getByRole("list", { name: "Stage: Visa" });
    expect(journey).not.toHaveTextContent(/Onboarded|Completed/);
    expect(within(journey).getAllByRole("listitem")).toHaveLength(5);
  });

  it("ticks every step, Visa too, once the Visa is granted, and says Done", () => {
    render(
      <Journey stage="visa" nextStep="Visa granted. Help with flights and pre-departure." isDone />,
    );

    const states = within(screen.getByRole("list"))
      .getAllByRole("listitem")
      .map((step) => step.dataset.state);
    expect(states).toEqual(["done", "done", "done", "done", "done"]);
    expect(screen.getByText(/Done:/)).toBeInTheDocument();
    expect(screen.queryByText(/Next step:/)).not.toBeInTheDocument();
  });

  it("shows a Lost Student's journey faded, with nothing marked", () => {
    render(<Journey stage="lost" nextStep={null} />);

    const journey = screen.getByRole("list", { name: "Stage: Lost" });
    const states = within(journey)
      .getAllByRole("listitem")
      .map((step) => step.dataset.state);
    expect(states.every((state) => state === "next")).toBe(true);
    expect(journey.closest("[data-lost]")?.getAttribute("data-lost")).toBe("true");
  });
});

describe("Journey on small screens", () => {
  it("runs across at every width: a compact stepper at 640 and below, scrolling above if it must", () => {
    render(<Journey stage="visa" nextStep={null} />);

    const journey = screen.getByRole("list", { name: "Stage: Visa" });
    expect(journey.className).toMatch(/(^|\s)grid-cols-\[repeat\(5,/);
    expect(journey).not.toHaveClass("grid-cols-1");
    expect(journey).toHaveClass("phone:min-w-journey");
    expect(journey).not.toHaveClass("min-w-journey");
    expect(journey.parentElement).toHaveClass("phone:overflow-x-auto");
  });

  it("puts each stop over its name, the line running on to the next stop", () => {
    render(<Journey stage="offer" nextStep={null} />);

    const steps = within(screen.getByRole("list")).getAllByRole("listitem");
    for (const step of steps) {
      expect(step).toHaveClass("grid-cols-1", "justify-items-center", "before:h-0.75");
      expect(step).toHaveClass("phone:justify-items-start", "phone:before:h-0.75");
    }
    // the last Stage has no line running on from it
    expect(steps.at(-1)).toHaveClass("before:hidden");
    expect(steps.at(-1)).not.toHaveClass("phone:before:block");
    expect(steps[0]).not.toHaveClass("before:hidden");
    expect(steps.map((step) => step.dataset.state)).toEqual([
      "done",
      "done",
      "done",
      "current",
      "next",
    ]);
  });

  it("keeps a Lost Student's journey faded with nothing marked", () => {
    render(<Journey stage="lost" nextStep={null} />);

    const journey = screen.getByRole("list", { name: "Stage: Lost" });
    expect(journey).toHaveClass("opacity-40");
    for (const step of within(journey).getAllByRole("listitem")) {
      expect(step.dataset.state).toBe("next");
    }
  });

  it("gives a clickable Stage a 44 px tall target", () => {
    render(<Journey stage="lead" nextStep={null} onMoveTo={vi.fn()} />);

    for (const button of screen.getAllByRole("button")) {
      expect(button).toHaveClass("min-h-control");
    }
  });
});

describe("Journey moved by hand", () => {
  it("offers the other hand-set Stage as a button and says so under the journey", async () => {
    const onMove = vi.fn();
    render(<Journey stage="counselling" nextStep="Choose a course and apply" onMoveTo={onMove} />);

    const journey = screen.getByRole("list", { name: "Stage: Counselling" });
    expect(
      within(journey)
        .getAllByRole("button")
        .map((button) => button.textContent),
    ).toEqual(["Lead"]);
    expect(
      screen.getByText(
        /Click Lead or Counselling to move them by hand. Applying, Offer and Visa follow from applications, offer letters and the visa./,
      ),
    ).toBeVisible();
    await userEvent.click(within(journey).getByRole("button", { name: "Move to Lead" }));

    expect(onMove).toHaveBeenCalledWith("lead");
  });

  it.each(["applying", "offer", "visa", "lost"] as const)(
    "offers no buttons once the Student is %s",
    (stage) => {
      render(<Journey stage={stage} nextStep={null} onMoveTo={vi.fn()} />);

      expect(screen.queryByRole("button")).not.toBeInTheDocument();
      expect(screen.queryByText(/Click Lead/)).not.toBeInTheDocument();
    },
  );

  it("offers no buttons without a way to move", () => {
    render(<Journey stage="lead" nextStep="Have the first counselling session" />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("offers no buttons while a move is being saved", () => {
    render(<Journey stage="lead" nextStep={null} onMoveTo={vi.fn()} isMoving />);

    for (const button of screen.getAllByRole("button")) expect(button).toBeDisabled();
  });
});

describe("NoteCard", () => {
  it("is labelled, with its action in the head", () => {
    render(
      <NoteCard title="Note" action={<button type="button">Edit</button>}>
        <p>Wants Melbourne only.</p>
      </NoteCard>,
    );

    const note = screen.getByRole("region", { name: "Note" });
    expect(within(note).getByText("Wants Melbourne only.")).toBeInTheDocument();
    expect(within(note).getByRole("button", { name: "Edit" })).toBeInTheDocument();
  });
});

describe("DetailList", () => {
  it("pairs each label with its value, and a dash for an empty one", () => {
    render(
      <DetailList
        items={[
          { label: "Mobile", value: "9841000001" },
          { label: "Email", value: "" },
        ]}
      />,
    );

    const terms = screen.getAllByRole("term").map((term) => term.textContent);
    const values = screen.getAllByRole("definition").map((value) => value.textContent);
    expect(terms).toEqual(["Mobile", "Email"]);
    expect(values).toEqual(["9841000001", "—"]);
  });

  it("adds its own padding unless it sits flush inside something padded", () => {
    const { container, rerender } = render(<DetailList items={[{ label: "For", value: "Fee" }]} />);
    expect(container.querySelector("dl")).toHaveClass("p-6");

    rerender(<DetailList isFlush items={[{ label: "For", value: "Fee" }]} />);

    expect(container.querySelector("dl")).not.toHaveClass("p-6");
  });
});

describe("Timeline", () => {
  it("lists each event with when and who, and the earlier text when there is one", () => {
    render(
      <Timeline
        label="Activity"
        items={[
          { id: "1", title: "Note edited", meta: "Bikash, 22 Oct 2026, 13:48", before: "Old text" },
          { id: "2", title: "Note edited", meta: "Asha, 21 Oct 2026, 10:00", before: "" },
          { id: "3", title: "Something", meta: "Asha, 20 Oct 2026, 10:00", isHighlighted: true },
        ]}
      />,
    );

    const items = within(screen.getByRole("list", { name: "Activity" })).getAllByRole("listitem");
    const [edited, emptied, highlighted] = items;
    expect(items).toHaveLength(3);
    expect(edited).toHaveTextContent("Before: Old text");
    expect(emptied).toHaveTextContent("Before: (empty)");
    expect(highlighted).not.toHaveTextContent("Before:");
    expect(highlighted).toHaveAttribute("data-highlighted", "true");
  });
});

describe("Timeline with Stage dots", () => {
  it("shows Stage changes as big dots, the time between them, and other entries along the line", () => {
    render(
      <Timeline
        label="Activity"
        items={[
          { kind: "gap", id: "g1", text: "In Counselling for 5 days so far", isCurrent: true },
          { id: "n", title: "Note edited", meta: "Asha, 21 Oct 2026, 10:00" },
          {
            kind: "stage",
            id: "s1",
            move: { from: "Lost", to: "Counselling" },
            tag: "Came back",
            tone: "back",
            meta: "Asha, 20 Oct 2026, 10:00",
          },
          { kind: "gap", id: "g2", text: "12 days in Lost", isCurrent: false },
          {
            kind: "stage",
            id: "s2",
            move: { from: "Counselling", to: "Lost" },
            tag: "Marked Lost",
            tone: "lost",
            reason: "Went quiet.",
            meta: "Asha, 8 Oct 2026, 10:00",
          },
          { kind: "stage", id: "s3", title: "Became a Lead", tone: "plain", meta: "1 Oct 2026" },
        ]}
      />,
    );

    const rows = within(screen.getByRole("list", { name: "Activity" })).getAllByRole("listitem");
    expect(rows.map((row) => row.dataset.kind)).toEqual([
      "gap",
      "event",
      "stage",
      "gap",
      "stage",
      "stage",
    ]);
    const [now, , back, , lost, lead] = rows;
    expect(now).toHaveTextContent("In Counselling for 5 days so far");
    expect(now).toHaveAttribute("data-current", "true");
    expect(back).toHaveTextContent(/Lost → to Counselling/);
    expect(back).toHaveTextContent("Came back");
    expect(back).toHaveAttribute("data-tone", "back");
    expect(lost).toHaveTextContent("Marked Lost");
    expect(lost).toHaveTextContent("Went quiet.");
    expect(lost).toHaveAttribute("data-tone", "lost");
    expect(lead).toHaveTextContent("Became a Lead");
    expect(lead).toHaveTextContent("1 Oct 2026");
  });

  it("shows a reason as text, never as markup", () => {
    render(
      <Timeline
        label="Activity"
        items={[
          {
            kind: "stage",
            id: "s",
            move: { from: "Counselling", to: "Lost" },
            tone: "lost",
            tag: "Marked Lost",
            reason: "<img src=x onerror=alert(1)>",
            meta: "Asha",
          },
        ]}
      />,
    );

    expect(screen.getByText("<img src=x onerror=alert(1)>")).toBeInTheDocument();
    expect(document.querySelector("img")).toBeNull();
  });
});

describe("InfoTip", () => {
  function renderTip() {
    render(
      <>
        <InfoTip label="When they were Lost">
          <p>Lost on 8 Oct 2026: Went quiet.</p>
        </InfoTip>
        <button type="button">Elsewhere</button>
      </>,
    );
    return screen.getByRole("button", { name: "When they were Lost" });
  }

  it("is a button whose tip screen readers hear as its description", () => {
    const button = renderTip();

    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(button).toHaveAccessibleDescription("Lost on 8 Oct 2026: Went quiet.");
  });

  it("opens and closes with a tap or click", async () => {
    const button = renderTip();

    await userEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("tooltip")).toBeVisible();

    await userEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "false");
  });

  it("closes with Escape, keeping focus on the button", async () => {
    const button = renderTip();
    await userEvent.click(button);

    await userEvent.keyboard("{Escape}");

    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(button).toHaveFocus();
  });

  it("closes with Escape even when the tap didn't move focus to it", async () => {
    const button = renderTip();
    await userEvent.click(button);
    screen.getByRole("button", { name: "Elsewhere" }).focus();

    await userEvent.keyboard("{Escape}");

    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(button).toHaveFocus();
  });

  it("hides with Escape while it shows only because the button has focus", async () => {
    const button = renderTip();
    await userEvent.tab();
    expect(button).toHaveFocus();

    await userEvent.keyboard("{Escape}");

    expect(screen.getByRole("tooltip", { hidden: true })).toHaveAttribute("data-dismissed", "true");
    expect(button).toHaveFocus();
  });

  it("closes when someone taps outside it", async () => {
    const button = renderTip();
    await userEvent.click(button);

    await userEvent.click(screen.getByRole("button", { name: "Elsewhere" }));

    expect(button).toHaveAttribute("aria-expanded", "false");
  });
});

describe("CheckboxGroup", () => {
  it("is a labelled group whose ticks report the chosen values in order", async () => {
    const onChange = vi.fn();
    render(
      <CheckboxGroup
        label="Also considering"
        name="otherCountries"
        options={[
          { value: "uk", label: "UK" },
          { value: "canada", label: "Canada" },
        ]}
        values={["canada"]}
        onChange={onChange}
        isOptional
      />,
    );

    const group = screen.getByRole("group", { name: /Also considering/ });
    await userEvent.click(within(group).getByRole("checkbox", { name: "UK" }));
    expect(onChange).toHaveBeenLastCalledWith(["uk", "canada"]);
    await userEvent.click(within(group).getByRole("checkbox", { name: "Canada" }));
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it("shows its errors and marks the group invalid", () => {
    render(
      <CheckboxGroup
        label="Also considering"
        name="otherCountries"
        options={[{ value: "uk", label: "UK" }]}
        values={[]}
        onChange={vi.fn()}
        errors={["Choose each country only once."]}
      />,
    );

    expect(screen.getByRole("group")).toHaveAccessibleDescription("Choose each country only once.");
  });
});

describe("Banner", () => {
  it("can show another icon, such as a lock for view only", () => {
    const { container } = render(<Banner icon="lock">View only.</Banner>);

    expect(screen.getByRole("status")).toHaveTextContent("View only.");
    expect(container.querySelector("svg")).not.toBeNull();
  });
});
