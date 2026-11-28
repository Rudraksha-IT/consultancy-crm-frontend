/**
 * The one place for how long movement takes and how it eases (design system: Movement; UI revamp,
 * ticket 22). The same values are the `--move-*` and `--ease-*` tokens in `globals.css`, which
 * the stylesheet and the components' classes use; a test keeps the two equal. Code that moves
 * something itself (a marker, a board card) reads them from here.
 */
export const MOVE = {
  /** The one easing for what arrives: quick off the mark, soft at the end. */
  arrive: "cubic-bezier(0.2, 0.8, 0.2, 1)",
  /** The one easing for what leaves: it gathers speed and is gone. */
  leave: "cubic-bezier(0.4, 0, 1, 1)",
  /** Milliseconds. */
  ms: {
    /** a pressed button gives a little */
    press: 100,
    /** a popup or menu leaves */
    leave: 140,
    /** colours ease; a menu opens from its button */
    quick: 150,
    /** what a tab or switch shows fades in */
    swap: 180,
    /** a sheet, the slide-out menu or the toast goes back */
    sink: 200,
    /** a popup opens; light and dark cross-fade */
    open: 220,
    /** a board card settles in its own column */
    glide: 240,
    /** the marker of where you are slides; the slide-out menu comes in; a row follows its page */
    marker: 250,
    /** a sheet rises on a phone */
    sheet: 280,
    /** a page's blocks rise in */
    page: 300,
    /** a board card crosses to another column */
    cross: 320,
    /** the ring round a card that was moved clears */
    ring: 1100,
    /** the wash on a new or changed row clears */
    wash: 1200,
    /** one turn of the product's mark at the side menu's foot, again and again under the mouse */
    spin: 2000,
  },
  /** A page's blocks come in this far apart (ms), and its rows this far apart. */
  step: { block: 40, row: 18 },
} as const;

/** How long a page counts as arriving: its blocks and first rows have all come in by then. */
export const ARRIVAL_MS = 900;
