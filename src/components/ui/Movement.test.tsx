import { act, fireEvent, render, screen } from "@testing-library/react";
import { useRef, useState } from "react";

import { ARRIVAL_MS, MOVE } from "@/lib/motion";
import { fakeMatchMedia } from "@/test/matchMedia";

import { Dialog } from "./Dialog";
import { Tabs } from "./Tabs";
import { ToastProvider } from "./ToastProvider";
import { useArrival, useRowWash } from "./useMovement";
import { useToast } from "./useToast";

const animate = vi.fn(() => ({}));

/** A browser that can animate (jsdom cannot), on a device that has not asked for less motion. */
function letItMove(): void {
  Object.defineProperty(Element.prototype, "animate", { value: animate, configurable: true });
}

/** The device asks for less motion. */
function askForLessMotion(): void {
  vi.stubGlobal(
    "matchMedia",
    fakeMatchMedia(
      () => false,
      (query) => query.includes("prefers-reduced-motion"),
    ).matchMedia,
  );
}

/** Lets what was queued for "right after this change" run (copies, the page's own watcher). */
async function settle(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
  });
}

function leaving(): HTMLElement | null {
  return document.getElementById("leaving");
}

beforeEach(() => {
  vi.useFakeTimers();
  animate.mockClear();
  letItMove();
  // jsdom draws nothing: give everything a size, as on a real screen.
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 300, 200));
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  // A test that stops before a copy's time is up leaves it; the next one starts clean.
  leaving()?.remove();
  Reflect.deleteProperty(Element.prototype, "animate");
});

function OnePopup() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setIsOpen(true);
        }}
      >
        Add a Student
      </button>
      <Dialog
        isOpen={isOpen}
        title="New visitor"
        onClose={() => {
          setIsOpen(false);
        }}
      >
        <p>Who came in?</p>
      </Dialog>
    </>
  );
}

describe("a dialog opens and closes", () => {
  it("fades in and rises when it opens", () => {
    render(<OnePopup />);

    fireEvent.click(screen.getByRole("button", { name: "Add a Student" }));

    expect(screen.getByRole("dialog").parentElement).toHaveAttribute("data-move", "open");
  });

  it("leaves a copy fading out, with the page under it usable at once", async () => {
    render(<OnePopup />);
    const opener = screen.getByRole("button", { name: "Add a Student" });
    opener.focus();
    fireEvent.click(opener);

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    await settle();

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
    const copy = leaving();
    expect(copy).toHaveAttribute("aria-hidden", "true");
    expect(copy).toHaveProperty("inert", true);
    expect(copy?.firstElementChild).toHaveAttribute("data-leaving", "dialog");
    expect(copy?.querySelector("[id], [role], [aria-labelledby], [data-move]")).toBeNull();
    expect(copy).toHaveTextContent("Who came in?");
  });

  it("leaves nothing behind in the page once it has gone", async () => {
    render(<OnePopup />);
    fireEvent.click(screen.getByRole("button", { name: "Add a Student" }));
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    await settle();

    act(() => {
      vi.advanceTimersByTime(MOVE.ms.sink + 100);
    });

    expect(leaving()).toBeNull();
    expect(document.querySelector("[data-leaving], [data-move]")).toBeNull();
    expect(screen.queryByText("Who came in?")).not.toBeInTheDocument();
  });

  it("only cross-fades when another dialog takes its place", async () => {
    function Steps() {
      const [step, setStep] = useState(1);
      const next = (): void => {
        setStep(2);
      };
      return step === 1 ? (
        <Dialog key="one" isOpen title="Add Application" onClose={next}>
          <button type="button" onClick={next}>
            Save
          </button>
        </Dialog>
      ) : (
        <Dialog key="two" isOpen title="Add an offer letter" onClose={next}>
          <p>The letter</p>
        </Dialog>
      );
    }
    render(<Steps />);

    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await settle();

    expect(
      screen.getByRole("dialog", { name: "Add an offer letter" }).parentElement,
    ).toHaveAttribute("data-move", "next");
    expect(leaving()).toBeNull();
  });

  it("opens and closes at once when the device asks for less motion", async () => {
    askForLessMotion();
    render(<OnePopup />);

    fireEvent.click(screen.getByRole("button", { name: "Add a Student" }));
    expect(screen.getByRole("dialog").parentElement).not.toHaveAttribute("data-move");
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    await settle();

    expect(leaving()).toBeNull();
    expect(animate).not.toHaveBeenCalled();
  });
});

