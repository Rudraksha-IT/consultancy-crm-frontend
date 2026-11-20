"use client";

import { useState, type ReactNode } from "react";

import { StudentFees } from "@/components/features/fees/StudentFees";
import { useCurrentStaff } from "@/components/features/shell/useCurrentStaff";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { EmptyState } from "@/components/ui/EmptyState";
import { Panel } from "@/components/ui/Panel";
import { Tabs } from "@/components/ui/Tabs";
import { APPLICATION_TEXT } from "@/constants/applications";
import { BATCH_TEXT } from "@/constants/batches";
import { DOCUMENT_TEXT } from "@/constants/documents";
import { LABELS, MESSAGES } from "@/constants/messages";
import { Module } from "@/constants/modules";
import { PAYMENT_TEXT } from "@/constants/payments";
import { Role } from "@/constants/roles";
import { ROUTES } from "@/constants/routes";
import { TASK_TEXT } from "@/constants/tasks";
import { TRANSFER_TEXT } from "@/constants/transferRequests";
import type { DocumentLinkOption, StudentClass, StudentProfile } from "@/lib/api";
import { viewOnlyReason } from "@/lib/students";

import { StudentClasses } from "@/components/features/batches/StudentClasses";
import { useStudentClasses } from "@/components/features/batches/useBatchData";
import { DocumentsSection } from "@/components/features/documents/DocumentsSection";
import { StudentTasks } from "@/components/features/tasks/StudentTasks";
import { AskTransferDialog } from "@/components/features/transferRequests/AskTransferDialog";
import { TransferRequestBanner } from "@/components/features/transferRequests/TransferRequestBanner";

import { ActivityTab } from "./ActivityTab";
import { ApplicationsTab } from "./ApplicationsTab";
import { NoteSection } from "./NoteSection";
import { ProfileHeader } from "./ProfileHeader";
import { ProfileTab } from "./ProfileTab";
import { StageSection } from "./StageSection";
import { useStudentProfile } from "./useStudentProfile";

const TAB = {
  applications: "applications",
  documents: "documents",
  tasks: "tasks",
  classes: "classes",
  fees: "fees",
  profile: "profile",
  activity: "activity",
} as const;

type Tab = (typeof TAB)[keyof typeof TAB];

const TAB_IDS: readonly Tab[] = Object.values(TAB);

/** The tab named in the address (`?tab=fees`), or none for anything else. */
export function profileTabFrom(text: string | undefined): Tab | undefined {
  return TAB_IDS.find((id) => id === text);
}

/**
 * One Student: Note, Stage journey and their sections (spec 32-37, 45, 57, 64, 74, 76a, 86). Admins
 * and the Student's counsellor see the Fees tab while Accounts is on; Classes shows while test-prep
 * is on and they're in a class.
 */
export function StudentProfilePage({
  studentId,
  startTab = TAB.applications,
}: {
  studentId: number;
  /** The tab to open on, e.g. Fees from Fees by type; Applications if it isn't shown. */
  startTab?: Tab;
}) {
  const { staff } = useCurrentStaff();
  if (staff.role === Role.Teacher) {
    return (
      <Panel>
        <EmptyState action={<ButtonLink href={ROUTES.home}>{LABELS.goHome}</ButtonLink>}>
          {MESSAGES.notAvailable}
        </EmptyState>
      </Panel>
    );
  }
  return <LoadedProfile studentId={studentId} role={staff.role} startTab={startTab} />;
}

/**
 * The Fees tab, only while the Accounts Module is on (spec 76f): for Admins, and for the Student's
 * counsellor, who sees their Fees but not their Payments (spec 73, 76a).
 */
function useSeesFees(profile: StudentProfile): boolean {
  const { staff, modules } = useCurrentStaff();
  const mayChange = staff.role === Role.Admin || profile.canChangeFees;
  return mayChange && modules.includes(Module.Accounts);
}

/** The Student's classes, asked for only while the test-prep Module is on. */
function useClassesTab(studentId: number): StudentClass[] {
  const { modules } = useCurrentStaff();
  const state = useStudentClasses(studentId, modules.includes(Module.Batches));
  return state.status === "loaded" ? state.data : [];
}

type LoadedProfileProps = { studentId: number; role: Role; startTab: Tab };

