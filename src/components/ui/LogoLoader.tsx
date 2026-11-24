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

export type LoaderSize = "page" | "panel" | "button";

/**
 * The product's logo as the loading animation (list tidy-ups 06, 19): it turns at one steady speed
 * while its petals and lines close together into a small flower and open out again (globals.css,
 * "The logo loader").
 * Decoration only; whoever shows it says "Loading…" in words.
 */
export function LogoLoader({ size }: { size: LoaderSize }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="-175 -175 350 350"
      data-size={size}
      className="logo-loader"
    >
      <g className="logo-loader-turn">
        <g className="logo-loader-breathe" data-breathe="">
          {PETALS.map((path) => (
            <path key={path} d={path} data-petal="" strokeWidth={10} />
          ))}
          <path d={SPOKES} data-spokes="" strokeWidth={3.5} />
        </g>
      </g>
    </svg>
  );
}
