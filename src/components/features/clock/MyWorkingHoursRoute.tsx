"use client";

import { useSearchParams } from "next/navigation";

import { CLOCK_TAB_PARAM } from "@/constants/clock";

import { MyWorkingHoursPage } from "./MyWorkingHoursPage";

/**
 * Working hours, on the tab the address asks for (`/clock?tab=wfh`, from a work-from-home answer
 * in the bell). The page checks the tab before use and notes its own tab changes in the address.
 */
export function MyWorkingHoursRoute() {
  return <MyWorkingHoursPage askedTab={useSearchParams().get(CLOCK_TAB_PARAM)} />;
}
