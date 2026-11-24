import clsx from "clsx";

import { MESSAGES } from "@/constants/messages";

import { LogoLoader } from "./LogoLoader";
import { useIsFirstLoad } from "./pageLoad";

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
  // While its page first loads, a box's loader is the page's, in the middle (list tidy-ups 27).
  const shownSize = useIsFirstLoad() ? "page" : size;
  return (
    <div
      role="status"
      className={clsx(
        shownSize === "page"
          ? "pointer-events-none fixed inset-0 grid place-items-center"
          : "flex items-center justify-center py-8",
        className,
      )}
    >
      <LogoLoader size={shownSize} />
      <span className="sr-only">{MESSAGES.loading}</span>
    </div>
  );
}
