import type { ReactNode } from "react";

import { IconButton } from "@/components/ui/IconButton";
import { AMOUNTS_TEXT } from "@/constants/home";
import { formatNpr } from "@/lib/money";

import type { HomeAmounts } from "./useHomeAmounts";

type Money = (amount: number) => string;

type AmountsProps = {
  isShown: boolean;
  /** The text, given how to write each amount in it. */
  children: (money: Money) => string;
};

/**
 * Text with its amounts, or with ***** in their place (ticket 13). The text keeps its place, so
 * nothing moves; screen readers hear "Hidden" for each amount instead of the stars.
 */
export function Amounts({ isShown, children }: AmountsProps): ReactNode {
  if (isShown) return children(formatNpr);
  return (
    <>
      <span aria-hidden="true">{children(() => AMOUNTS_TEXT.masked)}</span>
      <span className="sr-only">{children(() => AMOUNTS_TEXT.hidden)}</span>
    </>
  );
}

/** The eye that shows or hides every amount on Home. */
export function AmountsEye({ amounts }: { amounts: HomeAmounts }) {
  return (
    <IconButton
      // The eye shows the current state: open while amounts are shown (list tidy-ups 16).
      icon={amounts.isShown ? "eye" : "eyeOff"}
      iconSize="lg"
      label={amounts.isShown ? AMOUNTS_TEXT.hide : AMOUNTS_TEXT.show}
      isPressed={amounts.isShown}
      onClick={amounts.toggle}
    />
  );
}
