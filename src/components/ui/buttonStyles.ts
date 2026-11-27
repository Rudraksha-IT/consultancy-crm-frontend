import clsx from "clsx";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

/*
 * One filled button per screen area, for the main action; every other button is words with an
 * icon and no box, showing a soft fill on hover (Porcelain, UI revamp ticket 03). Every button stays at
 * least 44 tall to tap. A pressed button gives a little, so a press always shows (Movement).
 */
const BASE =
  "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-control border font-medium no-underline disabled:cursor-not-allowed disabled:opacity-50 not-disabled:active:scale-97";

const QUIET = "border-transparent bg-transparent hover:bg-fill";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "border-accent bg-accent text-accent-ink hover:border-accent-hover hover:bg-accent-hover",
  secondary: `${QUIET} text-ink-2 hover:text-ink`,
  ghost: `${QUIET} text-ink-2 hover:text-ink`,
  danger: "border-transparent bg-transparent text-bad hover:bg-bad-tint",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "min-h-control-sm px-button-sm text-button-sm",
  md: "min-h-control px-button text-button",
  lg: "min-h-control-lg px-6 text-body",
};

/** The main button has a little more room inside than the quiet ones. */
function sizeClasses(variant: ButtonVariant, size: ButtonSize): string {
  if (variant === "primary" && size === "md") return "min-h-control px-button-main text-button";
  return SIZE_CLASSES[size];
}

/** The classes shared by buttons and links that look like buttons. */
export function buttonClasses(variant: ButtonVariant, size: ButtonSize): string {
  return clsx(BASE, VARIANT_CLASSES[variant], sizeClasses(variant, size));
}
