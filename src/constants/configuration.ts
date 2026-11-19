/** Configuration's sections (issue 96): related settings share one section, shown one at a time. */
export const CONFIGURATION_SECTIONS_TEXT = {
  backLabel: "All of Configuration",
  general: {
    title: "General",
    description:
      "How the office looks, its details at the bottom of every email, and how dates show.",
  },
  documents: {
    title: "Documents",
    description:
      "What every Student needs, the extra documents asked for only sometimes, and what each country asks for.",
  },
  fees: {
    title: "Fees",
    description: "What Fees and Payments can be for, in the order staff see them.",
  },
  workingHours: {
    title: "Working hours",
    description: "How long a working day is, the holidays, and where staff can clock in.",
  },
} as const;
