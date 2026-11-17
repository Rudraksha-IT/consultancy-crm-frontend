import type { ReactNode } from "react";

import { Banner } from "@/components/ui/Banner";
import { MESSAGES } from "@/constants/messages";
import { REPORTS_TEXT } from "@/constants/reports";

import type { ReportState } from "./useReport";

/** The report once loaded; meanwhile "Loading", and a problem banner if it failed. */
export function ReportBody<T>({
  state,
  children,
}: {
  state: ReportState<T>;
  children: (data: T) => ReactNode;
}) {
  if (state.status === "loading") return <p className="text-ink-2">{MESSAGES.loading}</p>;
  if (state.status === "loaded") return children(state.data);
  // Refused dates are shown on the date fields themselves.
  if (state.status === "refused") return null;
  return <Banner tone="problem">{REPORTS_TEXT.failed}</Banner>;
}