function LoadedProfile({ studentId, role, startTab }: LoadedProfileProps) {
  const { state, replace, update, refresh } = useStudentProfile(studentId);
  if (state.status === "loading") return <p className="text-ink-2">{MESSAGES.loading}</p>;
  if (state.status === "failed") return <Banner tone="problem">{MESSAGES.studentFailed}</Banner>;
  if (state.status === "notFound") {
    return (
      <Panel>
        <EmptyState action={<ButtonLink href={ROUTES.students}>{LABELS.allStudents}</ButtonLink>}>
          {MESSAGES.studentNotFound}
        </EmptyState>
      </Panel>
    );
  }
  return (
    <Profile
      profile={state.profile}
      role={role}
      startTab={startTab}
      onReplace={replace}
      onUpdate={update}
      onRefresh={refresh}
    />
  );
}

type ProfileProps = {
  profile: StudentProfile;
  role: Role;
  startTab: Tab;
  onReplace: (profile: StudentProfile) => void;
  onUpdate: (change: (profile: StudentProfile) => StudentProfile) => void;
  /** Load the profile again, e.g. so Documents linked to an Application show on it. */
  onRefresh: () => Promise<void>;
};

function Profile({ profile, role, startTab, onReplace, onUpdate, onRefresh }: ProfileProps) {
  const [tab, setTab] = useState<Tab>(startTab);
  const seesFees = useSeesFees(profile);
  const classes = useClassesTab(profile.id);
  const shownTab = visibleTab(tab, seesFees, classes.length > 0);
  // Bumped after a change History records, so an open Activity tab shows it.
  const [historyVersion, setHistoryVersion] = useState(0);
  const replaceAndRecord = (saved: StudentProfile) => {
    onReplace(saved);
    setHistoryVersion((current) => current + 1);
  };
  // A Transfer Request was sent or answered: the counsellor and what I may do can change.
  const reloadAfterRequest = () => {
    setHistoryVersion((current) => current + 1);
    void onRefresh();
  };

  return (
    <div className="grid gap-8">
      <ProfileHeader profile={profile} onSaved={replaceAndRecord} />
      <WaitingRequest profile={profile} onChanged={reloadAfterRequest} />
      <ViewOnlyBanner profile={profile} role={role} onSent={reloadAfterRequest} />
      <StageSection profile={profile} onSaved={replaceAndRecord} />
      <NoteSection profile={profile} onSaved={replaceAndRecord} />
      <Tabs
        label={LABELS.sections}
        tabs={profileTabs(profile, seesFees, classes.length > 0)}
        selected={shownTab}
        onSelect={(id) => {
          setTab(TAB_IDS.find((known) => known === id) ?? TAB.applications);
        }}
      >
        <TabContent
          tab={shownTab}
          profile={profile}
          classes={classes}
          historyVersion={historyVersion}
          onSaved={replaceAndRecord}
          onHistoryChanged={() => {
            setHistoryVersion((current) => current + 1);
          }}
          onUpdate={onUpdate}
          onRefresh={onRefresh}
        />
      </Tabs>
    </div>
  );
}

/** The Transfer Request waiting for the Student, if any (spec 44b, 44c). */
function WaitingRequest({
  profile,
  onChanged,
}: {
  profile: StudentProfile;
  onChanged: () => void;
}) {
  if (profile.transferRequest === null) return null;
  return <TransferRequestBanner request={profile.transferRequest} onChanged={onChanged} />;
}

/**
 * On a Student I can't change, why, with "Ask to take this Student" when I may ask (spec 34,
 * 44a).
 */
function ViewOnlyBanner(props: { profile: StudentProfile; role: Role; onSent: () => void }) {
  const { profile, role, onSent } = props;
  if (profile.canChange) return null;
  const ask = profile.canAskTransfer ? <AskButton profile={profile} onSent={onSent} /> : undefined;
  return (
    <Banner icon="lock" action={ask}>
      {viewOnlyReason(role, profile.assignedCounsellor?.name ?? null)}
    </Banner>
  );
}

/** "Ask to take this Student" on a Student who isn't mine, and its dialog (spec 44a). */
function AskButton({ profile, onSent }: { profile: StudentProfile; onSent: () => void }) {
  const [isAsking, setIsAsking] = useState(false);
  return (
    <>
      <Button
        size="sm"
        icon="transfer"
        onClick={() => {
          setIsAsking(true);
        }}
      >
        {TRANSFER_TEXT.ask}
      </Button>
      {isAsking && (
        <AskTransferDialog
          student={{ id: profile.id, name: profile.name }}
          counsellor={profile.assignedCounsellor?.name ?? null}
          onClose={() => {
            setIsAsking(false);
          }}
          onSent={() => {
            setIsAsking(false);
            onSent();
          }}
        />
      )}
    </>
  );
}

