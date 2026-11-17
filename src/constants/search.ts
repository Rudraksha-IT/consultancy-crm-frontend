import { STAGE_LABELS, type Stage } from "./stages";

/** How long typing must pause before the top bar searches (issue 49). */
export const SEARCH_DELAY_MS = 250;

/** The words of the top bar's global search (spec 29a), as in the prototype. */
export const SEARCH_TEXT = {
  label: "Search Students and classes",
  /** The top bar's search icon at 1024px and below (issue 88), and the × that closes it. */
  open: "Search",
  close: "Close search",
  placeholder: "Find a Student or a class",
  studentsOnlyPlaceholder: "Find a Student",
  teacherPlaceholder: "Find your class or a Student in it",
  shortcut: "Ctrl K",
  macShortcut: "⌘ K",
  results: "Search results",
  students: "Students",
  classes: "Classes",
  searching: "Searching…",
  inYourClass: "In your class",
  tooMany: "Too many searches. Wait a minute and try again.",
  failed: "Search isn't working right now. Try again in a moment.",
  studentDetail: (stage: Stage, counsellor: string | null) =>
    `${STAGE_LABELS[stage]}, ${counsellor ?? "no counsellor yet"}`,
  seeAll: (count: number, text: string) => `See all ${String(count)} Students matching “${text}”`,
  openList: "Open the Student list with this search",
  nothing: (text: string) => `Nothing matches “${text}”.`,
  teacherNothing: " You can only find your own classes.",
} as const;
