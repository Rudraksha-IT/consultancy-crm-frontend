/** A feature area of the product, always on or switched per Consultancy; values match the API. */
export const Module = {
  Students: "students",
  Staff: "staff",
  Visits: "visits",
  Tasks: "tasks",
  History: "history",
  Catalogue: "catalogue",
  Applications: "applications",
  Visas: "visas",
  Documents: "documents",
  Payments: "payments",
  Configuration: "configuration",
  Batches: "batches",
  Communication: "communication",
  Accounts: "accounts",
  Reports: "reports",
  ClockIn: "clock_in",
} as const;

export type Module = (typeof Module)[keyof typeof Module];

export const MODULES = Object.values(Module);

/** The Modules a Platform Admin switches per Consultancy, shown to them as "Features". */
export const SWITCHABLE_MODULES = [
  Module.Batches,
  Module.Communication,
  Module.Accounts,
  Module.Reports,
  Module.ClockIn,
] as const;

export type SwitchableModule = (typeof SWITCHABLE_MODULES)[number];

export function isSwitchable(module: Module): module is SwitchableModule {
  return SWITCHABLE_MODULES.some((switchable) => switchable === module);
}

/** Every Module that can't be switched off. */
export const ALWAYS_ON_MODULES: readonly Module[] = MODULES.filter(
  (module) => !isSwitchable(module),
);

/** How each switchable Module is named and described in the Features dialog. */
export const FEATURES: Record<SwitchableModule, { label: string; description: string }> = {
  batches: {
    label: "Test-prep classes",
    description: "IELTS, PTE and language classes, attendance and teachers.",
  },
  communication: {
    label: "Email and SMS",
    description: "Send email and SMS to Students from the office's own accounts.",
  },
  accounts: {
    label: "Accounts",
    description: "Student fees, money in, expenses and university commission.",
  },
  reports: {
    label: "Reports and charts",
    description: "Monthly charts of visitors, sign-ups, visas and money.",
  },
  clock_in: {
    label: "Clock-in",
    description: "Staff clock in and out from the office network. No location is recorded.",
  },
};
