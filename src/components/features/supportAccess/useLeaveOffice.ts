"use client";

import { useState } from "react";

import { SUPPORT_TEXT } from "@/constants/supportAccess";
import { useFullPageNavigation } from "@/hooks/useFullPageNavigation";
import { logOut } from "@/lib/api";

import { platformUrl } from "./officeAddress";

export type LeaveOfficeState = {
  isLeaving: boolean;
  error: string | null;
  leave: () => Promise<void>;
};

/**
 * "Leave this office" (spec 11b): ends the Support Access visit (its login is logged out, which
 * the server records as the visit's end) and goes back to the Platform.
 */
export function useLeaveOffice(
  platformHost: string,
  endSession: () => Promise<void> = logOut,
): LeaveOfficeState {
  const navigate = useFullPageNavigation();
  const [isLeaving, setIsLeaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function leave(): Promise<void> {
    setIsLeaving(true);
    setError(null);
    try {
      await endSession();
      navigate(platformUrl(platformHost));
    } catch {
      setError(SUPPORT_TEXT.leaveFailed);
      setIsLeaving(false);
    }
  }

  return { isLeaving, error, leave };
}
