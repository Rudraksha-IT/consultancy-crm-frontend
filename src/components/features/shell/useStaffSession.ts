"use client";

import { ROUTES } from "@/constants/routes";
import { useSession, type SessionState } from "@/hooks/useSession";
import { fetchStaffContext, type StaffContext } from "@/lib/api";

export type StaffSessionState = SessionState<StaffContext>;

/** Load the logged-in Staff member's context; send visitors who aren't logged in to the login page. */
export function useStaffSession(): StaffSessionState {
  return useSession(fetchStaffContext, ROUTES.login);
}
