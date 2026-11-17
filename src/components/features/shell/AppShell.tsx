"use client";

import { useMemo, useState, type ReactNode } from "react";

import { ToastProvider } from "@/components/ui/ToastProvider";
import { MESSAGES } from "@/constants/messages";
import { Role } from "@/constants/roles";
import type { StaffContext } from "@/lib/api";

import { SetDateDisplayContext } from "./dateDisplay";
import { SetPageSwipeContext } from "./pageSwipe";
import { SetMyNameContext } from "./myName";
import { SetOfficeLogoContext } from "./officeLogo";
import { ShellFrame } from "./ShellFrame";
import { StaffContextContext } from "./staffContext";
import { InboxCheckContext } from "./inboxCheck";
import { TransferCountContext } from "./menuCount";
import { TaskCountContext } from "./taskCount";
import { useInboxCheckLoader } from "./useInboxCheckLoader";
import { useTaskCountLoader } from "./useTaskCountLoader";
import { useTransferCountLoader } from "./useTransferCountLoader";
import { useStaffSession } from "./useStaffSession";

type AppShellProps = {
  children: ReactNode;
};

/** The logged-in frame: loads the Staff member's context, then shows the page inside the shell. */
export function AppShell({ children }: AppShellProps) {
  const session = useStaffSession();

  if (session.status === "loading") {
    return <p className="text-ink-2 p-6">{MESSAGES.loading}</p>;
  }
  if (session.status === "failed") {
    return (
      <p role="alert" className="text-bad p-6 font-semibold">
        {MESSAGES.sessionFailed}
      </p>
    );
  }

  return <LoggedInShell loaded={session.value}>{children}</LoggedInShell>;
}

type LoggedInShellProps = { loaded: StaffContext; children: ReactNode };

/**
 * Shares the context with every screen. The date setting, the person's own name and the office
 * logo can change while the app is open; the menu's Tasks, Transfer requests and Inbox counts
 * follow changes to them.
 */
function LoggedInShell({ loaded, children }: LoggedInShellProps) {
  const [dateDisplay, setDateDisplay] = useState(loaded.dateDisplay);
  const [pageSwipe, setPageSwipe] = useState(loaded.pageSwipe === true);
  const [name, setName] = useState(loaded.staff.name);
  const [logo, setLogo] = useState(loaded.consultancy.logo);
  const taskCount = useTaskCountLoader();
  const transferCount = useTransferCountLoader(answersTransferRequests(loaded.staff.role));
  // A Platform Admin in Support Access has no Inbox: conversations are private (spec 129).
  const inboxCheck = useInboxCheckLoader(loaded.supportAccess === null);
  const context = useMemo(
    () => ({
      ...loaded,
      staff: { ...loaded.staff, name },
      consultancy: { ...loaded.consultancy, logo },
      dateDisplay,
      pageSwipe,
    }),
    [loaded, name, logo, dateDisplay, pageSwipe],
  );

  return (
    <StaffContextContext value={context}>
      <SetDateDisplayContext value={setDateDisplay}>
        <SetPageSwipeContext value={setPageSwipe}>
          <SetMyNameContext value={setName}>
            <SetOfficeLogoContext value={setLogo}>
              <TaskCountContext value={taskCount}>
                <TransferCountContext value={transferCount}>
                  <InboxCheckContext value={inboxCheck}>
                    <ToastProvider>
                      <ShellFrame context={context}>{children}</ShellFrame>
                    </ToastProvider>
                  </InboxCheckContext>
                </TransferCountContext>
              </TaskCountContext>
            </SetOfficeLogoContext>
          </SetMyNameContext>
        </SetPageSwipeContext>
      </SetDateDisplayContext>
    </StaffContextContext>
  );
}

/** Teachers don't see Students, so have no Transfer Requests to answer (spec 22). */
function answersTransferRequests(role: Role): boolean {
  return role !== Role.Teacher;
}
