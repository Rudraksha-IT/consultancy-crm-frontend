import { act, render, screen } from "@testing-library/react";
import { useRef } from "react";

import { MOVE } from "@/lib/motion";
import { fakeMatchMedia } from "@/test/matchMedia";

import { useCardGlide } from "./useCardGlide";

const animate = vi.fn(() => ({}));

type Columns = Record<string, readonly string[]>;

/** A board of plain cards: each column 300 further right, each card 100 further down. */
function Board({ columns }: { columns: Columns }) {
  const ref = useRef<HTMLDivElement>(null);
  useCardGlide(ref, columns);
  return (
    <div ref={ref} data-testid="board">
      {Object.entries(columns).map(([stage, names]) => (
        <section key={stage} data-column={stage}>
          {names.map((name) => (
            <article key={name} data-card={name}>
              {name}
            </article>
          ))}
        </section>
      ))}
    </div>
  );
}

function drawTheBoard(): void {
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function at(
    this: Element,
  ) {
    const column = this.closest("[data-column]");
    if (column === null || !this.matches("[data-card]")) return new DOMRect(0, 0, 1500, 800);
    const across = [...(column.parentElement?.children ?? [])].indexOf(column);
    const down = [...column.children].indexOf(this);
    return new DOMRect(across * 300, down * 100, 280, 90);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  animate.mockClear();
  Object.defineProperty(Element.prototype, "animate", { value: animate, configurable: true });
  drawTheBoard();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  Reflect.deleteProperty(Element.prototype, "animate");
});

const BEFORE: Columns = { lead: ["Asha", "Bina", "Chitra"], counselling: ["Dipa"] };
/** Asha was moved to Counselling: Bina and Chitra each move up one place. */
const AFTER: Columns = { lead: ["Bina", "Chitra"], counselling: ["Dipa", "Asha"] };

describe("cards glide after a move", () => {
  it("moves nothing when the board is first drawn", () => {
    render(<Board columns={BEFORE} />);

    expect(animate).not.toHaveBeenCalled();
  });

  it("glides each card from where it was, the moved one across and ringed for a second", () => {
    const { rerender } = render(<Board columns={BEFORE} />);

    rerender(<Board columns={AFTER} />);

    const glided = new Map(animate.mock.contexts.map((card, at) => [card, animate.mock.calls[at]]));
    expect(glided.get(screen.getByText("Asha"))).toEqual([
      [{ transform: "translate(-300px, -100px) scaleX(1)" }, { transform: "none" }],
      { duration: MOVE.ms.cross, easing: MOVE.arrive },
    ]);
    expect(glided.get(screen.getByText("Bina"))).toEqual([
      [{ transform: "translate(0px, 100px) scaleX(1)" }, { transform: "none" }],
      { duration: MOVE.ms.glide, easing: MOVE.arrive },
    ]);
    expect(glided.has(screen.getByText("Dipa"))).toBe(false);
    expect(screen.getByText("Asha")).toHaveAttribute("data-landed");
    expect(screen.getByText("Bina")).not.toHaveAttribute("data-landed");

    act(() => {
      vi.advanceTimersByTime(MOVE.ms.ring);
    });
    expect(screen.getByText("Asha")).not.toHaveAttribute("data-landed");
  });

  it("does not glide a card that is new on the board", () => {
    const { rerender } = render(<Board columns={BEFORE} />);

    rerender(<Board columns={{ ...BEFORE, counselling: ["Dipa", "Esha"] }} />);

    expect(animate).not.toHaveBeenCalled();
  });

  it("puts every card in its place at once when the device asks for less motion", () => {
    vi.stubGlobal(
      "matchMedia",
      fakeMatchMedia(
        () => false,
        (query) => query.includes("prefers-reduced-motion"),
      ).matchMedia,
    );
    const { rerender } = render(<Board columns={BEFORE} />);

    rerender(<Board columns={AFTER} />);

    expect(animate).not.toHaveBeenCalled();
    expect(document.querySelector("[data-landed]")).toBeNull();
  });
});
