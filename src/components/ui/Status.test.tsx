import { act, render, screen } from "@testing-library/react";

import { reportServerAnswer } from "@/lib/api";

import { Avatar } from "./Avatar";
import { Banner } from "./Banner";
import { Chip } from "./Chip";
import { EmptyState } from "./EmptyState";
import { FigureTile } from "./FigureTile";
import { ProgressBar } from "./ProgressBar";
import { StageMeter } from "./StageMeter";

describe("Chip", () => {
  it("always carries its word, whatever the colour", () => {
    render(<Chip tone="bad">Rejected</Chip>);

    expect(screen.getByText("Rejected")).toBeInTheDocument();
  });

  it("can show a line icon instead of the dot, still beside its word", () => {
    const { container } = render(
      <Chip tone="bad" icon="arrowUp">
        High priority
      </Chip>,
    );

    expect(screen.getByText("High priority")).toBeInTheDocument();
    expect(container.querySelectorAll("svg")).toHaveLength(1);
    expect(container.querySelector(".size-dot")).toBeNull();
  });
});

describe("ProgressBar", () => {
  it("is a labelled progress bar with its percentage written beside it", () => {
    render(<ProgressBar label="Fees paid" value={3} max={4} />);

    const bar = screen.getByRole("progressbar", { name: "Fees paid" });
    expect(bar).toHaveAttribute("aria-valuenow", "75");
    expect(screen.getByText("75%")).toBeInTheDocument();
  });

  it("stays between 0 and 100", () => {
    render(<ProgressBar label="Paid" value={9} max={4} />);

    expect(screen.getByRole("progressbar", { name: "Paid" })).toHaveAttribute(
      "aria-valuenow",
      "100",
    );
  });

  it("is empty when there is nothing to measure", () => {
    render(<ProgressBar label="Paid" value={0} max={0} />);

    expect(screen.getByText("0%")).toBeInTheDocument();
  });
});

describe("Banner", () => {
  it("announces a problem as an alert, with its action", () => {
    render(
      <Banner tone="problem" action={<button type="button">Try again</button>}>
        {"We couldn't save the Theme."}
      </Banner>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("We couldn't save the Theme.");
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("shows other messages as a status", () => {
    render(<Banner tone="info">{"You're viewing this Student."}</Banner>);

    expect(screen.getByRole("status")).toHaveTextContent("You're viewing this Student.");
  });

  describe("while the app is being updated (ticket 14)", () => {
    afterEach(() => {
      reportServerAnswer(false);
    });

    it("says so as a warning instead of the screen's generic problem, keeping its action", () => {
      reportServerAnswer(true);

      render(
        <Banner tone="problem" action={<button type="button">Try again</button>}>
          {"We couldn't save the visit."}
        </Banner>,
      );

      expect(screen.getByRole("status")).toHaveTextContent(
        "The app is being updated. Please try again in a moment.",
      );
      expect(screen.queryByText("We couldn't save the visit.")).not.toBeInTheDocument();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
    });

    it("goes back to the screen's own words once the server answers again", () => {
      reportServerAnswer(true);
      render(<Banner tone="problem">{"We couldn't save the visit."}</Banner>);

      act(() => {
        reportServerAnswer(false);
      });

      expect(screen.getByRole("alert")).toHaveTextContent("We couldn't save the visit.");
    });

    it("leaves every other kind of message as it is", () => {
      reportServerAnswer(true);

      render(<Banner tone="info">{"You're viewing this Student."}</Banner>);

      expect(screen.getByRole("status")).toHaveTextContent("You're viewing this Student.");
    });
  });
});

describe("FigureTile", () => {
  it("shows a label, a big number and a footnote", () => {
    render(<FigureTile label="New visitors" value="42" footnote="in the last 6 months" />);

    expect(screen.getByText("New visitors")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("in the last 6 months")).toBeInTheDocument();
  });

  it("can colour its number by a fixed status tone, beside its label", () => {
    render(<FigureTile label="Still to pay" value="NPR 5,000" tone="warn" />);

    expect(screen.getByText("NPR 5,000")).toHaveClass("text-warn");
    expect(screen.getByText("Still to pay")).toBeInTheDocument();
  });

  it("can link somewhere", () => {
    render(<FigureTile label="Students" value="12" href="/students" />);

    expect(screen.getByRole("link")).toHaveAttribute("href", "/students");
  });

  it("can carry a line icon beside its label and details under its number", () => {
    const { container } = render(
      <FigureTile label="Visa interviews" value="2" icon="plane" href="/visas">
        <ul>
          <li>Sita Gurung, 4 Nov</li>
        </ul>
      </FigureTile>,
    );

    expect(screen.getByRole("link")).toHaveTextContent("Visa interviews2Sita Gurung, 4 Nov");
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });
});

describe("EmptyState", () => {
  it("says what is missing and offers the next step", () => {
    render(<EmptyState action={<a href="/new">Add one</a>}>No Consultancies yet.</EmptyState>);

    expect(screen.getByText("No Consultancies yet.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Add one" })).toBeInTheDocument();
  });
});

describe("Avatar", () => {
  it("shows up to two initials, hidden from screen readers", () => {
    const { container } = render(<Avatar name="sita kumari sharma" />);

    expect(container).toHaveTextContent("SK");
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });
});

describe("StageMeter", () => {
  function steps(): HTMLElement[] {
    return Array.from(document.querySelectorAll<HTMLElement>("[data-step]"));
  }

  it("names the Stage in words, not colour alone", () => {
    render(<StageMeter stage="counselling" />);

    expect(screen.getByText("Counselling")).toBeInTheDocument();
  });

  it("fills the steps up to the current Stage", () => {
    render(<StageMeter stage="applying" />);

    expect(steps().map((step) => step.dataset.step)).toEqual(["on", "on", "on", "off", "off"]);
  });

  it("fills every step for a Student at Visa", () => {
    render(<StageMeter stage="visa" />);

    expect(steps().every((step) => step.dataset.step === "on")).toBe(true);
  });

  it("fills nothing for a Lost Student and says Lost", () => {
    render(<StageMeter stage="lost" />);

    expect(steps().every((step) => step.dataset.step === "off")).toBe(true);
    expect(screen.getByText("Lost")).toBeInTheDocument();
  });

  it("hides the steps from screen readers, which hear the Stage name", () => {
    render(<StageMeter stage="lead" />);

    expect(steps()[0]?.parentElement).toHaveAttribute("aria-hidden", "true");
  });
});
