import clsx from "clsx";
import Image from "next/image";

const INITIALS_COUNT = 2;

/** The office logo as the mark needs it: where it is. The name is always written beside it. */
export type BrandLogo = { url: string };

type BrandMarkProps = {
  /** The office's name; its initials stand in when there is no logo. */
  name: string;
  /** The office logo (issue 39), or none for the initials. */
  logo?: BrandLogo | null;
  /** `rail` is the collapsed sidebar strip, where a wide logo is kept narrow. */
  size?: "md" | "lg" | "rail";
};

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter((word) => /^[A-Za-z]/.test(word))
    .slice(0, INITIALS_COUNT)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

const LOGO_SIZES = {
  md: "h-mark max-w-logo rounded-control",
  rail: "h-mark max-w-logo-rail rounded-control",
  lg: "h-mark-lg max-w-logo-lg rounded-panel",
} as const;

/**
 * The office's mark: its logo, or its initials on the accent. Decorative: the office's name is
 * always written beside it (owner, 2026-11-27).
 */
export function BrandMark({ name, logo = null, size = "md" }: BrandMarkProps) {
  if (logo !== null) return <LogoImage logo={logo} size={size} />;
  return <Initials name={name} isLarge={size === "lg"} />;
}

type LogoImageProps = { logo: BrandLogo; size: keyof typeof LOGO_SIZES };

/** The logo as served by our own API: never resized by Next.js, loaded at once (it's on top). */
function LogoImage({ logo, size }: LogoImageProps) {
  return (
    <Image
      src={logo.url}
      alt=""
      width={0}
      height={0}
      unoptimized
      loading="eager"
      className={clsx("w-auto flex-none object-contain", LOGO_SIZES[size])}
    />
  );
}

function Initials({ name, isLarge }: { name: string; isLarge: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={clsx(
        "bg-accent text-accent-ink grid flex-none place-items-center font-semibold",
        isLarge
          ? "size-mark-lg rounded-dialog text-page-title"
          : "size-mark rounded-control text-secondary",
      )}
    >
      {initialsOf(name)}
    </span>
  );
}
