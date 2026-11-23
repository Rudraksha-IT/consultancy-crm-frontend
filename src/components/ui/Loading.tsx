import clsx from "clsx";

import { MESSAGES } from "@/constants/messages";

import { LogoLoader } from "./LogoLoader";

type LoadingProps = {
  /** "page" while a whole page loads, centred; "panel" inside a box or list. */
  size?: "page" | "panel";
  className?: string;
};

/** Something is loading: the logo animation, with "Loading…" for screen readers (list tidy-ups 06). */
export function Loading({ size = "panel", className }: LoadingProps) {
  return (
    <div
      role="status"
      className={clsx(
        "flex items-center justify-center",
        size === "page" ? "min-h-[60vh] p-6" : "py-8",
        className,
      )}
    >
      <LogoLoader size={size} />
      <span className="sr-only">{MESSAGES.loading}</span>
    </div>
  );
}
