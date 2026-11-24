"use client";

import clsx from "clsx";
import { useEffect, useState } from "react";

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
  // A box's loader shows only once its data has taken over 1 s (list tidy-ups 27).
  const isSlow = useIsSlow(size === "panel");
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
      <span className={clsx("contents", !isSlow && "invisible")}>
        <LogoLoader size={size} />
      </span>
      <span className="sr-only">{MESSAGES.loading}</span>
    </div>
  );
}

/** How long a box waits before showing its loader: quick loads show none. */
const SLOW_MS = 1000;

/** True once `SLOW_MS` has passed; at once when `waits` is false. */
function useIsSlow(waits: boolean): boolean {
  const [isSlow, setIsSlow] = useState(!waits);
  useEffect(() => {
    if (!waits) return undefined;
    const timer = setTimeout(() => {
      setIsSlow(true);
    }, SLOW_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [waits]);
  return isSlow;
}
