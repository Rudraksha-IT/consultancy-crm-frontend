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
 * The business at a glance: with the Accounts Module, this month's money first; then the
 * pipeline, everyone's progress (the six furthest along), who still owes Fees and new visitors
 * nobody counsels yet.
 */
function AdminHome() {
  const { modules } = useCurrentStaff();
  return (
    <>
      <WaitingRow />
      {modules.includes(Module.Accounts) ? <AdminHomeWithMoney /> : <AdminHomeSections />}
    </>
  );
}

function AdminHomeWithMoney() {
  // One load of who owes for both money sections.
  const owing = useLoaded(loadOwing, 0);
  return (
    <>
      <MonthAtAGlance owing={owing} />
      <AdminHomeSections owesFees={<WhoStillOwes owing={owing} />} />
    </>
  );
}

function AdminHomeSections({ owesFees }: { owesFees?: ReactNode }) {
  return (
    <>
      <PipelineSection />
      <ProgressSection
        title={HOME_TEXT.everyonesProgress}
        mine={false}
        limit={ADMIN_PROGRESS_LIMIT}
        showsCounsellor
      />
      <div className="wide:grid-cols-2 grid items-start gap-8">
        {owesFees}
        <UnassignedVisitors />
        <TasksDueSoon isGrouped={false} />
      </div>
    </>
  );
}

/** My Students' progress, my classes (with the test-prep Module) and my tasks due soon. */
function CounsellorHome() {
  const context = useCurrentStaff();
  return (
    <>
      <WaitingRow />
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
