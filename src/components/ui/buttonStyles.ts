import clsx from "clsx";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

// On phones a pressed button shrinks a little, so a tap always shows (design system: Phones).
const BASE =
  "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-control border font-semibold no-underline disabled:cursor-not-allowed disabled:opacity-50 max-phone:active:scale-97";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "border-accent bg-accent text-accent-ink hover:border-accent-hover hover:bg-accent-hover",
  secondary: "border-rule-2 bg-paper text-ink hover:bg-fill [&_svg]:text-ink-2",
  ghost: "border-transparent bg-transparent text-ink-2 hover:bg-fill hover:text-ink",
  danger: "border-bad bg-paper text-bad hover:bg-bad-tint",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "min-h-control-sm px-3.5 text-small max-phone:text-secondary",
  md: "min-h-control px-4.5 text-secondary",
  lg: "min-h-control-lg px-6.5 text-body",
};

/** The classes shared by buttons and links that look like buttons. */
export function buttonClasses(variant: ButtonVariant, size: ButtonSize): string {
  return clsx(BASE, VARIANT_CLASSES[variant], SIZE_CLASSES[size]);
}
