"use client";

import { useState } from "react";

import { MESSAGES } from "@/constants/messages";
import { ROUTES } from "@/constants/routes";
import { useFullPageNavigation } from "@/hooks/useFullPageNavigation";
import { logOut } from "@/lib/api";

export type LogoutState = {
  isLoggingOut: boolean;
  error: string | null;
  logOut: () => Promise<void>;
};

/**
 * End the session (the Staff one unless another `endSession` is given) and load `loginPath`
 * afresh; keep a user-facing error when it fails.
 */
export function useLogout(
  endSession: () => Promise<void> = logOut,
  loginPath: string = ROUTES.login,
): LogoutState {
  const navigate = useFullPageNavigation();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogOut(): Promise<void> {
    setIsLoggingOut(true);
    setError(null);
    try {
      await endSession();
      navigate(loginPath);
    } catch {
      setError(MESSAGES.logoutFailed);
      setIsLoggingOut(false);
    }
  }

  return { isLoggingOut, error, logOut: handleLogOut };
}
