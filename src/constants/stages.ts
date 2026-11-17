/** Where a Student is in their journey with the Consultancy (GLOSSARY: Stage). */
export const Stage = {
  Lead: "lead",
  Counselling: "counselling",
  Applying: "applying",
  Offer: "offer",
  Visa: "visa",
  Lost: "lost",
} as const;

export type Stage = (typeof Stage)[keyof typeof Stage];

/** The journey from first enquiry to a granted Visa, in order. Lost is off the journey. */
export const JOURNEY_STAGES = [
  Stage.Lead,
  Stage.Counselling,
  Stage.Applying,
  Stage.Offer,
  Stage.Visa,
] as const;

export type JourneyStage = (typeof JOURNEY_STAGES)[number];

export const STAGE_LABELS: Record<Stage, string> = {
  lead: "Lead",
  counselling: "Counselling",
  applying: "Applying",
  offer: "Offer",
  visa: "Visa",
  lost: "Lost",
};

/**
 * The journey Stages Staff set by hand; Applying, Offer and Visa follow from Applications, offer
 * letters and visas (issue 74).
 */
export const MANUAL_STAGES: readonly Stage[] = [Stage.Lead, Stage.Counselling];

const STAGE_VALUES: ReadonlySet<string> = new Set(Object.values(Stage));

/** Whether `value` is one of the Stage values the API uses. */
export function isStage(value: string): value is Stage {
  return STAGE_VALUES.has(value);
}
