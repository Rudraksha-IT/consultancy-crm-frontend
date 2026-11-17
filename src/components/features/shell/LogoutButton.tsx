"use client";

import { IconButton, type IconButtonTone } from "@/components/ui/IconButton";
import { LABELS } from "@/constants/messages";

import { useLogout } from "./useLogout";

type LogoutButtonProps = {
  /** Ends the session; the Staff session by default. */
  endSession?: () => Promise<void>;
  /** Where to go once logged out; the Staff login page by default. */
  loginPath?: string;
  tone?: IconButtonTone;
};

/** The Log out icon button; a failure is announced next to it. */
export function LogoutButton({ endSession, loginPath, tone = "sidebar" }: LogoutButtonProps) {
  const { isLoggingOut, error, logOut } = useLogout(endSession, loginPath);

  function handleClick(): void {
    void logOut();
  }

  return (
    <>
      {error !== null && (
        <p role="alert" className="text-small text-bad font-semibold">
          {error}
        </p>
      )}
      <IconButton
        icon="logout"
        label={isLoggingOut ? LABELS.loggingOut : LABELS.logOut}
        tone={tone}
        isDisabled={isLoggingOut}
        onClick={handleClick}
      />
    </>
  );
}
