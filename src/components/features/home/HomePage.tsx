"use client";

import type { ReactNode } from "react";

import { canManageClasses, canSeeClasses } from "@/components/features/batches/canUseClasses";
import { ClassesSection } from "@/components/features/batches/ClassesSection";
import { ClassesToday } from "@/components/features/batches/ClassesToday";
import { useCurrentStaff } from "@/components/features/shell/useCurrentStaff";
import { VisitorDesk } from "@/components/features/visits/VisitorDesk";
import { ADMIN_PROGRESS_LIMIT, COUNSELLOR_PROGRESS_LIMIT, HOME_TEXT } from "@/constants/home";
import { Role } from "@/constants/roles";

import { Module } from "@/constants/modules";

import { HighPriorityStudents } from "./HighPriorityStudents";
import { HomeGreeting } from "./HomeGreeting";
import { loadOwing, MonthAtAGlance, WhoStillOwes } from "./MoneySections";
import { useHomeAmounts } from "./useHomeAmounts";
import { PipelineSection } from "./PipelineSection";
import { ProgressSection } from "./ProgressSection";
import { TasksDueSoon } from "./TasksDueSoon";
import { UnassignedVisitors } from "./UnassignedVisitors";
import { useLoaded } from "./useLoaded";
import { WaitingRow } from "./WaitingRow";

/**
 * One Home per Role, built around its daily work (spec 22a), from the context endpoint. The
 * Counsellor's and Admin's open with what's waiting on them (spec 22a1).
 */
export function HomePage() {
  const { staff } = useCurrentStaff();
  return (
    <div className="grid gap-8">
      <HomeGreeting />
      {staff.role === Role.Admin && <AdminHome />}
      {staff.role === Role.Counsellor && <CounsellorHome />}
      {staff.role === Role.Teacher && <TeacherHome />}
      {staff.role === Role.FrontDesk && <VisitorDesk />}
    </div>
  );
}

/**
 * Home as a desk (UI revamp 07). From 1280: the work on the left, what waits for this person on
 * the right, and what is wide by nature (money) across both, underneath. Below 1280 it is one
 * column in the order written here, so the waiting parts come first. Each part shows a fixed
 * most, so the two columns stay about as tall as each other on a quiet day and a busy one.
 */
function Desk({ side, main, under }: { side: ReactNode; main: ReactNode; under?: ReactNode }) {
  return (
    <>
      <div className="desk:grid-cols-[minmax(0,1fr)_var(--spacing-desk-side)] desk:items-start grid min-w-0 gap-8">
        <div className="desk:order-2 desk:gap-7 grid min-w-0 content-start gap-8">{side}</div>
        <div className="grid min-w-0 content-start gap-8">{main}</div>
      </div>
      {under}
    </>
  );
}

/**
 * The Admin's Home: what's waiting; then the desk, with High priority Students, tasks due soon
 * and new visitors to assign beside the Pipeline and everyone's progress; then this month's money
 * and who still owes, full width (with the Accounts Module).
 */
function AdminHome() {
  const { modules } = useCurrentStaff();
  return modules.includes(Module.Accounts) ? <AdminHomeWithMoney /> : <AdminDesk />;
}

/** With the Accounts Module: one load of who owes and one eye (ticket 13) serve both money sections. */
function AdminHomeWithMoney() {
  const owing = useLoaded(loadOwing, 0);
  const amounts = useHomeAmounts();
  return (
    <AdminDesk
      money={
        <>
          <MonthAtAGlance owing={owing} amounts={amounts} />
          <WhoStillOwes owing={owing} isShown={amounts.isShown} />
        </>
      }
    />
  );
}

function AdminDesk({ money }: { money?: ReactNode }) {
  return (
    <>
      <WaitingRow />
      <Desk
        side={
          <>
            <HighPriorityStudents mine={false} />
            <TasksDueSoon isGrouped={false} />
            <UnassignedVisitors />
          </>
        }
        main={
          <>
            <PipelineSection />
            <ProgressSection
              title={HOME_TEXT.everyonesProgress}
              mine={false}
              limit={ADMIN_PROGRESS_LIMIT}
              showsCounsellor
            />
          </>
        }
        under={money}
      />
    </>
  );
}

/**
 * The Counsellor's Home: what's waiting; then the desk, with my High priority Students and my
 * tasks due soon beside my Students' progress and my classes (with the test-prep Module).
 */
function CounsellorHome() {
  const context = useCurrentStaff();
  return (
    <>
      <WaitingRow />
      <Desk
        side={
          <>
            <HighPriorityStudents mine />
            <TasksDueSoon isGrouped={false} />
          </>
        }
        main={
          <>
            <ProgressSection
              title={HOME_TEXT.yourProgress}
              mine
              limit={COUNSELLOR_PROGRESS_LIMIT}
              showsCounsellor={false}
            />
            {canManageClasses(context) && <ClassesSection />}
          </>
        }
      />
    </>
  );
}

/** My classes today (with the test-prep Module) and my tasks grouped by when they're due. */
function TeacherHome() {
  const context = useCurrentStaff();
  return (
    <>
      {canSeeClasses(context) && <ClassesToday />}
      <TasksDueSoon isGrouped />
    </>
  );
}
