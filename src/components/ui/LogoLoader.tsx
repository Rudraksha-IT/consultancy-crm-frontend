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

const SPOKES =
  "M18 0L108 0 M12.73 12.73L76.37 76.37 M0 18L0 108 M-12.73 12.73L-76.37 76.37 M-18 0L-108 0 " +
  "M-12.73 -12.73L-76.37 -76.37 M0 -18L0 -108 M12.73 -12.73L76.37 -76.37";

export type LoaderSize = "page" | "panel" | "button";

/**
 * The product's logo as the loading animation (list tidy-ups 06): it turns, and its petals close
 * one after another into a small flower and open out again (globals.css, "The logo loader").
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
        {PETALS.map((path, index) => (
          <path
            key={path}
            d={path}
            data-petal=""
            strokeWidth={10}
            style={{ animationDelay: `${String(index * 60)}ms` }}
          />
        ))}
        <path d={SPOKES} data-spokes="" strokeWidth={3.5} />
      </g>
    </svg>
  );
}
