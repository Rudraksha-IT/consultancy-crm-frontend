"use client";

import type { RecordId } from "@/lib/recordId";
import { useState } from "react";

import { useToast } from "@/components/ui/useToast";
import { MESSAGES } from "@/constants/messages";
import {
  cancelInvite,
  cancelInviteBack,
  inviteBack,
  resendInvite,
  TooManyCodesError,
  type Employee,
} from "@/lib/api";

/** What the invite actions change in the list on the page. */
type EmployeeListChanges = {
  /** Show an employee as the API returned them. */
  replace: (employee: Employee) => void;
  /** Stop showing a new person whose invite was cancelled. */
  remove: (id: RecordId) => void;
};

export type InviteActionsState = {
  /** The employee whose invite is being changed, if any. */
  busyId: RecordId | null;
  error: string | null;
  resend: (employee: Employee) => Promise<void>;
  /** Rejects when it failed, so the confirm dialog says so. */
  cancel: (employee: Employee) => Promise<void>;
  /** Invite back someone who has left. Rejects when it failed, so the confirm dialog says so. */
  inviteBack: (employee: Employee) => Promise<void>;
};

/** The words for a Code that could not be sent or an invite that could not be changed. */
export function inviteFailureOf(error: unknown): string {
  return error instanceof TooManyCodesError ? MESSAGES.tooManyCodes : MESSAGES.employeeChangeFailed;
}

/**
 * "Send the code again" and "Cancel invite" for people who haven't joined yet, and "Invite back"
 * for those who have left (ticket 18). The list is updated in place from the server's answer.
 */
export function useInviteActions(list: EmployeeListChanges): InviteActionsState {
  const { showToast } = useToast();
  const [busyId, setBusyId] = useState<RecordId | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(employee: Employee, task: () => Promise<void>): Promise<void> {
    setBusyId(employee.id);
    setError(null);
    try {
      await task();
    } catch (caught) {
      setError(inviteFailureOf(caught));
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
      // Someone invited back is never removed: they go back to Has left.
      if (employee.invitedBack) list.replace(await cancelInviteBack(employee.id));
      else {
        await cancelInvite(employee.id);
        list.remove(employee.id);
      }
      showToast(MESSAGES.inviteCancelled(employee.name));
    },
    inviteBack: async (employee) => {
      setError(null);
      const invited = await inviteBack(employee.id);
      list.replace(invited);
      showToast(MESSAGES.invitedBack(invited.name, invited.email));
    },
  };
}