describe("the message at the bottom", () => {
  function Saver() {
    const { showToast } = useToast();
    return (
      <button
        type="button"
        onClick={() => {
          showToast("Visit saved");
        }}
      >
        Save visit
      </button>
    );
  }

  it("rises in, and a copy fades out when its time is up", async () => {
    render(
      <ToastProvider>
        <Saver />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Save visit" }));
    expect(screen.getByText("Visit saved")).toHaveAttribute("data-move", "toast");

    act(() => {
      vi.advanceTimersByTime(3300);
    });
    await settle();
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    expect(leaving()?.firstElementChild).toHaveAttribute("data-leaving", "toast");

    act(() => {
      vi.advanceTimersByTime(MOVE.ms.sink + 100);
    });
    expect(leaving()).toBeNull();
  });
});

describe("tabs", () => {
  const TABS = [
    { id: "applications", label: "Applications" },
    { id: "documents", label: "Documents" },
    { id: "fees", label: "Fees" },
  ];

  function Profile() {
    const [tab, setTab] = useState("applications");
    return (
      <Tabs label="Student" tabs={TABS} selected={tab} onSelect={setTab}>
        <p>{`All ${tab}`}</p>
      </Tabs>
    );
  }

  /** Each tab is drawn 100 further right than the one before, 80 wide. */
  function drawTabsInARow(): void {
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function at(
      this: Element,
    ) {
      const tab = this.closest('[role="tab"]');
      const index = tab === null ? 0 : [...(tab.parentElement?.children ?? [])].indexOf(tab);
      return new DOMRect(index * 100, 0, tab === null ? 400 : 80, 44);
    });
  }

  it("draws the chosen tab's line as one marker that can slide", () => {
    render(<Profile />);

    const chosen = screen.getByRole("tab", { name: "Applications" });

    expect(document.querySelectorAll("[data-marker]")).toHaveLength(1);
    expect(chosen.querySelector("[data-marker]")).toHaveClass("bg-accent");
  });

  it("moves nothing when the tabs are first drawn", () => {
    drawTabsInARow();
    render(<Profile />);

    expect(animate).not.toHaveBeenCalled();
  });

  it("slides the line from the old tab and fades in only what the tab shows", () => {
    drawTabsInARow();
    render(<Profile />);
    const fees = screen.getByRole("tab", { name: "Fees" });
    fees.focus();

    fireEvent.click(fees);

    const marker = document.querySelector("[data-marker]");
    expect(fees.querySelector("[data-marker]")).toBe(marker);
    const moved = animate.mock.contexts;
    expect(moved).toEqual([marker, screen.getByRole("tabpanel")]);
    expect(animate.mock.calls[0]).toEqual([
      [{ transform: "translate(-200px, 0px) scaleX(1)" }, { transform: "none" }],
      { duration: MOVE.ms.marker, easing: MOVE.arrive },
    ]);
    expect(animate.mock.calls[1]).toEqual([
      [{ opacity: 0 }, { opacity: 1 }],
      { duration: MOVE.ms.swap, easing: "ease-out" },
    ]);
    // Rule 8: the strip stays where it is and the cursor stays on the tab that was used.
    expect(fees).toHaveFocus();
    expect(screen.getByRole("tablist")).not.toHaveAttribute("data-move");
  });

  it("switches at once when the device asks for less motion", () => {
    askForLessMotion();
    drawTabsInARow();
    render(<Profile />);

    fireEvent.click(screen.getByRole("tab", { name: "Fees" }));

    expect(screen.getByText("All fees")).toBeInTheDocument();
    expect(animate).not.toHaveBeenCalled();
  });
});

describe("a page arrives, and the same page does not", () => {
  function Page({ path }: { path: string }) {
    const ref = useRef<HTMLElement>(null);
    const [rows, setRows] = useState(["Asha Rai", "Bina Thapa"]);
    useArrival(ref, path);
    useRowWash(ref);
    return (
      <main ref={ref}>
        <button
          type="button"
          onClick={() => {
            setRows((now) => [...now, "Chitra Lama"]);
          }}
        >
          Add visitor
        </button>
        <button
          type="button"
          onClick={() => {
            setRows(["Dipa Karki", "Esha Magar"]);
          }}
        >
          Next page
        </button>
        <ul>
          {rows.map((row) => (
            <li key={row} data-row="">
              {row}
            </li>
          ))}
        </ul>
      </main>
    );
  }

  function arrived(): void {
    act(() => {
      vi.advanceTimersByTime(ARRIVAL_MS);
    });
  }

  it("marks the page as arriving when it opens, for as long as its blocks take", () => {
    render(<Page path="/students" />);

    expect(screen.getByRole("main")).toHaveAttribute("data-arrive");
    arrived();
    expect(screen.getByRole("main")).not.toHaveAttribute("data-arrive");
  });

  it("arrives again when another page opens", () => {
    const { rerender } = render(<Page path="/students" />);
    arrived();

    rerender(<Page path="/tasks" />);

    expect(screen.getByRole("main")).toHaveAttribute("data-arrive");
  });

  it("never replays the arrival for an action on the same page, and keeps scroll and focus", async () => {
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
    const { rerender } = render(<Page path="/students" />);
    arrived();
    const add = screen.getByRole("button", { name: "Add visitor" });
    add.focus();

    fireEvent.click(add);
    await settle();
    rerender(<Page path="/students?stage=lead" />);

    expect(screen.getByRole("main")).not.toHaveAttribute("data-arrive");
    expect(add).toHaveFocus();
    expect(scrollTo).not.toHaveBeenCalled();
    scrollTo.mockRestore();
  });

  it("washes only the row that is new, and clears the mark after", async () => {
    render(<Page path="/students" />);
    arrived();

    fireEvent.click(screen.getByRole("button", { name: "Add visitor" }));
    await settle();

    expect(screen.getByText("Chitra Lama")).toHaveAttribute("data-move", "new");
    expect(screen.getByText("Asha Rai")).not.toHaveAttribute("data-move");
    act(() => {
      vi.advanceTimersByTime(MOVE.ms.wash + 200);
    });
    expect(screen.getByText("Chitra Lama")).not.toHaveAttribute("data-move");
  });

  it("does not flash a list that was redrawn whole", async () => {
    render(<Page path="/students" />);
    arrived();

    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    await settle();

    expect(document.querySelector("[data-move]")).toBeNull();
  });

  it("does not wash rows while the page is still arriving", async () => {
    render(<Page path="/students" />);

    fireEvent.click(screen.getByRole("button", { name: "Add visitor" }));
    await settle();

    expect(document.querySelector("[data-move]")).toBeNull();
  });

  it("does none of it when the device asks for less motion", async () => {
    askForLessMotion();
    render(<Page path="/students" />);
    expect(screen.getByRole("main")).not.toHaveAttribute("data-arrive");

    fireEvent.click(screen.getByRole("button", { name: "Add visitor" }));
    await settle();

    expect(document.querySelector("[data-move]")).toBeNull();
  });
});
