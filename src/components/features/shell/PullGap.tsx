import clsx from "clsx";

import { Icon } from "@/components/ui/Icon";
import { LogoLoader } from "@/components/ui/LogoLoader";
import { GESTURE_TEXT } from "@/constants/gestures";
import type { PageEdge, PullHint } from "@/lib/gestures";
import type { NavItem } from "@/lib/navigation";

type PullGapProps = {
  edge: PageEdge;
  hint: PullHint<NavItem> | null;
  /** The page is sliding away: the gap fades with it. */
  isLeaving: boolean;
};

/** Up at the top (to the previous page), down at the bottom (to the next). */
const ARROWS = { top: "arrowUp", bottom: "arrowDown" } as const;

/**
 * The gap a pull opens at the top or bottom of the page (issue 90). A little darker than the page,
 * it says where letting go will go. The product's logo turns with how far the page has moved (3
 * degrees for each pixel of the gap, so it turns back as the page returns) and is fully open once
 * letting go will change the page (list tidy-ups 20; UI revamp, ticket 19); the words change too.
 * The gap grows and closes smoothly with the page (the same easing), so it never jumps with each
 * scroll step or vanishes on letting go.
 */
export function PullGap({ edge, hint, isLeaving }: PullGapProps) {
  const shown = hint?.edge === edge ? hint : null;
  if (shown === null) return <ClosedGap edge={edge} />;
  return (
    <div
      data-pull-gap={edge}
      className={clsx(gapClasses(edge, true), shown.isReady ? "text-ink" : "text-ink-2", {
        "opacity-0": isLeaving,
      })}
      style={{ height: `${String(shown.shift)}px` }}
    >
      <p role="status" className="inline-flex items-center gap-2">
        <Icon name={ARROWS[edge]} size="sm" />
        {hintText(shown)}
      </p>
      <LogoLoader size="pull" pull={{ turn: shown.turn, open: shown.progress }} />
    </div>
  );
}

/** Not pulled: the gap stays, closed, so letting go early closes it smoothly with the page. */
function ClosedGap({ edge }: { edge: PageEdge }) {
  return (
    <div
      data-pull-gap={edge}
      aria-hidden="true"
      className={gapClasses(edge, false)}
      style={{ height: "0px" }}
    />
  );
}

function gapClasses(edge: PageEdge, isPulled: boolean): string {
  return clsx(
    "bg-gap text-secondary pointer-events-none absolute inset-x-0 grid place-content-center justify-items-center gap-2 overflow-hidden font-semibold transition-[height,opacity]",
    // While pulled it eases after each scroll step; once let go it closes with the page.
    isPulled ? "duration-(--move-quick) ease-out" : "duration-(--move-sink) ease-in-out",
    edge === "top" ? "top-0" : "bottom-0",
  );
}

function hintText({ isReady, page }: PullHint<NavItem>): string {
  return isReady ? GESTURE_TEXT.release(page.label) : GESTURE_TEXT.keepPulling(page.label);
}
