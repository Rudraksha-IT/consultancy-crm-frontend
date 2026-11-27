/** Colour arithmetic on six-digit hex colours, used only by the theme function. */

const CHANNEL_MAX = 255;
const HEX_RADIX = 16;
const CHANNEL_OFFSETS = [1, 3, 5] as const;
// WCAG 2.2 relative luminance.
const LINEAR_THRESHOLD = 0.03928;
const LINEAR_DIVISOR = 12.92;
const GAMMA_OFFSET = 0.055;
const GAMMA_DIVISOR = 1.055;
const GAMMA = 2.4;
const LUMINANCE_WEIGHTS = [0.2126, 0.7152, 0.0722] as const;
const CONTRAST_FLARE = 0.05;
// How far each step of `readableOn` moves towards its target, and the most steps it takes.
const READABLE_STEP = 0.08;
const READABLE_MAX_STEPS = 40;

type Rgb = readonly [number, number, number];

function toRgb(hex: string): Rgb {
  const [red, green, blue] = CHANNEL_OFFSETS.map((offset) =>
    Number.parseInt(hex.slice(offset, offset + 2), HEX_RADIX),
  );
  return [red ?? 0, green ?? 0, blue ?? 0];
}

function toHex(rgb: Rgb): string {
  const channels = rgb.map((value) => {
    const clamped = Math.round(Math.min(CHANNEL_MAX, Math.max(0, value)));
    return clamped.toString(HEX_RADIX).padStart(2, "0");
  });
  return `#${channels.join("")}`;
}

/** The colour `amount` of the way from `from` to `to` (0 keeps `from`, 1 gives `to`). */
export function mixHex(from: string, to: string, amount: number): string {
  const start = toRgb(from);
  const end = toRgb(to);
  return toHex([
    start[0] + (end[0] - start[0]) * amount,
    start[1] + (end[1] - start[1]) * amount,
    start[2] + (end[2] - start[2]) * amount,
  ]);
}

function linearChannel(value: number): number {
  const scaled = value / CHANNEL_MAX;
  return scaled <= LINEAR_THRESHOLD
    ? scaled / LINEAR_DIVISOR
    : ((scaled + GAMMA_OFFSET) / GAMMA_DIVISOR) ** GAMMA;
}

export function relativeLuminance(hex: string): number {
  const [red, green, blue] = toRgb(hex).map(linearChannel);
  return (
    LUMINANCE_WEIGHTS[0] * (red ?? 0) +
    LUMINANCE_WEIGHTS[1] * (green ?? 0) +
    LUMINANCE_WEIGHTS[2] * (blue ?? 0)
  );
}

/** The WCAG contrast ratio between two colours, from 1 to 21. */
export function contrastRatio(first: string, second: string): number {
  const [lighter, darker] = [relativeLuminance(first), relativeLuminance(second)].sort(
    (a, b) => b - a,
  );
  return ((lighter ?? 0) + CONTRAST_FLARE) / ((darker ?? 0) + CONTRAST_FLARE);
}

/**
 * `colour`, moved step by step towards `towards` until it reaches `minRatio` against `background`.
 * Ends at `towards` itself if no step on the way is readable enough.
 */
export function readableOn(
  colour: string,
  background: string,
  towards: string,
  minRatio: number,
): string {
  let current = colour;
  for (let step = 0; step < READABLE_MAX_STEPS; step += 1) {
    if (contrastRatio(current, background) >= minRatio) return current;
    current = mixHex(current, towards, READABLE_STEP);
  }
  return towards;
}
