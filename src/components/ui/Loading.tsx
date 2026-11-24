import clsx from "clsx";

import { MESSAGES } from "@/constants/messages";

import { LogoLoader } from "./LogoLoader";

type LoadingProps = {
  /**
   * "page" while a whole page loads: in the middle of the screen, whatever the page's height
   * (list tidy-ups 21). "panel" inside a box or list, in the middle of that box.
   */
  size?: "page" | "panel";
  className?: string;
};

/** Something is loading: the logo animation, with "Loading…" for screen readers (list tidy-ups 06). */
export function Loading({ size = "panel", className }: LoadingProps) {
  return (
    <div
      role="status"
      className={clsx(
        size === "page"
          ? "pointer-events-none fixed inset-0 grid place-items-center"
          : "flex items-center justify-center py-8",
        className,
      )}
    >
      <LogoLoader size={size} />
      <span className="sr-only">{MESSAGES.loading}</span>
    </div>
  );
}