/** The chosen tab, or Applications if it is Fees or Classes and that is no longer shown. */
function visibleTab(tab: Tab, seesFees: boolean, hasClasses: boolean): Tab {
  if (tab === TAB.fees && !seesFees) return TAB.applications;
  return tab === TAB.classes && !hasClasses ? TAB.applications : tab;
}

/** The tabs this person sees: Classes when they're in one; Fees while Accounts is on. */
function profileTabs(profile: StudentProfile, seesFees: boolean, hasClasses: boolean) {
  return [
    { id: TAB.applications, label: APPLICATION_TEXT.title, count: profile.applications.length },
    {
      id: TAB.documents,
      label: DOCUMENT_TEXT.tab,
      count: `${String(profile.documents.done)}/${String(profile.documents.total)}`,
    },
    { id: TAB.tasks, label: TASK_TEXT.title, count: profile.openTasks },
    ...(hasClasses ? [{ id: TAB.classes, label: BATCH_TEXT.classesHeading }] : []),
    ...(seesFees ? [{ id: TAB.fees, label: PAYMENT_TEXT.feesTab }] : []),
    { id: TAB.profile, label: LABELS.profile },
    { id: TAB.activity, label: LABELS.activity },
  ];
}

type TabContentProps = {
  tab: Tab;
  profile: StudentProfile;
  classes: StudentClass[];
  /** Remounts the Activity tab after a change History records. */
  historyVersion: number;
  onSaved: (profile: StudentProfile) => void;
  /** A change History records was made outside the profile, e.g. a Payment edited. */
  onHistoryChanged: () => void;
  onUpdate: ProfileProps["onUpdate"];
  onRefresh: ProfileProps["onRefresh"];
};

/** The Student's Applications and Visas, as an upload can be linked to them (spec 66). */
function documentLinks(profile: StudentProfile): DocumentLinkOption[] {
  return [
    ...profile.applications.map((application) => ({
      kind: "application" as const,
      id: application.id,
      label: DOCUMENT_TEXT.linkApplication(application.university.name, application.course.name),
    })),
    ...profile.visas.map((visa) => ({
      kind: "visa" as const,
      id: visa.id,
      label: DOCUMENT_TEXT.linkVisa(visa.university.name, visa.course.name),
    })),
  ];
}

/** The open tab's section. */
function TabContent(props: TabContentProps) {
  return TAB_CONTENT[props.tab](props);
}

const TAB_CONTENT: Record<Tab, (props: TabContentProps) => ReactNode> = {
  applications: ({ profile, onSaved }) => <ApplicationsTab profile={profile} onSaved={onSaved} />,
  documents: ({ profile, onUpdate, onRefresh }) => (
    <DocumentsSection
      studentId={profile.id}
      studentName={profile.name}
      links={documentLinks(profile)}
      onProgress={(documents) => {
        onUpdate((current) => ({ ...current, documents }));
        void onRefresh();
      }}
    />
  ),
  tasks: ({ profile, onRefresh }) => (
    <StudentTasks
      student={{
        id: profile.id,
        name: profile.name,
        counsellorId: profile.assignedCounsellor?.id ?? null,
      }}
      onChanged={() => void onRefresh()}
    />
  ),
  classes: ({ classes }) => <StudentClasses classes={classes} />,
  // Remounted after a Payment is taken from the header, so it shows in the list and the Balance.
  fees: ({ profile, historyVersion, onHistoryChanged }) => (
    <StudentFees
      key={historyVersion}
      student={{ id: profile.id, name: profile.name }}
      canChangeFees={profile.canChangeFees}
      canRecordPayment={profile.canRecordPayment}
      onChanged={onHistoryChanged}
    />
  ),
  profile: ({ profile }) => <ProfileTab profile={profile} />,
  activity: ({ profile, historyVersion }) => (
    <ActivityTab
      key={historyVersion}
      studentId={profile.id}
      createdAt={profile.createdAt}
      stageChanges={profile.stageChanges}
    />
  ),
};
