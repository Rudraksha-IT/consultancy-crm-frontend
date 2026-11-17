"use client";

import { useState } from "react";

import { useToast } from "@/components/ui/useToast";
import { MESSAGES } from "@/constants/messages";
import { cancelInvite, resendInvite, TooManyCodesError, type Employee } from "@/lib/api";

export type InviteActionsState = {
  /** The employee whose invite is being changed, if any. */
  busyId: number | null;
  error: string | null;
  resend: (employee: Employee) => Promise<void>;
  /** Rejects when it failed, so the confirm dialog says so. */
  cancel: (employee: Employee) => Promise<void>;
};

/** "Send the code again" and "Cancel invite" for people who haven't joined yet. */
export function useInviteActions(onCancelled: (id: number) => void): InviteActionsState {
  const { showToast } = useToast();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(employee: Employee, task: () => Promise<void>): Promise<void> {
    setBusyId(employee.id);
    setError(null);
    try {
      await task();
    } catch (caught) {
      setError(
        caught instanceof TooManyCodesError ? MESSAGES.tooManyCodes : MESSAGES.employeeChangeFailed,
      );
    }
    setBusyId(null);
  }

  return {
    busyId,
    error,
    resend: (employee) =>
      run(employee, async () => {
        await resendInvite(employee.id);
        showToast(MESSAGES.inviteResent(employee.email));
      }),
    cancel: async (employee) => {
      setError(null);
      await cancelInvite(employee.id);
      onCancelled(employee.id);
      showToast(MESSAGES.inviteCancelled(employee.name));
    },
  };
}
