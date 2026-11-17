/** The calendar an office shows and takes dates in; values match the API. Stored dates are AD. */
export const DateDisplay = { AD: "AD", BS: "BS" } as const;

export type DateDisplay = (typeof DateDisplay)[keyof typeof DateDisplay];

export const DATE_DISPLAYS = Object.values(DateDisplay);

/** How each calendar is named in Configuration → Dates. */
export const DATE_DISPLAY_LABELS: Record<DateDisplay, string> = {
  AD: "AD (English)",
  BS: "BS (Nepali)",
};

/** Words of the date field and Configuration → Dates. */
export const DATE_TEXT = {
  day: "Day",
  month: "Month",
  year: "Year",
  yearPlaceholder: "2083",
  clear: "Clear date",
  bsYearRange: (first: number, last: number) =>
    `Enter a BS year from ${String(first)} to ${String(last)}.`,
  incomplete: "Choose the day, month and year.",
  dates: "Dates",
  datesHelp: "The calendar used across the app. Intakes always stay in AD.",
  dateDisplay: "Date display",
  todayShowsAs: "Today shows as",
  saved: (display: DateDisplay) => `Dates now shown in ${display}`,
  saveFailed: "The date setting couldn't be saved. Check your connection and try again.",
};

/** Settings → Preferences → Swipe between pages, each person's own (asked 2026-11-17). */
export const PAGE_SWIPE_TEXT = {
  title: "Swipe between pages",
  help: "Pull firmly past the bottom of a page to open the next page in the menu, or past the top for the one before, with a finger or a touchpad. It is off at first, so an ordinary scroll never changes the page.",
  switchLabel: "Swipe between pages",
  switchDescription: "Only for you, on every device you use.",
  saved: (isOn: boolean) => `Swipe between pages is ${isOn ? "on" : "off"}`,
  saveFailed: "The setting couldn't be saved. Try again later.",
} as const;
