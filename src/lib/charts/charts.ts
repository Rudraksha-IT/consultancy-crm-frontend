/** Number helpers for the column chart and bar list. */

const AXIS_STEPS = 4;
const DECIMAL_BASE = 10;
const PERCENT = 100;
const MIN_STEP = 1;
// Round step sizes, as multiples of a power of ten. 2.5 only from tens up, so steps stay whole.
const NICE_STEPS = [1, 2, 2.5, 5, 10] as const;
const QUARTER_STEP = 2.5;

function isUsableStep(factor: number, power: number): boolean {
  return factor !== QUARTER_STEP || power >= DECIMAL_BASE;
}

/** The top of a value axis: a round number at least `value` that splits into four whole steps. */
export function niceAxisMax(value: number): number {
  if (value <= 0) return AXIS_STEPS;
  const rawStep = value / AXIS_STEPS;
  const power = DECIMAL_BASE ** Math.floor(Math.log10(rawStep));
  const factor =
    NICE_STEPS.find((step) => rawStep / power <= step && isUsableStep(step, power)) ?? DECIMAL_BASE;
  return Math.max(MIN_STEP, factor * power) * AXIS_STEPS;
}

/** `part` as a whole percentage of `total`; 0 when the total is 0. */
export function shareOf(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * PERCENT) : 0;
}
