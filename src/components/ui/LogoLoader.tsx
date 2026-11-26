"use client";

import { useLayoutEffect, useRef, type CSSProperties } from "react";

/** The 8 petals of the product's logo, each drawn alone so it can move on its own. */
const PETALS = [
  "M137.51 7.61A49 49 0 0 1 102.61 91.85",
  "M91.85 102.61A49 49 0 0 1 7.61 137.51",
  "M-7.61 137.51A49 49 0 0 1 -91.85 102.61",
  "M-102.61 91.85A49 49 0 0 1 -137.51 7.61",
  "M-137.51 -7.61A49 49 0 0 1 -102.61 -91.85",
  "M-91.85 -102.61A49 49 0 0 1 -7.61 -137.51",
  "M7.61 -137.51A49 49 0 0 1 91.85 -102.61",
  "M102.61 -91.85A49 49 0 0 1 137.51 -7.61",
];

// The 8 lines from the centre, reaching near the petals (85% of the way) without touching.
const SPOKES =
  "M18 0L117 0 M12.73 12.73L82.73 82.73 M0 18L0 117 M-12.73 12.73L-82.73 82.73 " +
  "M-18 0L-117 0 M-12.73 -12.73L-82.73 -82.73 M0 -18L0 -117 M12.73 -12.73L82.73 -82.73";

export type LoaderSize = "page" | "panel" | "button" | "pull";

// Petals and lines at rest in a pull: closed to the breath's smallest, open at the full pull.
const PULL_SMALLEST = 0.49;

/** A pull that moves the logo: how far it has turned, and how far its petals have opened. */
export type LoaderPull = {
  /** Degrees; negative is anticlockwise. */
  turn: number;
  /** 0 (a small flower) to 1 (full size). */
  open: number;
};

type PullPose = CSSProperties & { "--pull-turn": string; "--pull-open": string };

/**
 * When the first loader's animations started. Every later loader starts at the same moment, so a
 * handover or two loaders in the same place never jump; the first one is never moved
 * (list tidy-ups 27).
 */
let clockStart: number | null = null;

function joinTheClock(mark: Element): void {
  // Older browsers (and the tests' page) have no Web Animations: each loader keeps its own timing.
  if (!("getAnimations" in mark)) return;
  for (const animation of mark.getAnimations({ subtree: true })) joinOne(animation);
}

function joinOne(animation: Animation): void {
  if (clockStart === null && typeof animation.startTime === "number") {
    clockStart = animation.startTime;
  }
  if (clockStart !== null) animation.startTime = clockStart;
}

/**
 * The product's logo as the loading animation (list tidy-ups 06, 19): it turns at one steady speed
 * while its petals and lines close together into a small flower and open out again (globals.css,
 * "The logo loader").
 * Decoration only; whoever shows it says "Loading…" in words.
 */
export function LogoLoader({ size, pull }: { size: LoaderSize; pull?: LoaderPull }) {
  const mark = useRef<SVGSVGElement>(null);
  useLayoutEffect(() => {
    if (mark.current !== null) joinTheClock(mark.current);
  }, []);
  return (
    <svg
      ref={mark}
      aria-hidden="true"
      focusable="false"
      viewBox="-175 -175 350 350"
      data-size={size}
      data-pull={pull === undefined ? undefined : ""}
      className="logo-loader"
    >
      <g className="logo-loader-turn">
        <g className="logo-loader-breathe" data-breathe="" style={pullPose(pull)}>
          {PETALS.map((path) => (
            <path key={path} d={path} data-petal="" strokeWidth={10} />
          ))}
          <path d={SPOKES} data-spokes="" strokeWidth={7.5} />
        </g>
      </g>
    </svg>
  );
}

/**
 * Moved by a pull instead of a timer (list tidy-ups 20; UI revamp, ticket 19). The pose is handed
 * to the stylesheet as two values, set on the same element each time, so the logo turns smoothly in
 * place; with reduced motion the stylesheet leaves them unused and the logo stays still.
 */
function pullPose(pull: LoaderPull | undefined): PullPose | undefined {
  if (pull === undefined) return undefined;
  const open = Number((PULL_SMALLEST + (1 - PULL_SMALLEST) * pull.open).toFixed(4));
  return { "--pull-turn": `${String(pull.turn)}deg`, "--pull-open": String(open) };
}
