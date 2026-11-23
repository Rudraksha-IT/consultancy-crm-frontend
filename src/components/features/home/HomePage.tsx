"use client";

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
 * The Admin's Home in the order they work (ticket 12): what's waiting, High priority Students,
 * the pipeline, this month's money and who owes beside new visitors (with the Accounts Module;
 * the visitors alone without it), everyone's progress, then tasks due soon, full width.
 */
function AdminHome() {
  const { modules } = useCurrentStaff();
  return (
    <>
      <WaitingRow />
      <HighPriorityStudents mine={false} />
      <PipelineSection />
      {modules.includes(Module.Accounts) ? <MoneyAndVisitors /> : <UnassignedVisitors />}
      <ProgressSection
        title={HOME_TEXT.everyonesProgress}
        mine={false}
        limit={ADMIN_PROGRESS_LIMIT}
        showsCounsellor
      />
      <TasksDueSoon isGrouped={false} />
    </>
  );
}

/**
 * With the Accounts Module: this month at a glance, then who still owes beside the new visitors,
 * the two boxes the same height (ticket 12). One load of who owes serves both money sections.
 */
function MoneyAndVisitors() {
  const owing = useLoaded(loadOwing, 0);
  return (
    <>
      <MonthAtAGlance owing={owing} />
      <div className="wide:grid-cols-2 grid gap-8">
        <WhoStillOwes owing={owing} />
        <UnassignedVisitors />
      </div>
    </>
  );
}

/**
 * What's waiting, my High priority Students, my Students' progress, my classes (with the
 * test-prep Module) and my tasks due soon (ticket 12).
 */
function CounsellorHome() {
  const context = useCurrentStaff();
  return (
    <>
      <WaitingRow />
      <HighPriorityStudents mine />
      <ProgressSection
        title={HOME_TEXT.yourProgress}
        mine
        limit={COUNSELLOR_PROGRESS_LIMIT}
        showsCounsellor={false}
      />
      {canManageClasses(context) && <ClassesSection />}
      <TasksDueSoon isGrouped={false} />
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
