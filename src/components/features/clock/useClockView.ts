"use client";

import { usePhoneWidth } from "@/components/ui/usePhoneWidth";
import { CLOCK_VIEW_KEY, ClockView } from "@/constants/clock";
import { useStoredValue } from "@/hooks/useStoredValue";
import { clockViewFrom } from "@/lib/clock";

/**
 * How a month is shown (UI revamp 16): the Calendar or the List, as the device remembers, the
 * Calendar first. A phone always shows the List and has no switch: `view` is null there.
 */
export function useClockView(): {
  view: ClockView | null;
  isList: boolean;
  storeView: (view: ClockView) => void;
} {
  const isPhone = usePhoneWidth();
  const [stored, storeView] = useStoredValue(CLOCK_VIEW_KEY);
  const view = isPhone ? null : clockViewFrom(stored);
  return { view, isList: view !== ClockView.Calendar, storeView };
}
