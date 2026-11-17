import clsx from "clsx";

import { ICON_PATHS, type IconName } from "./icons";

export type { IconName };

export type IconSize = "sm" | "md" | "lg";

const SIZE_CLASSES: Record<IconSize, string> = {
  sm: "size-icon-sm",
  md: "size-icon",
  lg: "size-6",
};
const STROKE_WIDTH = 1.75;

type IconProps = {
  name: IconName;
  size?: IconSize;
  className?: string;
};

/** A line icon from the app's one set. Decorative: the control around it carries the name. */
export function Icon({ name, size = "md", className }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={STROKE_WIDTH}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={clsx("block flex-none", SIZE_CLASSES[size], className)}
    >
      {ICON_PATHS[name]}
    </svg>
  );
}
