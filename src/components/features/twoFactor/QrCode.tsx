import qrcode from "qrcode-generator";

/** Blank modules around the code, as the QR standard asks, so every app can find it. */
const QUIET_ZONE = 4;

type QrCodeProps = { value: string; label: string };

/**
 * A QR code drawn here in the browser (issue 61): the setup URI never goes to another service,
 * a URL or a log. Always black on white, in light and dark, so every authenticator app reads it.
 */
export function QrCode({ value, label }: QrCodeProps) {
  const code = qrcode(0, "M");
  code.addData(value);
  code.make();
  const count = code.getModuleCount();
  const size = count + QUIET_ZONE * 2;
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${String(size)} ${String(size)}`}
      className="bg-qr-light text-qr-dark rounded-control max-w-qr aspect-square w-full"
      shapeRendering="crispEdges"
    >
      <path d={darkModules(code, count)} fill="currentColor" />
    </svg>
  );
}

/** One square per dark module, as a single SVG path. */
function darkModules(code: ReturnType<typeof qrcode>, count: number): string {
  const indexes = Array.from({ length: count }, (_, index) => index);
  return indexes
    .flatMap((row) =>
      indexes
        .filter((column) => code.isDark(row, column))
        .map((column) => `M${String(column + QUIET_ZONE)} ${String(row + QUIET_ZONE)}h1v1h-1z`),
    )
    .join("");
}
